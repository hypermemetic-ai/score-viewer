import {assigned,readPersonalAssignments,type PersonalAssignments} from './personal-assignments';
import {isPitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import type {ScorePackage,FingerLayer,Seat,Attack,Metadata} from './package';
import {CONVENTIONAL_PIANO,physicalContact,type PhysicalKeyContact} from '../vendor/iso-notation/src/model/physical-keyboard';
import type {FingerBehavior,FingerPresentation} from './input';
import {getOriginalScoreIdentity} from './score-transposition';
import {validTranspositionSelection,type ScoreTranspositionSelection} from './score-transposition-selection';
export type Rotation=0|90|180|270;export type LabelMode='pitch'|'finger';export type FingerSet='calculated'|'yours';
export interface ViewState {page:number;rotation:Rotation;scale:1|.9|.75|.5;count:1|2|3;advance:'slide'|'group';labelMode:LabelMode;fingerSet:FingerSet}
export const defaultView=():ViewState=>({page:0,rotation:0,scale:1,count:1,advance:'slide',labelMode:'pitch',fingerSet:'yours'});
/** Holds are presentation input, never durable view state or musical meaning. */
export function effectiveLabelMode(view:ViewState,behavior:FingerBehavior,held:boolean,available=true,selecting=false,selectionPitchToggle=false):LabelMode{return !available?'pitch':selecting?(behavior==='momentary'?(held?'pitch':'finger'):(selectionPitchToggle?'pitch':'finger')):behavior==='momentary'?(held?'finger':'pitch'):view.labelMode;}
export interface Correction {contactId:string;actionId:string;ownerIds:string[];original:number;replacement:number;originalPlanner:string;originalLayerSource:string;createdAt:string;writtenBar:number;pitch:number;hand:'LH'|'RH';proposedRow?:number;proposedContact?:PhysicalKeyContact}
export interface PersonalBinding {sourceRevision:string;keyboardLayout:'conventional-piano'|'janko-four-row';profileId:string;profileSha256:string;effectiveHandSha256:string;editionRevision?:string}
/** Source aliases locate navigation across a changed page layout. No pixels or
 * projected contact IDs participate in the source/personal binding. */
export interface PersonalSourceAnchor {owners:string[];writtenBar:number;actionId:string;continuation:boolean;alias:number}
export interface PersonalNavigation {version:1;page?:PersonalSourceAnchor;edit?:PersonalSourceAnchor;followEdit:boolean}
export interface PersonalMemoryResolution {revision:number;sourceRevision:string;choices:Record<string,{finger:number|null}>}
export interface PersonalState {memoryResolved?:PersonalMemoryResolution;version:1|2;binding?:PersonalBinding;revision:string;view:ViewState;editContactId?:string;navigation?:PersonalNavigation;overrides:Record<string,Correction>;undo?:Record<string,Correction>;assignments?:PersonalAssignments;undoAssignments?:PersonalAssignments;layer?:FingerLayer;history:FingerLayer[];calculatedVersion?:number}
const personalBinding=(p:ScorePackage):PersonalBinding|undefined=>{
 if(p.manifest.version!==2)return;
 if(!p.sourceRevision||!p.keyboardLayout||!p.profileId||!p.profileSha256||!p.effectiveHandSha256)throw Error('Incomplete presentation state identity');
 return {sourceRevision:p.sourceRevision,keyboardLayout:p.keyboardLayout,profileId:p.profileId,profileSha256:p.profileSha256,effectiveHandSha256:p.effectiveHandSha256,
  ...(p.preparationIdentity?{editionRevision:p.manifest.revision}:{})};
};
export const collectionId=(p:ScorePackage)=>getOriginalScoreIdentity(p);
function storageName(kind:string,entryId:string,p:ScorePackage):string{
 const binding=personalBinding(p);
 if(!binding)return `${kind}-${entryId}.json`;
 return `${kind}-${collectionId(p)}-${binding.keyboardLayout}-${binding.profileSha256}-${binding.effectiveHandSha256}${binding.editionRevision?'-'+binding.editionRevision:''}.json`;
}
export const personalStorageName=(entryId:string,p:ScorePackage)=>storageName('state',entryId,p);
export const practiceStorageName=(entryId:string,p:ScorePackage)=>storageName('practice',entryId,p);
export const performanceStorageName=(entryId:string,p:ScorePackage)=>storageName('performance',entryId,p);
/** Read-only fallback only for the exact original Jankó revision; never rewrite it. */
export const legacyPersonalStorageName=(p:ScorePackage)=>!p.preparationIdentity&&p.manifest.version===2&&p.keyboardLayout==='janko-four-row'&&p.sourceRevision===p.manifest.revision?`state-${p.sourceRevision}.json`:undefined;
export const legacyPracticeStorageName=(p:ScorePackage)=>legacyPersonalStorageName(p)?.replace(/^state-/,'practice-');
export const legacyPerformanceStorageName=(p:ScorePackage)=>legacyPersonalStorageName(p)?.replace(/^state-/,'performance-');
export const initialPersonal=(p:ScorePackage):PersonalState=>({version:p.manifest.version===2?2:1,...(p.manifest.version===2?{binding:personalBinding(p)}:{}),revision:p.manifest.revision,view:defaultView(),overrides:{},history:[]});
export function readPersonal(raw:unknown,p:ScorePackage,options:{allowLegacyJanko?:boolean}={}):PersonalState{
 if(!raw)return initialPersonal(p);
 if(typeof raw!=='object'||Array.isArray(raw))throw Error('Invalid saved personal state; original data retained');
 let s=structuredClone(raw) as PersonalState;delete s.memoryResolved;const binding=personalBinding(p);
 const legacy=options.allowLegacyJanko&&!!legacyPersonalStorageName(p)&&s.version===1&&s.revision===p.manifest.revision;
 if(legacy)s={...s,version:2,binding};
 const matchesBinding=binding?!!s.binding&&typeof s.binding==='object'&&!Array.isArray(s.binding)&&
   Object.keys(s.binding).length===Object.keys(binding).length&&Object.entries(binding).every(([key,value])=>
     Object.prototype.hasOwnProperty.call(s.binding,key)&&(s.binding as unknown as Record<string,unknown>)[key]===value):s.binding===undefined;
 if(s.version!==(binding?2:1)||s.revision!==p.manifest.revision||!matchesBinding||!s.view||!s.overrides||typeof s.overrides!=='object'||Array.isArray(s.overrides)||!Array.isArray(s.history))throw Error('Saved source/layout/profile/hand revision differs; original data retained');
 s.assignments=readPersonalAssignments(s.assignments,p);s.undoAssignments=readPersonalAssignments(s.undoAssignments,p);
 if(s.assignments===undefined)delete s.assignments;if(s.undoAssignments===undefined)delete s.undoAssignments;
 if(p.manifest.version===3&&(s.assignments||s.undoAssignments||s.layer||s.history.length||Object.keys(s.overrides).length||s.undo&&Object.keys(s.undo).length))throw Error('This reading score cannot carry piano finger choices; original data retained');
 const v=s.view;if(![0,90,180,270].includes(v.rotation)||![1,.9,.75,.5].includes(v.scale)||![1,2,3].includes(v.count)||!['slide','group'].includes(v.advance)||!['pitch','finger'].includes(v.labelMode)||!['calculated','yours'].includes(v.fingerSet)||!Number.isInteger(v.page))throw Error('Invalid saved view');
 if(s.calculatedVersion!==undefined&&(!Number.isInteger(s.calculatedVersion)||s.calculatedVersion<0||s.calculatedVersion>=s.history.length))throw Error('Saved calculated version differs; data retained');
 // A stale optional cursor must never discard otherwise valid personal corrections.
 if(s.editContactId!==undefined&&(typeof s.editContactId!=='string'||!p.seats.some(q=>q.contactId===s.editContactId)))delete s.editContactId;
 if(s.navigation!==undefined){
  const owners=new Set(p.score.notes.map(n=>n.id)),navigation=s.navigation,
   anchor=(a:PersonalSourceAnchor|undefined)=>a===undefined||!!a&&typeof a==='object'&&!Array.isArray(a)&&Array.isArray(a.owners)&&a.owners.length>0&&new Set(a.owners).size===a.owners.length&&a.owners.every(id=>typeof id==='string'&&owners.has(id))&&Number.isSafeInteger(a.writtenBar)&&a.writtenBar>0&&typeof a.actionId==='string'&&!!a.actionId&&typeof a.continuation==='boolean'&&Number.isSafeInteger(a.alias)&&a.alias>=0&&p.seats.some(seat=>seat.writtenBar===a.writtenBar&&seat.actionId===a.actionId&&seat.ownerIds.some(id=>a.owners.includes(id)));
  // Navigation is optional recovery metadata. An obsolete alias must not
  // discard otherwise valid hand/finger choices, history or source evidence.
  if(!navigation||typeof navigation!=='object'||Array.isArray(navigation)||navigation.version!==1||typeof navigation.followEdit!=='boolean'||!anchor(navigation.page)||!anchor(navigation.edit))delete s.navigation;
 }
 // A projected page may not exist in the admitted base layout. Its optional
 // source navigation is resolved/clamped after that projection, including a
 // numeric fallback for source-empty pages.
 v.page=s.navigation&&Number.isSafeInteger(v.page)?Math.max(0,v.page):Math.max(0,Math.min(p.pages.length-1,v.page));
 for(const [key,c]of [...Object.entries(s.overrides),...Object.entries(s.undo??{})]){
  const aliases=p.seats.filter(q=>q.contactId===key),owners=[...new Set(aliases.flatMap(q=>q.ownerIds))],note=p.score.notes.find(n=>owners.includes(n.id));
  if(!c||!note||!isPitchedEvent(note)||c.contactId!==key||!Array.isArray(c.ownerIds)||new Set(c.ownerIds).size!==c.ownerIds.length||c.ownerIds.length!==owners.length||owners.some(id=>!c.ownerIds.includes(id))||
   aliases.some(q=>q.actionId!==c.actionId)||!Number.isInteger(c.replacement)||c.replacement<1||c.replacement>5||c.pitch!==note.pitch.octave*12+note.pitch.pitchClass||c.hand!==note.hand||!aliases.some(q=>q.writtenBar===c.writtenBar))throw Error('Saved finger source identity differs; data retained');
  if(binding?.keyboardLayout==='conventional-piano'){
   if(c.proposedRow!==undefined)throw Error('Saved conventional correction contains Jankó row data; original retained');
   if(c.proposedContact){const contact=physicalContact(CONVENTIONAL_PIANO,c.pitch,c.proposedContact.contactId);if(JSON.stringify(contact)!==JSON.stringify(c.proposedContact))throw Error('Saved conventional physical contact differs; original retained');}
  }
 }
 return s;
}
export const activeLayer=(p:ScorePackage,s:PersonalState)=>s.layer??p.fingerLayer;
export function fingerFor(p:ScorePackage,s:PersonalState,seat:Seat):number|undefined{const display=s.view.fingerSet==='calculated'&&s.calculatedVersion!==undefined?s.history[s.calculatedVersion]:activeLayer(p,s),a=display?.attacks.find(a=>a.id===(display.sourceOwnerToAttack[seat.ownerIds[0]]??seat.actionId)),legacy=s.overrides[seat.contactId]??Object.values(s.overrides).find(c=>c.ownerIds.includes(seat.ownerIds[0]));const shared=s.memoryResolved?.sourceRevision===(p.sourceRevision??p.manifest.revision)?s.memoryResolved.choices[seat.ownerIds[0]]:undefined;return s.view.fingerSet==='yours'?(shared?shared.finger??undefined:s.assignments?.choices[seat.ownerIds[0]]?.finger??legacy?.replacement??a?.finger):a?.finger;}
export function fingerDisplayAvailable(p:ScorePackage,s:PersonalState,presentation:FingerPresentation):boolean{return (!!activeLayer(p,s)||Object.values(s.assignments?.choices??{}).some(c=>c.finger!==undefined)||s.memoryResolved?.sourceRevision===(p.sourceRevision??p.manifest.revision)&&Object.values(s.memoryResolved.choices).some(c=>c.finger!==null))&&(presentation==='annotations'||p.fingerEligibility.eligible);}
export function corrected(p:ScorePackage,s:PersonalState,seat:Seat,replacement:number):PersonalState{
 if(!Number.isInteger(replacement)||replacement<1||replacement>5)throw Error('Use a finger from 1 to 5');if(seat.ownerIds.some(id=>s.assignments?.choices[id]))return assigned(p,s,seat,{finger:replacement});const a=activeLayer(p,s)?.attacks.find(a=>a.id===seat.actionId);if(!a)throw Error('No complete calculated choice at this note');
 const next=structuredClone(s),prior=next.overrides[seat.contactId],layer=activeLayer(p,s)!;
 const aliases=[...new Set(p.seats.filter(q=>q.contactId===seat.contactId).flatMap(q=>q.ownerIds))];
 if(replacement===a.finger)delete next.overrides[seat.contactId];else next.overrides[seat.contactId]={contactId:seat.contactId,actionId:seat.actionId,ownerIds:aliases,original:prior?.original??a.finger,replacement,originalPlanner:prior?.originalPlanner??layer.plannerVersion,originalLayerSource:prior?.originalLayerSource??layer.sourceHash,createdAt:prior?.createdAt??new Date().toISOString(),writtenBar:seat.writtenBar,pitch:a.pitch,hand:a.hand,...(a.row!==undefined?{proposedRow:a.row}:{}),...(a.contact?{proposedContact:structuredClone(a.contact)}:{})};
 next.view.fingerSet='yours';return next;
}
export function personalCorrectionCount(s:PersonalState):number{const covered=new Set(Object.values(s.overrides).flatMap(c=>c.ownerIds));return Object.keys(s.overrides).length+Object.keys(s.assignments?.choices??{}).filter(id=>!covered.has(id)).length;}
export function restoreAll(s:PersonalState):PersonalState{const next={...structuredClone(s),undo:structuredClone(s.overrides),overrides:{}};if(s.assignments)next.undoAssignments=structuredClone(s.assignments);else delete next.undoAssignments;delete next.assignments;return next;}
export function installLayer(s:PersonalState,p:ScorePackage,layer:FingerLayer):PersonalState{
 if(p.manifest.version===3)throw Error('Piano finger choices cannot be attached to this reading score');
 if(p.manifest.version===2&&((layer.version!=='piano-finger-assignments-v1'&&layer.version!==(p.keyboardLayout==='conventional-piano'?'physical-contact-finger-layer-v2':'physical-attack-finger-layer-v1'))||layer.version==='piano-finger-assignments-v1'&&layer.layoutId!==p.keyboardLayout||layer.profileId!==p.profileId||layer.profileSha256!==p.profileSha256||p.keyboardLayout==='conventional-piano'&&layer.effectiveHandSha256!==p.effectiveHandSha256))throw Error('Calculated layer belongs to a different keyboard/profile/hand presentation');
 const next=structuredClone(s),old=activeLayer(p,s);if(old)next.history.push(structuredClone(old));next.layer=layer;next.calculatedVersion=undefined;return next;}
export function feedback(p:ScorePackage,s:PersonalState){const layer=activeLayer(p,s);return {version:'iso-personal-fingering-feedback-v1',scoreId:p.score.id,sourceRevision:p.sourceRevision??p.manifest.revision,...(s.binding?{presentation:s.binding}:{}),sourceHash:layer?.sourceHash,metadata:p.manifest.metadata,createdAt:new Date().toISOString(),calculatorVersion:layer?.plannerVersion,personalAssignments:s.assignments?structuredClone(s.assignments):undefined,limitations:'Source-guarded personal hand and finger choices; duplicate rows remain proposals. Edited movement/contact trajectories are not recertified. No automatic training or upload.',corrections:Object.values(s.overrides).map(c=>({...c,currentCalculated:layer?.attacks.find(a=>a.id===c.actionId)?.finger,location:{writtenBar:c.writtenBar,seats:p.seats.filter(q=>q.contactId===c.contactId).map(q=>({id:q.id,page:q.page+1,system:q.system+1}))},nearbyOwners:p.score.notes.filter(n=>{const note=p.score.notes.find(n=>c.ownerIds.includes(n.id))!;return Math.abs(n.startTick-note.startTick)<=p.score.ticksPerBeat*3;}).map(n=>({id:n.id,...(isPitchedEvent(n)?{pitch:n.pitch}:{eventKind:n.eventKind,soundingPitch:null,referencePitch:n.referencePitch}),hand:n.hand,startTick:n.startTick,durationTicks:n.durationTicks}))}))};}
export interface Fit {width:number;height:number;scale:number;count:number;pages:number[];portrait:boolean}
export function viewportFit(w:number,h:number,v:ViewState,total:number,pageWidth=595.276,pageHeight=841.89):Fit{
 const width=v.rotation%180?h:w,height=v.rotation%180?w:h,portrait=height>width,count=portrait?1:v.count,pages=Array.from({length:Math.min(count,total-v.page)},(_,i)=>v.page+i);
 const gap=12;const factor=Math.max(.01,Math.min(width/(pages.length*pageWidth+Math.max(0,pages.length-1)*gap),height/pageHeight))*v.scale;
 return {width,height,scale:factor,count,pages,portrait};
}
export function turnPage(v:ViewState,dir:1|-1,total:number,effectiveCount:number):ViewState{return {...v,page:Math.max(0,Math.min(total-1,v.page+dir*(v.advance==='group'?effectiveCount:1)))};}
export const rotate=(r:Rotation)=>(r+90)%360 as Rotation;
/** Descriptive discovery only. Actual provider replay is required before this
 * hint can supply an Instrument choice or family. */
export interface GuitarProEntryHint {version:'guitar-pro-entry-hint-v1';groupId:string;inputSha256:string;sourceTrackId:string;sourceName?:string}
export interface Entry {id:string;file:string;metadata:Metadata;importedAt:string;presentations?:string[];retainedPackages?:string[];personalFiles?:Record<string,string>;editionPersonalFiles?:Record<string,Record<string,string>>;transposition?:ScoreTranspositionSelection;guitarPro?:GuitarProEntryHint}
export function validEntryStorage(e:Entry):boolean {
 const object=(v:unknown):v is Record<string,unknown>=>!!v&&typeof v==='object'&&!Array.isArray(v),
   packageName=(v:unknown)=>typeof v==='string'&&/^package-[a-f0-9]{64}\.isoscore$/.test(v),
   stateMap=(v:unknown)=>v===undefined||object(v)&&Object.entries(v).every(([key,file])=>
     /^state-[a-f0-9]{64}(?:-(?:conventional-piano|janko-four-row)-[a-f0-9]{64}-[a-f0-9]{64}(?:-[a-f0-9]{64})?)?\.json$/.test(key)&&
     key.startsWith(`state-${e.id}`)&&typeof file==='string'&&/^state-version-[a-f0-9]{64}\.json$/.test(file));
 if(!e||!/^[a-f0-9]{64}$/.test(e.id)||!packageName(e.file)||!stateMap(e.personalFiles)||
   e.presentations!==undefined&&!Array.isArray(e.presentations)||e.retainedPackages!==undefined&&!Array.isArray(e.retainedPackages))return false;
 if(e.guitarPro!==undefined&&(!object(e.guitarPro)||e.guitarPro.version!=='guitar-pro-entry-hint-v1'||!/^[a-f0-9]{64}$/.test(e.guitarPro.groupId)||
  !/^[a-f0-9]{64}$/.test(e.guitarPro.inputSha256)||!/^\d{1,6}$/.test(e.guitarPro.sourceTrackId)||
  e.guitarPro.sourceName!==undefined&&(typeof e.guitarPro.sourceName!=='string'||e.guitarPro.sourceName.length>1024)))return false;
 const packages=[e.file,...(e.presentations??[]),...(e.retainedPackages??[])];
 return packages.every(packageName)&&(e.transposition===undefined||validTranspositionSelection(e.transposition,e.file,packages))&&(e.editionPersonalFiles===undefined||object(e.editionPersonalFiles)&&
   Object.entries(e.editionPersonalFiles).every(([file,map])=>packageName(file)&&packages.includes(file)&&stateMap(map)));
}
