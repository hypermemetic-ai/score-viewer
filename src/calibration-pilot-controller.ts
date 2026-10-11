import {
 createCalibrationInputRouter, calibrationMidiGrade, createExploratoryCalibrationSession, exploratoryCalibrationCurrent,
 exploratoryCalibrationProgress, prepareExploratoryCalibrationBlock, recordExploratoryCalibrationObservation,
 navigateExploratoryCalibrationTrial, retractExploratoryCalibrationObservation, resumeExploratoryCalibrationSession,
 type CalibrationInputEvent,type CalibrationGrade,type CalibrationRatingInput,type ExploratoryCalibrationSession,
} from '@hypermemetic-ai/fingering-calculator';
import {PILOT_FILE,createPilotPlan,exportPilot,pilotBytes,validatePilotArchive,
 type PilotArchive,type PilotLoad,type PilotSetup,type PilotFiles} from './calibration-pilot';

export interface PilotControllerState {
 archive:PilotArchive;session:ExploratoryCalibrationSession|null;
 current:ReturnType<typeof exploratoryCalibrationCurrent>;
 progress:ReturnType<typeof exploratoryCalibrationProgress>|null;
 busy:boolean;error?:string;readOnly:boolean;broken:boolean;notes:string;
}
export interface PilotControllerOptions {
 load:PilotLoad;files:PilotFiles;now?:()=>string;id?:()=>string;
 onChange?:(state:PilotControllerState)=>void;
}

/** The accepted snapshot changes only after a successful durable write. Input edge state is transient. */
export class PilotController {
 private accepted:PilotArchive;
 private readonly retained:PilotLoad;
 private readonly router=createCalibrationInputRouter();
 private readonly midiHeld=new Set<string>();
 private readonly manualHeld=new Set<string>();
 private readonly controlsHeld=new Set<string>();
 private readonly listeners=new Set<(state:PilotControllerState)=>void>();
 private pending=false;
 private stopped=false;
 private interrupted=false;
 private epoch=0;
 private failure?:string;
 private note='';
 private flight:Promise<void>=Promise.resolve();
 private readonly now:()=>string;
 private readonly id:()=>string;
 constructor(private readonly options:PilotControllerOptions){
  this.retained={...options.load,raw:options.load.raw?new Uint8Array(options.load.raw):undefined};
  this.accepted=validatePilotArchive(options.load.value);
  // Opening is a break, even when the disk contains a prepared block.
  this.accepted.sessions=this.accepted.sessions.map(resumeExploratoryCalibrationSession);
  this.interrupted=this.active()!==null;
  this.failure=options.load.error;
  this.now=options.now??(()=>new Date().toISOString());this.id=options.id??(()=>crypto.randomUUID());
  if(options.onChange)this.listeners.add(options.onChange);
 }
 private active():ExploratoryCalibrationSession|null {
  return this.accepted.sessions.find(s=>s.id===this.accepted.activeSessionId)??null;
 }
 get archive():PilotArchive{return structuredClone(this.accepted);}
 get session():ExploratoryCalibrationSession|null {const s=this.active();return s?structuredClone(s):null;}
 get busy():boolean{return this.pending;}
 get error():string|undefined{return this.failure;}
 get state():PilotControllerState{return this.getState();}
 getState():PilotControllerState {
  const session=this.session,current=session?exploratoryCalibrationCurrent(session):{trial:null,block:null,needsSetup:false};
  return{archive:this.archive,session,current,progress:session?exploratoryCalibrationProgress(session):null,
   busy:this.pending,error:this.failure,readOnly:!!this.retained.error,broken:this.interrupted,notes:this.note};
 }
 subscribe(listener:(state:PilotControllerState)=>void):()=>void {
  if(this.stopped)return()=>{};this.listeners.add(listener);listener(this.getState());return()=>this.listeners.delete(listener);
 }
 private emit():void {
  if(this.stopped)return;
  for(const listener of this.listeners){try{listener(this.getState());}catch(error){this.failure=`Calibration screen update failed: ${error instanceof Error?error.message:String(error)}`;}}
 }
 private updateSession(archive:PilotArchive,session:ExploratoryCalibrationSession):PilotArchive {
  const index=archive.sessions.findIndex(s=>s.id===session.id);
  if(index<0)archive.sessions.push(session);else archive.sessions[index]=session;
  archive.activeSessionId=session.id;return archive;
 }
 private mutate(build:(archive:PilotArchive)=>PilotArchive,kind:'edit'|'replace'|'prepare'='edit'):Promise<boolean> {
  if(this.stopped||this.pending||this.retained.error)return Promise.resolve(false);
  this.pending=true;this.failure=undefined;const epoch=this.epoch;
  let settle!:()=>void;this.flight=new Promise(resolve=>{settle=resolve;});this.emit();
  return(async()=>{
   try {
    const candidate=validatePilotArchive(build(this.archive));
    await this.options.files.write(PILOT_FILE,pilotBytes(candidate));
    // Writes already in flight remain evidence. A break/disposal cannot revive prepared state or UI.
    const interrupted=epoch!==this.epoch||this.stopped;
    if(interrupted)candidate.sessions=candidate.sessions.map(resumeExploratoryCalibrationSession);
    this.accepted=candidate;
    if(!interrupted){
     if(kind==='replace')this.reset();
     if(kind==='replace'||kind==='prepare')this.interrupted=false;
     this.note='';
    }
    return true;
   }catch(error){
    if(!this.stopped)this.failure=`Pilot save failed: ${error instanceof Error?error.message:String(error)} The last saved evidence is unchanged.`;
    return false;
   }finally{this.pending=false;this.emit();settle();}
  })();
 }
 start(setup:PilotSetup):Promise<boolean> {
  return this.mutate(archive=>{
   const id=this.id();if(archive.sessions.some(s=>s.id===id))throw Error('A pilot session with this identity already exists.');
   return this.updateSession(archive,createExploratoryCalibrationSession(id,{
    playerId:archive.playerId,setupId:setup.setupId,bodyMidlineXmm:setup.bodyMidlineXmm,reference:setup.reference,
   },createPilotPlan(setup)));
  },'replace');
 }
 prepare(notes?:string):Promise<boolean> {
  return this.mutate(archive=>{
   const s=this.requireSession(archive),current=exploratoryCalibrationCurrent(s);
   if(!current.block)throw Error('The pilot has no current block to prepare.');
   return this.updateSession(archive,prepareExploratoryCalibrationBlock(s,{blockId:current.block.id,recordedAt:this.now(),...(notes===undefined?{}:{notes})}));
  },'prepare');
 }
 setup(notes?:string):Promise<boolean>{return this.prepare(notes);}
 resume(sessionId:string):Promise<boolean> {
  return this.mutate(archive=>{
   const s=archive.sessions.find(s=>s.id===sessionId);if(!s)throw Error('Unknown pilot session.');
   return this.updateSession(archive,resumeExploratoryCalibrationSession(s));
  },'replace');
 }
 private requireSession(archive:PilotArchive):ExploratoryCalibrationSession {
  return archive.sessions.find(s=>s.id===archive.activeSessionId)??(()=>{throw Error('Start or select a pilot session first.');})();
 }
 navigate(trialId:string):Promise<boolean> {
  return this.mutate(archive=>this.updateSession(archive,navigateExploratoryCalibrationTrial(this.requireSession(archive),trialId)));
 }
 undo(observationIndex:number,reason:string):Promise<boolean> {
  return this.mutate(archive=>this.updateSession(archive,retractExploratoryCalibrationObservation(this.requireSession(archive),observationIndex,this.now(),reason)));
 }
 setNotes(notes:string):void {if(!this.stopped&&!this.pending)this.note=notes;}
 private ready():boolean {
  if(this.stopped||this.pending||this.retained.error||this.interrupted)return false;
  const s=this.active();return !!s&&!!s.currentTrialId&&!exploratoryCalibrationCurrent(s).needsSetup;
 }
 private rating(grade:CalibrationGrade,input:CalibrationRatingInput,trialId:string,notes=this.note):Promise<boolean> {
  if(!this.ready())return Promise.resolve(false);
  return this.mutate(archive=>this.updateSession(archive,recordExploratoryCalibrationObservation(this.requireSession(archive),{
   trialId,grade,input,recordedAt:this.now(),evidence:{patternsPerformed:grade===4?[]:['combined','trill'],...(notes?{notes}:{} )},
  })));
 }
 rateButton(grade:CalibrationGrade,notes=this.note):Promise<boolean> {
  // A click is a manual grade command, not a synthetic physical down/up pair.
  if(this.manualHeld.size||this.controlsHeld.size||!this.ready())return Promise.resolve(false);
  return this.rating(grade,{kind:'manual',code:`Digit${grade}`},this.active()!.currentTrialId!,notes);
 }
 rate(grade:CalibrationGrade,notes=this.note):Promise<boolean>{return this.rateButton(grade,notes);}
 input(event:CalibrationInputEvent,midiConnected:boolean):Promise<boolean> {
  if(this.stopped)return Promise.resolve(false);
  try {
   const s=this.active(),trial=this.ready()?exploratoryCalibrationCurrent(s!).trial:null;
   const context={keyboard:s?.plan.keyboard,trial,midiConnected};
   if(event.kind==='manual'){
    if(!/^(Digit|Numpad)[0-4]$/.test(event.code))return Promise.resolve(false);
    const key=`manual:${event.code}`;
    if(event.type==='key-up'){
     this.manualHeld.delete(key);this.controlsHeld.delete(key);
     if(s)this.router.route(event,{...context,keyboard:s.plan.keyboard});return Promise.resolve(false);
    }
    if(event.type!=='key-down'||event.repeat||this.manualHeld.has(key))return Promise.resolve(false);
    const busy=this.manualHeld.size>0||this.controlsHeld.size>0;this.manualHeld.add(key);
    if(!s)return Promise.resolve(false);
    const result=this.router.route(event,{...context,keyboard:s.plan.keyboard,trial:busy?null:trial});
    if(result.kind!=='rating')return Promise.resolve(false);
    this.controlsHeld.add(key);return this.rating(result.grade,result.input,result.trialId);
   }
   // The host owns native source/generation/timestamps/channel conversion. Keep only logical key identities here.
   if(!midiConnected)return Promise.resolve(false);
   if(!['note-on','note-off'].includes(event.type)||typeof event.deviceId!=='string'||!event.deviceId.trim()||
    !Number.isInteger(event.channel)||event.channel<0||event.channel>15||!Number.isInteger(event.note)||event.note<0||event.note>127||
    !Number.isInteger(event.velocity)||event.velocity<0||event.velocity>127)throw Error('Invalid MIDI rating event.');
   const key=JSON.stringify(['midi',event.deviceId,event.channel,event.note]);
   if(event.type==='note-off'||event.velocity===0){
    this.midiHeld.delete(key);this.controlsHeld.delete(key);
    if(s)this.router.route(event,{...context,keyboard:s.plan.keyboard});return Promise.resolve(false);
   }
   if(this.midiHeld.has(key))return Promise.resolve(false);
   this.midiHeld.add(key);if(!s)return Promise.resolve(false);
   const busy=this.manualHeld.size>0||this.controlsHeld.size>0;
   // Remember eligible controls even when a write/setup/chord gate withholds the trial from the router.
   const displayed=exploratoryCalibrationCurrent(s).trial;
   if(displayed&&calibrationMidiGrade(s.plan.keyboard,displayed,event.note)!==null)this.controlsHeld.add(key);
   const result=this.router.route(event,{...context,keyboard:s.plan.keyboard,trial:busy?null:trial});
   if(result.kind!=='rating')return Promise.resolve(false);
   this.controlsHeld.add(key);return this.rating(result.grade,result.input,result.trialId);
  }catch(error){this.failure=`Pilot input refused: ${error instanceof Error?error.message:String(error)}`;this.emit();return Promise.resolve(false);}
 }
 reset():void {this.router.reset();this.midiHeld.clear();this.manualHeld.clear();this.controlsHeld.clear();}
 break():void {
  if(this.stopped)return;this.epoch++;this.interrupted=true;this.reset();this.note='';
  this.accepted.sessions=this.accepted.sessions.map(resumeExploratoryCalibrationSession);this.emit();
 }
 dispose():void {if(this.stopped)return;this.break();this.stopped=true;this.listeners.clear();}
 /** Await even after disposal before reopening/loading, so an older in-flight write cannot overwrite a new session. */
 flush():Promise<void>{return this.flight;}
 export():string{return exportPilot({...this.retained,value:this.archive});}
}
