// Exact complete-map parity against independent pre-optimization code.
import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {importPackage,selectPresentation} from '../src/package.ts';
import {initialPersonal} from '../src/state.ts';
import {assigned,handFor} from '../src/personal-assignments.ts';
import {PersonalPresentationSession} from '../src/personal-presentation.ts';
import {editUnits} from '../src/selection.ts';
const fixtures=process.env.ANNOTATION_PARITY_FIXTURES??'/tmp/score-viewer-fast-personal-editing-candidate-c92aa49-cpu',out=process.env.ANNOTATION_PARITY_ARTIFACTS??'/tmp/score-viewer-annotation-position-parity';await mkdir(out,{recursive:true});
const names=(process.env.ANNOTATION_PARITY_CASES??'no14,long-dense-120-bars,tie-page-reflow').split(','),labels=(process.env.ANNOTATION_PARITY_VIEWS??'baseline,first-unseen,second-unseen').split(',');
assert.ok(names.length&&names.every(n=>['no14','long-dense-120-bars','tie-page-reflow'].includes(n)));assert.ok(labels.length&&labels.every(n=>['baseline','first-unseen','second-unseen'].includes(n)));
const sha=value=>createHash('sha256').update(value).digest('hex'),report={sourceCommit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),notationCommit:execFileSync('git',['-C','vendor/iso-notation','rev-parse','HEAD'],{encoding:'utf8'}).trim(),oracleRevision:'3b7553f',scope:{names,labels,complete:names.length===3&&labels.length===3},cases:[]};let ordinal=0;
const oldModules=[['fingering-carriers','before-fingering-carriers.mts'],['svg-annotation-clearance','before-annotation-clearance.mts'],['fingering-presentation','before-annotation-positions.mts']];report.oracleModules=[];report.currentModules=[];for(const [name,file] of oldModules){const raw=execFileSync('git',['show','3b7553f:src/'+name+'.ts'],{encoding:'utf8'});let body=name==='fingering-presentation'?raw.split('export interface FingerPaint')[0]:raw;body=body.replace(/from '\.\/([^']+)'/g,(_match,dependency)=>{const old=oldModules.find(([n])=>n===dependency);return "from '"+pathToFileURL(old?resolve(out,old[1]):resolve('src',dependency+'.ts')).href+"'";});body=body.replace(/from '([^'.][^']*)'/g,(_match,dependency)=>"from '"+import.meta.resolve(dependency)+"'");await writeFile(join(out,file),'// Independent historical oracle generated from Git revision 3b7553f.\n'+body);report.oracleModules.push({source:'src/'+name+'.ts',sourceSha256:sha(raw),generated:file,generatedSha256:sha('// Independent historical oracle generated from Git revision 3b7553f.\n'+body)});report.currentModules.push({source:'src/'+name+'.ts',sha256:sha(await readFile('src/'+name+'.ts'))});}
try{for(const keyboard of ['conventional-piano','janko-four-row'])for(const name of names){
 const bytes=await readFile(name==='no14'?'vendor/iso-notation/public/review/schumann-no14-conventional-20261006.tuna':join(fixtures,name+'-'+keyboard+'.tuna')),base=await selectPresentation(await importPackage(bytes),keyboard),state=initialPersonal(base),units=editUnits(base),selected=name==='tie-page-reflow'?units.find(s=>s.ownerIds.includes('written-hold')):units[0];assert.ok(selected);const second=units[units.indexOf(selected)+1]??selected,result={name:name+'-'+keyboard,archiveSha256:sha(bytes),views:[]};report.cases.push(result);
 for(const [label,seat] of [['baseline',undefined],['first-unseen',selected],['second-unseen',second]]){
  if(!labels.includes(label))continue;
  const personal=seat?assigned(base,state,seat,{hand:handFor(base,state,seat.ownerIds[0])==='LH'?'RH':'LH'}):state,view=seat?await new PersonalPresentationSession(base).project(personal):base,fields=()=>({score:structuredClone(view.score),pages:[...view.pages],seats:structuredClone(view.seats),annotationGeometry:structuredClone(view.annotationGeometry),calculatedHandReceipt:structuredClone(view.calculatedHandReceipt)});
  // Each view gets independently instantiated old and new modules and inputs.
  const old=await import(pathToFileURL(resolve(out,'before-annotation-positions.mts')).href+'?view='+ordinal),current=await import(new URL('../src/fingering-presentation.ts?parity='+ordinal++,import.meta.url));
  const before=old.annotationPositions(fields()),after=current.annotationPositions(fields()),normalize=map=>[...map].sort(([a],[b])=>a.localeCompare(b)),expected=normalize(before),actual=normalize(after),differences=expected.filter(([id,p])=>JSON.stringify(p)!==JSON.stringify(after.get(id))).slice(0,8);assert.equal(after.size,view.seats.length,'Complete source alias coverage');assert.equal(before.size,after.size,'Annotation map size differs');assert.equal(differences.length,0,JSON.stringify({case:result.name,label,differences}));assert.equal(JSON.stringify(expected),JSON.stringify(actual),'Complete annotation carrier/value geometry differs');
  const seatPages=new Map(view.seats.map(s=>[s.id,s.page])),lazy=fields(),pageChecks=[];
  for(const pages of [...view.pages.map((_,i)=>[i]),[view.pages.length-1,0,0],[]]){
   const selectedPages=new Set(pages),subset=expected.filter(([id])=>selectedPages.has(seatPages.get(id))),positions=current.annotationPositions(lazy,pages);
   assert.equal(JSON.stringify(normalize(positions)),JSON.stringify(subset),'Visible-page geometry differs from independent old COMPLETE map: '+result.name+' '+label+' '+pages);
   pageChecks.push({pages,positions:positions.size,positionSha256:sha(JSON.stringify(subset)),exact:true});
  }
  assert.equal(JSON.stringify(normalize(current.annotationPositions(lazy))),JSON.stringify(expected),'Partial caches changed default complete result');
  let fontFailure;const bad=fields();if(bad.calculatedHandReceipt?.annotationInkPolicy){bad.calculatedHandReceipt.annotationInkPolicy=structuredClone(bad.calculatedHandReceipt.annotationInkPolicy);bad.calculatedHandReceipt.annotationInkPolicy.footer.fontSha256='0'.repeat(64);
   let oldError,newError;try{old.annotationPositions(bad);}catch(error){oldError=error.message;}try{current.annotationPositions(bad,[0]);}catch(error){newError=error.message;}
   assert.ok(oldError);assert.equal(newError,oldError,'Visible-page font refusal differs from complete old oracle');fontFailure={message:oldError,exact:true};
  }
  const elapsed=pages=>{const samples=[];for(let i=0;i<5;i++){const input=fields(),start=performance.now();current.annotationPositions(input,pages);samples.push(performance.now()-start);}return samples;};
  result.views.push({label,owner:seat?.ownerIds[0],seats:view.seats.length,pages:view.pages.length,pageSha256:view.pages.map(sha),positionSha256:sha(JSON.stringify(expected)),exact:true,pageChecks,fontFailure,
   annotationTiming:{environment:'Node; warmed source/ink caches; fresh complete input each sample; not browser frame acceptance',completeMs:elapsed(undefined),firstPageMs:elapsed([0])}});
 }
 console.log(result.name+': '+result.views.map(v=>v.label+' '+v.seats+' seats exact').join(', '));
}assert.equal(report.cases.length,names.length*2);report.pass=true;}catch(error){report.error=error.stack;throw error;}finally{await writeFile(join(out,'receipt.json'),JSON.stringify(report,null,2)+'\n');}
