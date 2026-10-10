import {fitLeafPreview} from './practice-crop-fit';
import {practicePercent,reconcilePassages,type PracticeChunk,type PracticePlan,type PracticeState} from './practice';
import {displayedComponentsAttained,displayedPracticeProgress,displayedPracticeTotal} from './practice-display';
import {attainmentLabel} from './tempo-presentation';
import {bindPracticePassages} from './practice-equivalence';
import {measuredRate,manualRates} from './practice-attainment';

export const practiceMeasureRange=(id:string)=>id.replace('-', ' – ');
type PassageTree=ReturnType<typeof reconcilePassages>;

/** At a list edge retain the previous row as page context, using logical coordinates. */
export function practiceListScrollTop(scrollTop:number,height:number,max:number,target:{top:number;bottom:number},previous?:{top:number;bottom:number}){
 if(target.top>=scrollTop&&target.bottom<=scrollTop+height)return scrollTop;
 const contextual=previous&&previous.top>=scrollTop&&previous.bottom<=scrollTop+height;
 const next=target.bottom>scrollTop+height?(contextual?previous.top:target.bottom-height):(contextual?previous.bottom-height:target.top);
 return Math.max(0,Math.min(max,next));
}

/** Navigation state is separate from assessment; browsing never records a played run. */
export class PracticeBrowser {
 selected:string;parent?:string;component?:string;includeManual=true;private recommended?:string;private retainedSelection?:string;
 constructor(readonly plan:PracticePlan){this.selected=plan.chunks[0]?.id??'';}
 private tree(state:PracticeState){const tree=reconcilePassages(this.plan,structuredClone(state));bindPracticePassages(this.plan,state,tree.all);return tree;}
 progress(chunk:PracticeChunk,state:PracticeState){return displayedPracticeProgress(chunk,state,this.includeManual);}
 setIncludeManual(include:boolean){this.includeManual=include;this.retainedSelection=this.selected;}
 groups(state:PracticeState){return this.groupsFromTree(state,this.tree(state));}
 private groupsFromTree(state:PracticeState,{frontier,all}:PassageTree){const completed:PracticeChunk[]=[];const attained=(c:PracticeChunk)=>displayedComponentsAttained(c,state,all,this.includeManual),collect=(c:PracticeChunk)=>{if(attained(c))completed.push(c);else for(const id of c.components??[])collect(all.get(id)!);};frontier.forEach(collect);const top=new Set(completed.map(c=>c.id)),unfinished=frontier.filter(c=>!top.has(c.id)),selected=all.get(this.recommended??this.retainedSelection??'');if(selected&&selected.id===this.selected&&![...completed,...unfinished].some(c=>c.id===selected.id))(attained(selected)?completed:unfinished).push(selected);return {completed:completed.sort((a,b)=>a.firstBar-b.firstBar),unfinished:unfinished.sort((a,b)=>this.progress(b,state)-this.progress(a,state)||a.firstBar-b.firstBar)};}
 rows(state:PracticeState){return this.rowsFromTree(state,this.tree(state));}
 private rowsFromTree(state:PracticeState,tree:PassageTree){const {completed,unfinished}=this.groupsFromTree(state,tree);return [...completed,...unfinished];}
 current(state:PracticeState){return this.currentFromTree(this.tree(state));}
 private currentFromTree({all}:PassageTree){return all.get(this.component??this.selected);}
 originalGroups(_state:PracticeState,chunk:PracticeChunk){return chunk.components?this.plan.chunks.filter(c=>c.firstBar>=chunk.firstBar&&c.lastBar<=chunk.lastBar):[chunk];}
 select(state:PracticeState,id:string,component=false){this.selectFromTree(id,component,this.tree(state));}
 private selectFromTree(id:string,component:boolean,{all}:PassageTree){const chunk=all.get(id);if(!chunk)return;if(component)this.component=id;else{if(this.recommended!==id)this.recommended=undefined;if(this.retainedSelection!==id)this.retainedSelection=undefined;this.selected=id;this.parent=chunk.components?id:undefined;this.component=undefined;}}
 suggest(state:PracticeState,chunk:PracticeChunk){this.recommended=undefined;const tree=this.tree(state),row=this.rowsFromTree(state,tree).find(c=>c.firstBar<=chunk.firstBar&&c.lastBar>=chunk.lastBar);if(!row)return;if(row.id!==chunk.id&&chunk.components){this.recommended=chunk.id;this.selectFromTree(chunk.id,false,tree);}else{this.selectFromTree(row.id,false,tree);if(row.id!==chunk.id)this.selectFromTree(chunk.id,true,tree);}}
 key(code:string,state:PracticeState):'practice'|'handled'|undefined {
  const tree=this.tree(state),{all}=tree,rows=this.rowsFromTree(state,tree),parent=all.get(this.parent??this.selected),components=parent?this.originalGroups(state,parent):[];
  if(code==='Enter')return 'practice';
  if(code==='ArrowRight'&&components.length){const i=components.findIndex(c=>c.id===this.component);this.parent=parent!.id;this.component=components[(i+1)%components.length].id;return 'handled';}
  if(code==='ArrowLeft'&&this.component){this.component=undefined;return 'handled';}
  if(code==='ArrowUp'||code==='ArrowDown'){const list=this.component?components:rows,id=this.component??this.selected,i=Math.max(0,list.findIndex(c=>c.id===id)),next=list[Math.max(0,Math.min(list.length-1,i+(code==='ArrowUp'?-1:1)))];if(next)this.selectFromTree(next.id,!!this.component,tree);return 'handled';}
  if(code==='ArrowLeft'||code==='ArrowRight')return 'handled';
 }
 render(root:HTMLElement,state:PracticeState,passage:(bars:number[])=>SVGSVGElement,focus=false){
  const lists=[...root.querySelectorAll<HTMLElement>('.practice-browser>.practice-chunks')],scrolls=lists.map(el=>el.scrollTop),active=document.activeElement as HTMLElement,previous=active?.closest<HTMLElement>('[data-passage-id]'),previousId=previous?.dataset.passageId,previousComponent=previous?.dataset.component;
  const digits=String(this.plan.barTicks.length-1).length;root.style.setProperty('--practice-list-width',`max(136px, calc(${2*digits+9}ch + 20px))`);
  // One lexical tree per synchronous operation; public entry points remain fresh.
  const tree=this.tree(state),rows=this.rowsFromTree(state,tree);if(!rows.some(c=>c.id===this.selected)){const old=tree.all.get(this.selected),enclosing=rows.find(c=>old&&c.firstBar<=old.firstBar&&c.lastBar>=old.lastBar);this.selectFromTree(enclosing?.id??rows[0]?.id??'',false,tree);}
  const {all}=tree,parent=all.get(this.parent??this.selected),components=parent?this.originalGroups(state,parent):[],current=this.currentFromTree(tree),{completed,unfinished}=this.groupsFromTree(state,tree);
  const row=(c:PracticeChunk,child=false)=>{
   const best=measuredRate(state,c.pattern,c.id),claims=manualRates(state,{passage:c.id,pattern:c.pattern}),percent=practicePercent(this.progress(c,state)),bestLabel=best?`Best ${attainmentLabel(best,state.target)}`:'',doneLabel=claims.length?`Done ${attainmentLabel(Math.max(...claims),state.target)}`:'',evidence=[bestLabel,doneLabel].filter(Boolean).join(' · ');
   return `<button data-practice="${child?'component':'select'}:${c.id}" data-passage-id="${c.id}" data-component="${child}" tabindex="${(child?this.component===c.id:!this.component&&this.selected===c.id)?0:-1}" aria-current="${(child?current?.id===c.id:this.selected===c.id)}" aria-label="Measures ${practiceMeasureRange(c.id)}, ${percent}%${evidence?`, ${evidence}`:''}${c.components?', components available':''}"><span class="practice-range">${practiceMeasureRange(c.id)}</span><span>${percent}%</span></button>`;
  };
  root.innerHTML=`<div class="practice-overall"><span>Total progress · <strong>${practicePercent(displayedPracticeTotal(this.plan,state,this.includeManual))}%</strong></span><label><input type="checkbox" data-practice-display="manual" ${this.includeManual?'checked':''}> Include manual</label></div><div class="practice-browser"><div class="practice-chunks" aria-label="Practice passages">${completed.length?`<section class="practice-completed" aria-label="Joined and learned passages">${completed.map(c=>row(c)).join('')}</section>`:''}<section class="practice-unfinished" aria-label="Unfinished passages">${unfinished.map(c=>row(c)).join('')}</section></div><div class="practice-components practice-chunks" aria-label="Original groups of measures ${practiceMeasureRange(parent?.id??'')}">${components.map(c=>row(c,true)).join('')}</div><aside class="practice-passage-detail" aria-label="Selected passage"><p>Measures ${practiceMeasureRange(current?.id??'')} · ${current?practicePercent(this.progress(current,state)):0}%</p><button class="practice-start" data-practice="passage:${current?.id??''}">Practice ${current?.components?'whole range':'these measures'} <kbd>Enter</kbd></button><div class="practice-leaf-preview"${current?.components?' hidden':''}></div></aside></div>`;
  if(current&&!current.components){const preview=root.querySelector('.practice-leaf-preview')!;preview.setAttribute('aria-label',`Score preview, measures ${practiceMeasureRange(current.id)}`);try{preview.append(passage(Array.from({length:current.lastBar-current.firstBar+1},(_,i)=>current.firstBar+i)));}catch(error){const message=document.createElement('p');message.className='practice-render-error';message.textContent=`Measures ${practiceMeasureRange(current.id)}: ${(error as Error).message}`;preview.append(message);}}
  fitLeafPreview(root.querySelector<HTMLElement>('.practice-leaf-preview')!);
  const updated=[...root.querySelectorAll<HTMLElement>('.practice-browser>.practice-chunks')];updated.forEach((el,i)=>{if(el.scrollHeight>el.clientHeight){const height=[...el.querySelectorAll<HTMLElement>('button')].at(-1)?.offsetHeight??0;el.style.paddingBottom=`${Math.max(0,el.clientHeight-height)}px`;}el.scrollTop=scrolls[i]??0;});
  if(focus){const target=root.querySelector<HTMLElement>(`[data-passage-id="${this.component??this.selected}"][data-component="${!!this.component}"]`);if(target){target.focus({preventScroll:true});const list=target.closest<HTMLElement>('.practice-chunks')!,bounds=(el:HTMLElement)=>{let top=0;for(let node:HTMLElement|null=el;node&&node!==list;node=node.offsetParent as HTMLElement|null)top+=node.offsetTop;return {top,bottom:top+el.offsetHeight};},prior=previousId?list.querySelector<HTMLElement>(`[data-passage-id="${previousId}"][data-component="${previousComponent}"]`):null;list.scrollTop=practiceListScrollTop(list.scrollTop,list.clientHeight,list.scrollHeight-list.clientHeight,bounds(target),prior?bounds(prior):undefined);}}
 }
}
