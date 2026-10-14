import type {MemoryScoreInput,MemoryResolution} from './personal-fingering-memory';
/** Only musical authority participates. Cursor/page changes and the derived
 * display projection cannot invalidate the same accepted source resolution. */
export function personalMemoryResolutionKey(input:MemoryScoreInput,generation:number):string {
 const s=input.personal;return JSON.stringify([input.entryId,generation,s.assignments,s.overrides,s.calculatedOwners,s.layer]);
}
export class PersonalMemoryResolutionCache {
 private values=new WeakMap<MemoryScoreInput['p'],Map<string,{key:string;value:MemoryResolution}>>();
 resolve(input:MemoryScoreInput,generation:number,load:(input:MemoryScoreInput)=>MemoryResolution):MemoryResolution{
  const key=personalMemoryResolutionKey(input,generation),entries=this.values.get(input.p)??new Map(),saved=entries.get(input.entryId);
  if(saved?.key===key)return saved.value;
  const value=load(input);entries.set(input.entryId,{key,value});this.values.set(input.p,entries);return value;
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
