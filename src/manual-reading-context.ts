import type {ScorePackage} from './package';
import {selectReadingNotation,type ReadingNotation} from './dual-reading-package';
import {planManualPractice,type ManualPracticePlan} from './manual-practice-plan';
import {manualPracticeRecord,readManualPractice,manualPracticeStorageName} from './manual-practice-state';
import {ManualPracticeSession} from './manual-practice-session';
import {PracticeBrowser} from './practice-browser';
import type {PracticeChunk,PracticePartition,PracticeState} from './practice';

export interface ReadingSourceAnchor {writtenBar:number;sourceEventId?:string}
export interface ManualReadingViewState {
 version:'manual-reading-view-v1';partId:string;musicalRevision:string;notation:ReadingNotation;anchor:ReadingSourceAnchor;
 cursors:Record<ReadingNotation,{scale:number;pageCount:number;advance:number}>;
}
const defaults=()=>({scale:1,pageCount:1,advance:1});
function freezeGraph(value:unknown){if(value&&typeof value==='object'&&!Object.isFrozen(value)){for(const child of Object.values(value))freezeGraph(child);Object.freeze(value);}}
/** The controller owns one immutable admitted source graph. Per-view geometry
 * is navigation state; the manual journal and loop plan remain common. */
export class ManualReadingContext {
 readonly browser:PracticeBrowser;readonly state:PracticeState;readonly view:ManualReadingViewState;
 session?:ManualPracticeSession;
 private constructor(readonly plan:ManualPracticePlan,private packages:Record<ReadingNotation,ScorePackage>,saved:unknown,view:unknown){
  this.state=readManualPractice(saved,plan);this.browser=new PracticeBrowser(plan);
  this.view=this.readView(view);
 }
 static async open(input:ScorePackage,saved?:unknown,view?:unknown,partition:PracticePartition='connection-boundary-v1'){
  // Check actual realm admission and capture BOTH choices before any await.
  // A caller mutation while plan hashing settles cannot alter this context.
  const iso=selectReadingNotation(input,'iso'),tab=selectReadingNotation(input,'tab'),
   source=structuredClone({manifest:iso.manifest,score:iso.score,reading:iso.reading}),
   owned=(p:ScorePackage):ScorePackage=>({...p,...source,pages:[...p.pages],seats:[],reading:{...source.reading!,owners:structuredClone(p.reading!.owners),
    geometryEvidence:structuredClone(p.reading!.geometryEvidence),dual:{...source.reading!.dual!,notation:p.reading!.dual!.notation}}}),
   packages={iso:owned(iso),tab:owned(tab)},snapshot={saved:structuredClone(saved),view:structuredClone(view)};
  for(const p of Object.values(packages)){freezeGraph(p.score);freezeGraph(p.manifest);freezeGraph(p.reading);freezeGraph(p.pages);}
  const plan=await planManualPractice(packages.iso,partition);
  return new ManualReadingContext(plan,packages,snapshot.saved,snapshot.view);
 }
 get package(){return this.packages[this.view.notation];}
 get storageName(){return manualPracticeStorageName(this.plan);}
 get viewStorageName(){return `manual-reading-view-v1-${this.plan.revision}.json`;}
 record(){return manualPracticeRecord(this.plan,this.state);}
 viewRecord(){return structuredClone(this.view);}
 private readView(raw:unknown):ManualReadingViewState {
  const fallback:ManualReadingViewState={version:'manual-reading-view-v1',partId:this.plan.partId,musicalRevision:this.plan.revision,
   notation:'iso',anchor:{writtenBar:0},cursors:{iso:defaults(),tab:defaults()}};
  if(raw===undefined||raw===null)return fallback;
  const v=structuredClone(raw) as ManualReadingViewState;
  if(!v||v.version!==fallback.version||v.partId!==this.plan.partId||v.musicalRevision!==this.plan.revision||
   !['iso','tab'].includes(v.notation)||!v.anchor||!v.cursors||Object.keys(v.cursors).sort().join(',')!=='iso,tab')
   throw Error('Manual reading view differs from its source part.');
  this.checkAnchor(v.anchor);
  for(const c of Object.values(v.cursors))if(!c||!Number.isFinite(c.scale)||c.scale<.2||c.scale>4||
   !Number.isSafeInteger(c.pageCount)||c.pageCount<1||c.pageCount>4||!Number.isSafeInteger(c.advance)||c.advance<1||c.advance>4)
   throw Error('Invalid manual reading view cursor.');
  return v;
 }
 private checkAnchor(anchor:ReadingSourceAnchor){
  if(!Number.isSafeInteger(anchor.writtenBar)||anchor.writtenBar<0||anchor.writtenBar>=this.plan.barTicks.length-1||
   anchor.sourceEventId!==undefined&&!this.plan.components.some(c=>c.id===anchor.sourceEventId&&c.bar===anchor.writtenBar&&
    c.provenance.kind==='retained-source-written-component-v1'))throw Error('Reading anchor is not a source-written location.');
 }
 setAnchor(anchor:ReadingSourceAnchor){this.checkAnchor(anchor);this.view.anchor=structuredClone(anchor);}
 get page(){
  const scene=this.package.reading!.dual!.views[this.view.notation].scene,anchor=this.view.anchor;
  return (anchor.sourceEventId?scene.components.find(c=>c.sourceEventId===anchor.sourceEventId):scene.bars.find(b=>b.writtenBar===anchor.writtenBar))!.page;
 }
 switchNotation(notation:ReadingNotation){
  if(notation!=='iso'&&notation!=='tab')throw Error('Unsupported reading notation.');
  if(notation===this.view.notation)return false;
  // The UI stops/cancels its owned audio generation before replacing geometry.
  this.session?.pause();this.view.notation=notation;return true;
 }
 selectPassage(chunk:PracticeChunk){
  this.session?.pause();this.session=new ManualPracticeSession(this.plan,chunk,this.state);
  this.setAnchor({writtenBar:chunk.firstBar});return this.session;
 }
 turn(direction:1|-1){
  if(!this.session)return false;const changed=this.session.turn(direction);
  if(changed)this.setAnchor({writtenBar:this.session.windows.bars[0]});return changed;
 }
 /** Called after the musical frame update, including repeat's explicit reset. */
 syncWindowAnchor(){if(this.session)this.setAnchor({writtenBar:this.session.windows.bars[0]});}
}
