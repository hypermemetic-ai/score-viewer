import type {PreparationExecution,PreparationStage} from '../vendor/iso-notation/src/score-presentation';
export type ReadingExecution=PreparationExecution;
export function capturedReadingExecution(input:ReadingExecution):ReadingExecution {
 return {signal:input.signal,budgetMs:input.budgetMs,yieldControl:input.yieldControl,onCheckpoint:input.onCheckpoint};
}
export function checkReadingExecution(execution?:ReadingExecution){if(execution?.signal?.aborted)throw new DOMException('Reading preparation was cancelled.','AbortError');}
export async function waitForReading<T>(pending:Promise<T>,signal?:AbortSignal):Promise<T>{
 if(!signal)return pending;
 return new Promise<T>((resolve,reject)=>{
  const abort=()=>{signal.removeEventListener('abort',abort);reject(new DOMException('Reading preparation was cancelled.','AbortError'));};
  signal.addEventListener('abort',abort,{once:true});if(signal.aborted)abort();
  pending.then(value=>{signal.removeEventListener('abort',abort);resolve(value);},error=>{signal.removeEventListener('abort',abort);reject(error);});
 });
}
/** Receiver-only exact validation steps. Musical preparation stays in ISO. */
export async function drainReadingChecks<T>(steps:Generator<PreparationStage,T,void>,input:ReadingExecution):Promise<T>{
 const execution=capturedReadingExecution(input),budget=execution.budgetMs??8;
 if(!Number.isFinite(budget)||budget<=0||budget>50)throw Error('Invalid reading execution budget.');
 let start=performance.now();
 const yieldTask=async(stage:PreparationStage)=>{
  checkReadingExecution(execution);
  let cleanup:()=>void=()=>{};
  const promise=execution.yieldControl?execution.yieldControl(stage):new Promise<void>(resolve=>{
   if(typeof MessageChannel==='function'){const channel=new MessageChannel();cleanup=()=>{channel.port1.close();channel.port2.close();};channel.port1.onmessage=()=>resolve();channel.port2.postMessage(0);}
   else {const timer=setTimeout(resolve,0);cleanup=()=>clearTimeout(timer);}
  });
  try{await waitForReading(promise,execution.signal);}finally{cleanup();}
  checkReadingExecution(execution);start=performance.now();
 };
 try{await yieldTask('layout');for(;;){checkReadingExecution(execution);const next=steps.next();if(next.done){checkReadingExecution(execution);return next.value;}
  execution.onCheckpoint?.(next.value);checkReadingExecution(execution);if(performance.now()-start>=budget)await yieldTask(next.value);
 }}finally{steps.return(undefined as T);}
}
/** A task turn between two long receiver steps, so input is answered between
 * them: none without an execution, which then runs as one task as before. */
export async function readingTurn(execution?:ReadingExecution):Promise<void>{if(execution)await drainReadingChecks((function*():Generator<PreparationStage,void,void>{})(),execution);}
