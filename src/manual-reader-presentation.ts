import type {ViewState} from './state';
import type {ReadingPresentationController} from './reading-presentation';
import type {ManualReadingContext} from './manual-reading-context';
type ReadingContext=Pick<ManualReadingContext|ReadingPresentationController,'view'|'package'|'page'|'setAnchor'>;

/** Map a musical source anchor into the selected pagination without carrying
 * a page ordinal from ISO into TAB or altering the legacy personal journal. */
export function manualReaderView(context:ReadingContext,base:ViewState):ViewState {
 const cursor=context.view.cursors[context.view.notation];
 if(![1,.9,.75,.5].includes(cursor.scale)||![1,2,3].includes(cursor.pageCount)||![1,cursor.pageCount].includes(cursor.advance))
  throw Error('The saved notation cursor cannot be displayed by these reader controls; saved data retained.');
 return {...base,page:context.page,scale:cursor.scale as ViewState['scale'],count:cursor.pageCount as ViewState['count'],
  advance:cursor.advance===cursor.pageCount&&cursor.pageCount>1?'group':'slide',labelMode:'pitch'};
}
/** Preserve an existing source component anchor while that source page remains
 * selected. An explicit page turn chooses the first genuine bar of its page. */
export function retainManualReaderView(context:ReadingContext,view:ViewState){
 const scene=context.package.reading!.dual!.views[context.view.notation].scene;
 if(!Number.isSafeInteger(view.page)||view.page<0||view.page>=context.package.pages.length||![1,.9,.75,.5].includes(view.scale)||
  ![1,2,3].includes(view.count)||!['slide','group'].includes(view.advance))throw Error('Reader view differs from the admitted notation.');
 if(context.page!==view.page){const bars=scene.bars.filter(bar=>bar.page===view.page).sort((a,b)=>a.writtenBar-b.writtenBar);if(!bars.length)throw Error('The selected page has no genuine source bar.');context.setAnchor({writtenBar:bars[0].writtenBar});}
 context.view.cursors[context.view.notation]={scale:view.scale,pageCount:view.count,advance:view.advance==='group'?view.count:1};
 return structuredClone(context.view);
}
