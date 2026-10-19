import type {ScorePackage,Seat} from './package';
import {fingerFor,type PersonalState} from './state';
import type {FingerPresentation} from './input';
import {annotationPositions,paintFinger} from './fingering-presentation';
import {editUnits} from './selection';
import {cropMeasure,composePassage,passageTrack,fitPassageRelations,fitPassageFrame,type Crop} from './practice-passage';
import {projectRelations} from './practice-relations';
import type {PracticeChunk,PracticePlan} from './practice';

const ns='http://www.w3.org/2000/svg';
/** Jump labels, home row first. L and R always choose a hand, so neither is a label. */
const LETTERS='asdfghjkqwetyuiopzxcvbnm';
const handOf=(p:Pick<ScorePackage,'score'>)=>{const notes=new Map(p.score.notes.map(n=>[n.id,n.hand]));return (s:Seat)=>notes.get(s.ownerIds[0]);};

/** The section's notes in fingering order: the whole right hand left to right,
 * then the whole left hand, each chord bottom to top. */
export function sectionUnits(p:Pick<ScorePackage,'score'|'seats'>,chunk:Pick<PracticeChunk,'firstBar'|'lastBar'>):Seat[]{
 const hand=handOf(p),rank=(s:Seat)=>{const h=hand(s);return h==='RH'?0:h==='LH'?1:2;};
 return editUnits(p).filter(s=>s.writtenBar-1>=chunk.firstBar&&s.writtenBar-1<=chunk.lastBar).map((s,i)=>({s,i})).sort((a,b)=>rank(a.s)-rank(b.s)||a.i-b.i).map(({s})=>s);
}
/** The window around the cursor's measure: the previous, current and next
 * measures, with the two beyond them ghosted. Zero-based bars. */
export function fingeringWindow(barCount:number,bar:number):{bars:number[];ghosts:Set<number>}{
 const bars:number[]=[];for(let b=Math.max(0,bar-2);b<=Math.min(barCount-1,bar+2);b++)bars.push(b);
 return {bars,ghosts:new Set(bars.filter(b=>Math.abs(b-bar)===2))};
}
/** Labels for n targets, all of one length: single letters while they
 * suffice, otherwise pairs, and so on. */
export function jumpLabels(n:number):string[]{
 let length=1;while(LETTERS.length**length<n)length++;
 return Array.from({length:n},(_,i)=>{let label='';for(let k=0,rest=i;k<length;k++,rest=Math.floor(rest/LETTERS.length))label=LETTERS[rest%LETTERS.length]+label;return label;});
}

export interface SectionFingeringOptions {
 package:ScorePackage;basePackage:ScorePackage;plan:PracticePlan;
 personal:()=>PersonalState;presentation:()=>FingerPresentation;
 save:(seat:Seat,finger:number)=>Promise<unknown>;saveHand?:(seat:Seat,hand:'LH'|'RH')=>Promise<unknown>;
 /** The note to start on, as left when practice was rebuilt. */
 start?:string;status:(message:string)=>void;
}
interface FingeringWindow {bar:number;svg:SVGSVGElement;crops:Crop[]}
/** Finger one section, one hand at a time, from the keyboard. Nothing is
 * played or checked. The view slides with the cursor; any note in reach can
 * be targeted directly with a jump label. */
export class SectionFingering {
 readonly units:Seat[];private cursor?:Seat;private readonly positions;private readonly hand;
 private readonly windows=new Map<number,FingeringWindow>();private readonly cropCache=new Map<number,Crop>();private shown?:FingeringWindow;
 private labels?:{targets:Map<string,Seat>;typed:string};private fitted='';
 constructor(readonly mount:HTMLElement,readonly chunk:PracticeChunk,readonly options:SectionFingeringOptions){
  this.positions=annotationPositions(options.package);this.hand=handOf(options.package);
  this.units=sectionUnits(options.package,chunk);
  // Resume at the first note still without a finger.
  this.cursor=options.start&&options.package.seats.find(s=>s.contactId===options.start)||this.units.find(s=>fingerFor(options.basePackage,options.personal(),s)===undefined)||this.units[0];
  mount.addEventListener('click',this.click);
 }
 dispose(){this.mount.removeEventListener('click',this.click);this.mount.replaceChildren();this.windows.clear();this.cropCache.clear();}
 /** Footer hints for the fingering keys. */
 static hints(){return `<span class="options-nav-hint section-fingering-keys"><span><kbd>1–5</kbd> Finger</span><span><kbd>←→</kbd> Note</span><span><kbd>↑↓</kbd> Right, left hand</span><span><kbd>L</kbd>/<kbd>R</kbd> Choose hand</span><span><kbd>J</kbd> Jump to a note</span><span><kbd>Backspace</kbd> Back one</span></span>`;}
 private click=(e:MouseEvent)=>{
  const el=(e.target as Element).closest<SVGElement>('[data-viewer-seat],[data-finger-seat]');if(!el||!this.shown)return;
  const id=el.dataset.viewerSeat??el.dataset.fingerSeat,seat=this.shown.crops.flatMap(c=>c.seats).find(s=>s.id===id);
  if(seat)this.go(seat);
 };
 private crop(bar:number){let crop=this.cropCache.get(bar);if(!crop){crop=cropMeasure(this.options.package,this.options.plan,bar);this.cropCache.set(bar,crop);}return crop;}
 private window(bar:number):FingeringWindow{
  const cached=this.windows.get(bar);if(cached)return cached;
  const p=this.options.package,plan=this.options.plan,{bars,ghosts}=fingeringWindow(plan.barTicks.length,bar),crops=bars.map(b=>this.crop(b));
  const track=fitPassageFrame(p,plan,crops,fitPassageRelations(p,plan,crops,passageTrack(crops,this.mount,p,true),'compact',[bars]),'compact',[bars],this.mount);
  const passage=composePassage(crops,track,'compact',bars,projectRelations(p,plan,crops,track,'compact',bars));
  for(const b of bars){const group=passage.svg.querySelector(`[data-practice-bar="${b+1}"]`);group?.classList.toggle('section-fingering-ghost',ghosts.has(b));group?.classList.toggle('section-fingering-outside',!ghosts.has(b)&&(b<this.chunk.firstBar||b>this.chunk.lastBar));}
  // Veil each ghost above all ink, so its slurs, pedal lines and both of its
  // rules fade with it.
  const view=passage.svg.getAttribute('viewBox')!.split(' ').map(Number);
  for(const crop of crops)if(ghosts.has(crop.bar)){
   const group=passage.svg.querySelector(`[data-practice-bar="${crop.bar+1}"]`),shift=Number(/translate\(([-\d.e]+)/.exec(group?.getAttribute('transform')??'')?.[1]);if(!Number.isFinite(shift))continue;
   const left=shift+crop.left,right=shift+crop.right,veil=document.createElementNS(ns,'rect'),x0=crop.bar<bar?view[0]:left-1,x1=crop.bar<bar?right+1:view[0]+view[2];
   veil.setAttribute('class','section-fingering-veil');veil.setAttribute('x',String(x0));veil.setAttribute('y',String(view[1]));veil.setAttribute('width',String(x1-x0));veil.setAttribute('height',String(view[3]));passage.svg.append(veil);
  }
  const made={bar,svg:passage.svg,crops:passage.crops.filter(c=>!ghosts.has(c.bar))};this.windows.set(bar,made);return made;
 }
 /** Recompose for a new stage size or rotation; otherwise only repaint, so
  * saving a finger never pays for layout. */
 refit(){
  const size=`${this.mount.clientWidth}x${this.mount.clientHeight}`;
  if(this.fitted&&size!==this.fitted){this.windows.clear();this.shown=undefined;this.mount.replaceChildren();this.render();}else this.paint();
 }
 render(){
  const bar=(this.cursor?.writtenBar??this.chunk.firstBar+1)-1,next=this.window(bar);
  if(this.shown!==next){this.mount.replaceChildren(next.svg);this.shown=next;}
  this.fitted=`${this.mount.clientWidth}x${this.mount.clientHeight}`;
  this.paint();this.announce();
 }
 /** Paint every finger in reach; the cursor carries the editor's selection mark. */
 paint(){
  if(!this.shown)return;
  const personal=this.options.personal(),presentation=this.options.presentation();
  for(const crop of this.shown.crops)for(const seat of crop.seats){
   const text=crop.svg.querySelector<SVGTextElement>(`[data-viewer-seat="${CSS.escape(seat.id)}"]`);if(!text)continue;
   const finger=fingerFor(this.options.basePackage,personal,seat);
   paintFinger(text,seat,{visible:finger!==undefined,presentation,finger,position:this.positions.get(seat.id)!,interactive:true,label:`Pitch ${seat.pitchDigit}, ${finger===undefined?'no finger':`finger ${finger}`}, ${this.hand(seat)??'no hand'}, bar ${seat.writtenBar}`});
   if(this.cursor&&seat.contactId===this.cursor.contactId)text.setAttribute('data-edit-selected','true');else text.removeAttribute('data-edit-selected');
  }
  this.paintLabels();
 }
 private paintLabels(){
  this.mount.querySelectorAll('.section-fingering-label').forEach(el=>el.remove());
  if(!this.labels||!this.shown)return;
  for(const [label,seat] of this.labels.targets){
   if(!label.startsWith(this.labels.typed))continue;
   const text=this.shown.crops.map(c=>c.svg.querySelector<SVGTextElement>(`[data-viewer-seat="${CSS.escape(seat.id)}"]`)).find(Boolean);if(!text)continue;
   const box=text.getBBox(),size=box.height*.5,width=size*.68*label.length+size*.5,g=document.createElementNS(ns,'g'),rect=document.createElementNS(ns,'rect'),t=document.createElementNS(ns,'text');
   g.setAttribute('class','section-fingering-label');g.setAttribute('aria-hidden','true');g.setAttribute('data-jump-label',label);g.setAttribute('data-jump-seat',seat.id);
   const x=box.x-width-size*.15,y=box.y+box.height/2-size*.62;
   rect.setAttribute('x',String(x));rect.setAttribute('y',String(y));rect.setAttribute('width',String(width));rect.setAttribute('height',String(size*1.24));rect.setAttribute('rx',String(size*.35));
   t.setAttribute('x',String(x+width/2));t.setAttribute('y',String(y+size*.95));t.setAttribute('font-size',String(size));t.setAttribute('text-anchor','middle');t.textContent=label.toUpperCase();
   g.append(rect,t);text.parentNode!.appendChild(g);
  }
 }
 get cursorContact(){return this.cursor?.contactId;}
 private index(){return this.cursor?this.units.findIndex(s=>s.contactId===this.cursor!.contactId):-1;}
 private go(seat:Seat|undefined){if(!seat)return;this.cursor=seat;this.labels=undefined;this.render();}
 private move(step:number){const i=this.index();this.go(i<0?(step>0?this.units[0]:this.units.at(-1)):this.units[Math.max(0,Math.min(this.units.length-1,i+step))]);}
 /** The other hand's note nearest the cursor: up to the right hand, down to
 * the left, as the score's arrows move between hand rows. */
 private hands(direction:-1|1){
  const c=this.cursor;if(!c||!this.shown)return;
  const rank=(s:Seat)=>{const h=this.hand(s);return h==='RH'?0:h==='LH'?1:2;},target=rank(c)+direction;
  const row=this.shown.crops.flatMap(crop=>crop.seats).filter(s=>rank(s)===target);
  return row.sort((a,b)=>Math.abs(a.x-c.x)-Math.abs(b.x-c.x)||a.writtenBar-b.writtenBar)[0];
 }
 private startLabels(){
  if(!this.shown||!this.cursor)return;
  // Only the cursor's hand: about half as many labels, each shorter to reach.
  const hand=this.hand(this.cursor),seats=this.shown.crops.flatMap(c=>c.seats).filter((s,i,all)=>this.hand(s)===hand&&all.findIndex(o=>o.contactId===s.contactId)===i).sort((a,b)=>a.writtenBar-b.writtenBar||a.x-b.x||b.baseline-a.baseline);
  const labels=jumpLabels(seats.length);this.labels={targets:new Map(seats.map((s,i)=>[labels[i],s])),typed:''};this.paintLabels();
  this.options.status(`${hand==='RH'?'Right hand':hand==='LH'?'Left hand':'Notes'} · type the letter beside a note to move there · ↑↓ other hand · Esc cancels`);
 }
 private label(code:string){
  const labels=this.labels!,letter=/^Key([A-Z])$/.exec(code)?.[1].toLowerCase();
  const typed=labels.typed+(letter??''),matches=letter?[...labels.targets.keys()].filter(l=>l.startsWith(typed)):[];
  if(!matches.length){this.labels=undefined;this.paintLabels();this.announce();return;}
  if(matches.length===1&&matches[0]===typed){this.go(labels.targets.get(typed));return;}
  labels.typed=typed;this.paintLabels();
 }
 private announce(){
  const i=this.index(),seat=this.cursor;
  if(!seat){this.options.status('This section has no notes to finger.');return;}
  const hand=this.hand(seat)==='RH'?'Right hand':this.hand(seat)==='LH'?'Left hand':'No hand',
   missing=this.units.filter(s=>fingerFor(this.options.basePackage,this.options.personal(),s)===undefined).length;
  this.options.status(`${hand} · measure ${seat.writtenBar}${i<0?' · outside this section':` · note ${i+1} of ${this.units.length}`} · ${missing?`${missing} without a finger`:'every note fingered'}`);
 }
 private async choose(finger:number){
  const seat=this.cursor;if(!seat)return;
  const i=this.index();
  // Move on at once; the finger paints when it is saved. A correction
  // outside the section keeps its place.
  if(i>=0&&i<this.units.length-1)this.cursor=this.units[i+1];
  this.render();
  try{await this.options.save(seat,finger);}catch(error){this.go(seat);this.options.status(`Finger ${finger} was not saved: ${error instanceof Error?error.message:String(error)}`);return;}
  this.announce();
 }
 key(code:string,shift=false):boolean{
  if(this.labels){
   if(code==='ArrowUp'||code==='ArrowDown'){const seat=this.hands(code==='ArrowUp'?-1:1);if(seat){this.cursor=seat;this.paint();this.startLabels();}return true;}
   if(code==='Escape'){this.labels=undefined;this.paintLabels();this.announce();return true;}
   if(LETTERS.includes(/^Key([A-Z])$/.exec(code)?.[1].toLowerCase()??'-')){this.label(code);return true;}
   // Any other key puts the labels away and does its ordinary work.
   this.labels=undefined;this.paintLabels();
  }
  const digit=/^(?:Digit|Numpad)([1-5])$/.exec(code);
  if(digit){void this.choose(Number(digit[1]));return true;}
  if(code==='ArrowRight'||code==='Tab'&&!shift){this.move(1);return true;}
  if(code==='ArrowLeft'||code==='Backspace'||code==='Tab'&&shift){this.move(-1);return true;}
  if(code==='ArrowUp'||code==='ArrowDown'){this.go(this.hands(code==='ArrowUp'?-1:1));return true;}
  // L and R choose the note's hand, as in the score; the cursor stays put.
  if((code==='KeyL'||code==='KeyR')&&this.cursor&&this.options.saveHand){const seat=this.cursor,hand=code==='KeyL'?'LH':'RH';void this.options.saveHand(seat,hand).catch(error=>this.options.status(`The hand was not saved: ${error instanceof Error?error.message:String(error)}`));return true;}
  if(code==='KeyJ'){this.startLabels();return true;}
  if(code==='Home'){this.go(this.units[0]);return true;}
  if(code==='End'){this.go(this.units.at(-1));return true;}
  return false;
 }
}
