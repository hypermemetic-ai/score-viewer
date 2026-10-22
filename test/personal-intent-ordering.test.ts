import {test} from 'node:test';
import {handCarryNotice} from '../src/hand-recurrence-text';
import {engravingRefusal,undrawableHandOwners,undrawableHandReason} from '../src/personal-presentation';
import {keptHandsText} from '../src/hand-editing-wait';
import {HandPresentationError} from '../vendor/iso-notation/src/score-presentation';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {stripTypeScriptTypes} from 'node:module';
import {runInNewContext} from 'node:vm';
import {scoreCapabilities} from '../src/score-capabilities';
import {GENERIC_PERSONAL_COMMIT} from './helpers/generic-personal-commit';
import {PersonalEditQueue} from '../src/personal-edit-queue';
import {nextInHand} from '../src/selection';
import {personalMemoryBoundary} from './helpers/personal-memory-boundary';

// Run the actual application intent and persistence functions. Geometry and
// storage are bounded fakes so their independently delayed completions can be
// controlled without starting the application or changing a user's journal.
const source=readFileSync(process.env.SCORE_VIEWER_PERSONAL_MAIN??new URL('../src/main.ts',import.meta.url),'utf8');
const body=(start:string,end:string)=>{
 const first=source.indexOf(start),last=source.indexOf(end,first);
 assert.ok(first>=0&&last>first,`Missing application function: ${start}`);
 return stripTypeScriptTypes(source.slice(first,last));
};
const deferred=()=>{let resolve!:(value?:any)=>void;const promise=new Promise<any>(r=>resolve=r);return {promise,resolve};};
const settle=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};

function fixture(){
 const seats=[0,1].map(i=>({id:`seat-${i}`,contactId:`contact-${i}`,ownerIds:[`note-${i}`],page:0,continuation:false}));
 const target={entry:{id:'source',file:'edition-a'},package:{sourceSha256:'source-a',pages:[{}],seats},personal:{view:{page:0,fingerSet:'yours'},editContactId:seats[0].contactId,overrides:{},choices:{'note-0':{hand:'LH',finger:1},'note-1':{hand:'RH',finger:4}}}};
 const written:any[]=[],frames:any[]=[],errors:Error[]=[],messages:string[]=[];let disk:any=structuredClone(target.personal),persist=Promise.resolve();
 let write=(snapshot:any)=>{disk=structuredClone(snapshot);written.push(structuredClone(snapshot));};
 let project=async(personal:any)=>({...target.package,choiceSnapshot:structuredClone(personal)});
 const context:any={structuredClone,handCarryNotice,undrawableHandOwners,undrawableHandReason,keptHandsText,engravingRefusal,current:target,selection:seats[0],livePersonalEditors:new WeakMap(),PersonalEditQueue,
  scoreCapabilities,PersonalPresentationSession:class{handChoiceCheck(){return undefined;}project(personal:any){return project(structuredClone(personal));}},
  personalStorageName:()=> 'source-bound-journal',personalContext:async(owner:any)=>({p:owner.package,file:'source-bound-journal',entry:owner.entry,active:context.current===owner?owner:undefined}),
  enqueue(fn:()=>Promise<any>){const result=persist.then(fn);persist=result.then(()=>{},()=>{});return result;},
  async writeJson(_file:string,snapshot:any){await write(snapshot);},readPersonal:(value:any)=>structuredClone(value),
  assigned(_p:any,s:any,seat:any,choice:any){const next=structuredClone(s),id=seat.ownerIds[0];next.choices[id]={...next.choices[id],...choice};return next;},
  // These synthetic notes have no hands, so a finger moves on to the next note.
  editUnits:()=>seats,nextInHand:(view:any,units:any[],index:number)=>nextInHand({score:view.score??{notes:[]}} as any,units,index),viewportFit:()=>({pages:[0]}),innerWidth:1280,innerHeight:720,effectiveView:(v:any)=>v,
  renderPages(){frames.push(context.readerPackage());},renderToolbar(){},focusSelection(){},practice:undefined,
  paintPersonalSaveError(_owner:any,error:Error){errors.push(error);},notify(message:string){messages.push(message);},
  loadPersonalJournal:async()=>structuredClone(disk),host:{}};
 const navigationWrites:any[]=[];personalMemoryBoundary(context,()=>disk,async(s,kind)=>{if(kind==='intent')await write(s);else{disk=structuredClone(s);navigationWrites.push(structuredClone(s));}});
 runInNewContext(body('function personalEditor(','function paintPersonalSaveError('),context);
 runInNewContext(body('/** Painting follows accepted intent','\nfunction labelMode(')+GENERIC_PERSONAL_COMMIT,context);
 runInNewContext(body('async function saveSelectedChoice(','\nfunction repaintLibrary('),context);
 return {context,target,seats,written,navigationWrites,frames,errors,messages,get disk(){return disk;},get editor(){return context.personalEditor(target);},
  setWrite(fn:(s:any)=>any){write=fn;},setProject(fn:(s:any)=>Promise<any>){project=fn;},writeDefault(s:any){disk=structuredClone(s);written.push(structuredClone(s));}};
}

test('restore/history accepted before a hand choice cannot replace that later choice when its write finishes',async()=>{
 const f=fixture(),gate=deferred();let calls=0;
 f.setWrite(async s=>{if(++calls===1)await gate.promise;f.writeDefault(s);});
 const restore=f.context.commitPersonal(f.target,(s:any)=>{s.calculatedVersion=2;s.choices['note-0']={hand:'LH',finger:1};return s;});
 const later=f.context.saveHandChoice('RH');
 assert.equal(f.target.personal.choices['note-0'].hand,'RH');await later;
 assert.equal(f.editor.view.choiceSnapshot.choices['note-0'].hand,'RH');assert.equal(f.written.length,0);
 gate.resolve();await restore;await f.editor.queue.flush();
 assert.deepEqual(f.written.map(s=>s.choices['note-0'].hand),['LH','RH']);
 assert.equal(f.disk.choices['note-0'].hand,'RH');assert.equal(f.target.personal.choices['note-0'].hand,'RH');assert.equal(f.editor.view.choiceSnapshot.choices['note-0'].hand,'RH');
 assert.equal((f.target.personal as any).calculatedVersion,2);
});

test('a generic history edit incorporates a previously accepted hand/finger edit while its save is still pending',async()=>{
 const f=fixture(),gate=deferred();f.setWrite(async s=>{await gate.promise;f.writeDefault(s);});
 await f.context.saveHandChoice('RH');await f.context.saveFingerDigit(3);
 const history=f.context.commitPersonal(f.target,(s:any)=>({...s,calculatedVersion:1}));
 assert.equal(f.target.personal.choices['note-0'].hand,'RH');assert.equal(f.target.personal.choices['note-0'].finger,3);
 assert.equal(f.context.selection.contactId,f.seats[1].contactId);
 gate.resolve();await history;await f.editor.queue.flush();
 assert.equal(f.written.length,3);assert.equal(f.disk.choices['note-0'].finger,3);assert.equal(f.disk.calculatedVersion,1);
});

test('an older generic projection cannot redirect selection or repaint a newer digit edit',async()=>{
 const f=fixture(),projection=deferred();let calls=0;f.setProject(async s=>++calls===1?projection.promise:{...f.target.package,choiceSnapshot:s});
 const restore=f.context.commitPersonal(f.target,(s:any)=>({...s,calculatedVersion:1}));
 await f.context.saveFingerDigit(2);const latest=f.editor.view,nextSeat=f.context.selection;
 projection.resolve({...f.target.package,choiceSnapshot:{stale:true}});await restore;await f.editor.queue.flush();
 assert.equal(f.editor.view,latest);assert.equal(f.context.selection,nextSeat);assert.equal(nextSeat.contactId,f.seats[1].contactId);
 assert.equal(f.disk.choices['note-0'].finger,2);
});

test('a generic edit is not replaced when an earlier keyboard projection finally settles',async()=>{
 const f=fixture(),projection=deferred();let calls=0;f.setProject(async s=>++calls===1?projection.promise:{...f.target.package,choiceSnapshot:s});
 const first=f.context.saveHandChoice('RH');const later=f.context.commitPersonal(f.target,(s:any)=>({...s,calculatedVersion:1}));
 await settle();const latest=f.editor.view;assert.equal(latest.choiceSnapshot.calculatedVersion,1);
 projection.resolve({...f.target.package,choiceSnapshot:{stale:true}});await first;await later;await f.editor.queue.flush();
 assert.equal(f.editor.view,latest);assert.equal(f.disk.choices['note-0'].hand,'RH');assert.equal(f.disk.calculatedVersion,1);
});

test('generic write failure retains both ordered intents and stops editing until the exact pending snapshots recover',async()=>{
 const f=fixture();let broken=true;f.setWrite(async s=>{if(broken)throw Error('disk unavailable');f.writeDefault(s);});
 const first=f.context.commitPersonal(f.target,(s:any)=>({...s,calculatedVersion:1}));
 const rejected=assert.rejects(first,/disk unavailable/);await f.context.saveHandChoice('RH');await rejected;await assert.rejects(f.editor.queue.flush(),/disk unavailable/);
 assert.equal(f.target.personal.choices['note-0'].hand,'RH');
 // Both intents stay journalled; the view queue keeps only the later whole snapshot.
 assert.equal(f.context.personalMemory.recovery.length,2);assert.equal(f.editor.queue.recovery.length,1);assert.ok(f.errors.length);
 const retained=JSON.stringify(f.target.personal);await assert.rejects(f.context.saveFingerDigit(3),/disk unavailable/);await assert.rejects(f.context.commitPersonal(f.target,(s:any)=>({...s,calculatedVersion:2})),/disk unavailable/);assert.equal(JSON.stringify(f.target.personal),retained);
 broken=false;await f.context.personalMemory.retry();await f.editor.queue.retry();assert.deepEqual(f.written.map(s=>s.choices['note-0'].hand),['LH','RH']);assert.equal(f.disk.calculatedVersion,1);assert.equal(f.editor.queue.recovery.length,0);
});

test('a generic projection failure preserves accepted state and later queued choices while retaining durable intent for projection recovery',async()=>{
 const f=fixture();let broken=true;f.setProject(async s=>{if(broken)throw Error('projection unavailable');return {...f.target.package,choiceSnapshot:s};});
 await assert.rejects(f.context.commitPersonal(f.target,(s:any)=>({...s,calculatedVersion:1})),/projection unavailable/);await assert.rejects(f.editor.queue.flush(),/projection unavailable/);
 assert.equal((f.target.personal as any).calculatedVersion,1);assert.equal(f.editor.queue.recovery.length,1);assert.equal(f.written.length,1);assert.equal(f.navigationWrites.length,0);assert.equal(f.disk.calculatedVersion,1);
 broken=false;for(const {sequence,snapshot} of f.editor.queue.recovery)f.editor.projections.set(sequence,f.editor.session.project(snapshot));await f.editor.queue.retry();assert.equal(f.disk.calculatedVersion,1);
});

test('finishing an old generic command after a score switch cannot paint or move the new score selection',async()=>{
 const f=fixture(),projection=deferred();f.setProject(()=>projection.promise);
 const old=f.context.commitPersonal(f.target,(s:any)=>({...s,calculatedVersion:1}));
 const other={entry:{id:'other',file:'edition-b'},package:{sourceSha256:'source-b'},personal:{view:{page:0}}},otherSeat={id:'other-seat',contactId:'other-contact',ownerIds:['other-note']};f.context.current=other;f.context.selection=otherSeat;
 projection.resolve({...f.target.package,choiceSnapshot:f.target.personal});await old;await f.editor.queue.flush();
 assert.equal(f.context.current,other);assert.equal(f.context.selection,otherSeat);assert.equal(f.frames.length,0);assert.equal(f.written.length,1);assert.equal(f.disk.calculatedVersion,1);assert.equal((other.personal as any).calculatedVersion,undefined);
});

function dialogFixture(){
 const f=fixture(),projection=deferred();f.setProject(()=>projection.promise);let submit!:(e:any)=>Promise<void>,restore!:()=>Promise<void>;const field={value:'3',select(){}},error={textContent:''};
 const opened={querySelector(selector:string){if(selector==='input')return field;if(selector==='form')return {addEventListener(_type:string,handler:any){submit=handler;}};if(selector==='[data-action=restore-one]')return {addEventListener(_type:string,handler:any){restore=handler;}};if(selector==='.error')return error;return undefined;}};
 Object.assign(f.context,{editSequence:{reset(){}},labelMode:()=> 'finger',savePersonalQuietly(){},fingerFor:()=>1,button:()=>'',restorePersonalAssignment:(_p:any,s:any)=>s,showDialog(){f.context.dialog=opened;return opened;},closeDialog(){f.context.dialog=undefined;}});
 runInNewContext(body('async function edit(','\nfunction onMidi('),f.context);
 return {...f,projection,opened,submit:()=>submit({preventDefault(){}}),restore:()=>restore()};
}

test('a delayed finger-dialog submission never closes a subsequently opened dialog',async()=>{
 const f=dialogFixture();await f.context.edit(f.seats[0]);const saving=f.submit(),replacementDialog={id:'new-options-dialog'};
 f.context.closeDialog();f.context.dialog=replacementDialog;f.projection.resolve({...f.target.package,choiceSnapshot:f.target.personal});await saving;
 assert.equal(f.context.dialog,replacementDialog);assert.equal(f.target.personal.choices['note-0'].finger,3);
});

test('a delayed finger-dialog submission never repaints or closes the new score after switching editions',async()=>{
 const f=dialogFixture();await f.context.edit(f.seats[0]);const saving=f.submit(),other={personal:{view:{page:0}},package:{sourceSha256:'other'}},newDialog={id:'new-score-dialog'};
 f.context.closeDialog();f.context.current=other;f.context.selection={id:'other-seat'};f.context.dialog=newDialog;
 f.projection.resolve({...f.target.package,choiceSnapshot:f.target.personal});await saving;
 assert.equal(f.context.dialog,newDialog);assert.equal(f.context.current,other);assert.equal(f.frames.length,0);
});

test('restore failure after Escape retains pending choices and handles its rejection without disturbing a new dialog',async()=>{
 const f=dialogFixture();f.setWrite(async()=>{throw Error('restore storage unavailable');});await f.context.edit(f.seats[0]);
 const restoring=f.restore(),newDialog={id:'new-options-dialog'};f.context.closeDialog();f.context.dialog=newDialog;
 f.projection.resolve({...f.target.package,choiceSnapshot:f.target.personal});await restoring;
 assert.equal(f.context.dialog,newDialog);await assert.rejects(f.editor.queue.flush(),/restore storage unavailable/);assert.equal(f.editor.queue.recovery.length,1);assert.match(f.editor.queue.error.message,/restore storage unavailable/);assert.ok(f.errors.length);
});

test('a hand the page cannot draw goes back to the hand it had; the player is told and the score stays usable',async()=>{
 const f=fixture();f.context.handFor=(_p:any,s:any,id:string)=>s.choices[id]?.hand??null;f.context.dropHandCarry=()=>undefined;
 const refused=()=>Error('These hand choices can\'t be drawn on the page yet.',{cause:new HandPresentationError('unsupported-fit','Personal hands cannot fit the matching musical presentation.',['note-0'])});
 f.setProject(async s=>{if(s.choices['note-0'].hand==='RH')throw refused();return {...f.target.package,choiceSnapshot:structuredClone(s)};});
 await f.context.saveHandChoice('RH');await f.context.personalMemory.flush();await f.editor.queue.flush();await settle();
 assert.equal(f.target.personal.choices['note-0'].hand,'LH');assert.equal(f.editor.view.choiceSnapshot.choices['note-0'].hand,'LH');
 assert.equal(f.disk.choices['note-0'].hand,'LH','the saved choice is the drawable one, so the next open succeeds');
 assert.ok(f.messages.includes('That hand can’t be drawn on the page yet, so the note keeps the hand it had.'));assert.deepEqual(f.errors,[]);
 // A drawable choice on the other note still goes through.
 f.context.selection=f.seats[1];await f.context.saveHandChoice('LH');await f.context.personalMemory.flush();await settle();
 assert.equal(f.target.personal.choices['note-1'].hand,'LH');assert.equal(f.editor.view.choiceSnapshot.choices['note-1'].hand,'LH');
});
