import {FINGERTIPS_FILE,FINGERTIP_ILLUSTRATION,exportFingertips,fingertipBytes,parseFingertip,validateFingertips,type FingertipArchive,type FingertipFiles,type FingertipHand,type FingertipInstrument,type FingertipLoad,type FingertipMethod,type FingertipReference} from './calibration-fingertips';
export interface FingertipState {archive:FingertipArchive;instrument:FingertipInstrument;hand:FingertipHand;pair:number;method:FingertipMethod;reference:FingertipReference|null;raw:string;busy:boolean;readOnly:boolean;error?:string;saved:boolean}
export interface FingertipControllerOptions {load:FingertipLoad;files:FingertipFiles;instrument:FingertipInstrument;hand?:FingertipHand;now?:()=>string;id?:()=>string}
interface Draft {reference:FingertipReference|null;raws:Partial<Record<FingertipReference,string>>}
export class FingertipController {
 private accepted:FingertipArchive;private drafts=new Map<string,Draft>();private listeners=new Set<(s:FingertipState)=>void>();private pair=0;private method:FingertipMethod;private hand:FingertipHand;private busy=false;private stopped=false;private error?:string;private saved=false;private flight:Promise<void>=Promise.resolve();private epoch=0;
 private readonly retained:FingertipLoad;
 constructor(private options:FingertipControllerOptions){this.retained={...options.load,raw:options.load.raw?new Uint8Array(options.load.raw):undefined};this.accepted=validateFingertips(options.load.value);this.hand=options.hand??'RH';this.method=options.instrument==='janko-four-row'?'percent':'millimeters';this.error=options.load.error;}
 private draftKey(){return `${this.options.instrument}/${this.pair}/${this.method}`;}
 private draft():Draft {const key=this.draftKey();let d=this.drafts.get(key);if(!d){d={reference:this.pair===0?'second':null,raws:{}};for(const r of this.accepted.readings.filter(r=>r.instrument===this.options.instrument&&r.pair===this.pair&&r.method===this.method)){d.reference=r.reference;d.raws[r.reference]=r.raw;}this.drafts.set(key,d);}return d;}
 get state():FingertipState {const d=this.draft();return{archive:structuredClone(this.accepted),instrument:this.options.instrument,hand:this.hand,pair:this.pair,method:this.method,reference:d.reference,raw:d.reference==='both'?(this.method==='percent'?'100':'0'):d.raws[d.reference??'first']??'',busy:this.busy,readOnly:!!this.retained.error,error:this.error,saved:this.saved};}
 subscribe(fn:(s:FingertipState)=>void){if(this.stopped)return()=>{};this.listeners.add(fn);fn(this.state);return()=>this.listeners.delete(fn);}
 private emit(){if(!this.stopped)for(const fn of this.listeners)fn(this.state);}
 private edit(fn:()=>void){if(this.busy||this.stopped)return;fn();this.error=this.retained.error;this.saved=false;this.emit();}
 setHand(hand:FingertipHand){this.edit(()=>{this.hand=hand;});}
 selectPair(pair:number){if(Number.isInteger(pair)&&pair>=0&&pair<4)this.edit(()=>{this.pair=pair;});}
 selectMethod(method:FingertipMethod){if(method==='millimeters'||method==='percent'&&this.options.instrument==='janko-four-row')this.edit(()=>{this.method=method;});}
 selectReference(reference:FingertipReference|null){this.edit(()=>{this.draft().reference=reference;});}
 setRaw(raw:string){this.edit(()=>{const d=this.draft();if(d.reference&&d.reference!=='both')d.raws[d.reference]=raw;});}
 move(delta:number){this.selectPair(Math.max(0,Math.min(3,this.pair+delta)));}
 async saveAndNext():Promise<boolean>{
  if(this.busy||this.stopped||this.retained.error)return false;
  const s=this.state,value=parseFingertip(s.raw,s.method);
  if(!s.reference||value===undefined){this.error=!s.reference?'Choose the primary finger.':s.method==='percent'?'Enter a number of 100% or less. Negative numbers are allowed.':'Enter a nonnegative number of millimeters.';this.emit();return false;}
  const candidate=structuredClone(this.accepted);candidate.readings.push({id:(this.options.id??(()=>crypto.randomUUID()))(),recordedAt:(this.options.now??(()=>new Date().toISOString()))(),instrument:s.instrument,hand:s.hand,pair:s.pair,method:s.method,reference:s.reference,value,raw:s.raw,illustration:FINGERTIP_ILLUSTRATION,protocol:'extended-fingertip-reach-v1'});
  this.busy=true;this.error=undefined;const epoch=this.epoch;let settle!:()=>void;this.flight=new Promise<void>(r=>{settle=r;});this.emit();
  try{await this.options.files.write(FINGERTIPS_FILE,fingertipBytes(candidate));this.accepted=candidate;if(!this.stopped&&epoch===this.epoch){this.pair=Math.min(3,this.pair+1);this.saved=true;}return true;}
  catch(e){if(!this.stopped)this.error=`Reading was not saved: ${e instanceof Error?e.message:String(e)}. Your draft is retained.`;return false;}
  finally{this.busy=false;this.emit();settle();}
 }
 exportArchive(){return exportFingertips(this.retained,this.accepted);}
 flush(){return this.flight;}
 break(){this.epoch++;}
 dispose(){this.stopped=true;this.epoch++;this.listeners.clear();}
}
