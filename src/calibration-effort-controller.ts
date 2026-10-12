import {createCalibrationInputRouter,calibrationMidiGrade,type CalibrationInputEvent,type CalibrationGrade,type CalibrationRatingInput} from '@hypermemetic-ai/fingering-calculator';
import {EFFORT_FILE,EFFORT_PROTOCOL,validateEffortArchive,effortBytes,exportEffort,newEffortCollection,effortSession,
 effortCurrent,effortProgress,navigateEffort,recordEffort,type EffortArchive,type EffortLoad,type EffortFiles,
 type EffortCollection,type EffortInstrument,type EffortHand,type EffortSession} from './calibration-effort';

export interface EffortControllerState {
 archive:EffortArchive;collection:EffortCollection|null;session:EffortSession|null;
 current:ReturnType<typeof effortCurrent>;progress:ReturnType<typeof effortProgress>|null;
 busy:boolean;error?:string;readOnly:boolean;broken:boolean;notes:string;inputGeneration:number;
}
export interface EffortControllerOptions {
 load:EffortLoad;files:EffortFiles;now?:()=>string;id?:()=>string;onChange?:(state:EffortControllerState)=>void;
}
/** Accepted evidence advances only after its complete additive archive is durably written. */
export class EffortController {
 private accepted:EffortArchive;private readonly retained:EffortLoad;
 private readonly router=createCalibrationInputRouter();private readonly midiHeld=new Set<string>();
 private readonly manualHeld=new Set<string>();private readonly controlsHeld=new Set<string>();
 private readonly listeners=new Set<(state:EffortControllerState)=>void>();
 private pending=false;private stopped=false;private interrupted=false;private epoch=0;private generation=0;
 private failure?:string;private note='';private flight:Promise<void>=Promise.resolve();
 private readonly now:()=>string;private readonly id:()=>string;
 constructor(private readonly options:EffortControllerOptions){
  this.retained={...options.load,raw:options.load.raw?new Uint8Array(options.load.raw):undefined};
  this.accepted=validateEffortArchive(options.load.value);this.clearReadiness();
  this.interrupted=this.active()!==null;this.failure=options.load.error;
  this.now=options.now??(()=>new Date().toISOString());this.id=options.id??(()=>crypto.randomUUID());
  if(options.onChange)this.listeners.add(options.onChange);
 }
 private active():EffortCollection|null{return this.accepted.collections.find(c=>c.id===this.accepted.activeCollectionId)??null;}
 private clearReadiness():void{for(const c of this.accepted.collections)c.preparedSetupIndex=null;}
 get archive():EffortArchive{return structuredClone(this.accepted);}
 get collection():EffortCollection|null{const c=this.active();return c?structuredClone(c):null;}
 get session():EffortSession|null{const c=this.active();return c?effortSession(c):null;}
 get busy():boolean{return this.pending;}
 get error():string|undefined{return this.failure;}
 get inputGeneration():number{return this.generation;}
 get state():EffortControllerState{return this.getState();}
 getState():EffortControllerState {
  const collection=this.collection;return{archive:this.archive,collection,session:collection?effortSession(collection):null,
   current:collection?effortCurrent(collection):{trial:null,block:null,needsSetup:false},progress:collection?effortProgress(collection):null,
   busy:this.pending,error:this.failure,readOnly:!!this.retained.error,broken:this.interrupted,notes:this.note,inputGeneration:this.generation};
 }
 subscribe(listener:(state:EffortControllerState)=>void):()=>void {
  if(this.stopped)return()=>{};this.listeners.add(listener);listener(this.getState());return()=>this.listeners.delete(listener);
 }
 private emit():void {
  if(this.stopped)return;for(const listener of this.listeners){try{listener(this.getState());}catch(error){
   this.failure=`Calibration screen update failed: ${error instanceof Error?error.message:String(error)}`;}}
 }
 private requireCollection(archive:EffortArchive):EffortCollection {
  return archive.collections.find(c=>c.id===archive.activeCollectionId)??(()=>{throw Error('Begin or continue a collection first.');})();
 }
 private update(archive:EffortArchive,c:EffortCollection):EffortArchive {
  const i=archive.collections.findIndex(v=>v.id===c.id);if(i<0)archive.collections.push(c);else archive.collections[i]=c;
  archive.activeCollectionId=c.id;return archive;
 }
 private mutate(build:(archive:EffortArchive)=>EffortArchive,kind:'edit'|'replace'|'prepare'='edit'):Promise<boolean> {
  if(this.stopped||this.pending||this.retained.error)return Promise.resolve(false);
  this.pending=true;this.failure=undefined;const epoch=this.epoch;
  let settle!:()=>void;this.flight=new Promise(resolve=>{settle=resolve;});this.emit();
  return(async()=>{try{
   const candidate=validateEffortArchive(build(this.archive));await this.options.files.write(EFFORT_FILE,effortBytes(candidate));
   const interrupted=epoch!==this.epoch||this.stopped;
   if(interrupted)for(const c of candidate.collections)c.preparedSetupIndex=null;
   this.accepted=candidate;
   if(!interrupted){if(kind==='replace')this.reset();if(kind==='replace'||kind==='prepare')this.interrupted=false;this.note='';}
   return true;
  }catch(error){if(!this.stopped)this.failure=`Calibration save failed: ${error instanceof Error?error.message:String(error)} The last saved evidence is unchanged.`;return false;}
  finally{this.pending=false;this.emit();settle();}})();
 }
 /** Begin creates at most one collection for the instrument; revisits resume it. */
 start(input:EffortInstrument|{instrument:EffortInstrument;hand?:EffortHand}):Promise<boolean> {
  const kind=typeof input==='string'?input:input.instrument,performingHand=typeof input==='string'?undefined:input.hand;
  return this.mutate(archive=>{
   const existing=archive.collections.find(c=>c.instrument===kind);
   if(existing){existing.preparedSetupIndex=null;if(performingHand)existing.performingHand=performingHand;return this.update(archive,existing);}
   const id=this.id();if(archive.collections.some(c=>c.id===id))throw Error('Duplicated collection identity.');
   return this.update(archive,newEffortCollection(id,kind,performingHand??'RH'));
  },'replace');
 }
 resume(collectionOrInstrument:string):Promise<boolean> {
  return this.mutate(archive=>{const c=archive.collections.find(c=>c.id===collectionOrInstrument||c.instrument===collectionOrInstrument);
   if(!c)throw Error('Unknown calibration collection.');c.preparedSetupIndex=null;return this.update(archive,c);},'replace');
 }
 prepare(notes?:string):Promise<boolean> {
  return this.mutate(archive=>{const c=this.requireCollection(archive),current=effortCurrent(c);
   if(!current.block)throw Error('There is no current setup to acknowledge.');
   c.setups.push({blockId:current.block.id,performingHand:c.performingHand,recordedAt:this.now(),protocolVersion:EFFORT_PROTOCOL.version,
    attestedInstruction:EFFORT_PROTOCOL.setup,...(notes===undefined?{}:{notes})});c.preparedSetupIndex=c.setups.length-1;return this.update(archive,c);},'prepare');
 }
 setup(notes?:string):Promise<boolean>{return this.prepare(notes);}
 setPerformingHand(performingHand:EffortHand):Promise<boolean> {
  return this.mutate(archive=>{const c=this.requireCollection(archive);c.performingHand=performingHand;c.preparedSetupIndex=null;return this.update(archive,c);},'replace');
 }
 navigate(trialId:string):Promise<boolean> {
  return this.mutate(archive=>this.update(archive,navigateEffort(this.requireCollection(archive),trialId)));
 }
 undo(observationIndex:number,reason:string):Promise<boolean> {
  return this.mutate(archive=>{const c=this.requireCollection(archive),observation=c.observations[observationIndex];
   if(!Number.isInteger(observationIndex)||!observation||c.retractions.some(r=>r.observationIndex===observationIndex))throw Error('Unknown or already retracted rating.');
   c.retractions.push({observationIndex,recordedAt:this.now(),reason});return this.update(archive,navigateEffort(c,observation.trialId));});
 }
 setNotes(notes:string):void{if(!this.stopped&&!this.pending)this.note=notes;}
 private ready():boolean {
  const c=this.active();return !this.stopped&&!this.pending&&!this.retained.error&&!this.interrupted&&!!c&&!!c.currentTrialId&&!effortCurrent(c).needsSetup;
 }
 private rating(grade:CalibrationGrade,input:CalibrationRatingInput,notes=this.note):Promise<boolean> {
  if(!this.ready())return Promise.resolve(false);
  return this.mutate(archive=>this.update(archive,recordEffort(this.requireCollection(archive),grade,input,this.now(),notes)));
 }
 rateButton(grade:CalibrationGrade,notes=this.note):Promise<boolean> {
  if(this.manualHeld.size||this.controlsHeld.size||!this.ready())return Promise.resolve(false);
  return this.rating(grade,{kind:'manual',code:`Digit${grade}`},notes);
 }
 rate(grade:CalibrationGrade,notes=this.note):Promise<boolean>{return this.rateButton(grade,notes);}
 input(event:CalibrationInputEvent,midiConnected:boolean):Promise<boolean> {
  if(this.stopped)return Promise.resolve(false);
  try{
   const s=this.session,trial=this.ready()?effortCurrent(this.active()!).trial:null;
   const context={keyboard:s?.plan.keyboard,trial,midiConnected};
   if(event.kind==='manual'){
    if(!/^(Digit|Numpad)[0-4]$/.test(event.code))return Promise.resolve(false);const key=`manual:${event.code}`;
    if(event.type==='key-up'){this.manualHeld.delete(key);this.controlsHeld.delete(key);
     if(s)this.router.route(event,{...context,keyboard:s.plan.keyboard});return Promise.resolve(false);}
    if(event.type!=='key-down'||event.repeat||this.manualHeld.has(key))return Promise.resolve(false);
    const busy=this.manualHeld.size>0||this.controlsHeld.size>0;this.manualHeld.add(key);if(!s)return Promise.resolve(false);
    const result=this.router.route(event,{...context,keyboard:s.plan.keyboard,trial:busy?null:trial});
    if(result.kind!=='rating')return Promise.resolve(false);this.controlsHeld.add(key);return this.rating(result.grade,result.input);
   }
   if(!midiConnected)return Promise.resolve(false);
   if(!['note-on','note-off'].includes(event.type)||typeof event.deviceId!=='string'||!event.deviceId.trim()||
    !Number.isInteger(event.channel)||event.channel<0||event.channel>15||!Number.isInteger(event.note)||event.note<0||event.note>127||
    !Number.isInteger(event.velocity)||event.velocity<0||event.velocity>127)throw Error('Invalid MIDI rating event.');
   const key=JSON.stringify(['midi',event.deviceId,event.channel,event.note]);
   if(event.type==='note-off'||event.velocity===0){this.midiHeld.delete(key);this.controlsHeld.delete(key);
    if(s)this.router.route(event,{...context,keyboard:s.plan.keyboard});return Promise.resolve(false);}
   if(this.midiHeld.has(key))return Promise.resolve(false);this.midiHeld.add(key);if(!s)return Promise.resolve(false);
   const busy=this.manualHeld.size>0||this.controlsHeld.size>0,displayed=effortCurrent(this.active()!).trial;
   if(displayed&&calibrationMidiGrade(s.plan.keyboard,displayed,event.note)!==null)this.controlsHeld.add(key);
   const result=this.router.route(event,{...context,keyboard:s.plan.keyboard,trial:busy?null:trial});
   if(result.kind!=='rating')return Promise.resolve(false);this.controlsHeld.add(key);return this.rating(result.grade,result.input);
  }catch(error){this.failure=`Calibration input refused: ${error instanceof Error?error.message:String(error)}`;this.emit();return Promise.resolve(false);}
 }
 reset():void{this.generation++;this.router.reset();this.midiHeld.clear();this.manualHeld.clear();this.controlsHeld.clear();}
 break():void{if(this.stopped)return;this.epoch++;this.interrupted=true;this.reset();this.note='';this.clearReadiness();this.emit();}
 dispose():void{if(this.stopped)return;this.break();this.stopped=true;this.listeners.clear();}
 flush():Promise<void>{return this.flight;}
 export():string{return exportEffort({...this.retained,value:this.archive});}
}
