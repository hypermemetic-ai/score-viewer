/** Map a separately sampled native microsecond clock to a local millisecond clock. */
export class ClockOrigin {
 readonly offsetMs:number;
 readonly uncertaintyMs:number;
 constructor(localBeforeMs:number,nativeMicros:number,localAfterMs:number){
  if(![localBeforeMs,nativeMicros,localAfterMs].every(Number.isFinite)
   ||nativeMicros<0||localAfterMs<localBeforeMs)throw Error('Invalid clock sample');
  this.offsetMs=nativeMicros/1000-(localBeforeMs+localAfterMs)/2;
  this.uncertaintyMs=(localAfterMs-localBeforeMs)/2;
 }
 fromMidi(nativeMicros:number):number{
  if(!Number.isFinite(nativeMicros)||nativeMicros<0)throw Error('Invalid MIDI timestamp');
  return nativeMicros/1000-this.offsetMs;
 }
 toNative(localMs:number):number{return localMs+this.offsetMs;}
}
