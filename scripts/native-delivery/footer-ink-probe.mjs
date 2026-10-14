import {spawn} from 'node:child_process';import {createServer} from 'node:http';
import {readFile,writeFile,mkdir,mkdtemp,rm,open} from 'node:fs/promises';import {join} from 'node:path';import {tmpdir} from 'node:os';import {randomBytes,createHash} from 'node:crypto';
const sha256=b=>createHash('sha256').update(b).digest('hex'),canonical=v=>JSON.stringify(v);
import {footerProbeVersion,footerProbeReceipt,validateFooterRuntimeReceipt} from './footer-ink-receipt.mjs';
export async function boundedCommand(program,args,{cwd,timeoutMs=30000}={}){
 return new Promise((resolve,reject)=>{const group=process.platform!=='win32',child=spawn(program,args,{cwd,detached:group,stdio:['ignore','pipe','pipe']});let stdout='',stderr='',timedOut=false;
  child.stdout.on('data',b=>{stdout=(stdout+b).slice(-65536);});child.stderr.on('data',b=>{stderr=(stderr+b).slice(-65536);});
  // Only the detached group CREATED by this invocation is eligible. Compiler
  // and linker descendants must not survive a timeout of their parent.
  const timer=setTimeout(()=>{timedOut=true;try{if(group&&child.pid)process.kill(-child.pid,'SIGKILL');else child.kill('SIGKILL');}catch(error){if(error.code!=='ESRCH')reject(error);}},timeoutMs);
  child.once('error',e=>{clearTimeout(timer);reject(e);});child.once('close',(exitCode,signal)=>{clearTimeout(timer);resolve({exitCode,signal,timedOut,stdout,stderr});});
 });
}
// Failure text is diagnostic only. It never becomes a passed native receipt.
// Read a capped owned helper file and emit only its bounded message fields.
export async function requireFooterHelperSuccess(checked,output){
 if(checked.exitCode===0&&!checked.timedOut)return;
 let detail='',file;
 try{file=await open(output,'r');const stat=await file.stat();if(!stat.isFile()||stat.size>65536)throw Error('oversized');
  const bytes=Buffer.alloc(65537),{bytesRead}=await file.read(bytes,0,bytes.length,0);if(bytesRead>65536)throw Error('oversized');
  const raw=JSON.parse(bytes.subarray(0,bytesRead).toString('utf8'));
  detail=[raw?.message,raw?.result?.message].filter(message=>typeof message==='string').map(message=>message.slice(0,2048)).join('; ');
 }catch(error){detail=error.code==='ENOENT'?'helper wrote no failure JSON':error.message==='oversized'?'helper failure JSON exceeds diagnostic bound':'helper failure JSON unavailable or malformed';}
 finally{await file?.close();}
 const clean=value=>String(value??'').slice(0,4096).replace(/[\u0000-\u001f\u007f-\u009f]/g,' ');
 throw Error(`Actual WK font readiness/drawing failed (exit ${checked.exitCode}, signal ${checked.signal??'none'}, timeout ${!!checked.timedOut}): ${clean(detail)}${checked.stderr?'; stderr: '+clean(checked.stderr):''}`);
}
/** Verified read-only loopback closure; no arbitrary path/source data serving. */
export async function frozenFrontendServer(frontend,pins){
 const active=new Set(),server=createServer(async(req,res)=>{let path;try{path=decodeURIComponent(new URL(req.url,'http://127.0.0.1').pathname).slice(1);}catch{res.writeHead(400).end();return;}
  if(req.method!=='GET'||!Object.hasOwn(pins,path)){res.writeHead(404).end();return;}
  try{const bytes=await readFile(join(frontend,path)),pin=pins[path];if(bytes.length!==pin.size||sha256(bytes)!==pin.sha256)throw Error('Frozen frontend changed');
   const type=path.endsWith('.js')?'text/javascript':path.endsWith('.html')?'text/html':path.endsWith('.css')?'text/css':path.endsWith('.json')?'application/json':'application/octet-stream';
   res.writeHead(200,{'Content-Type':type,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}).end(bytes);
  }catch{res.writeHead(500).end();}
 });server.on('connection',socket=>{active.add(socket);socket.once('close',()=>active.delete(socket));});
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
 return{port:server.address().port,close:async()=>{for(const socket of active)socket.destroy();await new Promise(resolve=>server.close(resolve));}};
}
export async function runFooterInkProbe(ctx,packet,{execute=boundedCommand}={}){
 const {validateCarrierInputs,validatePreparedCarrier}=await import('./score-viewer-carrier-inputs.mjs');
 if(process.platform!=='darwin')throw Error('Actual WKWebView font proof requires the macOS runner.');
 const {inputs,sourceInputs}=await validateCarrierInputs(ctx.source);if(!inputs.runtimeFontProbe)throw Error('Source-bound footer runtime inputs missing');
 await validatePreparedCarrier(ctx.prepared,ctx.manifest.identity);
 if(canonical(sourceInputs)!==canonical(ctx.manifest.identity.sourceInputs))throw Error('Footer runtime source inputs differ');
 const temporary=await mkdtemp(join(tmpdir(),'viewer-footer-ink-')),nonce=randomBytes(16).toString('hex');let server;
 try{
  const helper=join(temporary,'footer-ink-check'),output=join(temporary,'result.json');
  const compiled=await execute('/usr/bin/xcrun',['swiftc','-parse-as-library','-framework','AppKit','-framework','WebKit',join(ctx.source,'scripts/native-delivery/footer-ink-probe.swift'),'-o',helper],{timeoutMs:30000});
  if(compiled.exitCode!==0||compiled.timedOut)throw Error('Cannot compile bounded WK font helper: '+compiled.stderr);
  server=await frozenFrontendServer(join(ctx.prepared,'frontend'),inputs.frontend.files);
  const checked=await execute(helper,[`http://127.0.0.1:${server.port}/footer-ink-probe.html?nonce=${nonce}`,nonce,output],{timeoutMs:85000});
  await requireFooterHelperSuccess(checked,output);
  const raw=JSON.parse(await readFile(output,'utf8'));if(raw.result?.nonce!==nonce)throw Error('WK runtime nonce differs');
  const receipt={version:footerProbeVersion,status:'passed',sourceInputs,bindings:inputs.runtimeFontProbe,frontendDigest:inputs.frontend.digest,
   host:{runtime:raw.runtime,os:raw.os,architecture:raw.helperArchitecture,nodeArchitecture:process.arch,webkitVersion:raw.webkitVersion},result:raw.result,
   logs:{compile:{exitCode:compiled.exitCode,stdout:compiled.stdout,stderr:compiled.stderr},runtime:{exitCode:checked.exitCode,stdout:checked.stdout,stderr:checked.stderr}}};
  validateFooterRuntimeReceipt(receipt,inputs,sourceInputs);const path=join(packet,footerProbeReceipt);await mkdir(join(path,'..'),{recursive:true});await writeFile(path,JSON.stringify(receipt,null,2)+'\n');
  return{status:'passed',version:footerProbeVersion,receipt:footerProbeReceipt,receiptSha256:sha256(await readFile(path)),runtime:'WKWebView',architecture:raw.helperArchitecture,webkitVersion:raw.webkitVersion,
   hosting:'temporary loopback HTTP; not Tauri custom-origin/CSP',minimumOsAcceptance:false,physicalAcceptance:false};
 }finally{await server?.close();await rm(temporary,{recursive:true,force:true});}
}
