import test from 'node:test';import assert from 'node:assert/strict';
import {readFile,mkdtemp,writeFile,rm} from 'node:fs/promises';import {tmpdir} from 'node:os';import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {expectedFooterCover,validateFooterRuntimeReceipt,semanticHash,footerProbeVersion} from '../scripts/native-release-carrier/footer-ink-receipt.mjs';
import {boundedCommand,frozenFrontendServer} from '../scripts/native-release-carrier/footer-ink-probe.mjs';
import {actualPageObstacles} from '../src/svg-annotation-clearance.ts';
import {ANNOTATION_INK_POLICY,ensureAnnotationInkPolicyReady} from '../src/annotation-ink-policy.ts';
import {FOOTER_METRICS_JSON} from '../src/footer-font-data.ts';
const sha=b=>createHash('sha256').update(b).digest('hex'),matrices=[[1,0,0,1,0,0],[-1,.2,.3,1,650,0],[1.3,-.2,.4,.8,2,4]],
 css='.janko-page-num{font-family:"Liberation Serif", "Century Schoolbook", "Baskerville", "DejaVu Serif", "Times New Roman", Georgia, serif;font-style:italic;font-weight:400;font-size:8pt;text-anchor:end}',
 rules={family:'"Viewer Calculated Footer Serif v1"',fontKerning:'none',fontVariantLigatures:'none',textRendering:'geometricprecision',fontSize:'10.6667px',fontStyle:'italic',fontWeight:'400',textAnchor:'end',stroke:'none'};
const actualCover=(text,x,y,matrix)=>actualPageObstacles(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 850"><style>${css}</style><text class="janko-page-num" x="${x}" y="${y}" transform="matrix(${matrix.join(' ')})">${text}</text></svg>`,new Map(),ANNOTATION_INK_POLICY).boxes[0];
// Synthetic receipts test validator admission. They do not assert macOS paint.
function syntheticReceipt(){
 const sourceInputs={version:'test-source-bound'},bindings={version:footerProbeVersion,policySha256:semanticHash(ANNOTATION_INK_POLICY),metricsLiteral:FOOTER_METRICS_JSON,
  fixture:{sha256:'a'.repeat(64),sourceSha256:'b'.repeat(64),ownerCount:6}},inputs={runtimeFontProbe:bindings,frontend:{digest:'c'.repeat(64)}};
 const enclosure=(text,x,y,matrix)=>{const cover=actualCover(text,x,y,matrix),points=[[cover[0],cover[1]],[cover[2],cover[1]],[cover[0],cover[3]],[cover[2],cover[3]]];return{status:'passed',cover,points,rules};};
 const mounted=[.3,1,2.7].flatMap(zoom=>matrices.map(matrix=>({zoom,matrix,...enclosure('Page 2 of 3',575,830,matrix)}))),
  legacy={literal:'<svg>unchanged historical footer</svg>',bbox:[1,2,3,4],family:'"Liberation Serif", serif'},
  workers=['conventional-piano','janko-four-row'].map(layout=>({layout,status:'ready',sourceSha256:bindings.fixture.sourceSha256,owners:6,seats:6,annotations:6,pages:1,footers:1,
   footerEnclosures:[{page:0,text:'Page 1 of 1',x:575,y:830,matrix:matrices[0],literalSha256:'d'.repeat(64),...enclosure('Page 1 of 1',575,830,matrices[0])}],
   preparationVersion:'viewer-piano-preparation-v3',receiptVersion:'viewer-calculated-hand-edition-v2',policySha256:bindings.policySha256,outputArchiveSha256:'e'.repeat(64),independentColdReader:true}));
 const result={version:footerProbeVersion,status:'passed',nonce:'0'.repeat(32),fixtureSha256:bindings.fixture.sha256,policySha256:bindings.policySha256,sourceSha256:bindings.fixture.sourceSha256,workers,mounted,
  legacy:{status:'passed',before:legacy,after:structuredClone(legacy)},clearance:{distantOverlap:false,actualOverlap:true},ambiguity:{cacheRefused:true,readinessRefused:true},
  availability:{cacheRefused:true,readinessRefused:true,workerStatus:'ready',independentReaderStatus:'unsupported',retainedSha256:bindings.fixture.sha256},
  cancellation:{status:'cancelled',retainedSha256:bindings.fixture.sha256},platform:{userAgent:'Synthetic validator test'},
  limits:{hosting:'temporary loopback HTTP; not Tauri custom-origin/CSP',minimumOsAcceptance:false,physicalAcceptance:false}};
 return{inputs,sourceInputs,receipt:{version:footerProbeVersion,status:'passed',sourceInputs,bindings,frontendDigest:inputs.frontend.digest,
  host:{runtime:'WKWebView',os:'test OS',architecture:'arm64',nodeArchitecture:'x64',webkitVersion:'test framework version'},result}};
}
test('independent pinned-metric derivation matches actual production covers under nine public mounted variants',async()=>{
 await ensureAnnotationInkPolicyReady(ANNOTATION_INK_POLICY);
 for(const matrix of matrices)assert.deepEqual(actualCover('Page 2 of 3',575,830,matrix),expectedFooterCover(FOOTER_METRICS_JSON,'Page 2 of 3',575,830,matrix));
 assert.throws(()=>expectedFooterCover(FOOTER_METRICS_JSON+' ','Page 2 of 3',575,830,matrices[0]),/metric literal differs/);
});
test('runtime receipts reject inflated covers, missing actual-page enclosures, wrong rules, failed reader and unproved helper architecture',async()=>{
 await ensureAnnotationInkPolicyReady(ANNOTATION_INK_POLICY);const s=syntheticReceipt();assert.equal(validateFooterRuntimeReceipt(s.receipt,s.inputs,s.sourceInputs),s.receipt,'Rosetta Node architecture may differ from independently recorded helper');
 for(const mutate of [r=>r.result.mounted[0].cover[0]-=100,r=>r.result.workers[0].footerEnclosures[0].cover[2]+=100,
  r=>r.result.workers[0].footerEnclosures=[],r=>r.result.mounted[0].rules.fontSize='10.5px',r=>r.result.workers[1].status='cancelled',
  r=>r.result.availability.independentReaderStatus='ready',r=>delete r.host.architecture,r=>delete r.host.webkitVersion,r=>r.result.legacy.after.bbox[0]+=1]){
  const bad=structuredClone(s.receipt);mutate(bad);assert.throws(()=>validateFooterRuntimeReceipt(bad,s.inputs,s.sourceInputs),/Footer runtime proof/);
 }
});
test('frozen loopback serves only the reviewed byte closure and refuses mutations; close releases the listener',async()=>{
 const dir=await mkdtemp(join(tmpdir(),'footer-probe-http-'));let server;
 try{const bytes=Buffer.from('source-bound public frontend');await writeFile(join(dir,'entry.html'),bytes);server=await frozenFrontendServer(dir,{'entry.html':{sha256:sha(bytes),size:bytes.length}});
  const root=`http://127.0.0.1:${server.port}`;assert.deepEqual(Buffer.from(await(await fetch(root+'/entry.html')).arrayBuffer()),bytes);
  assert.equal((await fetch(root+'/private.isoscore')).status,404);assert.equal((await fetch(root+'/entry.html',{method:'POST'})).status,404);
  await writeFile(join(dir,'entry.html'),'altered frontend');assert.equal((await fetch(root+'/entry.html')).status,500);await server.close();server=undefined;
  await assert.rejects(fetch(root+'/entry.html'));
 }finally{await server?.close();await rm(dir,{recursive:true,force:true});}
});
test('timeout terminates only the detached compiler group including owned descendants',async()=>{
 if(process.platform==='win32')return;
 const script="const{spawn}=require('node:child_process');const child=spawn(process.execPath,['-e','setInterval(()=>{},1000)'],{stdio:'inherit'});console.log(child.pid);setInterval(()=>{},1000)";
 const result=await boundedCommand(process.execPath,['-e',script],{timeoutMs:500});assert.equal(result.timedOut,true);assert.equal(result.signal,'SIGKILL');
 const pid=Number(result.stdout.trim());assert.ok(Number.isSafeInteger(pid)&&pid>0);
 // Linux may retain a terminated orphan as a zombie briefly; no process may
 // continue running. This test never targets another process group.
 try{process.kill(pid,0);const stat=await readFile(`/proc/${pid}/stat`,'utf8');assert.equal(stat.slice(stat.lastIndexOf(')')+2).split(' ')[0],'Z');}catch(e){if(!['ESRCH','ENOENT'].includes(e.code))throw e;}
});
