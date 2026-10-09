import test from 'node:test';import assert from 'node:assert/strict';
import {createPianoPreparationIdentity,validatePianoPreparationIdentity,canonicalOwnerAssignments,identityHash,canonicalJson} from '../src/piano-preparation-identity';
import type {ScorePackage,FingerLayer} from '../src/package';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
const source:QuantizedGridScore={id:'authored-identity',title:'Identity study',composer:'Fixture',ticksPerBeat:48,totalTicks:192,sourceBarTicks:[0,192],
 notes:[48,72].map((pitch,i)=>({id:'owner-'+i,eventKind:'pitched' as const,pitch:{octave:Math.floor(pitch/12),pitchClass:pitch%12},startTick:24+i*48,durationTicks:24,hand:i?'RH':'LH'})),barlines:[],timeSignatures:[],tempos:[],dynamics:[],pedals:[],
 referencePerformanceTempo:{version:'reference-performance-tempo-v1',bpm:90,beat:{numerator:1,denominator:4},provenance:{kind:'editorial',reference:'Authored fixture'}}};
function fixture(){const fingerLayer={version:'piano-finger-assignments-v1',plannerVersion:'finite-static-piano-assignments-v1',inputSha256:'e'.repeat(64),operatorConstraints:[],
 attacks:source.notes.map((n,i)=>({id:n.startTick+':'+(n.pitch.octave*12+n.pitch.pitchClass),hand:n.hand,finger:i?3:5,row:2,owners:[{id:n.id}]})),sourceOwnerToAttack:{}} as unknown as FingerLayer;
 return{sourceScore:source,score:source,sourceSha256:'a'.repeat(64),keyboardLayout:'janko-four-row',profileId:'fixture-profile',profileSha256:'b'.repeat(64),
 manifest:{revision:'c'.repeat(64),semanticSha256:'c'.repeat(64)},fingerLayer,pages:['<svg>authored</svg>'],seats:[],renderingRecipe:undefined} as unknown as ScorePackage;}
test('identity is stable under assignment/object order and changes with every actual compatibility input',async()=>{
 const p=fixture(),base=await createPianoPreparationIdentity(p,'calculate');
 const reordered=structuredClone(p);reordered.fingerLayer!.attacks.reverse();
 assert.deepEqual(await createPianoPreparationIdentity(reordered,'calculate'),base);
 assert.equal(await identityHash({b:2,a:1}),await identityHash({a:1,b:2}));
 for(const mutate of [
  (q:ScorePackage)=>{q.sourceSha256='d'.repeat(64);},(q:ScorePackage)=>{q.profileSha256='d'.repeat(64);},
  (q:ScorePackage)=>{q.fingerLayer!.attacks[0].finger=4;},(q:ScorePackage)=>{q.fingerLayer!.attacks[0].hand='RH';},
  (q:ScorePackage)=>{q.pages[0]+=' ';},(q:ScorePackage)=>{q.manifest.revision='d'.repeat(64);},
  (q:ScorePackage)=>{q.manifest.engineVersion='different-reviewed-engine';},
  (q:ScorePackage)=>{q.renderingRecipe={engineId:'different-recipe'} as any;},
  (q:ScorePackage)=>{q.score.referencePerformanceTempo!.bpm=91;},
 ]){const q=structuredClone(p);mutate(q);assert.notEqual((await createPianoPreparationIdentity(q,'calculate')).sha256,base.sha256);}
 assert.notEqual((await createPianoPreparationIdentity(p,'calculate',100)).sha256,base.sha256);
 assert.notEqual((await createPianoPreparationIdentity(p,'retain-imported')).sha256,base.sha256);
 assert.equal(canonicalOwnerAssignments(p.fingerLayer!).length,2);
});
test('independent identity admission refuses altered fields even with a freshly recomputed outer digest',async()=>{
 const p=fixture(),base=await createPianoPreparationIdentity(p,'calculate');
 assert.deepEqual(await validatePianoPreparationIdentity(base,p),base);
 for(const key of ['sourceSha256','profileSha256','contextSha256','authoritySha256','assignmentSha256','calculatorSha256','payloadSha256','requestSha256','recipeSha256'] as const){
  const q={...base,[key]:'f'.repeat(64)};const{sha256:_,...content}=q;q.sha256=await identityHash(content);
  await assert.rejects(validatePianoPreparationIdentity(q,p),/differs from its actual/);
 }
 for(const [key,value] of [['layoutId','conventional-piano'],['profileId','other-profile'],['handPolicy','retain-imported'],['maxExpansions',1]] as const){
  const q={...base,[key]:value};const{sha256:_,...content}=q;q.sha256=await identityHash(content);
  await assert.rejects(validatePianoPreparationIdentity(q,p),/differs from its actual/);
 }
 await assert.rejects(validatePianoPreparationIdentity({...base,extra:true},p),/differs from its actual/);
 await assert.rejects(validatePianoPreparationIdentity({...base,version:'unknown'},p),/Unsupported/);
 assert.equal(canonicalJson(p.fingerLayer!.attacks),canonicalJson(fixture().fingerLayer!.attacks),'construction does not mutate its layer');
});
