/** Passive Standard MIDI File admission. No notation inference or playback. */
export const MAX_REFERENCE_MIDI_BYTES=1_048_576;
export function validateReferenceMidi(bytes:Uint8Array):void {
 const fail=(message:string):never=>{throw Error('Reference MIDI: '+message);};
 if(bytes.length>MAX_REFERENCE_MIDI_BYTES)fail('exceeds 1 MiB');
 let p=0;
 const take=(n:number,end=bytes.length)=>{if(p+n>end)fail('truncated framing/event');const s=bytes.subarray(p,p+n);p+=n;return s;};
 const u16=()=>{const b=take(2);return b[0]*256+b[1];};
 const u32=()=>{const b=take(4);return b[0]*16777216+b[1]*65536+b[2]*256+b[3];};
 const tag=()=>String.fromCharCode(...take(4));
 const vlq=(end:number)=>{let n=0;for(let i=0;i<4;i++){const b=take(1,end)[0];n=n*128+(b&127);if(!(b&128))return n;}return fail('invalid variable-length quantity');};
 if(tag()!=='MThd'||u32()!==6)fail('unsupported header');
 const format=u16(),tracks=u16(),division=u16();
 if(format>2||!tracks||format===0&&tracks!==1||!division||division&0x8000&&(![232,231,227,226].includes(division>>8)||!(division&255)))fail('invalid format/tracks/division');
 for(let track=0;track<tracks;track++){
  if(tag()!=='MTrk')fail('missing track');const length=u32(),end=p+length;if(end>bytes.length)fail('truncated track');let running=0,ended=false;
  while(p<end){vlq(end);let status=take(1,end)[0];if(status<128){if(!running)fail('missing running status');p--;status=running;}
   if(status>=0x80&&status<=0xef){running=status;const n=status>>4===0xc||status>>4===0xd?1:2;if([...take(n,end)].some(b=>b>=128))fail('invalid channel data');}
   else if(status===0xff){running=0;const type=take(1,end)[0];if(type>=128)fail('invalid meta type');const n=vlq(end),fixed:Record<number,number>={0:2,0x20:1,0x21:1,0x2f:0,0x51:3,0x54:5,0x58:4,0x59:2};if(fixed[type]!==undefined&&n!==fixed[type])fail('invalid meta length');take(n,end);if(type===0x2f){ended=true;if(p!==end)fail('events after end-of-track');}}
   else if(status===0xf0||status===0xf7){running=0;take(vlq(end),end);}
   else fail('unsupported system event');
  }
  if(!ended)fail('missing end-of-track');
 }
 if(p!==bytes.length)fail('trailing data');
}
