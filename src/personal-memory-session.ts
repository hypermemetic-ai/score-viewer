import type {AssistanceSnapshot,AssistanceStore} from './durable-assistance-store';
import {isPitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import {hashBytes,validateLayerAsync,type ScorePackage} from './package';
import {assigned,type PersonalHand} from './personal-assignments';
import {personalStorageName,initialPersonal,readPersonal,restoreAll,type Entry,type PersonalState} from './state';
import {
 bootstrapPersonalFingeringMemory,readPersonalFingeringMemory,registerMemoryScore,importPersonalMemoryScore,projectPersonalMemoryScore,
 resolvePersonalFingeringMemory,captureMemoryFingerEdit,editPersonalFingeringMemory,promotePersonalFingeringReference,
 deletePersonalFingeringEntry,consolidatePersonalFingeringMemory,preservePersonalMemoryHandChange,
 type PersonalFingeringMemory,type MemoryScoreInput,type MemoryFingerEdit,type ConsolidationReceipt,
} from './personal-fingering-memory';

export const personalMemoryDocument='personal-fingering-memory';
const pendingDocument='personal-fingering-pending';
const appliedDocument='personal-fingering-applied';
const bootstrapDocument='personal-fingering-bootstrap';
const maxAttempts=16;
type FingerOperation='none'|'add'|'shared'|'local'|'reset';
export type PersonalMemoryAction=
 | {kind:'finger';edit:MemoryFingerEdit;operation?:FingerOperation}
 | {kind:'hand';ownerId:string;hand:PersonalHand;decisionId:string;authoredAt:string}
 | {kind:'reference';ownerId:string;decisionId:string;authoredAt:string}
 | {kind:'reset'|'calculated'|'restoreAll'|'undoRestore';ownerId:string;decisionId:string;authoredAt:string};
/** Serializable, source-bound user intent. A package and whole personal snapshot
 * are deliberately not journaled as replacement state. */
export interface CapturedPersonalMemoryIntent {
 version:1;id:string;entryId:string;sourceRevision:string;sourceSha256?:string;
 personalKey:string;ownerId:string;guard:{pitch:number;startTick:number;durationTicks:number};
 action:PersonalMemoryAction;undoGuard?:string;
}
export interface PersonalMemorySessionOptions {
 /** Complete active library only. Never return historical editions/undo donors. */
 scanLibrary():Promise<readonly MemoryScoreInput[]>;
 /** Verify archive and legacy personal bytes observed by scanLibrary. */
 validateInputs?(inputs:readonly MemoryScoreInput[]):Promise<boolean>;
 playerId?:string;
}
export interface PersonalMemoryAccepted {
 intent:CapturedPersonalMemoryIntent;personal:PersonalState;memory:PersonalFingeringMemory;saved:Promise<void>;
}
export interface PersonalMemoryConsolidationRequest {
 entryIds:readonly string[];receiptId:string;
 /** Select the admitted presentation when a library entry has several. */
 personalKeys?:readonly string[];
 /** Called after queued saves drain and immediately before activation. */
 isSafe():boolean|Promise<boolean>;
 /** Bind an externally prepared request to exact admitted sources. */
 sourceRevisions?:Readonly<Record<string,string>>;
}
const source=(p:ScorePackage)=>p.sourceRevision??p.manifest.revision;
const clone=<T>(value:T):T=>structuredClone(value);
/** Projection is derived, never a donor or durable authority. */
export function rawMemoryPersonal(personal:PersonalState):PersonalState {
 const raw=clone(personal) as PersonalState&{memoryResolved?:unknown};delete raw.memoryResolved;return raw;
}
const json=<T>(value:T):T=>JSON.parse(JSON.stringify(value));
const inputKey=(input:MemoryScoreInput)=>personalStorageName(input.entryId,input.p);
const undoGuard=(personal:PersonalState)=>JSON.stringify({undo:personal.undo,undoAssignments:personal.undoAssignments,undoCalculatedOwners:personal.undoCalculatedOwners});
const record=(value:unknown):Record<string,any>=>{
 if(value===undefined)return{};
 if(!value||typeof value!=='object'||Array.isArray(value))throw Error('Invalid personal memory transaction journal.');
 return clone(value as Record<string,any>);
};
const frozenInputs=(inputs:readonly MemoryScoreInput[])=>inputs.map(input=>({...input,personal:rawMemoryPersonal(input.personal)}));
async function inputHashes(inputs:readonly MemoryScoreInput[]):Promise<Record<string,string>> {
 const rows=await Promise.all(inputs.map(async input=>[inputKey(input),await hashBytes(JSON.stringify({entryId:input.entryId,sourceRevision:source(input.p),sourceSha256:input.p.sourceSha256,personal:rawMemoryPersonal(input.personal)}))] as const));
 const result:Record<string,string>={};for(const [key,hash]of rows){if(result[key]&&result[key]!==hash)throw Error('Conflicting personal snapshots for one source.');result[key]=hash;}
 return Object.fromEntries(Object.entries(result).sort(([a],[b])=>a.localeCompare(b)));
}

/** One application-owned coordinator. All writers merge against the latest
 * immutable manifest. Another process can win CAS without losing either edit. */
export class PersonalMemorySession {
 private snapshot?:AssistanceSnapshot;
 private optimistic?:PersonalFingeringMemory;
 private initializing?:Promise<void>;
 private tail:Promise<void>=Promise.resolve();
 private queued:Array<()=>Promise<void>>=[];
 private failed?:Error;
 private maintenance=false;
 private inputs=new Map<string,MemoryScoreInput>();
 private pending=new Map<string,CapturedPersonalMemoryIntent>();
 constructor(private readonly store:AssistanceStore,private readonly options:PersonalMemorySessionOptions){}
 private observedMemory?:PersonalFingeringMemory|string;private observedGeneration=0;
 /** A rebase may replace optimistic content with a different document bearing
  * the same revision. Cache authority by identity as well as revision. */
 get memoryGeneration(){const authority=this.pending.size?this.optimistic:this.snapshot?.refs[personalMemoryDocument];if(this.observedMemory!==authority){this.observedMemory=authority;this.observedGeneration++;}return this.observedGeneration;}
 get memoryRevision(){return this.optimistic?.revision??0;}
 get memory():PersonalFingeringMemory {if(!this.optimistic)throw Error('Personal fingering memory has not finished indexing.');return clone(this.optimistic);}
 get revision(){return this.snapshot?.revision??0;}
 get error(){return this.failed;}
 get recovery(){return [...this.pending.values()].map(clone);}
 initialize():Promise<void>{return this.initializing??=this.initializeOnce().catch(error=>{this.initializing=undefined;throw error;});}
 private async initializeOnce(){
  for(let attempt=0;attempt<maxAttempts;attempt++){
   const current=await this.store.read();
   if(current.documents[personalMemoryDocument]!==undefined){this.adopt(current);break;}
   const inputs=frozenInputs(await this.options.scanLibrary());this.remember(inputs);
   const actual=inputs.map(input=>({...input,personal:this.personalAt(current,input)}));
   const hashes=await inputHashes(actual),memory=bootstrapPersonalFingeringMemory(actual,this.options.playerId);
   if(this.options.validateInputs&&!await this.options.validateInputs(inputs))throw Error('Personal library changed during indexing. Retry from the current library.');
   const changes:Record<string,unknown>={[personalMemoryDocument]:memory,[bootstrapDocument]:{version:1,complete:true,inputHashes:hashes}};
   for(const input of actual)changes[inputKey(input)]=input.personal;
   const result=await this.store.commit({expectedRevision:current.revision,changes:json(changes)});
   if(result.status==='committed'){this.adopt(result.snapshot);break;}
  }
  if(!this.snapshot)throw Error('Personal library remained busy during indexing.');
  const recovery=record(this.snapshot.documents[pendingDocument]);
  if(Object.keys(recovery).length){
   if(!this.inputs.size)this.remember(frozenInputs(await this.options.scanLibrary()));
   for(const raw of Object.values(recovery)){const intent=this.readIntent(raw);this.pending.set(intent.id,intent);}
   // Recovery is explicit: surface a failed journal instead of silently replaying
   // potentially stale source intent while a score is still opening.
   this.failed=Error('Personal fingering saves are pending recovery.');
  }
 }
 private remember(inputs:readonly MemoryScoreInput[]){for(const input of inputs){const key=inputKey(input),old=this.inputs.get(key),pending=[...this.pending.values()].some(intent=>intent.personalKey===key);this.inputs.set(key,{...input,personal:pending&&old?old.personal:rawMemoryPersonal(input.personal)});}}
 /** Latest known durable raw authority plus this session's queued edits. This
 * does not reread the library or expose inherited copies as fresh evidence. */
 personalFor(input:MemoryScoreInput):PersonalState {
  if(!this.snapshot)throw Error('Personal fingering memory has not finished indexing.');
  const key=inputKey(input),pending=[...this.pending.values()].some(intent=>intent.personalKey===key),remembered=this.inputs.get(key);
  return rawMemoryPersonal(pending&&remembered?remembered.personal:this.personalAt(this.snapshot,input));
 }
 currentInputs():MemoryScoreInput[]{return [...this.inputs.values()].map(input=>({...input,personal:this.personalFor(input)}));}
 private adopt(snapshot:AssistanceSnapshot){
  const document=readPersonalFingeringMemory(snapshot.documents[personalMemoryDocument]);
  if(!document.indexed)throw Error('Personal fingering library index is incomplete.');
  this.snapshot=snapshot;this.optimistic=document;
 }
 private personalAt(snapshot:AssistanceSnapshot,input:MemoryScoreInput):PersonalState {
  const key=inputKey(input);return readPersonal(snapshot.documents[key]??rawMemoryPersonal(input.personal),input.p);
 }
 /** Durable personal authority wins over legacy files. Loading never copies a
 * resolved/inherited display value into personal authorship. */
 async loadPersonalCurrent(entry:Pick<Entry,'id'|'importedAt'>,p:ScorePackage,legacy:()=>Promise<PersonalState>):Promise<PersonalState>{
  await this.initialize();let current=await this.store.read();const key=personalStorageName(entry.id,p);
  // A validated companion can retain the same source/profile/hand storage key
  // while changing only its package revision. Preserve current raw choices and
  // recheck every guard and layer before activating that narrow rebind.
  for(let attempt=0;current.documents[key]!==undefined;attempt++){
   const raw=current.documents[key] as unknown as PersonalState;
   try{readPersonal(raw,p);break;}catch(error){
    const binding=initialPersonal(p).binding;
    if(raw.version!==2||p.manifest.version!==2||raw.revision===p.manifest.revision||!binding||!raw.binding||JSON.stringify(Object.entries(raw.binding).sort())!==JSON.stringify(Object.entries(binding).sort()))throw error;
    if(attempt>=maxAttempts)throw Error('Personal library remained busy; companion revision was not rebound.');
    const rebound=readPersonal({...raw,revision:p.manifest.revision},p);
    if(rebound.layer)await validateLayerAsync(rebound.layer,p);for(const layer of rebound.history)await validateLayerAsync(layer,p,{history:true});
    const result=await this.store.commit({expectedRevision:current.revision,changes:json({[key]:rawMemoryPersonal(rebound)})});current=result.snapshot;
   }
  }
  const personal=current.documents[key]===undefined?rawMemoryPersonal(await legacy()):readPersonal(current.documents[key],p);
  const input={entryId:entry.id,importedAt:entry.importedAt,p,personal};this.remember([input]);
  const known=(snapshot:AssistanceSnapshot,candidate:MemoryScoreInput)=>{
   const memory=readPersonalFingeringMemory(snapshot.documents[personalMemoryDocument]);
   return projectPersonalMemoryScore(candidate).every(wanted=>Object.values(memory.occurrences).some(actual=>JSON.stringify(actual.occurrence)===JSON.stringify(wanted.occurrence)));
  };
  if(!known(current,input)){
   await this.schedule(async()=>{
    for(let attempt=0;attempt<maxAttempts;attempt++){
     const snapshot=await this.store.read(),latest={...input,personal:this.personalAt(snapshot,input)};
     if(known(snapshot,latest)){this.rebase(snapshot);return;}
     const memory=importPersonalMemoryScore(readPersonalFingeringMemory(snapshot.documents[personalMemoryDocument]),latest);
     const result=await this.store.commit({expectedRevision:snapshot.revision,changes:json({[personalMemoryDocument]:memory,[key]:latest.personal})});
     if(result.status==='committed'){this.rebase(result.snapshot);return;}
    }throw Error('Personal library remained busy; new score registration was not applied.');
   });
   return this.personalAt(this.snapshot!,input);
  }
  // Pending optimistic edits belong to their original source even while another
  // score opens. Refresh only when the queue is empty.
  if(!this.pending.size)this.adopt(current);
  return personal;
 }
 resolve(input:MemoryScoreInput){return resolvePersonalFingeringMemory(this.memory,input.entryId,input.p,rawMemoryPersonal(input.personal));}
 private readIntent(raw:unknown):CapturedPersonalMemoryIntent {
  const intent=clone(raw) as CapturedPersonalMemoryIntent;
  if(!intent||intent.version!==1||typeof intent.id!=='string'||!intent.id||typeof intent.entryId!=='string'||typeof intent.personalKey!=='string'||typeof intent.sourceRevision!=='string'||!intent.guard||!intent.action||!['finger','hand','reference','reset','calculated','restoreAll','undoRestore'].includes(intent.action.kind))throw Error('Invalid pending personal fingering intent.');
  return intent;
 }
 private target(intent:CapturedPersonalMemoryIntent):MemoryScoreInput {
  const input=this.inputs.get(intent.personalKey);
  if(!input||input.entryId!==intent.entryId||source(input.p)!==intent.sourceRevision||input.p.sourceSha256!==intent.sourceSha256)throw Error('Pending personal edit belongs to a different source; original intent retained.');
  const n=input.p.score.notes.find(n=>n.id===intent.ownerId);
  if(!n||!isPitchedEvent(n)||n.pitch.octave*12+n.pitch.pitchClass!==intent.guard.pitch||n.startTick!==intent.guard.startTick||n.durationTicks!==intent.guard.durationTicks)throw Error('Pending personal edit owner changed; original intent retained.');
  return input;
 }
 capture(input:MemoryScoreInput,action:PersonalMemoryAction):CapturedPersonalMemoryIntent {
  if(this.failed||this.maintenance)throw Error('Personal editing is paused until pending work is saved.',{cause:this.failed});
  const captured=clone(action),ownerId=captured.kind==='finger'?captured.edit.ownerId:captured.ownerId;
  const n=input.p.score.notes.find(n=>n.id===ownerId);if(!n||!isPitchedEvent(n))throw Error('Unknown personal edit owner.');
  if(captured.kind==='finger'){
   const memory=this.memory,raw={...input,personal:rawMemoryPersonal(input.personal)};
   captured.edit=captureMemoryFingerEdit(memory,raw,captured.edit);
   captured.operation=captured.edit.finger!=='inherit'&&resolvePersonalFingeringMemory(memory,input.entryId,input.p,raw.personal).byOwner[ownerId]?.finger?.value===captured.edit.finger?'none':captured.edit.captured?.operation;
  }
  const id=captured.kind==='finger'?captured.edit.decisionId:captured.decisionId;
  const authoredAt=captured.kind==='finger'?captured.edit.authoredAt:captured.authoredAt;
  if(!id||!Number.isFinite(Date.parse(authoredAt)))throw Error('Personal edit requires stable authorship.');
  if(this.pending.has(id))throw Error('Personal decision identity is already pending.');
  this.remember([input]);
  return json({version:1,id,entryId:input.entryId,sourceRevision:source(input.p),sourceSha256:input.p.sourceSha256,personalKey:inputKey(input),ownerId,guard:{pitch:n.pitch.octave*12+n.pitch.pitchClass,startTick:n.startTick,durationTicks:n.durationTicks},action:captured,...(captured.kind==='undoRestore'?{undoGuard:undoGuard(input.personal)}:{})});
 }
 /** Accept immediately for paint; persist the original source-bound intent in
 * order. Promise rejection pauses entry and retains all pending recovery data. */
 accept(input:MemoryScoreInput,action:PersonalMemoryAction):PersonalMemoryAccepted {
  const intent=this.capture(input,action),result=this.apply(this.memory,{...input,personal:rawMemoryPersonal(input.personal)},intent);
  this.optimistic=result.document;this.inputs.set(intent.personalKey,{...input,personal:result.personal});this.pending.set(intent.id,intent);
  const saved=this.schedule(()=>this.persist(intent));
  return{intent,personal:clone(result.personal),memory:clone(result.document),saved};
 }
 private apply(document:PersonalFingeringMemory,input:MemoryScoreInput,intent:CapturedPersonalMemoryIntent){
  let personal=rawMemoryPersonal(input.personal),next=document;const action=intent.action;
  const ownerIds=new Set([intent.ownerId]);let changed=true;
  while(changed){changed=false;for(const seat of input.p.seats)if(seat.ownerIds.some(id=>ownerIds.has(id)))for(const id of seat.ownerIds)if(!ownerIds.has(id)){ownerIds.add(id);changed=true;}}
  const clearFinger=()=>{for(const id of ownerIds){const c=personal.assignments?.choices[id];if(c){delete c.finger;if(c.intent)delete c.intent.finger;if(c.hand===undefined)delete personal.assignments!.choices[id];}}for(const [key,c]of Object.entries(personal.overrides))if(c.ownerIds.some(id=>ownerIds.has(id)))delete personal.overrides[key];};
  if(action.kind==='finger'||action.kind==='reset'){
   const edit:MemoryFingerEdit=action.kind==='finger'?action.edit:{ownerId:action.ownerId,finger:'inherit',decisionId:action.decisionId,authoredAt:action.authoredAt};
   for(const id of ownerIds)if(personal.calculatedOwners)delete personal.calculatedOwners[id];
   if(action.kind==='finger'&&action.operation==='none')return{document,personal};
   const result=editPersonalFingeringMemory(document,{...input,personal},edit);next=result.document;
   if(result.operation==='none')return{document:next,personal};
   clearFinger();
   if(typeof edit.finger==='number'){
    const seat=input.p.seats.find(s=>s.ownerIds.includes(intent.ownerId));if(!seat)throw Error('Personal edit has no admitted contact.');
    personal=assigned(input.p,personal,seat,{finger:edit.finger});
    for(const id of ownerIds){const c=personal.assignments!.choices[id];c.intent!.finger={decisionId:edit.decisionId,lineageId:edit.decisionId,authoredAt:edit.authoredAt};c.createdAt=input.personal.assignments?.choices[id]?.createdAt??edit.authoredAt;}
   }
  }else if(action.kind==='hand'){
   const seat=input.p.seats.find(s=>s.ownerIds.includes(intent.ownerId));if(!seat)throw Error('Personal edit has no admitted contact.');
   personal=assigned(input.p,personal,seat,{hand:action.hand});
   for(const id of ownerIds){const c=personal.assignments!.choices[id];c.intent!.hand={decisionId:action.decisionId,lineageId:action.decisionId,authoredAt:action.authoredAt};c.createdAt=input.personal.assignments?.choices[id]?.createdAt??action.authoredAt;}
   next=preservePersonalMemoryHandChange(document,input,{...input,personal},intent.ownerId);
  }else if(action.kind==='calculated'){
   clearFinger();personal.calculatedOwners??={};for(const id of ownerIds)personal.calculatedOwners[id]=true;
  }else if(action.kind==='restoreAll'){
   personal=restoreAll(personal);personal.calculatedOwners=Object.fromEntries(input.p.score.notes.filter(isPitchedEvent).map(note=>[note.id,true]));
   next=registerMemoryScore(document,{...input,personal});next.revision++;
  }else if(action.kind==='undoRestore'){
   if(intent.undoGuard!==undoGuard(personal))throw Error('The saved restore operation changed; pending undo retained.');
   if(personal.undo!==undefined)personal.overrides=clone(personal.undo);
   if(personal.undoAssignments!==undefined)personal.assignments=clone(personal.undoAssignments);else delete personal.assignments;
   if(personal.undoCalculatedOwners!==undefined)personal.calculatedOwners=clone(personal.undoCalculatedOwners);else delete personal.calculatedOwners;
   delete personal.undo;delete personal.undoAssignments;delete personal.undoCalculatedOwners;
   next=registerMemoryScore(document,{...input,personal});next.revision++;
  }else next=promotePersonalFingeringReference(document,{...input,personal},action.ownerId);
  return{document:next,personal:readPersonal(personal,input.p)};
 }
 private schedule(work:()=>Promise<void>):Promise<void>{
  this.queued.push(work);
  const next=this.tail.then(async()=>{if(this.failed)throw this.failed;try{await work();this.queued.splice(this.queued.indexOf(work),1);}catch(error){this.failed=error instanceof Error?error:Error(String(error));throw this.failed;}});
  this.tail=next.catch(()=>{});return next;
 }
 private async persist(intent:CapturedPersonalMemoryIntent){
  const fingerprint=await hashBytes(JSON.stringify(intent));
  for(let attempt=0;attempt<maxAttempts;attempt++){
   const current=await this.store.read(),applied=record(current.documents[appliedDocument]),pending=record(current.documents[pendingDocument]);
   if(applied[intent.id]){if(applied[intent.id]!==fingerprint)throw Error('Personal decision identity was reused.');this.pending.delete(intent.id);this.rebase(current);return;}
   if(pending[intent.id]&&JSON.stringify(pending[intent.id])!==JSON.stringify(intent))throw Error('Pending personal decision identity was reused.');
   if(!pending[intent.id]){
    pending[intent.id]=intent;const stage=await this.store.commit({expectedRevision:current.revision,changes:{[pendingDocument]:pending}});
    if(stage.status==='conflict')continue;
    // Restart from the durable journal, so no successful stage can be lost by
    // a concurrent writer before effective state and journal removal activate.
    continue;
   }
   const target=this.target(intent),input={...target,personal:this.personalAt(current,target)},document=readPersonalFingeringMemory(current.documents[personalMemoryDocument]);
   const result=this.apply(document,input,intent);delete pending[intent.id];applied[intent.id]=fingerprint;
   const committed=await this.store.commit({expectedRevision:current.revision,changes:json({[personalMemoryDocument]:result.document,[intent.personalKey]:result.personal,[pendingDocument]:pending,[appliedDocument]:applied})});
   if(committed.status==='conflict')continue;
   this.pending.delete(intent.id);this.rebase(committed.snapshot);return;
  }
  throw Error('Personal library remained busy; pending edit retained for retry.');
 }
 private rebase(snapshot:AssistanceSnapshot){
  this.adopt(snapshot);const raw=new Map<string,PersonalState>();
  for(const intent of this.pending.values()){
   const target=this.target(intent),input={...target,personal:raw.get(intent.personalKey)??this.personalAt(snapshot,target)},result=this.apply(this.optimistic!,input,intent);
   this.optimistic=result.document;raw.set(intent.personalKey,result.personal);
  }
  for(const [key,input]of this.inputs)this.inputs.set(key,{...input,personal:raw.get(key)??this.personalAt(snapshot,input)});
 }
 async flush(){await this.tail;if(this.failed)throw this.failed;}
 async retry(){
  if(this.maintenance)throw Error('Personal recovery is already running.');this.maintenance=true;
  try{await this.tail;this.failed=undefined;while(this.queued.length){await this.queued[0]();this.queued.shift();}for(const intent of [...this.pending.values()])await this.persist(intent);}
  catch(error){this.failed=error instanceof Error?error:Error(String(error));throw this.failed;}
  finally{this.maintenance=false;}
 }
 /** The callback is replayed on the latest raw state after CAS conflicts. It
 * must change only intended fields, and must not return an old UI snapshot. */
 updatePersonal(input:MemoryScoreInput,update:(latest:PersonalState)=>PersonalState):Promise<void>{
  if(this.maintenance)return Promise.reject(Error('Personal maintenance is running; retry this save afterward.'));
  this.remember([input]);return this.schedule(async()=>{
   for(let attempt=0;attempt<maxAttempts;attempt++){
    const current=await this.store.read(),latest=this.personalAt(current,input),personal=readPersonal(rawMemoryPersonal(update(latest)),input.p);
    const result=await this.store.commit({expectedRevision:current.revision,changes:json({[inputKey(input)]:personal})});
    if(result.status==='committed'){this.rebase(result.snapshot);return;}
   }throw Error('Personal library remained busy; view save was not applied.');
  });
 }
 saveView(input:MemoryScoreInput):Promise<void>{
  const raw=rawMemoryPersonal(input.personal),view=clone(raw.view),navigation=clone(raw.navigation),editContactId=raw.editContactId;
  return this.updatePersonal(input,latest=>{latest.view=view;if(navigation===undefined)delete latest.navigation;else latest.navigation=navigation;if(editContactId===undefined)delete latest.editContactId;else latest.editContactId=editContactId;return latest;});
 }
 async deleteEntry(entryId:string):Promise<void>{
  await this.initialize();if(this.maintenance)throw Error('Personal maintenance is running; retry deletion afterward.');return this.schedule(async()=>{
   for(let attempt=0;attempt<maxAttempts;attempt++){
    const current=await this.store.read(),memory=deletePersonalFingeringEntry(readPersonalFingeringMemory(current.documents[personalMemoryDocument]),entryId);
    const result=await this.store.commit({expectedRevision:current.revision,changes:json({[personalMemoryDocument]:memory})});if(result.status==='committed'){this.rebase(result.snapshot);return;}
   }throw Error('Personal library remained busy; reference succession was not applied.');
  });
 }
 async consolidate(request:PersonalMemoryConsolidationRequest):Promise<ConsolidationReceipt>{
  await this.initialize();await this.flush();if(this.maintenance)throw Error('Another personal maintenance operation is running.');
  this.maintenance=true;
  try{
   for(let attempt=0;attempt<maxAttempts;attempt++){
    const current=await this.store.read(),memory=readPersonalFingeringMemory(current.documents[personalMemoryDocument]);
    if(memory.receipts[request.receiptId]){this.rebase(current);return clone(memory.receipts[request.receiptId]);}
    if(!await request.isSafe())throw Error('Consolidation waits until practice and pending edits have stopped.');
    const scanned=frozenInputs(await this.options.scanLibrary());this.remember(scanned);
    const inputs=scanned.filter(input=>!request.entryIds.includes(input.entryId)||!request.personalKeys||request.personalKeys.includes(inputKey(input))).map(input=>({...input,personal:this.personalAt(current,input)})),targets=inputs.filter(input=>request.entryIds.includes(input.entryId));
    if(request.sourceRevisions&&targets.some(input=>request.sourceRevisions![input.entryId]!==source(input.p)))throw Error('Consolidation source changed; current personal choices retained.');
    const hashes=await inputHashes(targets),prepared=await consolidatePersonalFingeringMemory(memory,inputs,request.entryIds,request.receiptId);
    if(this.options.validateInputs&&!await this.options.validateInputs(scanned))throw Error('Consolidation inputs changed; current personal choices retained.');
    if(!await request.isSafe())throw Error('Consolidation waits until practice and pending edits have stopped.');
    const receiptKey=`personal-consolidation/${await hashBytes(request.receiptId)}`;
    const changes:Record<string,unknown>={[personalMemoryDocument]:prepared.document,[receiptKey]:{version:1,completed:true,priorManifest:current.id,inputHashes:hashes,receipt:prepared.receipt},[`${receiptKey}/originals`]:{version:1,memory,personal:Object.fromEntries(targets.map(input=>[inputKey(input),input.personal]))}};
    for(const input of targets){const personal=prepared.personalByKey[inputKey(input)];if(personal)changes[inputKey(input)]=personal;}
    const result=await this.store.commit({expectedRevision:current.revision,changes:json(changes)});
    if(result.status==='conflict')continue;
    this.rebase(result.snapshot);return clone(prepared.receipt);
   }throw Error('Personal library remained busy; consolidation was not activated.');
  }finally{this.maintenance=false;}
 }
}
