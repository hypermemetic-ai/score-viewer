import {admitReadingContent,type ReadingDescriptor,type ReadingContent,type ReadingAdmissionReceipt} from './reading-package';
import {selectReadingNotation,admitDualReadingContentAsync,dualReadingContentAsync} from './dual-reading-package';
import {capturedReadingExecution,checkReadingExecution,drainReadingChecks,type ReadingExecution} from './reading-execution';
import type {PreparationStage} from '../vendor/iso-notation/src/score-presentation';
import {conservativeMaterialBytes} from './package-material';
import {annotationInkPolicyFor,ensureAnnotationInkPolicyReady,assertAnnotationInkPolicyReady,type PersonalAnnotationInkPolicy} from './annotation-ink-policy';
import {normalizeLegacyScoreEvents,requirePitchedEvent,isPitchedEvent} from '../vendor/iso-notation/src/model/musical-event';
import {requirePianoEvent} from './piano-event';
import {unzipSync,strFromU8,strToU8,zipSync} from 'fflate';
import {DOMParser} from '@xmldom/xmldom';
import {validateOperatorFingerJournal} from './operator-finger-authority';
import type {QuantizedGridScore,Hand} from '../vendor/iso-notation/src/model/types';
import {requireReferencePerformanceTempo,validateReferencePerformanceTempo,referencePerformanceClock} from '../vendor/iso-notation/src/model/reference-performance-tempo';
import {compilePlanningRequirements} from '../vendor/iso-notation/src/model/physical-source-constraints';
import {normalizeHandPlanningInput} from '../vendor/iso-notation/src/model/hand-planning-input';
import {RR_TEMPORAL_LAYER_PLANNER,validateRRTemporalFingerLayer} from '../vendor/iso-notation/src/model/rr-temporal-finger-layer';
import {validateConventionalFingerLayer} from '../vendor/iso-notation/src/model/conventional-finger-layer';
import type {PhysicalKeyboardId,PhysicalKeyContact} from '../vendor/iso-notation/src/model/physical-keyboard';
import {APPROVED_SCORE_RENDERING_ENGINE,validatePassiveScoreRenderingRecipe,validateScoreRenderingRecipe,type PassiveScoreRenderingRecipe} from '../vendor/iso-notation/src/render/iso/score-rendering-recipe';
import {validateReferenceMidi} from './reference-midi';
import {FINGER_PHYSICAL_COST_UNITS} from '../vendor/iso-notation/src/model/finger-performance-timing';
import {validatePianoCalculationContext,scoreWithCalculationContext,type PianoCalculationContext} from '../vendor/iso-notation/src/model/piano-calculation-context';
import {PIANO_ASSIGNMENT_VERSION,validatePianoAssignments} from '../vendor/iso-notation/src/model/piano-finger-assignments';
import {validatePianoPreparationIdentity,type PianoPreparationIdentity} from './piano-preparation-identity';
import {validateDerivedHandPresentation,sourceFactsProjection,CALCULATED_HAND_SCORE_RENDERING_ENGINE,type PresentationAnnotationGeometry,type PresentationWrittenHead} from '../vendor/iso-notation/src/score-presentation';
import {admitCalculatedHandEdition,calculatedAdmissionKey,type CalculatedAdmissionEvidence,type CalculatedAdmissionEvidenceStore,type CalculatedHandReceipt} from './calculated-hand-edition';
import {admitScoreTransposition,type ScoreTransposition} from './score-transposition';
import {withKnownComposerRepeats} from '../vendor/iso-notation/src/scores/composer-repeats';
export interface Attack {id:string;writtenBar:number;startTick:number;pitch:number;hand:Hand;finger:number;row?:number;contact?:PhysicalKeyContact;owners:Array<{id:string;durationTicks:number;releaseTick:number;voice?:number}>}
export interface FingerLayer {version:'physical-attack-finger-layer-v1'|'physical-contact-finger-layer-v2'|'piano-finger-assignments-v1';baseScoreId:string;sourceHash:string;inputSha256:string;plannerVersion:string;ticksPerBeat:number;reviewedFingerAuthority?:unknown;attacks:Attack[];sourceOwnerToAttack:Record<string,string>;traversal:number[];[key:string]:unknown}
export interface Seat {id:string;page:number;ownerIds:string[];actionId:string;contactId:string;pitchDigit:string;x:number;baseline:number;fontSize:number;system:number;writtenBar:number;continuation?:boolean}
export interface Metadata {title:string;composer:string;opus?:number;opusLabel?:string;piece?:number;provenance:string[];variant?:string}

export interface Manifest {format:'iso-score';version:1|2|3;scoreId:string;revision:string;engineVersion:string;metadata:Metadata;semanticSha256:string;layerSourceHash?:string;files:Record<string,string>;pages:string[];font:string;notices:string[];createdAt:string;fingerGeometry?:{version:string;fontSha256:string};sourceScore?:string;sourceRevision?:string;sourceSha256?:string;keyboardLayout?:PhysicalKeyboardId;profileId?:string;profileSha256?:string;effectiveHandSha256?:string;renderingRecipe?:string;presentations?:Partial<Record<PhysicalKeyboardId,PresentationDescriptor>>;referenceMidi?:{file:'reference.mid'};calculationContext?:PianoCalculationContext;preparationIdentity?:PianoPreparationIdentity;calculatedHandReceipt?:string;transposition?:ScoreTransposition;reading?:ReadingDescriptor}
export interface PresentationDescriptor {layoutId:PhysicalKeyboardId;score:string;seats:string;fingers?:string;pages:string[];renderingRecipe?:string;revision:string;profileId:string;profileSha256:string;effectiveHandSha256:string;layerSourceHash:string;engineVersion:string;preparationIdentity?:PianoPreparationIdentity;calculatedHandReceipt?:string;calculationContext?:PianoCalculationContext|null}
export interface ScorePackage {manifest:Manifest;score:QuantizedGridScore;seats:Seat[];pages:string[];files:Record<string,Uint8Array>;fingerLayer?:FingerLayer;fingerEligibility:{eligible:boolean;reason?:string};sourceScore?:QuantizedGridScore;sourceRevision?:string;sourceSha256?:string;keyboardLayout?:PhysicalKeyboardId;profileId?:string;profileSha256?:string;effectiveHandSha256?:string;availablePresentations?:PhysicalKeyboardId[];collectionManifest?:Manifest;renderingRecipe?:PassiveScoreRenderingRecipe;referenceMidi?:Uint8Array;calculationContext?:PianoCalculationContext;preparationIdentity?:PianoPreparationIdentity;calculatedHandReceipt?:CalculatedHandReceipt;annotationGeometry?:PresentationAnnotationGeometry;personalAnnotationInkPolicy?:PersonalAnnotationInkPolicy;transposition?:ScoreTransposition;transpositionOriginal?:ScorePackage;archiveSha256?:string;reading?:ReadingContent}

export const hashBytes=async(b:Uint8Array|string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',typeof b==='string'?strToU8(b):new Uint8Array(b)))).map(n=>n.toString(16).padStart(2,'0')).join('');
// Only a completed ordinary cold import can bind an archive to these frozen
// dual source identities. Wrapper fields and saved hashes grant no authority.
const admittedDualArchives=new WeakMap<Manifest,{score:QuantizedGridScore;sha256:string}>();
export function admittedDualArchiveSha256(p:ScorePackage):string|undefined {
 const record=admittedDualArchives.get(p.manifest);
 if(!record||record.score!==p.score||!Object.isFrozen(p.manifest)||!Object.isFrozen(p.score))return;
 try{selectReadingNotation(p,p.reading?.dual?.notation??'iso');return record.sha256;}catch{return;}
}
function fail(s:string):never{throw Error(s);}
/** Saved pages that lack the repeat signs their score's composer wrote. The
 * edition is engraved again on opening; see {@link keepSavedPagesWithoutRepeats}. */
export class SavedPagesLackRepeats extends Error{
 constructor(readonly sourceSha256:string){super('This saved engraving lacks the score\'s repeat signs. Open the score again to engrave it afresh.');this.name='SavedPagesLackRepeats';}
}
// Sources whose edition could not be engraved again with its repeats this
// session: they read as saved, without the repeats, so their pages open.
const savedWithoutRepeats=new Set<string>();
/** A score whose saved pages lack its repeats, and which could not be
 * engraved again, opens on those pages as saved for the rest of the session. */
export function keepSavedPagesWithoutRepeats(sourceSha256:string){savedWithoutRepeats.add(sourceSha256);}
const withRepeats=(score:QuantizedGridScore,sourceSha256:string)=>savedWithoutRepeats.has(sourceSha256)?score:withKnownComposerRepeats(score,sourceSha256);
/** The profile of a view whose fingers, if any, are the edition's own fixed ones. */
export const FIXED_PAGES_PROFILE='publisher-fixed-pages-v1';
const isObject=(x:unknown):x is Record<string,any>=>!!x&&typeof x==='object'&&!Array.isArray(x);
function passiveSvg(svg:string,seats:Seat[],page:number){
 const errors:string[]=[];const doc=new DOMParser({onError:(_level,msg)=>errors.push(msg)}).parseFromString(svg,'image/svg+xml');
 if(errors.length||doc.documentElement?.localName!=='svg'||/<!DOCTYPE|<!ENTITY/i.test(svg))fail(`Page ${page+1}: malformed SVG`);
 const allowed=new Set(['svg','g','path','text','tspan','rect','line','circle','ellipse','polyline','polygon','defs','style','clipPath','mask','use','symbol','title','desc']);
 const found=new Map<string,Element>();
 for(const el of Array.from(doc.getElementsByTagName('*'))){
  if(!allowed.has(el.localName??''))fail(`Page ${page+1}: active/unsupported SVG ${el.localName}`);
  for(const attr of Array.from(el.attributes)){
   if(/^on/i.test(attr.name)||['src','srcset'].includes(attr.localName??''))fail('SVG event or external content');
   if(attr.localName==='href'&&!attr.value.startsWith('#'))fail('SVG external reference');
   if(/url\(/i.test(attr.value)&&!/^url\(#[\w-]+\)$/.test(attr.value))fail('SVG external paint reference');
  }
  if(el.localName==='style'){
   const css=el.textContent??'';
   if(/@import|expression\(|-moz-binding/i.test(css))fail('SVG active CSS');
   for(const match of css.matchAll(/url\(([^)]+)\)/gi))if(!/^['"]?data:(?:font\/otf|application\/x-font-opentype|application\/font-sfnt);base64,[\w+/=]+['"]?$/.test(match[1]))fail('SVG external font/CSS URL');
  }
  const id=el.getAttribute('data-viewer-seat');if(id){if(found.has(id))fail('Duplicate SVG glyph seat');found.set(id,el as unknown as Element);}
 }
 const expected=seats.filter(s=>s.page===page);
 if(found.size!==expected.length)fail(`Page ${page+1}: glyph inventory mismatch`);
 for(const s of expected){const el=found.get(s.id);if(!el||el.localName!=='text'||el.textContent!==s.pitchDigit||Number(el.getAttribute('x'))!==s.x||Number(el.getAttribute('y'))!==s.baseline||el.getAttribute('font-size')!==`${s.fontSize}pt`)fail(`Page ${page+1}: glyph seat ${s.id} differs`);}
}
/** Bounds from the pinned engine outline, not character advance or the current finger. */
export const digitMetrics:Record<string,[number,number,number,number]>={'1':[153,0,379,739],'2':[34,0,520,752],'3':[15,-13,518,752],'4':[0,0,530,739],'5':[12,-13,520,739]};
const geometryFont='5b009410cf5231dcb1e45b155c1afedcfc63d82042fd8c414d0dd7705c9fbbae';
async function fingerEligibility(m:Manifest,seats:Seat[],pages:string[]):Promise<ScorePackage['fingerEligibility']>{
 const certificate=m.fingerGeometry;
 if(certificate?.version!=='frozen-slot-all-five-v1')return {eligible:false,reason:'This package has no supported all-five frozen-seat geometry certificate; pitch reading remains available.'};
 if(certificate.fontSha256!==geometryFont||m.files[m.font]!==geometryFont)return {eligible:false,reason:'The digit font has no supported outline measurements; pitch reading remains available.'};
 for(let page=0;page<pages.length;page++){
  const doc=new DOMParser().parseFromString(pages[page],'image/svg+xml');
  const styles=Array.from(doc.getElementsByTagName('style'));
  if(styles.length!==1||await hashBytes(styles[0].textContent??'')!=='2c0f0fa8086d7bd7c46f6469a647d3512800ac82b885dc50b0e1ad2a8cc6dd5a')return {eligible:false,reason:'The vector typography is outside the measured presentation contract; pitch reading remains available.'};
  for(const seat of seats.filter(s=>s.page===page)){
   const text=Array.from(doc.getElementsByTagName('text')).find(el=>el.getAttribute('data-viewer-seat')===seat.id)!;
   const group=text.parentNode as unknown as Element;
   const masks=Array.from(group.childNodes).filter((n:any)=>n.nodeType===1&&n.localName==='rect'&&n.getAttribute('class')==='janko-knockout') as unknown as Element[];
   if(group.getAttribute('class')!=='janko-reading-head'||masks.length!==1||text.getAttribute('class')!=='janko-digit'||text.hasAttribute('transform')||text.hasAttribute('style')||text.getAttribute('font-weight')!=='700')return {eligible:false,reason:`Seat ${seat.id} has an unsupported frozen presentation; pitch reading remains available.`};
   const rect=masks[0],x=Number(rect.getAttribute('x')),y=Number(rect.getAttribute('y')),w=Number(rect.getAttribute('width')),h=Number(rect.getAttribute('height'));
   if(![x,y,w,h].every(Number.isFinite)||w<=0||h<=0||rect.getAttribute('fill')!=='#FFFFFF'||rect.hasAttribute('transform')||rect.hasAttribute('style'))return {eligible:false,reason:`Seat ${seat.id} has no valid protected slot; pitch reading remains available.`};
   const em=seat.fontSize*4/3;
   for(const [finger,b] of Object.entries(digitMetrics)){
    const ink=[seat.x+(b[0]-280)*em/1000,seat.baseline-b[3]*em/1000,seat.x+(b[2]-280)*em/1000,seat.baseline-b[1]*em/1000];
    if(ink[0]<x||ink[1]<y||ink[2]>x+w||ink[3]>y+h)return {eligible:false,reason:`Finger ${finger} does not fit frozen seat ${seat.id}; pitch reading remains available.`};
   }
  }
 }
 return {eligible:true};
}
export function validateLayer(layer:FingerLayer,p:Pick<ScorePackage,'score'|'seats'|'manifest'> & {keyboardLayout?:PhysicalKeyboardId}):void{
 if(layer.plannerVersion===RR_TEMPORAL_LAYER_PLANNER)fail('Temporal four-row layers require complete asynchronous contact replay');
 if(p.keyboardLayout==='conventional-piano')fail('Use asynchronous conventional layer validation for this presentation');
 if(layer.version!=='physical-attack-finger-layer-v1'||layer.sourceHash!==(p.manifest.layerSourceHash??p.manifest.semanticSha256)||layer.ticksPerBeat!==p.score.ticksPerBeat||!Array.isArray(layer.attacks)||!isObject(layer.sourceOwnerToAttack))fail('Finger layer source/version mismatch');
 const rr=layer.physicalRowOrder==='rr-even-far-last-v1';
 if(layer.physicalRowOrder!==undefined&&!rr)fail('Unknown finger physical-row contract');
 const rrCore=layer.plannerVersion==='released-owner-actions-v1'&&typeof layer.profileSha256==='string'&&/^[a-f0-9]{64}$/.test(layer.profileSha256)&&typeof layer.inputSha256==='string'&&/^[a-f0-9]{64}$/.test(layer.inputSha256)&&typeof layer.candidateId==='string'&&/^rr-performance-pose:[a-f0-9]{64}$/.test(layer.candidateId);
 const rrWorker=layer.plannerVersion==='released-owner-actions-v1/viewer-bounded-performance-v2'&&isObject(layer.profileIdentity)&&layer.profileIdentity.id==='rr-player-performance-contact-pose-v5'&&layer.profileIdentity.version==='rr-performance-seconds-contact-pose-route-v5';
 if(rr&&(layer.profileId!=='rr-player-performance-contact-pose-v5'||layer.baseScoreId!==p.manifest.scoreId||!rrCore&&!rrWorker))fail('Finger layer RR profile/provenance mismatch');
 if(rr||layer.referencePerformanceTempo!==undefined||layer.performanceClock!==undefined||layer.physicalCostUnits!==undefined||layer.costUnits!==undefined){
  const reference=requireReferencePerformanceTempo(p.score),provided=validateReferencePerformanceTempo(layer.referencePerformanceTempo),units=rr?(layer.costUnits??layer.physicalCostUnits):layer.physicalCostUnits;
  const profileValid=rr||isObject(layer.profileIdentity)&&typeof layer.profileIdentity.id==='string'&&typeof layer.profileIdentity.version==='string';
  if(JSON.stringify(reference)!==JSON.stringify(provided)||JSON.stringify(layer.performanceClock)!==JSON.stringify(referencePerformanceClock(reference,p.score.ticksPerBeat))||layer.revision!==p.manifest.revision||layer.sourceBytesSha256!==p.manifest.semanticSha256||!profileValid||JSON.stringify(units)!==JSON.stringify(FINGER_PHYSICAL_COST_UNITS))fail('Finger layer performance reference/clock/source mismatch');
 }
 const notes=new Map(p.score.notes.map(n=>[n.id,n]));const actions=new Set<string>(),owners=new Set<string>();
 for(const a of layer.attacks){if(actions.has(a.id)||!Number.isInteger(a.finger)||a.finger<1||a.finger>5||!(rr?[2-a.pitch%2,4-a.pitch%2]:[1+a.pitch%2,3+a.pitch%2]).includes(a.row??NaN)||!Array.isArray(a.owners)||!a.owners.length)fail('Invalid finger action');actions.add(a.id);
 for(const owner of a.owners){const n=notes.get(owner.id);if(!n||owners.has(n.id)||a.pitch!==requirePitchedEvent(n).pitch.octave*12+requirePitchedEvent(n).pitch.pitchClass||a.hand!==n.hand||a.startTick!==n.startTick||owner.durationTicks!==n.durationTicks||owner.releaseTick!==n.startTick+n.durationTicks||layer.sourceOwnerToAttack[n.id]!==a.id)fail(`Finger owner mismatch: ${owner.id}`);owners.add(n!.id);}}
 if(owners.size!==notes.size||Object.keys(layer.sourceOwnerToAttack).length!==notes.size)fail('Incomplete finger coverage');
 if(layer.reviewedFingerAuthority!==undefined){
  const authority=layer.reviewedFingerAuthority;if(!isObject(authority)||authority.kind!=='explicit-operator-review'||!Array.isArray(authority.constraints))fail('Invalid provided finger authority');
  const reviewed=new Set<string>();for(const q of (authority as Record<string,any>).constraints){const n=notes.get(q.id),a=layer.attacks.find(a=>a.id===layer.sourceOwnerToAttack[q.id]);if(!n||!a||reviewed.has(q.id)||q.pitch!==a.pitch||q.startTick!==n.startTick||q.durationTicks!==n.durationTicks||q.hand!==a.hand||q.finger!==a.finger||q.row!==undefined&&q.row!==a.row)fail('Provided finger authority/source mismatch');reviewed.add(q.id);}
  validateOperatorFingerJournal(authority,{revision:p.manifest.revision,sourceHash:layer.sourceHash,profileId:layer.profileId,profileSha256:layer.profileSha256});
 }

 if(layer.providedAuthorityProjection!==undefined){
  const q=layer.providedAuthorityProjection as Record<string,any>,authority=layer.reviewedFingerAuthority as Record<string,any>;
  if(!rrCore||!isObject(q)||q.version!=='retained-provided-owner-authority-v1'||!authority||q.retainedCount!==authority.constraints.length||['candidateId','profileId','profileSha256','sourceHash','sourceBytesSha256','inputSha256'].some(key=>q[key]!==layer[key])||q.targetRevision!==p.manifest.revision||JSON.stringify(q.referencePerformanceTempo)!==JSON.stringify(layer.referencePerformanceTempo)||!isObject(q.retiredReviewAuthority)||!Array.isArray(q.retiredReviewAuthority.retiredOwnerIds)||typeof q.retiredReviewAuthority.reason!=='string'||['originalPackageSha256','originalRevision','originalLayerSha256','originalAuthoritySha256','rawCalculatedLayerSha256','calculatedPlanFileSha256','retainedConstraintsSha256'].some(key=>typeof q[key]!=='string'||!/^[a-f0-9]{64}$/.test(q[key])))fail('Provided authority projection/provenance mismatch');
  const retired=q.retiredReviewAuthority.retiredOwnerIds as string[];if(new Set(retired).size!==retired.length||retired.some(id=>!notes.has(id)||authority.constraints.some((c:any)=>c.id===id)))fail('Retired provided authority/source mismatch');
 }
 for(const s of p.seats)if(s.ownerIds.some(id=>layer.sourceOwnerToAttack[id]!==s.actionId))fail(`Finger seat alias mismatch: ${s.id}`);
}
const digest=(value:unknown):value is string=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
const layoutId=(value:unknown):value is PhysicalKeyboardId=>value==='conventional-piano'||value==='janko-four-row';
function freezeSource(value:unknown):void{if(value&&typeof value==='object'){for(const child of Object.values(value))freezeSource(child);Object.freeze(value);}}
const linkedViews=new WeakMap<ScorePackage,Map<PhysicalKeyboardId,ScorePackage>>();
interface HeadObjects {objects:WeakSet<object>;count:number}
interface WrittenHeadEvidence extends HeadObjects {signature:string;pages:string[];heads:Map<string,string[]>}
const writtenHeadEvidence=new WeakMap<ScorePackage,WrittenHeadEvidence>();
function headSignature(p:ScorePackage,allowed?:WeakSet<object>,capture?:HeadObjects):string {
 const seen=new Set<object>(),literal=(value:unknown):unknown=>{
  if(value===null||value===undefined)return [String(value)];
  if(['string','boolean','number'].includes(typeof value)){if(typeof value==='number'&&!Number.isFinite(value))fail('Invalid head binding value');return [typeof value,value];}
  if(typeof value!=='object'||seen.has(value))fail('Nonliteral head binding');seen.add(value);
  // Actual imports/clones alone capture membership. A replacement Proxy may
  // imitate descriptors while presenting different values through get traps.
  if(allowed&&!allowed.has(value))fail('Replaced head binding object');
  if(capture&&!capture.objects.has(value)){capture.objects.add(value);capture.count++;}
  const array=Array.isArray(value),prototype=Object.getPrototypeOf(value);
  if(prototype!==(array?Array.prototype:Object.prototype)&&prototype!==null)fail('Nonliteral head binding prototype');
  if(Object.getOwnPropertySymbols(value).length)fail('Nonliteral head binding symbol');
  const entries=Object.entries(Object.getOwnPropertyDescriptors(value)).sort(([a],[b])=>a.localeCompare(b));
  const result=[array?'array':'object',entries.map(([key,descriptor])=>{if(!('value'in descriptor))fail('Nonliteral head binding accessor');return[key,literal(descriptor.value)];})];
  seen.delete(value);return result;
 };
 return JSON.stringify(['score','sourceScore','sourceSha256','sourceRevision','seats','renderingRecipe','calculationContext',
  'preparationIdentity','keyboardLayout','availablePresentations','calculatedHandReceipt','manifest','collectionManifest',
  'fingerLayer','transposition','annotationGeometry','personalAnnotationInkPolicy','profileId','profileSha256','effectiveHandSha256'].map(key=>{
   const descriptor=Object.getOwnPropertyDescriptor(p,key);if(descriptor&&!('value'in descriptor))fail('Nonliteral head binding accessor');
   return[key,literal(descriptor?.value)];
 }));
}
function captureHeadBinding(p:ScorePackage):HeadObjects&{signature:string}{
 const capture:HeadObjects={objects:new WeakSet([p.pages]),count:1};
 return {...capture,signature:headSignature(p,undefined,capture),count:capture.count};
}
function recordWrittenHeads(p:ScorePackage,actual:readonly PresentationWrittenHead[]):void {
 const heads=new Map<string,string[]>();
 if(actual.length!==p.seats.length)fail('Incomplete actual written-head ledger');
 for(const h of actual){const s=p.seats.find(s=>s.id===h.seatId);
  if(!s||heads.has(s.id)||s.page!==h.page||s.system!==h.system||s.x!==h.x||s.baseline!==h.baseline||s.fontSize!==h.fontSize||s.pitchDigit!==h.digit||
   JSON.stringify([...s.ownerIds].sort())!==JSON.stringify(h.ownerIds)||!h.headIds.length||h.headIds.some(id=>typeof id!=='string'||!id))fail('Actual written-head tuple differs');
  heads.set(s.id,[...h.headIds]);
 }
 writtenHeadEvidence.set(p,{...captureHeadBinding(p),pages:[...p.pages],heads});
}
/** Only fully admitted actual replay can register evidence. Unknown, mutated
 * or stale-font packages retain the exact replay fallback. No caller can attach
 * an archive claim; copied IDs never expose the private record. */
export function admittedWrittenHeads(p:ScorePackage):ReadonlyMap<string,readonly string[]>|undefined {
 const evidence=writtenHeadEvidence.get(p);if(!evidence)return;
 try{
  if(evidence.signature!==headSignature(p,evidence.objects))return;
  const descriptor=Object.getOwnPropertyDescriptor(p,'pages');if(!descriptor||!('value'in descriptor))return;
  const pages=descriptor.value;
  if(!evidence.objects.has(pages)||!Array.isArray(pages)||Object.getPrototypeOf(pages)!==Array.prototype||pages.length!==evidence.pages.length||Reflect.ownKeys(pages).length!==pages.length+1)return;
  for(let i=0;i<evidence.pages.length;i++){const descriptor=Object.getOwnPropertyDescriptor(pages,String(i));if(!descriptor||!('value'in descriptor)||descriptor.value!==evidence.pages[i])return;}
  const policy=annotationInkPolicyFor(p);if(policy)assertAnnotationInkPolicyReady(policy);
  return new Map([...evidence.heads].map(([seat,ids])=>[seat,[...ids]]));
 }catch{return;}
}
export async function validateLayerAsync(value:unknown,p:ScorePackage,options:{history?:boolean;requireCurrent?:boolean}={}):Promise<FingerLayer>{
 if(p.manifest.version===3)fail('Piano finger choices cannot be attached to this reading score');
 if(!isObject(value))fail('Invalid finger layer');
 if(value.version===PIANO_ASSIGNMENT_VERSION){
  if(!p.keyboardLayout||!p.sourceScore||!p.sourceSha256)fail('Piano assignments have no immutable source/layout binding');
  const checked=await validatePianoAssignments(value,normalizeHandPlanningInput(pianoPlanningScore(p)),{
   sourceHash:p.manifest.layerSourceHash??p.sourceSha256,sourceBytesSha256:p.sourceSha256,revision:p.manifest.revision,
   layout:p.keyboardLayout,effectiveHands:Object.fromEntries(p.score.notes.map(n=>[n.id,requirePianoEvent(n).hand]))});
  if(checked.profileId!==p.profileId||checked.profileSha256!==p.profileSha256||checked.effectiveHandSha256!==p.effectiveHandSha256)
   fail('Piano assignment presentation/profile binding differs');
  for(const seat of p.seats)if(seat.ownerIds.some(id=>checked.sourceOwnerToAttack[id]!==seat.actionId))fail('Piano assignment finger seat alias mismatch');
  return checked;
 }
 if(value.plannerVersion===RR_TEMPORAL_LAYER_PLANNER){
  if(p.keyboardLayout!=='janko-four-row'||!p.sourceScore||!p.sourceSha256||typeof value.candidateId!=='string')fail('Temporal four-row layer has no immutable source/layout binding');
  const checked=await validateRRTemporalFingerLayer(value,normalizeHandPlanningInput(pianoPlanningScore(p)),{
   sourceHash:p.manifest.layerSourceHash??p.sourceSha256,sourceBytesSha256:p.sourceSha256,revision:p.manifest.revision,
   candidateId:value.candidateId,effectiveHands:Object.fromEntries(p.score.notes.map(n=>[n.id,requirePianoEvent(n).hand]))});
  if(checked.profileId!==p.profileId||checked.profileSha256!==p.profileSha256||checked.effectiveHandSha256!==p.effectiveHandSha256)fail('Temporal four-row presentation/profile binding differs');
  for(const seat of p.seats)if(seat.ownerIds.some(id=>checked.sourceOwnerToAttack[id]!==seat.actionId))fail('Temporal four-row finger seat alias mismatch');
  return checked;
 }
 if(value.version==='physical-contact-finger-layer-v2'){
  if(p.keyboardLayout!=='conventional-piano'||!p.sourceScore||!p.sourceSha256)fail('Conventional layer has no immutable source binding');
  const checked=await validateConventionalFingerLayer(value,normalizeHandPlanningInput(pianoPlanningScore(p)),{
   sourceHash:p.manifest.layerSourceHash??p.sourceSha256,sourceBytesSha256:p.sourceSha256,
   // Imports retain known historical contracts. New conventional calculations
   // can require the corrected common-hand action replay explicitly.
   effectiveHands:Object.fromEntries(p.score.notes.map(n=>[n.id,requirePianoEvent(n).hand])),requireCurrent:options.requireCurrent??false});
  if(checked.profileId!==p.profileId||checked.profileSha256!==p.profileSha256||checked.effectiveHandSha256!==p.effectiveHandSha256)fail('Conventional presentation/profile binding differs');
  for(const seat of p.seats)if(seat.ownerIds.some(id=>checked.sourceOwnerToAttack[id]!==seat.actionId))fail('Conventional finger seat alias mismatch');
  return checked;
 }
 if(value.version!=='physical-attack-finger-layer-v1'||p.keyboardLayout==='conventional-piano')fail('Finger layer source/version mismatch');
 const layer=value as FingerLayer;validateLayer(layer,p);
 const journal=(layer.reviewedFingerAuthority as Record<string,any>|undefined)?.operatorUpdates;
 for(const update of journal??[])if(await hashBytes(JSON.stringify(update.baselineReviewedFingerAuthority))!==update.baselineAuthoritySha256)fail('Operator baseline authority digest mismatch');
 const projection=layer.providedAuthorityProjection as Record<string,any>|undefined;
 if(projection){const raw={...layer};delete raw.reviewedFingerAuthority;delete raw.providedAuthorityProjection;const authority=layer.reviewedFingerAuthority as Record<string,any>;
  if(await hashBytes(JSON.stringify(raw,null,2)+'\n')!==projection.rawCalculatedLayerSha256||await hashBytes(JSON.stringify(authority.constraints))!==projection.retainedConstraintsSha256)fail('Provided authority projection digest mismatch');}
 // An early-format layer names no profile; it stands on a view whose fingers are the edition's own fixed ones.
 const unprofiled=layer.profileId===undefined&&layer.profileSha256===undefined&&p.profileId===FIXED_PAGES_PROFILE;
 if(p.manifest.version===2&&!options.history&&!unprofiled&&(layer.profileId!==p.profileId||layer.profileSha256!==p.profileSha256))fail('Linked Jankó profile differs');
 return layer;
}
/** Only performing-hand editorial fields may differ from the immutable source. */
function musicalSourceProjection(score:QuantizedGridScore):unknown{
 const q=structuredClone(score);
 for(const n of q.notes){delete (n as Partial<typeof n>).hand;delete n.editorialHand;delete n.handInference;}
 for(const e of q.writtenPresentation?.events.notes??[]){if(e.overrides){delete e.overrides.hand;delete e.overrides.editorialHand;delete e.overrides.handInference;if(!Object.keys(e.overrides).length)delete (e as Partial<typeof e>).overrides;}}
 return q;
}
export function pianoPlanningScore(p:Pick<ScorePackage,'sourceScore'|'score'|'sourceSha256'|'manifest'|'calculationContext'>):QuantizedGridScore {
 return scoreWithCalculationContext(p.sourceScore??p.score,p.calculationContext,p.sourceSha256??p.manifest.semanticSha256);
}
export async function handDigest(source:QuantizedGridScore,effective:QuantizedGridScore,checkSource=true):Promise<string>{
 const byId=new Map(effective.notes.map(n=>[n.id,n.hand]));
 // Legacy reading must not acquire the planner's terminal-repeat restrictions.
 if(!checkSource){const groups=new Map<string,typeof source.notes>();
  for(const event of source.notes){const n=requirePianoEvent(event),id=`${n.startTick}:${n.pitch.octave*12+n.pitch.pitchClass}`;groups.set(id,[...(groups.get(id)??[]),n]);}
  const attacks=[...groups.values()].sort((a,b)=>a[0].startTick-b[0].startTick||(requirePitchedEvent(a[0]).pitch.octave*12+requirePitchedEvent(a[0]).pitch.pitchClass)-(requirePitchedEvent(b[0]).pitch.octave*12+requirePitchedEvent(b[0]).pitch.pitchClass));
  return hashBytes(JSON.stringify(attacks.flatMap(a=>a.slice().sort((a,b)=>a.id.localeCompare(b.id)).map(o=>[o.id,byId.get(o.id)]))));}
 const input=normalizeHandPlanningInput(source),personal=effective.performingHandPresentation?.personalRequirements;
 if(personal?.length){validateDerivedHandPresentation(effective);input.personalHandRequirements=personal.map(q=>({ownerId:q.ownerId,hand:q.hand,guard:{...q.guard},assignmentId:q.authorityId}));}
 const requirements=compilePlanningRequirements(input);
 // A hand-less owner may share a key with a handed one; only two different hands conflict.
 for(const a of input.gestures.flatMap(g=>g.attacks)){const hands=new Set(a.owners.flatMap(o=>byId.get(o.id)??[]));
  if(hands.size>1||requirements.attackHands[a.id]&&!hands.has(requirements.attackHands[a.id]))fail('Linked performing hands contradict a source instruction or physical alias');}
 return hashBytes(JSON.stringify(input.gestures.flatMap(g=>g.attacks.flatMap(a=>a.owners.map(o=>[o.id,byId.get(o.id)])))));
}
export async function selectPresentation(p:ScorePackage,id:PhysicalKeyboardId):Promise<ScorePackage>{
 if(p.manifest.version===3)fail('This score has no piano keyboard presentation.');
 if(!layoutId(id))fail('Unsupported keyboard layout');
 if(p.manifest.version===1){if(id!=='janko-four-row')fail('This package has no conventional-keyboard presentation');return p;}
 const view=linkedViews.get(p)?.get(id);if(!view)fail('This package has no compatible presentation for the selected keyboard');return view;
}
export function importPackage(bytes:Uint8Array,options:PackageReadOptions={}):Promise<ScorePackage>{return admitPackage(bytes,options,false);}
/** The content a saved edition carries: its source, the hands each keyboard
 * view shows and its finger layers, with every member hash and source binding
 * checked. Unlike importPackage it does not replay a calculated edition's
 * pages, so the result is for re-engraving only and is never displayed. */
export function readEditionContent(bytes:Uint8Array,options:PackageReadOptions={}):Promise<ScorePackage>{return admitPackage(bytes,options,true);}
/** A saved edition the reader refused (most often because its pages no
 * longer reproduce under the pinned engraving: an earlier shared engraving
 * policy, say) is engraved again when the player opens it, as long as its
 * content still reads with every member hash, source, seat and hand check. Work that walks other
 * scores than the one asked for must not fail because of it. Returns the
 * edition's content when `refusal` is such a refusal: a linked edition whose
 * members, source and hands still read, or a reading archive (single or
 * dual) whose members, source and policy still read. Anything else (damaged, foreign,
 * cancelled) returns undefined and keeps its own refusal. The content is for
 * reading the edition's own facts and journals, never for display. */
export async function editionNeedsEngravingAgain(bytes:Uint8Array,refusal:unknown,execution?:ReadingExecution):Promise<ScorePackage|undefined>{
 if((refusal as Error)?.name==='AbortError')return;
 // With an execution, reading the content (a dual reading draws both views) yields and can be stopped.
 try{const content=await readEditionContent(bytes,{allowLegacyTempo:true,...(execution?{execution}:{})}),m=content.collectionManifest??content.manifest;
  return m.version===2&&!!m.sourceScore&&!!content.sourceScore||m.version===3&&(m.reading?.version==='instrument-reading-package-v1'||m.reading?.version==='instrument-reading-package-v2')?content:undefined;}
 catch(error){if(execution&&(error as Error)?.name==='AbortError')throw error;return;}
}
export interface PackageReadOptions {allowLegacyTempo?:boolean;keyboardLayout?:PhysicalKeyboardId;execution?:ReadingExecution}
/** Receipts for reading archives this build already replayed, keyed by
 * archive digest. Derived only: a missing or refused receipt replays again. */
export interface ReadingAdmissionReceipts {get(archiveSha256:string):Promise<ReadingAdmissionReceipt|undefined>;put(archiveSha256:string,receipt:ReadingAdmissionReceipt):void}
let readingReceipts:ReadingAdmissionReceipts|undefined;
export function useReadingAdmissionReceipts(receipts:ReadingAdmissionReceipts|undefined){readingReceipts=receipts;}
let calculatedEvidence:CalculatedAdmissionEvidenceStore|undefined;
/** Evidence for calculated editions this build already replayed; see {@link CalculatedAdmissionEvidence}. */
export function useCalculatedAdmissionEvidence(store:CalculatedAdmissionEvidenceStore|undefined){calculatedEvidence=store;}
async function admitPackage(bytes:Uint8Array,options:PackageReadOptions,contentOnly:boolean):Promise<ScorePackage>{
 options={...options};const execution=options.execution?capturedReadingExecution(options.execution):undefined;checkReadingExecution(execution);
 if(bytes.length>50_000_000)fail('Package exceeds 50 MB');let total=0;const members=new Set<string>();
 const files=unzipSync(bytes,{filter:f=>{total+=f.originalSize;if(members.has(f.name)||members.size>=10000)fail('Duplicate or excessive archive members');members.add(f.name);if(f.originalSize>20_000_000||total>100_000_000||!/^[A-Za-z0-9_./-]+$/.test(f.name)||f.name.includes('..')||f.name.startsWith('/'))fail('Unsafe/oversized archive');return true;}});
 const parse=(name:string)=>{if(!files[name])fail(`Missing ${name}`);try{return JSON.parse(strFromU8(files[name]));}catch{return fail(`Invalid JSON: ${name}`);}};
 let m=parse('manifest.json') as Manifest;
 if(m.format!=='iso-score'||![1,2,3].includes(m.version)||!isObject(m.files)||!Array.isArray(m.pages)||!m.pages.length||!isObject(m.metadata)||typeof m.metadata.title!=='string'||typeof m.metadata.composer!=='string'||!Array.isArray(m.metadata.provenance)||m.metadata.provenance.some(v=>typeof v!=='string')||m.metadata.variant!==undefined&&typeof m.metadata.variant!=='string'||!Array.isArray(m.notices)||!m.files[m.font])fail('Unsupported/incomplete ISO package');
 // Unzip and this owned digest capture happen before the first member await.
 // A later caller mutation cannot bind different bytes to admitted dual ink.
 const dualArchiveSha256=m.version===3&&m.reading?.version==='instrument-reading-package-v2'?await hashBytes(new Uint8Array(bytes)):undefined;
 const receipts=m.version===3&&m.reading?.version==='instrument-reading-package-v1'?readingReceipts:undefined,
  receiptArchiveSha256=receipts?await hashBytes(new Uint8Array(bytes)):undefined;
 // Copied before the first await, hashed only for a calculated presentation.
 const evidence=m.version===2&&!contentOnly?calculatedEvidence:undefined,evidenceBytes=evidence?new Uint8Array(bytes):undefined;
 let evidenceArchiveSha256:Promise<string>|undefined;const madeEvidence:[string,CalculatedAdmissionEvidence][]=[];
 checkReadingExecution(execution);if(Object.keys(files).length!==Object.keys(m.files).length+1)fail('Unlisted package content');
 for(const [name,d] of Object.entries(m.files)){if(!/^[A-Za-z0-9_./-]+$/.test(name)||name.includes('..')||!digest(d)||!files[name]||await hashBytes(files[name])!==d)fail(`Integrity mismatch: ${name}`);checkReadingExecution(execution);}
 let referenceMidi:Uint8Array|undefined;
 if(m.referenceMidi!==undefined){if(!isObject(m.referenceMidi)||m.referenceMidi.file!=='reference.mid'||Object.keys(m.referenceMidi).length!==1||!m.files['reference.mid'])fail('Invalid/missing reference MIDI descriptor');referenceMidi=files['reference.mid'];validateReferenceMidi(referenceMidi);}
 if(m.semanticSha256!==m.files['score.json']||m.revision!==m.semanticSha256)fail('Semantic revision mismatch');
 if(m.version===3){
  if(options.keyboardLayout)fail('This score has no piano keyboard presentation.');
  const receipt=receiptArchiveSha256?await receipts!.get(receiptArchiveSha256).catch(()=>undefined):undefined;checkReadingExecution(execution);
  const admitted=execution&&m.reading?.version==='instrument-reading-package-v2'?await (contentOnly?dualReadingContentAsync:admitDualReadingContentAsync)(m,files,execution):admitReadingContent(m,files,receipt,contentOnly),{score,pages,reading}=admitted;
  if('manifest' in admitted)m=admitted.manifest as Manifest;checkReadingExecution(execution);
  function* passiveChecks():Generator<PreparationStage,void,void>{
   if(reading.dual){for(const view of Object.values(reading.dual.views))for(const[page,svg]of view.pages.entries()){passiveSvg(svg,[],page);yield 'paint';}}
   else for(const[page,svg]of pages.entries()){passiveSvg(svg,[],page);yield 'paint';}
   m.notices.forEach(name=>{if(!files[name])fail('Missing notice');});yield 'commit';
  }
  if(execution)await drainReadingChecks(passiveChecks(),execution);else for(const _ of passiveChecks()){}
  freezeSource(score);
  const archiveSha256=dualArchiveSha256??receiptArchiveSha256??await hashBytes(bytes);
  // Content read without comparing pages proves nothing about the stored ones.
  if(receiptArchiveSha256&&!receipt&&!contentOnly)receipts!.put(receiptArchiveSha256,{version:'reading-admission-receipt-v1',geometryEvidence:reading.geometryEvidence});
  checkReadingExecution(execution);if(reading.dual&&!contentOnly)admittedDualArchives.set(m,{score,sha256:archiveSha256});
  return {manifest:m,score,seats:[],pages,files,reading,archiveSha256,sourceScore:score,sourceRevision:m.revision,sourceSha256:m.semanticSha256,
   fingerEligibility:{eligible:false,reason:'This score is available for musical reading.'}};
 }
 if(m.reading!==undefined)fail('Legacy piano packages cannot carry a musical reading descriptor.');
 let pagesLackRepeats=false;
 async function presentation(viewManifest:Manifest,scoreName:string,seatsName:string,fingersName?:string,context:Partial<ScorePackage>={}):Promise<ScorePackage>{
  const m=viewManifest;
 const stored=normalizeLegacyScoreEvents(parse(scoreName) as QuantizedGridScore),seats=parse(seatsName) as Seat[];
 // A linked score saved before its composer's repeats were encoded shows
 // them; its stored bytes, identity and hands stay as saved.
 const score=context.sourceSha256?withRepeats(stored,context.sourceSha256):stored;
 if(score.id!==m.scoreId||!Array.isArray(score.notes)||!Number.isInteger(score.ticksPerBeat)||score.ticksPerBeat<=0||!Number.isInteger(score.totalTicks)||!Array.isArray(seats))fail('Invalid semantic score');
 if(score.referencePerformanceTempo!==undefined)validateReferencePerformanceTempo(score.referencePerformanceTempo);else if(!options.allowLegacyTempo&&(m.version===1||!!fingersName&&!!files[fingersName]))requireReferencePerformanceTempo(score);
 const notes=new Map(score.notes.map(n=>[n.id,n]));if(notes.size!==score.notes.length)fail('Duplicate source owner');
 // A note the source gives no performing hand stays hand-less; the player may assign it a personal hand.
 for(const n of score.notes){if(!isPitchedEvent(n))fail('Legacy piano packages require pitched events');if(!n.id||n.hand!==undefined&&!['LH','RH'].includes(n.hand)||!Number.isInteger(n.startTick)||!Number.isInteger(n.durationTicks)||n.startTick<0||n.durationTicks<=0||n.startTick+n.durationTicks>score.totalTicks||!Number.isInteger(n.pitch?.octave)||!Number.isInteger(n.pitch?.pitchClass)||n.pitch.pitchClass<0||n.pitch.pitchClass>11)fail('Invalid pitch/timing/hand');}
 const pages:string[]=[];
 function* pianoChecks():Generator<PreparationStage,void,void>{
 const seen=new Set<string>(),covered=new Set<string>();
 for(const s of seats){if(seen.has(s.id)||!s.id||!Number.isInteger(s.page)||s.page<0||s.page>=m.pages.length||!Array.isArray(s.ownerIds)||!s.ownerIds.length||s.ownerIds.some(id=>!notes.has(id))||!s.actionId||!s.contactId||s.contactId!==s.actionId||![s.x,s.baseline,s.fontSize].every(Number.isFinite))fail('Invalid source-linked seat');seen.add(s.id);s.ownerIds.forEach(id=>covered.add(id));
 const n=requirePitchedEvent(notes.get(s.ownerIds[0])!);if(!s.continuation&&s.actionId!==`${n.startTick}:${n.pitch.octave*12+n.pitch.pitchClass}`)fail('Wrong physical action seat');
 // One head is one key: a hand-less owner may share it, but never two different hands.
 if(new Set(s.ownerIds.flatMap(id=>notes.get(id)!.hand??[])).size>1||s.ownerIds.some(id=>{const q=requirePitchedEvent(notes.get(id)!);return q.pitch.octave!==n.pitch.octave||q.pitch.pitchClass!==n.pitch.pitchClass||q.startTick!==n.startTick;}))fail('Incompatible shared-head identities');yield 'geometry';}
 if(covered.size!==notes.size)fail('Incomplete source-owner seating');
 for(const [i,name] of m.pages.entries()){if(!files[name])fail('Missing vector page');const svg=strFromU8(files[name]);passiveSvg(svg,seats,i);pages.push(svg);yield 'paint';}
 m.notices.forEach(name=>{if(!files[name])fail('Missing notice');});yield 'commit';
 }
 if(execution)await drainReadingChecks(pianoChecks(),execution);else for(const _ of pianoChecks()){}
 // Pages engraved before those repeats were known carry no repeat sign.
 if(score!==stored&&!pages.some(svg=>svg.includes('data-repeat="repeat-end"')))pagesLackRepeats=true;

  const p:ScorePackage={manifest:m,score,seats,pages,files,archiveSha256:await hashBytes(bytes),...(referenceMidi?{referenceMidi}:{}),...context,fingerEligibility:await fingerEligibility(m,seats,pages)};
  if(fingersName&&files[fingersName])p.fingerLayer=await validateLayerAsync(parse(fingersName),p);
  return p;
 }
 if(m.version===1){if(m.transposition!==undefined)fail('Transposition requires its linked effective source and retained original.');const p=await presentation(m,'score.json','seats.json','fingers.json');
  if(p.score.performingHandPresentation||p.score.notes.some(n=>n.derivedHand)||m.calculatedHandReceipt||m.engineVersion===CALCULATED_HAND_SCORE_RENDERING_ENGINE)fail('Calculated editions require an independently preserved linked original source.');
  p.keyboardLayout='janko-four-row';p.availablePresentations=['janko-four-row'];p.sourceScore=p.score;p.sourceRevision=m.revision;p.sourceSha256=m.semanticSha256;
  p.effectiveHandSha256=await handDigest(p.score,p.score,false);
  if(typeof p.fingerLayer?.profileId==='string')p.profileId=p.fingerLayer.profileId;
  if(typeof p.fingerLayer?.profileSha256==='string')p.profileSha256=p.fingerLayer.profileSha256;
  return options.keyboardLayout?selectPresentation(p,options.keyboardLayout):p;
 }
 if(!m.sourceScore||!digest(m.sourceRevision)||m.sourceRevision!==m.sourceSha256||m.files[m.sourceScore]!==m.sourceSha256||!layoutId(m.keyboardLayout)||!isObject(m.presentations)||!Object.keys(m.presentations).length)fail('Unsupported/incomplete linked ISO package');
 const source=withRepeats(normalizeLegacyScoreEvents(parse(m.sourceScore) as QuantizedGridScore),m.sourceSha256!);
 if(source.id!==m.scoreId||!Array.isArray(source.notes)||!Number.isInteger(source.ticksPerBeat)||!Number.isInteger(source.totalTicks))fail('Invalid immutable source score');
 const transposition=m.transposition===undefined?undefined:await admitScoreTransposition(m.transposition,files,files[m.sourceScore],execution,contentOnly);
 if(transposition&&JSON.stringify(m.referenceMidi)!==JSON.stringify((transposition.original.collectionManifest??transposition.original.manifest).referenceMidi))fail('Transpose reference attachment differs from its original archive.');
 const calculationContext=m.calculationContext===undefined?undefined:validatePianoCalculationContext(m.calculationContext,m.sourceSha256!,source);
 if(source.performingHandPresentation||source.notes.some(n=>n.derivedHand))fail('Immutable original source cannot be substituted by a calculated display projection.');
 freezeSource(source);
 const views=new Map<PhysicalKeyboardId,ScorePackage>(),actualHeads=new Map<ScorePackage,readonly PresentationWrittenHead[]>();
 for(const [key,raw]of Object.entries(m.presentations)){
  if(!layoutId(key)||!isObject(raw)||raw.layoutId!==key||typeof raw.score!=='string'||typeof raw.seats!=='string'||!Array.isArray(raw.pages)||!raw.pages.length||raw.pages.some((x:unknown)=>typeof x!=='string'||!m.files[x])||
   !digest(raw.revision)||m.files[raw.score]!==raw.revision||!m.files[raw.seats]||typeof raw.profileId!=='string'||!raw.profileId||!digest(raw.profileSha256)||!digest(raw.effectiveHandSha256)||!digest(raw.layerSourceHash)||typeof raw.engineVersion!=='string'||!raw.engineVersion||
   raw.fingers!==undefined&&(typeof raw.fingers!=='string'||!m.files[raw.fingers])||raw.renderingRecipe!==undefined&&(typeof raw.renderingRecipe!=='string'||!m.files[raw.renderingRecipe])||raw.calculatedHandReceipt!==undefined&&(typeof raw.calculatedHandReceipt!=='string'||!m.files[raw.calculatedHandReceipt]))fail('Unsupported linked presentation descriptor');
  const d=raw as PresentationDescriptor;
  const viewContext=d.calculationContext===undefined?calculationContext:d.calculationContext===null?undefined:validatePianoCalculationContext(d.calculationContext,m.sourceSha256!,source),
    planningSource=scoreWithCalculationContext(source,viewContext,m.sourceSha256!);
  if(planningSource.referencePerformanceTempo!==undefined)validateReferencePerformanceTempo(planningSource.referencePerformanceTempo);else if(d.fingers&&!options.allowLegacyTempo)requireReferencePerformanceTempo(planningSource);
  const viewManifest:Manifest={...m,revision:d.revision,semanticSha256:d.revision,keyboardLayout:key,profileId:d.profileId,profileSha256:d.profileSha256,effectiveHandSha256:d.effectiveHandSha256,layerSourceHash:d.layerSourceHash,engineVersion:d.engineVersion,pages:d.pages.slice(),renderingRecipe:d.renderingRecipe,preparationIdentity:d.preparationIdentity,calculatedHandReceipt:d.calculatedHandReceipt};
  if(viewContext)viewManifest.calculationContext=viewContext;else delete viewManifest.calculationContext;
  const p=await presentation(viewManifest,d.score,d.seats,d.fingers,{sourceScore:source,sourceRevision:m.sourceRevision,sourceSha256:m.sourceSha256,keyboardLayout:key,profileId:d.profileId,profileSha256:d.profileSha256,effectiveHandSha256:d.effectiveHandSha256,collectionManifest:m,...(transposition?{transposition:transposition.envelope,transpositionOriginal:transposition.original}:{}),...(viewContext?{calculationContext:viewContext}:{})});
  // Context is an explicit known field, never a blanket exclusion of source tempo.
  if(viewContext&&JSON.stringify(p.score.referencePerformanceTempo)!==JSON.stringify(viewContext.referencePerformanceTempo))
   fail('Linked presentation differs from its piano calculation reference');
  const derived=!!p.score.performingHandPresentation||p.score.notes.some(n=>n.derivedHand)||d.engineVersion===CALCULATED_HAND_SCORE_RENDERING_ENGINE||d.calculatedHandReceipt!==undefined;
  // A transposed edition shows exactly the hands its envelope names: the
  // score's own, or the hands an earlier edition carried when engraved again.
  if(transposition){const map=transposition.envelope.handMaps[key];if(!map||map.some(o=>p.score.notes.find(n=>n.id===o.id)?.hand!==o.hand))fail('Transposed presentation differs from its selected owner-hand authority.');}
  if(derived){if(JSON.stringify(sourceFactsProjection(planningSource))!==JSON.stringify(sourceFactsProjection(p.score)))fail('Linked calculated presentation changes immutable musical source facts');}
  else if(JSON.stringify(musicalSourceProjection(planningSource))!==JSON.stringify(musicalSourceProjection(p.score)))fail('Linked presentation changes immutable musical source facts');
  if(await handDigest(source,p.score)!==d.effectiveHandSha256)fail('Linked effective-hand identity differs');
  if(d.renderingRecipe){p.renderingRecipe=validatePassiveScoreRenderingRecipe(parse(d.renderingRecipe),{sourceSha256:m.sourceSha256!});
   // An approved recipe made before the current shared policy refuses on
   // opening, so the reader engraves the edition again from its content.
   if(!contentOnly&&p.renderingRecipe.engineId===APPROVED_SCORE_RENDERING_ENGINE)validateScoreRenderingRecipe(p.renderingRecipe,{sourceSha256:m.sourceSha256!});}
  if(d.preparationIdentity!==undefined)p.preparationIdentity=await validatePianoPreparationIdentity(d.preparationIdentity,p);
  if(derived&&!d.calculatedHandReceipt)fail('Calculated edition lacks actual source/paint replay evidence.');
  if(derived&&!contentOnly){
   const evidenceKey=evidence?await calculatedAdmissionKey(await (evidenceArchiveSha256??=hashBytes(evidenceBytes!)),key):undefined;
   p.calculatedHandReceipt=await admitCalculatedHandEdition(p,parse(d.calculatedHandReceipt!),files[d.seats],heads=>actualHeads.set(p,heads),execution,
    evidence&&evidenceKey?{found:()=>evidence.get(evidenceKey),made:made=>madeEvidence.push([evidenceKey,made])}:undefined);p.annotationGeometry=p.calculatedHandReceipt.annotationGeometry;}
  views.set(key,p);
 }
 if(transposition&&Object.keys(transposition.envelope.handMaps).sort().join()!==[...views.keys()].sort().join())fail('Transpose hand maps differ from actual presentations.');
 // Opening a score whose pages lack its repeat signs engraves it again
 // from its content.
 if(pagesLackRepeats&&!contentOnly)throw new SavedPagesLackRepeats(m.sourceSha256!);
 const primary=views.get(m.keyboardLayout)!;
 const d=m.presentations[m.keyboardLayout]!;
 if(!primary||d.score!=='score.json'||d.seats!=='seats.json'||d.fingers!==('fingers.json' in m.files?'fingers.json':undefined)||
  ['revision','engineVersion','profileId','profileSha256','effectiveHandSha256','layerSourceHash','renderingRecipe','calculatedHandReceipt'].some(key=>(d as any)[key]!==((m as any)[key]))||JSON.stringify(d.pages)!==JSON.stringify(m.pages)||JSON.stringify(d.preparationIdentity)!==JSON.stringify(m.preparationIdentity)||
  d.calculationContext!==undefined&&JSON.stringify(d.calculationContext??undefined)!==JSON.stringify(m.calculationContext))fail('Linked primary presentation differs from root manifest');
 for(const p of views.values()){p.availablePresentations=[...views.keys()];linkedViews.set(p,views);}
 // Defer registration until every companion and outer root-manifest check
 // succeeds. A rejected import never publishes usable partial evidence.
 for(const [p,heads]of actualHeads)recordWrittenHeads(p,heads);
 for(const [key,made] of madeEvidence)evidence!.put(key,made);
 if(options.keyboardLayout)return selectPresentation(primary,options.keyboardLayout);
 return primary;
}
/** Ordinary reading preserves historical v1 pages/fingers without inventing
 * a performance reference. V2 supplied fingers and tempo-bound layers still
 * pass their strict source/clock validators; generation and practice are gated. */
export const importPackageForReading=(bytes:Uint8Array,execution?:ReadingExecution)=>importPackage(bytes,{allowLegacyTempo:true,...(execution?{execution}:{})});

/** A runtime-owned admission never exposes its canonical package or bytes.
 * Every copy preserves this realm's companion registry; another realm must
 * independently import its own archive. This is not a serialized certificate. */
export async function ownPackageAdmission(bytes:Uint8Array,options:{allowLegacyTempo?:boolean;execution?:ReadingExecution}={}):Promise<{
 retainedBytes:number;copy(keyboardLayout?:PhysicalKeyboardId):Promise<ScorePackage>
}> {
 const original=await importPackage(new Uint8Array(bytes),{allowLegacyTempo:!!options.allowLegacyTempo,...(options.execution?{execution:options.execution}:{})});
 const packages:ScorePackage[]=[],groups:Array<[ScorePackage,Array<[PhysicalKeyboardId,ScorePackage]>]>=[],seen=new Set<ScorePackage>();
 const visit=(p:ScorePackage)=>{
  if(seen.has(p))return;seen.add(p);packages.push(p);
  const views=linkedViews.get(p);if(views){groups.push([p,[...views]]);for(const view of views.values())visit(view);}
  if(p.transpositionOriginal)visit(p.transpositionOriginal);
 };
 visit(original);
 const graph={original,packages,groups};
 // Count each shared object/buffer once, without serializing duplicate paths
 // through the companion graph. This is a conservative material budget, not
 // a claim about the VM's object headers or string interning.
 const retainedBytes=conservativeMaterialBytes(graph)+packages.reduce((n,p)=>{const record=writtenHeadEvidence.get(p);return n+(record?record.signature.length*2+JSON.stringify([...record.heads]).length*2+record.pages.length*16+record.count*32:0);},0);
 return {retainedBytes,async copy(keyboardLayout){
  // A cached package cannot grant a stale or ambiguous font family authority.
  // In Node this also rereads and hashes the actual font file on every use.
  for(const p of packages){const policy=annotationInkPolicyFor(p);if(policy)await ensureAnnotationInkPolicyReady(policy);}
  // A dual source/view is already privately admitted and recursively frozen.
  // Do not copy megabytes of immutable scenes merely to discard them below.
  // This map is owned by the cold admission closure, never caller input; all
  // mutable wrappers and archive member buffers still cross structuredClone.
  const copyInputs=new Map(packages.map(p=>[p,p.reading?.dual?{...p,manifest:undefined,score:undefined,
   sourceScore:undefined,reading:undefined,pages:undefined}:p] as const)),
   clone=structuredClone({original:copyInputs.get(original)!,packages:packages.map(p=>copyInputs.get(p)!),
    groups:groups.map(([p,views])=>[copyInputs.get(p)!,views.map(([keyboard,view])=>[keyboard,copyInputs.get(view)!])])}) as typeof graph;
  // Dual scenes retain this realm's immutable actual preparation. A plain
  // clone cannot carry their source-owned projector registration. Only this
  // private cold-admission graph supplies that shared frozen source/context;
  // package wrappers and all member buffers remain independent copies.
  for(let i=0;i<packages.length;i++)if(packages[i].reading?.dual){
   const admitted=selectReadingNotation(packages[i],packages[i].reading!.dual!.notation);
   Object.assign(clone.packages[i],{manifest:admitted.manifest,score:admitted.score,sourceScore:admitted.score,
    reading:admitted.reading,pages:[...admitted.pages]});
  }
  for(const [p,views]of clone.groups)linkedViews.set(p,new Map(views));
  for(let i=0;i<packages.length;i++)if(packages[i].sourceScore&&Object.isFrozen(packages[i].sourceScore))freezeSource(clone.packages[i].sourceScore);
  for(let i=0;i<packages.length;i++){const p=packages[i],evidence=writtenHeadEvidence.get(p),binding=evidence?captureHeadBinding(clone.packages[i]):undefined;
   if(evidence&&binding?.signature===evidence.signature&&clone.packages[i].pages.every((page,j)=>page===evidence.pages[j]))
    writtenHeadEvidence.set(clone.packages[i],{...binding,pages:[...evidence.pages],heads:new Map([...evidence.heads].map(([seat,ids])=>[seat,[...ids]]))});
  }
  if(keyboardLayout){
   return selectPresentation(clone.original,keyboardLayout);
  }
  return clone.original;
 }};
}
export function archivePackage(manifest:Manifest,files:Record<string,Uint8Array>):Uint8Array{return zipSync({...files,'manifest.json':strToU8(JSON.stringify(manifest,null,2)+'\n')},{level:6});}
export const libraryOrder=(a:Metadata,b:Metadata)=>a.composer.localeCompare(b.composer)||((a.opus??Infinity)-(b.opus??Infinity)||0)||((a.piece??Infinity)-(b.piece??Infinity)||0)||a.title.localeCompare(b.title);

/** Explicit import may refresh metadata only; source/vector/font/assignments stay byte-identical. */
export const sameFrozenPayload=(a:Manifest,b:Manifest)=>a.revision===b.revision&&JSON.stringify(Object.entries(a.files).sort())===JSON.stringify(Object.entries(b.files).sort());

/** A narrow, explicit presentation refresh. Never admit general frozen-page changes. */
export function headerOnlyRefresh(a:ScorePackage,b:ScorePackage):boolean {
 const stable=(m:Manifest)=>{const {files,createdAt,...rest}=m;return JSON.stringify(rest);};
 if(stable(a.manifest)!==stable(b.manifest)||JSON.stringify(a.fingerEligibility)!==JSON.stringify(b.fingerEligibility))return false;
 const pageNames=new Set(a.manifest.pages),names=Object.keys(a.manifest.files);
 if(names.length!==Object.keys(b.manifest.files).length||names.some(n=>!b.manifest.files[n]||!pageNames.has(n)&&a.manifest.files[n]!==b.manifest.files[n]))return false;
 const split=(svg:string)=>{
  const doc=new DOMParser().parseFromString(svg,'image/svg+xml'),headers=Array.from(doc.getElementsByTagName('g')).filter(g=>g.getAttribute('id')==='page-header');
  if(headers.length!==1||headers[0].parentNode!==doc.documentElement||Array.from(headers[0].childNodes).some(n=>n.nodeType===1&&(n as unknown as Element).localName!=='text'))return;
  const match=svg.match(/<g id="page-header">[\s\S]*?<\/g>/);if(!match||match.index===undefined)return;
  const header=match[0],notices=[...header.matchAll(/    <text class="janko-source-notice"[^>]*>[^<]*<\/text>\n/g)].map(m=>m[0]);
  return {outside:svg.slice(0,match.index)+'HEADER'+svg.slice(match.index+header.length),fixed:header.replace(/    <text class="janko-source-notice"[^>]*>[^<]*<\/text>\n/g,''),notices};
 };
 let changed=false;for(let i=0;i<a.pages.length;i++){
  const x=split(a.pages[i]),y=split(b.pages[i]);if(!x||!y||x.outside!==y.outside||x.fixed!==y.fixed)return false;
  // Only truncate appended print notices; title, composer, instruction and retained lines stay exact.
  const prefix=(short:string[],long:string[])=>short.length<=long.length&&short.every((v,i)=>v===long[i]);
  if(!prefix(x.notices,y.notices)&&!prefix(y.notices,x.notices))return false;
  changed||=a.pages[i]!==b.pages[i];
 }
 return changed;
}

/** Reference changes are an import conflict, not a source or personal-state migration. */
export function referenceMidiDiffers(a:ScorePackage,b:ScorePackage):boolean {
 const x=a.collectionManifest??a.manifest,y=b.collectionManifest??b.manifest;
 return JSON.stringify(x.referenceMidi)!==JSON.stringify(y.referenceMidi)||x.files['reference.mid']!==y.files['reference.mid'];
}
