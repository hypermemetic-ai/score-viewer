import {fitLeafPreview} from './practice-crop-fit';
import {componentsAttained,passageComponents,practicePercent,progressFor,reconcilePassages,totalProgress,wholePracticeProgress,type PracticeChunk,type PracticePlan,type PracticeState} from './practice';
import {attainmentLabel} from './tempo-presentation';

/** Navigation state is separate from assessment; browsing never records a played run. */
export class PracticeBrowser {
 selected:string;parent?:string;component?:string;
 constructor(readonly plan:PracticePlan){this.selected=plan.chunks[0]?.id??'';}
 groups(state:PracticeState){const {frontier,all}=reconcilePassages(this.plan,state),completed:PracticeChunk[]=[];const collect=(c:PracticeChunk)=>{if(componentsAttained(c,state,all))completed.push(c);else for(const id of c.components??[])collect(all.get(id)!);};frontier.forEach(collect);const top=new Set(completed.map(c=>c.id));return {completed:completed.sort((a,b)=>a.firstBar-b.firstBar),unfinished:frontier.filter(c=>!top.has(c.id)).sort((a,b)=>progressFor(b,state)-progressFor(a,state)||a.firstBar-b.firstBar)};}
 rows(state:PracticeState){const {completed,unfinished}=this.groups(state);return [...completed,...unfinished];}
 current(state:PracticeState){const {all}=reconcilePassages(this.plan,state);return all.get(this.component??this.selected);}
 select(state:PracticeState,id:string,component=false){const {all}=reconcilePassages(this.plan,state),chunk=all.get(id);if(!chunk)return;if(component)this.component=id;else{this.selected=id;this.parent=chunk.components?id:undefined;this.component=undefined;}}
 suggest(state:PracticeState,chunk:PracticeChunk){const row=this.rows(state).find(c=>c.firstBar<=chunk.firstBar&&c.lastBar>=chunk.lastBar);if(!row)return;this.select(state,row.id);if(row.id!==chunk.id)this.select(state,chunk.id,true);}
 key(code:string,state:PracticeState):'practice'|'handled'|undefined {
  const {all}=reconcilePassages(this.plan,state),rows=this.rows(state),parent=all.get(this.parent??this.selected),components=parent?.components?passageComponents(this.plan,state,parent):[];
  if(code==='Enter')return 'practice';
  if(code==='ArrowRight'&&components.length){const i=components.findIndex(c=>c.id===this.component);this.parent=parent!.id;this.component=components[(i+1)%components.length].id;return 'handled';}
  if(code==='ArrowLeft'&&this.component){this.component=undefined;return 'handled';}
  if(code==='ArrowUp'||code==='ArrowDown'){const list=this.component?components:rows,id=this.component??this.selected,i=Math.max(0,list.findIndex(c=>c.id===id)),next=list[Math.max(0,Math.min(list.length-1,i+(code==='ArrowUp'?-1:1)))];if(next)this.select(state,next.id,!!this.component);return 'handled';}
  if(code==='ArrowLeft'||code==='ArrowRight')return 'handled';
 }
 render(root:HTMLElement,state:PracticeState,crop:(bar:number)=>SVGSVGElement,focus=false){
  const rows=this.rows(state);if(!rows.some(c=>c.id===this.selected)){const enclosing=rows.find(c=>{const old=reconcilePassages(this.plan,state).all.get(this.selected);return old&&c.firstBar<=old.firstBar&&c.lastBar>=old.lastBar;});this.select(state,enclosing?.id??rows[0]?.id??'');}
  const {all}=reconcilePassages(this.plan,state),parent=all.get(this.parent??this.selected),components=parent?.components?passageComponents(this.plan,state,parent):[],current=this.current(state),{completed,unfinished}=this.groups(state);
  const row=(c:PracticeChunk,child=false)=>{
   const best=state.best[c.pattern]??0,claims=state.manualAttainment?.marks[JSON.stringify([c.id,c.pattern])]??[],evidence=[best?`Best ${attainmentLabel(best,state.target)}`:'',claims.length?`Done ${attainmentLabel(Math.max(...claims),state.target)}`:''].filter(Boolean).join(' · ')||'Not yet completed';
   return `<button data-practice="${child?'component':'select'}:${c.id}" data-passage-id="${c.id}" data-component="${child}" tabindex="${(child?this.component===c.id:!this.component&&this.selected===c.id)?0:-1}" aria-current="${(child?this.component===c.id:this.selected===c.id)}" aria-label="Measures ${c.id}, ${practicePercent(progressFor(c,state))}%, ${evidence}${c.components?', components available':''}"><span>${c.id}${c.components?' <span class="practice-joined" aria-hidden="true">›</span>':''}</span><span>${practicePercent(progressFor(c,state))}%</span><small>${evidence}</small></button>`;
  };
  root.innerHTML=`<p class="practice-overall">Sections learned · <strong>${practicePercent(totalProgress(this.plan,state))}%</strong><span class="practice-whole">Whole piece · ${wholePracticeProgress(this.plan,state)>=1?'goal reached':`${practicePercent(wholePracticeProgress(this.plan,state))}%`}</span></p><div class="practice-browser"><div class="practice-chunks" aria-label="Practice passages">${completed.length?`<section class="practice-completed" aria-label="Joined and learned passages">${completed.map(c=>row(c)).join('')}</section>`:''}<section class="practice-unfinished" aria-label="Unfinished passages">${unfinished.map(c=>row(c)).join('')}</section></div>${components.length?`<div class="practice-components practice-chunks" aria-label="Components of measures ${parent!.id}"><p>${parent!.id} · components</p>${components.map(c=>row(c,true)).join('')}</div>`:''}<aside class="practice-passage-detail" aria-label="Selected passage"><p>Measures ${current?.id??''} · ${current?practicePercent(progressFor(current,state)):0}%</p><button class="practice-start" data-practice="passage:${current?.id??''}">Practice these measures <kbd>Enter</kbd></button><div class="practice-leaf-preview"></div></aside></div>`;
  if(current&&!current.components){const preview=root.querySelector('.practice-leaf-preview')!;preview.setAttribute('aria-label',`Score preview, measures ${current.id}`);for(let bar=current.firstBar;bar<=current.lastBar;bar++){const wrap=document.createElement('div');wrap.className='practice-preview-measure';const label=document.createElement('small');label.textContent=String(bar+1);wrap.append(label,crop(bar));preview.append(wrap);}}
  fitLeafPreview(root.querySelector<HTMLElement>('.practice-leaf-preview')!);
  if(focus)root.querySelector<HTMLElement>(`[data-passage-id="${this.component??this.selected}"][data-component="${!!this.component}"]`)?.focus();
 }
}
