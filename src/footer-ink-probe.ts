/** Public, isolated runtime acceptance entry. No main/Host/library boot. Reads
 * a saved calculated edition of the pinned public fixture through the ordinary
 * read-only piano reader; the viewer no longer calculates editions. */
import {ensurePianoReady} from './piano-readiness';
import {hashBytes} from './package';
import {annotationPositions} from './fingering-presentation';
import {ANNOTATION_INK_POLICY,ensureAnnotationInkPolicyReady,annotationInkPolicyFor,applyAnnotationInkPolicy,assertAnnotationInkPolicyReady,footerStyle} from './annotation-ink-policy';
import {actualPageObstacles,boxesOverlap} from './svg-annotation-clearance';
import {identityHash} from './piano-preparation-identity';
const fixtureUrl=new URL('../fixtures/authored-calculated-preparation-v2.isoscore',import.meta.url);
const fixtureSha256='ece4c99bf27f179f7fb1adecba71795150df318edaa51a9f721cb09b2b33d9b1';
// Both keyboard views of that fixture's music with the hands and fingers the
// former calculator saved, drawn again at the ISO pin (test/support/footer-probe-edition.ts).
const editionUrl=new URL('../fixtures/footer-probe-calculated-edition.isoscore',import.meta.url);
const editionSha256='dec7f831b48d5a2cc316640e71fac3c49e0dffd12dfea0bbe60899dfc4ed1d50';
const probeVersion='viewer-native-footer-ink-probe-v2';
const sourceCss='.janko-page-num{font-family:"Liberation Serif", "Century Schoolbook", "Baskerville", "DejaVu Serif", "Times New Roman", Georgia, serif;font-style:italic;font-weight:400;font-size:8pt;text-anchor:end}';
const primitive=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 850"><style>${sourceCss}</style><text class="janko-page-num" x="575" y="830">Page 2 of 3</text></svg>`;
const require=(condition:unknown,message:string):void=>{if(!condition)throw Error(message);};
const nonce=new URL(location.href).searchParams.get('nonce');
// The native helper records each stage as it begins, so a check that stalls,
// is suspended or is killed names the stage it reached.
let stage='starting';
function progress(next:string){
 stage=next;const report={nonce,progress:next,t:Math.round(performance.now()),visibility:document.visibilityState};
 (window as any).__viewerFooterInkProgress=report;(window as any).webkit?.messageHandlers?.footerInkProgress?.postMessage(report);
}
function mount(literal:string,width=600):SVGSVGElement{
 const host=document.createElement('div');host.innerHTML=literal;const svg=host.querySelector('svg')!;svg.style.width=width+'px';document.querySelector('#probe')!.append(host);return svg;
}
const snapshot=(svg:SVGSVGElement)=>{const el=svg.querySelector('text.janko-page-num') as SVGGraphicsElement,b=el.getBBox(),s=getComputedStyle(el);
 return{literal:svg.outerHTML,bbox:[b.x,b.y,b.width,b.height],family:s.fontFamily,fontStyle:s.fontStyle,fontWeight:s.fontWeight,fontSize:s.fontSize,textAnchor:s.textAnchor};};
function isolatedFooter(svg:SVGSVGElement,el:SVGGraphicsElement):SVGSVGElement{
 const isolated=svg.cloneNode(false) as SVGSVGElement;for(const style of svg.querySelectorAll('style'))isolated.append(style.cloneNode(true));
 let branch=el.cloneNode(true),parent=el.parentNode;while(parent!==svg){require(parent instanceof SVGElement,'Returned footer is outside its source SVG.');const shallow=parent!.cloneNode(false);shallow.appendChild(branch);branch=shallow;parent=parent!.parentNode;}isolated.append(branch);return isolated;
}
function sourceTransform(svg:SVGSVGElement,el:SVGGraphicsElement):number[]{
 const chain:SVGGraphicsElement[]=[];let parent:Element|null=el;while(parent){chain.unshift(parent as SVGGraphicsElement);if(parent===svg)break;parent=parent.parentElement;}
 require(chain[0]===svg,'Returned footer has no source SVG ancestry.');let a=[1,0,0,1,0,0];
 for(const node of chain){const m=node.transform?.baseVal.consolidate()?.matrix;if(m){const b=[m.a,m.b,m.c,m.d,m.e,m.f];a=[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];}}
 return a;
}
const boxCorners=(b:DOMRect,m:number[])=>[[b.x,b.y],[b.x+b.width,b.y],[b.x,b.y+b.height],[b.x+b.width,b.y+b.height]].map(([x,y])=>[m[0]*x+m[2]*y+m[4],m[1]*x+m[3]*y+m[5]]);
const drawingRules=(el:Element)=>{const s=getComputedStyle(el);return{family:s.fontFamily,fontKerning:s.fontKerning,fontVariantLigatures:s.fontVariantLigatures,textRendering:s.textRendering,fontSize:s.fontSize,stroke:s.stroke,fontStyle:s.fontStyle,fontWeight:s.fontWeight,textAnchor:s.textAnchor};};
async function run(){
 progress('fixture');const fixture=new Uint8Array(await(await fetch(fixtureUrl)).arrayBuffer());require(await hashBytes(fixture)===fixtureSha256,'Public fixture differs from frozen original.');
 progress('saved edition');const bytes=new Uint8Array(await(await fetch(editionUrl)).arrayBuffer());require(await hashBytes(bytes)===editionSha256,'Saved calculated edition differs from its frozen bytes.');
 const policySha256=await identityHash(ANNOTATION_INK_POLICY),legacy=mount(primitive);
 progress('measured face');await document.fonts.ready;const before=snapshot(legacy);await ensureAnnotationInkPolicyReady(ANNOTATION_INK_POLICY);await document.fonts.ready;
 applyAnnotationInkPolicy(legacy,undefined);const after=snapshot(legacy);require(JSON.stringify(before)===JSON.stringify(after),'Registering the unique face changed actual historical drawing.');legacy.parentElement!.remove();
 const views=[];let sourceSha256:string|undefined;
 for(const layout of ['conventional-piano','janko-four-row'] as const){
  progress('read '+layout);const abort=new AbortController(),timer=setTimeout(()=>abort.abort(),30_000);
  let result;try{result=await ensurePianoReady({packageBytes:bytes,layout,signal:abort.signal});}finally{clearTimeout(timer);}
  require(result.status==='editable'||result.status==='ready','Ordinary cold reader failed: '+('message'in result?result.message:result.status));if(result.status!=='editable'&&result.status!=='ready')throw Error('Missing complete saved edition');
  const p=result.package,positions=annotationPositions(p);require(p.preparationIdentity?.version==='viewer-piano-preparation-v3'&&p.calculatedHandReceipt?.version==='viewer-calculated-hand-edition-v2','Production identity/policy dispatch differs.');
  require(JSON.stringify(annotationInkPolicyFor(p))===JSON.stringify(ANNOTATION_INK_POLICY),'Receiving realm admitted another policy.');
  sourceSha256??=p.sourceSha256;
  require(p.sourceSha256===sourceSha256&&p.score.notes.length===p.sourceScore!.notes.length&&positions.size===p.seats.length,'Public source/complete annotation coverage differs.');
  let footers=0;const footerEnclosures=[];
  for(const [page,literal]of p.pages.entries()){progress(`footer ${layout} page ${page+1} of ${p.pages.length}`);const svg=mount(literal),els=[...svg.querySelectorAll<SVGGraphicsElement>('text.janko-page-num')];require(els.length===1,'Actual returned page footer is missing or duplicated.');
   const el=els[0],matrix=sourceTransform(svg,el),x=Number(el.getAttribute('x')),y=Number(el.getAttribute('y')),text=el.textContent!;
   const isolated=isolatedFooter(svg,el);
   const cover=actualPageObstacles(isolated.outerHTML,new Map(),ANNOTATION_INK_POLICY).boxes[0];applyAnnotationInkPolicy(svg,annotationInkPolicyFor(p));await document.fonts.ready;
   const b=el.getBBox(),points=boxCorners(b,matrix),rules=drawingRules(el);require(points.every(([x,y])=>x>=cover[0]&&x<=cover[2]&&y>=cover[1]&&y<=cover[3]),'Actual returned-page footer escapes exact cell cover.');
   require(rules.family.includes(ANNOTATION_INK_POLICY.footer.family)&&rules.textRendering==='geometricprecision','Actual new page footer did not adopt precise unique face.');
   footerEnclosures.push({page,text,x,y,matrix,cover,points,rules,literalSha256:await hashBytes(new TextEncoder().encode(literal)),status:'passed'});footers++;svg.parentElement!.remove();}
  views.push({layout,status:result.status,sourceSha256:p.sourceSha256,owners:p.score.notes.length,seats:p.seats.length,annotations:positions.size,pages:p.pages.length,footers,footerEnclosures,
   preparationVersion:p.preparationIdentity!.version,receiptVersion:p.calculatedHandReceipt!.version,policySha256:await identityHash(annotationInkPolicyFor(p)),editionSha256:await hashBytes(result.packageBytes),coldReader:true});
 }
 progress('mounted variants');const mounted=[];
 // Unrelated HTML and sibling SVG styles must never enter source style inventory.
 const appStyle=document.createElement('style');appStyle.textContent='@font-face{font-family:UnrelatedProbe;src:local(serif)} body{color:black}';document.head.append(appStyle);
 const sibling=mount('<svg xmlns="http://www.w3.org/2000/svg"><style>.janko-page-num{font-size:90pt}</style></svg>');
 for(const zoom of [.3,1,2.7])for(const matrix of [[1,0,0,1,0,0],[-1,.2,.3,1,650,0],[1.3,-.2,.4,.8,2,4]]){
  const svg=mount(primitive,600*zoom),el=svg.querySelector('text') as SVGGraphicsElement;el.setAttribute('transform',`matrix(${matrix.join(' ')})`);
  const cover=actualPageObstacles(svg.outerHTML,new Map(),ANNOTATION_INK_POLICY).boxes[0];applyAnnotationInkPolicy(svg,ANNOTATION_INK_POLICY);await document.fonts.ready;
  const b=el.getBBox(),points=boxCorners(b,matrix),s=getComputedStyle(el);
  require(points.every(([x,y])=>x>=cover[0]&&x<=cover[2]&&y>=cover[1]&&y<=cover[3]),'Mounted exact-face glyph cell escapes independently derived cover.');
  require(s.fontFamily.includes(ANNOTATION_INK_POLICY.footer.family)&&s.fontKerning==='none'&&s.fontVariantLigatures==='none'&&s.textRendering==='geometricprecision','Mounted actual precise shaping differs.');
  mounted.push({zoom,matrix,cover,points,rules:drawingRules(el),status:'passed'});svg.parentElement!.remove();
 }sibling.parentElement!.remove();appStyle.remove();
 progress('clearance and ambiguity');const cover=actualPageObstacles(primitive,new Map(),ANNOTATION_INK_POLICY).boxes[0],clearance={distantOverlap:boxesOverlap([35,808,40,812],cover),actualOverlap:boxesOverlap([530,823,538,829],cover)};
 require(!clearance.distantOverlap&&clearance.actualOverlap,'Actual overlap or empty-air check differs.');
 const fake={seats:[],score:{notes:[]},pages:[],calculatedHandReceipt:{version:'viewer-calculated-hand-edition-v2',annotationInkPolicy:ANNOTATION_INK_POLICY}} as any;annotationPositions(fake);
 const face=new FontFace(ANNOTATION_INK_POLICY.footer.family,'local(serif)',{style:'italic',weight:'400'});document.fonts.add(face);
 let cacheRefused=false,readinessRefused=false;try{try{annotationPositions(fake);}catch{cacheRefused=true;}try{assertAnnotationInkPolicyReady(ANNOTATION_INK_POLICY);}catch{readinessRefused=true;}}finally{document.fonts.delete(face);}
 require(cacheRefused&&readinessRefused,'Ambiguous-family cached/readiness admission did not refuse.');
 progress('unavailable face');const actualFace=[...document.fonts].find(f=>f.family.replace(/[\"']/g,'')===ANNOTATION_INK_POLICY.footer.family)!;require(actualFace,'Verified Window face unavailable before refusal control.');document.fonts.delete(actualFace);
 let unavailableCacheRefused=false,unavailableReadinessRefused=false,unavailable;const unavailableAbort=new AbortController(),unavailableTimer=setTimeout(()=>unavailableAbort.abort(),30_000);
 try{try{annotationPositions(fake);}catch{unavailableCacheRefused=true;}try{assertAnnotationInkPolicyReady(ANNOTATION_INK_POLICY);}catch{unavailableReadinessRefused=true;}
  unavailable=await ensurePianoReady({packageBytes:bytes,layout:'conventional-piano',signal:unavailableAbort.signal});
 }finally{clearTimeout(unavailableTimer);document.fonts.add(actualFace);}assertAnnotationInkPolicyReady(ANNOTATION_INK_POLICY);
 require(unavailableCacheRefused&&unavailableReadinessRefused&&unavailable.status==='unsupported'&&'retainedPackageBytes'in unavailable&&await hashBytes(unavailable.retainedPackageBytes)===editionSha256,'Unavailable face did not make the reader refuse the saved edition and retain it.');
 const availability={cacheRefused:unavailableCacheRefused,readinessRefused:unavailableReadinessRefused,readerStatus:unavailable.status,retainedSha256:editionSha256};
 progress('cancelled reading');const controller=new AbortController();controller.abort();const cancelled=await ensurePianoReady({packageBytes:bytes,layout:'conventional-piano',signal:controller.signal});
 require(cancelled.status==='cancelled'&&'retainedPackageBytes'in cancelled&&await hashBytes(cancelled.retainedPackageBytes)===editionSha256,'Cancelled reading did not retain the saved edition.');
 return{version:probeVersion,status:'passed',nonce,fixtureSha256,editionSha256,policySha256,sourceSha256,views,mounted,
  legacy:{before,after,status:'passed'},clearance,availability,ambiguity:{cacheRefused,readinessRefused},cancellation:{status:cancelled.status,retainedSha256:editionSha256},
  platform:{userAgent:navigator.userAgent},limits:{hosting:'temporary loopback HTTP; not Tauri custom-origin/CSP',minimumOsAcceptance:false,physicalAcceptance:false}};
}
void run().then(result=>{(window as any).__viewerFooterInkProbe=result;(window as any).webkit?.messageHandlers?.footerInk?.postMessage(result);})
 .catch(error=>{const result={version:probeVersion,status:'failed',nonce,message:`At stage '${stage}': ${(error as Error).message}`};
  (window as any).__viewerFooterInkProbe=result;(window as any).webkit?.messageHandlers?.footerInk?.postMessage(result);});
