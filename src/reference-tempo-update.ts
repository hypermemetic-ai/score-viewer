import {strToU8} from 'fflate';
import {requireReferencePerformanceTempo,validateReferencePerformanceTempo,type ReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import {archivePackage,hashBytes,importPackage,validateLayer,type ScorePackage} from './package';
import {readPersonal,type PersonalState} from './state';
import {planPractice,readPractice,readPersonalGoal,type PracticeState} from './practice';
import {readPerformance,type PerformanceRecords} from './performance';

/** Explicit reviewed update only. No generic revision or stale-candidate migration. */
export function referenceTempoOnlyUpdate(before:ScorePackage,after:ScorePackage):boolean {
 if(before.score.referencePerformanceTempo!==undefined||after.score.referencePerformanceTempo===undefined)return false;
 requireReferencePerformanceTempo(after.score);
 const {referencePerformanceTempo:_,...score}=after.score;
 if(JSON.stringify(before.score)!==JSON.stringify(score))return false;
 const stable=(p:ScorePackage)=>{const {revision,semanticSha256,files,createdAt,...rest}=p.manifest;return JSON.stringify(rest);};
 if(stable(before)!==stable(after)||JSON.stringify(before.fingerEligibility)!==JSON.stringify(after.fingerEligibility))return false;
 const names=Object.keys(before.manifest.files);
 if(names.length!==Object.keys(after.manifest.files).length)return false;
 return names.every(name=>!!after.files[name]&&(name==='score.json'||before.manifest.files[name]===after.manifest.files[name]&&before.files[name].length===after.files[name].length&&before.files[name].every((byte,i)=>byte===after.files[name][i])));
}
export async function addReferencePerformanceTempo(bytes:Uint8Array,reference:ReferencePerformanceTempo):Promise<{bytes:Uint8Array;before:ScorePackage;after:ScorePackage}> {
 const before=await importPackage(bytes,{allowLegacyTempo:true});
 if(before.score.referencePerformanceTempo!==undefined)throw Error('Score already has an explicit reference; this update only fills a missing reference.');
 const tempo=validateReferencePerformanceTempo(reference),files={...before.files};delete files['manifest.json'];
 files['score.json']=strToU8(JSON.stringify({...before.score,referencePerformanceTempo:tempo}));
 const revision=await hashBytes(files['score.json']),manifest={...before.manifest,revision,semanticSha256:revision,files:{...before.manifest.files,'score.json':revision},createdAt:new Date().toISOString()};
 const output=archivePackage(manifest,files),after=await importPackage(output);
 if(!referenceTempoOnlyUpdate(before,after))throw Error('Reference update changed musical or frozen payload identity; original archive retained.');
 return {bytes:output,before,after};
}
export interface TempoReboundState {personal?:PersonalState;practice?:PracticeState;performance?:PerformanceRecords}
function requireSavedPracticeTarget(state:PracticeState,reference:ReferencePerformanceTempo) {
 const target=state.personalGoal===undefined?reference.bpm:readPersonalGoal(state.personalGoal,reference).bpm;
 if(state.target!==target)throw Error('Saved practice reference differs; original progress retained.');
}
/** Caller snapshots current persisted bytes and reviews the proof before atomic native delivery. */
export function rebindReferenceTempoState(before:ScorePackage,after:ScorePackage,raw:{personal?:unknown;practice?:unknown;performance?:unknown}):TempoReboundState {
 if(!referenceTempoOnlyUpdate(before,after))throw Error('Unsafe tempo-only rebind; original personal evidence retained.');
 const revision=after.manifest.revision,result:TempoReboundState={};
 if(raw.personal!==undefined){const old=readPersonal(structuredClone(raw.personal),before);for(const layer of [old.layer,...old.history].filter(Boolean))validateLayer(layer!,before);result.personal=readPersonal({...structuredClone(old),revision},after);for(const layer of [result.personal.layer,...result.personal.history].filter(Boolean))validateLayer(layer!,after);}
 if(raw.practice!==undefined){const old=raw.practice as PracticeState;if(old.revision!==before.manifest.revision)throw Error('Saved practice reference differs; original progress retained.');requireSavedPracticeTarget(old,requireReferencePerformanceTempo(after.score));result.practice=readPractice({...structuredClone(old),revision},planPractice(after));}
 if(raw.performance!==undefined){const old=readPerformance(raw.performance,before.manifest.revision);result.performance=readPerformance({...old,revision},revision);}
 return result;
}

/** Reviewed source-identical calculation delivery, optionally adding the missing tempo. */
export function referenceAndCalculationUpdate(before:ScorePackage,after:ScorePackage):boolean {
 if(!after.fingerLayer||after.fingerLayer.physicalRowOrder!=='rr-even-far-last-v1')return false;
 const target=requireReferencePerformanceTempo(after.score);
 if(before.score.referencePerformanceTempo!==undefined&&JSON.stringify(requireReferencePerformanceTempo(before.score))!==JSON.stringify(target))return false;
 const strip=(p:ScorePackage)=>{const {referencePerformanceTempo:_,...score}=p.score;return JSON.stringify(score);};
 if(strip(before)!==strip(after))return false;
 const stable=(p:ScorePackage)=>{const {revision,semanticSha256,files,createdAt,...rest}=p.manifest;return JSON.stringify(rest);};
 if(stable(before)!==stable(after)||JSON.stringify(before.fingerEligibility)!==JSON.stringify(after.fingerEligibility))return false;
 const names=Object.keys(before.manifest.files);
 if(names.length!==Object.keys(after.manifest.files).length)return false;
 validateLayer(after.fingerLayer,after);
 return names.every(name=>!!after.files[name]&&(['score.json','fingers.json'].includes(name)||before.manifest.files[name]===after.manifest.files[name]&&before.files[name].length===after.files[name].length&&before.files[name].every((byte,i)=>byte===after.files[name][i])));
}
export async function addCalculatedFingerLayer(bytes:Uint8Array,layerBytes:Uint8Array):Promise<{bytes:Uint8Array;before:ScorePackage;after:ScorePackage}> {
 const before=await importPackage(bytes),files={...before.files};delete files['manifest.json'];
 files['fingers.json']=layerBytes;
 const manifest={...before.manifest,files:{...before.manifest.files,'fingers.json':await hashBytes(layerBytes)},createdAt:new Date().toISOString()},output=archivePackage(manifest,files),after=await importPackage(output);
 if(!referenceAndCalculationUpdate(before,after))throw Error('Calculation update changed source, frozen geometry or reference; original archive retained.');
 return {bytes:output,before,after};
}
/** Keep the former calculated baseline available; personal corrections remain exact. */
export function rebindCalculatedState(before:ScorePackage,after:ScorePackage,raw:{personal?:unknown;practice?:unknown;performance?:unknown}):TempoReboundState {
 if(!referenceAndCalculationUpdate(before,after))throw Error('Unsafe calculated-layer update; original personal evidence retained.');
 const revision=after.manifest.revision,result:TempoReboundState={};
 if(raw.personal!==undefined){
  const old=readPersonal(structuredClone(raw.personal),before);for(const layer of [old.layer,...old.history].filter(Boolean))validateLayer(layer!,before);
  const next={...structuredClone(old),revision},prior=old.layer??before.fingerLayer;
  if(prior)next.history.push(structuredClone(prior));delete next.layer;
  result.personal=readPersonal(next,after);for(const layer of result.personal.history)validateLayer(layer,after);
 }
 if(raw.practice!==undefined){const old=raw.practice as PracticeState;if(old.revision!==before.manifest.revision)throw Error('Saved practice reference differs; original progress retained.');requireSavedPracticeTarget(old,requireReferencePerformanceTempo(after.score));const candidate={...structuredClone(old),revision};readPractice(structuredClone(candidate),planPractice(after));result.practice=candidate;}
 if(raw.performance!==undefined){const old=readPerformance(raw.performance,before.manifest.revision);result.performance=readPerformance({...old,revision},revision);}
 return result;
}
