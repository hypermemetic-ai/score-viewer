import type {AssistanceSnapshot,AssistanceStore} from './durable-assistance-store';
import {readAdviceCorpusState,type AdviceCorpusState} from './fingering-advice';
import {personalMemoryDocument} from './personal-memory-session';
export const adviceCorpusDocument='fingering-advice-corpus';
export interface StoredAdviceCorpus {version:1;memoryRevision:number;contextKey:string;state:AdviceCorpusState}
export function storedAdviceCorpus(snapshot:AssistanceSnapshot,memoryRevision:number,contextKey:string):AdviceCorpusState|undefined {
 const raw=snapshot.documents[adviceCorpusDocument] as unknown as StoredAdviceCorpus|undefined;
 if(!raw||raw.version!==1||raw.memoryRevision!==memoryRevision||raw.contextKey!==contextKey)return;
 return readAdviceCorpusState(raw.state);
}
/** Derived evidence shares the atomic manifest, but never changes choices.
 * A later personal decision invalidates this entire source-bound derivation. */
export async function saveAdviceCorpus(store:AssistanceStore,input:StoredAdviceCorpus,isCurrent:()=>boolean):Promise<boolean>{
 const captured:StoredAdviceCorpus={...input,state:readAdviceCorpusState(input.state)};
 if(!Number.isSafeInteger(captured.memoryRevision)||captured.memoryRevision<0||!/^[a-f0-9]{64}$/.test(captured.contextKey))throw Error('Invalid fingering warning evidence identity.');
 for(let attempt=0;attempt<8;attempt++){
  if(!isCurrent())return false;const snapshot=await store.read(),memory=snapshot.documents[personalMemoryDocument] as {revision?:number}|undefined;
  if(!isCurrent()||memory?.revision!==captured.memoryRevision)return false;
  if(storedAdviceCorpus(snapshot,captured.memoryRevision,captured.contextKey))return true;
  const result=await store.commit({expectedRevision:snapshot.revision,changes:{[adviceCorpusDocument]:JSON.parse(JSON.stringify(captured))}});
  if(result.status==='committed')return true;
 }
 return false;
}
