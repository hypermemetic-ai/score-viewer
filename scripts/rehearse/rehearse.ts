// npm run rehearse [-- --data <copy of the laptop data directory>] [--out <dir>] [--presses <n>] [--only <id prefix,…>]
// Rehearses the built application in headless Chromium against a simulated
// native host (host.ts). Layers: the driver (driver.ts) alone knows screens
// and keys; the application declares its state (src/app-state.ts); the
// inventory is discovered from the library; invariants decide pass or fail,
// while timings and what changed are reports for a person. See docs/rehearsal.md.
import {build} from 'vite';
import {chmod,cp,mkdir,readdir,readFile,stat,writeFile} from 'node:fs/promises';
import {join,resolve,relative,isAbsolute} from 'node:path';
import {existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {parseArgs} from 'node:util';
import type {Browser,Page} from 'playwright-core';
import {startHost,pageScript,type SimulatedHost} from './host';
import {Driver,appKeys,OPENING_DIALOG,type State} from './driver';
import {studioFiles} from './studio';
import {editionNeedsEngravingAgain} from '../../src/package';
import {packageFile} from '../../src/edition-rebuild';
import {collectionId,type Entry} from '../../src/state';

const LAYOUTS=['janko-four-row','conventional-piano'] as const;
const repo=resolve(new URL('../..',import.meta.url).pathname);
const {values:args}=parseArgs({options:{data:{type:'string'},out:{type:'string'},presses:{type:'string'},only:{type:'string'},'press-keys':{type:'string'}}});
const scratch=process.env.TMPDIR||'/srv/qqcachedpilot/data/tmp';
const stamp=new Date().toISOString().replace(/[-:]/g,'').replace(/\..*/,'');
const out=resolve(args.out??join(scratch,`sv-rehearsal-${args.data?'owner':'studio'}-${stamp}`));
const owner=!!args.data;
const inside=(path:string,root:string)=>{const r=relative(root,path);return !r||!r.startsWith('..')&&!isAbsolute(r);};
if(inside(out,repo))throw Error('Reports stay outside the repository; choose --out under $TMPDIR.');

interface Score {id:string;label:string;piano?:boolean}
interface Check {invariant:string;held:boolean;score?:string;layout?:string;detail?:unknown}
const checks:Check[]=[],timings:Array<Record<string,unknown>>=[],pageErrors:string[]=[],notes:string[]=[];
const check=(invariant:string,held:boolean,where:{score?:string;layout?:string}={},detail?:unknown)=>{checks.push({invariant,held,...where,...(detail===undefined?{}:{detail})});if(!held)console.log(`  ✗ ${invariant} ${where.score??''} ${where.layout??''} ${detail===undefined?'':JSON.stringify(detail).slice(0,300)}`);};
const log=(text:string)=>console.log(text);
const median=(xs:number[])=>{if(!xs.length)return undefined;const s=[...xs].sort((a,b)=>a-b);return s[Math.floor(s.length/2)];};

async function session<T>(browser:Browser,host:SimulatedHost,label:string,run:(driver:Driver,page:Page)=>Promise<T>):Promise<T>{
 const context=await browser.newContext({viewport:{width:1920,height:1080}}),page=await context.newPage();
 page.on('pageerror',error=>pageErrors.push(`${label}: ${error.message}`));
 await page.addInitScript({content:await pageScript()});
 const preferences=JSON.parse(await readFile(join(out,'data','preferences.json'),'utf8').catch(()=>'null'));
 const driver=new Driver(page,appKeys(preferences));
 try{await page.goto(host.url);if(await page.evaluate('window.isTauri')!==true)throw Error('The simulated native host did not install (page.js).');await driver.openLibrary();return await run(driver,page);}
 catch(error){await page.screenshot({path:join(out,`error-${label}.png`)}).catch(()=>{});throw error;}
 finally{await context.close();}
}
/** The copy is the application's to write, as its own data directory is, even when the original is kept read-only. */
async function writable(dir:string){
 await chmod(dir,(await stat(dir)).mode|0o700);
 for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())await writable(path);else if(entry.isFile())await chmod(path,(await stat(path)).mode|0o600);}
}
/** Places a file the current engine refuses as an earlier engraving in the library, as a laptop that saved it before would hold it. */
async function seedEarlierEdition(bytes:Uint8Array,data:string):Promise<'seeded'|'same score'|false>{
 const content=await editionNeedsEngravingAgain(bytes,Error('refused on import'));if(!content)return false;
 const path=join(data,'library.json'),library=JSON.parse(await readFile(path,'utf8').catch(()=>'{"version":1,"entries":[]}')) as {entries:Entry[]},file=await packageFile(bytes),id=collectionId(content);
 if(library.entries.some(e=>e.id===id))return 'same score';
 await writeFile(join(data,file),bytes);library.entries.push({id,file,metadata:content.manifest.metadata,importedAt:new Date().toISOString()});await writeFile(path,JSON.stringify(library));
 return 'seeded';
}
/** Labels a report can carry: public titles for the studio scores, never an owner title. */
async function inventory():Promise<Score[]>{
 const library=JSON.parse(await readFile(join(out,'data','library.json'),'utf8')) as {entries:Array<{id:string;metadata?:{title?:string}}>};
 const only=args.only?.split(',');
 return library.entries.filter(e=>!only||only.some(p=>e.id.startsWith(p))).map(e=>({id:e.id,label:owner?`score (${e.id.slice(0,8)})`:`${e.metadata?.title??'untitled'} (${e.id.slice(0,8)})`}));
}
/** Owner scores are named by kind and letter in reports: "piano score A". */
function nameByKind(scores:Score[]){if(!owner)return;let piano=0,other=0;for(const s of scores){const letter=(n:number)=>String.fromCharCode(65+n);s.label=`${s.piano?`piano score ${letter(piano++)}`:`other score ${letter(other++)}`} (${s.id.slice(0,8)})`;}}

/** One layout: first open and reopen of every score; every piano score practised, every section, Fingers too. */
async function rehearseLayout(driver:Driver,scores:Score[],layout:string){
 for(const score of scores){
  log(`  ${score.label}`);const where={score:score.id,layout},row:Record<string,unknown>={score:score.id,layout};timings.push(row);
  const first=await driver.openScore(score.id);row.firstOpenMs=first.ms;
  if(first.state.screen!=='reader'||first.state.score!==score.id){check('opens',false,where,{declared:first.state.dialog??first.state.screen,problems:await driver.problems()});await driver.toLibrary();continue;}
  check('opens',true,where);score.piano=first.state.instrument==='piano';
  if(score.piano&&first.state.layout!==layout){const switched=await driver.setLayout(layout);row.setLayoutMs=switched.ms;}
  const pages=await driver.pages();check('pages present',pages.pages>0&&pages.drawn>=pages.pages,where,pages);row.pages=pages.pages;
  await driver.toLibrary();const again=await driver.openScore(score.id);row.reopenMs=again.ms;
  check('reopens',again.state.screen==='reader'&&again.state.score===score.id,where);
  const answer=await driver.choosePractice();
  if(!score.piano){check('non-piano offers no practice',answer==='none',where,{answer});await driver.toLibrary();continue;}
  check('piano score offers practice',answer==='menu',where,{answer});if(answer!=='menu'){await driver.toLibrary();continue;}
  // Fingers through the whole piece.
  const fingers=await driver.chooseStep('fingers');row.fingersMs=fingers.ms;
  let drawing=await driver.practiceDrawing();
  check('Fingers opens',fingers.state.screen==='practice'&&fingers.state.step==='fingers'&&drawing.fingers>0,where,{declared:fingers.state,drawing,problems:await driver.problems()});
  if(fingers.state.screen==='practice'){await driver.fingersToEnd();drawing=await driver.practiceDrawing();check('Fingers draws at its last measure',drawing.fingers>0,where,drawing);}
  check('no error shown',!(await driver.problems()).length,where,{in:'fingers',problems:await driver.problems()});
  await driver.toReader();
  // Every section at tempo.
  if(await driver.choosePractice()!=='menu'){check('piano score offers practice',false,where,{again:true});await driver.toLibrary();continue;}
  const sections=await driver.chooseStep('sections');row.sectionsMs=sections.ms;
  if(sections.state.screen!=='practice'||sections.state.step!=='sections'){check('sections open',false,where,{declared:sections.state,problems:await driver.problems()});await driver.toLibrary();continue;}
  const ids=await driver.sections();row.sections=ids.length;log(`    ${ids.length} sections`);check('sections listed',ids.length>0,where,{sections:ids.length});
  const entries:number[]=[],refused:string[]=[],locked:string[]=[];
  for(const id of ids){
   const entered=await driver.enterSection(id);
   if('locked' in entered&&entered.locked){locked.push(id);continue;}
   entries.push(entered.ms);const shown=await driver.practiceDrawing(),problems=await driver.problems();
   if(!entered.entered||!shown.section||problems.length)refused.push(id);
   if(!entered.entered||!shown.section)check('section practicable',false,where,{section:id,declared:entered.state,drawing:shown,problems});
   if(problems.length)check('no error shown',false,where,{section:id,problems});
   if(entered.entered)await driver.back();
  }
  check('every section practicable',!refused.length,where,{sections:ids.length,refused:refused.length,locked:locked.length});row.locked=locked.length;
  row.sectionEntryMs={median:median(entries),max:entries.length?Math.max(...entries):undefined};
  await driver.toLibrary();
 }
}

type PressAction='practice'|'edit'|'toggle';
/** A press made as the opening dialog leaves runs exactly once: not lost, not doubled. */
async function earlyPresses(driver:Driver,scores:Score[],count:number,actions:PressAction[]){
 const sweep=[-120,-60,-30,-15,-8,-3,0,2,4,8,12,16,24,33,50,80,120,200],opened=new Map<string,number[]>(),trials:Array<Record<string,unknown>>=[];
 const piano=scores.filter(s=>s.piano);if(!piano.length)return trials;
 for(let i=0;i<count;i++){
  // Pairs of trials on one score: the first opens it from another score, the second opens it again.
  const score=piano[Math.floor(i/2)%piano.length],path=piano.length>1&&i%2===0?'switch':'reopen',action=actions[Math.floor(i/2)%actions.length],key=driver.keyFor(action);
  await driver.toLibrary();await driver.focusScore(score.id);
  const before=await driver.state(),marked=(await driver.marks()).closed.length,estimate=median(opened.get(score.id+path)??[]),delta=sweep[i%sweep.length];
  const t0=performance.now();await driver.press(driver.keys.choose);
  if(estimate===undefined){await driver.until(s=>s.dialog!==OPENING_DIALOG&&!s.busy?.includes('reading'),'the opening',600_000);}
  else{const wait=estimate+delta-(performance.now()-t0);if(wait>0)await driver.page.waitForTimeout(wait);}
  const held=action==='toggle'&&driver.keys.holdsToggle&&!key.includes('+');
  const release=held?await driver.hold(key):(await driver.press(key),undefined);
  const ranBefore=before.ran.get(action)??0;let quietSince:number|undefined;
  const s=await driver.until(s=>{if((s.ran.get(action)??0)>ranBefore)return true;const quiet=s.screen==='reader'&&!s.busy&&s.dialog!==OPENING_DIALOG;quietSince=quiet?quietSince??performance.now():undefined;return quietSince!==undefined&&performance.now()-quietSince>1500;},'the press to run',600_000);
  await release?.();
  await driver.page.waitForTimeout(400);const after=await driver.state(),ran=(after.ran.get(action)??0)-ranBefore;
  const marks=await driver.marks(),closeAt=marks.closed.slice(marked).find(c=>c.kind===OPENING_DIALOG)?.at,code=key.split('+').at(-1)!,pressAt=marks.keys.filter(k=>k.code===code).at(-1)?.at,enterAt=marks.keys.filter(k=>k.code==='Enter'&&(pressAt===undefined||k.at<=pressAt)).at(-1)?.at;
  if(closeAt!==undefined&&enterAt!==undefined)opened.set(score.id+path,[...(opened.get(score.id+path)??[]),closeAt-enterAt].slice(-5));
  const offset=closeAt!==undefined&&pressAt!==undefined?Math.round((pressAt-closeAt)*10)/10:undefined;
  // When the reader was declared on screen (behind the opening dialog) before the dialog left.
  const readerAt=enterAt===undefined?undefined:marks.screens.find(m=>m.screen==='reader'&&m.at>enterAt)?.at,readerShown=closeAt!==undefined&&readerAt!==undefined?Math.round((closeAt-readerAt)*10)/10:undefined;
  trials.push({score:score.id,path,action,...(held?{held:true}:{}),offset,readerShownMs:readerShown,pressAfterReaderMs:pressAt!==undefined&&readerAt!==undefined?Math.round((pressAt-readerAt)*10)/10:undefined,ran,declared:s.dialog??s.screen,failures:after.failures-before.failures});
  if((i+1)%50===0||i+1===count){const t=pressSummary(trials);log(`  ${i+1} presses: after the dialog left ${t.afterClose.presses} (lost ${t.afterClose.lost}, doubled ${t.afterClose.doubled}); while it showed ${t.whileOpening.presses} (ignored ${t.whileOpening.ignored})`);}
 }
 return trials;
}
function pressSummary(trials:Array<Record<string,unknown>>){
 const after=trials.filter(t=>typeof t.offset==='number'&&(t.offset as number)>=0),before=trials.filter(t=>typeof t.offset==='number'&&(t.offset as number)<0),unknown=trials.filter(t=>typeof t.offset!=='number');
 const by=(xs:typeof trials,ran:(n:number)=>boolean)=>xs.filter(t=>ran(t.ran as number)).length;
 return {presses:trials.length,afterClose:{presses:after.length,once:by(after,n=>n===1),lost:by(after,n=>n===0),doubled:by(after,n=>n>1)},
  whileOpening:{presses:before.length,once:by(before,n=>n===1),ignored:by(before,n=>n===0),doubled:by(before,n=>n>1),
   // Of those, pressed while the reader already showed behind the dialog.
   readerShown:before.filter(t=>typeof t.pressAfterReaderMs==='number'&&(t.pressAfterReaderMs as number)>=0).length,ignoredReaderShown:by(before.filter(t=>typeof t.pressAfterReaderMs==='number'&&(t.pressAfterReaderMs as number)>=0),n=>n===0),
   readerShownMs:median(trials.map(t=>t.readerShownMs).filter((v):v is number=>typeof v==='number'))},unmeasured:{presses:unknown.length,once:by(unknown,n=>n===1),lost:by(unknown,n=>n===0),doubled:by(unknown,n=>n>1)},
  byAction:Object.fromEntries(['practice','edit','toggle'].map(a=>[a,{presses:after.filter(t=>t.action===a).length,lost:by(after.filter(t=>t.action===a),n=>n===0)}]))};
}

async function main(){
 const started=performance.now();await mkdir(out,{recursive:true});log(`Rehearsal (${owner?'owner data':'studio scores'}) → ${out}`);
 // The application as built from this checkout, into scratch.
 const t0=performance.now();await build({root:repo,logLevel:'error',build:{outDir:join(out,'dist'),emptyOutDir:true}});const buildMs=Math.round(performance.now()-t0);
 const data=join(out,'data');
 if(owner){const source=resolve(args.data!);if(inside(source,repo))throw Error('Owner data never lives in the repository.');await cp(source,data,{recursive:true});await writable(data);}
 else await mkdir(data,{recursive:true});
 // Playwright looks under $XDG_CACHE_HOME when it is set; browsers installed before it was set stay in ~/.cache.
 if(!process.env.PLAYWRIGHT_BROWSERS_PATH&&process.env.XDG_CACHE_HOME&&!existsSync(join(process.env.XDG_CACHE_HOME,'ms-playwright'))&&existsSync(join(homedir(),'.cache/ms-playwright')))process.env.PLAYWRIGHT_BROWSERS_PATH=join(homedir(),'.cache/ms-playwright');
 const playwright=await import(process.env.PRACTICE_PLAYWRIGHT??'playwright-core') as typeof import('playwright-core');
 const browser=await playwright.chromium.launch({headless:true,...(process.env.REHEARSE_CHROMIUM?{executablePath:process.env.REHEARSE_CHROMIUM}:{}),args:['--disable-lcd-text','--force-color-profile=srgb']});
 const host=await startHost({dist:join(out,'dist'),data,repo});
 const imports:Array<Record<string,unknown>>=[];let trials:Array<Record<string,unknown>>=[],scores:Score[]=[];
 try{
  if(!owner){const files=await studioFiles(repo,join(scratch,'sv-rehearsal-cache'));log(`Importing ${files.length} studio files`);const refused:Array<{file:{name:string;bytes:Uint8Array};detail:unknown}>=[];
   await session(browser,host,'import',async driver=>{for(const file of files){host.pick(file.bytes);const r=await driver.importScore(),imported=r.state.screen==='reader'&&!!r.state.score,problems=await driver.problems();imports.push({file:file.name,ms:r.ms,score:r.state.score,...(imported?{}:{refused:problems.map(p=>p.text).join(' ')})});
    // An edition an earlier engine drew is refused by Import (a finding, reported) but
    // opens from a library that saved it before; such a file joins the library as saved.
    if(imported)check('imports',true,{score:file.name});else refused.push({file,detail:{declared:r.state.dialog??r.state.screen,problems}});
    await driver.toLibrary();}});
   // After the session, which keeps the library it read: the next session reads the seeded one.
   for(const {file,detail} of refused){
    const seeded=await seedEarlierEdition(file.bytes,data);
    if(seeded){const said=seeded==='seeded'?'it was placed in the library as a score saved before, and is rehearsed from there':'the library already holds the same score from another file, so it is not rehearsed separately';notes.push(`Import refused ${file.name} as drawn by an earlier engraving engine (a finding, not a gate); ${said}.`);log(`  ${file.name}: refused by Import as an earlier engraving; ${said}`);}
    else check('imports',false,{score:file.name},detail);
   }}
  scores=await inventory();log(`Inventory: ${scores.length} scores × ${LAYOUTS.length} layouts`);
  for(const layout of LAYOUTS){log(`Layout ${layout}`);await session(browser,host,layout,driver=>rehearseLayout(driver,scores,layout));}
  nameByKind(scores);
  const presses=Number(args.presses??(owner?120:36)),actions=(args['press-keys']?.split(',')??['practice','edit','toggle']) as PressAction[];
  if(presses>0){log(`Early presses: ${presses}`);trials=await session(browser,host,'presses',driver=>earlyPresses(driver,scores,presses,actions));
   const summary=pressSummary(trials);check('an early press runs exactly once',summary.afterClose.lost===0&&summary.afterClose.doubled===0&&summary.whileOpening.ignoredReaderShown===0&&summary.whileOpening.doubled===0&&summary.unmeasured.doubled===0,{},summary);}
 }finally{await browser.close();await host.close();}
 check('no uncaught page error',!pageErrors.length,{},pageErrors.slice(0,20));
 check('the simulated host answered every command',!host.errors.length,{},host.errors.slice(0,20));
 // Reports name scores by label only (owner titles never leave the data copy).
 const label=(id:unknown)=>scores.find(s=>s.id===id)?.label??id;
 for(const row of [...timings,...trials])row.score=label(row.score);for(const c of checks)if(c.score)c.score=String(label(c.score));
 const invariants=Object.fromEntries([...new Set(checks.map(c=>c.invariant))].map(name=>{const all=checks.filter(c=>c.invariant===name);return [name,{held:all.every(c=>c.held),checked:all.length,failed:all.filter(c=>!c.held)}];}));
 const report={mode:owner?'owner data':'studio scores',durationMs:Math.round(performance.now()-started),buildMs,inventory:{scores:scores.map(s=>({label:s.label,instrument:s.piano===undefined?'unopened':s.piano?'piano':'other'})),layouts:LAYOUTS,sections:timings.reduce((n,r)=>n+((r.sections as number)??0),0)},
  imports,timings,earlyPress:{summary:pressSummary(trials),trials},invariants,pageErrors,notes,writes:host.writes.length};
 await writeFile(join(out,'report.json'),JSON.stringify(report,null,1));
 const summary=markdown(report);await writeFile(join(out,'summary.md'),summary);console.log('\n'+summary);
 if(Object.values(invariants).some(i=>!i.held))process.exitCode=1;
}
function markdown(r:{mode:string;notes:string[];durationMs:number;buildMs:number;inventory:{scores:Array<{label:string;instrument:string}>;sections:number};imports:Array<Record<string,unknown>>;timings:Array<Record<string,unknown>>;earlyPress:{summary:ReturnType<typeof pressSummary>};invariants:Record<string,{held:boolean;checked:number;failed:Check[]}>}){
 const s=r.earlyPress.summary,lines=[`## Rehearsal: ${r.mode}`,'',`${(r.durationMs/1000).toFixed(0)} s in all (build ${(r.buildMs/1000).toFixed(1)} s). ${r.inventory.scores.length} score${r.inventory.scores.length===1?'':'s'} (${r.inventory.scores.filter(x=>x.instrument==='piano').length} piano) × ${LAYOUTS.length} layouts; ${r.inventory.sections} sections listed across both layouts (each entered unless locked).`,'','### Invariants','','| Invariant | Held | Checked | Failed |','|---|---|---|---|',
  ...Object.entries(r.invariants).map(([name,i])=>`| ${name} | ${i.held?'yes':'**no**'} | ${i.checked} | ${i.failed.length} |`),'',
  '### Early presses','',`${s.presses} presses timed around the opening dialog leaving. After it left: ${s.afterClose.presses}, ran once ${s.afterClose.once}, lost ${s.afterClose.lost}, doubled ${s.afterClose.doubled}. While it still showed: ${s.whileOpening.presses}, ran once ${s.whileOpening.once}, ignored ${s.whileOpening.ignored}, doubled ${s.whileOpening.doubled}; of those, ${s.whileOpening.readerShown} came with the score already drawn behind the dialog (ignored ${s.whileOpening.ignoredReaderShown}). The score showed behind the dialog for ${s.whileOpening.readerShownMs??'–'} ms (median) before it left.${s.unmeasured.presses?` Unmeasured: ${s.unmeasured.presses}.`:''}`,'',
  '### Timings (reports, not gates)','','| Score | Layout | First open ms | Reopen ms | Pages | Fingers ms | Sections (locked) | Section entry median / max ms |','|---|---|---|---|---|---|---|---|',
  ...r.timings.map(t=>{const e=t.sectionEntryMs as {median?:number;max?:number}|undefined;return `| ${t.score} | ${t.layout} | ${t.firstOpenMs??''}${t.setLayoutMs?` (+${t.setLayoutMs} layout)`:''} | ${t.reopenMs??''} | ${t.pages??''} | ${t.fingersMs??''} | ${t.sections??''}${t.locked?` (${t.locked})`:''} | ${e?.median??''} / ${e?.max??''} |`;})];
 if(r.imports.length)lines.push('','Imports: '+r.imports.map(i=>`${i.file} ${i.ms} ms${i.refused?' (refused)':''}`).join(', ')+'.');
 if(r.notes.length)lines.push('','### Notes','',...r.notes.map(n=>`- ${n}`));
 return lines.join('\n')+'\n';
}
main().catch(error=>{console.error(error);process.exitCode=1;});
