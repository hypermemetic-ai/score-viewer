import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {importPackage,selectPresentation} from '../src/package';
import {rebuildEdition} from '../src/edition-rebuild';
import {engraveEdition} from '../src/score-transposition';
import {editionPrintedNotices,titleAreaInk,titleAreaOverlap} from '../src/title-area-clearance';

// The owner's No. 14 printed two notices on page one (Encoding, Reference).
// Engraved again from the current shared options alone, it printed its
// source's six, and the sixth lay under bar 1's measure number, slur and beam.
const bytes=new Uint8Array(readFileSync(new URL('../fixtures/schumann-op68-no14.tuna',import.meta.url))),
 early=await importPackage(bytes,{allowLegacyTempo:true}),
 notices=(svg:string)=>[...svg.matchAll(/<text class="janko-source-notice"[^>]*>([^<]*)<\/text>/g)].map(m=>m[1]),
 printed=early.score.publicationNotices!.slice(0,2);

test('page one ink: a header line overprinted by the music is found, and how deep it reaches',()=>{
 const page=(music:string)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 800"><defs><style>.n { font-size: 7pt; }</style></defs>
  <rect width="100%" height="100%" fill="#FFFFFF"/>
  <g id="page-header"><text class="janko-source-notice" x="20.00" y="100.00" font-family="serif" font-size="5.5">Reference: Schuberth &amp; Co.</text></g>
  <g id="system-1">${music}</g><g id="page-footer"><text x="580" y="790" class="n">Page 1 of 1</text></g></svg>`;
 // The notice's ink runs from 94.775 to 101.65, with 2 points of air below
 // it. A stroke reaches half its width beyond its line, times √2 under any transform.
 assert.equal(titleAreaOverlap(page('<line x1="20" y1="120" x2="580" y2="120" stroke="#000" stroke-width="1"/>')),0);
 assert.ok(Math.abs(titleAreaOverlap(page('<line x1="20" y1="101" x2="580" y2="101" stroke="#000" stroke-width="1"/>'))-(101.65+2-(101-Math.SQRT1_2)))<1e-9,'a staff line through the notice');
 assert.ok(titleAreaOverlap(page('<path d="M 30 130 Q 60 90 90 130" fill="#000"/>'))>0,'a slur bowing up into it');
 assert.ok(titleAreaOverlap(page('<path transform="translate(40 99) scale(0.01 -0.01)" d="M 0 0 L 100 100 Z" fill="#000"/>'))>0,'a transformed glyph');
 assert.ok(titleAreaOverlap(page('<text x="21.8" y="104" class="n" text-anchor="end">1</text>'))>0,'a measure number');
 assert.equal(titleAreaOverlap(page('<rect x="400" y="96" width="10" height="4" fill="#FFFFFF"/>')),0,'ink beside the line, past its end, does not touch it');
 assert.ok(titleAreaOverlap(page('<rect x="40" y="96" width="10" height="4" fill="#FFFFFF"/>'))>0,'a white knockout would hide the text');
 assert.equal(titleAreaInk(page('')).header.length,1);
});

test('an edition engraved again prints the notices its saved page one printed, clear of the first system on both layouts',async()=>{
 assert.equal(early.renderingRecipe,undefined,'an early-format edition keeps no recipe; its page one says what it printed');
 assert.equal(early.score.publicationNotices!.length,6);
 assert.deepEqual(editionPrintedNotices(early),printed);
 const next=await importPackage((await rebuildEdition(bytes,{})).bytes,{allowLegacyTempo:true});
 for(const layout of ['janko-four-row','conventional-piano'] as const){
  const view=await selectPresentation(next,layout);
  assert.deepEqual(view.renderingRecipe!.options.printedNotices,printed,`${layout} recipe names its notices`);
  assert.deepEqual(notices(view.pages[0]).length,2,`${layout} page one prints them`);
  assert.equal(titleAreaOverlap(view.pages[0],0),0,`${layout}: no header or notice ink meets system ink on page one`);
  assert.equal(titleAreaOverlap(view.pages[0]),0,`${layout}: and it keeps its air`);
  assert.deepEqual(editionPrintedNotices(view),printed,'engraving it again later keeps them too');
 }
});

test('when page one\'s music reaches its title area, page one\'s header grows until it stands clear',async()=>{
 // A base that names no notices: the source's six print, which on the
 // ordinary header reach into bar 1.
 const base={...early,pages:[],renderingRecipe:undefined};
 assert.equal(editionPrintedNotices(base),undefined);
 const engraved=await engraveEdition({base,source:early.score,sourceBytes:early.files['score.json'],views:[{layout:'janko-four-row',score:early.score}],refusal:'refused'}),
  view=await selectPresentation(await importPackage(engraved.bytes,{allowLegacyTempo:true}),'janko-four-row'),o=view.renderingRecipe!.options;
 assert.equal(notices(view.pages[0]).length,6,'every notice prints');
 assert.equal(titleAreaOverlap(view.pages[0],0),0,'none of them meets the music');
 assert.ok((o.headerHeight as number)>48,'page one\'s header grew');
 assert.equal(o.runningHeaderHeight,48,'later pages keep the header they had');
});
