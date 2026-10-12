import type {CalibrationInputEvent} from '@hypermemetic-ai/fingering-calculator';
/** Physical MIDI edges survive a page change, so an already held rating key cannot become a new command. */
export class CalibrationPageInput {
 private held=new Set<string>();
 admit(event:CalibrationInputEvent,trial:boolean):CalibrationInputEvent|null {
  if(event.kind==='manual')return trial||event.type==='key-up'?event:null;
  const key=`${event.deviceId}/${event.channel}/${event.note}`;
  if(event.type==='note-off'||event.velocity===0){this.held.delete(key);return {...event,type:'note-off'};}
  if(this.held.has(key))return null;
  this.held.add(key);return trial?event:null;
 }
 clear(){this.held.clear();}
}
