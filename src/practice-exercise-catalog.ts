/** Stable catalog facts are independent of progress, availability and exclusion. */
export interface ExerciseClip {id:string;start:number;end:number;firstBar:number;lastBar:number;sectionId?:string;noteIds?:readonly string[];carryInNoteIds?:readonly string[];carryOutNoteIds?:readonly string[];tieNoteIds?:readonly string[];divergenceTick?:number;boundaryReasons?:readonly string[]}
export interface ExerciseSection extends ExerciseClip {pattern:string;boundaryReasons?:string[]}
export interface ContrastExercise {id:string;originalIds:readonly [string,string];clips:readonly [ExerciseClip,ExerciseClip];pattern:string;episode:number}
export interface PracticeExercise {
 id:string;kind:'section'|'connection'|'contrast';pattern:string;
 clips:readonly ExerciseClip[];originalIds:readonly string[];prerequisites:readonly string[];
 boundaryReasons:readonly string[];episode?:number;
}
const validClip=(c:ExerciseClip)=>typeof c.id==='string'&&!!c.id&&Number.isFinite(c.start)&&Number.isFinite(c.end)&&c.start<c.end&&Number.isInteger(c.firstBar)&&Number.isInteger(c.lastBar)&&c.firstBar>=0&&c.firstBar<=c.lastBar;
/** Compact DOM/storage key; canonical identity remains the complete pattern.
 * This deterministic digest is not an authenticity or cryptographic claim. */
export function stableExerciseId(kind:string,canonical:string):string {
 const seeds=[0x811c9dc5,0x9e3779b9,0x85ebca6b,0xc2b2ae35],digest=seeds.map(seed=>{let n=seed;for(let i=0;i<canonical.length;i++)n=Math.imul(n^canonical.charCodeAt(i),0x01000193);return (n>>>0).toString(16).padStart(8,'0');}).join('');
 return `${kind}-${digest}`;
}
/** Exactly neighboring originals produce doubles. They never produce new originals. */
export function createPracticeExerciseCatalog(sourceIdentity:string,policyFingerprint:string,
 sections:readonly ExerciseSection[],contrasts:readonly ContrastExercise[]=[]):readonly PracticeExercise[] {
 if(!sourceIdentity||!policyFingerprint)throw Error('Exercise catalog needs its source and sizing policy identities.');
 const originals=new Map<string,ExerciseSection>();
 for(const s of sections){if(!validClip(s)||!s.pattern||originals.has(s.id))throw Error('Invalid original section identity.');originals.set(s.id,s);}
 for(let i=1;i<sections.length;i++)if(sections[i-1].end!==sections[i].start)throw Error('Original sections must cover source in order without gaps or overlap.');
 const identity=(kind:string,clips:readonly ExerciseClip[],episode?:number)=>JSON.stringify([sourceIdentity,policyFingerprint,kind,clips.map(c=>[c.start,c.end]),episode??null]);
 const catalog:PracticeExercise[]=sections.map(s=>({id:s.id,kind:'section',pattern:s.pattern,clips:[{id:s.id,start:s.start,end:s.end,firstBar:s.firstBar,lastBar:s.lastBar}],originalIds:[s.id],prerequisites:[],boundaryReasons:s.boundaryReasons??[]}));
 for(let i=0;i<sections.length-1;i++){
  const a=sections[i],b=sections[i+1],clip={id:stableExerciseId('connection',identity('connection',[a,b])),start:a.start,end:b.end,firstBar:a.firstBar,lastBar:b.lastBar};
  catalog.push({id:clip.id,kind:'connection',pattern:identity('connection',[a,b]),clips:[clip],originalIds:[a.id,b.id],prerequisites:[a.id,b.id],boundaryReasons:[...(a.boundaryReasons??[]),...(b.boundaryReasons??[])]});
 }
 for(const c of contrasts){
  if(c.originalIds.length!==2||c.originalIds[0]===c.originalIds[1]||!Number.isInteger(c.episode)||c.episode<0||!c.pattern||c.clips.length!==2)throw Error('Invalid contrast episode.');
  c.clips.forEach((clip,i)=>{const original=originals.get(c.originalIds[i]);if(!original||!validClip(clip)||clip.start<original.start||clip.end>original.end)throw Error('Contrast clip must retain its actual original source span.');});
  const id=stableExerciseId('contrast',JSON.stringify([sourceIdentity,policyFingerprint,c.id,identity('contrast',c.clips,c.episode)]));
  catalog.push({id,kind:'contrast',pattern:c.pattern,clips:c.clips.map((clip,i)=>({...clip,id:`${id}-${i?'B':'A'}`})),originalIds:[...c.originalIds],prerequisites:[],boundaryReasons:[],episode:c.episode});
 }
 if(new Set(catalog.map(c=>c.id)).size!==catalog.length)throw Error('Exercise identities collide.');
 return catalog;
}

export function toggleExerciseExclusion(excluded:Readonly<Record<string,boolean>>|undefined,id:string,catalog:readonly Pick<PracticeExercise,'id'>[]):Record<string,boolean>{
 if(!catalog.some(c=>c.id===id))throw Error('Exclusion target is outside the current catalog.');
 const next={...excluded};if(next[id])delete next[id];else next[id]=true;return next;
}
export function includedExerciseTotal(catalog:readonly Pick<PracticeExercise,'id'>[],excluded:Readonly<Record<string,boolean>>|undefined,progress:(id:string)=>number):{included:number;progress:number|undefined}{
 const included=catalog.filter(c=>!excluded?.[c.id]);
 return {included:included.length,progress:included.length?included.reduce((sum,c)=>sum+Math.max(0,Math.min(1,progress(c.id))),0)/included.length:undefined};
}
/** Only exclusion changes anchor slots; ordinary rows retain their normal sort. */
export function anchorExcludedExercises<T extends {id:string}>(sorted:readonly T[],previous:readonly T[],excluded:Readonly<Record<string,boolean>>|undefined):T[]{
 const pending=sorted.filter(c=>!excluded?.[c.id]),byId=new Map(sorted.map(c=>[c.id,c])),slots=new Map(previous.flatMap((c,i)=>excluded?.[c.id]&&byId.has(c.id)?[[i,byId.get(c.id)!] as const]:[]));
 const result:T[]=[];for(let i=0;i<sorted.length;i++){const anchored=slots.get(i);if(anchored)result.push(anchored);else {const row=pending.shift();if(row)result.push(row);}}
 for(const row of sorted)if(!result.some(c=>c.id===row.id))result.push(row);
 return result;
}
