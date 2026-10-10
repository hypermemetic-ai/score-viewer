export type ReadingAction='previous'|'next'|'toggle'|'edit'|'done'|'practiceSettings';export type Bindings=Record<ReadingAction,string>;
export type FingerBehavior='momentary'|'toggle';
export function fingerBehavior(value:unknown):FingerBehavior {if(value===undefined)return 'toggle';if(value==='momentary'||value==='toggle')return value;throw Error('Unsupported finger-display preference; saved data retained');}
export type FingerPresentation='annotations'|'replacement';
export function fingerPresentation(value:unknown):FingerPresentation {if(value===undefined)return 'annotations';if(value==='annotations'||value==='replacement')return value;throw Error('Unsupported finger-presentation preference; saved data retained');}
export function fingerPreferences(value:{fingerBehavior?:unknown;fingerPresentation?:unknown}={}){return {fingerBehavior:fingerBehavior(value.fingerBehavior),fingerPresentation:fingerPresentation(value.fingerPresentation)};}
export const defaultBindings=():Bindings=>({previous:'ArrowLeft',next:'ArrowRight',toggle:'KeyF',edit:'KeyE',done:'Enter',practiceSettings:'KeyO'});
export const readingActions:ReadingAction[]=['previous','next','toggle','edit','done','practiceSettings'];
export const readingActionLabel=(action:ReadingAction)=>({previous:'Previous page',next:'Next page',toggle:'Show fingerings',edit:'Edit fingers',done:'Done',practiceSettings:'Options'})[action];
export function practiceSettingsFallback(used:Iterable<string>):string {const assigned=new Set(used),key=[0,1,3,5,2,4,6,7,8,9,10,11,12,13,14,15].map(mask=>[mask&1?'Ctrl':'',mask&2?'Shift':'',mask&4?'Alt':'',mask&8?'Meta':'','KeyO'].filter(Boolean).join('+')).find(k=>!assigned.has(k));if(!key)throw Error('Options shortcut is unavailable; saved bindings retained');return key;}
/** Reading actions are shared across devices; Practice's physical-key commands stay separate. */
export function readingActionAllowed(action:ReadingAction,context:{modal:boolean;selecting:boolean;practice:boolean;practicePaused?:boolean;practiceDone?:boolean}):boolean {
 return !context.modal&&(!context.selecting||action==='toggle'||action==='practiceSettings')&&(action!=='done'||context.practice&&context.practiceDone!==false)&&(!context.practice||action==='toggle'||action==='edit'||action==='done'||action==='practiceSettings'||!!context.practicePaused);
}
/** Explicit, atomic restoration changes only page keys, never a conflicting finger/edit key. */
export function restorePageBindings<T extends Omit<Bindings,'practiceSettings'>&Partial<Pick<Bindings,'practiceSettings'>>>(bindings:T):T {
 const defaults=defaultBindings();for(const action of ['toggle','edit','done','practiceSettings'] as const)if(bindings[action]===defaults.previous||bindings[action]===defaults.next)throw Error(`An arrow key is assigned to ${readingActionLabel(action)}. Change that key first.`);
 return {...bindings,previous:defaults.previous,next:defaults.next};
}
export function readBindings(value:unknown):Bindings {if(value===undefined)return defaultBindings();const v=value as Record<string,unknown>;const old=['previous','next','toggle'];if(!v||old.some(k=>typeof v[k]!=='string'||!v[k]))throw Error('Saved key bindings are unsupported; data retained');const edit=v.edit===undefined?['KeyE','Ctrl+KeyE','Ctrl+Shift+KeyE'].find(c=>!Object.values(v).includes(c)):v.edit;if(typeof edit!=='string'||!edit)throw Error('Edit shortcut is unavailable; saved bindings retained');const done=v.done===undefined?['Enter','Ctrl+Enter','Ctrl+Shift+Enter'].find(c=>![v.previous,v.next,v.toggle,edit].includes(c)):v.done;if(typeof done!=='string'||!done)throw Error('Done shortcut is unavailable; saved bindings retained');const practiceSettings=v.practiceSettings===undefined?practiceSettingsFallback([v.previous,v.next,v.toggle,edit,done] as string[]):v.practiceSettings;if(typeof practiceSettings!=='string'||!practiceSettings)throw Error('Options shortcut is unsupported; saved bindings retained');const result={previous:v.previous,next:v.next,toggle:v.toggle,edit,done,practiceSettings} as Bindings;if(new Set(Object.values(result)).size!==readingActions.length)throw Error('Saved key bindings conflict; data retained');return result;}
export function inputCode(e:{code:string;key?:string}):string{return e.key&&/^[a-z]$/i.test(e.key)?'Key'+e.key.toUpperCase():e.key&&/^[0-9]$/.test(e.key)?'Digit'+e.key:e.code;}
/** UI confirmation shares Enter semantics while bindings and physical releases stay distinct. */
export function actionCode(e:{code:string;key?:string}):string{const code=inputCode(e);return code==='NumpadEnter'?'Enter':code;}
/** Plain digits in explicit finger selection; fields, capture and repeat are gated by the caller. */
export function directFingerKey(e:Pick<KeyboardEvent,'code'|'ctrlKey'|'altKey'|'shiftKey'|'metaKey'>&{key?:string}):number|undefined{if(e.ctrlKey||e.altKey||e.shiftKey||e.metaKey)return;const digit=e.key===undefined?e.code.replace(/^(Digit|Numpad)/,''):e.key;return /^[1-5]$/.test(digit)?Number(digit):undefined;}
export function chord(e:Pick<KeyboardEvent,'code'|'ctrlKey'|'altKey'|'shiftKey'|'metaKey'>&{key?:string},code=inputCode(e)):string{return [e.ctrlKey?'Ctrl':'',e.altKey?'Alt':'',e.shiftKey?'Shift':'',e.metaKey?'Meta':'',code].filter(Boolean).join('+');}
export function readableChord(c:string):string{return c.replace(/Key/g,'').replace(/Digit/g,'').replace(/PageUp/g,'Page Up').replace(/PageDown/g,'Page Down').replace(/ArrowLeft/g,'Left arrow').replace(/ArrowRight/g,'Right arrow').replace(/Arrow/g,'');}
const modifier=(code:string)=>/^Control/.test(code)?'Ctrl':/^Alt/.test(code)?'Alt':/^Shift/.test(code)?'Shift':/^Meta/.test(code)?'Meta':undefined;
export class InputController {held=new Set<string>();capture?:ReadingAction;bindings:Bindings;private fingerKeys=new Map<string,string[]>();private fingerPointers=new Set<number>();constructor(bindings=defaultBindings()){this.bindings=bindings;}
 get fingersHeld(){return this.fingerKeys.size>0||this.fingerPointers.size>0;}
 clear(){const changed=this.fingersHeld;this.held.clear();this.fingerKeys.clear();this.fingerPointers.clear();return changed;}
 holdControl(code:string){this.held.add(code);this.fingerKeys.set(code,[]);}
 holdPointer(id:number){this.fingerPointers.add(id);}
 releasePointer(id:number){const before=this.fingersHeld;this.fingerPointers.delete(id);return before!==this.fingersHeld;}
 down(e:Pick<KeyboardEvent,'code'|'ctrlKey'|'altKey'|'shiftKey'|'metaKey'|'repeat'>&{key?:string},active:boolean,suspended:boolean):{action?:ReadingAction;learned?:{action:ReadingAction;chord:string}}{
 if(e.repeat||this.held.has(inputCode(e)))return {};this.held.add(inputCode(e));if(['ControlLeft','ControlRight','ShiftLeft','ShiftRight','AltLeft','AltRight','MetaLeft','MetaRight'].includes(e.code))return {};
 const key=chord(e);if(this.capture){if(['Escape','Tab'].includes(e.code)||actionCode(e)==='Enter'&&this.capture!=='done')return {};const action=this.capture;this.capture=undefined;this.clear();return {learned:{action,chord:key}};}
 if(!active||suspended)return {};const assignments=Object.entries(this.bindings) as [ReadingAction,string][],action=assignments.find(([,c])=>c===key)?.[0]??assignments.find(([,c])=>c===chord(e,actionCode(e)))?.[0];if(action==='toggle')this.fingerKeys.set(inputCode(e),key.split('+').slice(0,-1));return {action:action??(key==='ArrowLeft'?'previous':key==='ArrowRight'?'next':undefined)};
 }
 up(e:Pick<KeyboardEvent,'code'>&{key?:string}){const before=this.fingersHeld,code=inputCode(e);this.held.delete(code);this.fingerKeys.delete(code);const released=modifier(e.code);if(released)for(const [key,required] of this.fingerKeys)if(required.includes(released))this.fingerKeys.delete(key);return before!==this.fingersHeld;}
 rebind(a:ReadingAction,key:string){if(Object.entries(this.bindings).some(([other,c])=>other!==a&&c===key))throw Error('That shortcut is already assigned');this.bindings={...this.bindings,[a]:key};this.clear();}
}
