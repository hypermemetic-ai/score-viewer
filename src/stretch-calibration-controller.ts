import {STRETCH_CALIBRATION_PROTOCOL, type StretchGrade, type StretchRatingInput,
 type PairSweepTerminal, type StretchCalibrationOmission, type RelativeFingertipReachObservation,
 type ConditionalTripleBoundaryObservation, type ConditionalTripleUnavailableObservation} from '@hypermemetic-ai/fingering-calculator';
import {STRETCH_FILE,validateStretchArchive,stretchBytes,stretchProgress,effectivePairReports,
 recommendedSpanSteps,stretchSlotStatus,type StretchArchive,type StretchLoad,type StretchFiles,
 type StretchCalibrationSession,type StretchCalibrationGeometry,type StretchCalibrationProvenance,
 type StretchCalibrationContact,type StretchPairTrial,type PairStretchObservation,type StretchCursor,
 type StretchCurrent,type StretchProgress} from './stretch-calibration';

export interface StretchCreateCollection {
 geometry:StretchCalibrationGeometry;provenance:StretchCalibrationProvenance;
 row?:1|2;anchorMidiPitch?:number;referenceFrameId?:string;
}
export interface StretchControllerState {
 archive:StretchArchive;session:StretchCalibrationSession|null;current:StretchCurrent;
 progress:StretchProgress|null;busy:boolean;readOnly:boolean;error?:string;
 resumeRequired:boolean;inputGeneration:number;canMarkMaximum:boolean;
}
export interface StretchControllerOptions {load:StretchLoad;files:StretchFiles;now?:()=>string;id?:()=>string;onChange?:(state:StretchControllerState)=>void}
export interface StretchBaseline {spanSteps?:number;anchorMidiPitch?:number;row?:1|2}
export interface StretchKeyEvent {type:'keydown'|'keyup';code:string;repeat?:boolean}
type BoundaryInput=Pick<ConditionalTripleBoundaryObservation,'sourcePairObservationId'|'boundaryContact'> & Partial<Pick<ConditionalTripleBoundaryObservation,'termination'|'configurationGrade'|'notes'>>;
type UnavailableInput=Pick<ConditionalTripleUnavailableObservation,'sourcePairObservationId'|'attemptedContacts'> & Pick<Partial<ConditionalTripleUnavailableObservation>,'notes'>;
const copy=<T>(v:T):T=>structuredClone(v);

/** Accepted ledger state is published only after the entire archive is durably written. */
export class StretchController {
 private accepted:StretchArchive;private readonly retained:StretchLoad;
 private readonly listeners=new Set<(state:StretchControllerState)=>void>();
 private readonly held=new Set<string>();private pending=false;private stopped=false;private prepared=false;
 private interrupted=false;private epoch=0;private generation=0;private failure?:string;private flight:Promise<void>=Promise.resolve();
 private readonly now:()=>string;private readonly id:()=>string;
 constructor(private readonly options:StretchControllerOptions){
  this.retained={...options.load,raw:options.load.raw===undefined?undefined:new Uint8Array(options.load.raw)};
  this.accepted=copy(options.load.value);this.failure=options.load.error;this.interrupted=this.active()!==null;
  this.now=options.now??(()=>new Date().toISOString());this.id=options.id??(()=>crypto.randomUUID());
  if(options.onChange)this.listeners.add(options.onChange);
 }
 private active(a=this.accepted):StretchCalibrationSession|null{return a.sessions.find(s=>s.id===a.activeSessionId)??null;}
 private require(a:StretchArchive):StretchCalibrationSession {const s=this.active(a);if(!s)throw Error('Create or select a collection first.');return s;}
 get archive():StretchArchive{return copy(this.accepted);}
 get session():StretchCalibrationSession|null{return copy(this.active());}
 get busy():boolean{return this.pending;}
 get state():StretchControllerState {
  const s=this.session,c=s?.cursor;return {archive:this.archive,session:s,current:{phase:c?.phase??null,slotId:c?.slotId??null,
   trial:c?.trialId?s!.pairTrials.find(t=>t.id===c.trialId)??null:null,
   pairSweep:c?.phase==='progressive-pairs'?s!.plan.pairSweeps.find(t=>t.id===c.slotId)??null:null,
   relativeSlot:c?.phase==='relative-fingertip-reach'?s!.plan.relativeReachSlots.find(t=>t.id===c.slotId)??null:null,
   tripleSlot:c?.phase==='conditional-triples'?s!.plan.tripleSlots.find(t=>t.id===c.slotId)??null:null,
   needsSetup:!!c&&c.phase!=='relative-fingertip-reach'&&!this.prepared},progress:s?stretchProgress(s):null,
   busy:this.pending,readOnly:!!this.retained.error,error:this.failure,resumeRequired:this.interrupted,
   inputGeneration:this.generation,canMarkMaximum:this.ready()&&!!s&&c?.phase==='progressive-pairs'&&effectivePairReports(s).some(e=>e.sweepId===c.slotId&&e.grade<5)};
 }
 getState():StretchControllerState{return this.state;}
 subscribe(listener:(state:StretchControllerState)=>void):()=>void{if(this.stopped)return()=>{};this.listeners.add(listener);listener(this.state);return()=>this.listeners.delete(listener);}
 private emit():void{if(this.stopped)return;for(const fn of this.listeners){try{fn(this.state);}catch(error){
  this.failure=`Calibration screen update failed: ${error instanceof Error?error.message:String(error)}`;
  this.epoch++;this.reset();this.interrupted=this.active()!==null;
 }}}
 private mutation(build:(a:StretchArchive)=>void,after?:()=>void):Promise<boolean> {
  if(this.stopped||this.pending||this.retained.error)return Promise.resolve(false);
  this.pending=true;this.failure=undefined;const epoch=this.epoch;let settle!:()=>void;
  this.flight=new Promise<void>(resolve=>{settle=resolve;});this.emit();
  return (async()=>{try{const candidate=copy(this.accepted);build(candidate);const admitted=await validateStretchArchive(candidate);
   await this.options.files.write(STRETCH_FILE,await stretchBytes(admitted));this.accepted=admitted;
   if(!this.stopped&&epoch===this.epoch)after?.();return true;
  }catch(error){if(!this.stopped)this.failure=`Calibration save failed: ${error instanceof Error?error.message:String(error)} The last saved evidence is unchanged.`;return false;}
  finally{this.pending=false;this.emit();settle();}})();
 }
 private stamp(notes?:string):{id:string;recordedAt:string;notes?:string}{return {id:this.id(),recordedAt:this.now(),...(notes===undefined?{}:{notes})};}
 private reset():void{this.held.clear();this.generation++;this.prepared=false;}
 createCollection(input:StretchCreateCollection):Promise<boolean> {
  return this.mutation(a=>{
   const id=this.id(),frame=input.referenceFrameId??`${id}:forward-frame`,direction=input.provenance.hand==='RH'?'higher-pitch' as const:'lower-pitch' as const;
   const sweeps=STRETCH_CALIBRATION_PROTOCOL.pairs.map((pair,i)=>({id:`${id}:pair:${i}`,pair:copy(pair),rowPolicy:'same-row' as const,targetDirection:direction}));
   const s:StretchCalibrationSession={version:'stretch-calibration-session-v1',id,plan:{version:'stretch-calibration-plan-v1',protocolVersion:STRETCH_CALIBRATION_PROTOCOL.version,scaleVersion:STRETCH_CALIBRATION_PROTOCOL.scaleVersion,
    geometry:copy(input.geometry),provenance:copy(input.provenance),relativeReachSlots:STRETCH_CALIBRATION_PROTOCOL.relativeReachPairs.map((pair,i)=>({id:`${id}:reach:${i}`,pair:copy(pair),referenceFrameId:frame})),pairSweeps:sweeps,
    tripleSlots:STRETCH_CALIBRATION_PROTOCOL.triples.map((triple,i)=>({id:`${id}:triple:${i}`,triple:copy(triple),anchorSweepId:sweeps.find(sw=>sw.pair[0]===triple[0]&&sw.pair[1]===triple[1])!.id,movingFinger:triple[2],targetDirection:direction,searchSurfaceIds:input.geometry.surfaces.map(v=>v.id)}))},entries:[],pairTrials:[],cursor:{phase:'relative-fingertip-reach',slotId:`${id}:reach:0`,trialId:null}};
   // The initial chosen arrangement is captured by a target, rather than an extra wire-format field.
   if(input.row!==undefined||input.anchorMidiPitch!==undefined)this.target(s,sweeps[0].id,2,input.row??1,input.anchorMidiPitch);
   a.sessions.push(s);a.activeSessionId=s.id;
  },()=>{this.reset();this.interrupted=false;});
 }
 selectCollection(id:string):Promise<boolean>{return this.mutation(a=>{if(!a.sessions.some(s=>s.id===id))throw Error('Unknown collection.');a.activeSessionId=id;},()=>{this.reset();this.interrupted=true;});}
 private lastReachable(s:StretchCalibrationSession,sweepId:string):PairStretchObservation|undefined {
  return effectivePairReports(s).filter(e=>e.sweepId===sweepId&&e.grade<5).sort((a,b)=>s.pairTrials.find(t=>t.id===a.trialId)!.distanceSemitoneSteps-s.pairTrials.find(t=>t.id===b.trialId)!.distanceSemitoneSteps).at(-1);
 }
 private nextCursor(s:StretchCalibrationSession):void {
  const done=(phase:StretchCursor['phase'],id:string)=>['recorded','omitted'].includes(stretchSlotStatus(s,phase,id));
  const r=s.plan.relativeReachSlots.find(v=>!done('relative-fingertip-reach',v.id));if(r){s.cursor={phase:'relative-fingertip-reach',slotId:r.id,trialId:null};return;}
  const sw=s.plan.pairSweeps.find(v=>!done('progressive-pairs',v.id));if(sw){
   const reports=effectivePairReports(s).filter(v=>v.sweepId===sw.id).sort((a,b)=>s.pairTrials.find(t=>t.id===a.trialId)!.distanceSemitoneSteps-s.pairTrials.find(t=>t.id===b.trialId)!.distanceSemitoneSteps),last=reports.at(-1),old=last?s.pairTrials.find(t=>t.id===last.trialId):undefined;
   const trial=last?.grade===5?old:old?this.target(s,sw.id,old.distanceSemitoneSteps+2,old.contacts[0].row as 1|2,old.contacts[0].midiPitch,false):undefined;
   s.cursor={phase:'progressive-pairs',slotId:sw.id,trialId:trial?.id??null};return;
  }
  const sl=s.plan.tripleSlots.find(v=>!done('conditional-triples',v.id));s.cursor=sl?{phase:'conditional-triples',slotId:sl.id,trialId:null}:null;
 }
 saveReach(reading:RelativeFingertipReachObservation['reading'],notes?:string):Promise<boolean>{
  return this.mutation(a=>{const s=this.require(a),c=s.cursor,slot=s.plan.relativeReachSlots.find(v=>v.id===c?.slotId);if(c?.phase!=='relative-fingertip-reach'||!slot)throw Error('Select a fingertip reading.');
   s.entries.push({kind:'relative-fingertip-reach',...this.stamp(notes),slotId:slot.id,pair:slot.pair,referenceFrameId:slot.referenceFrameId,reading:copy(reading)});this.nextCursor(s);
  },()=>{this.prepared=false;this.interrupted=false;});
 }
 skip(reason:StretchCalibrationOmission['reason']='operator-skip',notes?:string):Promise<boolean>{return this.mutation(a=>{const s=this.require(a),c=s.cursor;if(!c)throw Error('There is no selected slot.');s.entries.push({kind:'omission',...this.stamp(notes),phase:c.phase,slotId:c.slotId,reason});this.nextCursor(s);},()=>{this.prepared=false;this.interrupted=false;});}
 private target(s:StretchCalibrationSession,sweepId:string,span:number,row:1|2,anchor?:number,required=true):StretchPairTrial|undefined {
  if(!Number.isInteger(span)||span<2||span%2)throw Error('A same-row span must be a positive even number of steps.');
  const sw=s.plan.pairSweeps.find(v=>v.id===sweepId);if(!sw)throw Error('Unknown pair sweep.');
  const g=s.plan.geometry,sign=s.plan.provenance.hand==='RH'?1:-1;
  if(anchor===undefined){const prior=s.pairTrials.find(t=>t.sweepId===sweepId)??s.pairTrials[0];if(prior&&prior.contacts[0].row===row)anchor=prior.contacts[0].midiPitch;
   else{const desired=g.originMidiPitch+s.plan.provenance.referenceLocation.xMm/13.75;anchor=g.surfaces.filter(v=>v.row===row).sort((a,b)=>Math.abs(a.midiPitch-desired)-Math.abs(b.midiPitch-desired))[0]?.midiPitch;}}
  const second=Number(anchor)+sign*span;
  const surfaces=[anchor,second].map(p=>g.surfaces.find(v=>v.midiPitch===p&&v.row===row));
  if(!surfaces.every(Boolean)){if(required)throw Error('That span is outside the admitted keyboard range.');return undefined;}
  const existing=s.pairTrials.find(t=>t.sweepId===sweepId&&t.contacts[0].row===row&&t.contacts[0].midiPitch===anchor&&t.distanceSemitoneSteps===span);if(existing)return existing;
  const contacts=surfaces.map((surface,i)=>({finger:sw.pair[i],actuatorId:surface!.actuatorId,midiPitch:surface!.midiPitch,row:surface!.row,keyState:'depressed' as const,location:{kind:'surface-region' as const,surfaceId:surface!.id,uRange:[0,1] as const,vRange:[0,1] as const}})) as unknown as StretchPairTrial['contacts'];
  const t:StretchPairTrial={id:this.id(),sweepId,contacts,distanceSemitoneSteps:span};s.pairTrials.push(t);return t;
 }
 prepareBaseline(input:StretchBaseline={},notes?:string):Promise<boolean>{return this.mutation(a=>{
  const s=this.require(a),c=s.cursor,sw=s.plan.pairSweeps.find(v=>v.id===c?.slotId);if(c?.phase!=='progressive-pairs'||!sw)throw Error('Select a pair sweep.');
  if(effectivePairReports(s).some(e=>e.sweepId===sw.id))throw Error('The rated sweep arrangement is fixed; select an existing target to recheck it.');
  const old=c.trialId?s.pairTrials.find(t=>t.id===c.trialId):s.pairTrials.find(t=>t.sweepId===sw.id);
  const firstReport=s.entries.find(e=>e.kind==='pair-stretch');
  const inherited=firstReport?.kind==='pair-stretch'?s.pairTrials.find(t=>t.id===firstReport.trialId):s.pairTrials[0];
  const row=input.row??(old?.contacts[0].row as 1|2|undefined)??(inherited?.contacts[0].row as 1|2|undefined)??1;
  const anchor=input.anchorMidiPitch??old?.contacts[0].midiPitch??(inherited?.contacts[0].row===row?inherited.contacts[0].midiPitch:undefined);
  const t=this.target(s,sw.id,input.spanSteps??recommendedSpanSteps(s,sw.pair),row,anchor)!;c.trialId=t.id;
  // Setup notes are retained with the eventual actual report, not fabricated as an observation.
 },()=>{this.baselineNotes=notes;this.prepared=false;this.interrupted=false;});}
 private baselineNotes?:string;
 adjustSpan(deltaEvenSteps:number):Promise<boolean>{const state=this.state;if(!state.session||!state.current.pairSweep)return Promise.resolve(false);return this.prepareBaseline({spanSteps:(state.current.trial?.distanceSemitoneSteps??recommendedSpanSteps(state.session,state.current.pairSweep.pair))+deltaEvenSteps});}
 prepare():Promise<boolean>{
  if(this.stopped||this.pending||this.retained.error||!this.active()?.cursor)return Promise.resolve(false);
  const current=this.state.current;if(current.phase==='progressive-pairs'&&!current.trial)return Promise.resolve(false);
  this.prepared=true;this.interrupted=false;this.failure=undefined;this.emit();return Promise.resolve(this.prepared);
 }
 private ready():boolean{return !this.stopped&&!this.pending&&!this.retained.error&&!this.interrupted&&this.prepared;}
 private terminal(s:StretchCalibrationSession,sweepId:string,reason:PairSweepTerminal['reason'],unavailableId:string|null=null,notes?:string):void {
  s.entries.push({kind:'pair-sweep-terminal',...this.stamp(notes),sweepId,reason,lastReachableObservationId:this.lastReachable(s,sweepId)?.id??null,firstUnavailableObservationId:unavailableId});
 }
 rate(grade:StretchGrade,input:StretchRatingInput={kind:'screen'},expectedTrialId?:string,notes?:string):Promise<boolean>{
  if(!this.ready()||input.kind==='screen'&&this.held.size>0)return Promise.resolve(false);
  const selected=this.state.current.trial;if(!selected||expectedTrialId!==undefined&&expectedTrialId!==selected.id)return Promise.resolve(false);
  const prior=this.active()!,isRevision=effectivePairReports(prior).some(e=>e.trialId===selected.id);
  const hasBaseline=effectivePairReports(prior).some(e=>e.sweepId===selected.sweepId&&e.grade<5&&e.trialId!==selected.id&&prior.pairTrials.find(t=>t.id===e.trialId)!.distanceSemitoneSteps<selected.distanceSemitoneSteps);
  if(grade===5&&!hasBaseline){this.failure='Find a reachable starting span before rating outward stretch. Widen the starting span if this one is too close.';this.emit();return Promise.resolve(false);}
  let continuing=false;
  return this.mutation(a=>{const s=this.require(a),t=s.pairTrials.find(v=>v.id===selected.id);if(s.cursor?.trialId!==selected.id||!t)throw Error('The displayed trial changed.');
   const e:PairStretchObservation=grade===5?{kind:'pair-stretch',...this.stamp(notes??this.baselineNotes),trialId:t.id,sweepId:t.sweepId,grade,input:copy(input),realization:null}:{kind:'pair-stretch',...this.stamp(notes??this.baselineNotes),trialId:t.id,sweepId:t.sweepId,grade,input:copy(input),realization:{id:this.id(),contacts:copy(t.contacts)}};
   s.entries.push(e);
   if(isRevision&&['recorded','omitted'].includes(stretchSlotStatus(s,'progressive-pairs',t.sweepId))){this.nextCursor(s);return;}
   if(grade===5){this.terminal(s,t.sweepId,'first-unavailable',e.id);this.nextCursor(s);return;}
   const next=this.target(s,t.sweepId,t.distanceSemitoneSteps+2,t.contacts[0].row as 1|2,t.contacts[0].midiPitch,false);
   if(next){s.cursor={phase:'progressive-pairs',slotId:t.sweepId,trialId:next.id};continuing=true;}
   else{this.terminal(s,t.sweepId,'coverage-edge');this.nextCursor(s);}
  },()=>{this.prepared=continuing;this.baselineNotes=undefined;});
 }
 markMaximum(notes?:string):Promise<boolean>{if(!this.ready())return Promise.resolve(false);return this.mutation(a=>{const s=this.require(a),c=s.cursor;if(c?.phase!=='progressive-pairs'||!this.lastReachable(s,c.slotId))throw Error('A maximum declaration requires a reachable result.');this.terminal(s,c.slotId,'maximum-reachable',null,notes);this.nextCursor(s);},()=>{this.prepared=false;});}
 stopSweep(notes?:string):Promise<boolean>{return this.mutation(a=>{const s=this.require(a),c=s.cursor;if(c?.phase!=='progressive-pairs')throw Error('Select a pair sweep.');this.terminal(s,c.slotId,'operator-stop',null,notes);this.nextCursor(s);},()=>{this.prepared=false;});}
 navigate(cursor:Omit<StretchCursor,'trialId'> & {trialId?:string|null}):Promise<boolean>{return this.mutation(a=>{this.require(a).cursor={...cursor,trialId:cursor.trialId??null};},()=>{this.prepared=false;this.interrupted=true;this.generation++;});}
 retract(entryId:string,reason:string):Promise<boolean>{return this.mutation(a=>{const s=this.require(a),e=s.entries.find(v=>v.id===entryId);if(!e||e.kind==='retraction')throw Error('Unknown or immutable retraction target.');s.entries.push({kind:'retraction',...this.stamp(),entryId,reason});this.nextCursor(s);},()=>{this.prepared=false;this.interrupted=true;});}
 tripleSources(slotId=this.state.current.slotId??''):PairStretchObservation[]{const s=this.active(),sl=s?.plan.tripleSlots.find(v=>v.id===slotId);return s&&sl?copy(effectivePairReports(s).filter(e=>e.sweepId===sl.anchorSweepId&&e.grade===3)):[];}
 private tripleSource(s:StretchCalibrationSession,sourceId:string):PairStretchObservation & {grade:3;realization:NonNullable<PairStretchObservation['realization']>} {
  const slot=s.plan.tripleSlots.find(v=>v.id===s.cursor?.slotId),source=effectivePairReports(s).find(v=>v.id===sourceId);
  if(s.cursor?.phase!=='conditional-triples'||!slot||!source||source.sweepId!==slot.anchorSweepId||source.grade!==3||!source.realization)throw Error('Choose a current recorded grade-3 anchor pair.');return source as PairStretchObservation & {grade:3;realization:NonNullable<PairStretchObservation['realization']>};
 }
 saveTripleBoundary(input:BoundaryInput):Promise<boolean>{if(!this.ready())return Promise.resolve(false);return this.mutation(a=>{const s=this.require(a),source=this.tripleSource(s,input.sourcePairObservationId);s.entries.push({kind:'conditional-triple-boundary',...this.stamp(input.notes),slotId:s.cursor!.slotId,sourcePairObservationId:source.id,anchorRealizationId:source.realization.id,boundaryContact:copy(input.boundaryContact),boundaryKind:'operator-declared-last-usable',termination:input.termination??'usable-limit',configurationGrade:input.configurationGrade??null});this.nextCursor(s);},()=>{this.prepared=false;});}
 saveTripleUnavailable(input:UnavailableInput):Promise<boolean>{if(!this.ready())return Promise.resolve(false);return this.mutation(a=>{const s=this.require(a),source=this.tripleSource(s,input.sourcePairObservationId);s.entries.push({kind:'conditional-triple-unavailable',...this.stamp(input.notes),slotId:s.cursor!.slotId,sourcePairObservationId:source.id,anchorRealizationId:source.realization.id,outcome:'no-usable-outward-contact',attemptedContacts:copy(input.attemptedContacts)});this.nextCursor(s);},()=>{this.prepared=false;});}
 inputKey(event:StretchKeyEvent):Promise<boolean>{
  if(this.stopped||!/^(Digit|Numpad)[0-5]$/.test(event.code))return Promise.resolve(false);
  if(event.type==='keyup'){this.held.delete(event.code);return Promise.resolve(false);}
  if(event.repeat||this.held.has(event.code))return Promise.resolve(false);
  const wasHeld=this.held.size>0;this.held.add(event.code);if(wasHeld||!this.ready())return Promise.resolve(false);
  const grade=Number(event.code.at(-1)) as StretchGrade,trialId=this.state.current.trial?.id;
  return this.rate(grade,{kind:'keyboard',code:event.code as `Digit${StretchGrade}`|`Numpad${StretchGrade}`},trialId);
 }
 break():void{if(this.stopped)return;this.epoch++;this.reset();this.interrupted=this.active()!==null;this.emit();}
 flush():Promise<void>{return this.flight;}
 export():string {return new TextDecoder('utf-8',{fatal:true}).decode(this.exportBytes());}
 exportBytes():Uint8Array {
  if(this.retained.error){if(this.retained.raw===undefined)throw Error('The original file could not be read; no replacement export is available.');return new Uint8Array(this.retained.raw);}
  return new TextEncoder().encode(JSON.stringify(this.accepted)+'\n');
 }
 dispose():void{if(this.stopped)return;this.break();this.stopped=true;this.listeners.clear();}
}
