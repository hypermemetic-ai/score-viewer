import test from 'node:test';import assert from 'node:assert/strict';
import {authoredManualPackage} from './support/manual-practice-fixture';
import {planManualPractice} from '../src/manual-practice-plan';import {initialPractice} from '../src/practice';
import {ManualPracticeSession} from '../src/manual-practice-session';import {ManualPracticeView} from '../src/manual-practice-view';
const plan=await planManualPractice(await authoredManualPackage(),'fixed-four-v1');
test('manual stage arrows queue desired half-points while sounding source clock and window stay captured',()=>{
 const state=initialPractice(plan),session=new ManualPracticeSession(plan,plan.chunks[0],state);session.ready(1000);const rate=session.bpm,start=session.startMs,bars=[...session.windows.bars],view=Object.create(ManualPracticeView.prototype) as any;let prepares=0,closed=0,saved=0,hold:(again:boolean,elapsed:number)=>boolean;
 const field={dataset:{practiceSetting:'working'},value:String(100*state.working/state.target)};Object.assign(view,{plan,state,options:{context:{session}},overview:false,disposed:false,manual:{begin(_code:string,fn:any){hold=fn;fn(false,0);}},transport:{prepare(){prepares++;},close(){closed++;}},app:{querySelector(){return field;}},setting(){return true;},refreshFields(){},save(){saved++;return Promise.resolve();}});
 assert.equal(view.key('ArrowUp'),true);assert.equal(state.working,rate+state.target*.005);assert.equal(session.bpm,rate);assert.equal(session.startMs,start);assert.deepEqual(session.windows.bars,bars);assert.equal(session.phase,'countin');assert.equal(closed,0);view.key('ArrowUp',true);assert.equal(state.working,rate+state.target*.005);hold!(true,800);assert.equal(state.working,rate+state.target*.01);assert.equal(prepares,2);assert.equal(saved,2);
 session.update(session.startMs+session.durationMs);assert.equal(session.phase,'complete');assert.equal(session.applyNextRate(),rate+state.target*.01);assert.deepEqual(state.best,{});
});
