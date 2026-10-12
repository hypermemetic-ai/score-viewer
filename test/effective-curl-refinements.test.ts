import test from 'node:test';
import assert from 'node:assert/strict';
import {CurlController,EFFECTIVE_CURL_FILE,currentCurl,curlBytes,curlDocument,exportCurl,initialCurl,loadCurl,parseCurlNumber,validateCurlArchive,validateCurlDocument,type CurlArchive,type CurlFiles} from '../src/effective-curl-refinements';
import type {EffectiveCurlHingeAssumption,EffectiveCurlLengthObservation,EffectiveCurlRefinementDocument} from '@hypermemetic-ai/fingering-calculator';

const timestamp='2026-10-12T12:00:00Z';
function document():EffectiveCurlRefinementDocument{return{version:'effective-curl-refinements-v1',id:'doc-rh',playerId:'player',hand:'RH',assumptions:[],entries:[]};}
function assumption(id='estimate-2',finger:2|3|4|5=2):EffectiveCurlHingeAssumption{return{version:'effective-curl-hinge-assumption-v1',id,recordedAt:'2026-10-11T12:00:00Z',finger,hingeToTipMm:44,basis:{kind:'population-proportion',sourceReference:'authored-test-source',externalFingerLengthMm:80,externalLengthDefinition:'proximal-flexion-crease-to-fingertip',externalLengthStatus:'assumed',proportion:.55,proportionSd:null,hingeReference:'pip-flexion-crease-proxy'}};}
function measurement(id='reading-2',finger:2|3|4|5=2):EffectiveCurlLengthObservation{return{kind:'effective-curl-length',id,recordedAt:timestamp,finger,hingeToTipMm:43,method:'bent-section-effective',uncertaintyMm:null,displayedAssumptionId:null};}
const archive=(d:EffectiveCurlRefinementDocument):CurlArchive=>({version:'viewer-effective-curl-archive-v1',documents:[d]});
class Files implements CurlFiles {
 bytes?:Uint8Array;writes:string[]=[];fail=false;hold=false;release?:()=>void;
 async read(){return this.bytes;}
 async write(name:string,bytes:Uint8Array){this.writes.push(name);if(this.hold)await new Promise<void>(resolve=>{this.release=resolve;});if(this.fail)throw Error('disk unavailable');this.bytes=new Uint8Array(bytes);}
}
function controller(files:Files,value:CurlArchive=initialCurl()){let i=0;return new CurlController({files,load:{value},playerId:'player',hand:'RH',id:()=>`new-${++i}`,now:()=>timestamp});}

test('empty estimates accept independent personal readings and preserve the supported companion document',async()=>{
 const files=new Files(),c=controller(files);assert.equal(c.state.draft.length,'');assert.deepEqual(c.state.archive.documents,[]);assert.deepEqual(currentCurl(c.state.document,2),{personal:undefined,assumption:undefined});
 c.edit({length:'43.5',uncertainty:'',method:'pip-crease-to-tip',notes:' Visible crease reading '});assert.equal(await c.save(),true);assert.deepEqual(files.writes,[EFFECTIVE_CURL_FILE]);
 const wire=JSON.parse(new TextDecoder().decode(files.bytes));assert.equal(wire.version,'effective-curl-refinements-v1');assert.equal(wire.hand,'RH');assert.deepEqual(wire.assumptions,[]);assert.equal(wire.entries[0].displayedAssumptionId,null);assert.equal(wire.entries[0].method,'pip-crease-to-tip');assert.equal(wire.entries[0].uncertaintyMm,null);assert.equal(wire.entries[0].notes,'Visible crease reading');
 const loaded=await loadCurl(files);assert.equal(loaded.error,undefined);assert.deepEqual(JSON.parse(c.exportDocument()),wire);assert.deepEqual(validateCurlArchive(wire),loaded.value);
});

test('all supplied estimate bases retain their endpoints and actual source provenance',()=>{
 const d=document();d.assumptions=[assumption(),{version:'effective-curl-hinge-assumption-v1',id:'template-3',recordedAt:timestamp,finger:3,hingeToTipMm:50,basis:{kind:'anatomical-template',templateId:'model-template',templateVersion:'2',reference:'authored fixture',hingeReference:'effective-internal-hinge'}},{version:'effective-curl-hinge-assumption-v1',id:'fitted-4',recordedAt:timestamp,finger:4,hingeToTipMm:47,basis:{kind:'fitted-geometry',fitId:'fit-fixture',modelVersion:'hand-model-v2',sourceStretchSessionIds:['original-session'],hingeReference:'effective-internal-hinge'}}];
 const admitted=validateCurlDocument(d);assert.deepEqual(admitted,d);admitted.assumptions[0].hingeToTipMm=100;assert.equal(d.assumptions[0].hingeToTipMm,44);assert.equal(assumption().basis.kind,'population-proportion');
});

test('companion admission rejects invalid lengths, precision, fingers, versions and field sets',()=>{
 const cases:Array<[string,(d:any)=>void]>=[
  ['document version',d=>d.version='future'],['assumption version',d=>d.assumptions[0].version='future'],['thumb',d=>d.entries[0].finger=1],['invalid hand',d=>d.hand='both'],['blank player',d=>d.playerId='  '],['zero length',d=>d.entries[0].hingeToTipMm=0],['infinite length',d=>d.entries[0].hingeToTipMm=Infinity],['negative uncertainty',d=>d.entries[0].uncertaintyMm=-1],['infinite uncertainty',d=>d.entries[0].uncertaintyMm=Infinity],['undefined uncertainty',d=>delete d.entries[0].uncertaintyMm],['unknown method',d=>d.entries[0].method='joint-centre'],['invalid date',d=>d.entries[0].recordedAt='2026-02-30T00:00:00Z'],['date shorthand',d=>d.entries[0].recordedAt='2026'],['unknown fields',d=>d.entries[0].hingePositionMm=5],['non-string notes',d=>d.entries[0].notes={description:'test'}],
 ];
 for(const [label,mutate] of cases){const d=document();d.assumptions=[assumption()];d.entries=[measurement()];mutate(d);assert.throws(()=>validateCurlDocument(d),error=>error instanceof Error,label);}
});

test('population proportions require their actual absolute denominator and honest status',()=>{
 const mutations:Array<(basis:any)=>void>=[basis=>basis.externalLengthDefinition='relative-fingertip-difference',basis=>basis.externalFingerLengthMm=0,basis=>basis.externalLengthStatus='personal',basis=>basis.proportion=0,basis=>basis.proportion=1,basis=>basis.proportion=NaN,basis=>basis.proportionSd=-1,basis=>basis.sourceReference='',basis=>basis.hingeReference='joint-centre'];
 for(const mutate of mutations){const d=document();d.assumptions=[assumption()];mutate(d.assumptions[0].basis);assert.throws(()=>validateCurlDocument(d));}
 const d=document();d.assumptions=[assumption()];(d.assumptions[0].basis as any).proportionSd=0;assert.doesNotThrow(()=>validateCurlDocument(d));
});

test('fitted and template provenance must identify versions, sources and internal-hinge convention',()=>{
 const template:EffectiveCurlHingeAssumption={...assumption(),basis:{kind:'anatomical-template',templateId:'t',templateVersion:'v',reference:'source',hingeReference:'effective-internal-hinge'}};
 const fit:EffectiveCurlHingeAssumption={...assumption(),basis:{kind:'fitted-geometry',fitId:'f',modelVersion:'v',sourceStretchSessionIds:['s'],hingeReference:'effective-internal-hinge'}};
 for(const [original,key,value] of [[template,'templateVersion',''],[template,'reference',''],[fit,'modelVersion',''],[fit,'sourceStretchSessionIds',[]],[fit,'sourceStretchSessionIds',['s','s']],[fit,'sourceStretchSessionIds',['']],[fit,'hingeReference','pip-flexion-crease-proxy']] as const){const d=document();d.assumptions=[structuredClone(original)];(d.assumptions[0].basis as any)[key]=value;assert.throws(()=>validateCurlDocument(d));}
});

test('displayed estimate links retain the original same-finger assumption and its date',async()=>{
 const d=document();d.assumptions=[assumption(),assumption('later-estimate')];d.assumptions[1].hingeToTipMm=46;const files=new Files(),c=controller(files,archive(d));assert.equal(c.state.draft.length,'');
 c.edit({length:'42'});assert.equal(await c.save(),true);assert.equal(c.state.document!.entries[0].kind,'effective-curl-length');assert.equal((c.state.document!.entries[0] as EffectiveCurlLengthObservation).displayedAssumptionId,'later-estimate');
 const saved=c.state.document!;saved.assumptions.push({...assumption('new-fit'),hingeToTipMm:48});assert.equal((validateCurlDocument(saved).entries[0] as EffectiveCurlLengthObservation).displayedAssumptionId,'later-estimate');
 for(const bad of ['missing','different-finger','future-estimate']){const invalid=document();invalid.assumptions=[assumption('different-finger',3),{...assumption('future-estimate'),recordedAt:'2026-10-13T00:00:00Z'}];invalid.entries=[{...measurement(),displayedAssumptionId:bad}];assert.throws(()=>validateCurlDocument(invalid));}
});

test('personal and estimate precedence follows ledger and array order, not timestamps',()=>{
 const d=document();d.assumptions=[assumption(),{...assumption('array-last'),recordedAt:'2026-10-10T00:00:00Z',hingeToTipMm:41}];d.entries=[measurement('first'),{...measurement('ledger-last'),recordedAt:'2026-10-10T00:00:00Z',hingeToTipMm:42},{kind:'retraction',id:'withdraw-first',recordedAt:timestamp,entryId:'first',reason:'fixture withdrawal'}];
 const admitted=validateCurlDocument(d);assert.equal(currentCurl(admitted,2).personal?.id,'ledger-last');assert.equal(currentCurl(admitted,2).assumption?.id,'array-last');
 admitted.entries.push({kind:'retraction',id:'withdraw-last',recordedAt:timestamp,entryId:'ledger-last',reason:'fixture withdrawal'});assert.equal(currentCurl(validateCurlDocument(admitted),2).personal,undefined);assert.equal(admitted.entries.length,4);
});

test('retractions only target earlier personal measurements and remain immutable',()=>{
 for(const target of ['estimate-2','future','retraction']){const d=document();d.assumptions=[assumption()];d.entries=[measurement('earlier'),{kind:'retraction',id:'retraction',recordedAt:timestamp,entryId:target,reason:'fixture'},measurement('future')];assert.throws(()=>validateCurlDocument(d));}
 const d=document();d.entries=[measurement(),{kind:'retraction',id:'r1',recordedAt:timestamp,entryId:'reading-2',reason:'fixture'}, {kind:'retraction',id:'r2',recordedAt:timestamp,entryId:'r1',reason:'fixture'}];assert.throws(()=>validateCurlDocument(d));
});

test('archive preserves separate hands and players, checks global identities and exports exact binding',()=>{
 const rh=document(),lh={...document(),id:'doc-lh',hand:'LH' as const,entries:[measurement('left')]};const value=validateCurlArchive({version:'viewer-effective-curl-archive-v1',documents:[rh,lh]});const bytes=curlBytes(value);assert.equal(JSON.parse(new TextDecoder().decode(bytes)).documents.length,2);assert.equal(JSON.parse(exportCurl({value},value,'player','LH')).hand,'LH');assert.equal(curlDocument(value,'player','RH')?.id,'doc-rh');
 const duplicate=structuredClone(value);duplicate.documents[0].entries=[measurement('left')];assert.throws(()=>validateCurlArchive(duplicate),/Duplicate/);
 const duplicateBinding=structuredClone(value);duplicateBinding.documents[1].hand='RH';assert.throws(()=>validateCurlArchive(duplicateBinding),/player\/hand/);
 assert.throws(()=>exportCurl({value},value,'different-player','RH'),/No effective curl companion/);
 const colliding=document();colliding.assumptions=[assumption()];colliding.entries=[measurement('estimate-2')];assert.throws(()=>validateCurlDocument(colliding),/Duplicate/);
});

test('saving another hand preserves existing companion evidence and all four non-thumb fingers',async()=>{
 const files=new Files(),prior=document();prior.assumptions=[assumption()];prior.entries=[measurement()];let i=0;const c=new CurlController({files,load:{value:archive(prior)},playerId:'other-player',hand:'LH',id:()=>`left-${++i}`,now:()=>timestamp});
 for(const f of [2,3,4,5] as const){c.selectFinger(f);assert.equal(c.state.draft.length,'');c.edit({length:String(40+f)});assert.equal(await c.save(),true);}
 const load=await loadCurl(files);assert.deepEqual(curlDocument(load.value,'player','RH'),prior);assert.deepEqual(curlDocument(load.value,'other-player','LH')!.entries.map(e=>e.kind==='effective-curl-length'?e.finger:null),[2,3,4,5]);assert.equal(JSON.parse(new TextDecoder().decode(files.bytes)).documents.length,2);
});

test('malformed, unknown-version and invalid UTF-8 bytes stay read-only and export byte-exact',async()=>{
 for(const raw of [new TextEncoder().encode('{'),new TextEncoder().encode('{"version":"future"}'),new Uint8Array([255,254,0])]){
  const files=new Files();files.bytes=raw;const load=await loadCurl(files);assert.ok(load.error);assert.deepEqual(load.raw,raw);const c=new CurlController({files,load,playerId:'player',hand:'RH'});c.edit({length:'44'});assert.equal(c.state.readOnly,true);assert.equal(await c.save(),false);assert.equal(await c.retract(),false);assert.equal(files.writes.length,0);assert.deepEqual(files.bytes,raw);const exported=JSON.parse(c.exportDocument());assert.deepEqual(new Uint8Array(Buffer.from(exported.data,'base64')),raw);assert.equal(exported.bytes,raw.length);
 }
});

test('pending writes gate input and publish accepted evidence only after durable persistence',async()=>{
 const files=new Files();files.hold=true;const c=controller(files);c.edit({length:'43'});const saving=c.save();assert.equal(c.state.busy,true);assert.equal(c.state.document,undefined);assert.equal(await c.save(),false);c.selectFinger(3);c.edit({length:'100'});assert.equal(c.state.finger,2);assert.equal(c.state.draft.length,'43');assert.equal(files.writes.length,1);let flushed=false;void c.flush().then(()=>{flushed=true;});await Promise.resolve();assert.equal(flushed,false);files.release!();assert.equal(await saving,true);await c.flush();assert.equal(c.state.document!.entries.length,1);assert.equal(c.state.saved,true);assert.equal(flushed,true);
});

test('failed writes retain the exact draft and previous accepted history',async()=>{
 const files=new Files(),c=controller(files);c.edit({length:'43',uncertainty:'0.5'});await c.save();const original=new Uint8Array(files.bytes!);files.fail=true;c.edit({length:'44.5',method:'pip-crease-to-tip'});assert.equal(await c.save(),false);assert.equal(c.state.document!.entries.length,1);assert.equal(c.state.draft.length,'44.5');assert.equal(c.state.draft.method,'pip-crease-to-tip');assert.match(c.state.error!,/draft is retained/);assert.deepEqual(files.bytes,original);
});

test('withdrawing a personal override is append-only and restores the preceding reading',async()=>{
 const files=new Files(),c=controller(files);c.edit({length:'42'});await c.save();c.edit({length:'44'});await c.save();const before=c.state.document!.entries;assert.equal(currentCurl(c.state.document,2).personal?.hingeToTipMm,44);await c.retract();assert.equal(c.state.document!.entries.length,3);assert.deepEqual(c.state.document!.entries.slice(0,2),before);assert.equal(currentCurl(c.state.document,2).personal?.hingeToTipMm,42);assert.equal(c.state.draft.length,'42');await c.retract();assert.equal(currentCurl(c.state.document,2).personal,undefined);assert.equal(c.state.draft.length,'');
});

test('length and uncertainty parsing reject fabricated or nonfinite numeric entries',()=>{
 assert.equal(parseCurlNumber(''),undefined);assert.equal(parseCurlNumber('0'),undefined);assert.equal(parseCurlNumber('-1'),undefined);assert.equal(parseCurlNumber('1e3'),undefined);assert.equal(parseCurlNumber('Infinity'),undefined);assert.equal(parseCurlNumber('43.25'),43.25);assert.equal(parseCurlNumber('.5'),.5);assert.equal(parseCurlNumber('  ',true),null);assert.equal(parseCurlNumber('0',true),0);assert.equal(parseCurlNumber('-1',true),undefined);
});

test('disposing during a write still completes persistence without publishing to a closed editor',async()=>{
 const files=new Files();files.hold=true;const c=controller(files);let emissions=0;c.subscribe(()=>emissions++);c.edit({length:'43'});const saving=c.save(),prior=emissions;c.dispose();files.release!();assert.equal(await saving,true);await c.flush();assert.equal(emissions,prior);assert.equal(JSON.parse(new TextDecoder().decode(files.bytes)).entries.length,1);assert.equal(await c.save(),false);
});
