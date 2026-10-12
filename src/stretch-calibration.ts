import {STRETCH_CALIBRATION_PROTOCOL, STRETCH_CALIBRATION_PROFILE_SHA256, STRETCH_CALIBRATION_KEYBOARD_PROFILE,
 type StretchCalibrationSession, type StretchCalibrationGeometry, type StretchCalibrationPlan,
 type StretchCalibrationEntry, type StretchCalibrationContact, type StretchPairTrial,
 type PairStretchObservation, type PairSweepTerminal, type RelativeFingertipReachObservation,
 type ConditionalTripleBoundaryObservation, type ConditionalTripleUnavailableObservation,
 type StretchCalibrationProvenance} from '@hypermemetic-ai/fingering-calculator';

export type {StretchCalibrationSession, StretchCalibrationGeometry, StretchCalibrationPlan,
 StretchCalibrationEntry, StretchCalibrationContact, StretchPairTrial, PairStretchObservation,
 RelativeFingertipReachObservation, StretchCalibrationProvenance};
export const STRETCH_FILE='stretch-calibration-v1.json';
export const STRETCH_ARCHIVE_VERSION='viewer-stretch-calibration-archive-v1' as const;
export interface StretchArchive {version:typeof STRETCH_ARCHIVE_VERSION;sessions:StretchCalibrationSession[];activeSessionId:string|null}
export interface StretchFiles {read(name:string):Promise<Uint8Array|undefined>;write(name:string,bytes:Uint8Array):Promise<void>}
export interface StretchLoad {value:StretchArchive;raw?:Uint8Array;error?:string}
export type StretchPhase=NonNullable<StretchCalibrationSession['cursor']>['phase'];
export type StretchCursor=NonNullable<StretchCalibrationSession['cursor']>;
export type TripleObservation=ConditionalTripleBoundaryObservation|ConditionalTripleUnavailableObservation;
export type TripleApplicability='current'|'basis-withdrawn'|'basis-revised';
export interface StretchProgress {
 readings:{completed:number;omitted:number;total:4};
 sweeps:{completed:number;omitted:number;total:10;maximum:number;unavailable:number;coverageEdge:number;stopped:number;needsReview:number};
 triples:{completed:number;omitted:number;total:10;needsReview:number;coverageEdge:number;unavailable:number};
 judgments:number;effectiveJudgments:number;complete:boolean;
}
export interface StretchCurrent {
 phase:StretchPhase|null;slotId:string|null;trial:StretchPairTrial|null;
 pairSweep:StretchCalibrationPlan['pairSweeps'][number]|null;
 relativeSlot:StretchCalibrationPlan['relativeReachSlots'][number]|null;
 tripleSlot:StretchCalibrationPlan['tripleSlots'][number]|null;needsSetup:boolean;
}
export const initialStretchArchive=():StretchArchive=>({version:STRETCH_ARCHIVE_VERSION,sessions:[],activeSessionId:null});
const fail=(s:string):never=>{throw Error(s);};
const record=(v:unknown):Record<string,any>=>v!==null&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,any>:fail('Expected an object.');
const nonempty=(v:unknown):v is string=>typeof v==='string'&&v.trim().length>0;
const finite=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v);
const pitch=(v:unknown):v is number=>Number.isInteger(v)&&Number(v)>=0&&Number(v)<=127;
const pair=(v:unknown,n=2):boolean=>Array.isArray(v)&&v.length===n&&v.every((f,i)=>Number.isInteger(f)&&f>=1&&f<=5&&(i===0||f>v[i-1]));
const equal=(a:unknown,b:unknown):boolean=>JSON.stringify(a)===JSON.stringify(b);
function assert(test:unknown,message:string):asserts test {if(!test)fail(message);}
function exact(r:Record<string,any>,required:string[],optional:string[]=[]):void {
 assert(required.every(k=>k in r)&&Object.keys(r).every(k=>required.includes(k)||optional.includes(k)),'Unsupported fields.');
}
function canonical(value:unknown):unknown {
 if(typeof value==='number'){assert(Number.isFinite(value),'Nonfinite geometry number.');return value;}
 if(Array.isArray(value))return value.map(canonical);
 if(value!==null&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(k=>[k,canonical((value as Record<string,unknown>)[k])]));
 return value;
}
export async function canonicalGeometryHash(geometry:StretchCalibrationGeometry):Promise<string> {
 const {snapshotSha256:_,...snapshot}=geometry;
 const bytes=new TextEncoder().encode(JSON.stringify(canonical(snapshot)));
 const digest=await crypto.subtle.digest('SHA-256',bytes);
 return [...new Uint8Array(digest)].map(v=>v.toString(16).padStart(2,'0')).join('');
}
function validateGeometry(input:unknown):StretchCalibrationGeometry {
 const g=record(input);exact(g,['version','geometryId','keyboardId','profileId','profileSha256','units','snapshotSha256','reference','originMidiPitch','admittedMidiRange','actuators','surfaces']);
 assert(g.version==='sloping-calibration-geometry-v1'&&g.units==='mm','Unsupported geometry.');
 for(const k of ['geometryId','keyboardId','profileId','reference'])assert(nonempty(g[k]),'Missing geometry identity.');
 assert(g.profileId===STRETCH_CALIBRATION_KEYBOARD_PROFILE.profileId&&g.profileSha256===STRETCH_CALIBRATION_PROFILE_SHA256&&/^[a-f0-9]{64}$/.test(g.snapshotSha256),'Unsupported profile/hash binding.');
 assert(g.originMidiPitch===STRETCH_CALIBRATION_KEYBOARD_PROFILE.originMidiPitch&&Array.isArray(g.admittedMidiRange)&&g.admittedMidiRange.length===2&&g.admittedMidiRange.every(pitch)&&g.admittedMidiRange[0]<=g.admittedMidiRange[1],'Invalid admitted range.');
 assert(Array.isArray(g.actuators)&&Array.isArray(g.surfaces),'Missing geometry arrays.');
 const ids=new Set<string>(),pitches=new Set<number>();
 for(const a of g.actuators){record(a);exact(a,['id','midiPitch','bodyForm','originXmm','pressedMotion']);
  assert(nonempty(a.id)&&!ids.has(a.id)&&pitch(a.midiPitch)&&!pitches.has(a.midiPitch)&&a.midiPitch>=g.admittedMidiRange[0]&&a.midiPitch<=g.admittedMidiRange[1],'Invalid actuator identity.');ids.add(a.id);pitches.add(a.midiPitch);
  const form=STRETCH_CALIBRATION_KEYBOARD_PROFILE.forms.find(f=>(f.midiPitchClasses as readonly number[]).includes(a.midiPitch%12));
  assert(form&&a.bodyForm===form.form&&a.originXmm===(a.midiPitch-g.originMidiPitch)*13.75,'Actuator does not match its regularized form/lattice.');
  const m=record(a.pressedMotion);assert(['unknown','estimated-rigid-transform','measured-rigid-transform'].includes(m.kind),'Invalid motion evidence.');
  if(m.kind==='unknown')exact(m,['kind']);else{exact(m,['kind','transform','reference','uncertaintyMm']);assert(Array.isArray(m.transform)&&m.transform.length===16&&m.transform.every(finite)&&nonempty(m.reference)&&(m.uncertaintyMm===null||finite(m.uncertaintyMm)&&m.uncertaintyMm>=0),'Invalid pressed transform.');const t=m.transform;assert(t[12]===0&&t[13]===0&&t[14]===0&&t[15]===1,'Motion is not a homogeneous rigid transform.');for(let i=0;i<3;i++)for(let j=0;j<3;j++){let dot=0;for(let k=0;k<3;k++)dot+=t[i*4+k]*t[j*4+k];assert(Math.abs(dot-(i===j?1:0))<1e-8,'Motion rotation is not rigid.');}const determinant=t[0]*(t[5]*t[10]-t[6]*t[9])-t[1]*(t[4]*t[10]-t[6]*t[8])+t[2]*(t[4]*t[9]-t[5]*t[8]);assert(Math.abs(determinant-1)<1e-8,'Motion transform changes handedness.');}
 }
 assert(pitches.size===g.admittedMidiRange[1]-g.admittedMidiRange[0]+1,'Geometry does not cover its admitted range.');
 const surfaceIds=new Set<string>();
 for(const s of g.surfaces){record(s);exact(s,['id','actuatorId','midiPitch','row','xMinMm','xMaxMm','depthMinMm','depthMaxMm','heightAtNearMm','heightAtFarMm']);
  const a=g.actuators.find((v:any)=>v.id===s.actuatorId);
  assert(nonempty(s.id)&&!surfaceIds.has(s.id)&&a&&s.midiPitch===a.midiPitch&&[1,2,3,4].includes(s.row)&&s.row%2===s.midiPitch%2,'Invalid playable surface identity.');surfaceIds.add(s.id);
  assert(['xMinMm','xMaxMm','depthMinMm','depthMaxMm','heightAtNearMm','heightAtFarMm'].every(k=>finite(s[k]))&&s.xMinMm<s.xMaxMm&&s.depthMinMm<s.depthMaxMm,'Invalid playable terrace.');
  const terrace=STRETCH_CALIBRATION_KEYBOARD_PROFILE.forms.find(f=>f.form===a.bodyForm)?.playableTerraces.find(t=>t.row===s.row);
  assert(terrace&&s.xMinMm===a.originXmm-4.5&&s.xMaxMm===a.originXmm+4.5&&['depthMinMm','depthMaxMm','heightAtNearMm','heightAtFarMm'].every(k=>s[k]===terrace[k as keyof typeof terrace]),'Playable surface does not match the seeded terrace; tongues are excluded.');
 }
 for(const a of g.actuators){const rows=g.surfaces.filter((s:any)=>s.actuatorId===a.id).map((s:any)=>s.row).sort();assert(equal(rows,a.midiPitch%2?[1,3]:[2,4]),'Each actuator requires its two playable terraces.');}
 return g as StretchCalibrationGeometry;
}
function validateContact(c:unknown,g:StretchCalibrationGeometry):StretchCalibrationContact {
 const r=record(c);exact(r,['finger','actuatorId','midiPitch','row','keyState','location']);
 assert(Number.isInteger(r.finger)&&r.finger>=1&&r.finger<=5&&['resting-contact','depressed'].includes(r.keyState),'Invalid fingertip or key state.');
 const l=record(r.location),s=g.surfaces.find(v=>v.id===l.surfaceId);
 assert(s&&s.actuatorId===r.actuatorId&&s.midiPitch===r.midiPitch&&s.row===r.row,'Contact does not identify a playable surface.');
 const fraction=(n:unknown)=>finite(n)&&n>=0&&n<=1;
 if(l.kind==='surface-region'){exact(l,['kind','surfaceId','uRange','vRange']);for(const k of ['uRange','vRange'])assert(Array.isArray(l[k])&&l[k].length===2&&l[k].every(fraction)&&l[k][0]<=l[k][1],'Invalid contact region.');}
 else if(l.kind==='attested-fiducial'){exact(l,['kind','surfaceId','u','v','fiducialId']);assert(fraction(l.u)&&fraction(l.v)&&nonempty(l.fiducialId),'Invalid fiducial.');}
 else if(l.kind==='measured-point'){exact(l,['kind','surfaceId','u','v','method','uncertaintyMm']);assert(fraction(l.u)&&fraction(l.v)&&nonempty(l.method)&&(l.uncertaintyMm===null||finite(l.uncertaintyMm)&&l.uncertaintyMm>=0),'Invalid measured point.');}
 else fail('Unsupported contact location.');
 return r as StretchCalibrationContact;
}
function sameIntended(a:StretchCalibrationContact,b:StretchCalibrationContact):boolean {
 return a.finger===b.finger&&a.actuatorId===b.actuatorId&&a.midiPitch===b.midiPitch&&a.row===b.row&&a.keyState===b.keyState&&a.location.surfaceId===b.location.surfaceId;
}
function contained(actual:StretchCalibrationContact,target:StretchCalibrationContact):boolean {
 if(!sameIntended(actual,target))return false;
 if(target.location.kind!=='surface-region')return equal(actual.location,target.location);
 const t=target.location,a=actual.location;
 const u=a.kind==='surface-region'?a.uRange:[a.u,a.u],v=a.kind==='surface-region'?a.vRange:[a.v,a.v];
 return u[0]>=t.uRange[0]&&u[1]<=t.uRange[1]&&v[0]>=t.vRange[0]&&v[1]<=t.vRange[1];
}
function parallelCompatible(contacts:readonly StretchCalibrationContact[]):boolean {
 const depth=contacts.map(c=>c.location.kind==='surface-region'?c.location.vRange:[c.location.v,c.location.v]);
 return Math.max(...depth.map(r=>r[0]))<=Math.min(...depth.map(r=>r[1]))+1e-9;
}
export function effectiveEntries(s:StretchCalibrationSession):StretchCalibrationEntry[] {
 const withdrawn=new Set(s.entries.filter(e=>e.kind==='retraction').map(e=>e.entryId));
 return s.entries.filter(e=>e.kind!=='retraction'&&!withdrawn.has(e.id));
}
export function effectivePairReports(s:StretchCalibrationSession):PairStretchObservation[] {
 const entries=effectiveEntries(s),map=new Map<string,PairStretchObservation>();for(const e of entries)if(e.kind==='pair-stretch')map.set(e.trialId,e);
 return entries.filter((e):e is PairStretchObservation=>e.kind==='pair-stretch'&&map.get(e.trialId)?.id===e.id);
}
export function tripleApplicability(s:StretchCalibrationSession,t:TripleObservation):TripleApplicability {
 const source=s.entries.find(e=>e.id===t.sourcePairObservationId);
 if(!source||source.kind!=='pair-stretch'||!effectiveEntries(s).some(e=>e.id===source.id))return 'basis-withdrawn';
 return effectivePairReports(s).find(e=>e.trialId===source.trialId)?.id===source.id?'current':'basis-revised';
}
export function terminalApplicability(s:StretchCalibrationSession,t:PairSweepTerminal):TripleApplicability {
 const effective=effectivePairReports(s),entries=effectiveEntries(s);
 for(const id of [t.lastReachableObservationId,t.firstUnavailableObservationId])if(id!==null){
  const original=s.entries.find(e=>e.id===id);
  if(!original||original.kind!=='pair-stretch'||!entries.some(e=>e.id===id))return 'basis-withdrawn';
  if(effective.find(e=>e.trialId===original.trialId)?.id!==id)return 'basis-revised';
 }
 return 'current';
}
/** Later omissions and replacements supersede earlier slot outcomes in ledger order. */
export function latestSlotOutcome(s:StretchCalibrationSession,phase:StretchPhase,id:string):StretchCalibrationEntry|undefined {
 return effectiveEntries(s).filter(e=>e.kind==='omission'?e.phase===phase&&e.slotId===id:
  phase==='relative-fingertip-reach'?e.kind==='relative-fingertip-reach'&&e.slotId===id:
  phase==='progressive-pairs'?e.kind==='pair-sweep-terminal'&&e.sweepId===id:
  (e.kind==='conditional-triple-boundary'||e.kind==='conditional-triple-unavailable')&&e.slotId===id).at(-1);
}
export function stretchSlotStatus(s:StretchCalibrationSession,phase:StretchPhase,id:string):'incomplete'|'recorded'|'omitted'|'needs-review' {
 const e=latestSlotOutcome(s,phase,id);if(!e)return 'incomplete';if(e.kind==='omission')return 'omitted';
 if(e.kind==='pair-sweep-terminal'&&terminalApplicability(s,e)!=='current')return 'needs-review';
 if((e.kind==='conditional-triple-boundary'||e.kind==='conditional-triple-unavailable')&&tripleApplicability(s,e)!=='current')return 'needs-review';
 return 'recorded';
}
export function sweepTerminal(s:StretchCalibrationSession,sweepId:string):PairSweepTerminal|null {
 const e=latestSlotOutcome(s,'progressive-pairs',sweepId);return e?.kind==='pair-sweep-terminal'&&terminalApplicability(s,e)==='current'?e:null;
}
export function effectiveSweepTerminals(s:StretchCalibrationSession):PairSweepTerminal[] {
 return s.plan.pairSweeps.map(sw=>sweepTerminal(s,sw.id)).filter((e):e is PairSweepTerminal=>e!==null);
}
export function relativeDifferenceMm(s:StretchCalibrationSession,first:number,second:number):number|null {
 let sum=0,frame:string|undefined;
 for(let f=first;f<second;f++){
  const slot=s.plan.relativeReachSlots.find(slot=>slot.pair[0]===f);
  const e=slot?latestSlotOutcome(s,'relative-fingertip-reach',slot.id):undefined;
  if(e?.kind!=='relative-fingertip-reach'||frame!==undefined&&frame!==e.referenceFrameId)return null;frame=e.referenceFrameId;
  const r=e.reading;if(r.kind==='signed-mm')sum+=r.differenceMm;
  else{if(r.axisStartMm===null||r.axisEndMm===null)return null;sum+=(r.secondFraction-r.firstFraction)*(r.axisEndMm-r.axisStartMm);}
 }
 return sum;
}
export function recommendedSpanSteps(s:StretchCalibrationSession,p:readonly [number,number]):number {
 const diff=relativeDifferenceMm(s,p[0],p[1]);return Math.max(2,2*Math.ceil(Math.abs(diff??0)/27.5));
}
export function stretchProgress(s:StretchCalibrationSession):StretchProgress {
 const readings={completed:0,omitted:0,total:4 as const},sweeps={completed:0,omitted:0,total:10 as const,maximum:0,unavailable:0,coverageEdge:0,stopped:0,needsReview:0},triples={completed:0,omitted:0,total:10 as const,needsReview:0,coverageEdge:0,unavailable:0};
 for(const r of s.plan.relativeReachSlots){const status=stretchSlotStatus(s,'relative-fingertip-reach',r.id);if(status==='recorded')readings.completed++;else if(status==='omitted')readings.omitted++;}
 for(const sw of s.plan.pairSweeps){const status=stretchSlotStatus(s,'progressive-pairs',sw.id),t=latestSlotOutcome(s,'progressive-pairs',sw.id);if(status==='needs-review')sweeps.needsReview++;else if(status==='omitted')sweeps.omitted++;else if(status==='recorded'&&t?.kind==='pair-sweep-terminal'){sweeps.completed++;if(t.reason==='maximum-reachable')sweeps.maximum++;else if(t.reason==='first-unavailable')sweeps.unavailable++;else if(t.reason==='coverage-edge')sweeps.coverageEdge++;else sweeps.stopped++;}}
 for(const sl of s.plan.tripleSlots){const status=stretchSlotStatus(s,'conditional-triples',sl.id),t=latestSlotOutcome(s,'conditional-triples',sl.id);if(status==='needs-review')triples.needsReview++;else if(status==='omitted')triples.omitted++;else if(status==='recorded'&&(t?.kind==='conditional-triple-boundary'||t?.kind==='conditional-triple-unavailable')){triples.completed++;if(t.kind==='conditional-triple-unavailable')triples.unavailable++;else if(t.termination==='coverage-edge')triples.coverageEdge++;}}
 return {readings,sweeps,triples,judgments:s.entries.filter(e=>e.kind==='pair-stretch').length,effectiveJudgments:effectivePairReports(s).length,complete:readings.completed+readings.omitted===4&&sweeps.completed+sweeps.omitted===10&&triples.completed+triples.omitted===10&&triples.needsReview===0};
}
export function validateStretchSession(input:unknown):StretchCalibrationSession {
 const s=record(input);exact(s,['version','id','plan','entries','pairTrials','cursor']);assert(s.version==='stretch-calibration-session-v1'&&nonempty(s.id),'Unsupported session.');
 const p=record(s.plan);exact(p,['version','protocolVersion','scaleVersion','geometry','provenance','relativeReachSlots','pairSweeps','tripleSlots']);assert(p.version==='stretch-calibration-plan-v1'&&p.protocolVersion===STRETCH_CALIBRATION_PROTOCOL.version&&p.scaleVersion===STRETCH_CALIBRATION_PROTOCOL.scaleVersion,'Unsupported protocol or scale.');
 const g=validateGeometry(p.geometry),pr=record(p.provenance);exact(pr,['playerId','hand','setupId','bodyMidlineXmm','seatingReference','referenceLocation']);assert(['LH','RH'].includes(pr.hand)&&finite(pr.bodyMidlineXmm)&&['playerId','setupId','seatingReference'].every(k=>nonempty(pr[k])),'Invalid setup.');
 const ref=record(pr.referenceLocation);exact(ref,['id','kind','xMm']);assert(nonempty(ref.id)&&['operator-selected-central','additional-validation-location'].includes(ref.kind)&&finite(ref.xMm),'Invalid reference location.');
 const ids=new Set<string>();const identity=(id:unknown)=>{assert(nonempty(id)&&!ids.has(id),'Duplicate or missing identity.');ids.add(id);};identity(s.id);
 const direction=pr.hand==='RH'?'higher-pitch':'lower-pitch';
 for(const [name,expected] of [['relativeReachSlots',STRETCH_CALIBRATION_PROTOCOL.relativeReachPairs],['pairSweeps',STRETCH_CALIBRATION_PROTOCOL.pairs],['tripleSlots',STRETCH_CALIBRATION_PROTOCOL.triples]] as const){assert(Array.isArray(p[name])&&p[name].length===expected.length,'Invalid collection slots.');p[name].forEach((v:any,i:number)=>{record(v);identity(v.id);assert(pair(v.pair??v.triple,name==='tripleSlots'?3:2)&&equal(v.pair??v.triple,expected[i]),'Invalid finger order.');});}
 for(const r of p.relativeReachSlots){exact(r,['id','pair','referenceFrameId']);assert(nonempty(r.referenceFrameId),'Missing forward reference frame.');}
 assert(new Set(p.relativeReachSlots.map((r:any)=>r.referenceFrameId)).size===1,'Relative readings require one common frame.');
 for(const sw of p.pairSweeps){exact(sw,['id','pair','rowPolicy','targetDirection']);assert(sw.rowPolicy==='same-row'&&sw.targetDirection===direction,'The active protocol uses same-row pairs and mirrored hand direction.');}
 for(const sl of p.tripleSlots){exact(sl,['id','triple','anchorSweepId','movingFinger','targetDirection','searchSurfaceIds']);const sw=p.pairSweeps.find((v:any)=>v.id===sl.anchorSweepId);assert(sw&&equal(sw.pair,sl.triple.slice(0,2))&&sl.movingFinger===sl.triple[2]&&sl.targetDirection===direction&&Array.isArray(sl.searchSurfaceIds)&&sl.searchSurfaceIds.length>0&&new Set(sl.searchSurfaceIds).size===sl.searchSurfaceIds.length&&sl.searchSurfaceIds.every((id:string)=>g.surfaces.some(v=>v.id===id)),'Invalid conditional search scope.');}
 assert(Array.isArray(s.pairTrials)&&Array.isArray(s.entries),'Invalid ledger.');
 for(const t of s.pairTrials){record(t);exact(t,['id','sweepId','contacts','distanceSemitoneSteps']);identity(t.id);const sw=p.pairSweeps.find((v:any)=>v.id===t.sweepId);assert(sw&&Array.isArray(t.contacts)&&t.contacts.length===2,'Invalid pair target.');const c=t.contacts.map((v:unknown)=>validateContact(v,g));assert(equal(c.map((v:StretchCalibrationContact)=>v.finger),sw.pair)&&c[0].actuatorId!==c[1].actuatorId&&c[0].row===c[1].row&&[1,2].includes(c[0].row)&&c.every((v:StretchCalibrationContact)=>v.keyState==='depressed')&&parallelCompatible(c),'Pair target must permit depressed fingertips aligned on one playable row.');const gap=(c[1].midiPitch-c[0].midiPitch)*(pr.hand==='RH'?1:-1);assert(gap>0&&gap%2===0&&t.distanceSemitoneSteps===gap,'Invalid pair span/direction.');}
 const earlier=new Map<string,StretchCalibrationEntry>();const realizationIds=new Set<string>();
 for(const raw of s.entries){const e=record(raw);identity(e.id);assert(nonempty(e.recordedAt)&&Number.isFinite(Date.parse(e.recordedAt))&&(e.notes===undefined||typeof e.notes==='string'),'Invalid entry date/notes.');
  const base=['kind','id','recordedAt'];
  if(e.kind==='relative-fingertip-reach'){exact(e,[...base,'slotId','pair','referenceFrameId','reading'],['notes']);const slot=p.relativeReachSlots.find((v:any)=>v.id===e.slotId);assert(slot&&equal(slot.pair,e.pair)&&slot.referenceFrameId===e.referenceFrameId,'Reading does not bind its slot.');const r=record(e.reading);if(r.kind==='signed-mm'){exact(r,['kind','differenceMm','method']);assert(finite(r.differenceMm)&&nonempty(r.method),'Invalid millimeter reading.');}else{exact(r,['kind','windowId','firstFraction','secondFraction','axisStartMm','axisEndMm','windowReference']);assert(r.kind==='window-fractions'&&nonempty(r.windowId)&&nonempty(r.windowReference)&&finite(r.firstFraction)&&finite(r.secondFraction)&&(r.axisStartMm===null||finite(r.axisStartMm))&&(r.axisEndMm===null||finite(r.axisEndMm))&&(r.axisStartMm===null||r.axisEndMm===null||r.axisStartMm<r.axisEndMm),'Invalid measurement window.');}}
  else if(e.kind==='pair-stretch'){exact(e,[...base,'trialId','sweepId','grade','input','realization'],['notes']);const t=s.pairTrials.find((v:any)=>v.id===e.trialId);assert(t&&e.sweepId===t.sweepId&&Number.isInteger(e.grade)&&e.grade>=0&&e.grade<=5,'Invalid trial rating.');const input=record(e.input);if(input.kind==='screen')exact(input,['kind']);else if(input.kind==='keyboard'){exact(input,['kind','code']);assert(input.code===`Digit${e.grade}`||input.code===`Numpad${e.grade}`,'Input does not match grade.');}else{exact(input,['kind','deviceId','channel','note']);assert(input.kind==='midi'&&nonempty(input.deviceId)&&Number.isInteger(input.channel)&&input.channel>=0&&input.channel<=15&&pitch(input.note)&&input.note%12===e.grade*2,'Invalid MIDI grade.');const low=Math.floor(input.note/12)*12,high=low+10,testLow=Math.min(...t.contacts.map((c:any)=>c.midiPitch)),testHigh=Math.max(...t.contacts.map((c:any)=>c.midiPitch));assert(low>=g.admittedMidiRange[0]&&high<=g.admittedMidiRange[1]&&(high<testLow||low>testHigh),'MIDI controls must form a complete admitted block outside the tested span.');}
   if(e.grade===5)assert(e.realization===null,'Unavailable cannot have a realized contact.');else{const r=record(e.realization);exact(r,['id','contacts']);assert(nonempty(r.id)&&!realizationIds.has(r.id)&&!ids.has(r.id)&&Array.isArray(r.contacts)&&r.contacts.length===2,'Invalid realization.');realizationIds.add(r.id);r.contacts.forEach((c:unknown,i:number)=>assert(contained(validateContact(c,g),t.contacts[i]),'Realization changes its declared target.'));assert(parallelCompatible(r.contacts),'Realized fingertips cannot align parallel to the keyboard.');}}
  else if(e.kind==='pair-sweep-terminal'){exact(e,[...base,'sweepId','reason','lastReachableObservationId','firstUnavailableObservationId'],['notes']);assert(p.pairSweeps.some((v:any)=>v.id===e.sweepId)&&['maximum-reachable','first-unavailable','operator-stop','coverage-edge'].includes(e.reason),'Invalid terminal.');const last=earlier.get(e.lastReachableObservationId),first=earlier.get(e.firstUnavailableObservationId);assert(e.lastReachableObservationId===null||last?.kind==='pair-stretch'&&last.sweepId===e.sweepId&&last.grade<5,'Terminal has an invalid reachable reference.');assert(e.firstUnavailableObservationId===null||first?.kind==='pair-stretch'&&first.sweepId===e.sweepId&&first.grade===5,'Terminal has an invalid unavailable reference.');assert(e.reason!=='maximum-reachable'||!!last,'Maximum requires a reachable report.');assert(e.reason!=='first-unavailable'||!!first&&!!last,'An outward unavailable terminal requires a reachable baseline.');if(first?.kind==='pair-stretch'&&last?.kind==='pair-stretch'){const ft=s.pairTrials.find((v:any)=>v.id===first.trialId),lt=s.pairTrials.find((v:any)=>v.id===last.trialId);assert(ft.distanceSemitoneSteps>lt.distanceSemitoneSteps,'Unavailable terminal must be outward of its reachable baseline.');}assert(e.reason==='first-unavailable'||e.firstUnavailableObservationId===null,'Only observed unavailability uses its report.');if(e.reason==='coverage-edge'){assert(last?.kind==='pair-stretch','Coverage requires an actual reachable endpoint.');const lt=s.pairTrials.find((v:any)=>v.id===last.trialId),outer=lt.contacts[1];assert(!g.surfaces.some(v=>v.row===outer.row&&v.midiPitch===outer.midiPitch+(pr.hand==='RH'?2:-2)),'Coverage endpoint is not at the admitted same-row edge.');}}
  else if(e.kind==='conditional-triple-boundary'||e.kind==='conditional-triple-unavailable'){const boundary=e.kind==='conditional-triple-boundary';exact(e,[...base,'slotId','sourcePairObservationId','anchorRealizationId',...(boundary?['boundaryContact','boundaryKind','termination','configurationGrade']:['outcome','attemptedContacts'])],['notes']);const sl=p.tripleSlots.find((v:any)=>v.id===e.slotId),source=earlier.get(e.sourcePairObservationId);assert(sl&&source?.kind==='pair-stretch'&&source.sweepId===sl.anchorSweepId&&source.grade===3&&source.realization?.id===e.anchorRealizationId,'Triple requires its original grade-3 pair realization.');const trial=s.pairTrials.find((v:any)=>v.id===source.trialId),outer=trial.contacts[1].midiPitch;const check=(c:unknown)=>{const v=validateContact(c,g);assert(v.finger===sl.movingFinger&&v.keyState==='depressed'&&sl.searchSurfaceIds.includes(v.location.surfaceId)&&(v.midiPitch-outer)*(pr.hand==='RH'?1:-1)>0,'Third contact is outside its declared outward scope.');};
   if(boundary){check(e.boundaryContact);assert(e.boundaryKind==='operator-declared-last-usable'&&['usable-limit','coverage-edge'].includes(e.termination)&&(e.configurationGrade===null||Number.isInteger(e.configurationGrade)&&e.configurationGrade>=0&&e.configurationGrade<=4),'Invalid triple boundary.');if(e.termination==='coverage-edge'){const candidates=g.surfaces.filter(v=>sl.searchSurfaceIds.includes(v.id));const edge=(pr.hand==='RH'?Math.max:Math.min)(...candidates.map(v=>v.midiPitch));assert(e.boundaryContact.midiPitch===edge,'Coverage edge must identify the admitted search edge.');}}
   else{assert(e.outcome==='no-usable-outward-contact'&&Array.isArray(e.attemptedContacts)&&e.attemptedContacts.length>0,'Unavailability requires actual attempted contacts.');e.attemptedContacts.forEach(check);}}
  else if(e.kind==='omission'){exact(e,[...base,'phase','slotId','reason'],['notes']);assert(STRETCH_CALIBRATION_PROTOCOL.phases.includes(e.phase)&&['operator-skip','no-rated-anchor','outside-collection-window','basis-withdrawn'].includes(e.reason),'Invalid omission.');const list=e.phase==='relative-fingertip-reach'?p.relativeReachSlots:e.phase==='progressive-pairs'?p.pairSweeps:p.tripleSlots;assert(list.some((v:any)=>v.id===e.slotId),'Unknown omitted slot.');}
  else if(e.kind==='retraction'){exact(e,[...base,'entryId','reason'],['notes']);assert(nonempty(e.reason)&&earlier.has(e.entryId)&&earlier.get(e.entryId)?.kind!=='retraction'&&!s.entries.slice(0,s.entries.indexOf(raw)).some((v:any)=>v.kind==='retraction'&&v.entryId===e.entryId),'Invalid retraction target.');}
  else fail('Unsupported ledger entry.');earlier.set(e.id,e as StretchCalibrationEntry);
 }
 assert([...realizationIds].every(id=>!ids.has(id)),'Realization identity collides with another record.');
 for(const sw of p.pairSweeps){const reports=s.entries.filter((e:any)=>e.kind==='pair-stretch'&&e.sweepId===sw.id),firstReachable=reports.findIndex((e:any)=>e.grade<5);if(firstReachable>=0){const rated=reports.slice(firstReachable).map((e:any)=>s.pairTrials.find((t:any)=>t.id===e.trialId)),first=rated[0].contacts[0];assert(rated.every((t:any)=>t.contacts[0].row===first.row&&t.contacts[0].midiPitch===first.midiPitch),'A rated sweep cannot change its row or anchor key after a reachable result.');}}
 if(s.cursor!==null){const c=record(s.cursor);exact(c,['phase','slotId','trialId']);const list=c.phase==='relative-fingertip-reach'?p.relativeReachSlots:c.phase==='progressive-pairs'?p.pairSweeps:c.phase==='conditional-triples'?p.tripleSlots:null;assert(list&&list.some((v:any)=>v.id===c.slotId),'Invalid cursor slot.');assert(c.trialId===null||c.phase==='progressive-pairs'&&s.pairTrials.some((v:any)=>v.id===c.trialId&&v.sweepId===c.slotId),'Invalid current trial binding.');}
 return s as StretchCalibrationSession;
}
export async function validateStretchArchive(input:unknown):Promise<StretchArchive> {
 const a=record(input);exact(a,['version','sessions','activeSessionId']);assert(a.version===STRETCH_ARCHIVE_VERSION&&Array.isArray(a.sessions),'Unsupported stretch archive.');
 const ids=new Set<string>();for(const raw of a.sessions){const s=validateStretchSession(raw);assert(!ids.has(s.id),'Duplicate session identity.');ids.add(s.id);assert(await canonicalGeometryHash(s.plan.geometry)===s.plan.geometry.snapshotSha256,'Geometry snapshot hash mismatch.');}
 assert(a.activeSessionId===null||ids.has(a.activeSessionId),'Unknown active collection.');return structuredClone(a) as StretchArchive;
}
export async function stretchBytes(a:StretchArchive):Promise<Uint8Array>{return new TextEncoder().encode(JSON.stringify(await validateStretchArchive(a))+'\n');}
export async function loadStretch(files:Pick<StretchFiles,'read'>):Promise<StretchLoad> {
 let raw:Uint8Array|undefined;try{raw=await files.read(STRETCH_FILE);if(raw===undefined)return {value:initialStretchArchive()};return {value:await validateStretchArchive(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw))),raw:new Uint8Array(raw)};}
 catch(e){return {value:initialStretchArchive(),raw:raw===undefined?undefined:new Uint8Array(raw),error:`Saved stretch calibration could not be opened: ${e instanceof Error?e.message:String(e)}. The complete original file is retained.`};}
}
