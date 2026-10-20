/** Editing intent is synchronous; persistence is ordered independently of paint.
 * A failed write keeps the failed and later snapshots available for recovery.
 * The owner must retain this queue while its source-bound journal is pending. */
export class PersonalEditQueue<T> {
 private sequence=0;
 private tail:Promise<void>=Promise.resolve();
 private pending=new Map<number,T>();
 private failure?:Error;
 private recovering=false;
 /** With `superseded`, each snapshot is a whole state: one still waiting when a
  * later one is accepted is never written, and `superseded` releases it. */
 constructor(readonly sourceKey:string,private write:(snapshot:T,sequence:number)=>Promise<void>,private superseded?:(sequence:number)=>void){}
 private later(sequence:number){if(!this.superseded)return false;for(const key of this.pending.keys())if(key>sequence)return true;return false;}
 get error(){return this.failure;}
 get recovery(){return [...this.pending].map(([sequence,snapshot])=>({sequence,snapshot:structuredClone(snapshot)}));}
 accept(snapshot:T):{sequence:number;saved:Promise<void>} {
  if(this.failure||this.recovering)throw new Error('Editing is paused after a save failure. Pending choices are retained.',{cause:this.failure});
  const sequence=++this.sequence;
  this.pending.set(sequence,structuredClone(snapshot));
  const saved=this.tail.then(async()=>{
   if(this.failure)throw this.failure;
   if(this.later(sequence)){this.pending.delete(sequence);this.superseded!(sequence);return;}
   try{await this.write(structuredClone(this.pending.get(sequence)!),sequence);this.pending.delete(sequence);}
   catch(error){this.failure=error instanceof Error?error:new Error(String(error));throw this.failure;}
  });
  this.tail=saved.catch(()=>{});
  return {sequence,saved};
 }
 /** A retry uses the original ordered snapshots, never current selection. */
 async retry(){
  if(this.recovering)throw new Error('Personal edit recovery is already running.');
  this.recovering=true;
  try{
  await this.tail;
  this.failure=undefined;
  for(const [sequence,snapshot] of this.pending){
   if(this.later(sequence)){this.pending.delete(sequence);this.superseded!(sequence);continue;}
   try{await this.write(structuredClone(snapshot),sequence);this.pending.delete(sequence);}
   catch(error){this.failure=error instanceof Error?error:new Error(String(error));throw this.failure;}
  }
  }finally{this.recovering=false;}
 }
 flush(){return this.tail.then(()=>{if(this.failure)throw this.failure;});}
}
