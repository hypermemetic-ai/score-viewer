import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {DOMParser} from '@xmldom/xmldom';
import {ANNOTATION_INK_POLICY,ensureAnnotationInkPolicyReady,verifyFooterAssets,annotationInkPolicyFor,footerGlyphPoints,applyAnnotationInkPolicy} from '../src/annotation-ink-policy';
import {svgClassStyles,resolvedSvgStyle} from '../src/svg-style';
import {actualPageObstacles,boxesOverlap} from '../src/svg-annotation-clearance';
import {unzipSync,strFromU8,strToU8} from 'fflate';
import {hashBytes,importPackage,archivePackage,readEditionContent} from '../src/package';import {rebuildEdition} from '../src/edition-rebuild';import {ensurePianoReady} from '../src/piano-readiness';
const css='.janko-page-num{font-family:"Liberation Serif", "Century Schoolbook", "Baskerville", "DejaVu Serif", "Times New Roman", Georgia, serif;font-style:italic;font-weight:400;font-size:8pt;text-anchor:end}';
const page=(attrs='',text='Page 2 of 3')=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 850"><style>${css}</style><text class="janko-page-num" x="575" y="830" ${attrs}>${text}</text></svg>`;
test('independently verified pinned font cells reserve actual footer ink, allow distant air, and keep unknown typography conservative',async()=>{
 await ensureAnnotationInkPolicyReady(ANNOTATION_INK_POLICY);
 const known=actualPageObstacles(page(),new Map(),ANNOTATION_INK_POLICY).boxes[0],legacy=actualPageObstacles(page(),new Map()).boxes[0];
 assert.ok(known[0]>515&&known[2]>575);assert.ok(known[1]<820&&known[3]>835,'full face vertical cells and hinting allowance included');
 assert.equal(boxesOverlap([35,808,40,812],known),false);assert.equal(boxesOverlap([35,808,40,812],legacy),true);
 assert.ok(boxesOverlap([530,823,538,829],known),'a true footer overlap remains blocked');
 for(const svg of [page('style="font-family:serif"'),page('style="font-kerning:normal"'),page('style="font-variant-caps:small-caps"'),page('','Unknown footer')]){
  const b=actualPageObstacles(svg,new Map(),ANNOTATION_INK_POLICY).boxes[0];assert.equal(b[0],0);assert.equal(b[2],600);}
 const stroke=actualPageObstacles(page('stroke="black" stroke-width="4" stroke-linejoin="round"'),new Map(),ANNOTATION_INK_POLICY).boxes[0];
 assert.ok(stroke[0]<known[0]&&stroke[3]>known[3]);
 for(const attribute of ['dy="80"','dominant-baseline="hanging"','alignment-baseline="middle"'])
  assert.throws(()=>actualPageObstacles(page().replace('<text ',`<g ${attribute}><text `).replace('</text>','</text></g>'),new Map(),ANNOTATION_INK_POLICY),/Unsupported SVG text positioning/);
 assert.throws(()=>actualPageObstacles(page('transform="scale(1e308)"'),new Map(),ANNOTATION_INK_POLICY),/Unbounded/);
});
test('actual style cascade and each SVG subtree are independent of app styles and other page styles',async()=>{
 await ensureAnnotationInkPolicyReady(ANNOTATION_INK_POLICY);
 const doc=new DOMParser().parseFromString(`<html><style>@font-face{font-family:App} body{color:red}</style>${page('font-size="200"')}<svg><style>.janko-page-num{font-size:90pt}</style></svg></html>`,'text/html');
 const root=doc.getElementsByTagName('svg')[0] as unknown as SVGElement,el=root.getElementsByTagName('text')[0],before=root.toString();
 const styles=svgClassStyles(root);assert.equal(resolvedSvgStyle(el,styles,{})['font-size'],'8pt','class overrides presentation attribute');
 el.setAttribute('style','font-size:9pt');assert.equal(resolvedSvgStyle(el,styles,{})['font-size'],'9pt');el.removeAttribute('style');
 // xmldom has no CSSStyleDeclaration; mounted browser coverage independently
 // exercises the actual display adapter. The inventory itself stays scoped.
 assert.equal(svgClassStyles(root).get('janko-page-num')!['font-size'],'8pt');
 assert.throws(()=>svgClassStyles(doc as unknown as Document),/Unsupported/);
 assert.ok(footerGlyphPoints(el,resolvedSvgStyle(el,styles,{}),ANNOTATION_INK_POLICY));
 assert.equal(annotationInkPolicyFor({calculatedHandReceipt:{version:'viewer-calculated-hand-edition-v1'}}),undefined);
 assert.throws(()=>annotationInkPolicyFor({calculatedHandReceipt:{version:'viewer-calculated-hand-edition-v2',annotationInkPolicy:{...ANNOTATION_INK_POLICY,footer:{...ANNOTATION_INK_POLICY.footer,fontSha256:'0'.repeat(64)}}}}),/altered/);
 assert.equal(root.toString(),before,'metric admission does not mutate literal SVG');
 applyAnnotationInkPolicy(root,undefined);assert.equal(root.toString(),before,'historical drawing adapter is inert');
});
test('altered face and metrics cannot supply font readiness or imported box authority',async()=>{
 const face=new Uint8Array(readFileSync(new URL('../src/LiberationSerif-Italic.ttf',import.meta.url)));await verifyFooterAssets(face);
 const altered=face.slice();altered[100]^=1;await assert.rejects(verifyFooterAssets(altered),/exact bytes/);
 await assert.rejects(verifyFooterAssets(face,'{"glyphs":{"P":{"advance":1}}}'),/exact bytes/);
});
test('a frozen V2/receiptV1 edition keeps its exact bytes and is engraved again from its own hands and fingers',async()=>{
 const bytes=new Uint8Array(readFileSync(new URL('../fixtures/authored-calculated-preparation-v2.tuna',import.meta.url))),copy=bytes.slice();
 assert.equal(await hashBytes(bytes),'ece4c99bf27f179f7fb1adecba71795150df318edaa51a9f721cb09b2b33d9b1');
 // Its pages used the retired opposite-hand beam connector, so they no longer reproduce.
 await assert.rejects(importPackage(bytes),/current shared engraving policy/);
 const content=await readEditionContent(bytes);assert.equal(content.preparationIdentity!.version,'viewer-piano-preparation-v2');
 const receipt=JSON.parse(strFromU8(content.files[content.manifest.calculatedHandReceipt!]));assert.equal(receipt.version,'viewer-calculated-hand-edition-v1');
 assert.equal(annotationInkPolicyFor({calculatedHandReceipt:receipt}),undefined);
 const rebuilt=await rebuildEdition(bytes),p=await importPackage(rebuilt.bytes);
 assert.deepEqual(bytes,copy,'the saved archive is never changed');
 assert.deepEqual([...p.availablePresentations!].sort(),['conventional-piano','janko-four-row']);
 for(const layout of p.availablePresentations!){const result=await ensurePianoReady({packageBytes:rebuilt.bytes,layout});assert.ok(['reading','editable'].includes(result.status),layout);}
});

test('a changed receipt is refused on opening, and a member that differs from its pinned hash is refused before engraving again',async()=>{
 const bytes=new Uint8Array(readFileSync(new URL('../fixtures/authored-calculated-preparation-v2.tuna',import.meta.url)));
 for(const repin of [true,false]){
  const files=unzipSync(bytes),m=JSON.parse(strFromU8(files['manifest.json'])),receipt=JSON.parse(strFromU8(files[m.calculatedHandReceipt]));
  receipt.sourceInventory.owners[0].pitch=Number(receipt.sourceInventory.owners[0].pitch)+1;files[m.calculatedHandReceipt]=strToU8(JSON.stringify(receipt));
  if(repin)m.files[m.calculatedHandReceipt]=await hashBytes(files[m.calculatedHandReceipt]);
  const changed=archivePackage(m,files);
  await assert.rejects(importPackage(changed));
  if(!repin)await assert.rejects(rebuildEdition(changed,{refusal:Error('stays saved')}),/stays saved/);
 }
});

test('the footer probe edition opens through its receipt on both keyboards at the ISO pin',async()=>{
 const bytes=new Uint8Array(readFileSync(new URL('../fixtures/footer-probe-calculated-edition.tuna',import.meta.url)));
 assert.equal(await hashBytes(bytes),'f174c6baa8cb34694db1202c1c64a5a057a675ffea9b52d19994613846836c8d','src/footer-ink-probe.ts names these bytes');
 const fixture=await readEditionContent(new Uint8Array(readFileSync(new URL('../fixtures/authored-calculated-preparation-v2.tuna',import.meta.url))));
 for(const layout of ['conventional-piano','janko-four-row'] as const){
  const result=await ensurePianoReady({packageBytes:bytes,layout});
  if(result.status!=='editable'&&result.status!=='ready')assert.fail(`${layout}: ${result.status}`);
  const p=result.package;
  assert.equal(p.preparationIdentity!.version,'viewer-piano-preparation-v3');assert.equal(p.calculatedHandReceipt!.version,'viewer-calculated-hand-edition-v2');
  assert.deepEqual(annotationInkPolicyFor(p),ANNOTATION_INK_POLICY);assert.equal(p.sourceSha256,fixture.sourceSha256);
 }
});
