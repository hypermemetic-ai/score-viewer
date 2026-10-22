import {memoryInputKey,type MemoryScoreInput,type MemoryResolution} from './personal-fingering-memory';
/** Only musical authority participates. Cursor/page changes and the derived
 * display projection cannot invalidate the same accepted source resolution. */
export function personalMemoryResolutionKey(input:MemoryScoreInput,generation:number):string {
 const s=input.personal;return JSON.stringify([input.entryId,generation,s.assignments,s.overrides,s.calculatedOwners,s.layer]);
}
/** Each opening reads its package afresh, so resolutions are kept by the
 * score's memory identity rather than by package object: reopening a score
 * whose memory and hands are unchanged resolves nothing again. */
export class PersonalMemoryResolutionCache {
 private values=new Map<string,{key:string;value:MemoryResolution}>();
 resolve(input:MemoryScoreInput,generation:number,load:(input:MemoryScoreInput)=>MemoryResolution):MemoryResolution{
  const score=JSON.stringify([memoryInputKey(input),input.p.transposition??null]),key=personalMemoryResolutionKey(input,generation),saved=this.values.get(score);
  if(saved?.key===key)return saved.value;
  const value=load(input);this.values.delete(score);this.values.set(score,{key,value});
  if(this.values.size>16)this.values.delete(this.values.keys().next().value!);
  return value;
 }
}
/** Start derived work only after the next opportunity to paint. A newer request
 * replaces an older callback; cancel prevents work surviving its editor owner. */
export class AfterPaintWork {
 private frame?:number;private task?:ReturnType<typeof setTimeout>;
 constructor(private frames:{request:(work:()=>void)=>number;cancel:(id:number)=>void}={request:work=>requestAnimationFrame(work),cancel:id=>cancelAnimationFrame(id)},private tasks:{request:(work:()=>void)=>ReturnType<typeof setTimeout>;cancel:(id:ReturnType<typeof setTimeout>)=>void}={request:work=>setTimeout(work,0),cancel:id=>clearTimeout(id)}){}
 schedule(work:()=>void){this.cancel();this.frame=this.frames.request(()=>{this.frame=undefined;this.task=this.tasks.request(()=>{this.task=undefined;work();});});}
 cancel(){if(this.frame!==undefined)this.frames.cancel(this.frame);if(this.task!==undefined)this.tasks.cancel(this.task);this.frame=this.task=undefined;}
}
