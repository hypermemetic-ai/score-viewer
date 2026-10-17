import type {ScorePackage} from './package';
import type {PersonalState} from './state';
import {practiceStorageName,legacyPracticeStorageName,collectionId} from './state';
import {getScoreTransposition} from './score-transposition';
import {planPractice,readPractice,passageHierarchy,transferPracticeEdition,type PracticeState} from './practice';
import {equivalentPracticeClaims,practiceExerciseEvidenceKey} from './practice-equivalence';

interface PracticeInstallHost {read(name:string):Promise<Uint8Array|null>;write(name:string,data:Uint8Array):Promise<void>}
export interface MergedEditionPracticeState extends PracticeState {editionMergeEvidence?:{version:'practice-edition-merge-v1';targetRaw:unknown;incomingRaw:unknown}}
/** Existing target settings and claims remain authoritative; incoming genuine
 * same-sized complete source claims add credit, never replace prior credit. */
export function mergeEditionPractice(targetRaw:unknown,incomingRaw:PracticeState,p:ScorePackage,personal?:PersonalState):MergedEditionPracticeState {
 if(targetRaw===null||targetRaw===undefined)return structuredClone(incomingRaw);
 const targetPlan=planPractice(p,'bounded-exercises-v1',personal),target=readPractice(targetRaw,targetPlan),incoming=readPractice(incomingRaw,targetPlan);
 // Both old journals are validated and projected onto the current peer
 // catalog. Overlapping doubles never become a competing recursive tree.
 const all=passageHierarchy(targetPlan,target).all,from=passageHierarchy(targetPlan,incoming).all,fromByEvidence=new Map([...from.values()].flatMap(c=>{const evidence=practiceExerciseEvidenceKey(targetPlan,c);return evidence?[[evidence,c] as const]:[];}));
 for(const chunk of all.values()){
  const evidence=practiceExerciseEvidenceKey(targetPlan,chunk),match=evidence&&fromByEvidence.get(evidence);if(!match)continue;
  const claims=equivalentPracticeClaims(incoming,{passage:match.id,pattern:match.pattern}).filter(c=>{const owner=from.get(c.passage);return owner&&owner.end-owner.start===match.end-match.start;});
  const rates=claims.flatMap(c=>incoming.best[c.pattern]===undefined?[]:[incoming.best[c.pattern]]);if(rates.length)target.best[chunk.pattern]=Math.max(target.best[chunk.pattern]??0,...rates);
  if(claims.some(c=>incoming.groundwork?.[c.pattern])){target.groundwork??={};target.groundwork[chunk.pattern]=true;}
  const marks=claims.flatMap(c=>incoming.manualAttainment?.marks[JSON.stringify([c.passage,c.pattern])]??[]);if(marks.length){target.manualAttainment??={version:1,marks:{}};const key=JSON.stringify([chunk.id,chunk.pattern]);target.manualAttainment.marks[key]=[...new Set([...(target.manualAttainment.marks[key]??[]),...marks])];}
 }
 const state=readPractice(target,targetPlan) as MergedEditionPracticeState;
 state.editionMergeEvidence={version:'practice-edition-merge-v1',targetRaw:structuredClone(targetRaw),incomingRaw:structuredClone(incomingRaw)};
 return state;
}
const sameBytes=(a:Uint8Array|null,b:Uint8Array|null)=>a===b||!!a&&!!b&&a.length===b.length&&a.every((value,i)=>value===b[i]);
/** Called during the guarded installation stage, before context admission and
 * the final library pointer. The source/current journal is never overwritten. */
export async function stagePracticeEditionTransfer(host:PracticeInstallHost,request:{entryId:string;from:ScorePackage;to:ScorePackage;personal?:PersonalState;canCommit?:()=>boolean}):Promise<{transferred:boolean;key?:string;state?:PracticeState}> {
 const {from,to,entryId,personal}=request,check=()=>{if(request.canCommit&&!request.canCommit())throw Error('Saving was cancelled; prior practice journals retained.');};check();
 if(!from.keyboardLayout||!to.keyboardLayout||!from.sourceSha256||from.sourceSha256!==to.sourceSha256||from.sourceRevision!==to.sourceRevision||from.keyboardLayout!==to.keyboardLayout||getScoreTransposition(from)!==getScoreTransposition(to))return {transferred:false};
 if(collectionId(from)!==entryId||collectionId(to)!==entryId)throw Error('Practice storage belongs to another source collection; journals retained.');
 const sourceKey=practiceStorageName(entryId,from),targetKey=practiceStorageName(entryId,to);
 if(sourceKey===targetKey){if(from.manifest.revision!==to.manifest.revision)throw Error('Changed practice edition needs a separate journal; current practice retained.');return {transferred:false};}
 const sourceBytes=await host.read(sourceKey),legacy=legacyPracticeStorageName(from),rawBytes=sourceBytes??(legacy?await host.read(legacy):null);check();if(!rawBytes)return {transferred:false};
 const sourceOrigin=sourceBytes?sourceKey:legacy!;
 const targetBytes=await host.read(targetKey);check();
 const parsed=(bytes:Uint8Array)=>JSON.parse(new TextDecoder().decode(bytes)) as unknown,
  incoming=transferPracticeEdition(from,parsed(rawBytes),to,personal),state=mergeEditionPractice(targetBytes?parsed(targetBytes):undefined,incoming,to,personal);
 check();const currentSource=await host.read(sourceOrigin);check();if(!sameBytes(rawBytes,currentSource))throw Error('Source practice journal changed while saving; saved progress retained.');
 const currentTarget=await host.read(targetKey);check();if(!sameBytes(targetBytes,currentTarget))throw Error('Target practice journal changed while saving; saved progress retained.');
 await host.write(targetKey,new TextEncoder().encode(JSON.stringify(state)));check();
 if(!sameBytes(rawBytes,await host.read(sourceOrigin)))throw Error('Source practice journal changed while saving; saved progress retained.');check();
 return {transferred:true,key:targetKey,state};
}
