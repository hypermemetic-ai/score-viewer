import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {LoadingProgress,LOADING_STEPS,stageDetail} from '../src/viewer-loading';

const states=(markup:string)=>[...markup.matchAll(/data-step="([^"]+)" data-step-state="([^"]+)"/g)].map(m=>`${m[1]}:${m[2]}`);

test('steps advance in order, drop skipped ones and insert steps the flow reaches',()=>{
 const loading=new LoadingProgress('Mai, lieber Mai',['engrave','check','save','hands','open'],{kicker:'Importing',cancel:true});
 assert.deepEqual(states(loading.markup()),['engrave:pending','check:pending','save:pending','hands:pending','open:pending']);
 loading.step('engrave');loading.step('save');
 assert.deepEqual(states(loading.markup()),['engrave:done','save:active','hands:pending','open:pending']);
 loading.step('engrave-again');
 assert.deepEqual(states(loading.markup()),['engrave:done','save:done','engrave-again:active','hands:pending','open:pending']);
 assert.match(loading.markup(),/<p class="viewer-loading-kicker">Importing<\/p><h2 class="viewer-loading-title">Mai, lieber Mai<\/h2>/);
});

test('engine stages read as musical work and drawn pages are counted',()=>{
 const loading=new LoadingProgress('Score',['engrave']);loading.step('engrave');
 loading.stage('layout');assert.equal(loading.statusText(),'Engraving the music: Spacing the measures into systems');
 loading.stage('paint');loading.stage('paint');loading.stage('paint');
 assert.equal(loading.statusText(),'Engraving the music: Drawing page 3');
 loading.stage('geometry');loading.stage('paint');
 assert.equal(loading.statusText(),'Engraving the music: Drawing page 1','A new drawing pass counts from its first page.');
 for(const stage of ['layout','placement','paint','lint','fretted','relations','geometry','commit'] as const)
  assert.doesNotMatch(stageDetail(stage),/lint|geometry|seat|admission|presentation/i);
});

test('cancel is offered with what it leaves behind; failure replaces it with Close',()=>{
 const loading=new LoadingProgress('Score',['check','open'],{cancel:true,cancelNote:'Cancel keeps the current score.'});
 assert.match(loading.markup(),/data-action="cancel-job">Cancel<kbd>Esc<\/kbd><\/button><p class="viewer-loading-note">Cancel keeps the current score\.<\/p>/);
 assert.doesNotMatch(new LoadingProgress('Starting',['library']).markup(),/cancel-job/,'Startup cannot be cancelled.');
 loading.step('check');loading.fail('The file is not a score.','<button data-action="close">Close</button>');
 assert.equal(loading.state,'failed');assert.deepEqual(states(loading.markup()),['check:failed','open:pending']);
 assert.equal(loading.statusText(),'Stopped. The file is not a score.');
 loading.step('open');assert.equal(loading.state,'failed','A failed operation does not resume.');
});

test('loading text names no time estimate and no engine terms',()=>{
 const text=[...Object.values(LOADING_STEPS),readFileSync(new URL('../src/viewer-loading.ts',import.meta.url),'utf8')].join('\n');
 assert.doesNotMatch(text,/minute|so far|about as long|can take/i);
});

// The physical keyboard is legitimately the Jankó keyboard; the notation is
// always "ISO notation" and is never called Janko in anything the player sees.
test('the notation and its pages are never called Janko',()=>{
 const root=new URL('../',import.meta.url),files=['index.html',...readdirSync(new URL('src/',root)).filter(f=>/\.(ts|html|css)$/.test(f)).map(f=>'src/'+f)];
 const notation=/jank[oó]\s+(notation|layout|score|pages?|engraving|reading|edition)\b|notation\s+(is\s+|called\s+)?jank/i;
 for(const file of files){
  const source=readFileSync(new URL(file,root),'utf8');
  for(const literal of source.matchAll(/'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|`(?:[^`\\]|\\.)*`|>[^<>]+</g))
   assert.doesNotMatch(literal[0],notation,`${file} names the notation Janko: ${literal[0].slice(0,120)}`);
 }
});
