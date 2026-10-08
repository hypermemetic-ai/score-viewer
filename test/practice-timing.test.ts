import test from 'node:test';import assert from 'node:assert/strict';
import {practiceTiming,pulseAt} from '../src/practice-timing';
import {PracticeContacts} from '../src/practice-contact';
import type {PracticeAttack} from '../src/practice';
test('six metrical numbers and quieter adaptive clicks preserve the whole count bar at5,10,15,180 BPM',()=>{
 for(const [bpm,step]of [[5,1000],[10,1000],[15,60000/45/2],[180,60000/540]]){
  const timing=practiceTiming(bpm),ratio=Math.round(timing.eighthMs/step);assert.equal(timing.countStepMs,step);assert.equal(timing.countInMs,6*timing.eighthMs);
  for(let i=0;i<6;i++){const pulse=pulseAt(i*ratio,timing.eighthMs,step);assert.equal(pulse.offsetMs,i*timing.eighthMs);assert.equal(pulse.amplitude,.16);assert.equal(pulse.frequency,i===0?1200:i===3?900:650);}
  if(ratio>1){assert.equal(pulseAt(1,timing.eighthMs,step).amplitude,.064);assert.equal(pulseAt(6*ratio+1,timing.eighthMs,step).amplitude,.064);assert.equal(pulseAt(6*ratio+1,timing.eighthMs,step).offsetMs,timing.countInMs+step);}
  assert.deepEqual(pulseAt(6*ratio,timing.eighthMs,step),{offsetMs:timing.countInMs,frequency:1200,amplitude:.16});
  assert.ok(Math.abs(pulseAt(7*ratio,timing.eighthMs,step).offsetMs-(timing.countInMs+timing.eighthMs))<1e-8);
 }
 assert.deepEqual(pulseAt(0,111),{offsetMs:0,frequency:1200,amplitude:.16});
});
const attack=(id:string,tick:number,end:number,midi:number,owners=[id]):PracticeAttack=>({id,tick,end,midi,owners,bar:0,groups:['0:RH']});
test('physical highlights persist until release; next source attack retires only ordinary predecessors',()=>{
 const c=new PracticeContacts();c.press(attack('ordinary',0,24,55));assert.ok(c.hasOwner('ordinary'));
 c.press(attack('next',24,48,59));assert.equal(c.hasOwner('ordinary'),false);assert.ok(c.hasOwner('next'));
 c.release(59);assert.equal(c.hasOwner('next'),false);
 c.press(attack('held',48,120,60,['held','alias']));c.press(attack('chord',48,72,62));assert.ok(c.hasOwner('held'));assert.ok(c.hasOwner('chord'));
 c.press(attack('later',72,96,64));assert.ok(c.hasOwner('alias'));assert.equal(c.hasOwner('chord'),false);
 c.press(attack('repeat',96,120,60));assert.equal(c.hasOwner('held'),false);assert.ok(c.hasOwner('repeat'));
 c.clear();assert.equal(c.hasOwner('repeat'),false);
});
