import type {PreparationStage} from '../vendor/iso-notation/src/score-presentation';

const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

/** One visual language for startup and owned foreground preparation. */
export function loadingMarkup(title:string,message:string):string {
 return `<div class="viewer-loading" aria-busy="true"><h2>${escape(title)}</h2><p class="job" role="status">${escape(message)}</p><progress class="viewer-loading-progress" aria-label="Loading"></progress><p class="viewer-loading-count" aria-live="off" hidden></p></div>`;
}

export function updateLoading(root:ParentNode,message:string,completed?:number,total?:number):void {
 const status=root.querySelector<HTMLElement>('.job');if(status&&status.textContent!==message)status.textContent=message;
 const progress=root.querySelector<HTMLProgressElement>('.viewer-loading-progress'),count=root.querySelector<HTMLElement>('.viewer-loading-count');
 const counted=typeof completed==='number'&&typeof total==='number'&&Number.isInteger(completed)&&Number.isInteger(total)&&total>0&&completed>=0&&completed<=total;
 if(progress){if(counted){progress.max=total!;progress.value=completed!;}else progress.removeAttribute('value');}
 if(count){count.hidden=!counted;count.textContent=counted?`${completed} of ${total} scores ready`:'';}
}

export function preparationMessage(stage:PreparationStage):string {
 switch(stage){
  case 'layout':case 'placement':return 'Preparing score pages…';
  case 'paint':return 'Preparing notation…';
  case 'lint':return 'Checking page fit…';
  case 'geometry':return 'Preparing note labels…';
  case 'fretted':case 'relations':return 'Preparing musical connections…';
  case 'commit':return 'Finishing score preparation…';
 }
}
