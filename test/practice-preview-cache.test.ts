import test from 'node:test';import assert from 'node:assert/strict';
import {PracticePreviewCache} from '../src/practice-preview-cache';

/** Admission cache contracts do not need a guessed browser text bbox. Actual
 * source rendering, cold/warm geometry and lifecycle are inspected separately. */
function fixture(){
 Object.assign(globalThis,{innerWidth:1920,innerHeight:1080,devicePixelRatio:1});
 const face={status:'loaded',family:'Score face',style:'normal',weight:'700',stretch:'normal'} as FontFace&{sizeAdjust?:string},
  fonts=Object.assign([face],{status:'loaded'}),overview={clientHeight:800},
  mount={clientWidth:1200,ownerDocument:{fonts},closest:()=>overview} as unknown as HTMLElement,
  cache=new PracticePreviewCache();let builds=0;
 const build=()=>({id:++builds}) as unknown as SVGSVGElement;
 return {cache,face,fonts,overview,mount,build,builds:()=>builds};
}
test('preview reuse is bounded to the same exact source and mounted font/viewport context',()=>{
 const f=fixture(),pages=['source page'];const first=f.cache.get([0,1,2,3],f.mount,pages,f.build);
 assert.equal(f.cache.get([0,1,2,3],f.mount,[...pages],f.build),first);
 const next=f.cache.get([4,5,6,7],f.mount,pages,f.build);assert.notEqual(next,first);
 assert.equal(f.cache.get([0,1,2,3],f.mount,pages,f.build),first);
 f.overview.clientHeight=750;assert.notEqual(f.cache.get([0,1,2,3],f.mount,pages,f.build),first);
 f.face.weight='400';assert.notEqual(f.cache.get([0,1,2,3],f.mount,pages,f.build),first);
 const changed=f.cache.get([0,1,2,3],f.mount,['altered source page'],f.build);assert.notEqual(changed,first);
 assert.equal(f.builds(),5);
});
test('loaded face metric overrides invalidate otherwise identical preview contexts',()=>{
 const f=fixture(),pages=['source'];let previous=f.cache.get([0],f.mount,pages,f.build);
 for(const field of ['sizeAdjust','ascentOverride','descentOverride','lineGapOverride'] as const){
  f.face[field]='110%';const next=f.cache.get([0],f.mount,pages,f.build);assert.notEqual(next,previous);previous=next;
  assert.equal(f.cache.get([0],f.mount,pages,f.build),next);
 }
 assert.equal(f.builds(),5);
});
test('pending fonts and failed admission never supply a successful cached preview',()=>{
 const f=fixture();f.fonts.status='loading';
 assert.notEqual(f.cache.get([0],f.mount,['source'],f.build),f.cache.get([0],f.mount,['source'],f.build));
 f.fonts.status='loaded';const ready=f.cache.get([0],f.mount,['source'],f.build);
 assert.equal(f.cache.get([0],f.mount,['source'],f.build),ready);
 let failures=0;for(let i=0;i<2;i++)assert.throws(()=>f.cache.get([0],f.mount,['malformed source'],()=>{failures++;throw Error('Unsupported source relation');}),/Unsupported source relation/);
 assert.equal(failures,2);assert.notEqual(f.cache.get([0],f.mount,['source'],f.build),ready);
});
test('least recently used previews and closed visits release their cache',()=>{
 const f=fixture(),pages=['source'],first=f.cache.get([0],f.mount,pages,f.build);
 for(let i=1;i<=15;i++)f.cache.get([i],f.mount,pages,f.build);
 assert.equal(f.cache.get([0],f.mount,pages,f.build),first);
 f.cache.get([16],f.mount,pages,f.build);assert.equal(f.cache.get([0],f.mount,pages,f.build),first);
 const prior=f.builds();f.cache.get([1],f.mount,pages,f.build);assert.equal(f.builds(),prior+1);
 f.cache.clear();assert.notEqual(f.cache.get([0],f.mount,pages,f.build),first);
});
