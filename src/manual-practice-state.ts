import type {PracticeState} from './practice';
import {readPractice} from './practice';
import type {ManualPracticePlan} from './manual-practice-plan';

export interface ManualPracticeRecord {
 version:'musical-manual-practice-v1';partId:string;musicalRevision:string;state:PracticeState;
}
/** This namespace neither aliases nor migrates a physical piano journal. */
export function manualPracticeStorageName(plan:ManualPracticePlan){
 if(!/^[a-f0-9]{64}$/.test(plan.revision))throw Error('Invalid musical practice identity.');
 return `practice-manual-v1-${plan.revision}.json`;
}
export function readManualPractice(raw:unknown,plan:ManualPracticePlan):PracticeState {
 if(raw===undefined||raw===null)return readPractice(undefined,plan);
 const record=raw as ManualPracticeRecord;
 if(!record||Array.isArray(record)||!record.state||record.version!=='musical-manual-practice-v1'||record.partId!==plan.partId||
   Object.keys(record).some(k=>!['version','partId','musicalRevision','state'].includes(k)))
  throw Error('Manual practice source or part differs; saved evidence retained.');
 if(record.musicalRevision!==plan.revision){
  const legacy=Object.values(plan.legacyPlans??{}).find(p=>p.revision===record.musicalRevision) as ManualPracticePlan|undefined;
  if(plan.partition!=='bounded-exercises-v1'||!legacy)throw Error('Manual practice source or part differs; saved evidence retained.');
  readManualPractice(record,legacy);
  const state=readPractice(record.state,plan);state.legacy!.record=structuredClone(record);return state;
 }
 const state=readPractice(record.state,plan);
 if(state.legacy){const legacy=plan.legacyPlans?.[state.legacy.partition] as ManualPracticePlan|undefined;
  if(!legacy)throw Error('Manual recovery planner differs; saved evidence retained.');
  const recovery=state.legacy.record;
  if(recovery!==undefined){const old=recovery as ManualPracticeRecord;readManualPractice(old,legacy);
   if(JSON.stringify(old.state)!==JSON.stringify(state.legacy.state))throw Error('Manual recovery record differs; saved evidence retained.');
  }else if(Object.keys(state.legacy.state.best).length||Object.values(state.legacy.state.groundwork??{}).some(Boolean))throw Error('Manual recovery cannot carry piano-measured evidence; saved data retained.');
 }
 if(Object.keys(state.best).length||Object.values(state.groundwork??{}).some(Boolean))
  throw Error('Manual practice cannot carry piano-measured evidence; saved data retained.');
 return state;
}
/** Current record wins; absent current state can recover either accepted old
 * manual namespace. Lookup never writes or aliases a physical piano journal. */
export function manualPracticeStorageNames(plan:ManualPracticePlan):string[]{
 return [...new Set([manualPracticeStorageName(plan),...['connection-boundary-v1','fixed-four-v1'].flatMap(partition=>{const p=plan.legacyPlans?.[partition as 'connection-boundary-v1'|'fixed-four-v1'];return p?[manualPracticeStorageName(p as ManualPracticePlan)]:[];})])];
}
export async function readManualPracticeWithLegacy(plan:ManualPracticePlan,read:(file:string)=>Promise<unknown>):Promise<{raw:unknown;state:PracticeState;sourceStorageName?:string;migrated:boolean}>{
 for(const file of manualPracticeStorageNames(plan)){const raw=await read(file);if(raw!==undefined&&raw!==null){const state=readManualPractice(raw,plan);return {raw,state,sourceStorageName:file,migrated:(raw as ManualPracticeRecord).musicalRevision!==plan.revision};}}
 return {raw:undefined,state:readManualPractice(undefined,plan),migrated:false};
}
export function manualPracticeRecord(plan:ManualPracticePlan,state:PracticeState):ManualPracticeRecord {
 const record:ManualPracticeRecord={version:'musical-manual-practice-v1',partId:plan.partId,musicalRevision:plan.revision,state:structuredClone(state)};
 return {...record,state:readManualPractice(record,plan)};
}
