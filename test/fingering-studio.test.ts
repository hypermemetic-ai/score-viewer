import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {prepareFingeringStudio} from '../vendor/iso-notation/scripts/lib/fingering-studio-review';
import {ROUND_83_CANDIDATES,ROUND_83_METADATA,NO14_FINGERING_CANDIDATES,getCandidate} from '../vendor/iso-notation/src/render/iso/candidates';
import {renderCandidatesView} from '../vendor/iso-notation/src/render/iso/studio';
import {renderIsoCrop} from '../vendor/iso-notation/src/render/iso/engine';
import {lintIsoScore} from '../vendor/iso-notation/src/render/iso/linter';
import {ANNOTATION_COLOR} from '../src/fingering-presentation';
import {STEM_END_FINGERING_CANDIDATES,STEM_END_FINGERING_ROUND} from '../vendor/iso-notation/src/render/iso/candidates';
import {frozenNo14StudioRefused,isFrozenNo14StudioRefusal} from './support/frozen-no14-studio';

const require=createRequire(new URL('../package.json',import.meta.url));
const {DOMParser,XMLSerializer}=require('@xmldom/xmldom') as {
 DOMParser:new()=>{parseFromString:(svg:string,type:string)=>Document};
 XMLSerializer:new()=>{serializeToString:(node:Node)=>string};
};
type Studio=Awaited<ReturnType<typeof prepareFingeringStudio>>;
const prepared=await prepareFingeringStudio(readFileSync(new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url))).catch(error=>{if(isFrozenNo14StudioRefusal(error))return undefined;throw error;});
// The studio's frozen replay is refused at this pin; its tests stay as todo.
const todo=prepared?undefined:frozenNo14StudioRefused,review=prepared as Studio;
const p=review?.package as Studio['package'],before=JSON.stringify(p),digits=new Map(p?.seats.map(s=>[s.id,s.pitchDigit]));
const parse=(svg:string)=>new DOMParser().parseFromString(svg,'image/svg+xml');
function musicalSvg(svg:string){
 const doc=parse(svg);
 for(const text of Array.from(doc.getElementsByTagName('text'))){
  if(text.hasAttribute('data-finger-seat')){text.parentNode!.removeChild(text);continue;}
  const id=text.getAttribute('data-viewer-seat');
  if(id){text.textContent=digits.get(id)!;text.removeAttribute('data-viewer-seat');}
 }
 return new XMLSerializer().serializeToString(doc);
}

test('separate fingering round preserves current registry and reproduces frozen source pages/seats exactly',{todo},()=>{
 // Round 83 (No. 14) is parked, not replaced, now that ISO's developer studio has opened later rounds.
 assert.equal(ROUND_83_METADATA.round,83);assert.deepEqual(ROUND_83_CANDIDATES.map(c=>c.id),['no14-absolute-condensed']);for(const c of ROUND_83_CANDIDATES)assert.equal(getCandidate(c.id),c);
 for(const c of NO14_FINGERING_CANDIDATES)assert.equal(getCandidate(c.id),c);
 assert.deepEqual(review.presentation.pages,p.pages);assert.deepEqual(review.presentation.seats,p.seats);
 assert.equal(p.pages.length,3);assert.equal(p.seats.length,381);assert.equal(p.score.notes.length,383);
 assert.deepEqual(review.receipt.lint,{violations:[],warnings:[]});
});

test('all three shared-painter modes retain page geometry and every musical primitive',{todo},()=>{
 const fingerByContact=new Map(p.fingerLayer!.attacks.map(a=>[a.id,a.finger]));
 for(const [page,original]of p.pages.entries())for(const mode of ['pitch','annotations','replacement'] as const){
  const painted=review.paint(original,mode),doc=parse(painted),root=doc.documentElement;
  assert.equal(root.getAttribute('viewBox'),parse(original).documentElement.getAttribute('viewBox'));
  assert.equal(musicalSvg(painted),musicalSvg(original),`${mode},page${page+1}`);
  if(mode==='pitch')assert.equal(painted,original,'pitch control is byte-exact');
  const labels=Array.from(doc.getElementsByTagName('text')),annotations=labels.filter(t=>t.hasAttribute('data-finger-seat'));
  assert.equal(annotations.length,mode==='annotations'?p.seats.filter(s=>s.page===page).length:0);
  for(const seat of p.seats.filter(s=>s.page===page)){
   const label=labels.find(t=>t.getAttribute('data-viewer-seat')===seat.id)!;
   assert.equal(label.textContent,mode==='replacement'?String(fingerByContact.get(seat.contactId)):seat.pitchDigit);
   if(mode==='annotations'){
    const annotation=annotations.find(t=>t.getAttribute('data-finger-seat')===seat.id)!,position=review.positions.get(seat.id)!;
    assert.equal(annotation.textContent,String(fingerByContact.get(seat.contactId)));
    assert.equal(Number(annotation.getAttribute('x')),position.x);assert.equal(Number(annotation.getAttribute('y')),position.baseline);
    assert.equal(annotation.getAttribute('font-size'),`${position.fontSize}pt`);assert.ok(annotation.getAttribute('style')!.includes(`fill:${ANNOTATION_COLOR}`));
   }
  }
 }
 assert.equal(JSON.stringify(p),before,'source package is unchanged');
});

test('literal windows retain crop bounds, neighboring onsets and source-contact identity',{todo},()=>{
 const entry=review.config.scores[review.config.fingeringReview!.scoreId];
 assert.equal(p.renderingRecipe,undefined,'literal legacy package exercises the fallback recipe');
 assert.equal(entry.options.retainedEngraving,true,'crops execute the retained recipe that admitted these layouts');
 assert.equal(entry.options.elasticSpacing,undefined);
 assert.ok(review.presentation.layouts.every(layout=>layout.geometry.elasticTimeMaps===undefined));
 assert.deepEqual(lintIsoScore(p.score,entry.options,entry.tokens,undefined,review.presentation.layouts).diagnostics,[]);
 for(const [start,count]of [[1,6],[13,6],[43,6],[48,2]]){
  const crop=renderIsoCrop(p.score,start,count,entry.options,entry.tokens,undefined,review.presentation.layouts);
  for(const mode of ['annotations','replacement'] as const){
   const painted=review.paint(crop,mode);
   assert.equal(musicalSvg(painted),musicalSvg(crop),`${mode},bars${start}–${start+count-1}`);
   assert.equal(parse(painted).documentElement.getAttribute('viewBox'),parse(crop).documentElement.getAttribute('viewBox'));
  }
 }
 assert.equal(JSON.stringify(p),before);
});

test('existing inline studio renders every declared page and passage for all modes',{todo},()=>{
 const html=renderCandidatesView(review.config);
 assert.equal((html.match(/data-candidate="no14-fingering-/g)??[]).length,3);
 assert.equal((html.match(/class="janko-svg"/g)??[]).length,21);
 for(const c of NO14_FINGERING_CANDIDATES){
  assert.match(html,new RegExp(`data-candidate="${c.id}" data-lint="clean"`));
  assert.match(html,new RegExp(`<h3>${c.label}</h3>`));
 }
 assert.equal(JSON.stringify(p),before);
});

test('revised comparison is separately selectable without changing the current round',()=>{
 assert.equal(STEM_END_FINGERING_ROUND.round,86);assert.equal(STEM_END_FINGERING_CANDIDATES.length,3);
 assert.deepEqual(STEM_END_FINGERING_CANDIDATES.map(c=>c.fingerPresentation),['pitch','annotations','replacement']);
 for(const c of STEM_END_FINGERING_CANDIDATES){assert.equal(getCandidate(c.id),c);assert.deepEqual(c.windows,NO14_FINGERING_CANDIDATES[0].windows);}
 assert.equal(ROUND_83_METADATA.round,83);
});
