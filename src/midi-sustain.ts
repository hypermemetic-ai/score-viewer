import {validCC,type MidiCC,type MidiNote} from './midi';

export type MidiStream=Pick<MidiNote,'source'|'generation'|'channel'>;
const defaultStream:MidiStream={source:'assessment',generation:0,channel:1};
const key=(s:MidiStream)=>JSON.stringify([s.source,s.generation,s.channel]);
const validStream=(s:MidiStream)=>typeof s.source==='string'&&s.source.length>0&&Number.isSafeInteger(s.generation)&&s.generation>=0&&Number.isInteger(s.channel)&&s.channel>=1&&s.channel<=16;
export const isMusicalSustain=(e:MidiCC)=>validStream(e)&&validCC(e)&&e.controller===64;
/** Older hosts have no CC clock fields; never map a malformed timestamp. */
export function musicalControllerTime(e:MidiCC,clock:{now():number;fromMidi(micros:number):number}){
 return Number.isFinite(e.timestamp_micros)&&e.timestamp_micros!>=0?clock.fromMidi(e.timestamp_micros!):clock.now();
}

/** Observed positions only. No score marking can create a pedal event. */
export class ObservedMidiSustain {
 private down=new Map<string,MidiCC>();
 receive(e:MidiCC,connection?:Pick<MidiStream,'source'|'generation'>){if(!isMusicalSustain(e)||connection&&(e.source!==connection.source||e.generation!==connection.generation))return false;if(e.value>=64)this.down.set(key(e),{...e});else this.down.delete(key(e));return true;}
 has(s:MidiStream){return this.down.has(key(s));}
 snapshot():MidiCC[]{return [...this.down.values()].map(e=>({...e}));}
 clear(){this.down.clear();}
}

/** Assessment sound has attack identity; physical key contacts remain separate. */
export class MidiSoundingNotes {
 private positions=new ObservedMidiSustain();
 private notes=new Map<string,{midi:number;stream:MidiStream;pressed:boolean}>();
 reset(positions:readonly MidiCC[]=[]){this.notes.clear();this.positions.clear();for(const e of positions)this.positions.receive(e);}
 press(id:string,midi:number,stream:MidiStream=defaultStream){if(validStream(stream))this.notes.set(id,{midi,stream:{source:stream.source,generation:stream.generation,channel:stream.channel},pressed:true});}
 has(id:string){return this.notes.has(id);}
 get size(){return this.notes.size;}
 release(midi:number,stream:MidiStream=defaultStream):string[]{const stopped:string[]=[];for(const[id,n]of this.notes){if(n.midi!==midi||key(n.stream)!==key(stream)||!n.pressed)continue;n.pressed=false;if(!this.positions.has(n.stream)){this.notes.delete(id);stopped.push(id);}}return stopped;}
 pedal(e:MidiCC):string[]{if(!this.positions.receive(e)||e.value>=64)return [];const stopped:string[]=[];for(const[id,n]of this.notes)if(!n.pressed&&key(n.stream)===key(e)){this.notes.delete(id);stopped.push(id);}return stopped;}
 expire(ended:(id:string)=>boolean){for(const id of this.notes.keys())if(ended(id))this.notes.delete(id);}
}

export interface PracticeMidiSetup {sustain?:readonly MidiCC[];contacts?:ReadonlyMap<number,MidiStream>}
