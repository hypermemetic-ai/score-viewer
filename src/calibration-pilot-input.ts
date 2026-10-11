import type {CalibrationInputEvent} from '@hypermemetic-ai/fingering-calculator';
import type {MidiCC,MidiNote} from './midi';

interface Connection {source:string;generation:number}
export interface PilotInputOwner {
 input(event:CalibrationInputEvent,midiConnected:boolean):Promise<boolean>;
 break():void;
}
/** Modal-owned admission only. No score clock, playing ledger or event timing is retained. */
export class PilotInputScope {
 private epoch=0;private floor:number|undefined;private disposed=false;
 constructor(private owner:PilotInputOwner,private clock:()=>Promise<number>,
  private connection:()=>Connection|undefined,private focused:()=>boolean){}
 async activate():Promise<void> {
  const epoch=++this.epoch,connection=this.connection();this.floor=undefined;
  if(this.disposed||!this.focused())return;
  try{const floor=await this.clock(),current=this.connection();
   if(!this.disposed&&epoch===this.epoch&&this.focused()&&Number.isFinite(floor)&&floor>=0&&
    connection?.source===current?.source&&connection?.generation===current?.generation)this.floor=floor;
  }catch{/* Keyboard ratings remain available when the native clock cannot activate. */}
 }
 break():void {this.epoch++;this.floor=undefined;if(!this.disposed)this.owner.break();}
 dispose():void {this.break();this.disposed=true;}
 private admits(event:MidiCC|MidiNote):boolean {
  const connection=this.connection();return !this.disposed&&this.focused()&&!!connection&&
   event.source===connection.source&&event.generation===connection.generation&&
   Number.isInteger(event.channel)&&event.channel>=1&&event.channel<=16&&this.floor!==undefined&&
   Number.isFinite(event.timestamp_micros)&&event.timestamp_micros! >= this.floor;
 }
 midi(event:MidiNote):void {
  if(!this.admits(event)||event.filtered||typeof event.on!=='boolean'||!Number.isInteger(event.note)||event.note<0||event.note>127||
   !Number.isInteger(event.velocity)||event.velocity<0||event.velocity>127)return;
  void this.owner.input({kind:'midi',type:event.on&&event.velocity>0?'note-on':'note-off',
   deviceId:event.source,channel:event.channel-1,note:event.note,velocity:event.velocity},true);
 }
 cc(event:MidiCC):void {
  if(this.admits(event)&&Number.isInteger(event.value)&&event.value>=0&&event.value<=127&&[120,121,123].includes(event.controller)){
   this.break();void this.activate();
  }
 }
 key(event:Pick<KeyboardEvent,'code'|'repeat'|'ctrlKey'|'altKey'|'metaKey'|'shiftKey'|'target'>,type:'key-down'|'key-up'):boolean {
  if(this.disposed||!/^(?:Digit|Numpad)[0-4]$/.test(event.code))return false;
  // Releases clear the raw control even after focus/field/modifier changes.
  if(type==='key-up')void this.owner.input({kind:'manual',type,code:event.code},!!this.connection());
  else {
   const target=event.target as HTMLElement|null;
   if(!this.focused()||event.ctrlKey||event.altKey||event.metaKey||event.shiftKey||target?.closest?.('input,select,textarea,[contenteditable=true],[data-options-popup]'))return false;
   void this.owner.input({kind:'manual',type,code:event.code,repeat:event.repeat},!!this.connection());
  }
  return true;
 }
}
