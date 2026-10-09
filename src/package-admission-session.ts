import {ownPackageAdmission,type ScorePackage} from './package';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';

interface Options {allowLegacyTempo?:boolean;keyboardLayout?:PhysicalKeyboardId}
type OwnedAdmission=Awaited<ReturnType<typeof ownPackageAdmission>>;
interface Entry {bytes:Uint8Array;allowLegacyTempo:boolean;admission:OwnedAdmission;retainedBytes:number}
interface Pending {bytes:Uint8Array;allowLegacyTempo:boolean;generation:number;promise:Promise<OwnedAdmission>}
const sameBytes=(a:Uint8Array,b:Uint8Array)=>a.byteLength===b.byteLength&&a.every((v,i)=>v===b[i]);
const bounded=(value:number|undefined,maximum:number)=>value===undefined?maximum:Number.isFinite(value)?Math.min(maximum,Math.max(0,Math.floor(value))):0;

/** Bounded reuse of actual admission within this compiled realm. Exact bytes
 * resolve even same-size index collisions. Canonical graphs stay behind private
 * fields and copy closures; callers receive independent wrappers/member bytes.
 * Dual musical source/presentation graphs remain immutable and keep their
 * actual receiving-realm context; ordinary piano graphs are mutable copies.
 * The material budget counts copied archive/member bytes and UTF-16 serialized
 * graph content conservatively; it is not a claim about exact JS heap usage. */
export class PackageAdmissionSession {
 #entries:Entry[]=[];
 #pending=new Set<Pending>();
 #generation=0;
 readonly #maxEntries:number;
 readonly #maxRetainedBytes:number;

 constructor(limits:{maxEntries?:number;maxRetainedBytes?:number}={}){
  this.#maxEntries=bounded(limits.maxEntries,2);
  this.#maxRetainedBytes=bounded(limits.maxRetainedBytes,64*1024*1024);
 }
 get retained(){return {entries:this.#entries.length,bytes:this.#entries.reduce((n,e)=>n+e.retainedBytes,0),pending:this.#pending.size};}
 // An active producer keeps its slot through clear. Clearing must not permit
 // another cold replay to overlap it or let later calls borrow its old work.
 clear():void {this.#generation++;this.#entries=[];}
 /** Wait for the one producer without exposing its graph or storing a queue.
  * Background callers must recheck their own generation after this wait. */
 async waitForIdle():Promise<void>{const active=[...this.#pending][0];if(active)await active.promise.then(()=>undefined,()=>undefined);}

 async import(bytes:Uint8Array,options:Options={}):Promise<ScorePackage>{
  if(bytes.byteLength>50_000_000)throw Error('Package exceeds 50 MB');
  // Capture bytes AND effective options before the first asynchronous boundary.
  const snapshot=new Uint8Array(bytes),allowLegacyTempo=!!options.allowLegacyTempo,keyboardLayout=options.keyboardLayout,
   matches=(e:{bytes:Uint8Array;allowLegacyTempo:boolean})=>e.allowLegacyTempo===allowLegacyTempo&&sameBytes(e.bytes,snapshot),
   hit=this.#entries.find(matches);
  if(hit){
   this.#entries=this.#entries.filter(e=>e!==hit);this.#entries.push(hit);
   try{return await hit.admission.copy(keyboardLayout);}catch(error){this.#entries=this.#entries.filter(e=>e!==hit);throw error;}
  }
  let pending=[...this.#pending].find(e=>e.generation===this.#generation&&matches(e));
  if(!pending){
   if(this.#pending.size)throw Error('Package admission is busy; retry after the active import finishes.');
   const generation=this.#generation,request:Pending={bytes:snapshot,allowLegacyTempo,generation,promise:undefined!};
   request.promise=ownPackageAdmission(snapshot,{allowLegacyTempo}).then(admission=>{
    const retainedBytes=snapshot.byteLength+admission.retainedBytes;
    if(generation===this.#generation&&this.#maxEntries>0&&retainedBytes<=this.#maxRetainedBytes){
     while(this.#entries.length&&(this.#entries.length>=this.#maxEntries||this.retained.bytes+retainedBytes>this.#maxRetainedBytes))this.#entries.shift();
     this.#entries.push({bytes:snapshot,allowLegacyTempo,admission,retainedBytes});
    }
    return admission;
   }).finally(()=>this.#pending.delete(request));
   this.#pending.add(request);pending=request;
  }
  return (await pending.promise).copy(keyboardLayout);
 }
}
