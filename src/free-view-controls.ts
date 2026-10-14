import {changeControls,controlIdentity,controlActionLabel,controlActions,isPracticeModeAction,isEditorAction,editorControlBindings,controlActionsOverlap,practiceControlBindings,readControlBindings,type ControlAction,type ControlBinding,type ControlBindings,type ControlChange} from './control-bindings';

export type FreeViewNavigationAction='previous'|'next';
/** Missing slots inherit; an owned null deliberately has no control. */
export interface FreeViewControlOverrides {version:1;actions:Partial<Record<FreeViewNavigationAction,Partial<Record<0|1,ControlBinding|null>>>>}
export const isFreeViewNavigation=(action:ControlAction):action is FreeViewNavigationAction=>action==='previous'||action==='next';
export const hasFreeViewOverride=(overrides:FreeViewControlOverrides|undefined,action:ControlAction,slot:0|1)=>isFreeViewNavigation(action)&&Object.hasOwn(overrides?.actions[action]??{},slot);
const label=(action:ControlAction)=>isFreeViewNavigation(action)?action==='previous'?'Previous measures':'Next measures':controlActionLabel(action);
const slotLabel=(slot:0|1)=>slot?'secondary':'primary';

export function freeViewControlBindings(main:ControlBindings,overrides?:FreeViewControlOverrides):ControlBindings {
 const next=structuredClone(main);
 for(const action of ['previous','next'] as const)for(const slot of [0,1] as const)if(hasFreeViewOverride(overrides,action,slot))next.actions[action][slot]=overrides!.actions[action]![slot]!;
 const owners=new Map<string,{action:ControlAction;slot:0|1}>();
 for(const action of controlActions)for(const slot of [0,1] as const){const binding=next.actions[action]?.[slot];if(!binding)continue;const id=controlIdentity(binding),owner=owners.get(id);if(owner&&controlActionsOverlap(owner.action,action))throw Error(`Free view conflict: ${label(owner.action)} ${slotLabel(owner.slot)} control and ${label(action)} ${slotLabel(slot)} control. Change the conflicting local binding.`);owners.set(id,{action,slot});}
 return readControlBindings(next,{bindings:{}});
}

export function readFreeViewControlOverrides(value:unknown,main:ControlBindings):FreeViewControlOverrides|undefined {
 if(value===undefined)return;
 const raw=value as FreeViewControlOverrides;
 if(!raw||raw.version!==1||Object.keys(raw).some(key=>!['version','actions'].includes(key))||!raw.actions||typeof raw.actions!=='object'||Array.isArray(raw.actions)||Object.keys(raw.actions).some(key=>!['previous','next'].includes(key)))throw Error('Saved Free view controls are unsupported; data retained.');
 const overrides:FreeViewControlOverrides={version:1,actions:{}};
 for(const action of ['previous','next'] as const){if(!Object.hasOwn(raw.actions,action))continue;const slots=raw.actions[action];if(!slots||typeof slots!=='object'||Array.isArray(slots)||Object.keys(slots).some(key=>!['0','1'].includes(key)))throw Error('Saved Free view controls require known slots; data retained.');overrides.actions[action]={};for(const slot of [0,1] as const)if(Object.hasOwn(slots,slot))overrides.actions[action]![slot]=slots[slot]!;}
 const admitted=freeViewControlBindings(main,overrides);
 for(const action of ['previous','next'] as const)for(const slot of [0,1] as const)if(hasFreeViewOverride(overrides,action,slot))overrides.actions[action]![slot]=admitted.actions[action][slot];
 return overrides;
}

/** Apply one queued intent against current main and local state; never mutate either. */
export function changeScopedControls(main:ControlBindings,overrides:FreeViewControlOverrides|undefined,freeView:boolean,change:ControlChange){
 let nextMain=main,nextOverrides=structuredClone(overrides??{version:1 as const,actions:{}});
 const assign=(action:FreeViewNavigationAction,slot:0|1,binding:ControlBinding|null)=>{nextOverrides.actions[action]??={};nextOverrides.actions[action]![slot]=binding;};
 if(freeView&&change.kind==='restore-pages'){assign('previous',0,{kind:'key',key:'ArrowLeft'});assign('next',0,{kind:'key',key:'ArrowRight'});}
 else if(freeView&&change.kind==='assign'&&isFreeViewNavigation(change.action))assign(change.action,change.slot,change.binding);
 else{
  // Editing a secondary control preserves the primary shown by the effective
  // default, while an explicit empty slot remains owned on later reloads.
  if(change.kind==='assign'&&(isPracticeModeAction(change.action)||isEditorAction(change.action))&&!Object.hasOwn(main.actions,change.action)){
   nextMain=structuredClone(main);nextMain.actions[change.action]=(isEditorAction(change.action)?editorControlBindings(main):practiceControlBindings(freeViewControlBindings(main,overrides))).actions[change.action];
  }
  nextMain=changeControls(nextMain,change);
 }
 freeViewControlBindings(nextMain,nextOverrides);
 return {main:nextMain,overrides:Object.keys(nextOverrides.actions).length?nextOverrides:undefined};
}
