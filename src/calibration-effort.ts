import {calibrationKeyColor, calibrationMidiGrade, type CalibrationGrade, type CalibrationRatingInput,
 type CalibrationTrial, type ExploratoryCalibrationBlock, type CalibrationKey} from '@hypermemetic-ai/fingering-calculator';
import {createPilotPlan, type PilotInstrument, type PilotFiles} from './calibration-pilot';

export const EFFORT_FILE='calibration-effort-v2.json';
export const EFFORT_VERSION='viewer-calibration-effort-v2';
export const EFFORT_PROTOCOL={version:'viewer-combined-alternating-effort-v2',
 instruction:'Press both keys together, then alternate.',
 cue:'Keep your wrist in place. Keep your hand pointing the same way.',
 task:{patterns:['combined','trill'],anchorBehavior:'participate-in-trill',pace:{kind:'self-selected'}},
 patterns:{combined:'Press both keys together.',trill:'Alternate the two fingers, releasing each key between its turns.'},
 setup:'Choose a relaxed position. Aim at the center of each key, at a depth that feels natural. Keep your {referenceFinger} in the same spot between exercises. Let your {otherFinger} bend, extend or spread. Keep your wrist in place. Keep your hand pointing the same way.',
} as const;
export const EFFORT_GRADES=[
 {grade:0,label:'Natural fit',description:'Your relaxed fingers already fit these keys.'},
 {grade:1,label:'Easy adjustment',description:'A small finger adjustment makes the task easy.'},
 {grade:2,label:'Some effort',description:'Performing the task takes effort, but still feels comfortable.'},
 {grade:3,label:'Near your limit',description:'You can barely perform the task.'},
 {grade:4,label:'Unavailable',description:'You cannot perform the task without changing your hand position.'},
] as const;
export type EffortHand='LH'|'RH';
export type EffortInstrument=PilotInstrument;
export interface EffortTrial extends CalibrationTrial {
 protocolVersion:typeof EFFORT_PROTOCOL.version;blockId:string;distanceSemitoneSteps:number;
}
export type EffortBlock=ExploratoryCalibrationBlock;
export interface EffortPlan {
 version:'viewer-effort-target-plan-v2';protocolVersion:typeof EFFORT_PROTOCOL.version;
 keyboard:ReturnType<typeof createPilotPlan>['keyboard'];hand:EffortHand;
 anchorMidiPitches:number[];blocks:EffortBlock[];trials:EffortTrial[];
 templateProvenance:EffortTemplateProvenance;
}
export interface EffortTemplateProvenance {
 calculatorPackage:'@hypermemetic-ai/fingering-calculator';
 calculatorRevision:'e325912d00efaef887738f4fb0f94a2495d58577';
 templateProtocol:'exploratory-fixed-frame-protocol-v1';
 geometryId:string;canonicalHand:'RH';canonicalAnchorMidiPitch:60;
 referenceMapping:'piano-reflection-124-minus-p-v1'|'janko-reflection-120-minus-p-v1';
}
export interface EffortSetup {
 blockId:string;performingHand:EffortHand;recordedAt:string;
 protocolVersion:typeof EFFORT_PROTOCOL.version;attestedInstruction:string;notes?:string;
}
export interface EffortObservation {
 trialId:string;grade:CalibrationGrade;recordedAt:string;input:CalibrationRatingInput;
 setupIndex:number;performingHand:EffortHand;protocolVersion:typeof EFFORT_PROTOCOL.version;
 contacts:{reference:CalibrationTrial['anchors'];other:CalibrationTrial['active'];geometryId:string};
 evidence:{patternsPerformed:('combined-press'|'alternating-trill')[];notes?:string};
}
export interface EffortCollection {
 id:string;instrument:EffortInstrument;protocolVersion:typeof EFFORT_PROTOCOL.version;
 templateProvenance:EffortTemplateProvenance;performingHand:EffortHand;currentTrialId:string|null;
 preparedSetupIndex:number|null;setups:EffortSetup[];observations:EffortObservation[];
 retractions:{observationIndex:number;recordedAt:string;reason:string}[];
}
/** This new raw collection never admits or rewrites old calculator-session observations. */
export interface EffortArchive {
 version:typeof EFFORT_VERSION;playerId:string;activeCollectionId:string|null;collections:EffortCollection[];
}
export interface EffortLoad {value:EffortArchive;error?:string;raw?:Uint8Array}
export type EffortFiles=PilotFiles;
export type EffortSession=EffortCollection&{plan:EffortPlan;trials:EffortTrial[]};
const instruments:EffortInstrument[]=['conventional-piano','janko-four-row'];
const plans=new Map<string,EffortPlan>();
const eq=(a:unknown,b:unknown)=>JSON.stringify(a)===JSON.stringify(b);
function fail(message:string):never{throw Error(message);}
const text=(v:unknown,name:string):string=>typeof v==='string'&&!!v.trim()?v:fail(`Missing ${name}.`);
function object(v:unknown,keys:string[],name:string,optional:string[]=[]):Record<string,unknown> {
 if(!v||typeof v!=='object'||Array.isArray(v))return fail(`Invalid ${name}.`);
 const r=v as Record<string,unknown>;
 if(keys.some(k=>!(k in r))||Object.keys(r).some(k=>!keys.includes(k)&&!optional.includes(k)))fail(`Invalid ${name} fields.`);
 return r;
}
const timestamp=(v:unknown):string=>{const s=text(v,'recorded time');if(!Number.isFinite(Date.parse(s)))fail('Invalid recorded time.');return s;};
const hand=(v:unknown):EffortHand=>v==='RH'||v==='LH'?v:fail('Invalid performing hand.');
const instrument=(v:unknown):EffortInstrument=>instruments.includes(v as EffortInstrument)?v as EffortInstrument:fail('Invalid effort instrument.');
const index=(v:unknown,length:number):number=>Number.isInteger(v)&&Number(v)>=0&&Number(v)<length?Number(v):fail('Invalid history index.');

/** The displayed setup and stored acknowledgment share the actual finger names for this block. */
export function effortSetupInstruction(trial:Pick<CalibrationTrial,'anchors'|'active'>):string {
 const names:Record<number,string>={1:'thumb',2:'index',3:'middle',4:'ring',5:'pinky'};
 const reference=names[trial.anchors[0]?.finger],other=names[trial.active[0]?.finger];
 if(!reference||!other)fail('Missing setup finger contacts.');
 return EFFORT_PROTOCOL.setup.replace('{referenceFinger}',reference).replace('{otherFinger}',other);
}

/** Verify every patch, including asymmetric conventional rear cutouts, under horizontal reflection. */
function mirrorEquivalent(right:CalibrationKey,left:CalibrationKey,xSum:number):boolean {
 // Jankó color layouts name pitches; their painted color is not a different physical key shape.
 if((right.row===undefined&&calibrationKeyColor(right,'classic')!==calibrationKeyColor(left,'classic'))||right.row!==left.row||right.level!==left.level)return false;
 const mirrored=(patches:CalibrationKey['usable'])=>patches.map(p=>({...p,xMin:xSum-p.xMax,xMax:xSum-p.xMin}));
 return eq(mirrored(right.usable),left.usable)&&eq(mirrored(right.body??right.usable),left.body??left.usable);
}
/** Canonical RH identities are shared by either actual hand; templates supply contacts only. */
function effortPlan(kind:EffortInstrument,performingHand:EffortHand='RH'):EffortPlan {
 instrument(kind);hand(performingHand);const cacheKey=`${kind}:${performingHand}`;
 const cached=plans.get(cacheKey);if(cached)return cached;
 const make=(h:EffortHand)=>createPilotPlan({instrument:kind,hand:h,anchorMidiPitches:[kind==='conventional-piano'&&h==='LH'?64:60],
  setupId:'viewer-central-reference',bodyMidlineXmm:0,reference:'Nominal central reference; no wrist pose or contact-depth measurement'});
 const canonical=make('RH'),physical=performingHand==='RH'?canonical:make('LH');
 if(canonical.trials.length!==(kind==='janko-four-row'?208:52)||physical.trials.length!==canonical.trials.length)fail('Incomplete effort target coverage.');
 const pitchSum=kind==='conventional-piano'?124:120;
 const rightOrigin=canonical.keyboard.keys.find(k=>k.id===canonical.trials[0].originKeyId)!;
 const leftOrigin=make('LH').keyboard.keys.find(k=>k.midiPitch===pitchSum-60&&k.row===rightOrigin.row)!;
 const rightBounds=rightOrigin.body??rightOrigin.usable,leftBounds=leftOrigin.body??leftOrigin.usable;
 const xSum=(Math.min(...rightBounds.map(p=>p.xMin))+Math.max(...rightBounds.map(p=>p.xMax))+
  Math.min(...leftBounds.map(p=>p.xMin))+Math.max(...leftBounds.map(p=>p.xMax)))/2;
 // Coverage is verified against the full actual key patches, never only pitch classes.
 for(const trial of canonical.trials)for(const placement of [...trial.anchors,...trial.active]){
  const r=canonical.keyboard.keys.find(k=>k.id===placement.keyId)!;
  const l=canonical.keyboard.keys.find(k=>k.midiPitch===pitchSum-r.midiPitch&&k.row===r.row);
  if(!l||!mirrorEquivalent(r,l,xSum))fail('Physical hand reflection differs from the canonical contact shape.');
 }
 const blockIds=canonical.blocks.map((_,i)=>`effort-v2:${kind}:block:${i}`);
 const trials=physical.trials.map((t,i):EffortTrial=>{
  const b=physical.blocks.findIndex(b=>b.id===t.blockId);
  if(b<0||canonical.trials[i].distanceSemitoneSteps!==t.distanceSemitoneSteps)fail('Physical template order differs.');
  return {...t,id:`effort-v2:${kind}:trial:${i}`,blockId:blockIds[b],stationId:`effort-v2:${kind}:central`,
   protocolVersion:EFFORT_PROTOCOL.version,task:{patterns:['combined','trill'],anchorBehavior:'participate-in-trill',pace:{kind:'self-selected'}}};
 });
 const result:EffortPlan={version:'viewer-effort-target-plan-v2',protocolVersion:EFFORT_PROTOCOL.version,
  keyboard:physical.keyboard,hand:performingHand,anchorMidiPitches:physical.anchorMidiPitches,trials,
  blocks:physical.blocks.map((b,i)=>({...b,id:blockIds[i],referenceLocationId:`effort-v2:${kind}:central`,trialIds:trials.filter(t=>t.blockId===blockIds[i]).map(t=>t.id)})),
  templateProvenance:{calculatorPackage:'@hypermemetic-ai/fingering-calculator',calculatorRevision:'e325912d00efaef887738f4fb0f94a2495d58577',
   templateProtocol:'exploratory-fixed-frame-protocol-v1',geometryId:physical.keyboard.geometryId,canonicalHand:'RH',canonicalAnchorMidiPitch:60,
   referenceMapping:kind==='conventional-piano'?'piano-reflection-124-minus-p-v1':'janko-reflection-120-minus-p-v1'}};
 plans.set(cacheKey,result);return result;
}
export function createEffortPlan(kind:EffortInstrument,performingHand:EffortHand='RH'):EffortPlan {return structuredClone(effortPlan(kind,performingHand));}
export function initialEffortArchive(playerId:string=crypto.randomUUID()):EffortArchive {
 return{version:EFFORT_VERSION,playerId:text(playerId,'player identity'),activeCollectionId:null,collections:[]};
}
export function newEffortCollection(id:string,kind:EffortInstrument,performingHand:EffortHand='RH'):EffortCollection {
 const plan=effortPlan(kind,performingHand);
 return{id:text(id,'collection identity'),instrument:kind,protocolVersion:EFFORT_PROTOCOL.version,templateProvenance:structuredClone(plan.templateProvenance),
  performingHand,currentTrialId:plan.trials[0].id,preparedSetupIndex:null,setups:[],observations:[],retractions:[]};
}
export function effortSession(collection:EffortCollection):EffortSession {
 const plan=createEffortPlan(collection.instrument,collection.performingHand);return {...structuredClone(collection),plan,trials:plan.trials};
}
export function effortCurrent(collection:EffortCollection):{trial:EffortTrial|null;block:EffortBlock|null;needsSetup:boolean} {
 const plan=effortPlan(collection.instrument,collection.performingHand),trial=plan.trials.find(t=>t.id===collection.currentTrialId)??null;
 const block=trial?plan.blocks.find(b=>b.id===trial.blockId)!:null;
 const prepared=collection.preparedSetupIndex===null?null:collection.setups[collection.preparedSetupIndex];
 return structuredClone({trial,block,needsSetup:!!trial&&(!prepared||prepared.blockId!==trial.blockId||prepared.performingHand!==collection.performingHand)});
}
export function effortWorkAt(collection:EffortCollection,trialId:string):{status:'untested'}|{status:'measured';grade:CalibrationGrade;observationIndex:number;observation:EffortObservation} {
 const retracted=new Set(collection.retractions.map(r=>r.observationIndex));
 for(let i=collection.observations.length-1;i>=0;i--)if(collection.observations[i].trialId===trialId&&!retracted.has(i)){
  return{status:'measured',grade:collection.observations[i].grade,observationIndex:i,observation:structuredClone(collection.observations[i])};
 }
 return{status:'untested'};
}
export function effortProgress(collection:EffortCollection) {
 const plan=effortPlan(collection.instrument),current=effortCurrent(collection);
 const blocks=plan.blocks.map(b=>{const measured=b.trialIds.filter(id=>effortWorkAt(collection,id).status==='measured').length;
  return{blockId:b.id,total:b.trialIds.length,measured,remaining:b.trialIds.length-measured,status:measured===b.trialIds.length?'complete' as const:'not-complete' as const};});
 const measured=blocks.reduce((n,b)=>n+b.measured,0);
 return{total:plan.trials.length,measured,remaining:plan.trials.length-measured,currentBlockId:current.block?.id??null,totalBlocks:blocks.length,
  completeBlocks:blocks.filter(b=>b.status==='complete').length,blocks,status:measured===plan.trials.length?'complete' as const:'not-complete' as const,
  needsSetup:current.needsSetup,observations:collection.observations.length,retractions:collection.retractions.length,inference:'none' as const};
}
export function navigateEffort(collection:EffortCollection,trialId:string):EffortCollection {
 const next=structuredClone(collection),current=effortCurrent(next),trial=effortPlan(next.instrument).trials.find(t=>t.id===trialId);
 if(!trial)fail('Unknown effort target.');next.currentTrialId=trialId;
 if(current.block?.id!==trial.blockId)next.preparedSetupIndex=null;return next;
}
export function recordEffort(collection:EffortCollection,grade:CalibrationGrade,input:CalibrationRatingInput,recordedAt:string,notes?:string):EffortCollection {
 const next=structuredClone(collection),current=effortCurrent(next);if(!current.trial||current.needsSetup)fail('Acknowledge the current setup first.');
 next.observations.push({trialId:current.trial.id,grade,input:structuredClone(input),recordedAt,setupIndex:next.preparedSetupIndex!,
  performingHand:next.performingHand,protocolVersion:EFFORT_PROTOCOL.version,
  contacts:{reference:current.trial.anchors,other:current.trial.active,geometryId:current.trial.geometryId},
  evidence:{patternsPerformed:grade===4?[]:['combined-press','alternating-trill'],...(notes?{notes}:{})}});
 const trials=effortPlan(next.instrument).trials,at=trials.findIndex(t=>t.id===next.currentTrialId);
 const remaining=[...trials.slice(at+1),...trials.slice(0,at+1)].find(t=>effortWorkAt(next,t.id).status==='untested');
 next.currentTrialId=remaining?.id??null;if(remaining?.blockId!==current.block!.id)next.preparedSetupIndex=null;return next;
}
export function validateEffortArchive(value:unknown):EffortArchive {
 const a=object(value,['version','playerId','activeCollectionId','collections'],'effort archive');
 if(a.version!==EFFORT_VERSION||!Array.isArray(a.collections))fail('Unsupported effort archive.');
 text(a.playerId,'player identity');const ids=new Set<string>(),kinds=new Set<EffortInstrument>();
 for(const raw of a.collections){
  const c=object(raw,['id','instrument','protocolVersion','templateProvenance','performingHand','currentTrialId','preparedSetupIndex','setups','observations','retractions'],'effort collection');
  const id=text(c.id,'collection identity'),kind=instrument(c.instrument),h=hand(c.performingHand),plan=effortPlan(kind,h);
  if(ids.has(id)||kinds.has(kind))fail('Duplicated effort collection.');ids.add(id);kinds.add(kind);
  if(c.protocolVersion!==EFFORT_PROTOCOL.version||!eq(c.templateProvenance,plan.templateProvenance))fail('Unsupported effort protocol or template provenance.');
  if(c.currentTrialId!==null&&!plan.trials.some(t=>t.id===c.currentTrialId))fail('Unknown current effort target.');
  if(!Array.isArray(c.setups)||!Array.isArray(c.observations)||!Array.isArray(c.retractions))fail('Invalid effort history.');
  let lastSetupTime=-Infinity;for(const rawSetup of c.setups){
   const s=object(rawSetup,['blockId','performingHand','recordedAt','protocolVersion','attestedInstruction'],'effort setup',['notes']);
   const setupPlan=effortPlan(kind,hand(s.performingHand)),setupTrial=setupPlan.trials.find(t=>t.blockId===s.blockId);
   if(!setupTrial||s.protocolVersion!==EFFORT_PROTOCOL.version||s.attestedInstruction!==effortSetupInstruction(setupTrial))fail('Invalid effort setup attestation.');
   timestamp(s.recordedAt);if(Date.parse(s.recordedAt as string)<lastSetupTime)fail('Setup history is out of order.');
   lastSetupTime=Date.parse(s.recordedAt as string);if('notes'in s&&typeof s.notes!=='string')fail('Invalid setup notes.');
  }
  if(c.preparedSetupIndex!==null){const s=c.setups[index(c.preparedSetupIndex,c.setups.length)] as EffortSetup;
   const trial=plan.trials.find(t=>t.id===c.currentTrialId);if(!trial||s.blockId!==trial.blockId||s.performingHand!==h)fail('Prepared setup differs from current target.');}
  let lastObservationTime=-Infinity,lastSetupIndex=-1;for(const rawObservation of c.observations){
   const o=object(rawObservation,['trialId','grade','recordedAt','input','setupIndex','performingHand','protocolVersion','contacts','evidence'],'effort observation');
   const oh=hand(o.performingHand),trial=effortPlan(kind,oh).trials.find(t=>t.id===o.trialId),s=c.setups[index(o.setupIndex,c.setups.length)] as EffortSetup;
   if(!trial||o.protocolVersion!==EFFORT_PROTOCOL.version||s.blockId!==trial.blockId||s.performingHand!==oh||!Number.isInteger(o.grade)||Number(o.grade)<0||Number(o.grade)>4)fail('Invalid effort observation identity.');
   timestamp(o.recordedAt);if(Date.parse(o.recordedAt as string)<Date.parse(s.recordedAt))fail('Observation predates setup.');
   if(Date.parse(o.recordedAt as string)<lastObservationTime||Number(o.setupIndex)<lastSetupIndex)fail('Observation history is out of order.');
   lastObservationTime=Date.parse(o.recordedAt as string);lastSetupIndex=Number(o.setupIndex);
   if(!eq(o.contacts,{reference:trial.anchors,other:trial.active,geometryId:trial.geometryId}))fail('Observation physical contacts differ from declared hand.');
   const e=object(o.evidence,['patternsPerformed'],'effort task report',['notes']);
   if(!eq(e.patternsPerformed,o.grade===4?[]:['combined-press','alternating-trill'])||('notes'in e&&typeof e.notes!=='string'))fail('Invalid alternating task report.');
   const input=o.input as CalibrationRatingInput;
   if(input?.kind==='manual'){
    object(input,['kind','code'],'manual rating');if(!/^(Digit|Numpad)[0-4]$/.test(input.code)||Number(input.code.slice(-1))!==o.grade)fail('Invalid manual rating.');
   }else if(input?.kind==='midi'){
    object(input,['kind','deviceId','channel','note'],'MIDI rating');text(input.deviceId,'MIDI source');
    if(!Number.isInteger(input.channel)||input.channel<0||input.channel>15||!Number.isInteger(input.note)||input.note<0||input.note>127||
     calibrationMidiGrade(effortPlan(kind,oh).keyboard,trial,input.note)!==o.grade)fail('Invalid MIDI rating.');
   }else fail('Unknown effort rating input.');
  }
  const retracted=new Set<number>();let lastRetractionTime=-Infinity;for(const rawRetraction of c.retractions){
   const r=object(rawRetraction,['observationIndex','recordedAt','reason'],'effort retraction'),i=index(r.observationIndex,c.observations.length);
   if(retracted.has(i))fail('Observation already retracted.');retracted.add(i);timestamp(r.recordedAt);text(r.reason,'retraction reason');
   if(Date.parse(r.recordedAt as string)<lastRetractionTime)fail('Retraction history is out of order.');lastRetractionTime=Date.parse(r.recordedAt as string);
   if(Date.parse(r.recordedAt as string)<Date.parse((c.observations[i] as EffortObservation).recordedAt))fail('Retraction predates observation.');
  }
  if(c.currentTrialId===null&&effortProgress(c as unknown as EffortCollection).remaining!==0)fail('Unfinished effort collection has no target.');
 }
 if(a.activeCollectionId!==null&&!ids.has(a.activeCollectionId as string))fail('Unknown active effort collection.');
 return structuredClone(a) as unknown as EffortArchive;
}
export async function loadEffort(files:EffortFiles):Promise<EffortLoad> {
 let raw:Uint8Array|null=null;try{raw=await files.read(EFFORT_FILE);return{value:raw?validateEffortArchive(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(raw))):initialEffortArchive()};}
 catch(error){return{value:initialEffortArchive(),raw:raw?new Uint8Array(raw):undefined,error:`${error instanceof Error?error.message:String(error)} Saved effort evidence is read-only and available for export.`};}
}
export function effortBytes(value:EffortArchive):Uint8Array{return new TextEncoder().encode(JSON.stringify(validateEffortArchive(value)));}
export function exportEffort(load:EffortLoad):string {
 if(!load.error)return JSON.stringify(validateEffortArchive(load.value),null,2);
 let binary='';const raw=load.raw??new Uint8Array();for(let i=0;i<raw.length;i+=16384)binary+=String.fromCharCode(...raw.subarray(i,i+16384));
 return JSON.stringify({kind:'Retained alternating effort bytes',filename:EFFORT_FILE,error:load.error,encoding:'base64',bytes:raw.length,data:btoa(binary)},null,2);
}
