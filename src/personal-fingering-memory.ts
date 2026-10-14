import {
 createMeasureFingeringMemory,validateMeasureFingeringMemory,measureMemoryKey,projectMeasureMemoryHand,
 resolveMeasureMemory,resolveMeasureMemoryBatch,applyMeasureMemoryEdits,importMeasureMemoryHistory,promoteMeasureMemoryReference,transferMeasureMemoryReference,
 type MeasureFingeringMemory,type MeasureMemoryOccurrence,type MeasureOwnerEdit,type MeasureHistoricalRecord,
 type MeasureMemoryDiagnostic,type ResolvedMeasureField,type MeasureFieldDecision,
} from '@hypermemetic-ai/fingering-editor-assistance';
import {isPitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import type {ScorePackage} from './package';
import {hashBytes} from './package';
import {personalStorageName,type PersonalState} from './state';
import {effectiveAssignments,type EffectivePersonalAssignment,type PersonalHand} from './personal-assignments';

export interface MemoryScoreInput {entryId:string;importedAt?:string;p:ScorePackage;personal:PersonalState}
export interface PersonalMemoryOccurrence {
 occurrence:MeasureMemoryOccurrence;entryId:string;writtenBar:number;ownerIds:string[];
 presentationId:string;
 authoredAt?:number;registeredAt:number;ageKnown:boolean;
}
export interface PersonalFingeringMemory {
 version:'personal-fingering-memory-v1';revision:number;playerId:string;indexed:boolean;
 keyboards:Record<string,MeasureFingeringMemory>;occurrences:Record<string,PersonalMemoryOccurrence>;
 retiredOccurrences?:Record<string,PersonalMemoryOccurrence>;
 receipts:Record<string,ConsolidationReceipt>;
}
export interface MemoryOwnerResolution {
 finger?:ResolvedMeasureField<1|2|3|4|5>;reference?:PersonalMemoryOccurrence;
 hand:PersonalHand;personal:boolean;calculated?:boolean;
}
export interface MemoryResolution {
 assignments:EffectivePersonalAssignment[];byOwner:Record<string,MemoryOwnerResolution>;diagnostics:MeasureMemoryDiagnostic[];
}
export interface ConsolidationReceipt {
 id:string;policy:'earliest-union-fields-v1';entryIds:string[];sourceRevisions:Record<string,string>;
 beforeHash:string;afterHash:string;completed:true;
 chosen:Array<{entryId:string;ownerId:string;finger:number;decision:MeasureFieldDecision}>;
 replaced:Array<{entryId:string;ownerId:string;before:number;after:number;previous:unknown;decision:MeasureFieldDecision}>;
}
const identity=(o:Pick<MeasureMemoryOccurrence,'keyboardId'|'occurrenceId'|'scope'>)=>JSON.stringify([o.keyboardId,o.occurrenceId,o.scope??'whole']);
const source=(p:ScorePackage)=>p.sourceRevision??p.manifest.revision;
const presentationId=(i:MemoryScoreInput)=>JSON.stringify([i.entryId,i.p.keyboardLayout??i.p.manifest.keyboardLayout??'janko-four-row',i.p.profileSha256??i.p.manifest.profileSha256??i.p.profileId??i.p.manifest.profileId??`legacy:${source(i.p)}`,i.p.effectiveHandSha256??i.p.manifest.effectiveHandSha256??null,i.p.preparationIdentity?i.p.manifest.revision:null]);
const inputKey=(i:MemoryScoreInput)=>JSON.stringify([presentationId(i),source(i.p),i.p.preparationIdentity?i.p.manifest.revision:null]);
const date=(s:string|undefined)=>{const n=s===undefined?NaN:Date.parse(s);return Number.isSafeInteger(n)&&n>=0?n:undefined;};
// Unknown dates deliberately sort last and remain explicitly unknown in metadata.
const unknownAge=Number.MAX_SAFE_INTEGER;
function fail(s:string):never{throw Error(`Personal fingering memory: ${s}`);}
export const createPersonalFingeringMemory=(playerId='personal-library'):PersonalFingeringMemory=>({version:'personal-fingering-memory-v1',revision:0,playerId,indexed:false,keyboards:{},occurrences:{},receipts:{}});

/** Complete written measures, not just notes with calculated or personal digits. */
export function projectPersonalMemoryScore(input:MemoryScoreInput):PersonalMemoryOccurrence[] {
 const {p,personal,entryId}=input,bars=p.score.sourceBarTicks,tpq=p.score.ticksPerBeat;
 if(!entryId||!bars||bars.length<2||bars[0]!==0||bars.at(-1)!==p.score.totalTicks||bars.some((n,i)=>!Number.isSafeInteger(n)||i>0&&n<=bars[i-1])||!Number.isSafeInteger(tpq)||tpq<=0)fail('complete exact written-measure map required');
 const keyboardId=p.keyboardLayout??p.manifest.keyboardLayout??'janko-four-row',profileId=p.profileSha256??p.manifest.profileSha256??p.profileId??p.manifest.profileId??`legacy:${source(p)}`;
 const effective=new Map(effectiveAssignments(p,personal).map(a=>[a.id,a])),notes=p.score.notes.filter(isPitchedEvent);
 const parent=new Map(notes.map(n=>[n.id,n.id]));
 const find=(id:string):string=>{const q=parent.get(id);if(q===undefined)return fail('unknown admitted alias owner');if(q!==id)parent.set(id,find(q));return parent.get(id)!;};
 for(const seat of p.seats){const ids=seat.ownerIds.filter(id=>parent.has(id));for(const id of ids.slice(1))parent.set(find(id),find(ids[0]));}
 const members=new Map<string,string[]>();for(const n of notes){const root=find(n.id);members.set(root,[...(members.get(root)??[]),n.id]);}
 const result:PersonalMemoryOccurrence[]=[];
 for(let i=0;i<bars.length-1;i++){
  const selected=notes.filter(n=>n.startTick>=bars[i]&&n.startTick<bars[i+1]);
  const occurrence:MeasureMemoryOccurrence={occurrenceId:JSON.stringify([inputKey(input),i+1]),sourceRevision:source(p),keyboardId,profileId,extent:{numerator:bars[i+1]-bars[i],denominator:tpq},notes:selected.map(n=>({ownerId:n.id,midiPitch:n.pitch.octave*12+n.pitch.pitchClass,onset:{numerator:n.startTick-bars[i],denominator:tpq},duration:{numerator:n.durationTicks,denominator:tpq},...((members.get(find(n.id))?.length??0)>1?{physicalAliasId:[...members.get(find(n.id))!].sort()[0]}:{})}))};
  measureMemoryKey(occurrence);
  const ages=selected.flatMap(n=>{const c=personal.assignments?.choices[n.id];return[date(c?.createdAt),...Object.values(personal.overrides).filter(c=>c.ownerIds.includes(n.id)).map(c=>date(c.createdAt))].filter((x):x is number=>x!==undefined);}),authoredAt=ages.length?Math.min(...ages):undefined,importAge=date(input.importedAt);
  const record=(o:MeasureMemoryOccurrence):PersonalMemoryOccurrence=>({occurrence:o,entryId,presentationId:presentationId(input),writtenBar:i+1,ownerIds:o.notes.map(n=>n.ownerId),...(authoredAt===undefined?{}:{authoredAt}),registeredAt:importAge??unknownAge,ageKnown:authoredAt!==undefined||importAge!==undefined});
  result.push(record(occurrence));
  const hands=selected.map(n=>({ownerId:n.id,hand:effective.get(n.id)!.hand}));
  for(const hand of ['LH','RH'] as const){const projected=projectMeasureMemoryHand(occurrence,hands,hand);
   // A direct hand change creates a new source-bound partition identity. Previous
   // local scope records remain recoverable and cannot bind to a changed pattern.
   projected.occurrenceId=JSON.stringify([occurrence.occurrenceId,hand,projected.notes.map(n=>n.ownerId).sort()]);result.push(record(projected));}
 }
 return result;
}

export function registerMemoryScore(document:PersonalFingeringMemory,input:MemoryScoreInput):PersonalFingeringMemory {
 return registerMemoryScoreRecords(document,input,projectPersonalMemoryScore(input));
}
function registerMemoryScoreRecords(document:PersonalFingeringMemory,input:MemoryScoreInput,records:PersonalMemoryOccurrence[]):PersonalFingeringMemory {
 const next=structuredClone(document),currentKeys=new Set(records.map(r=>identity(r.occurrence)));
 for(const [id,r]of Object.entries(next.occurrences))if(r.presentationId===presentationId(input)&&!currentKeys.has(id)){(next.retiredOccurrences??={})[id]=r;delete next.occurrences[id];}
 for(const r of records){const old=document.occurrences[identity(r.occurrence)];if(old){r.registeredAt=Math.min(r.registeredAt,old.registeredAt);if(old.authoredAt!==undefined)r.authoredAt=Math.min(r.authoredAt??unknownAge,old.authoredAt);r.ageKnown=r.ageKnown||old.ageKnown;}
  next.occurrences[identity(r.occurrence)]=r;if(next.retiredOccurrences)delete next.retiredOccurrences[identity(r.occurrence)];next.keyboards[r.occurrence.keyboardId]??=createMeasureFingeringMemory({playerId:next.playerId,keyboardId:r.occurrence.keyboardId});}
 repairReferences(next);if(JSON.stringify(next)!==JSON.stringify(document))next.revision++;return next;
}
function repairReferences(document:PersonalFingeringMemory):PersonalFingeringMemory {
 const patterns=new Map<string,PersonalMemoryOccurrence[]>();for(const r of Object.values(document.occurrences)){const key=JSON.stringify([r.occurrence.keyboardId,measureMemoryKey(r.occurrence)]);patterns.set(key,[...(patterns.get(key)??[]),r]);}
 for(const [keyboard,memory]of Object.entries(document.keyboards)){
  let m=memory;for(const d of memory.defaults){const active=patterns.get(JSON.stringify([keyboard,d.measureKey]))??[];
   const present=active.some(r=>r.occurrence.occurrenceId===d.origin.occurrenceId&&r.occurrence.scope===d.origin.scope&&r.occurrence.sourceRevision===d.origin.sourceRevision);
   if(!present&&(active.length>0||d.referenceAvailable!==false)||d.referenceAvailable===false&&active.length>0)m=transferMeasureMemoryReference(m,d.measureKey,active,m.revision);
  }document.keyboards[keyboard]=m;
 }return document;
}

interface SavedFinger {finger:1|2|3|4|5;decision:MeasureFieldDecision;previous:unknown;age:number}
function savedFinger(input:MemoryScoreInput,r:PersonalMemoryOccurrence,ownerId:string,ambiguous=false):SavedFinger|undefined {
 const c=input.personal.assignments?.choices[ownerId],legacy=Object.values(input.personal.overrides).find(c=>c.ownerIds.includes(ownerId));
 const finger=c?.finger??legacy?.replacement,intent=c?.intent?.finger;
 if(finger===undefined||!intent&&!legacy&&!ambiguous)return;
 if(!ambiguous&&!intent&&c?.finger!==undefined&&legacy?.replacement!==c.finger)return;
 // An explicitly sparse hand-only record must not re-author a retained digit.
 if(c?.intent&&!intent&&!legacy)return;
 const authoredAt=date(intent?.authoredAt??(!ambiguous&&legacy?legacy.createdAt:c?.finger===undefined?legacy?.createdAt:c.createdAt));
 const decision:MeasureFieldDecision={decisionId:intent?.lineageId??JSON.stringify(['recorded-finger',inputKey(input),ownerId]),donor:{occurrenceId:r.occurrence.occurrenceId,sourceRevision:r.occurrence.sourceRevision,...(r.occurrence.scope?{scope:r.occurrence.scope}:{})},...(authoredAt===undefined?{}:{authoredAt})};
 return{finger:finger as 1|2|3|4|5,decision,previous:structuredClone(c??legacy),age:authoredAt??unknownAge};
}
function historicalEdits(input:MemoryScoreInput,r:PersonalMemoryOccurrence):MeasureOwnerEdit[] {
 const edits:MeasureOwnerEdit[]=r.ownerIds.flatMap(ownerId=>{const saved=savedFinger(input,r,ownerId);return saved?[{ownerId,patch:{finger:saved.finger},decisions:{finger:saved.decision}}]:[];});
 const aliases=new Set(r.occurrence.notes.flatMap(n=>n.physicalAliasId?[n.physicalAliasId]:[]));
 for(const alias of aliases){const ids=new Set(r.occurrence.notes.filter(n=>n.physicalAliasId===alias).map(n=>n.ownerId)),members=edits.filter(e=>ids.has(e.ownerId));if(!members.length)continue;
  if(members.some(e=>e.patch.finger!==members[0].patch.finger))fail('recorded physical alias fingers conflict; original data retained');
  const winner=[...members].sort((a,b)=>(a.decisions!.finger!.authoredAt??unknownAge)-(b.decisions!.finger!.authoredAt??unknownAge)||a.decisions!.finger!.decisionId.localeCompare(b.decisions!.finger!.decisionId))[0].decisions!.finger!;
  for(const member of members)member.decisions={finger:structuredClone(winner)};
 }return edits;
}

/** Called with the complete admitted library snapshot before exposing inheritance. */
export function bootstrapPersonalFingeringMemory(inputs:readonly MemoryScoreInput[],playerId='personal-library'):PersonalFingeringMemory {
 let document=createPersonalFingeringMemory(playerId);const ordered=[...inputs].sort((a,b)=>inputKey(a).localeCompare(inputKey(b)));for(const input of ordered)document=registerMemoryScore(document,input);
 for(const keyboard of Object.keys(document.keyboards)){
  const records:MeasureHistoricalRecord[]=Object.values(document.occurrences).filter(r=>r.occurrence.keyboardId===keyboard).map(r=>{
   const input=ordered.find(i=>presentationId(i)===r.presentationId&&source(i.p)===r.occurrence.sourceRevision)!;return{...r,registeredAt:r.authoredAt??unknownAge,edits:historicalEdits(input,r)};
  }).filter(r=>r.edits.length);document.keyboards[keyboard]=importMeasureMemoryHistory(document.keyboards[keyboard],records,0).memory;
 }document.indexed=true;document.revision=1;return document;
}

/** Admit a genuinely new score after the initial complete election. Existing
 * defaults keep their custody; newly discovered conflicts are preserved locally. */
export function importPersonalMemoryScore(document:PersonalFingeringMemory,input:MemoryScoreInput):PersonalFingeringMemory {
 const next=registerMemoryScore(document,input);
 for(const r of projectPersonalMemoryScore(input)){
  const keyboard=r.occurrence.keyboardId;let memory=next.keyboards[keyboard];
  for(const edit of historicalEdits(input,r)){
   const known=resolveMeasureMemory(memory,r.occurrence).annotations.find(a=>a.ownerId===edit.ownerId)?.finger;
   if(known?.value===edit.patch.finger)continue;
   memory=applyMeasureMemoryEdits(memory,r.occurrence,[edit],memory.revision,known?'local':'contribute').memory;
  }next.keyboards[keyboard]=memory;
 }
 if(JSON.stringify(next)!==JSON.stringify(document))next.revision++;return next;
}

export function resolvePersonalFingeringMemory(document:PersonalFingeringMemory,entryId:string,p:ScorePackage,personal:PersonalState):MemoryResolution {
 return resolveMemoryRecords(document,{entryId,p,personal},projectPersonalMemoryScore({entryId,p,personal}));
}
/** Edit classification needs only the selected written bar. Resolve its complete
 * scopes with the same precedence and diagnostics used by the full display. */
function resolveMemoryRecords(document:PersonalFingeringMemory,input:MemoryScoreInput,records:PersonalMemoryOccurrence[]):MemoryResolution {
 const {p,personal}=input,owners=new Set(records.flatMap(r=>r.ownerIds)),assignments=effectiveAssignments(p,personal).filter(a=>owners.has(a.id)),byOwner:Record<string,MemoryOwnerResolution>={},diagnostics:MeasureMemoryDiagnostic[]=[];
 if(!document.indexed)fail('complete initial library index required');
 const resolvedScopes=new Map<string,ReturnType<typeof resolveMeasureMemory>>(),sharedScopes=new Map<string,ReturnType<typeof resolveMeasureMemory>>();
 for(const keyboard of new Set(records.map(r=>r.occurrence.keyboardId))){const m=document.keyboards[keyboard];if(!m)continue;
  const selected=records.filter(r=>r.occurrence.keyboardId===keyboard),localScopes=new Set(m.locals.filter(l=>l.annotations.some(a=>Object.hasOwn(a.fields,'finger'))).map(l=>identity({...l,keyboardId:keyboard}))),probes=selected.filter(r=>localScopes.has(identity(r.occurrence)));
  const results=resolveMeasureMemoryBatch(m,[...selected.map(r=>({occurrence:r.occurrence})),...probes.map(r=>({occurrence:{...r.occurrence,occurrenceId:JSON.stringify(['shared-reference-probe',r.occurrence.occurrenceId])}}))]);
  selected.forEach((r,i)=>resolvedScopes.set(identity(r.occurrence),results[i]));
  probes.forEach((r,i)=>sharedScopes.set(identity(r.occurrence),results[selected.length+i]));
 }
 const byBar=new Map<number,PersonalMemoryOccurrence[]>();for(const r of records)byBar.set(r.writtenBar,[...(byBar.get(r.writtenBar)??[]),r]);
 const references=new Map(Object.values(document.occurrences).map(r=>[JSON.stringify([identity(r.occurrence),r.occurrence.sourceRevision]),r]));
 for(const a of assignments)byOwner[a.id]={hand:a.hand,personal:false};
 for(const whole of records.filter(r=>!r.occurrence.scope)){
  const m=document.keyboards[whole.occurrence.keyboardId];if(!m)continue;
  const resolve=(r:PersonalMemoryOccurrence)=>{const result=resolvedScopes.get(identity(r.occurrence))!;diagnostics.push(...result.diagnostics);return new Map(result.annotations.map(a=>[a.ownerId,a]));};
  const handRecords=byBar.get(whole.writtenBar)!.filter(r=>r.occurrence.scope),full=resolve(whole),hands=handRecords.map(resolve);
  const shared=(r:PersonalMemoryOccurrence,id:string)=>{
   const actual=resolvedScopes.get(identity(r.occurrence))!;if(actual.diagnostics.some(d=>d.code==='stale-occurrence'))return;
   const value=(sharedScopes.get(identity(r.occurrence))??actual).annotations.find(a=>a.ownerId===id)?.finger;return value?.provenance==='local'?undefined:value;
  };
  for(const id of whole.ownerIds){const f=full.get(id)?.finger,h=hands.map(x=>x.get(id)?.finger).find(Boolean);
   const finger=f?.provenance==='local'?f:h?.provenance==='local'?h:f??h;if(!finger)continue;
   const sharedField=finger.provenance==='local'?(shared(whole,id)??handRecords.map(r=>shared(r,id)).find(Boolean)):finger;
   const reference=sharedField?.origin?references.get(JSON.stringify([identity({...sharedField.origin,keyboardId:whole.occurrence.keyboardId}),sharedField.origin.sourceRevision])):undefined;
   byOwner[id]={...byOwner[id],finger,personal:true,...(reference?{reference}:{})};
  }
 }
 for(const a of assignments){
  const saved=personal.assignments?.choices[a.id],legacy=Object.values(personal.overrides).find(c=>c.ownerIds.includes(a.id));
  // Preserve uncertain old choices in place. They are not donor evidence, and
  // only the explicitly authorized consolidation removes this local protection.
  if(saved?.finger!==undefined&&!saved.intent?.finger&&legacy?.replacement!==saved.finger&&byOwner[a.id].finger?.provenance!=='local')byOwner[a.id]={...byOwner[a.id],personal:true,finger:{value:saved.finger as 1|2|3|4|5,provenance:'local'}};
  const f=byOwner[a.id].finger;if(f){if(f.value===null)delete a.finger;else a.finger=f.value;}
  if((personal as PersonalState&{calculatedOwners?:Record<string,true>}).calculatedOwners?.[a.id]){const layer=personal.layer??p.fingerLayer,calculated=layer?.attacks.find(n=>n.id===layer.sourceOwnerToAttack[a.id])?.finger;byOwner[a.id]={...byOwner[a.id],personal:false,calculated:true};if(calculated===undefined)delete a.finger;else a.finger=calculated;}
 }
 return{assignments,byOwner,diagnostics};
}

export interface MemoryFingerEdit {ownerId:string;finger:1|2|3|4|5|null|'inherit';decisionId:string;authoredAt:string;
 captured?:{sourceRevision:string;presentationId:string;scopeKeys:string[];operation:'add'|'shared'|'local'|'reset';reference?:string};
}
export function captureMemoryFingerEdit(document:PersonalFingeringMemory,input:MemoryScoreInput,edit:MemoryFingerEdit):MemoryFingerEdit {
 const all=projectPersonalMemoryScore(input),whole=all.find(r=>!r.occurrence.scope&&r.ownerIds.includes(edit.ownerId));if(!whole)fail('unknown edit owner');
 const resolved=resolveMemoryRecords(document,input,all.filter(r=>r.writtenBar===whole.writtenBar)).byOwner[edit.ownerId],records=all.filter(r=>r.ownerIds.includes(edit.ownerId));
 const reference=resolved.reference?.presentationId===whole.presentationId&&resolved.reference.writtenBar===whole.writtenBar;
 return{...edit,captured:{sourceRevision:source(input.p),presentationId:presentationId(input),scopeKeys:records.map(r=>measureMemoryKey(r.occurrence)).sort(),operation:edit.finger==='inherit'?'reset':!resolved.finger?'add':resolved.finger.provenance!=='local'&&reference?'shared':'local',...(resolved.finger?.origin?{reference:JSON.stringify(resolved.finger.origin)}:{})}};
}
export function editPersonalFingeringMemory(document:PersonalFingeringMemory,input:MemoryScoreInput,edit:MemoryFingerEdit):{document:PersonalFingeringMemory;operation:'none'|'add'|'shared'|'local'|'reset';diagnostics:MeasureMemoryDiagnostic[]} {
 const all=projectPersonalMemoryScore(input),whole=all.find(r=>!r.occurrence.scope&&r.ownerIds.includes(edit.ownerId));if(!whole)fail('unknown edit owner');
 let next=registerMemoryScoreRecords(document,input,all);const resolved=resolveMemoryRecords(next,input,all.filter(r=>r.writtenBar===whole.writtenBar)).byOwner[edit.ownerId];
 if(edit.finger!=='inherit'&&resolved.finger?.value===edit.finger)return{document,operation:'none',diagnostics:[]};
 const records=all.filter(r=>r.ownerIds.includes(edit.ownerId));
 const local=resolved.finger?.provenance==='local',reference=resolved.reference?.presentationId===whole.presentationId&&resolved.reference.writtenBar===whole.writtenBar;
 let operation:'add'|'shared'|'local'|'reset'=edit.finger==='inherit'?'reset':!resolved.finger?'add':!local&&reference?'shared':'local';
 if(edit.captured){
  if(edit.captured.sourceRevision!==source(input.p)||edit.captured.presentationId!==presentationId(input)||JSON.stringify(edit.captured.scopeKeys)!==JSON.stringify(records.map(r=>measureMemoryKey(r.occurrence)).sort()))fail('captured edit source or hand partition changed');
  operation=edit.captured.operation;
  // A concurrent contribution or reference transfer cannot turn a queued action
  // into permission to replace somebody else's newly shared decision.
  if(operation==='add'&&resolved.finger||operation==='shared'&&(local||edit.captured.reference!==JSON.stringify(resolved.finger?.origin)))operation='local';
 }
 const authoredAt=date(edit.authoredAt);if(authoredAt===undefined||!edit.decisionId)fail('valid edit lineage and authored time required');
 const decision:MeasureFieldDecision={decisionId:edit.decisionId,authoredAt,donor:{occurrenceId:whole.occurrence.occurrenceId,sourceRevision:whole.occurrence.sourceRevision}};
 const diagnostics:MeasureMemoryDiagnostic[]=[];
 const linked: Array<{occurrence:MeasureMemoryOccurrence;ownerIds:string[]}>=[];
 if(operation==='shared'&&resolved.finger?.decision){
  const old=resolved.finger.decision.decisionId,m=next.keyboards[whole.occurrence.keyboardId],available=[...Object.values(next.occurrences),...Object.values(next.retiredOccurrences??{})];
  for(const d of m.defaults){if(!d.annotations.some(a=>a.decisions?.finger?.decisionId===old))continue;
   const r=available.find(r=>r.occurrence.keyboardId===m.binding.keyboardId&&measureMemoryKey(r.occurrence)===d.measureKey);if(!r)fail('linked projection lacks retained source mapping');
   // A fresh probe identity reads shared fields even when the reference carries
   // a protected local exception; publication below preserves that exception.
   const probe={...r.occurrence,occurrenceId:JSON.stringify(['shared-lineage-probe',r.occurrence.occurrenceId])},fields=resolveMeasureMemory(m,probe).annotations;
   linked.push({occurrence:r.occurrence,ownerIds:fields.filter(a=>a.finger?.decision?.decisionId===old).map(a=>a.ownerId)});
  }
 }
 for(const r of records){const keyboard=r.occurrence.keyboardId,m=next.keyboards[keyboard];
  if(operation==='shared'&&resolved.finger?.decision){const probe={...r.occurrence,occurrenceId:JSON.stringify(['shared-lineage-probe',r.occurrence.occurrenceId])},existing=resolveMeasureMemory(m,probe).annotations.find(a=>a.ownerId===edit.ownerId)?.finger;
   if(existing&&existing.decision?.decisionId!==resolved.finger.decision.decisionId)continue;
  }
  // Reset is always local. It must not remove a global field at its reference.
  const action=operation==='reset'||operation==='local'?'local':operation==='shared'?'publish':'contribute';
  const result=applyMeasureMemoryEdits(m,r.occurrence,[{ownerId:edit.ownerId,patch:{finger:edit.finger},...(edit.finger==='inherit'?{}:{decisions:{finger:decision}})}],m.revision,action);
  next.keyboards[keyboard]=result.memory;diagnostics.push(...result.diagnostics);
 }
 for(const link of linked){const m=next.keyboards[link.occurrence.keyboardId],result=applyMeasureMemoryEdits(m,link.occurrence,link.ownerIds.map(ownerId=>({ownerId,patch:{finger:edit.finger},decisions:{finger:decision}})),m.revision,'publish');next.keyboards[link.occurrence.keyboardId]=result.memory;diagnostics.push(...result.diagnostics);}
 // The input is the state before this key press. Record actual authorship now,
 // including suppression, so deletion succession never depends on reopening.
 // Reset/no-op actions and propagated projections are not new authors.
 if(operation!=='reset')for(const r of records){const stored=next.occurrences[identity(r.occurrence)];stored.authoredAt=Math.min(stored.authoredAt??unknownAge,authoredAt);stored.ageKnown=true;}
 next.revision++;return{document:next,operation,diagnostics};
}

/** A hand edit does not author fingers. Preserve prior personal field lineage
 * when repartitioning would otherwise change any finger in the affected bar. */
export function preservePersonalMemoryHandChange(document:PersonalFingeringMemory,before:MemoryScoreInput,after:MemoryScoreInput,ownerId:string):PersonalFingeringMemory {
 if(before.entryId!==after.entryId||source(before.p)!==source(after.p)||(before.p.keyboardLayout??before.p.manifest.keyboardLayout)!==(after.p.keyboardLayout??after.p.manifest.keyboardLayout))fail('hand change source differs');
 const prior=resolvePersonalFingeringMemory(document,before.entryId,before.p,before.personal),oldRecords=projectPersonalMemoryScore(before),bar=oldRecords.find(r=>!r.occurrence.scope&&r.ownerIds.includes(ownerId));if(!bar)fail('unknown hand change owner');
 const next=registerMemoryScore(document,after),current=resolvePersonalFingeringMemory(next,after.entryId,after.p,after.personal),records=projectPersonalMemoryScore(after).filter(r=>r.writtenBar===bar.writtenBar);
 for(const r of records){const edits:MeasureOwnerEdit[]=r.ownerIds.flatMap(id=>{
   const old=prior.byOwner[id]?.finger,now=current.byOwner[id]?.finger;
   if(prior.byOwner[id]?.calculated||!old||old.value===now?.value&&old.decision?.decisionId===now?.decision?.decisionId)return[];
   return[{ownerId:id,patch:{finger:old.value},...(old.decision?{decisions:{finger:old.decision}}:{})}];
  });if(!edits.length)continue;const m=next.keyboards[r.occurrence.keyboardId];next.keyboards[r.occurrence.keyboardId]=applyMeasureMemoryEdits(m,r.occurrence,edits,m.revision,'local').memory;
 }if(JSON.stringify(next)!==JSON.stringify(document))next.revision++;return next;
}

export interface PersonalMemoryLocalSnapshot {
 version:'personal-memory-local-snapshot-v1';entryId:string;sourceRevision:string;keyboardId:string;
 scopes:Array<{occurrenceId:string;scope?:PersonalHand;measureKey:string;edits:MeasureOwnerEdit[]}>;
}
/** Capture dispositions, never a copy of global defaults. The coordinator owns
 * the matching raw-personal undo record and immutable storage transaction. */
export function snapshotPersonalMemoryLocals(document:PersonalFingeringMemory,input:MemoryScoreInput):PersonalMemoryLocalSnapshot {
 const records=projectPersonalMemoryScore(input),keyboardId=records[0].occurrence.keyboardId,m= document.keyboards[keyboardId];
 return{version:'personal-memory-local-snapshot-v1',entryId:input.entryId,sourceRevision:source(input.p),keyboardId,scopes:records.map(r=>{
  const o=r.occurrence,local=m?.locals.find(l=>l.occurrenceId===o.occurrenceId&&l.scope===o.scope&&l.sourceRevision===o.sourceRevision&&l.measureKey===measureMemoryKey(o));
  return{occurrenceId:o.occurrenceId,...(o.scope?{scope:o.scope}:{}),measureKey:measureMemoryKey(o),edits:local?.annotations.flatMap(a=>Object.hasOwn(a.fields,'finger')?[{ownerId:a.ownerId,patch:{finger:a.fields.finger!},...(a.decisions?.finger?{decisions:{finger:structuredClone(a.decisions.finger)}}:{})}]:[])??[]};
 })};
}
/** Undo a local batch operation against today's shared knowledge. Caller must
 * restore the snapshot's raw hand partition before invoking this function. */
export function restorePersonalMemoryLocals(document:PersonalFingeringMemory,input:MemoryScoreInput,snapshot:PersonalMemoryLocalSnapshot):PersonalFingeringMemory {
 const records=projectPersonalMemoryScore(input);
 if(snapshot.version!=='personal-memory-local-snapshot-v1'||snapshot.entryId!==input.entryId||snapshot.sourceRevision!==source(input.p)||snapshot.keyboardId!==records[0].occurrence.keyboardId||snapshot.scopes.length!==records.length)fail('local restore source differs');
 for(const r of records){const s=snapshot.scopes.find(s=>s.occurrenceId===r.occurrence.occurrenceId&&s.scope===r.occurrence.scope);if(!s||s.measureKey!==measureMemoryKey(r.occurrence))fail('local restore hand partition differs');}
 const next=registerMemoryScore(document,input);
 for(const r of records){const o=r.occurrence,s=snapshot.scopes.find(s=>s.occurrenceId===o.occurrenceId&&s.scope===o.scope)!;let m=next.keyboards[o.keyboardId];
  m=applyMeasureMemoryEdits(m,o,o.notes.map(n=>({ownerId:n.ownerId,patch:{finger:'inherit'}})),m.revision,'local').memory;
  if(s.edits.length)m=applyMeasureMemoryEdits(m,o,s.edits,m.revision,'local').memory;next.keyboards[o.keyboardId]=m;
 }if(JSON.stringify(next)!==JSON.stringify(document))next.revision++;return next;
}

export function promotePersonalFingeringReference(document:PersonalFingeringMemory,input:MemoryScoreInput,ownerId:string):PersonalFingeringMemory {
 const next=registerMemoryScore(document,input),resolved=resolvePersonalFingeringMemory(next,input.entryId,input.p,input.personal),records=projectPersonalMemoryScore(input),selected=records.find(r=>!r.occurrence.scope&&r.ownerIds.includes(ownerId));if(!selected)fail('unknown reference owner');
 for(const r of records.filter(r=>r.writtenBar===selected.writtenBar)){
  const edits:MeasureOwnerEdit[]=r.ownerIds.flatMap(id=>{const choice=resolved.byOwner[id],f=choice.finger;return choice.personal&&!choice.calculated&&f?[{ownerId:id,patch:{finger:f.value},...(f.decision?{decisions:{finger:f.decision}}:{})}]:[];});
  if(!edits.length)continue;const m=next.keyboards[r.occurrence.keyboardId];next.keyboards[r.occurrence.keyboardId]=promoteMeasureMemoryReference(m,r.occurrence,edits,m.revision).memory;
 }next.revision++;return next;
}
export function deletePersonalFingeringEntry(document:PersonalFingeringMemory,entryId:string):PersonalFingeringMemory {
 const next=structuredClone(document);for(const [id,r]of Object.entries(next.occurrences))if(r.entryId===entryId){(next.retiredOccurrences??={})[id]=r;delete next.occurrences[id];}repairReferences(next);next.revision++;return next;
}

export function readPersonalFingeringMemory(raw:unknown):PersonalFingeringMemory {
 const d=structuredClone(raw) as PersonalFingeringMemory;
 const record=(v:unknown)=>!!v&&typeof v==='object'&&!Array.isArray(v);
 if(!d||d.version!=='personal-fingering-memory-v1'||!Number.isSafeInteger(d.revision)||d.revision<0||typeof d.playerId!=='string'||!d.playerId||typeof d.indexed!=='boolean'||!record(d.occurrences)||!record(d.keyboards)||!record(d.receipts))fail('invalid document');
 for(const [key,m]of Object.entries(d.keyboards))d.keyboards[key]=validateMeasureFingeringMemory(m,{playerId:d.playerId,keyboardId:key});
 if(d.retiredOccurrences!==undefined&&!record(d.retiredOccurrences))fail('invalid retired occurrence registry');
 for(const [key,r]of [...Object.entries(d.occurrences),...Object.entries(d.retiredOccurrences??{})]){if(identity(r.occurrence)!==key||!r.entryId||typeof r.presentationId!=='string'||!r.presentationId||!Number.isSafeInteger(r.writtenBar)||r.writtenBar<1||!Number.isSafeInteger(r.registeredAt)||r.registeredAt<0||r.authoredAt!==undefined&&(!Number.isSafeInteger(r.authoredAt)||r.authoredAt<0)||JSON.stringify(r.ownerIds)!==JSON.stringify(r.occurrence.notes.map(n=>n.ownerId)))fail('invalid occurrence');measureMemoryKey(r.occurrence);}
 for(const [id,r]of Object.entries(d.receipts))if(!r||r.id!==id||r.policy!=='earliest-union-fields-v1'||r.completed!==true||!Array.isArray(r.entryIds)||!r.entryIds.length||r.entryIds.some(id=>typeof id!=='string'||!id)||!record(r.sourceRevisions)||![r.beforeHash,r.afterHash].every(h=>typeof h==='string'&&/^[a-f0-9]{64}$/.test(h))||!Array.isArray(r.chosen)||!Array.isArray(r.replaced))fail('invalid consolidation receipt');
 return d;
}

/** Freeze donors, union exact whole AND hand mappings, then publish elected fields.
 * Nothing in this preview writes files or marks a durable transaction complete. */
export async function consolidatePersonalFingeringMemory(document:PersonalFingeringMemory,inputs:readonly MemoryScoreInput[],targetEntryIds:readonly string[],receiptId:string):Promise<{document:PersonalFingeringMemory;receipt:ConsolidationReceipt;personalByEntry:Record<string,PersonalState>;personalByKey:Record<string,PersonalState>}> {
 if(document.receipts[receiptId])return{document,receipt:document.receipts[receiptId],personalByEntry:{},personalByKey:{}};
 const targets=[...new Set(targetEntryIds)].sort();if(!receiptId||!targets.length||targets.some(id=>!inputs.some(i=>i.entryId===id)))fail('complete authorized target snapshot required');
 if(targets.some(id=>inputs.filter(i=>i.entryId===id).length!==1))fail('one explicit presentation per consolidation target required');
 const selected=inputs.filter(i=>targets.includes(i.entryId)).sort((a,b)=>a.entryId.localeCompare(b.entryId)),frozen=structuredClone(selected),records=selected.flatMap(projectPersonalMemoryScore),parent=new Map<string,string>();
 const field=(r:PersonalMemoryOccurrence,id:string)=>JSON.stringify([r.entryId,r.occurrence.sourceRevision,id]);
 const find=(id:string):string=>{if(!parent.has(id))parent.set(id,id);const q=parent.get(id)!;if(q!==id)parent.set(id,find(q));return parent.get(id)!;};
 const join=(a:string,b:string)=>{const x=find(a),y=find(b);if(x!==y)parent.set(x<y?y:x,x<y?x:y);};
 const patterns=new Map<string,PersonalMemoryOccurrence[]>();for(const r of records){const key=JSON.stringify([r.occurrence.keyboardId,measureMemoryKey(r.occurrence)]);patterns.set(key,[...(patterns.get(key)??[]),r]);for(const id of r.ownerIds)find(field(r,id));}
 for(const group of patterns.values()){
  const events=new Map<string,string[]>();for(const r of group){const buckets=new Map<string,typeof r.occurrence.notes[number][]>();for(const n of r.occurrence.notes){const key=measureMemoryKey({...r.occurrence,notes:[n]});buckets.set(key,[...(buckets.get(key)??[]),n]);}
   for(const [key,notes]of buckets){if(notes.length>1&&(!notes[0].physicalAliasId||notes.some(n=>n.physicalAliasId!==notes[0].physicalAliasId)))continue;events.set(key,[...(events.get(key)??[]),...notes.map(n=>field(r,n.ownerId))]);}
   const aliases=new Map<string,string[]>();for(const n of r.occurrence.notes)if(n.physicalAliasId)aliases.set(n.physicalAliasId,[...(aliases.get(n.physicalAliasId)??[]),field(r,n.ownerId)]);for(const ids of aliases.values())for(const id of ids.slice(1))join(ids[0],id);
  }for(const ids of events.values())for(const id of ids.slice(1))join(ids[0],id);
 }
 const candidates:Array<{key:string;entryId:string;ownerId:string;saved:SavedFinger}>=[];
 for(const r of records.filter(r=>!r.occurrence.scope)){const input=selected.find(i=>i.entryId===r.entryId)!;for(const id of r.ownerIds){const saved=savedFinger(input,r,id,true);if(saved)candidates.push({key:field(r,id),entryId:r.entryId,ownerId:id,saved});}}
 candidates.sort((a,b)=>a.saved.age-b.saved.age||a.key.localeCompare(b.key));const winners=new Map<string,typeof candidates[number]>();for(const c of candidates)if(!winners.has(find(c.key)))winners.set(find(c.key),c);
 let next=structuredClone(document);for(const input of selected)next=registerMemoryScore(next,input);
 const chosen:ConsolidationReceipt['chosen']=[],replaced:ConsolidationReceipt['replaced']=[],personalByEntry:Record<string,PersonalState>={},publishedPatterns=new Set<string>();
 for(const input of selected)personalByEntry[input.entryId]=structuredClone(input.personal);
 for(const r of records){const input=selected.find(i=>i.entryId===r.entryId)!,edits:MeasureOwnerEdit[]=[];
  for(const id of r.ownerIds){const winner=winners.get(find(field(r,id)));if(!winner)continue;const {finger,decision}=winner.saved;edits.push({ownerId:id,patch:{finger},decisions:{finger:decision}});
   if(!r.occurrence.scope){chosen.push({entryId:r.entryId,ownerId:id,finger,decision});const old=savedFinger(input,r,id,true);if(old&&old.finger!==finger)replaced.push({entryId:r.entryId,ownerId:id,before:old.finger,after:finger,previous:old.previous,decision});
    const personal=personalByEntry[r.entryId],c=personal.assignments?.choices[id];if(c){delete c.finger;if(c.intent)delete c.intent.finger;if(c.hand===undefined)delete personal.assignments!.choices[id];}
    for(const [key,c]of Object.entries(personal.overrides))if(c.ownerIds.includes(id))delete personal.overrides[key];
   }
  }
  if(!edits.length)continue;const keyboard=r.occurrence.keyboardId;let m=next.keyboards[keyboard];
  // Clear this authorized occurrence's exceptions before coherent publication.
  m=applyMeasureMemoryEdits(m,r.occurrence,edits.map(e=>({ownerId:e.ownerId,patch:{finger:'inherit'}})),m.revision,'local').memory;
  const published=applyMeasureMemoryEdits(m,r.occurrence,edits,m.revision,'publish');if(published.diagnostics.length)fail('ambiguous consolidation mapping; retained input is unchanged');next.keyboards[keyboard]=published.memory;publishedPatterns.add(JSON.stringify([keyboard,measureMemoryKey(r.occurrence)]));
 }
 // Elect reference ages independently of per-field donors after coherent values exist.
 for(const [keyboard,memory]of Object.entries(next.keyboards)){let m=memory;for(const d of m.defaults){if(!publishedPatterns.has(JSON.stringify([keyboard,d.measureKey])))continue;const eligible=Object.values(next.occurrences).filter(r=>r.occurrence.keyboardId===keyboard&&measureMemoryKey(r.occurrence)===d.measureKey),known=eligible.filter(r=>r.authoredAt!==undefined),saved=eligible.filter(r=>{const i=selected.find(i=>presentationId(i)===r.presentationId);return i&&r.ownerIds.some(id=>savedFinger(i,r,id,true));});m=transferMeasureMemoryReference(m,d.measureKey,known.length?known:saved.length?saved:eligible,m.revision);}next.keyboards[keyboard]=m;}
 next.revision++;const receipt:ConsolidationReceipt={id:receiptId,policy:'earliest-union-fields-v1',entryIds:targets,sourceRevisions:Object.fromEntries(selected.map(i=>[i.entryId,source(i.p)])),beforeHash:await hashBytes(JSON.stringify(frozen.map(i=>({entryId:i.entryId,sourceRevision:source(i.p),personal:i.personal})))),afterHash:await hashBytes(JSON.stringify({keyboards:next.keyboards,personalByEntry})),completed:true,chosen:chosen.sort((a,b)=>a.entryId.localeCompare(b.entryId)||a.ownerId.localeCompare(b.ownerId)),replaced};
 const personalByKey=Object.fromEntries(selected.map(i=>[personalStorageName(i.entryId,i.p),personalByEntry[i.entryId]]));
 next.receipts[receiptId]=receipt;return{document:next,receipt,personalByEntry,personalByKey};
}
