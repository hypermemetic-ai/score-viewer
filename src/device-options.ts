import type {AudioOutputs,MidiSources} from './host';
import {validCC,type MidiCC,type MidiNote,type MidiMapping} from './midi';

const escape=(text:string)=>text.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export interface MidiConnection {source:string;generation:number}
export interface MidiOptionsApi {
 sources():Promise<MidiSources>;connection():MidiConnection|undefined;
 connect(source:string):Promise<void>;disconnect():Promise<void>;
 mapping():MidiMapping|undefined;cancelKeys():void;
}
/** Observations are scoped to one connected source generation, never a guessed channel. */
export class MidiSetupState {
 listening=false;channel?:number;activity='No notes or pedals received yet.';channelStatus='Ready to listen.';
 listen(){this.listening=true;this.channelStatus='Listening… Play a key or move a pedal.';}
 cancel(){this.listening=false;this.channelStatus=this.channel?`Channel ${this.channel} selected.`:'Ready to listen.';}
 receive(event:MidiCC|MidiNote,connection:MidiConnection|undefined):boolean {
  if(!connection||connection.source!==event.source||connection.generation!==event.generation||!Number.isInteger(event.channel)||event.channel<1||event.channel>16)return false;
  const cc='controller' in event;if(cc&&!validCC(event))return false;
  if(!cc&&(!Number.isInteger(event.note)||event.note<0||event.note>127||!Number.isInteger(event.velocity)||event.velocity<0||event.velocity>127||event.filtered))return false;
  this.activity=cc?`Received · channel ${event.channel} · CC${event.controller} = ${event.value}`:`Received · channel ${event.channel} · note ${event.note} ${event.on?'on':'off'}`;
  if(this.listening&&(cc?event.controller<120:event.on&&event.velocity>0)){this.channel=event.channel;this.listening=false;this.channelStatus=`Received channel ${event.channel} · ready.`;}return true;
 }
}

export class MidiOptionsPanel {
 readonly state=new MidiSetupState();private disposed=false;private operation=0;
 constructor(private root:HTMLElement,private api:MidiOptionsApi){}
 async mount(){try{const ports=await this.api.sources();if(this.disposed||!this.root.isConnected)return;
 const connection=this.api.connection(),mapping=this.api.mapping();this.state.channel=mapping?.source===(connection?.source??mapping?.source)?mapping?.channel:undefined;
 this.root.innerHTML=ports.supported?`<div class="option-setting" data-options-row><label for="options-midi-source">MIDI input</label><div class="option-fields"><select id="options-midi-source" data-midi-source aria-label="MIDI input"><option value="">Choose input</option>${ports.sources.map(source=>`<option value="${escape(source)}" ${source===(connection?.source??mapping?.source)?'selected':''}>${escape(source)}</option>`).join('')}</select><button data-midi-connect class="device-action">Connect</button></div></div><p data-midi-error class="control-error" role="status"></p><div class="option-setting" data-options-row><label for="options-midi-channel">MIDI channel</label><div class="option-fields"><select id="options-midi-channel" data-midi-channel aria-label="Pedal learning channel"><option value="">Any channel</option>${Array.from({length:16},(_,i)=>`<option value="${i+1}" ${this.state.channel===i+1?'selected':''}>${i+1}</option>`).join('')}</select><button data-midi-channel-listen>Detect channel</button></div></div><p data-channel-message class="control-error" role="status"></p>`:`<p class="control-error">${escape(ports.message||'MIDI input is unavailable here.')}</p>`;
 if(!ports.supported)return;this.paintConnection();
 this.field<HTMLSelectElement>('[data-midi-source]')!.onchange=()=>{this.api.cancelKeys();this.state.channel=undefined;this.cancelListening();this.paintConnection();this.paintObservation();};
 this.field<HTMLSelectElement>('[data-midi-channel]')!.onchange=()=>{this.api.cancelKeys();this.cancelListening();this.state.channel=Number(this.field<HTMLSelectElement>('[data-midi-channel]')!.value)||undefined;};
 this.field<HTMLButtonElement>('[data-midi-connect]')!.onclick=()=>{void (this.selectedConnection()?this.disconnect():this.connect());};
 this.field<HTMLButtonElement>('[data-midi-channel-listen]')!.onclick=()=>{if(!this.selectedConnection())return;this.api.cancelKeys();this.state.listen();this.paintObservation();};
 }catch(error){if(!this.disposed)this.root.textContent=(error as Error).message;}}
 private field<T extends HTMLElement>(selector:string){return this.root.querySelector<T>(selector);}
 private selectedConnection(){const connection=this.api.connection();return connection?.source===this.field<HTMLSelectElement>('[data-midi-source]')?.value?connection:undefined;}
 get connection(){return this.selectedConnection();}
 private connectionStatus(text:string){const status=this.field('[data-midi-error]');if(status)status.textContent=text;}
 private paintConnection(){const selected=this.selectedConnection(),source=this.field<HTMLSelectElement>('[data-midi-source]');if(source){for(const option of source.options)option.textContent=(option.value&&option.value===selected?.source?'✓ ':'')+(option.value||'Choose input');source.setAttribute('aria-label',selected?'MIDI input, connected':'MIDI input');}const button=this.field<HTMLButtonElement>('[data-midi-connect]');if(button)button.textContent=selected?'Disconnect':'Connect';const listen=this.field<HTMLButtonElement>('[data-midi-channel-listen]');if(listen)listen.disabled=!selected;}
 private paintObservation(){const status=this.field('[data-channel-message]');if(status)status.textContent=this.state.listening?'Play a note or press a MIDI pedal':'';const selected=this.field<HTMLSelectElement>('[data-midi-channel]');if(selected){selected.value=this.state.channel?String(this.state.channel):'';selected.dispatchEvent(new Event('options-selection'));}}
 private async connect(){const source=this.field<HTMLSelectElement>('[data-midi-source]')!.value;if(!source){this.connectionStatus('Choose an input first.');return;}const operation=++this.operation;this.cancelListening();this.api.cancelKeys();this.connectionStatus('Connecting…');const button=this.field<HTMLButtonElement>('[data-midi-connect]')!,field=this.field<HTMLSelectElement>('[data-midi-source]')!;button.disabled=true;field.disabled=true;try{await this.api.connect(source);if(this.disposed||operation!==this.operation)return;this.connectionStatus('');this.paintConnection();}catch(error){if(!this.disposed&&operation===this.operation)this.connectionStatus((error as Error).message);}finally{if(!this.disposed&&operation===this.operation){button.disabled=false;field.disabled=false;}}}
 private async disconnect(){const operation=++this.operation;this.cancelListening();this.api.cancelKeys();try{await this.api.disconnect();if(!this.disposed&&operation===this.operation){this.connectionStatus('');this.paintConnection();}}catch(error){if(!this.disposed&&operation===this.operation)this.connectionStatus((error as Error).message);}}
 receive(event:MidiCC|MidiNote){if(this.disposed||!this.state.receive(event,this.selectedConnection()))return;this.paintObservation();}
 lost(message:string){if(this.disposed)return;this.cancelListening();this.paintConnection();this.connectionStatus(message);}
 cancelListening(){this.state.cancel();this.paintObservation();}
 dispose(){this.disposed=true;this.operation++;this.state.cancel();}
}

export const practiceOutput=(global:(()=>string|undefined)|undefined,legacy:string|undefined)=>global?.()??legacy??'';
export const audioOutputLabel=(ports:AudioOutputs,selected:string)=>!ports.supported?'Browser default':!selected?'System default':ports.outputs.find(output=>output.id===selected)?.name??'Saved output unavailable';
export interface OutputClock {unlock():Promise<void>;begin(bpm:number,duration:number):Promise<number>;close():void}
/** One owned output test; closing/changing Options invalidates its late receipts. */
export class AudioOutputTest {
 private generation=0;private clock?:OutputClock;private timer?:ReturnType<typeof setTimeout>;
 constructor(private create:(native:boolean,output:string,onError:(message:string)=>void)=>OutputClock,private status:(message:string)=>void){}
 cancel(){this.generation++;clearTimeout(this.timer);this.clock?.close();this.clock=undefined;}
 async run(native:boolean,output:string){this.cancel();const generation=this.generation;let failed=false;const clock=this.create(native,output,message=>{if(generation!==this.generation)return;failed=true;this.cancel();this.status(message);});this.clock=clock;this.status('Starting test…');try{await clock.unlock();if(generation!==this.generation||failed)return;await clock.begin(180,90);if(generation!==this.generation||failed)return;this.status('Test click sent. Did you hear it?');this.timer=setTimeout(()=>{if(generation===this.generation)this.cancel();},600);}catch(error){if(generation!==this.generation||failed)return;clock.close();this.clock=undefined;this.status((error as Error).message);}}
}
export interface AudioOptionsApi {outputs():Promise<AudioOutputs>;output():string;save(output:string):Promise<void>;create:(native:boolean,output:string,onError:(message:string)=>void)=>OutputClock}
export class AudioOptionsPanel {
 private disposed=false;private test:AudioOutputTest;private supported=false;private saving=0;
 constructor(private root:HTMLElement,private api:AudioOptionsApi){this.test=new AudioOutputTest(api.create,message=>{if(!this.disposed){const status=this.root.querySelector('[data-audio-status]');if(status)status.textContent=message==='Test click sent. Did you hear it?'?'':message;}});}
 async mount(){try{const ports=await this.api.outputs();if(this.disposed||!this.root.isConnected)return;this.supported=ports.supported;const selected=this.api.output(),missing=selected&&!ports.outputs.some(output=>output.id===selected);this.root.innerHTML=`<div class="option-setting" data-options-row><label for="options-audio-output">Audio output</label><div class="option-fields"><select id="options-audio-output" data-audio-output aria-label="Audio output" ${ports.supported?'':'disabled'}>${ports.supported?`<option value="">System default</option>${missing?`<option value="${escape(selected)}" selected>Saved output unavailable</option>`:''}${ports.outputs.map(output=>`<option value="${escape(output.id)}" ${selected===output.id?'selected':''}>${escape(output.name)}</option>`).join('')}`:'<option value="">Browser default</option>'}</select><button data-audio-test class="device-action">Play test sound</button></div></div><p data-audio-status class="control-error" role="status">${missing&&ports.supported?'Saved output unavailable. Choose an output.':''}</p>`;
  this.root.querySelector<HTMLSelectElement>('[data-audio-output]')!.onchange=()=>{void this.save();};this.root.querySelector<HTMLButtonElement>('[data-audio-test]')!.onclick=()=>{void this.test.run(this.supported,this.api.output());};
 }catch(error){if(!this.disposed)this.root.textContent=(error as Error).message;}}
 private async save(){const field=this.root.querySelector<HTMLSelectElement>('[data-audio-output]')!,status=this.root.querySelector('[data-audio-status]')!,button=this.root.querySelector<HTMLButtonElement>('[data-audio-test]')!,generation=++this.saving,previous=this.api.output(),choice=field.value;this.test.cancel();button.disabled=true;field.disabled=true;status.textContent='Saving output…';try{await this.api.save(choice);if(!this.disposed&&generation===this.saving)status.textContent='';}catch(error){if(!this.disposed&&generation===this.saving){field.value=this.api.output();field.dispatchEvent(new Event('options-selection'));status.textContent=`Output was not saved: ${(error as Error).message}`;}}finally{if(!this.disposed&&generation===this.saving){button.disabled=false;field.disabled=false;field.dispatchEvent(new Event('options-selection'));}}}
 dispose(){this.disposed=true;this.saving++;this.test.cancel();}
}
