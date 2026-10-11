import {test} from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {stripTypeScriptTypes} from 'node:module';import {runInNewContext} from 'node:vm';

// Execute the production methods on a prototype without mounting notation or
// audio. The bounded collaborators expose every attempt to match or resume.
const source=readFileSync(process.env.SCORE_VIEWER_PERSONAL_PRACTICE_VIEW??new URL('../src/practice-view.ts',import.meta.url),'utf8');
function methods(start:string,end:string){const first=source.indexOf(start),last=source.indexOf(end,first);assert.ok(first>=0&&last>first,`Missing production method ${start}`);return source.slice(first,last);}
function fixture(mode:'reading'|'timed'='reading'){
 const counts:Record<string,number>={},hit=(name:string)=>{counts[name]=(counts[name]??0)+1;},messages:string[]=[],event={note:60,on:true,velocity:80,channel:1,source:'piano',generation:1,timestamp_micros:1000},
  attack={id:'a',midi:60,tick:0,groups:['g'],owners:['owner']},context:any={performance:{now:()=>10},isMusicalSustain:(e:any)=>e.controller===64,musicalControllerTime:()=>1};
 const code=[methods(' holdForPersonalChoices()',' get modalOpen()'),methods(' async action(',' private async toggleCompletion('),methods(' observe(event:',' connectionChanged()'),methods(' observeHeldInput(',' clearHeldInput()'),methods(' note(event:',' private persistDiagnostic('),methods(' key(code:',' pause()'),methods(' pause()',' close()')].join('\n');
 runInNewContext(stripTypeScriptTypes(`class GateView {${code}};globalThis.GateView=GateView;`),context);
 const view:any=Object.create(context.GateView.prototype);
 Object.assign(view,{personalChoicesPending:false,disposed:false,overview:false,mode,previousMode:mode,readingPaused:false,readingStarted:true,resumeAfter:0,startGeneration:0,inspection:false,
  state:{working:72,keepTempo:true,evidence:{owner:{correct:18,done:true}}},plan:{attacks:[attack]},
  session:{phase:'trial',events:[attack],matched:new Set(),startTick:0,startMs:0,tickMs:1,chunk:{id:'1-4',end:96},carryIn:[],visibleGroups:()=>new Set(['g']),pause(){hit('session-pause');this.phase='paused';},note(){hit('timed-note');},release(){hit('timed-release');},sustain(){hit('timed-sustain');}},
  reading:{current:{events:[attack],groups:['g']},matched:new Set(),note(){hit('reading-note');return 'accepted';}},
  heldPitches:new Set(),heldStreams:new Map(),contacts:{clear(){hit('contacts-clear');},press(){hit('contacts-press');},release(){hit('contacts-release');},replace(){hit('contacts-replace');}},
  preview:{clear(){hit('preview-clear');},release(){hit('preview-release');},note(){hit('preview-note');return {decision:'preview',contacts:[]};}},
  diagnostics:{record(){hit('diagnostic');}},manual:{cancelEdit(){hit('cancel-edit');}},clock:{fromMidi:()=>1},
  options:{connected:()=>true,back(){hit('back');},settings(){hit('settings');}},
  status(s:string){messages.push(s);},paint(){hit('paint');},paintControls(){hit('paint-controls');},paintVisibility(){hit('paint-visibility');},
  cancelTempoHold(){hit('cancel-tempo');},stopClock(){hit('stop-clock');},enterFreeView(){this.mode='free';},
  connectionChanged(){hit('connection');},readingActive(){return !this.readingPaused&&this.readingStarted;},readingMessage:()=> 'Reading',
  selectMode(next:string){hit('select-mode');this.mode=next;},turnPage(){hit('turn-page');},selectPassage(){hit('select-passage');},toggleCompletion(){hit('completion');},
  browser:{select(){hit('browser-select');}},async save(){hit('save');return true;},close(){hit('close');this.disposed=true;}});
 return {view,counts,messages,event,hit};
}

test('pending or failed hand projection blocks Ready, mode changes, passage navigation and completion without changing evidence',async()=>{
 const {view,counts,messages}=fixture('timed'),evidence=structuredClone(view.state.evidence);view.holdForPersonalChoices();assert.equal(view.session.phase,'paused');assert.equal(view.mode,'free');
 const afterHold={...counts};
 for(const action of ['ready','reading','timed','free-view','passage:1-4','chunk-0','select:1-4','component:1-4','next','previous','overview','done'])await view.action(action);
 assert.deepEqual(counts,afterHold);assert.deepEqual(view.state.evidence,evidence);assert.equal(view.personalChoicesPending,true);assert.match(messages.at(-1)!,/finish updating/);
 // Progress persistence can recover independently; it must not unlock a failed
 // notation/hand-plan handover or allow the old grouping to resume.
 await view.action('retry-save');assert.equal(counts.save,1);await view.action('ready');assert.equal(view.session.phase,'paused');assert.equal(view.personalChoicesPending,true);
});

test('held physical contacts are tracked while pending but MIDI Reading, Timed, sustain and observation cannot assess',()=>{
 const {view,counts,event}=fixture();view.holdForPersonalChoices();
 // Simulate stale callbacks retaining their old mode/phase. The explicit gate
 // must protect assessment even when these independent flags look active.
 for(const mode of ['reading','timed']){view.mode=mode;view.readingPaused=false;view.session.phase='trial';view.observe(event);view.note(event);view.sustain({controller:64,value:127});assert.equal(view.heldPitches.has(60),true);view.note({...event,on:false});assert.equal(view.heldPitches.has(60),false);}
 for(const name of ['reading-note','timed-note','timed-release','timed-sustain','preview-note','preview-release','diagnostic','connection','contacts-press'])assert.equal(counts[name]??0,0,name);
 assert.equal(view.heldStreams.size,0);assert.equal(view.personalChoicesPending,true);
});

test('the pending keyboard gate consumes practice shortcuts while settings, back and progress recovery remain available',async()=>{
 const {view,counts}=fixture();view.holdForPersonalChoices();const before={...counts};
 for(const code of ['Space','KeyK','ArrowRight','ArrowDown'])assert.equal(view.key(code),true);
 assert.deepEqual(counts,before);await view.action('settings');assert.equal(counts.settings,1);await view.action('retry-save');assert.equal(counts.save,1);assert.equal(view.personalChoicesPending,true);
 assert.equal(view.key('Escape'),true);assert.equal(counts.back,1);assert.equal(counts.close,1);
});

test('releasing the hand gate paints without resuming; only a subsequent explicit Ready enables Reading assessment',async()=>{
 const {view,counts,event}=fixture();view.holdForPersonalChoices();view.releasePersonalChoices();
 assert.equal(view.personalChoicesPending,false);assert.equal(view.readingPaused,true);assert.equal(view.session.phase,'paused');view.note(event);assert.equal(counts['reading-note']??0,0);
 await view.action('ready');assert.equal(view.readingPaused,false);assert.equal(view.readingStarted,true);view.note(event);assert.equal(counts['reading-note'],1);
});
