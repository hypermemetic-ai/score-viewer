import type {ControlMatch} from './control-bindings';
import {hasFreeViewOverride,type FreeViewControlOverrides} from './free-view-controls';

/** Only inherited primary page arrows become speed commands in Timed practice.
 * Explicit local slots (including null) and other saved owners remain authoritative. */
export function workingSpeedArrow(code:string,owner:ControlMatch|undefined,local?:FreeViewControlOverrides):1|-1|undefined {
 const action=code==='ArrowLeft'?'previous':code==='ArrowRight'?'next':undefined;
 if(!action||hasFreeViewOverride(local,action,0)||owner&&(owner.action!==action||owner.slot!==0))return;
 return code==='ArrowLeft'?-1:1;
}
