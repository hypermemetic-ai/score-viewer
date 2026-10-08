import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {unzipSync,strFromU8} from 'fflate';import {hashBytes,importPackage,selectPresentation,validateLayerAsync} from '../src/package';
import {prepareConventionalPresentation} from '../src/presentation-generation';
import {packagePresentation} from '../src/package-presentation';
import {normalizeHandPlanningInput} from '../vendor/iso-notation/src/model/hand-planning-input';
import {validateConventionalFingerLayer} from '../vendor/iso-notation/src/model/conventional-finger-layer';
const bytes=readFileSync(new URL('../vendor/iso-notation/public/review/schumann-no14-conventional-actions-20261007.isoscore',import.meta.url)),files=unzipSync(bytes),manifest=JSON.parse(strFromU8(files['manifest.json'])),recipe=JSON.parse(strFromU8(files['rendering-recipe.json'])),layer=JSON.parse(strFromU8(files['fingers.json']));
test('trusted real-engine worker reproduces the corrected CLI action route and every matching package page/seat',async()=>{
 const result=await prepareConventionalPresentation({sourceBytes:files['source-score.json'],recipe});
 assert.equal(result.sourceSha256,await hashBytes(files['source-score.json']));assert.equal(result.effectiveHandSha256,layer.effectiveHandSha256);
 const expected=structuredClone(layer),actual=structuredClone(result.layer);delete expected.search.elapsedMs;delete (actual.search as Partial<typeof actual.search>).elapsedMs;assert.deepEqual(actual,expected);assert.equal(result.score,strFromU8(files['score.json']));assert.equal(result.seats,strFromU8(files['seats.json']));
 assert.deepEqual(result.pages,manifest.pages.map((name:string)=>strFromU8(files[name])));assert.equal(result.replay.valid,true);assert.equal(result.replay.performedAttacks,570);assert.equal(result.allFive,true);assert.deepEqual(result.lint,{violations:0,warnings:0});
 assert.equal(result.layer.plannerVersion,'conventional-joint-contact-route-v2');assert.equal(result.layer.profileId,'conventional-unmeasured-actions-v2');
 assert.ok(result.layer.actionCertificate);assert.equal(result.layer.actionCertificate.version,'conventional-hand-actions-v2');assert.ok(result.layer.actionCertificate.positions.length);assert.ok(result.layer.actionCertificate.actions.length);
 assert.equal(result.layer.actionsSha256,await hashBytes(JSON.stringify(result.layer.actionCertificate)));
});
test('corrected package binds required hand actions and retains the original Jankó companion without certifying v1',async()=>{
 const p=await importPackage(bytes),rr=await selectPresentation(p,'janko-four-row');
 const checked=await validateConventionalFingerLayer(p.fingerLayer,normalizeHandPlanningInput(p.sourceScore!),{sourceHash:p.sourceSha256!,sourceBytesSha256:p.sourceSha256!,effectiveHands:Object.fromEntries(p.score.notes.map(n=>[n.id,n.hand])),requireCurrent:true});
 assert.equal(checked.plannerVersion,'conventional-joint-contact-route-v2');
 const assembled={score:strFromU8(files['score.json']),seats:strFromU8(files['seats.json']),pages:p.pages,layer:checked,recipe,
  sourceSha256:p.sourceSha256!,semanticSha256:p.manifest.revision,effectiveHandSha256:p.effectiveHandSha256!,allFive:true,lint:{violations:0,warnings:0}};
 const rebuilt=await importPackage(await packagePresentation(p,assembled));assert.deepEqual(rebuilt.fingerLayer,p.fingerLayer);
 const old=unzipSync(readFileSync(new URL('../vendor/iso-notation/public/review/schumann-no14-conventional-20261006.isoscore',import.meta.url)));
 for(const name of Object.keys(old).filter(n=>n.startsWith('presentations/janko-four-row/')||n.startsWith('fonts/')||n.startsWith('notices/')||n==='source-score.json'))assert.deepEqual(files[name],old[name]);
 assert.equal(rr.fingerLayer!.profileId,'rr-player-performance-contact-pose-v5');
 const missing=structuredClone(p.fingerLayer!);delete missing.actionCertificate;
 await assert.rejects(validateLayerAsync(missing,p,{requireCurrent:true}),/action|certificate/i);
 const tampered=structuredClone(layer);tampered.actionCertificate.actions[0].toFrame.x+=1;
 await assert.rejects(validateLayerAsync(tampered,p,{requireCurrent:true}),/action|certificate|digest/i);
 if(checked.plannerVersion!=='conventional-joint-contact-route-v2')assert.fail('Current checked contract expected');
 const corrupt=structuredClone(checked);assert.ok(corrupt.actionCertificate);corrupt.actionCertificate.actions[0].toFrame.x+=1;
 await assert.rejects(importPackage(await packagePresentation(p,{...assembled,layer:corrupt})),/action|certificate|digest/i);
 assert.equal(await hashBytes(old['source-score.json']),p.sourceSha256);
});
test('generation refuses unknown executable contracts or a cancelled job before rendering without mutating input',async()=>{
 const before=await hashBytes(bytes),source=files['source-score.json'].slice();
 await assert.rejects(prepareConventionalPresentation({sourceBytes:source,recipe:{...recipe,engineId:'imported-script'}}),/Unsupported/);
 const c=new AbortController();c.abort();await assert.rejects(prepareConventionalPresentation({sourceBytes:source,recipe},{signal:c.signal}),/cancelled/);
 assert.deepEqual(source,files['source-score.json']);assert.equal(await hashBytes(bytes),before);
});
