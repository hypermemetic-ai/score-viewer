import {projectPersonalMemoryScore,type MemoryScoreInput,type MemoryResolution,type PersonalFingeringMemory} from './personal-fingering-memory';
import {rawMemoryPersonal} from './personal-memory-session';
import type {PersonalState} from './state';
import type {AdviceEvidence} from './fingering-advice';

export function withResolvedMemory(input:MemoryScoreInput,resolution:MemoryResolution,revision:number):PersonalState {
 const personal=rawMemoryPersonal(input.personal);
 personal.memoryResolved={revision,sourceRevision:input.p.sourceRevision??input.p.manifest.revision,choices:Object.fromEntries(Object.entries(resolution.byOwner).flatMap(([id,r])=>r.finger&&!r.calculated?[[id,{finger:r.finger.value}]]:[]))};
 return personal;
}
/** A copied decision is useful for assessment, but never another corpus sample. */
export function memoryAdviceEvidence(input:MemoryScoreInput,resolution:MemoryResolution):Map<string,AdviceEvidence>{
 const evidence=new Map<string,AdviceEvidence>(),records=projectPersonalMemoryScore({...input,personal:rawMemoryPersonal(input.personal)});
 for(const [id,r]of Object.entries(resolution.byOwner)){
  const decision=r.finger?.decision;if(!r.personal||!decision||r.finger?.value===null)continue;
  const donor=records.some(record=>record.ownerIds.includes(id)&&record.occurrence.occurrenceId===decision.donor.occurrenceId&&record.occurrence.sourceRevision===decision.donor.sourceRevision&&record.occurrence.scope===decision.donor.scope);
  evidence.set(id,{lineageId:decision.decisionId,evidence:donor?'personal':'inherited'});
 }
 return evidence;
}
/** Resolve the corresponding written owner without depending on page positions
 * or source IDs being identical across separately imported scores. */
export function memoryReferenceTarget(input:MemoryScoreInput,resolution:MemoryResolution,ownerId:string){
 const reference=resolution.byOwner[ownerId]?.reference;if(!reference)return;
 const record=projectPersonalMemoryScore({...input,personal:rawMemoryPersonal(input.personal)}).find(r=>r.ownerIds.includes(ownerId)&&r.occurrence.scope===reference.occurrence.scope);
 const note=record?.occurrence.notes.find(n=>n.ownerId===ownerId);if(!note)return;
 const eq=(a:{numerator:number;denominator:number},b:{numerator:number;denominator:number})=>BigInt(a.numerator)*BigInt(b.denominator)===BigInt(b.numerator)*BigInt(a.denominator);
 const matches=reference.occurrence.notes.filter(n=>n.midiPitch===note.midiPitch&&eq(n.onset,note.onset)&&eq(n.duration,note.duration));
 if(matches.length!==1&&(!matches.length||!matches[0].physicalAliasId||!matches.every(n=>n.physicalAliasId===matches[0].physicalAliasId)))return;
 return{entryId:reference.entryId,sourceRevision:reference.occurrence.sourceRevision,writtenBar:reference.writtenBar,ownerId:matches[0].ownerId};
}
export function memoryChoiceLabel(resolution:MemoryResolution,ownerId:string):'Shared'|'Local'|undefined {
 const finger=resolution.byOwner[ownerId]?.finger;return finger?finger.provenance==='local'?'Local':'Shared':undefined;
}
export function memorySourceLabel(document:PersonalFingeringMemory,resolution:MemoryResolution,ownerId:string,title:(entryId:string)=>string):string {
 const r=resolution.byOwner[ownerId],decision=r?.finger?.decision;
 const ref=r?.reference,donor=decision&&Object.values(document.occurrences).find(q=>q.occurrence.occurrenceId===decision.donor.occurrenceId&&q.occurrence.sourceRevision===decision.donor.sourceRevision&&q.occurrence.scope===decision.donor.scope);
 return [ref?`Reference: ${title(ref.entryId)}, measure ${ref.writtenBar}.`:r?.finger?'Reference unavailable.':'',donor?`Choice from ${title(donor.entryId)}, measure ${donor.writtenBar}.`:''].filter(Boolean).join(' ');
}
