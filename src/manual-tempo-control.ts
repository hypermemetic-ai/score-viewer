import {TempoRepeat} from './tempo-repeat';

/** Compact controls; direction describes the displayed quantity, not an internal BPM value. */
export function manualTempoField(key:string,input:string,label:string){
 return `<span class="manual-tempo" data-manual-key="${key}"><button type="button" data-manual-direction="-1" aria-label="Decrease ${label}">−</button>${input}<button type="button" data-manual-direction="1" aria-label="Increase ${label}">+</button></span>`;
}
export interface ManualTempoOptions {
 accepts:(element:HTMLElement)=>boolean;
 adjust:(key:string,direction:number,repeated:boolean,elapsed:number)=>boolean;
}
/** Own keyboard/pointer repetition so focus, release and native clicks cannot add stale steps. */
export class ManualTempoControls {
 private repeat=new TempoRepeat();private owner?:HTMLElement;private pointer?:number;private pointerClicks=new Map<number,HTMLElement>();private suppressed=new WeakMap<HTMLElement,number>();private disposed=false;
 constructor(private readonly options:ManualTempoOptions){
  document.addEventListener('keydown',this.down,true);document.addEventListener('keyup',this.up,true);
  document.addEventListener('pointerdown',this.pointerDown,true);document.addEventListener('pointerup',this.pointerUp,true);document.addEventListener('pointercancel',this.pointerUp,true);document.addEventListener('lostpointercapture',this.captureLost,true);document.addEventListener('click',this.click,true);document.addEventListener('focusin',this.focus,true);
  window.addEventListener('blur',this.cancel);document.addEventListener('visibilitychange',this.visibility);
 }
 private control(target:EventTarget|null){const el=target instanceof HTMLElement?target:undefined,group=el?.closest<HTMLElement>('[data-manual-key]');return group&&this.options.accepts(group)?{el:el!,group,key:group.dataset.manualKey!}:undefined;}
 private start(code:string,owner:HTMLElement|undefined,adjust:(repeated:boolean,elapsed:number)=>boolean){this.owner=owner;this.repeat.begin(code,(repeated,elapsed)=>{const ok=!this.disposed&&!document.hidden&&(!owner||(owner.isConnected&&this.options.accepts(owner)))&&(!repeated||this.pointer===undefined||!!owner?.hasPointerCapture(this.pointer))&&adjust(repeated,elapsed);if(!ok)this.cancel();return ok;});}
 begin(code:string,adjust:(repeated:boolean,elapsed:number)=>boolean){this.start(code,undefined,adjust);}
 release(code:string){if(!this.repeat.owns(code))return;if(this.owner?.matches('[data-manual-direction]'))this.suppressed.set(this.owner,performance.now()+1000);this.repeat.release(code);this.owner=undefined;}
 cancel=()=>{this.repeat.cancel();const owner=this.owner,pointer=this.pointer;this.pointer=undefined;this.owner=undefined;if(pointer!==undefined&&owner?.hasPointerCapture(pointer))owner.releasePointerCapture(pointer);};
 private visibility=()=>{if(document.hidden)this.cancel();};
 private focus=(event:FocusEvent)=>{if(event.target!==this.owner)this.cancel();};
 private down=(event:KeyboardEvent)=>{const c=this.control(event.target);if(!c)return;if(event.ctrlKey||event.altKey||event.metaKey){this.cancel();return;}const button=c.el.closest<HTMLButtonElement>('[data-manual-direction]'),direction=event.code==='ArrowUp'?1:event.code==='ArrowDown'?-1:button&&['Enter','Space'].includes(event.code)?Number(button.dataset.manualDirection):0;if(!direction){this.cancel();return;}event.preventDefault();event.stopImmediatePropagation();if(event.repeat||this.repeat.owns(event.code)||button?.disabled)return;if(button)this.suppressed.set(button,Infinity);this.start(event.code,c.el,(repeated,elapsed)=>this.options.adjust(c.key,direction,repeated,elapsed));};
 private up=(event:KeyboardEvent)=>{const button=this.control(event.target)?.el.closest<HTMLElement>('[data-manual-direction]');if(button&&this.suppressed.has(button))this.suppressed.set(button,performance.now()+1000);this.release(event.code);};
 private pointerDown=(event:PointerEvent)=>{const c=this.control(event.target),button=c?.el.closest<HTMLButtonElement>('[data-manual-direction]');if(!c||!button||button.disabled||event.button!==0)return;event.preventDefault();event.stopImmediatePropagation();this.cancel();button.focus({preventScroll:true});this.pointerClicks.set(event.pointerId,button);this.pointer=event.pointerId;button.setPointerCapture(event.pointerId);this.start(`pointer:${event.pointerId}`,button,(repeated,elapsed)=>this.options.adjust(c.key,Number(button.dataset.manualDirection),repeated,elapsed));};
 private pointerUp=(event:PointerEvent)=>{if(event.pointerId===this.pointer)this.cancel();};
 private captureLost=(event:PointerEvent)=>{if(event.pointerId===this.pointer)this.cancel();};
 private click=(event:MouseEvent)=>{const c=this.control(event.target),button=c?.el.closest<HTMLButtonElement>('[data-manual-direction]');if(!c||!button)return;event.preventDefault();event.stopImmediatePropagation();if(button.disabled)return;const pointerId=(event as PointerEvent).pointerId,pointer=this.pointerClicks.get(pointerId);if(pointer===button){this.pointerClicks.delete(pointerId);return;}if(event.detail>0){const pending=[...this.pointerClicks].find(([,el])=>el===button);if(pending){this.pointerClicks.delete(pending[0]);return;}}const suppressed=this.suppressed.get(button);this.suppressed.delete(button);if(suppressed!==undefined&&suppressed>=performance.now())return;this.cancel();this.options.adjust(c.key,Number(button.dataset.manualDirection),false,0);};
 dispose(){this.cancel();this.disposed=true;document.removeEventListener('keydown',this.down,true);document.removeEventListener('keyup',this.up,true);document.removeEventListener('pointerdown',this.pointerDown,true);document.removeEventListener('pointerup',this.pointerUp,true);document.removeEventListener('pointercancel',this.pointerUp,true);document.removeEventListener('lostpointercapture',this.captureLost,true);document.removeEventListener('click',this.click,true);document.removeEventListener('focusin',this.focus,true);window.removeEventListener('blur',this.cancel);document.removeEventListener('visibilitychange',this.visibility);}
}
