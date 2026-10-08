import {chord,inputCode,readableChord,readingActions,readingActionLabel,defaultBindings,type Bindings,type ReadingAction} from './input';
import {MidiLearn,MidiPedalController,midiBindingLabel,type MidiBindings,type MidiMapping,type MidiCC} from './midi';

export interface ReadingBindingsApi {
 keys():Bindings;pedals():MidiBindings;connection():{source:string;generation:number}|undefined;channel():number|undefined;
 saveKey(action:ReadingAction,key:string):Promise<void>;savePedal(action:ReadingAction,mapping:MidiMapping|undefined):Promise<void>;restorePages():Promise<void>;suspend():void;
}
type KeyEvent=Pick<KeyboardEvent,'code'|'ctrlKey'|'altKey'|'shiftKey'|'metaKey'|'repeat'>&{key?:string};
type Operation={action:ReadingAction;kind:'key'|'pedal'|'test'|'saving';connection?:{source:string;generation:number};learn?:MidiLearn;pedal?:MidiPedalController;testKey?:{code:string;modifiers:string[]}};
/** Explicit action capture/test owns its connection and lifecycle; it never executes a reader action. */
export class ReadingBindingSession {
 private operation?:Operation;private generation=0;private disposed=false;private keysDown=new Set<string>();
 constructor(private api:ReadingBindingsApi,private report:(action:ReadingAction,message:string)=>void,private changed:()=>void=()=>{}){}
 get active(){return !!this.operation;}
 get action(){return this.operation?.action;}
 get saving(){return this.operation?.kind==='saving';}
 begin(action:ReadingAction,kind:'key'|'pedal'|'test'){
  if(this.saving)return;this.cancel();this.api.suspend();const connection=this.api.connection();
  if(kind==='pedal'&&!connection){this.report(action,'Connect a MIDI input first.');return;}
  const operation:Operation={action,kind,connection};
  if(kind==='pedal')operation.learn=new MidiLearn(connection!.source,this.api.channel(),connection!.generation);
  if(kind==='test'){operation.pedal=new MidiPedalController();operation.pedal.configure(this.api.pedals()[action]);}
  this.operation=operation;this.keysDown.clear();this.report(action,kind==='key'?`Listening for ${readingActionLabel(action)}… Press a key or USB key pedal.`:kind==='pedal'?`Listening for ${readingActionLabel(action)}… Press and release an unused MIDI pedal. Sustain is reserved.`:`Testing ${readingActionLabel(action)}… Press and release its key or assigned pedal.`);
 }
 cancel(message='Cancelled.') {const old=this.operation;this.operation=undefined;this.generation++;this.keysDown.clear();old?.pedal?.clear();if(old&&!this.disposed)this.report(old.action,old.kind==='saving'?'Saving requested change…':message);}
 connectionChanged(){if(this.operation)this.cancel('Input connection changed. Start again.');}
 keyDown(event:KeyEvent):boolean {
  const operation=this.operation;if(!operation)return false;
  if(event.code==='Escape'){this.cancel();return true;}if(operation.kind==='saving')return true;
  if(event.code==='Tab'){this.cancel();return false;}
  const code=inputCode(event);if(event.repeat||this.keysDown.has(code))return true;this.keysDown.add(code);
  if(/^(Control|Alt|Shift|Meta)/.test(event.code))return true;
  if(operation.kind==='key'){if(event.code==='Enter'&&operation.action!=='done'){this.report(operation.action,'Choose another key; Enter confirms controls.');return true;}const key=chord(event);void this.save(operation,()=>this.api.saveKey(operation.action,key),`Key saved · ${readableChord(key)}. Ready to test.`);return true;}
  if(operation.kind==='test'&&chord(event)===this.api.keys()[operation.action]){operation.testKey={code,modifiers:chord(event).split('+').slice(0,-1)};this.report(operation.action,`Received key · pressed · ${readableChord(chord(event))}`);}
  return true;
 }
 keyUp(event:Pick<KeyboardEvent,'code'>&{key?:string}){
  const code=inputCode(event);this.keysDown.delete(code);const operation=this.operation;if(!operation?.testKey)return;
  const modifier=/^Control/.test(event.code)?'Ctrl':/^Alt/.test(event.code)?'Alt':/^Shift/.test(event.code)?'Shift':/^Meta/.test(event.code)?'Meta':undefined;
  if(operation.testKey.code===code||modifier&&operation.testKey.modifiers.includes(modifier)){operation.testKey=undefined;this.report(operation.action,'Received key · released.');}
 }
 receive(event:MidiCC):boolean {
  const operation=this.operation;if(!operation)return false;const connection=this.api.connection();
  if(operation.connection&&(operation.connection.source!==connection?.source||operation.connection.generation!==connection?.generation)){this.connectionChanged();return false;}
  if(!connection||event.source!==connection.source||event.generation!==connection.generation)return false;
  if(operation.kind==='pedal'){const mapping=operation.learn!.receive(event);this.report(operation.action,operation.learn!.message);if(mapping)void this.save(operation,()=>this.api.savePedal(operation.action,mapping),`Pedal saved · ${midiBindingLabel(mapping)}. Ready to test.`);return true;}
  if(operation.kind==='test'){const result=operation.pedal!.receive(event,true,false);if(result.pressed)this.report(operation.action,'Received pedal · pressed.');else if(result.changed)this.report(operation.action,'Received pedal · released.');return true;}
  return false;
 }
 async remove(action:ReadingAction){if(this.saving)return;this.cancel();this.api.suspend();const operation:Operation={action,kind:'saving'};this.operation=operation;await this.save(operation,()=>this.api.savePedal(action,undefined),'Pedal removed. Key unchanged.');}
 async restore(){if(this.saving)return;this.cancel();this.api.suspend();const operation:Operation={action:'previous',kind:'saving'};this.operation=operation;await this.save(operation,()=>this.api.restorePages(),'Page keys restored · Left / Right. Other choices unchanged.');}
 private async save(operation:Operation,persist:()=>Promise<void>,message:string){operation.kind='saving';const generation=++this.generation;try{await persist();if(this.disposed)return;this.changed();if(generation!==this.generation||this.operation!==operation){if(this.operation?.action!==operation.action)this.report(operation.action,message);return;}this.operation=undefined;this.report(operation.action,message);}catch(error){if(this.disposed)return;if(generation!==this.generation||this.operation!==operation){if(this.operation?.action!==operation.action)this.report(operation.action,`Not saved: ${(error as Error).message}`);return;}this.operation=undefined;this.report(operation.action,`Not saved: ${(error as Error).message}`);}}
 dispose(){this.disposed=true;this.cancel();}
}

const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export class ReadingBindingsPanel {
 readonly session:ReadingBindingSession;
 constructor(private root:HTMLElement,private api:ReadingBindingsApi){this.session=new ReadingBindingSession(api,(action,message)=>{const status=this.root.querySelector(`[data-binding-status="${action}"]`);if(status)status.textContent=message;},()=>this.paint());}
 mount(){this.root.innerHTML=`<h3>Keys and pedals</h3>${readingActions.map(action=>`<section class="reading-binding" data-binding-row="${action}"><h4>${readingActionLabel(action)}</h4><div class="binding-actions"><button data-learn-key="${action}" aria-label="Change key for ${readingActionLabel(action)}"></button><button data-learn-pedal="${action}">Assign MIDI pedal</button><button data-test-binding="${action}">Test</button><button data-remove-pedal="${action}">Remove pedal</button></div><p data-pedal-label="${action}" class="status"></p><p data-binding-status="${action}" class="status" role="status"></p></section>`).join('')}<p data-page-defaults class="help"></p><button data-restore-page-keys>Use Left / Right for pages</button><p class="help">USB pedals that send keys use the key button. MIDI pedals use Assign MIDI pedal. Sustain stays available for music.</p>`;
  for(const action of readingActions){for(const [selector,kind] of [['learn-key','key'],['learn-pedal','pedal'],['test-binding','test']] as const){const button=this.root.querySelector<HTMLButtonElement>(`[data-${selector}="${action}"]`)!;button.onclick=()=>{button.focus();this.session.begin(action,kind);};}this.root.querySelector<HTMLButtonElement>(`[data-remove-pedal="${action}"]`)!.onclick=()=>{void this.session.remove(action);};}
  this.root.querySelector<HTMLButtonElement>('[data-restore-page-keys]')!.onclick=()=>{void this.session.restore();};this.paint();
 }
 paint(){const keys=this.api.keys(),pedals=this.api.pedals(),defaults=defaultBindings();for(const action of readingActions){this.root.querySelector(`[data-learn-key="${action}"]`)!.textContent=`Key · ${readableChord(keys[action])}`;this.root.querySelector(`[data-pedal-label="${action}"]`)!.textContent=`MIDI pedal · ${midiBindingLabel(pedals[action])}`;this.root.querySelector<HTMLButtonElement>(`[data-remove-pedal="${action}"]`)!.disabled=!pedals[action];this.root.querySelector<HTMLButtonElement>(`[data-learn-pedal="${action}"]`)!.disabled=!this.api.connection();}
  const ordinary=keys.previous===defaults.previous&&keys.next===defaults.next;this.root.querySelector('[data-page-defaults]')!.textContent=ordinary?'Page keys · default Left / Right.':`Saved page keys · ${readableChord(keys.previous)} / ${readableChord(keys.next)}. Defaults are Left / Right.`;this.root.querySelector<HTMLButtonElement>('[data-restore-page-keys]')!.disabled=ordinary;
 }
 dispose(){this.session.dispose();}
}
