import {capturedReadingExecution,checkReadingExecution,type ReadingExecution} from './reading-execution';

export interface PreparationLease<T> {readonly key:string;readonly materialBytes:number;readonly core:T;valid:boolean}
export interface PreparationRequest<T> {key:string;materialBytes:number;produce(execution?:ReadingExecution):Promise<T>;lease?:PreparationLease<T>}
/** Only captured shared cores live here. No package, personal journal or view wrapper is retained. */
export class PersonalPreparationPool<T> {
 private entries=new Map<string,PreparationLease<T>>();
 private tail:Promise<void>=Promise.resolve();
 constructor(readonly maxEntries=2,readonly maxMaterialBytes=64*1024*1024){
  if(!Number.isInteger(maxEntries)||maxEntries<1||!Number.isSafeInteger(maxMaterialBytes)||maxMaterialBytes<1)throw Error('Invalid personal preparation retention budget.');
 }
 get retained(){return {entries:this.entries.size,materialBytes:[...this.entries.values()].reduce((n,e)=>n+e.materialBytes,0)};}
 async use<V>(request:PreparationRequest<T>,action:(core:T,execution?:ReadingExecution)=>V|Promise<V>,input?:ReadingExecution):Promise<{lease:PreparationLease<T>;value:V}>{
  const execution=input?capturedReadingExecution(input):undefined;
  const queued=this.tail.then(async()=>{
   checkReadingExecution(execution);
   if(!Number.isSafeInteger(request.materialBytes)||request.materialBytes<0)throw Error('Invalid personal preparation material size.');
   let lease=this.entries.get(request.key)??(request.lease?.valid&&request.lease.key===request.key?request.lease:undefined);
   try{
    if(!lease)lease={key:request.key,materialBytes:request.materialBytes,core:await request.produce(execution),valid:true};
    checkReadingExecution(execution);
    const value=await action(lease.core,execution);checkReadingExecution(execution);
    this.entries.delete(lease.key);
    if(lease.materialBytes<=this.maxMaterialBytes){
     this.entries.set(lease.key,lease);
     while(this.entries.size>this.maxEntries||this.retained.materialBytes>this.maxMaterialBytes)this.entries.delete(this.entries.keys().next().value!);
    }
    return {lease,value};
   }catch(error){
    if(lease){lease.valid=false;if(this.entries.get(lease.key)===lease)this.entries.delete(lease.key);}
    throw error;
   }
  });
  // A failed owner releases the queue. A later caller starts its own producer;
  // it never adopts the failed/canceled caller's incomplete work or callbacks.
  this.tail=queued.then(()=>{},()=>{});return queued;
 }
}
