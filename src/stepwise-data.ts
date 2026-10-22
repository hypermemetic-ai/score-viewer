import type {PreparationStage} from '../vendor/iso-notation/src/score-presentation';

/** Work on a large plain-data graph in short steps, so a caller that drains
 * them with a budget (`drainReadingChecks`) never holds its thread for the
 * whole graph. Each function gives exactly what its one-call twin gives. */

/** Work between two steps, in visits, where a long string or byte array
 * counts one visit per kilobyte: small enough that a step stays well under a frame. */
const STEP_VISITS=1024;
const weight=(item:unknown)=>typeof item==='string'?1+(item.length>>10):item instanceof Uint8Array?1+(item.byteLength>>10):1;
class NotPlainData extends Error {}
const plainObject=(value:object)=>{const prototype=Object.getPrototypeOf(value);return prototype===Object.prototype||prototype===null;};

/** `structuredClone(value)`, in steps. Plain objects, arrays, byte arrays and
 * primitives are copied as structuredClone copies them: shared references
 * and shared buffers stay shared, holes stay holes, nothing stays frozen.
 * Any other value in the graph (a class instance, a Map, a function) makes
 * this fall back to one structuredClone of the whole, with its own errors. */
export function* cloneSteps<T>(value:T):Generator<PreparationStage,T,void>{
 try{return yield* plainCloneSteps(value);}
 catch(error){if(error instanceof NotPlainData)return structuredClone(value);throw error;}
}
function* plainCloneSteps<T>(value:T):Generator<PreparationStage,T,void>{
 const copies=new Map<object,unknown>(),buffers=new Map<ArrayBufferLike,ArrayBuffer>(),pending:Array<{from:any;to:any;keys:string[];next:number}>=[];
 const copy=(item:unknown):unknown=>{
  if(item===null||typeof item!=='object'){if(typeof item==='function'||typeof item==='symbol')throw new NotPlainData();return item;}
  const known=copies.get(item);if(known!==undefined)return known;
  let made:any;
  if(item instanceof Uint8Array&&Object.getPrototypeOf(item)===Uint8Array.prototype){
   let buffer=buffers.get(item.buffer);if(!buffer){if(!(item.buffer instanceof ArrayBuffer))throw new NotPlainData();buffer=item.buffer.slice(0);buffers.set(item.buffer,buffer);}
   made=new Uint8Array(buffer,item.byteOffset,item.length);copies.set(item,made);return made;
  }
  if(Array.isArray(item)&&Object.getPrototypeOf(item)===Array.prototype)made=new Array(item.length);
  else if(!Array.isArray(item)&&plainObject(item))made={};
  else throw new NotPlainData();
  copies.set(item,made);pending.push({from:item,to:made,keys:Object.keys(item),next:0});return made;
 };
 const root=copy(value) as T;let visits=0;
 while(pending.length){
  const frame=pending[pending.length-1];
  if(frame.next>=frame.keys.length){pending.pop();continue;}
  const key=frame.keys[frame.next++],item=frame.from[key],child=copy(item);
  // A JSON "__proto__" member is data, as structuredClone keeps it.
  if(key==='__proto__')Object.defineProperty(frame.to,key,{value:child,writable:true,enumerable:true,configurable:true});else frame.to[key]=child;
  if((visits+=weight(item))>=STEP_VISITS){visits=0;yield 'commit';}
 }
 return root;
}

/** `JSON.stringify(literal(value))` for the capture's literal identity, in
 * steps: undefined, nonfinite numbers and -0 keep their difference, byte
 * arrays are spelled out, and every object lists its own entries in order. */
export function* literalJsonSteps(value:unknown):Generator<PreparationStage,string,void>{
 const out:string[]=[],path=new Set<object>(),pending:Array<{close:string;items:Array<()=>void>;next:number;owner?:object}>=[];let visits=0;
 const emit=(item:unknown):void=>{
  visits+=weight(item);
  if(item===undefined){out.push('["undefined"]');return;}
  if(item===null){out.push('["null"]');return;}
  if(typeof item==='number'){out.push('["number",',JSON.stringify(Object.is(item,-0)?'-0':String(item)),']');return;}
  if(typeof item==='string'||typeof item==='boolean'){out.push('[',JSON.stringify(typeof item),',',JSON.stringify(item),']');return;}
  if(typeof item!=='object')throw Error('Personal preparation requires captured literal package data.');
  // A cycle has no literal identity, as the one-call identity overflows on it.
  if(path.has(item))throw RangeError('Personal preparation requires acyclic package data.');
  if(item instanceof Uint8Array){out.push('["bytes",[',item.join(','),']]');return;}
  const array=Array.isArray(item);path.add(item);
  if(array){
   // A hole maps to a hole, which JSON writes as null.
   out.push('["array",[');
   pending.push({close:']]',owner:item,next:0,items:Array.from({length:item.length},(_,i)=>()=>{if(i)out.push(',');if(i in item)emit(item[i]);else out.push('null');})});
  }else{
   out.push('["object",[');
   pending.push({close:']]',owner:item,next:0,items:Object.entries(item).map(([key,child],i)=>()=>{out.push(i?',[':'[',JSON.stringify(key),',');pending.push({close:']',next:0,items:[()=>emit(child)]});})});
  }
 };
 emit(value);
 while(pending.length){
  const frame=pending[pending.length-1];
  if(frame.next>=frame.items.length){pending.pop();out.push(frame.close);if(frame.owner)path.delete(frame.owner);continue;}
  frame.items[frame.next++]();
  if(++visits>=STEP_VISITS){visits=0;yield 'commit';}
 }
 return out.join('');
}
