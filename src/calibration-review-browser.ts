import {practiceListScrollTop} from './practice-browser';
import {calibrationEscape as esc} from './calibration-trial-renderer';

/** Presentation supplied by a measurement batch; browsing does not change its evidence. */
export interface CalibrationReviewRow {id:string;groupId:string;groupLabel:string;label:string;detail:string;rating:string}
export interface CalibrationReviewGroup {id:string;label:string;rows:CalibrationReviewRow[]}
export class CalibrationReviewBrowser {
 group='';column:'groups'|'ratings'='groups';private selected=new Map<string,string>();
 private groupScroll=0;private ratingScroll=new Map<string,number>();private paintedGroup='';
 capture(root:HTMLElement){const lists=[...root.querySelectorAll<HTMLElement>('.practice-chunks')];if(lists.length){this.groupScroll=lists[0].scrollTop;this.ratingScroll.set(this.paintedGroup,lists[1].scrollTop);}}
 groups(rows:readonly CalibrationReviewRow[]){
  const groups:CalibrationReviewGroup[]=[],byId=new Map<string,CalibrationReviewGroup>();
  for(const row of rows){let group=byId.get(row.groupId);if(!group){group={id:row.groupId,label:row.groupLabel,rows:[]};byId.set(group.id,group);groups.push(group);}group.rows.push(row);}
  if(!byId.has(this.group))this.group=groups[0]?.id??'';
  for(const group of groups)if(!group.rows.some(row=>row.id===this.selected.get(group.id)))this.selected.set(group.id,group.rows[0]?.id??'');
  return groups;
 }
 current(rows:readonly CalibrationReviewRow[]){return this.groups(rows).find(g=>g.id===this.group)?.rows.find(r=>r.id===this.selected.get(this.group));}
 selectGroup(id:string,rows:readonly CalibrationReviewRow[]){if(this.groups(rows).some(g=>g.id===id)){this.group=id;this.column='groups';}}
 selectRating(id:string,rows:readonly CalibrationReviewRow[]){const group=this.groups(rows).find(g=>g.rows.some(r=>r.id===id));if(group){this.group=group.id;this.selected.set(group.id,id);this.column='ratings';}}
 key(code:string,rows:readonly CalibrationReviewRow[]):'handled'|'open'|undefined {
  const groups=this.groups(rows),group=groups.find(g=>g.id===this.group);if(!group)return;
  if(code==='ArrowLeft'){this.column='groups';return 'handled';}
  if(code==='ArrowRight'||code==='Enter'&&this.column==='groups'){this.column='ratings';return 'handled';}
  if(code==='Enter')return 'open';
  if(code==='ArrowUp'||code==='ArrowDown'){
   const step=code==='ArrowDown'?1:-1;
   if(this.column==='groups'){const at=groups.indexOf(group);this.group=groups[Math.max(0,Math.min(groups.length-1,at+step))].id;}
   else{const at=group.rows.findIndex(r=>r.id===this.selected.get(group.id));this.selected.set(group.id,group.rows[Math.max(0,Math.min(group.rows.length-1,at+step))].id);}
   return 'handled';
  }
 }
 render(root:HTMLElement,rows:readonly CalibrationReviewRow[],disabled:boolean,focus=false){
  const lists=[...root.querySelectorAll<HTMLElement>('.practice-chunks')],previous=root.ownerDocument.activeElement as HTMLElement|null;
  const oldList=previous?.closest<HTMLElement>('.practice-chunks');
  const previousBox=oldList&&previous&&(oldList===lists[0]||this.paintedGroup===this.group)?{list:lists.indexOf(oldList),top:previous.offsetTop,bottom:previous.offsetTop+previous.offsetHeight}:undefined;
  this.capture(root);
  const groups=this.groups(rows),group=groups.find(g=>g.id===this.group),current=this.current(rows);
  root.style.setProperty('--review-list-rows',String(Math.max(groups.length,group?.rows.length??0)));
  root.innerHTML=`<div class="practice-chunks calibration-review-groups" aria-label="Rating groups">${groups.map(g=>`<button type="button" data-review-group="${esc(g.id)}" aria-current="${g.id===this.group}" tabindex="${this.column==='groups'&&g.id===this.group?0:-1}"${disabled?' disabled':''}><span>${esc(g.label)}</span><span class="calibration-review-count">${g.rows.length}</span></button>`).join('')}</div><div class="practice-chunks calibration-review-entries" aria-label="Ratings in selected group">${(group?.rows??[]).map(r=>`<button type="button" data-review="${esc(r.id)}" aria-current="${this.column==='ratings'&&r.id===current?.id}" tabindex="${this.column==='ratings'&&r.id===current?.id?0:-1}"${disabled?' disabled':''}><span>${esc(r.label)}</span><span class="calibration-review-result">${esc(r.rating)}</span><small>${esc(r.detail)}</small></button>`).join('')}</div>`;
  const updated=[...root.querySelectorAll<HTMLElement>('.practice-chunks')];updated.forEach((list,i)=>{list.scrollTop=i?this.ratingScroll.get(this.group)??0:this.groupScroll;});this.paintedGroup=this.group;
  if(!focus||disabled)return;
  this.focus(root,previousBox);
 }
 focus(root:HTMLElement,previousBox?:{list:number;top:number;bottom:number}){
  const updated=[...root.querySelectorAll<HTMLElement>('.practice-chunks')],target=root.querySelector<HTMLButtonElement>('button[tabindex="0"]:not(:disabled)');
  if(!target)return;target.focus({preventScroll:true});
  const list=target.closest<HTMLElement>('.practice-chunks')!,index=updated.indexOf(list);
  list.scrollTop=practiceListScrollTop(list.scrollTop,list.clientHeight,list.scrollHeight-list.clientHeight,{top:target.offsetTop,bottom:target.offsetTop+target.offsetHeight},previousBox?.list===index?previousBox:undefined);
  this.capture(root);
 }
}
