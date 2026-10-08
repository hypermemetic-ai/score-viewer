import {createHash} from 'node:crypto';
export const footerProbeVersion='viewer-native-footer-ink-probe-v1';
export const footerProbeReceipt='native-validation/footer-ink/receipt.json';
const canonical=v=>JSON.stringify(v&&typeof v==='object'?Array.isArray(v)?v.map(x=>JSON.parse(canonical(x))):Object.fromEntries(Object.keys(v).sort().map(k=>[k,JSON.parse(canonical(v[k]))])):v);
export const semanticHash=v=>createHash('sha256').update(canonical(v)).digest('hex');
const fail=message=>{throw Error('Footer runtime proof: '+message);};
const sha=value=>typeof value==='string'&&/^[a-f0-9]{64}$/.test(value);
export const footerMetricsSha256='7e79f4bb94546f2e05f294aa91873d287c5e67e564264c1456f254dc3f83f3a3';
/** Independent receipt calculation from the reviewed literal metrics. Returned
 * boxes are observations, never authorities for the expected mathematical cover. */
export function expectedFooterCover(literal,text,x,y,matrix){
 if(typeof literal!=='string'||createHash('sha256').update(literal).digest('hex')!==footerMetricsSha256)fail('Reviewed exact metric literal differs');
 const m=JSON.parse(literal),scale=8*4/3/2048,pad=2;
 if(m.unitsPerEm!==2048||m.drawingAllowancePageUnits!==pad||!/^Page [1-9]\d* of [1-9]\d*$/.test(text)||text.length>64||
  ![x,y,...matrix].every(Number.isFinite)||matrix.length!==6)fail('Unsupported observed footer inputs');
 const chars=[...text];let cursor=x-chars.reduce((sum,c)=>sum+m.glyphs[c].advance,0)*scale;
 const low=Math.min(...Object.values(m.verticalCell).map(v=>v[0])),high=Math.max(...Object.values(m.verticalCell).map(v=>v[1])),points=[];
 for(const c of chars){const g=m.glyphs[c];if(g.bounds){const x0=cursor+Math.min(0,g.bounds[0])*scale-pad,x1=cursor+Math.max(g.advance,g.bounds[2])*scale+pad,
  y0=y-high*scale-pad,y1=y-low*scale+pad;points.push([x0,y0],[x1,y0],[x0,y1],[x1,y1]);}cursor+=g.advance*scale;}
 const transformed=points.map(([x,y])=>[matrix[0]*x+matrix[2]*y+matrix[4],matrix[1]*x+matrix[3]*y+matrix[5]]),
  magnitude=Math.max(...points.flatMap(([x,y])=>[Math.abs(x),Math.abs(y),Math.abs(matrix[0]*x)+Math.abs(matrix[2]*y)+Math.abs(matrix[4]),Math.abs(matrix[1]*x)+Math.abs(matrix[3]*y)+Math.abs(matrix[5])])),
  margin=1e-6+magnitude*Number.EPSILON*64;
 return[Math.min(...transformed.map(p=>p[0]))-margin,Math.min(...transformed.map(p=>p[1]))-margin,Math.max(...transformed.map(p=>p[0]))+margin,Math.max(...transformed.map(p=>p[1]))+margin];
}
function validateEnclosure(q,expectedCover){
 if(q.status!=='passed'||canonical(q.cover)!==canonical(expectedCover)||!q.cover.every(Number.isFinite)||
  !Array.isArray(q.points)||q.points.length!==4||q.points.some(p=>!Array.isArray(p)||p.length!==2||!p.every(Number.isFinite)||p[0]<q.cover[0]||p[0]>q.cover[2]||p[1]<q.cover[1]||p[1]>q.cover[3]))fail('Actual mounted glyph cell escapes independent exact cover');
 const s=q.rules;if(!s||!s.family.includes('Viewer Calculated Footer Serif v1')||s.fontKerning!=='none'||s.fontVariantLigatures!=='none'||s.textRendering!=='geometricprecision'||
  s.stroke!=='none'||s.fontStyle!=='italic'||s.fontWeight!=='400'||s.textAnchor!=='end'||!(Math.abs(Number.parseFloat(s.fontSize)-32/3)<1e-4))fail('Actual drawing rules differ');
}
export function validateFooterRuntimeReceipt(receipt,inputs,sourceInputs){
 const expected=inputs.runtimeFontProbe;
 if(!expected||receipt?.version!==footerProbeVersion||receipt.status!=='passed'||canonical(receipt.sourceInputs)!==canonical(sourceInputs)||
  canonical(receipt.bindings)!==canonical(expected)||receipt.frontendDigest!==inputs.frontend.digest||receipt.host?.runtime!=='WKWebView'||
  !['arm64','x64'].includes(receipt.host.architecture)||!['arm64','x64'].includes(receipt.host.nodeArchitecture)||
  typeof receipt.host.webkitVersion!=='string'||!receipt.host.webkitVersion||typeof receipt.host.os!=='string'||!receipt.host.os)fail('Actual source/host/bindings differ');
 const r=receipt.result;
 if(r?.version!==footerProbeVersion||r.status!=='passed'||typeof r.nonce!=='string'||r.nonce.length!==32||r.fixtureSha256!==expected.fixture.sha256||
  r.policySha256!==expected.policySha256||r.sourceSha256!==expected.fixture.sourceSha256||
  !Array.isArray(r.workers)||r.workers.length!==2||!Array.isArray(r.mounted)||r.mounted.length!==9)fail('Actual runtime source/cases differ');
 for(const layout of ['conventional-piano','janko-four-row']){
  const q=r.workers.filter(q=>q.layout===layout);if(q.length!==1)fail('Missing/duplicated ordinary worker layout');const w=q[0];
  if(!['ready','editable'].includes(w.status)||w.sourceSha256!==expected.fixture.sourceSha256||w.owners!==expected.fixture.ownerCount||
   !Number.isSafeInteger(w.seats)||w.seats<w.owners||w.annotations!==w.seats||!Number.isSafeInteger(w.pages)||w.pages<1||w.footers!==w.pages||
   w.preparationVersion!=='viewer-piano-preparation-v3'||w.receiptVersion!=='viewer-calculated-hand-edition-v2'||w.policySha256!==expected.policySha256||
   !sha(w.outputArchiveSha256)||w.independentColdReader!==true||!Array.isArray(w.footerEnclosures)||w.footerEnclosures.length!==w.pages)fail('Ordinary worker/independent reader did not pass');
  for(const [page,q]of w.footerEnclosures.entries()){
   if(q.page!==page||q.text!==`Page ${page+1} of ${w.pages}`||!sha(q.literalSha256))fail('Returned-page footer identity differs');
   validateEnclosure(q,expectedFooterCover(expected.metricsLiteral,q.text,q.x,q.y,q.matrix));
  }
 }
 const matrices=[[1,0,0,1,0,0],[-1,.2,.3,1,650,0],[1.3,-.2,.4,.8,2,4]],seen=new Set();
 for(const q of r.mounted){const key=JSON.stringify([q.zoom,q.matrix]);
  if(seen.has(key)||![.3,1,2.7].includes(q.zoom)||!matrices.some(m=>canonical(m)===canonical(q.matrix)))fail('Unknown/duplicated mounted variant');seen.add(key);
  validateEnclosure(q,expectedFooterCover(expected.metricsLiteral,'Page 2 of 3',575,830,q.matrix));
 }
 if(r.legacy?.status!=='passed'||canonical(r.legacy.before)!==canonical(r.legacy.after)||typeof r.legacy.before?.literal!=='string'||
  !Array.isArray(r.legacy.before.bbox)||r.legacy.before.bbox.length!==4||!r.legacy.before.bbox.every(Number.isFinite)||
  !r.legacy.before.family?.includes('Liberation Serif')||r.legacy.before.family.includes('Viewer Calculated Footer Serif'))fail('Actual historical drawing changed');
 if(r.clearance?.distantOverlap!==false||r.clearance.actualOverlap!==true||r.ambiguity?.cacheRefused!==true||r.ambiguity.readinessRefused!==true||
  r.availability?.cacheRefused!==true||r.availability.readinessRefused!==true||!['ready','editable'].includes(r.availability.workerStatus)||
  r.availability.independentReaderStatus!=='unsupported'||r.availability.retainedSha256!==expected.fixture.sha256||
  r.cancellation?.status!=='cancelled'||r.cancellation.retainedSha256!==expected.fixture.sha256||
  r.limits?.hosting!=='temporary loopback HTTP; not Tauri custom-origin/CSP'||r.limits.minimumOsAcceptance!==false||r.limits.physicalAcceptance!==false||
  typeof r.platform?.userAgent!=='string'||!r.platform.userAgent)fail('Clearance/refusal/retention/runtime limits differ');
 return receipt;
}
