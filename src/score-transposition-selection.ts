import type {Entry} from './state';
import type {PhysicalKeyboardId} from '../vendor/iso-notation/src/model/physical-keyboard';
import type {ScorePackage} from './package';
import {getOriginalScoreIdentity,getScoreTransposition} from './score-transposition';

export interface ScoreTranspositionSelection {
 version:'score-transposition-selection-v1';
 steps:number;
 /** Most recently selected admitted archive for each absolute pitch offset. */
 editions:Record<string,Partial<Record<PhysicalKeyboardId,string>>>;
}
const packageName=(value:unknown):value is string=>typeof value==='string'&&/^package-[a-f0-9]{64}\.isoscore$/.test(value);
const object=(value:unknown):value is Record<string,unknown>=>!!value&&typeof value==='object'&&!Array.isArray(value);
const offset=(value:unknown):value is number=>Number.isSafeInteger(value);
export function validTranspositionSelection(value:unknown,file:string,packages:readonly string[]):value is ScoreTranspositionSelection {
 if(!object(value)||Object.keys(value).length!==3||value.version!=='score-transposition-selection-v1'||!offset(value.steps)||!object(value.editions))return false;
 const editions=value.editions,selected=editions[String(value.steps)];
 if(!object(editions['0'])||!object(selected)||!Object.values(selected).includes(file))return false;
 return Object.entries(editions).every(([key,layouts])=>/^-?(?:0|[1-9]\d*)$/.test(key)&&key!=='-0'&&offset(Number(key))&&object(layouts)&&Object.keys(layouts).length>0&&Object.entries(layouts).every(([layout,archive])=>['conventional-piano','janko-four-row'].includes(layout)&&packageName(archive)&&packages.includes(archive)));
}

/** Called while staging, never mutates the active collection or its pointer. */
export function nextTranspositionSelection(entry:Entry,file:string,request?:{steps:number;layout:PhysicalKeyboardId;layouts?:readonly PhysicalKeyboardId[];originalFile?:string;originalLayouts?:readonly PhysicalKeyboardId[];
 /** Earlier archive → the re-engraved edition that now stands for it. */
 replaced?:Readonly<Record<string,string>>}):ScoreTranspositionSelection|undefined {
 if(!request&&!entry.transposition)return;
 const steps=request?.steps??entry.transposition!.steps;
 if(!offset(steps))throw Error('Invalid score transposition; previous edition retained.');
 const editions=structuredClone(entry.transposition?.editions??{}),layout=request?.layout??Object.entries(editions[String(steps)]??{}).find(([,archive])=>archive===entry.file)?.[0] as PhysicalKeyboardId|undefined;
 if(!layout||!['conventional-piano','janko-four-row'].includes(layout))throw Error('The transposed keyboard identity is missing; previous edition retained.');
 if(!editions['0']){
  const original=request?.originalFile??(steps!==0?entry.file:file);
  if(!packageName(original))throw Error('The exact original edition is unavailable; previous edition retained.');
  editions['0']=Object.fromEntries((request?.originalLayouts??[layout]).map(id=>[id,original]));
 }
 // An archive engraved again is selected through the edition that replaced
 // it, on the keyboards that edition serves.
 const serves=new Map<string,readonly PhysicalKeyboardId[]>([[file,request?.layouts??[layout]],...(request?.originalFile?[[request.originalFile,request.originalLayouts??[layout]] as const]:[])]);
 for(const pitch of Object.values(editions))for(const [id,archive]of Object.entries(pitch) as Array<[PhysicalKeyboardId,string]>){
  const next=request?.replaced?.[archive];if(next&&serves.get(next)?.includes(id))pitch[id]=next;
 }
 if(request?.originalFile)for(const id of request.originalLayouts??[layout])editions['0'][id]??=request.originalFile;
 if(!packageName(file))throw Error('Invalid transposed archive identity; previous edition retained.');
 if(request?.layouts&&!request.layouts.includes(layout))throw Error('The transposed keyboard identity is missing; previous edition retained.');
 // An edition serving both keyboards fills only a keyboard with no edition
 // at this pitch yet; the other keyboard's retained edition stays selected.
 const pitch={...editions[String(steps)]};for(const id of request?.layouts??[])pitch[id]??=file;pitch[layout]=file;editions[String(steps)]=pitch;
 return {version:'score-transposition-selection-v1',steps,editions};
}

export function retainedTranspositionFile(entry:Entry,steps:number,layout:PhysicalKeyboardId):string|undefined {
 if(!offset(steps))throw Error('Invalid score transposition; previous edition retained.');
 return entry.transposition?.editions[String(steps)]?.[layout]??(steps===0&&!entry.transposition?entry.file:undefined);
}

/** A library pointer is admitted against its actual cold-opened archive. */
export function assertSelectedTransposition(entry:Entry,p:ScorePackage){
 if(getOriginalScoreIdentity(p)!==entry.id||`package-${p.archiveSha256}.isoscore`!==entry.file||getScoreTransposition(p)!==(entry.transposition?.steps??0)||entry.transposition&&!Object.values(entry.transposition.editions[String(entry.transposition.steps)]??{}).includes(entry.file))throw Error('The saved transposition differs from this score edition. All editions and journals are retained.');
}
