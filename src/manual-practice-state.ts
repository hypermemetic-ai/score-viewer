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
   record.musicalRevision!==plan.revision||Object.keys(record).some(k=>!['version','partId','musicalRevision','state'].includes(k)))
  throw Error('Manual practice source or part differs; saved evidence retained.');
 const state=readPractice(record.state,plan);
 if(Object.keys(state.best).length||Object.values(state.groundwork??{}).some(Boolean))
  throw Error('Manual practice cannot carry piano-measured evidence; saved data retained.');
 return state;
}
export function manualPracticeRecord(plan:ManualPracticePlan,state:PracticeState):ManualPracticeRecord {
 const record:ManualPracticeRecord={version:'musical-manual-practice-v1',partId:plan.partId,musicalRevision:plan.revision,state:structuredClone(state)};
 return {...record,state:readManualPractice(record,plan)};
}
