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
/** The whole piece in fingering order, one practice section at a time (the
 * sections stay unseen): each section's right hand, then its left hand. */
export function pieceUnits(p:Pick<ScorePackage,'score'|'seats'>,plan:Pick<PracticePlan,'chunks'|'barTicks'>):Seat[]{
 const bars=plan.barTicks.length-1,spans:{firstBar:number;lastBar:number}[]=[];let next=0;
 for(const c of [...plan.chunks].filter(c=>!c.components?.length&&c.kind!=='contrast').sort((a,b)=>a.firstBar-b.firstBar||a.lastBar-b.lastBar))if(c.firstBar===next&&c.lastBar<bars){spans.push(c);next=c.lastBar+1;}
 // Measures the sections leave out are one more run.
 if(next<bars)spans.push({firstBar:next,lastBar:bars-1});
 return spans.flatMap(span=>sectionUnits(p,span));
}
/** Where each score's fingering was left, for reopening during this run of the viewer. */
const resumeAt=new Map<string,string>();
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
/** Finger the whole piece from the keyboard, one hand of one section at a
 * time. Nothing is played or checked. It opens on the first note without a
 * finger, or where it was left; each finger moves on to the next note without
 * one. The view slides with the cursor; any note in reach can be targeted
 * directly with a jump label. */
export class SectionFingering {
 readonly units:Seat[];readonly chunk:{firstBar:number;lastBar:number};private cursor?:Seat;private readonly positions;private readonly hand;private readonly resumeKey:string;
 private readonly windows=new Map<number,FingeringWindow>();private readonly cropCache=new Map<number,Crop>();private shown?:FingeringWindow;
 private labels?:{targets:Map<string,Seat>;typed:string};private fitted='';private disposed=false;
 private missing?:{personal:PersonalState;count:number};
 constructor(readonly mount:HTMLElement,readonly options:SectionFingeringOptions){
  this.positions=annotationPositions(options.package);this.hand=handOf(options.package);
  this.chunk={firstBar:0,lastBar:this.barCount-1};this.units=pieceUnits(options.package,options.plan);
  this.resumeKey=options.plan.sourcePracticeIdentity??options.package.manifest.metadata.title;
  // A rebuilt practice keeps its exact note; reopening goes to the first gap
  // from where fingering was left, else the first in the piece.
  const left=this.units.findIndex(s=>s.contactId===resumeAt.get(this.resumeKey));
  this.cursor=options.start&&options.package.seats.find(s=>s.contactId===options.start)||this.gap(Math.max(0,left),1,true)||this.units[0];
  mount.addEventListener('click',this.click);
 }
 /** The next note without a finger from index i in the given direction,
  * wrapping round the piece; i itself counts only when inclusive. */
 private gap(i:number,step:1|-1,inclusive=false,except?:string){
  const personal=this.options.personal(),n=this.units.length;
  for(let k=inclusive?0:1;k<=n;k++){const seat=this.units[((i+step*k)%n+n)%n];if(seat&&seat.contactId!==except&&fingerFor(this.options.basePackage,personal,seat)===undefined)return seat;}
  return undefined;
 }
 dispose(){this.disposed=true;this.mount.removeEventListener('click',this.click);this.mount.replaceChildren();this.windows.clear();this.cropCache.clear();}
 /** Footer hints for the fingering keys. */
 static hints(){return `<span class="options-nav-hint section-fingering-keys"><span><kbd>1–5</kbd> Finger</span><span><kbd>Tab</kbd> Next without a finger</span><span><kbd>←→</kbd> Previous, next note</span><span><kbd>↑↓</kbd> Right, left hand</span><span><kbd>L</kbd><kbd>R</kbd> Set the note's hand</span><span><kbd>J</kbd> Jump to a note</span></span>`;}
 private click=(e:MouseEvent)=>{
  const el=(e.target as Element).closest<SVGElement>('[data-viewer-seat],[data-finger-seat]');if(!el||!this.shown)return;
  const id=el.dataset.viewerSeat??el.dataset.fingerSeat,seat=this.shown.crops.flatMap(c=>c.seats).find(s=>s.id===id);
  if(seat)this.go(seat);
 };
 /** Measures in the score; the plan's bar ticks also hold the closing boundary. */
 private get barCount(){return this.options.plan.barTicks.length-1;}
 get labelling(){return !!this.labels;}
 private crop(bar:number){let crop=this.cropCache.get(bar);if(!crop){crop=cropMeasure(this.options.package,this.options.plan,bar);this.cropCache.set(bar,crop);}return crop;}
 private window(bar:number):FingeringWindow{
  const cached=this.windows.get(bar);if(cached)return cached;
  const p=this.options.package,plan=this.options.plan,{bars,ghosts}=fingeringWindow(this.barCount,bar),crops=bars.map(b=>this.crop(b));
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
  const made={bar,svg:passage.svg,crops:passage.crops.filter(c=>!ghosts.has(c.bar))};this.windows.set(bar,made);
  // Keep a handful of windows; layout is cheap to redo, memory on a long score is not.
  for(const key of this.windows.keys()){if(this.windows.size<=6)break;if(key!==bar&&key!==this.shown?.bar)this.windows.delete(key);}
  return made;
 }
 /** Recompose for a new stage size or rotation; otherwise only repaint, so
  * saving a finger never pays for layout. */
 refit(){
  const size=`${this.mount.clientWidth}x${this.mount.clientHeight}`;
  if(this.fitted&&size!==this.fitted){this.windows.clear();this.shown=undefined;this.mount.replaceChildren();this.render();}else this.paint();
 }
 render(){
  const bar=(this.cursor?.writtenBar??1)-1;if(this.cursor)resumeAt.set(this.resumeKey,this.cursor.contactId);
  let next:FingeringWindow;
  // A measure that cannot be drawn says so on the stage, never a blank page.
  try{next=this.window(bar);}catch(error){this.shown=undefined;const message=document.createElement('p');message.className='section-fingering-error';message.textContent=`Measure ${bar+1} cannot be drawn for fingering: ${error instanceof Error?error.message:String(error)}`;this.mount.replaceChildren(message);this.options.status('Use ← → to move to another measure.');return;}
  if(this.shown!==next){this.mount.replaceChildren(next.svg);this.shown=next;}
  this.fitted=`${this.mount.clientWidth}x${this.mount.clientHeight}`;
  this.paint();this.announce();this.prefetch(bar);
 }
 /** Compose the neighbouring windows while idle, so crossing a measure on a
  * slow computer does not wait for layout. */
 private prefetch(bar:number){
  const later=(f:()=>void)=>typeof requestIdleCallback==='function'?requestIdleCallback(f,{timeout:400}):setTimeout(f,60);
  for(const next of [bar+1,bar-1])if(next>=0&&next<this.barCount&&!this.windows.has(next))later(()=>{if(!this.disposed&&this.shown?.bar===bar&&!this.windows.has(next))try{this.window(next);}catch{/* composed again, with its error, when reached */}});
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
 /** Jump labels sit in one layer above the passage: never clipped by a
  * measure, never faded with a context measure. */
 private paintLabels(){
  this.mount.querySelectorAll('.section-fingering-labels').forEach(el=>el.remove());
  if(!this.labels||!this.shown)return;
  const root=this.shown.svg,inverse=root.getScreenCTM()?.inverse();if(!inverse)return;
  const layer=document.createElementNS(ns,'g');layer.setAttribute('class','section-fingering-labels');layer.setAttribute('aria-hidden','true');
  for(const [label,seat] of this.labels.targets){
   if(!label.startsWith(this.labels.typed))continue;
   const text=this.shown.crops.map(c=>c.svg.querySelector<SVGTextElement>(`[data-viewer-seat="${CSS.escape(seat.id)}"]`)).find(Boolean),matrix=text?.getScreenCTM();if(!text||!matrix)continue;
   const b=text.getBBox(),to=inverse.multiply(matrix),a=new DOMPoint(b.x,b.y).matrixTransform(to),z=new DOMPoint(b.x+b.width,b.y+b.height).matrixTransform(to);
   const height=z.y-a.y,size=height*.5,width=size*.68*label.length+size*.5,x=a.x-width-size*.15,y=a.y+height/2-size*.62;
   const g=document.createElementNS(ns,'g'),rect=document.createElementNS(ns,'rect'),t=document.createElementNS(ns,'text');
   g.setAttribute('class','section-fingering-label');g.setAttribute('data-jump-label',label);g.setAttribute('data-jump-seat',seat.id);
   rect.setAttribute('x',String(x));rect.setAttribute('y',String(y));rect.setAttribute('width',String(width));rect.setAttribute('height',String(size*1.24));rect.setAttribute('rx',String(size*.35));
   t.setAttribute('x',String(x+width/2));t.setAttribute('y',String(y+size*.95));t.setAttribute('font-size',String(size));t.setAttribute('text-anchor','middle');t.textContent=label.toUpperCase();
   g.append(rect,t);layer.append(g);
  }
  root.append(layer);
 }
 get cursorContact(){return this.cursor?.contactId;}
 private index(){return this.cursor?this.units.findIndex(s=>s.contactId===this.cursor!.contactId):-1;}
 private go(seat:Seat|undefined){if(!seat)return;this.cursor=seat;this.labels=undefined;this.render();}
 private move(step:number){
  const i=this.index();
  if(i>=0){this.go(this.units[Math.max(0,Math.min(this.units.length-1,i+step))]);return;}
  // From a context measure, re-enter the section at its nearer edge, in the same hand.
  const c=this.cursor;if(!c)return;const same=this.units.filter(s=>this.hand(s)===this.hand(c)),pool=same.length?same:this.units;
  this.go(c.writtenBar-1<this.chunk.firstBar?pool[0]:pool.at(-1));
 }
 /** The other hand's note nearest the cursor: up to the right hand, down to
 * the left, as the score's arrows move between hand rows. */
 private hands(direction:-1|1){
  const c=this.cursor;if(!c||!this.shown)return;
  const rank=(s:Seat)=>{const h=this.hand(s);return h==='RH'?0:h==='LH'?1:2;},target=rank(c)+direction;
  // The same measure first (x positions only compare within a system), then
  // the nearest, then pass order so a chord gives its lowest note.
  const order=new Map(this.units.map((s,i)=>[s.contactId,i])),row=this.shown.crops.flatMap(crop=>crop.seats).filter(s=>rank(s)===target);
  const seat=row.sort((a,b)=>Math.abs(a.writtenBar-c.writtenBar)-Math.abs(b.writtenBar-c.writtenBar)||Math.abs(a.x-c.x)-Math.abs(b.x-c.x)||(order.get(a.contactId)??Infinity)-(order.get(b.contactId)??Infinity)||b.baseline-a.baseline)[0];
  if(!seat&&target>=0&&target<=1)this.options.status(`No ${target===0?'right':'left'}-hand notes in reach.`);
  return seat;
 }
 private startLabels(){
  if(!this.shown||!this.cursor)return;
  // Only the cursor's hand: about half as many labels, each shorter to reach.
  const cursor=this.cursor,hand=this.hand(cursor),seats=this.shown.crops.flatMap(c=>c.seats).filter((s,i,all)=>this.hand(s)===hand&&s.contactId!==cursor.contactId&&all.findIndex(o=>o.contactId===s.contactId)===i).sort((a,b)=>a.writtenBar-b.writtenBar||a.x-b.x||b.baseline-a.baseline);
  const labels=jumpLabels(seats.length);this.labels={targets:new Map(seats.map((s,i)=>[labels[i],s])),typed:''};this.paintLabels();
  this.options.status(`${hand==='RH'?'Right hand':hand==='LH'?'Left hand':'Notes without a hand'} · type the letter beside a note to move there · ↑↓ other hand · Esc cancels`);
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
  if(!seat){this.options.status('This piece has no notes to finger.');return;}
  const hand=this.hand(seat)==='RH'?'Right hand':this.hand(seat)==='LH'?'Left hand':'No hand',
   personal=this.options.personal();
  // Counted once per saved state, not on every move.
  if(this.missing?.personal!==personal)this.missing={personal,count:this.units.filter(s=>fingerFor(this.options.basePackage,personal,s)===undefined).length};
  const missing=this.missing.count;
  this.options.status(`${hand} · measure ${seat.writtenBar} of ${this.barCount}${i<0?' · not in the fingering order':''} · ${missing?`${missing} ${missing===1?'note':'notes'} without a finger`:'every note fingered'}`);
 }
 private async choose(finger:number){
  const seat=this.cursor;if(!seat)return;
  const i=this.index();
  // Move on at once to the next note without a finger; the finger paints
  // when it is saved. Once every note has one, the cursor stays.
  if(i>=0)this.cursor=this.gap(i,1,false,seat.contactId)??seat;
  this.render();
  try{await this.options.save(seat,finger);}catch(error){this.go(seat);this.options.status(`Finger ${finger} was not saved: ${error instanceof Error?error.message:String(error)}`);return;}
  this.announce();
 }
 key(code:string,shift=false):boolean{
  if(this.labels){
   if(code==='ArrowUp'||code==='ArrowDown'){const seat=this.hands(code==='ArrowUp'?-1:1);if(seat){this.cursor=seat;this.paint();this.startLabels();}return true;}
   if(code==='Escape'){this.labels=undefined;this.paintLabels();this.announce();return true;}
   if(LETTERS.includes(/^Key([A-Z])$/.exec(code)?.[1].toLowerCase()??'-')){this.label(code);return true;}
   // A modifier alone keeps the labels; any other key puts them away and does its ordinary work.
   if(/^(?:Shift|Control|Alt|Meta)(?:Left|Right)$|^CapsLock$/.test(code))return true;
   this.labels=undefined;this.paintLabels();this.announce();
  }
  const digit=/^(?:Digit|Numpad)([1-5])$/.exec(code);
  if(digit){void this.choose(Number(digit[1]));return true;}
  if(code==='Tab'){const seat=this.gap(Math.max(0,this.index()),shift?-1:1);if(seat)this.go(seat);else this.options.status('Every note has a finger.');return true;}
  if(code==='ArrowRight'){this.move(1);return true;}
  if(code==='ArrowLeft'||code==='Backspace'){this.move(-1);return true;}
  if(code==='ArrowUp'||code==='ArrowDown'){this.go(this.hands(code==='ArrowUp'?-1:1));return true;}
  // L and R choose the note's hand, as in the score; the cursor stays put.
  if((code==='KeyL'||code==='KeyR')&&this.cursor&&this.options.saveHand){const seat=this.cursor,hand=code==='KeyL'?'LH':'RH';void this.options.saveHand(seat,hand).catch(error=>this.options.status(`The hand was not saved: ${error instanceof Error?error.message:String(error)}`));return true;}
  if(code==='KeyJ'){this.startLabels();return true;}
  if(code==='Home'){this.go(this.units[0]);return true;}
  if(code==='End'){this.go(this.units.at(-1));return true;}
  return false;
 }
}
