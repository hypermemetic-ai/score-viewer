import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,cp,rm,readFile,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {verifyCalculatorPin,calculatorRevision} from '../scripts/check-calculator-pin.mjs';
import {lockedLocalDependencies} from '../scripts/native-release-carrier/inputs.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
test('reviewed calculator is byte-exact, locked and carried as an ordinary local package',async()=>{
 const checked=await verifyCalculatorPin(root);assert.equal(checked.calculatorRevision,calculatorRevision);assert.equal(checked.installedMembers,81);
 const pkg=JSON.parse(await readFile(join(root,'package.json'),'utf8')),lock=JSON.parse(await readFile(join(root,'package-lock.json'),'utf8'));
 assert.ok(lockedLocalDependencies(pkg,lock).has(`vendor/fingering-calculator/fingering-calculator-${calculatorRevision}.tgz`));
 const core=await import('@hypermemetic-ai/fingering-calculator');assert.equal(core.EXPLORATORY_CALIBRATION_PROTOCOL.coverage.janko.total,208);
 assert.deepEqual(core.STRETCH_CALIBRATION_PROTOCOL.phases,['relative-fingertip-reach','progressive-pairs','conditional-triples']);
 assert.equal(core.STRETCH_CALIBRATION_GRADES[4].reachable,true);assert.equal(core.STRETCH_CALIBRATION_GRADES[5].reachable,false);
 assert.deepEqual(core.EFFECTIVE_CURL_REFINEMENT_CONTRACT.fingers,[2,3,4,5]);
 assert.equal(core.STRETCH_CALIBRATION_KEYBOARD_PROFILE.pressedMotion.transform[11],-10);
 assert.equal(Object.isFrozen(core.STRETCH_CALIBRATION_KEYBOARD_PROFILE.forms[0].playableTerraces[0]),true);
 await assert.rejects(()=>import('@hypermemetic-ai/fingering-calculator/dist/exploratory-calibration.js'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
});
test('archive, installed output and source identity tampering refuse admission',async()=>{
 const fixture=await mkdtemp(join(tmpdir(),'calculator-pin-test-'));
 try{
  for(const file of ['package.json','package-lock.json','vendor/fingering-calculator','node_modules/@hypermemetic-ai/fingering-calculator'])
   await cp(join(root,file),join(fixture,file),{recursive:true});
  await verifyCalculatorPin(fixture);
  const member=join(fixture,'node_modules/@hypermemetic-ai/fingering-calculator/dist/exploratory-calibration.js'),original=await readFile(member);
  await writeFile(member,Buffer.concat([original,Buffer.from('\n// modified\n')]));await assert.rejects(()=>verifyCalculatorPin(fixture),/installed member differs/);await writeFile(member,original);
  const archive=join(fixture,`vendor/fingering-calculator/fingering-calculator-${calculatorRevision}.tgz`),bytes=await readFile(archive);
  await writeFile(archive,bytes.subarray(0,bytes.length-1));await assert.rejects(()=>verifyCalculatorPin(fixture),/archive bytes differ/);await writeFile(archive,bytes);
  const identityFile=join(fixture,'vendor/fingering-calculator/source-package-identity.json'),identity=JSON.parse(await readFile(identityFile,'utf8'));
  identity.sourceRevision='0'.repeat(40);await writeFile(identityFile,JSON.stringify(identity));await assert.rejects(()=>verifyCalculatorPin(fixture),/reviewed source identity differs/);
 }finally{await rm(fixture,{recursive:true,force:true});}
});
