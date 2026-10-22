import {isPitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import {projectPersonalMemoryScore,type MemoryScoreInput,type MemoryResolution} from './personal-fingering-memory';
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
 const source=input.p.score.notes.find(n=>n.id===ownerId),bars=input.p.score.sourceBarTicks;if(!source||!isPitchedEvent(source)||!bars)return;
 const start=bars.findLast(tick=>tick<=source.startTick);if(start===undefined)return;const denominator=input.p.score.ticksPerBeat;
 const note={midiPitch:source.pitch.octave*12+source.pitch.pitchClass,onset:{numerator:source.startTick-start,denominator},duration:{numerator:source.durationTicks,denominator}};
 const eq=(a:{numerator:number;denominator:number},b:{numerator:number;denominator:number})=>BigInt(a.numerator)*BigInt(b.denominator)===BigInt(b.numerator)*BigInt(a.denominator);
 const matches=reference.occurrence.notes.filter(n=>n.midiPitch===note.midiPitch&&eq(n.onset,note.onset)&&eq(n.duration,note.duration));
 if(matches.length!==1&&(!matches.length||!matches[0].physicalAliasId||!matches.every(n=>n.physicalAliasId===matches[0].physicalAliasId)))return;
 return{entryId:reference.entryId,sourceRevision:reference.occurrence.sourceRevision,writtenBar:reference.writtenBar,ownerId:matches[0].ownerId};
}
export function memoryChoiceLabel(resolution:MemoryResolution,ownerId:string):'Shared'|'Local'|undefined {
 const finger=resolution.byOwner[ownerId]?.finger;return finger?finger.provenance==='local'?'Local':'Shared':undefined;
}
/** Where the selected note's finger comes from, said once: `said` on the
 * editor's Finger row, `description` in full for the label's tooltip. Both read
 * the bar matching bars follow from the resolution; when it is missing it is
 * unavailable, never assumed. `reference` says whether that bar is this one.
 * `at` is the note's bar as printed; `bar` prints the reference's stored bar (a
 * folded repeat prints fewer bars). */
export function memoryFingerSource(resolution:MemoryResolution,ownerId:string,label:'Shared'|'Local',at:{entryId:string;writtenBar:number},work:(entryId:string)=>string,bar:(entryId:string,writtenBar:number)=>number=(_,b)=>b):{said:string;description:string;reference:'here'|'elsewhere'|'unavailable';promote:boolean} {
 // On a folded score a reference in this printed bar's other pass is this bar.
 const ref=resolution.byOwner[ownerId]?.reference,reference=!ref?'unavailable':ref.entryId===at.entryId&&bar(ref.entryId,ref.writtenBar)===at.writtenBar?'here':'elsewhere';
 // "Use for matching bars" is offered for an owner's finger, except where matching bars already follow it.
 const promote=!!resolution.byOwner[ownerId]?.personal&&!(label==='Shared'&&reference==='here');
 const where=ref?`bar ${bar(ref.entryId,ref.writtenBar)}${ref.entryId===at.entryId?'':` of ${work(ref.entryId)}`}`:'';
 if(label==='Local')return{said:'For this note only.',description:`Your finger for this note only, instead of ${reference==='elsewhere'?`${where}’s`:'the shared one'}.`,reference,promote};
 if(reference==='unavailable')return{said:'Reference unavailable.',description:'Shared with matching bars, but the bar they follow is unavailable.',reference,promote};
 if(reference==='here')return{said:'Matching bars follow this bar.',description:'Matching bars follow this bar’s finger.',reference,promote};
 return{said:`Same as ${where}.`,description:`Same as ${where}, which matching bars follow.`,reference,promote};
}

