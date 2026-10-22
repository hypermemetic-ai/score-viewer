import {rotate,type Rotation} from './state';

export interface OrientationPreferences {libraryRotation:Rotation;displayRotation?:Rotation}
export function logicalViewport(width:number,height:number,rotation:Rotation){
 if(![0,90,180,270].includes(rotation)||![width,height].every(n=>Number.isFinite(n)&&n>0))throw Error('Display orientation differs; saved data retained.');
 return rotation%180?{width:height,height:width}:{width,height};
}
/** One physical orientation; raw legacy library/score fields are never rewritten. */
export class ViewerOrientation {
 private value:Rotation;private readerAdmitted=false;private explicit:boolean;
 constructor(readonly saved:OrientationPreferences){logicalViewport(1,1,saved.libraryRotation);if(saved.displayRotation!==undefined)logicalViewport(1,1,saved.displayRotation);this.explicit=saved.displayRotation!==undefined;this.value=saved.displayRotation??saved.libraryRotation;}
 get rotation(){return this.value;}
 admitReader(legacy:Rotation){logicalViewport(1,1,legacy);if(this.readerAdmitted)return;this.readerAdmitted=true;if(!this.explicit&&this.saved.libraryRotation===0)this.value=legacy;}
 turn(){this.value=rotate(this.value);this.explicit=true;return this.value;}
}
export function fitSurface(el:HTMLElement,rotation:Rotation,width=innerWidth,height=innerHeight){
 const logical=logicalViewport(width,height,rotation);el.style.width=`${logical.width}px`;el.style.height=`${logical.height}px`;el.style.transform=`translate(-50%,-50%) rotate(${rotation}deg)`;el.dataset.rotation=String(rotation);return logical;
}
export function fitDialog(el:HTMLDialogElement,rotation:Rotation,width=innerWidth,height=innerHeight){
 const logical=logicalViewport(width,height,rotation);el.style.position='fixed';el.style.inset='auto';el.style.left='50%';el.style.top='50%';el.style.margin='0';
 // A dialog placed high or low keeps to that edge of the logical screen in any rotation.
 const edge=`${Math.max(0,logical.height/2-16)}px`,place=el.dataset.place==='low'?` translate(0,calc(${edge} - 50%))`:el.dataset.place==='high'?` translate(0,calc(50% - ${edge}))`:'';
 el.style.transform=`translate(-50%,-50%) rotate(${rotation}deg)${place}`;el.style.setProperty('--viewer-logical-width',`${logical.width}px`);el.style.setProperty('--viewer-logical-height',`${logical.height}px`);el.style.maxWidth=`min(${Math.max(1,logical.width-32)}px, var(--viewer-dialog-max, 640px))`;el.style.maxHeight=`${Math.max(1,logical.height-32)}px`;el.dataset.rotation=String(rotation);
}
