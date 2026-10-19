import type {ScorePackage} from './package';
import {selectReadingNotation,type ReadingNotation} from './dual-reading-package';
import {manualMusicalFacts} from './manual-practice-plan';
import {identityHash} from './piano-preparation-identity';
import type {PracticePartition} from './practice';
import type {ReadingSourceAnchor,ManualReadingViewState} from './manual-reading-context';

/** The musical revision a reading's view and manual reference are saved
 * under: its source part and written music, never its ink. */
export function readingRevision(iso:Pick<ScorePackage,'score'|'reading'>,partition:PracticePartition='connection-boundary-v1'){
 return identityHash({version:'musical-manual-practice-v1',partId:iso.reading!.dual!.sourcePartId,partition,source:manualMusicalFacts(iso)});
}
/** Reading does not require a performance tempo. This controller owns source
 * anchors/cursors only; a manual session adds its genuine clock separately. */
export class ReadingPresentationController {
 readonly view:ManualReadingViewState;
 private constructor(private packages:Record<ReadingNotation,ScorePackage>,readonly revision:string,readonly partition:PracticePartition,raw:unknown){this.view=this.readView(raw);}
 static async open(input:ScorePackage,raw?:unknown,partition:PracticePartition='connection-boundary-v1'){
  if(!['connection-boundary-v1','fixed-four-v1'].includes(partition))throw Error('Unsupported reading source partition.');
  const iso=selectReadingNotation(input,'iso'),tab=selectReadingNotation(input,'tab'),snapshot=structuredClone(raw),
   packages={iso:{...iso,seats:[]},tab:{...tab,seats:[]}},revision=await readingRevision(iso,partition);
  return new ReadingPresentationController(packages,revision,partition,snapshot);
 }
 get package(){return this.packages[this.view.notation];}
 get storageName(){return `manual-reading-view-v1-${this.revision}.json`;}
 record(){return structuredClone(this.view);}
 private checkAnchor(anchor:ReadingSourceAnchor){const scene=this.packages.iso.reading!.dual!.views.iso.scene;
  if(!anchor||!Number.isSafeInteger(anchor.writtenBar)||!scene.bars.some(bar=>bar.writtenBar===anchor.writtenBar)||
    anchor.sourceEventId!==undefined&&!scene.components.some(c=>c.sourceEventId===anchor.sourceEventId&&c.writtenBar===anchor.writtenBar))
   throw Error('Reading anchor is not a genuine written source location.');
 }
 setAnchor(anchor:ReadingSourceAnchor){this.checkAnchor(anchor);this.view.anchor=structuredClone(anchor);}
 get page(){const scene=this.package.reading!.dual!.views[this.view.notation].scene,anchor=this.view.anchor;return (anchor.sourceEventId?scene.components.find(c=>c.sourceEventId===anchor.sourceEventId):scene.bars.find(bar=>bar.writtenBar===anchor.writtenBar))!.page;}
 switchNotation(notation:ReadingNotation){if(notation!=='iso'&&notation!=='tab')throw Error('Unsupported reading notation.');const changed=this.view.notation!==notation;this.view.notation=notation;return changed;}
 adoptView(raw:unknown){const next=this.readView(raw);Object.assign(this.view,next);}
 private readView(raw:unknown):ManualReadingViewState {
  const partId=this.packages.iso.reading!.dual!.sourcePartId;
  if(raw===undefined||raw===null)return {version:'manual-reading-view-v1',partId,musicalRevision:this.revision,notation:'iso',anchor:{writtenBar:0},cursors:{iso:{scale:1,pageCount:1,advance:1},tab:{scale:1,pageCount:1,advance:1}}};
  const next=structuredClone(raw) as ManualReadingViewState;
  if(!next||next.version!=='manual-reading-view-v1'||next.partId!==partId||next.musicalRevision!==this.revision||!['iso','tab'].includes(next.notation)||
    !next.cursors||Object.keys(next.cursors).sort().join(',')!=='iso,tab')throw Error('Reading view differs from its source part.');
  this.checkAnchor(next.anchor);
  for(const cursor of Object.values(next.cursors))if(!cursor||!Number.isFinite(cursor.scale)||cursor.scale<.2||cursor.scale>4||
   !Number.isSafeInteger(cursor.pageCount)||cursor.pageCount<1||cursor.pageCount>4||!Number.isSafeInteger(cursor.advance)||cursor.advance<1||cursor.advance>4)
   throw Error('Invalid reading notation cursor.');
  return next;
 }
}
