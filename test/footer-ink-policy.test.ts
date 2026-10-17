import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {DOMParser} from '@xmldom/xmldom';
import {ANNOTATION_INK_POLICY,ensureAnnotationInkPolicyReady,verifyFooterAssets,annotationInkPolicyFor,footerGlyphPoints,applyAnnotationInkPolicy} from '../src/annotation-ink-policy';
import {svgClassStyles,resolvedSvgStyle} from '../src/svg-style';
import {actualPageObstacles,boxesOverlap} from '../src/svg-annotation-clearance';
import {unzipSync,strFromU8,strToU8} from 'fflate';
import {hashBytes,importPackage,archivePackage} from '../src/package';import {ensurePianoReady} from '../src/piano-readiness';
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
test('independently frozen V2/receiptV1 edition retains exact historical hash and drawing',async()=>{
 const bytes=new Uint8Array(readFileSync(new URL('../fixtures/authored-calculated-preparation-v2.isoscore',import.meta.url)));
 assert.equal(await hashBytes(bytes),'ece4c99bf27f179f7fb1adecba71795150df318edaa51a9f721cb09b2b33d9b1');
 const p=await importPackage(bytes);assert.equal(p.preparationIdentity!.version,'viewer-piano-preparation-v2');assert.equal(p.calculatedHandReceipt!.version,'viewer-calculated-hand-edition-v1');
 assert.equal(annotationInkPolicyFor(p),undefined);
 const result=await ensurePianoReady({packageBytes:bytes,layout:'conventional-piano'});assert.equal(result.status,'editable');assert.deepEqual(result.packageBytes,bytes);
});


test('legacy calculated inventory normalization refuses changed pitch or unknown discriminator after repinning archive hashes',async()=>{
 const bytes=new Uint8Array(readFileSync(new URL('../fixtures/authored-calculated-preparation-v2.isoscore',import.meta.url)));
 for(const mutate of [(owner:Record<string,unknown>)=>{owner.eventKind='other';},
   (owner:Record<string,unknown>)=>{owner.eventKind='unpitched';owner.soundingPitch=null;owner.referencePitch=owner.pitch;},
   (owner:Record<string,unknown>)=>{owner.pitch=Number(owner.pitch)+1;}]){
  const files=unzipSync(bytes),m=JSON.parse(strFromU8(files['manifest.json'])),receipt=JSON.parse(strFromU8(files[m.calculatedHandReceipt]));
  mutate(receipt.sourceInventory.owners[0]);files[m.calculatedHandReceipt]=strToU8(JSON.stringify(receipt));
  m.files[m.calculatedHandReceipt]=await hashBytes(files[m.calculatedHandReceipt]);
  await assert.rejects(importPackage(archivePackage(m,files)),/inventory|receipt differs/);
 }
});
