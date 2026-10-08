import {readingActions,readingActionLabel,type ReadingAction} from './input';
export interface MidiCC {source:string;generation:number;channel:number;controller:number;value:number;timestamp_micros?:number;driver_micros?:number}
export interface MidiMapping {source:string;channel:number;controller:number;press:number;release:number}
export interface MidiStatus {source:string;generation:number;connected:boolean;message:string}
export function readMidiMapping(value:unknown):MidiMapping|undefined{
 if(value===undefined)return undefined;const m=value as MidiMapping;
 if(!m||typeof m.source!=='string'||!m.source||!Number.isInteger(m.channel)||m.channel<1||m.channel>16||!Number.isInteger(m.controller)||m.controller<0||m.controller>127||m.controller===64||!Number.isInteger(m.press)||!Number.isInteger(m.release)||m.release<0||m.press>127||m.release>=m.press)throw Error('Saved MIDI pedal mapping is unsupported; data retained');return {...m};
}
export const validCC=(e:MidiCC)=>Number.isInteger(e.channel)&&e.channel>=1&&e.channel<=16&&Number.isInteger(e.controller)&&e.controller>=0&&e.controller<=127&&Number.isInteger(e.value)&&e.value>=0&&e.value<=127;
export type MidiBindings=Partial<Record<ReadingAction,MidiMapping>>;
const sameControl=(a:MidiMapping,b:MidiMapping)=>a.source===b.source&&a.channel===b.channel&&a.controller===b.controller;
/** An explicit dictionary is authoritative, including empty: removing a route cannot revive legacy MIDI. */
export function readMidiBindings(value:unknown,legacy?:unknown):MidiBindings {
 if(value===undefined){const old=readMidiMapping(legacy);return old?{toggle:old}:{};}
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(key=>!readingActions.includes(key as ReadingAction)))throw Error('Saved pedal bindings are unsupported; data retained');
 const retained=readMidiMapping(legacy),result:MidiBindings={};for(const action of readingActions)if(Object.hasOwn(value,action)){
  const mapping=readMidiMapping((value as Record<string,unknown>)[action]);if(!mapping||mapping.controller>=120&&!(action==='toggle'&&retained&&JSON.stringify(mapping)===JSON.stringify(retained)))throw Error('Saved pedal binding is unsupported; sustain and reset controllers stay reserved');
  const conflict=readingActions.find(other=>result[other]&&sameControl(result[other]!,mapping));if(conflict)throw Error(`Pedal bindings conflict with ${readingActionLabel(conflict)}; data retained`);result[action]=mapping;
 }return result;
}
export function rebindMidi(bindings:MidiBindings,action:ReadingAction,mapping:MidiMapping|undefined,legacy?:unknown):MidiBindings {
 if(mapping&&mapping.controller>=120)throw Error('Reset controllers stay reserved. Choose another pedal.');
 const next={...bindings};if(mapping)next[action]=mapping;else delete next[action];return readMidiBindings(next,legacy);
}
export const midiBindingLabel=(mapping:MidiMapping|undefined)=>mapping?`${mapping.source} · ch ${mapping.channel} · CC${mapping.controller}${mapping.controller>=120?' · reserved; assign another pedal':''}`:'Not assigned';
/** A down pedal cleared during suspension must release before it can act again. */
export class MidiPedalController {
 mapping?:MidiMapping;held=false;private down=false;private blocked=false;
 configure(mapping?:MidiMapping){this.clear();this.mapping=readMidiMapping(mapping);this.down=false;this.blocked=false;}
 clear(){const changed=this.held;this.held=false;if(this.down)this.blocked=true;return changed;}
 receive(e:MidiCC,active:boolean,suspended:boolean):{pressed:boolean;changed:boolean}{
 const m=this.mapping;if(!validCC(e)||!m||e.source!==m.source||e.channel!==m.channel||e.controller!==m.controller)return {pressed:false,changed:false};
 const before=this.held;
 if(e.value<=m.release){this.down=false;this.blocked=false;this.held=false;return {pressed:false,changed:before!==this.held};}
 if(e.value<m.press)return {pressed:false,changed:false};
 const edge=!this.down;this.down=true;
 if(!active||suspended){this.held=false;this.blocked=true;return {pressed:false,changed:before!==this.held};}
 if(this.blocked||!edge)return {pressed:false,changed:false};this.held=true;return {pressed:true,changed:before!==this.held};
 }
}
/** Observe both edges, never capture sustain or guess a pedal's controller/channel. */
export class MidiLearn {
 candidate?:MidiMapping;message='Press an unused pedal, then release it. Sustain is excluded.';
 constructor(readonly source:string,readonly channel?:number,readonly generation?:number){}
 receive(e:MidiCC):MidiMapping|undefined{
 if(!validCC(e)||e.source!==this.source||(this.generation!==undefined&&e.generation!==this.generation)||(this.channel!==undefined&&e.channel!==this.channel))return;
 if(e.controller===64){this.message='Sustain CC64 is reserved for music. Press a different pedal.';return;}
 if(e.controller>=120){this.message='Reset controllers are reserved. Press a different pedal.';return;}
 if(!this.candidate&&e.value>=64){this.candidate={source:e.source,channel:e.channel,controller:e.controller,press:64,release:32};this.message=`Channel ${e.channel} · CC${e.controller}: now release the same pedal.`;return;}
 if(this.candidate&&e.channel===this.candidate.channel&&e.controller===this.candidate.controller&&e.value<=32){this.message=`Learned channel ${e.channel} · CC${e.controller}.`;return {...this.candidate};}
}
}

/** Each action owns its physical edge. Connection provenance is checked before any controller sees it. */
export class MidiActionController {
 private controllers=new Map<ReadingAction,MidiPedalController>();
 get fingersHeld(){return this.controllers.get('toggle')?.held??false;}
 configure(bindings:MidiBindings,legacy?:unknown){const admitted=readMidiBindings(bindings,legacy);for(const action of readingActions){const prior=this.controllers.get(action),mapping=admitted[action];if(!mapping||mapping.controller>=120){prior?.clear();this.controllers.delete(action);continue;}if(prior&&JSON.stringify(prior.mapping)===JSON.stringify(mapping))continue;const controller=new MidiPedalController();controller.configure(mapping);this.controllers.set(action,controller);}}
 clear(){let changed=false;for(const controller of this.controllers.values())changed=controller.clear()||changed;return changed;}
 receive(event:MidiCC,connection:{source:string;generation:number}|undefined,active:boolean,suspended:boolean):{action?:ReadingAction;changed:boolean}{
  if(!connection||connection.source!==event.source||connection.generation!==event.generation)return {changed:false};
  let action:ReadingAction|undefined,changed=false;for(const [owner,controller] of this.controllers){const result=controller.receive(event,active,suspended);if(result.pressed)action=owner;if(owner==='toggle')changed=result.changed||changed;}return {action,changed};
 }
}

/** Native callback time (monotonic) and original WinMM driver time are retained separately. */
export interface MidiNote {source:string;generation:number;channel:number;note:number;velocity:number;on:boolean;timestamp_micros:number;driver_micros:number;filtered?:boolean}
