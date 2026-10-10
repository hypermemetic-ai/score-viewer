import {actionCode,chord,inputCode,readBindings,readableChord,readingActions,readingActionLabel,readingActionAllowed,practiceSettingsFallback,type ReadingAction} from './input';
import {readMidiBindings,readMidiMapping,validCC,type MidiCC,type MidiMapping} from './midi';
export type ControlBinding={kind:'key';key:string}|({kind:'midi'}&MidiMapping);
export type ControlSlots=[ControlBinding|null,ControlBinding|null];
export const practiceModeActions=['practiceReading','practiceTimed','practiceFreeView'] as const;
export type PracticeModeAction=typeof practiceModeActions[number];
export type ControlAction=ReadingAction|PracticeModeAction;
export const controlActions:readonly ControlAction[]=[...readingActions,...practiceModeActions];
export const isPracticeModeAction=(action:ControlAction):action is PracticeModeAction=>practiceModeActions.includes(action as PracticeModeAction);
export const controlActionLabel=(action:ControlAction)=>isPracticeModeAction(action)?{practiceReading:'Reading',practiceTimed:'Timed',practiceFreeView:'Free view'}[action]:readingActionLabel(action);
/** Missing mode slots remain missing on disk. Their effective defaults are
 * resolved only after local navigation has taken its inherited/saved form. */
export interface ControlBindings {version:1;actions:Record<ReadingAction,ControlSlots>&Partial<Record<PracticeModeAction,ControlSlots>>}
export function controlActionAllowed(action:ControlAction,context:Parameters<typeof readingActionAllowed>[1]&{practiceModes?:boolean;practiceFreeView?:boolean}){return isPracticeModeAction(action)?!context.modal&&!context.selecting&&context.practice&&(action==='practiceFreeView'?context.practiceFreeView===true||context.practiceModes===true:context.practiceModes===true):readingActionAllowed(action,context);}
export type KeyInput=Pick<KeyboardEvent,'code'|'ctrlKey'|'altKey'|'shiftKey'|'metaKey'|'repeat'>&{key?:string};
export const controlIdentity=(binding:ControlBinding)=>binding.kind==='key'?`key:${binding.key}`:JSON.stringify(['midi',binding.source,binding.channel,binding.controller]);
export const controlLabel=(binding:ControlBinding|null)=>!binding?'Unbound':binding.kind==='key'?readableChord(binding.key).replaceAll('Left arrow','←').replaceAll('Right arrow','→').replaceAll('Up arrow','↑').replaceAll('Down arrow','↓'):`Pedal · CC${binding.controller}`;
export const controlAccessibleLabel=(binding:ControlBinding|null)=>binding?.kind==='key'?readableChord(binding.key):controlLabel(binding);
export const controlDetail=(binding:ControlBinding|null)=>binding?.kind==='midi'?`${binding.source} · ch ${binding.channel}`:'';
/** The new dictionary is authoritative, including empty slots; retained fields cannot revive a route. */
export function readControlBindings(value:unknown,legacy:{bindings:unknown;midi?:unknown;midiBindings?:unknown}):ControlBindings {
 if(value===undefined){const keys=readBindings(legacy.bindings),pedals=readMidiBindings(legacy.midiBindings,legacy.midi);return {version:1,actions:Object.fromEntries(readingActions.map(action=>[action,[{kind:'key',key:keys[action]},pedals[action]&&pedals[action]!.controller<120?{kind:'midi',source:pedals[action]!.source,channel:pedals[action]!.channel,controller:pedals[action]!.controller,press:pedals[action]!.press,release:pedals[action]!.release}:null]])) as Record<ReadingAction,ControlSlots>};}
 const raw=value as ControlBindings,oldActions=readingActions.filter(a=>a!=='practiceSettings');if(!raw||raw.version!==1||Object.keys(raw).some(k=>!['version','actions'].includes(k))||!raw.actions||typeof raw.actions!=='object'||Object.keys(raw.actions).some(k=>!controlActions.includes(k as ControlAction))||oldActions.some(a=>!Object.hasOwn(raw.actions,a)))throw Error('Saved controls version differs; data retained.');
 const identities=new Set<string>(),actions={} as Record<ReadingAction,ControlSlots>;
 for(const action of controlActions){if(!Object.hasOwn(raw.actions,action))continue;const slots=raw.actions[action];if(!Array.isArray(slots)||slots.length!==2)throw Error('Saved controls require two slots; data retained.');(actions as ControlBindings['actions'])[action]=slots.map(b=>{if(b===null)return null;if(!b||typeof b!=='object')throw Error('Saved control is unsupported; data retained.');let binding:ControlBinding;if(b.kind==='key'){if(typeof b.key!=='string'||!b.key.trim()||Object.keys(b).some(k=>!['kind','key'].includes(k)))throw Error('Saved key is unsupported; data retained.');binding={kind:'key',key:b.key};}else if(b.kind==='midi'){if(Object.keys(b).some(k=>!['kind','source','channel','controller','press','release'].includes(k)))throw Error('Saved pedal is unsupported; data retained.');const mapping=readMidiMapping(b)!;if(mapping.controller>=120)throw Error('Reset controllers stay reserved.');binding={kind:'midi',...mapping};}else throw Error('Saved control type differs; data retained.');const id=controlIdentity(binding);if(identities.has(id))throw Error('Saved controls conflict; data retained.');identities.add(id);return binding;}) as ControlSlots;}
 if(!Object.hasOwn(raw.actions,'practiceSettings'))actions.practiceSettings=[{kind:'key',key:practiceSettingsFallback([...identities].filter(id=>id.startsWith('key:')).map(id=>id.slice(4)))},null];
 return {version:1,actions};
}
export function replaceControl(bindings:ControlBindings,action:ControlAction,slot:0|1,binding:ControlBinding|null):ControlBindings {
 const next=structuredClone(bindings);next.actions[action]??=[null,null];next.actions[action]![slot]=binding;
 try{return readControlBindings(next,{bindings:{}});}catch(error){if(binding){const owner=controlActions.find(a=>bindings.actions[a]?.some((b,s)=>b&&controlIdentity(b)===controlIdentity(binding)&&!(a===action&&s===slot)));if(owner)throw Error(`Already assigned to ${controlActionLabel(owner)}.`);}throw error;}
}
export function restoreControlPages(bindings:ControlBindings):ControlBindings {
 const next=structuredClone(bindings);next.actions.previous[0]={kind:'key',key:'ArrowLeft'};next.actions.next[0]={kind:'key',key:'ArrowRight'};return readControlBindings(next,{bindings:{}});
}
export type ControlChange={kind:'assign';action:ControlAction;slot:0|1;binding:ControlBinding|null}|{kind:'restore-pages'};
/** Apply intent against the latest admitted state inside the persistence queue. */
export function changeControls(bindings:ControlBindings,change:ControlChange){return change.kind==='restore-pages'?restoreControlPages(bindings):replaceControl(bindings,change.action,change.slot,change.binding);}

export const actionControlLabel=(bindings:ControlBindings,action:ControlAction)=>(bindings.actions[action]??[]).filter((b):b is ControlBinding=>!!b).map(controlLabel).join(' / ');
export function practiceControlBindings(bindings:ControlBindings,pianoModes=true):ControlBindings {
 const next=structuredClone(bindings),used=new Set(Object.values(next.actions).flatMap(slots=>slots.filter((b):b is ControlBinding=>!!b).map(controlIdentity)));
 for(const [action,key]of [['practiceReading','KeyR'],['practiceTimed','KeyT'],['practiceFreeView','KeyV']] as const){if(!pianoModes&&action!=='practiceFreeView'||Object.hasOwn(next.actions,action))continue;next.actions[action]=[used.has(`key:${key}`)?null:{kind:'key',key},null];}
 return readControlBindings(next,{bindings:{}});
}
/** An explicit saved V assignment owns the key even when its action is unavailable. */
export const freeViewControlLabel=(bindings:ControlBindings)=>Object.values(bindings.actions).some(slots=>slots.some(b=>b?.kind==='key'&&b.key==='KeyV'))?'':'V';
export interface ControlMatch {action:ControlAction;slot:0|1;binding:ControlBinding}
interface Physical {binding:ControlBinding;down:boolean;blocked:boolean;match?:ControlMatch;code?:string;modifiers?:string[]}
export interface ControlResult {action?:ControlAction;match?:ControlMatch;received?:ControlBinding;changed:boolean}
/** One edge resolver for reading and Test. Suspension quarantines held inputs until actual release. */
export class ControlResolver {
 private physical=new Map<string,Physical>();private keys=new Set<string>();
 constructor(public bindings:ControlBindings){}
 get heldMatches(){return [...this.physical.values()].filter(p=>p.down&&!p.blocked&&p.match).map(p=>p.match!);}
 get fingersHeld(){return this.heldMatches.some(m=>m.action==='toggle');}
 get heldUnbound(){return [...this.physical.values()].filter(p=>p.down&&!p.blocked&&!p.match).map(p=>p.binding);}
 match(binding:ControlBinding){for(const action of controlActions)for(const slot of [0,1] as const){const b=this.bindings.actions[action]?.[slot];if(b&&controlIdentity(b)===controlIdentity(binding))return {action,slot,binding:b};}return;}
 matchKey(e:KeyInput){return this.match({kind:'key',key:chord(e)})??(actionCode(e)!==inputCode(e)?this.match({kind:'key',key:chord(e,actionCode(e))}):undefined);}
 configure(bindings:ControlBindings){this.clear();this.bindings=bindings;}
 clear(){const before=this.heldMatches.length;for(const p of this.physical.values())if(p.down)p.blocked=true;return !!before;}
 private press(id:string,binding:ControlBinding,enabled:boolean,extra:Partial<Physical>={}):ControlResult {
 const old=this.physical.get(id);if(old?.down)return {changed:false};const match=this.match(binding);this.physical.set(id,{binding,down:true,blocked:!enabled,match,...extra});return {action:enabled?match?.action:undefined,match:enabled?match:undefined,received:enabled?binding:undefined,changed:enabled};
 }
 keyDown(e:KeyInput,enabled:boolean):ControlResult {
 const code=inputCode(e);if(e.repeat||this.keys.has(code))return {changed:false};this.keys.add(code);if(/^(Control|Alt|Shift|Meta)/.test(e.code))return {changed:false};const matched=this.matchKey(e),binding=matched?.binding.kind==='key'?matched.binding:{kind:'key' as const,key:chord(e)};return this.press(`key:${code}`,binding,enabled,{code,modifiers:binding.key.split('+').slice(0,-1)});
 }
 keyUp(e:Pick<KeyboardEvent,'code'>&{key?:string}):boolean {
 const code=inputCode(e);this.keys.delete(code);const modifier=/^Control/.test(e.code)?'Ctrl':/^Alt/.test(e.code)?'Alt':/^Shift/.test(e.code)?'Shift':/^Meta/.test(e.code)?'Meta':undefined;let changed=false;
 for(const [id,p] of this.physical)if(p.code===code){changed=(!p.blocked&&p.down)||changed;this.physical.delete(id);}else if(modifier&&p.modifiers?.includes(modifier)){changed=(!p.blocked&&p.down)||changed;p.blocked=true;}
 return changed;
 }
 receive(e:MidiCC,connection:{source:string;generation:number}|undefined,enabled:boolean):ControlResult {
 if(!connection||e.source!==connection.source||e.generation!==connection.generation||!validCC(e)||e.controller===64||e.controller>=120)return {changed:false};
 const generic:ControlBinding={kind:'midi',source:e.source,channel:e.channel,controller:e.controller,press:64,release:32},match=this.match(generic),binding=match?.binding.kind==='midi'?match.binding:generic,id=controlIdentity(binding),old=this.physical.get(id);
 if(e.value<=binding.release){const changed=!!old?.down&&!old.blocked;this.physical.delete(id);return {changed};}
 if(e.value<binding.press)return {changed:false};return this.press(id,binding,enabled);
 }
}
