import test from 'node:test';
import assert from 'node:assert/strict';
import {sourcePackage,transferStudy} from './support/hand-edition-fixture';
import {importPackage} from '../src/package';
import {initialPersonal} from '../src/state';
import {assigned} from '../src/personal-assignments';
import {PersonalPresentationSession} from '../src/personal-presentation';
import {PersonalPreparationPool} from '../src/personal-preparation-pool';
import {calculatedRecipeForRequest,admitCalculatedHandEdition} from '../src/calculated-hand-edition';
import {admitScoreTransposition} from '../src/score-transposition';

test('admitted source reopening shares preparation and retains exact cold projection and current buffers',async()=>{
 const {p,bytes}=await sourcePackage(transferStudy()),reopened=await importPackage(bytes),pool=new PersonalPreparationPool<any>(),
  first=new PersonalPresentationSession(p,pool),second=new PersonalPresentationSession(reopened,pool),cold=new PersonalPresentationSession(reopened,new PersonalPreparationPool<any>());
 await first.warm();await second.warm();assert.equal(pool.retained.entries,1);
 const seat=p.seats.find(s=>s.ownerIds.includes('gesture-1'))!,reopenedSeat=reopened.seats.find(s=>s.ownerIds.includes('gesture-1'))!,
  firstChoice=assigned(p,initialPersonal(p),seat,{hand:'RH'}),currentChoice=assigned(reopened,initialPersonal(reopened),reopenedSeat,{hand:'RH'}),
  earlier=await first.project(firstChoice),current=await second.project(currentChoice),independent=await cold.project(currentChoice);
 assert.deepEqual(current.score,independent.score);assert.deepEqual(current.pages,independent.pages);assert.deepEqual(current.seats,independent.seats);
 assert.deepEqual(current.annotationGeometry,independent.annotationGeometry);
 assert.notEqual(current,earlier);assert.equal(current.files,reopened.files);assert.notEqual(current.files,p.files);
 assert.notEqual(current.pages,earlier.pages);assert.notEqual(current.seats,earlier.seats);
 assert.equal(await second.project(initialPersonal(reopened)),reopened);
 const aborted=new AbortController();aborted.abort();await assert.rejects(second.warm({signal:aborted.signal}),{name:'AbortError'});
 assert.equal(pool.retained.entries,1);
});

test('all admission boundaries reject canceled execution',async()=>{
 const {p}=await sourcePackage(transferStudy());
 const controller=new AbortController();controller.abort();const canceled={signal:controller.signal};
 await assert.rejects(calculatedRecipeForRequest(p,canceled),{name:'AbortError'});
 await assert.rejects(admitScoreTransposition(undefined,{},new Uint8Array(),canceled),{name:'AbortError'});
 await assert.rejects(admitCalculatedHandEdition(p,undefined,new Uint8Array(),undefined,canceled),{name:'AbortError'});
});
