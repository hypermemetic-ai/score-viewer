import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,mkdir,writeFile,readFile,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {sha256} from '../scripts/native-release-carrier/inputs.mjs';
import {converterNoticeNames,converterResourceMap,packageConverterNotices,verifyBundledConverterNotices,validateConverterRecipient} from '../scripts/native-release-carrier/score-viewer-converter-release.mjs';
test('converter covered source closure is byte-exact in packet and actual Mac resources and refuses missing/changed files',async()=>{
 const root=await mkdtemp(join(tmpdir(),'gp-recipient-')),source=join(root,'source'),packet=join(root,'packet'),resources=join(root,'resources');
 try{
  const pins={},files={};
  for(const name of converterNoticeNames){const b=Buffer.from('exact '+name+'\n');pins['converter/gp/'+name]={sha256:sha256(b),size:b.length};files['notices/score-converter/'+name]=b;
   const path=join(source,'delivery-input/frontend/converter/gp',name);await mkdir(join(path,'..'),{recursive:true});await writeFile(path,b);
   const mac=join(resources,'notices/score-converter',name);await mkdir(join(mac,'..'),{recursive:true});await writeFile(mac,b);
   files['ISO Score Viewer.app/Contents/Resources/notices/score-converter/'+name]=b;
  }
  await writeFile(join(source,'delivery-input/inputs.json'),JSON.stringify({frontend:{files:pins}}));
  assert.equal(Object.keys(converterResourceMap(pins)).length,5);
  assert.deepEqual(converterResourceMap({'index.html':{}}),{});
  assert.throws(()=>converterResourceMap({'converter/gp/index.js':{}}),/no source\/notice identity/);
  await packageConverterNotices(source,packet);assert.equal(Object.keys(await verifyBundledConverterNotices(source,resources)).length,5);validateConverterRecipient(files,pins);
  for(const name of converterNoticeNames)assert.deepEqual(await readFile(join(packet,'notices/score-converter',name)),files['notices/score-converter/'+name]);
  await assert.rejects(packageConverterNotices(source,packet),/EEXIST/);
  const damaged={...files};delete damaged['ISO Score Viewer.app/Contents/Resources/notices/score-converter/source-package.tgz'];assert.throws(()=>validateConverterRecipient(damaged,pins),/differs/);
  assert.throws(()=>converterResourceMap({'converter/gp/source-package-identity.json':pins['converter/gp/source-package-identity.json']}),/Incomplete/);
 }finally{await rm(root,{recursive:true,force:true});}
});
