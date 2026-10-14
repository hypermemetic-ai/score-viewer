import {manualTempoField,ManualTempoControls} from './manual-tempo-control';

export interface FingeringAdviceSettings {version:1;absoluteEnabled:boolean;unusualEnabled:boolean;absoluteThresholdCmPerSecond:number}
export const DEFAULT_FINGERING_ADVICE_SETTINGS:Readonly<FingeringAdviceSettings>=Object.freeze({version:1,absoluteEnabled:true,unusualEnabled:true,absoluteThresholdCmPerSecond:25});
export function readFingeringAdviceSettings(raw:unknown):FingeringAdviceSettings {
 if(raw===undefined||raw===null)return{...DEFAULT_FINGERING_ADVICE_SETTINGS};
 const q=raw as Partial<FingeringAdviceSettings>;
 if(q.version!==1||typeof q.absoluteEnabled!=='boolean'||typeof q.unusualEnabled!=='boolean'||typeof q.absoluteThresholdCmPerSecond!=='number'||!Number.isFinite(q.absoluteThresholdCmPerSecond)||q.absoluteThresholdCmPerSecond<=0)throw Error('Invalid fingering advice preferences; saved settings retained.');
 return{version:1,absoluteEnabled:q.absoluteEnabled,unusualEnabled:q.unusualEnabled,absoluteThresholdCmPerSecond:q.absoluteThresholdCmPerSecond};
}
export function adviceThresholdFromInput(value:string):number|undefined {
 if(!/^\s*(?:\d+(?:\.\d*)?|\.\d+)\s*$/.test(value))return;
 const n=Number(value);return Number.isFinite(n)&&n>0?n:undefined;
}
export function fingeringAdviceOptionsMarkup(value:FingeringAdviceSettings):string {
 const p=readFingeringAdviceSettings(value);
 return `<h3>Fingering warnings</h3><label data-options-row><input type="checkbox" data-advice-absolute ${p.absoluteEnabled?'checked':''}>Travel</label><div class="option-setting" data-options-row><label for="options-advice-threshold">Threshold</label>${manualTempoField('advice-threshold',`<input id="options-advice-threshold" type="text" inputmode="decimal" value="${p.absoluteThresholdCmPerSecond}" aria-label="Travel warning threshold, centimetres per second" aria-describedby="advice-threshold-help" data-advice-threshold>`,'travel warning threshold','cm/s')}</div><label data-options-row><input type="checkbox" data-advice-unusual ${p.unusualEnabled?'checked':''}>Unusual for you</label><p id="advice-threshold-help" class="option-help">Controls highlighting, not playing speed.</p><p data-advice-error class="control-error" role="status"></p>`;
}
/** Uses the existing Options numeric editor. The host persists each validated value using its normal preferences transaction. */
export class FingeringAdviceOptions {
 private numeric:ManualTempoControls;private disposed=false;private saving=false;
 constructor(private root:HTMLElement,private api:{settings:()=>FingeringAdviceSettings;save:(settings:FingeringAdviceSettings)=>Promise<void>;ownsKeys?:()=>boolean}){
  root.innerHTML=fingeringAdviceOptionsMarkup(api.settings());root.addEventListener('change',this.changed);
  this.numeric=new ManualTempoControls({accepts:group=>!this.disposed&&!this.saving&&!this.api.ownsKeys?.()&&this.root.contains(group)&&group.dataset.manualKey==='advice-threshold',
   adjust:(_key,direction)=>{const next=this.api.settings().absoluteThresholdCmPerSecond+direction;if(next<=0)return false;void this.save({...this.api.settings(),absoluteThresholdCmPerSecond:next});return true;},
   edit:{commit:(_key,field)=>{const value=adviceThresholdFromInput(field.value);if(value===undefined){this.error('Enter a positive number.');return false;}void this.save({...this.api.settings(),absoluteThresholdCmPerSecond:value});return true;},
    adjust:(_key,field,direction)=>{const value=adviceThresholdFromInput(field.value);if(value===undefined||value+direction<=0)return false;field.value=String(value+direction);return true;},cancel:()=>{this.error('');this.paint();}}});
 }
 private error(message:string){const el=this.root.querySelector('[data-advice-error]');if(el)el.textContent=message;}
 private changed=(event:Event)=>{const field=event.target as HTMLInputElement;if(this.saving||this.disposed)return;
  if(field.matches('[data-advice-absolute]'))void this.save({...this.api.settings(),absoluteEnabled:field.checked});
  if(field.matches('[data-advice-unusual]'))void this.save({...this.api.settings(),unusualEnabled:field.checked});
 };
 private paint(){if(this.disposed)return;const p=this.api.settings();
  const a=this.root.querySelector<HTMLInputElement>('[data-advice-absolute]'),u=this.root.querySelector<HTMLInputElement>('[data-advice-unusual]'),n=this.root.querySelector<HTMLInputElement>('[data-advice-threshold]');
  if(a)a.checked=p.absoluteEnabled;if(u)u.checked=p.unusualEnabled;if(n&&!this.numeric.ownsDraft(n))n.value=String(p.absoluteThresholdCmPerSecond);
  for(const el of this.root.querySelectorAll<HTMLInputElement|HTMLButtonElement>('input,button'))el.disabled=this.saving;
 }
 private async save(value:FingeringAdviceSettings){if(this.disposed||this.saving)return;this.saving=true;this.error('');this.paint();try{await this.api.save(readFingeringAdviceSettings(value));}catch(error){this.error(error instanceof Error?error.message:String(error));}finally{this.saving=false;this.paint();}}
 dispose(){this.disposed=true;this.numeric.dispose();this.root.removeEventListener('change',this.changed);}
}
