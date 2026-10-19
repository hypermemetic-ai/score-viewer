import {fitLeafPreview,practicePreviewRoom,practicePreviewRowCount} from './practice-crop-fit';
import {practicePercent,reconcilePassages,type PracticeChunk,type PracticePassagePlan,type PracticeState} from './practice';
import {displayedComponentsAttained,displayedPracticeProgress,displayedPracticeTotal} from './practice-display';
import {attainmentLabel} from './tempo-presentation';
import {metronomeMark} from './metronome-mark';
import {bindPracticePassages} from './practice-equivalence';
import {attainedRate,measuredRate,manualRates} from './practice-attainment';
import {toggleExerciseExclusion} from './practice-exercise-catalog';
import type {ExerciseClip} from './practice-exercise-catalog';

export const practiceMeasureRange=(id:string)=>id.replace('-', ' – ');
/** Progress on a score without a reference tempo counts toward the player's own tempo. */
export function playerTempoNote(plan:PracticePassagePlan,state:Pick<PracticeState,'target'>,tag:'span'|'small'='span'){
 return plan.playerTempo&&plan.referencePerformanceTempo?`<${tag} class="practice-player-tempo" data-player-tempo>Your tempo ${metronomeMark(plan.referencePerformanceTempo,state.target)}</${tag}>`:'';
}
/** Partition only presentation. No source renderer receives an unbounded span. */
export function practicePreviewSourceRows(clip:ExerciseClip,bars:readonly number[],maximumBars:number):ExerciseClip[]{
 if(!Number.isSafeInteger(maximumBars)||maximumBars<1||maximumBars>64)throw Error('Invalid source preview row bound.');
 const rows:ExerciseClip[]=[];
 for(let first=clip.firstBar;first<=clip.lastBar;first+=maximumBars){const last=Math.min(clip.lastBar,first+maximumBars-1);
  rows.push({...clip,firstBar:first,lastBar:last,start:Math.max(clip.start,bars[first]),end:Math.min(clip.end,bars[last+1])});
 }
 return rows;
}
type PassageTree=ReturnType<typeof reconcilePassages>;
const escape=(value:string)=>value.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export function practiceChunkRange(chunk:PracticeChunk|undefined):string {
 if(!chunk)return '';
 const range=(clip:Pick<PracticeChunk,'firstBar'|'lastBar'>)=>clip.firstBar===clip.lastBar?String(clip.firstBar+1):`${clip.firstBar+1} – ${clip.lastBar+1}`;
 return chunk.kind==='contrast'?chunk.clips!.map(range).join(' / '):range(chunk);
}


/** At a list edge retain the previous row as page context, using logical coordinates. */
export function practiceListScrollTop(scrollTop:number,height:number,max:number,target:{top:number;bottom:number},previous?:{top:number;bottom:number}){
 if(target.top>=scrollTop&&target.bottom<=scrollTop+height)return scrollTop;
 const contextual=previous&&previous.top>=scrollTop&&previous.bottom<=scrollTop+height;
 const next=target.bottom>scrollTop+height?(contextual?previous.top:target.bottom-height):(contextual?previous.bottom-height:target.top);
 return Math.max(0,Math.min(max,next));
}

/** A browsing region has no practice pattern, evidence or exclusion identity. */
export interface PracticeCompletedGroup {kind:'group';id:string;firstBar:number;lastBar:number;originalIds:string[]}
export interface PracticeBrowserPresentation {
 completed:PracticeCompletedGroup[];incomplete:PracticeChunk[];contrasts:PracticeChunk[];
 left:(PracticeCompletedGroup|PracticeChunk)[];
 children:(id:string)=>{connections:PracticeChunk[];completed:PracticeChunk[]};
}

/** Navigation state is separate from assessment; browsing never records a played run. */
export class PracticeBrowser {
 /** The section action this study mode offers: practising or fingering it. */
 verb:'Practice'|'Finger'='Practice';
 selected:string;parent?:string;component?:string;includeManual=true;private recommended?:string;private retainedSelection?:string;private groupAnchor?:string;
 constructor(readonly plan:PracticePassagePlan){this.selected=plan.chunks[0]?.id??'';}
 available(state:PracticeState,chunk:PracticeChunk){if(!chunk.prerequisites?.length)return true;const all=this.tree(state).all;return (chunk.prerequisites??[]).every(id=>{const part=all.get(id);return !!part&&attainedRate(state,part.pattern,part.id)>=state.target;});}
 private get bounded(){return this.plan.partition==='bounded-exercises-v1';}
 toggleExcluded(state:PracticeState,id=this.component??this.selected){if(!this.bounded||!id||!this.plan.catalog?.some(c=>c.id===id))return false;state.excluded=toggleExerciseExclusion(state.excluded,id,this.plan.catalog??[]);return true;}
 private tree(state:PracticeState){const tree=reconcilePassages(this.plan,structuredClone(state));bindPracticePassages(this.plan,state,tree.all);return tree;}
 progress(chunk:PracticeChunk,state:PracticeState){return displayedPracticeProgress(chunk,state,this.includeManual);}
 setIncludeManual(include:boolean){this.includeManual=include;this.retainedSelection=this.selected;}
 groups(state:PracticeState){return this.groupsFromTree(state,this.tree(state));}
 private groupsFromTree(state:PracticeState,{frontier,all}:PassageTree){const completed:PracticeChunk[]=[];const attained=(c:PracticeChunk)=>displayedComponentsAttained(c,state,all,this.includeManual),collect=(c:PracticeChunk)=>{if(attained(c))completed.push(c);else for(const id of c.components??[])collect(all.get(id)!);};frontier.forEach(collect);const top=new Set(completed.map(c=>c.id)),unfinished=frontier.filter(c=>!top.has(c.id)),selected=all.get(this.recommended??this.retainedSelection??'');if(selected&&selected.id===this.selected&&![...completed,...unfinished].some(c=>c.id===selected.id))(attained(selected)?completed:unfinished).push(selected);return {completed:completed.sort((a,b)=>a.firstBar-b.firstBar),unfinished:unfinished.sort((a,b)=>this.progress(b,state)-this.progress(a,state)||a.firstBar-b.firstBar)};}
 rows(state:PracticeState){return this.rowsFromTree(state,this.tree(state));}
 private rowsFromTree(state:PracticeState,tree:PassageTree){if(this.bounded)return tree.frontier;const {completed,unfinished}=this.groupsFromTree(state,tree);return [...completed,...unfinished];}
 current(state:PracticeState){const tree=this.tree(state);if(this.bounded)this.reconcileSelection(this.presentationFromTree(state,tree),tree);return this.currentFromTree(tree);}
 private currentFromTree({all}:PassageTree){return all.get(this.component??this.selected);}
 originalGroups(_state:PracticeState,chunk:PracticeChunk){if(this.bounded)return (chunk.originalIds??[chunk.id]).map(id=>this.plan.chunks.find(c=>c.id===id)).filter((c):c is PracticeChunk=>!!c);return chunk.components?this.plan.chunks.filter(c=>c.firstBar>=chunk.firstBar&&c.lastBar<=chunk.lastBar):[chunk];}
 select(state:PracticeState,id:string,component=false){const tree=this.tree(state);if(this.bounded){const model=this.presentationFromTree(state,tree);this.selectBounded(id,component,model,tree);return;}this.selectFromTree(id,component,tree);}
 private selectFromTree(id:string,component:boolean,{all}:PassageTree){const chunk=all.get(id);if(!chunk)return;if(component)this.component=id;else{if(this.recommended!==id)this.recommended=undefined;if(this.retainedSelection!==id)this.retainedSelection=undefined;this.selected=id;this.parent=chunk.components?id:undefined;this.component=undefined;}}
 suggest(state:PracticeState,chunk:PracticeChunk){if(this.bounded){this.select(state,chunk.id);return;}this.recommended=undefined;const tree=this.tree(state),row=this.rowsFromTree(state,tree).find(c=>c.firstBar<=chunk.firstBar&&c.lastBar>=chunk.lastBar);if(!row)return;if(row.id!==chunk.id&&chunk.components){this.recommended=chunk.id;this.selectFromTree(chunk.id,false,tree);}else{this.selectFromTree(row.id,false,tree);if(row.id!==chunk.id)this.selectFromTree(chunk.id,true,tree);}}
 key(code:string,state:PracticeState):'practice'|'handled'|'exclusion'|undefined {
  if(this.bounded&&code!=='KeyX')return this.keyBounded(code,state);
  if(code==='KeyX'&&this.bounded){const hovered=document.querySelector<HTMLElement>('.practice-overview [data-passage-id]:hover');if(this.toggleExcluded(state,hovered?.dataset.passageId??this.component??this.selected))return 'exclusion';return;}
  const tree=this.tree(state),{all}=tree,rows=this.rowsFromTree(state,tree),parent=all.get(this.parent??this.selected),components=parent?this.originalGroups(state,parent):[];
  if(code==='Enter'){const current=this.currentFromTree(tree);return current&&(this.verb==='Finger'||this.available(state,current))?'practice':'handled';}
  if(code==='ArrowRight'&&components.length){const i=components.findIndex(c=>c.id===this.component);this.parent=parent!.id;this.component=components[(i+1)%components.length].id;return 'handled';}
  if(code==='ArrowLeft'&&this.component){this.component=undefined;return 'handled';}
  if(code==='ArrowUp'||code==='ArrowDown'){const list=this.component?components:rows,id=this.component??this.selected,i=Math.max(0,list.findIndex(c=>c.id===id)),next=list[Math.max(0,Math.min(list.length-1,i+(code==='ArrowUp'?-1:1)))];if(next)this.selectFromTree(next.id,!!this.component,tree);return 'handled';}
  if(code==='ArrowLeft'||code==='ArrowRight')return 'handled';
 }
 render(root:HTMLElement,state:PracticeState,passage:(bars:number[],clip?:ExerciseClip)=>SVGSVGElement,focus=false){
  if(this.bounded){this.renderBounded(root,state,passage,focus);return;}
  const lists=[...root.querySelectorAll<HTMLElement>('.practice-browser>.practice-chunks')],scrolls=lists.map(el=>el.scrollTop),active=document.activeElement as HTMLElement,previous=active?.closest<HTMLElement>('[data-passage-id]'),previousId=previous?.dataset.passageId,previousComponent=previous?.dataset.component;
  const digits=String(this.plan.barTicks.length-1).length;root.style.setProperty('--practice-list-width',`max(136px, calc(${2*digits+9}ch + 20px))`);
  // One lexical tree per synchronous operation; public entry points remain fresh.
  const tree=this.tree(state),rows=this.rowsFromTree(state,tree);if(!rows.some(c=>c.id===this.selected)){const old=tree.all.get(this.selected),enclosing=rows.find(c=>old&&c.firstBar<=old.firstBar&&c.lastBar>=old.lastBar);this.selectFromTree(enclosing?.id??rows[0]?.id??'',false,tree);}
  const {all}=tree,parent=all.get(this.parent??this.selected),components=parent?this.originalGroups(state,parent):[],current=this.currentFromTree(tree),{completed,unfinished}=this.groupsFromTree(state,tree);
  const row=(c:PracticeChunk,child=false)=>{
   const best=measuredRate(state,c.pattern,c.id),claims=manualRates(state,{passage:c.id,pattern:c.pattern}),percent=practicePercent(this.progress(c,state)),bestLabel=best?`Best ${attainmentLabel(best,state.target)}`:'',doneLabel=claims.length?`Done ${attainmentLabel(Math.max(...claims),state.target)}`:'',evidence=[bestLabel,doneLabel].filter(Boolean).join(' · ');
   return `<button data-practice="${child?'component':'select'}:${c.id}" data-passage-id="${c.id}" data-component="${child}" tabindex="${(child?this.component===c.id:!this.component&&this.selected===c.id)?0:-1}" aria-current="${(child?current?.id===c.id:this.selected===c.id)}" aria-label="Measures ${practiceMeasureRange(c.id)}, ${percent}%${evidence?`, ${evidence}`:''}${c.components?', components available':''}"><span class="practice-range">${practiceMeasureRange(c.id)}</span><span>${percent}%</span></button>`;
  };
  root.innerHTML=`<div class="practice-overall"><span>Total progress · <strong>${practicePercent(displayedPracticeTotal(this.plan,structuredClone(state),this.includeManual))}%</strong></span>${playerTempoNote(this.plan,state)}<label><input type="checkbox" data-practice-display="manual" ${this.includeManual?'checked':''}> Include manual</label></div><div class="practice-browser"><div class="practice-chunks" aria-label="Practice passages">${completed.length?`<section class="practice-completed" aria-label="Joined and learned passages">${completed.map(c=>row(c)).join('')}</section>`:''}<section class="practice-unfinished" aria-label="Unfinished passages">${unfinished.map(c=>row(c)).join('')}</section></div><div class="practice-components practice-chunks" aria-label="Original groups of measures ${practiceMeasureRange(parent?.id??'')}">${components.map(c=>row(c,true)).join('')}</div><aside class="practice-passage-detail" aria-label="Selected passage"><p>Measures ${practiceMeasureRange(current?.id??'')} · ${current?practicePercent(this.progress(current,state)):0}%</p><button class="practice-start" data-practice="passage:${current?.id??''}">${this.verb} ${current?.components?'whole range':'these measures'} <kbd>Enter</kbd></button><div class="practice-leaf-preview"${current?.components?' hidden':''}></div></aside></div>`;
  if(current&&!current.components){const preview=root.querySelector('.practice-leaf-preview')!;preview.setAttribute('aria-label',`Score preview, measures ${practiceMeasureRange(current.id)}`);try{preview.append(passage(Array.from({length:current.lastBar-current.firstBar+1},(_,i)=>current.firstBar+i)));}catch(error){const message=document.createElement('p');message.className='practice-render-error';message.textContent=`Measures ${practiceMeasureRange(current.id)}: ${(error as Error).message}`;preview.append(message);}}
  fitLeafPreview(root.querySelector<HTMLElement>('.practice-leaf-preview')!);
  const updated=[...root.querySelectorAll<HTMLElement>('.practice-browser>.practice-chunks')];updated.forEach((el,i)=>{if(el.scrollHeight>el.clientHeight){const height=[...el.querySelectorAll<HTMLElement>('button')].at(-1)?.offsetHeight??0;el.style.paddingBottom=`${Math.max(0,el.clientHeight-height)}px`;}el.scrollTop=scrolls[i]??0;});
  if(focus){const target=root.querySelector<HTMLElement>(`[data-passage-id="${this.component??this.selected}"][data-component="${!!this.component}"]`);if(target){target.focus({preventScroll:true});const list=target.closest<HTMLElement>('.practice-chunks')!,bounds=(el:HTMLElement)=>{let top=0;for(let node:HTMLElement|null=el;node&&node!==list;node=node.offsetParent as HTMLElement|null)top+=node.offsetTop;return {top,bottom:top+el.offsetHeight};},prior=previousId?list.querySelector<HTMLElement>(`[data-passage-id="${previousId}"][data-component="${previousComponent}"]`):null;list.scrollTop=practiceListScrollTop(list.scrollTop,list.clientHeight,list.scrollHeight-list.clientHeight,bounds(target),prior?bounds(prior):undefined);}}
 }
 /** The catalog remains unchanged; this projection only organizes its rows. */
 presentation(state:PracticeState){return this.presentationFromTree(state,this.tree(state));}
 private presentationFromTree(state:PracticeState,tree:PassageTree):PracticeBrowserPresentation {
  const originals=[...tree.all.values()].filter(c=>c.kind==='section').sort((a,b)=>a.start-b.start),completed:PracticeCompletedGroup[]=[],incomplete:PracticeChunk[]=[];
  for(const original of originals){
   if(this.progress(original,state)<1){incomplete.push(original);continue;}
   const previous=completed.at(-1),last=previous&&tree.all.get(previous.originalIds.at(-1)!);
   if(previous&&last?.end===original.start){previous.originalIds.push(original.id);previous.lastBar=original.lastBar;previous.id=`group-${previous.originalIds[0]}-${original.id}`;}
   else completed.push({kind:'group',id:`group-${original.id}-${original.id}`,firstBar:original.firstBar,lastBar:original.lastBar,originalIds:[original.id]});
  }
  incomplete.sort((a,b)=>this.progress(b,state)-this.progress(a,state)||a.start-b.start);
  const contrasts=[...tree.all.values()].filter(c=>c.kind==='contrast'),connections=[...tree.all.values()].filter(c=>c.kind==='connection');
  const sourceOrder=(a:PracticeChunk,b:PracticeChunk)=>a.start-b.start||a.end-b.end||a.id.localeCompare(b.id);
  const children=(id:string)=>{
   const group=completed.find(g=>g.id===id),original=tree.all.get(id);
   const pairs=connections.filter(c=>group?c.originalIds?.every(key=>group.originalIds.includes(key)):original?.kind==='section'&&c.originalIds?.includes(id));
   const done=[...(group?group.originalIds.map(key=>tree.all.get(key)!):[]),...pairs.filter(c=>this.progress(c,state)>=1)].sort(sourceOrder);
   return {connections:pairs.filter(c=>this.progress(c,state)<1).sort(sourceOrder),completed:done};
  };
  return {completed,incomplete,contrasts,left:[...completed,...incomplete,...contrasts],children};
 }
 private locateExercise(id:string,model:PracticeBrowserPresentation,tree:PassageTree){
  if(model.left.some(c=>c.id===id))return id;
  const group=model.completed.find(g=>[...model.children(g.id).connections,...model.children(g.id).completed].some(c=>c.id===id));
  if(group)return group.id;
  const chunk=tree.all.get(id);
  return model.incomplete.find(c=>chunk?.originalIds?.includes(c.id))?.id;
 }
 private selectBounded(id:string,child:boolean,model:PracticeBrowserPresentation,tree:PassageTree){
  const group=model.completed.find(c=>c.id===id);
  if(group){this.selected=id;this.parent=id;this.component=undefined;this.groupAnchor=group.originalIds[0];return;}
  if(!tree.all.has(id))return;
  const contents=model.children(this.selected),inCurrent=[...contents.connections,...contents.completed].some(c=>c.id===id);
  const owner=child&&inCurrent?this.selected:this.locateExercise(id,model,tree);if(!owner)return;
  this.selected=owner;this.parent=owner;this.component=owner===id?undefined:id;
  this.groupAnchor=model.completed.find(c=>c.id===owner)?.originalIds[0];
 }
 private reconcileSelection(model:PracticeBrowserPresentation,tree:PassageTree){
  const concrete=this.component??(tree.all.has(this.selected)?this.selected:undefined);
  if(concrete){this.selectBounded(concrete,!!this.component,model,tree);return;}
  if(model.completed.some(g=>g.id===this.selected))return;
  const next=model.completed.find(g=>g.originalIds.includes(this.groupAnchor??''))??model.left[0];
  if(next)this.selectBounded(next.id,false,model,tree);
  else {this.selected='';this.parent=undefined;this.component=undefined;}
 }
 private keyBounded(code:string,state:PracticeState):'practice'|'handled'|undefined {
  const tree=this.tree(state),model=this.presentationFromTree(state,tree);this.reconcileSelection(model,tree);
  const contents=model.children(this.selected),children=[...contents.connections,...contents.completed];
  if(code==='Enter'&&this.currentFromTree(tree)){const current=this.currentFromTree(tree)!;return this.verb==='Finger'||this.available(state,current)?'practice':'handled';}
  if(code==='ArrowRight'||code==='Enter'){if(!this.component&&children[0])this.selectBounded(children[0].id,true,model,tree);return 'handled';}
  if(code==='ArrowLeft'){this.component=undefined;return 'handled';}
  if(code==='ArrowUp'||code==='ArrowDown'){
   const rows=this.component?children:model.left,index=Math.max(0,rows.findIndex(c=>c.id===(this.component??this.selected))),next=rows[Math.max(0,Math.min(rows.length-1,index+(code==='ArrowUp'?-1:1)))];
   if(next)this.selectBounded(next.id,!!this.component,model,tree);return 'handled';
  }
 }
 private renderBounded(root:HTMLElement,state:PracticeState,passage:(bars:number[],clip?:ExerciseClip)=>SVGSVGElement,focus:boolean){
  const lists=[...root.querySelectorAll<HTMLElement>('.practice-browser>.practice-chunks')],scrolls=lists.map(el=>el.scrollTop),active=document.activeElement as HTMLElement|undefined,previous=active?.closest<HTMLElement>('[data-passage-id]'),previousId=previous?.dataset.passageId,previousComponent=previous?.dataset.component;
  const tree=this.tree(state),rows=this.rowsFromTree(state,tree),model=this.presentationFromTree(state,tree);this.reconcileSelection(model,tree);
  const current=this.currentFromTree(tree),contents=model.children(this.selected);
  const digits=String(this.plan.barTicks.length-1).length;root.style.setProperty('--practice-list-width',`max(136px, calc(${2*digits+9}ch + 20px))`);
  const included=rows.filter(c=>!state.excluded?.[c.id]).length,total=included?`${practicePercent(displayedPracticeTotal(this.plan,structuredClone(state),this.includeManual))}%`:'No exercises included';
  const label=(c:PracticeChunk)=>`${c.kind==='contrast'?'Contrast':c.kind==='connection'?'Connection':'Measures'} ${practiceChunkRange(c)}`;
  const row=(c:PracticeChunk,child=false)=>{
   const skipped=!!state.excluded?.[c.id],percent=practicePercent(this.progress(c,state)),best=measuredRate(state,c.pattern,c.id),claims=manualRates(state,{passage:c.id,pattern:c.pattern});
   const evidence=[best?`Best ${attainmentLabel(best,state.target)}`:'',claims.length?`Done ${attainmentLabel(Math.max(...claims),state.target)}`:''].filter(Boolean).join(' · ');
   return `<button class="${skipped?'practice-excluded':''}" data-practice="${child?'component':'select'}:${escape(c.id)}" data-passage-id="${escape(c.id)}" data-component="${child}" tabindex="${(child?this.component===c.id:!this.component&&this.selected===c.id)?0:-1}" aria-current="${child?current?.id===c.id:this.selected===c.id}" aria-label="${escape(label(c))}, ${percent}%${skipped?', excluded from total':''}${evidence?`, ${escape(evidence)}`:''}"><span class="practice-range">${escape(c.kind==='contrast'?practiceChunkRange({...c,kind:'section',firstBar:c.clips![0].firstBar,lastBar:c.clips![0].lastBar}):practiceChunkRange(c))}${c.kind==='contrast'?`<small>vs ${escape(practiceChunkRange({...c,kind:'section',firstBar:c.clips![1].firstBar,lastBar:c.clips![1].lastBar}))} · ${Number(c.episode??0)+1}</small>`:''}</span><span class="practice-row-progress"><span>${percent}%</span>${skipped?'<small class="practice-row-exclusion" aria-hidden="true">Excluded</small>':''}</span></button>`;
  };
  const section=(title:string,entries:string[])=>entries.length?`<section aria-label="${title}"><p class="practice-catalog-label">${title}</p>${entries.join('')}</section>`:'';
  const groupRow=(group:PracticeCompletedGroup)=>{const range=group.firstBar===group.lastBar?String(group.firstBar+1):`${group.firstBar+1} – ${group.lastBar+1}`;return `<button data-practice="select:${escape(group.id)}" data-passage-id="${escape(group.id)}" data-component="false" tabindex="${!this.component&&this.selected===group.id?0:-1}" aria-current="${this.selected===group.id}" aria-label="Measures ${range}, completed sections"><span class="practice-range">${range}</span></button>`;};
  root.innerHTML=`<div class="practice-overall"><span>Total progress · <strong>${total}</strong></span>${playerTempoNote(this.plan,state)}<label><input type="checkbox" data-practice-display="manual" ${this.includeManual?'checked':''}> Include manual</label></div><div class="practice-browser"><div class="practice-chunks practice-catalog" aria-label="Practice exercises">${section('Completed',model.completed.map(groupRow))}${section('Incomplete',model.incomplete.map(c=>row(c)))}${section('Contrasts',model.contrasts.map(c=>row(c)))}</div><div class="practice-components practice-chunks" aria-label="Selected group exercises">${section('Connections',contents.connections.map(c=>row(c,true)))}${section('Completed',contents.completed.map(c=>row(c,true)))}</div><aside class="practice-passage-detail" aria-label="Selected exercise">${current?`<p>${escape(label(current))} · ${practicePercent(this.progress(current,state))}%</p>`:''}${current?`<div class="practice-exercise-actions"><button class="practice-start" data-practice="passage:${escape(current.id)}" ${this.verb==='Finger'||this.available(state,current)?'':'disabled'}>${this.verb} ${current.kind==='contrast'?'this contrast':current.kind==='connection'?'this connection':'these measures'} <kbd>Enter</kbd></button><button class="practice-exclude-toggle" data-practice="${state.excluded?.[current.id]?'include':'exclude'}:${escape(current.id)}" aria-pressed="${!!state.excluded?.[current.id]}">${state.excluded?.[current.id]?'Include in total':'Exclude from total'} <kbd>X</kbd></button></div>`:''}<div class="practice-leaf-preview${current?.kind==='contrast'?' practice-contrast-preview':''}"></div></aside></div>`;
  if(current){const preview=root.querySelector<HTMLElement>('.practice-leaf-preview')!;preview.setAttribute('aria-label',`Score preview, ${label(current)}`);preview.dataset.practiceScrollPreview=String((current.clips??[current]).some(clip=>clip.lastBar-clip.firstBar+1>64));
   for(const [i,clip] of (current.clips??[{id:current.id,start:current.start,end:current.end,firstBar:current.firstBar,lastBar:current.lastBar}]).entries()){
    const frame=current.kind==='contrast'?document.createElement('section'):preview;if(current.kind==='contrast'){const caption=document.createElement('small');caption.textContent=`${i===0?'A':'B'} · Measures ${clip.firstBar+1} – ${clip.lastBar+1}`;frame.append(caption);preview.append(frame);}
    try{
     const bars=Array.from({length:clip.lastBar-clip.firstBar+1},(_,n)=>clip.firstBar+n),whole=bars.length<=64?passage(bars,clip):undefined,box=whole?.viewBox.baseVal,room=practicePreviewRoom(preview);
     // A/B shares available height; retain each actual excerpt and its caption.
     // Long sparse sections are valid. Split before asking the source renderer
     // for geometry; its retained 64-bar admission guard must never be bypassed.
     const count=box?practicePreviewRowCount(bars.length,box.width,box.height,{...room,height:room.height/(current.kind==='contrast'?current.clips!.length:1)}):Math.ceil(bars.length/4);
     if(count===1)frame.append(whole!);
     else{
      if(frame!==preview)frame.style.gap='12px';
      const length=Math.ceil(bars.length/count);
      for(const rowClip of practicePreviewSourceRows(clip,this.plan.barTicks,length)){const {firstBar,lastBar}=rowClip,row=Array.from({length:lastBar-firstBar+1},(_,n)=>firstBar+n),svg=passage(row,rowClip);
       svg.dataset.practicePreviewFirstBar=String(firstBar);svg.dataset.practicePreviewLastBar=String(lastBar);svg.setAttribute('aria-label',`Source preview, measures ${firstBar+1} – ${lastBar+1}`);frame.append(svg);
      }
     }
    }catch(error){const message=document.createElement('p');message.className='practice-render-error';message.textContent=`${label(current)}: ${(error as Error).message}`;frame.append(message);}
   }
  }
  fitLeafPreview(root.querySelector<HTMLElement>('.practice-leaf-preview')!);
  const updated=[...root.querySelectorAll<HTMLElement>('.practice-browser>.practice-chunks')];updated.forEach((el,i)=>{if(el.scrollHeight>el.clientHeight){const height=[...el.querySelectorAll<HTMLElement>('button')].at(-1)?.offsetHeight??0;el.style.paddingBottom=`${Math.max(0,el.clientHeight-height)}px`;}el.scrollTop=scrolls[i]??0;});
  if(focus){const target=root.querySelector<HTMLElement>(`[data-passage-id="${this.component??this.selected}"][data-component="${!!this.component}"]`);if(target){target.focus({preventScroll:true});const list=target.closest<HTMLElement>('.practice-chunks')!,scale=list.getBoundingClientRect().height/list.clientHeight||1,a=target.getBoundingClientRect(),b=list.getBoundingClientRect(),top=list.scrollTop+(a.top-b.top)/scale,prior=previousId?list.querySelector<HTMLElement>(`[data-passage-id="${previousId}"][data-component="${previousComponent}"]`):null,priorBox=prior?.getBoundingClientRect(),priorTop=priorBox?list.scrollTop+(priorBox.top-b.top)/scale:0;list.scrollTop=practiceListScrollTop(list.scrollTop,list.clientHeight,list.scrollHeight-list.clientHeight,{top,bottom:top+a.height/scale},priorBox?{top:priorTop,bottom:priorTop+priorBox.height/scale}:undefined);}}
 }

}
