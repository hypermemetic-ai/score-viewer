import type {ScorePackage,Seat} from './package';
import {fingerFor,type PersonalState} from './state';
import type {FingerPresentation} from './input';
import {annotationPositions,paintFinger} from './fingering-presentation';
import {editUnits} from './selection';
import {cropMeasure,measureBounds,composePassage,passageTrack,fitPassageRelations,type Crop} from './practice-passage';
import {projectRelations} from './practice-relations';
import type {PracticePlan} from './practice';

const ns='http://www.w3.org/2000/svg';
/** Jump labels, home row first. L and R always choose a hand, so neither is a label. */
const LETTERS='asdfghjkqwetyuiopzxcvbnm';
const handOf=(p:Pick<ScorePackage,'score'>)=>{const notes=new Map(p.score.notes.map(n=>[n.id,n.hand]));return (s:Seat)=>notes.get(s.ownerIds[0]);};

/** The whole piece in fingering order, a measure at a time: each measure's
 * right hand, then its left hand, each in the editor's order. */
export function pieceUnits(p:Pick<ScorePackage,'score'|'seats'>):Seat[]{
 const hand=handOf(p),rank=(s:Seat)=>{const h=hand(s);return h==='RH'?0:h==='LH'?1:2;};
 return editUnits(p).map((s,i)=>({s,i})).sort((a,b)=>a.s.writtenBar-b.s.writtenBar||rank(a.s)-rank(b.s)||a.i-b.i).map(({s})=>s);
}
export interface FingeringProgress {done:number;total:number;hands:{RH:{done:number;total:number};LH:{done:number;total:number}}}
/** How much of the piece carries a finger, overall and for each hand. */
export function fingeringProgress(units:readonly Seat[],fingered:(s:Seat)=>boolean,hand:(s:Seat)=>string|undefined):FingeringProgress {
 const result:FingeringProgress={done:0,total:units.length,hands:{RH:{done:0,total:0},LH:{done:0,total:0}}};
 for(const s of units){const done=fingered(s),h=hand(s);if(done)result.done++;if(h==='RH'||h==='LH'){result.hands[h].total++;if(done)result.hands[h].done++;}}
 return result;
}
/** Whole percent, never rounded up to 100 before every note is done. */
export const percent=(done:number,total:number)=>total?Math.min(Math.round(done/total*100),done<total?99:100):100;
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
 start?:string;
 /** Where each hand was left when practice was last built. */
 marks?:Readonly<Record<string,string>>;status:(message:string)=>void;
 /** Called whenever the share of fingered notes may have changed. */
 progress?:(progress:FingeringProgress)=>void;
}
/** A composed window: each measure's displayed interval, and the staff's
 * middle and the ink's vertical reach, all in the passage's own units. */
interface FingeringWindow {bar:number;svg:SVGSVGElement;crops:Crop[];spans:Map<number,[number,number]>;middle:number;top:number;bottom:number}
/** Finger the whole piece from the keyboard. Nothing is played or checked,
 * and nothing is enforced: any note can be visited and any can stay without a
 * finger. It opens at the first note without a finger. Each hand is fingered
 * on its own: a finger, Tab and ← → move on through the same hand from measure
 * to measure, and ↑ ↓ change hands, returning to where that hand was left.
 * The current measure is always centred, with its neighbours either side and
 * the two beyond them ghosted. */
export class SectionFingering {
 readonly units:Seat[];private cursor?:Seat;private readonly positions;private readonly hand;
 /** Where each hand was left, by note; the cursor's own hand is the cursor. */
 private readonly marks:Map<string,string>;
 private readonly windows=new Map<number,FingeringWindow>();private readonly cropCache=new Map<number,Crop>();private shown?:FingeringWindow;
 private labels?:{targets:Map<string,Seat>;typed:string};private fitted='';private disposed=false;private scale?:number;private half?:number;private resize:ResizeObserver;
 private counted?:{personal:PersonalState;progress:FingeringProgress};
 constructor(readonly mount:HTMLElement,readonly options:SectionFingeringOptions){
  this.positions=annotationPositions(options.package);this.hand=handOf(options.package);
  this.units=pieceUnits(options.package);
  // A rebuilt practice keeps its exact note; otherwise start at the first
  // note without a finger, which is the beginning for an unfingered piece.
  const kept=options.start?options.package.seats.find(s=>s.contactId===options.start):undefined;
  this.marks=new Map(Object.entries(options.marks??{}));
  this.at(kept??this.gap(0,1,true)??this.units[0]);
  mount.addEventListener('click',this.click);
  // The stage settles after the header and status first paint; any change of
  // its size re-centres the shown measure without composing anything again.
  this.resize=new ResizeObserver(()=>{if(!this.shown||this.disposed)return;this.scale=undefined;this.centre(this.shown);this.paintLabels();});this.resize.observe(mount);
 }
 /** The next note without a finger from index i in the given direction,
  * wrapping round the piece; i itself counts only when inclusive. Given a
  * hand, only that hand's notes count. */
 private gap(i:number,step:1|-1,inclusive=false,except?:string,hand?:string){
  const personal=this.options.personal(),n=this.units.length;
  for(let k=inclusive?0:1;k<=n;k++){const seat=this.units[((i+step*k)%n+n)%n];if(seat&&seat.contactId!==except&&(hand===undefined||this.stream(seat)===hand)&&fingerFor(this.options.basePackage,personal,seat)===undefined)return seat;}
  return undefined;
 }
 /** A hand's own line through the piece; notes without a hand form their own. */
 private stream(seat:Seat){return this.hand(seat)??'none';}
 /** The next note without a finger in the cursor's hand, then in any hand. */
 private nextGap(i:number,step:1|-1,except?:string){const hand=this.cursor&&this.stream(this.cursor);return this.gap(i,step,false,except,hand)??this.gap(i,step,false,except);}
 private at(seat:Seat|undefined){this.cursor=seat;if(seat)this.marks.set(this.stream(seat),seat.contactId);}
 /** Where each hand was left, kept when practice is rebuilt. */
 get handMarks(){return Object.fromEntries(this.marks);}
 dispose(){this.disposed=true;this.resize.disconnect();this.mount.removeEventListener('click',this.click);this.mount.replaceChildren();this.windows.clear();this.cropCache.clear();}
 /** Footer hints for the fingering keys. */
 static hints(){return `<span class="options-nav-hint section-fingering-keys"><span><kbd>1–5</kbd> Finger</span><span><kbd>←→</kbd> Note</span><span><kbd>↑↓</kbd> Hand</span><span><kbd>PgUp</kbd><kbd>PgDn</kbd> Measure</span><span><kbd>Tab</kbd> Next without a finger</span><span><kbd>L</kbd><kbd>R</kbd> Set the note's hand</span><span><kbd>J</kbd> Jump to a note</span></span>`;}
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
  // The frame is set by centring, not by the ink, so no ink is measured here.
  const track=fitPassageRelations(p,plan,crops,passageTrack(crops,this.mount,p,true),'compact',[bars]);
  const passage=composePassage(crops,track,'compact',bars,projectRelations(p,plan,crops,track,'compact',bars));
  const view=passage.svg.getAttribute('viewBox')!.split(' ').map(Number),spans=new Map<number,[number,number]>();
  for(const crop of crops){
   const group=passage.svg.querySelector<SVGGElement>(`[data-practice-bar="${crop.bar+1}"]`),shift=Number(/translate\(([-\d.e]+)/.exec(group?.getAttribute('transform')??'')?.[1]);if(!group||!Number.isFinite(shift))continue;
   const left=shift+crop.left,right=shift+crop.right;spans.set(crop.bar,[left,right]);group.dataset.span=`${left} ${right}`;
   group.classList.toggle('section-fingering-ghost',ghosts.has(crop.bar));
   // Veil each ghost above all ink, out to the edge of the view, so its
   // slurs, pedal lines and both of its rules fade with it.
   if(ghosts.has(crop.bar)){const veil=document.createElementNS(ns,'rect'),x0=crop.bar<bar?left-1e4:left-1,x1=crop.bar<bar?right+1:right+1e4;
    veil.setAttribute('class','section-fingering-veil');veil.setAttribute('x',String(x0));veil.setAttribute('y',String(view[1]-1e3));veil.setAttribute('width',String(x1-x0));veil.setAttribute('height',String(view[3]+2e3));passage.svg.append(veil);}
  }
  const lanes=crops[0].lanes,middle=(Math.min(...lanes)+Math.max(...lanes))/2;
  passage.svg.setAttribute('preserveAspectRatio','xMidYMid meet');
  const made={bar,svg:passage.svg,crops:passage.crops.filter(c=>!ghosts.has(c.bar)),spans,middle,top:view[1],bottom:view[1]+view[3]};this.windows.set(bar,made);
  // Keep a handful of windows; layout is cheap to redo, memory on a long score is not.
  for(const key of this.windows.keys()){if(this.windows.size<=6)break;if(key!==bar&&key!==this.shown?.bar)this.windows.delete(key);}
  return made;
 }
 /** Recompose for a new stage size or rotation; otherwise only repaint, so
  * saving a finger never pays for layout. */
 refit(){
  const size=`${this.mount.clientWidth}x${this.mount.clientHeight}`;
  if(this.fitted&&size!==this.fitted){this.windows.clear();this.shown=undefined;this.scale=undefined;this.mount.replaceChildren();this.render();}else this.paint();
 }
 render(){
  const bar=(this.cursor?.writtenBar??1)-1;
  let next:FingeringWindow;
  // A measure that cannot be drawn says so on the stage, never a blank page.
  try{next=this.window(bar);}catch(error){this.shown=undefined;const message=document.createElement('p');message.className='section-fingering-error';message.textContent=`Measure ${bar+1} cannot be drawn for fingering: ${error instanceof Error?error.message:String(error)}`;this.mount.replaceChildren(message);this.options.status('Use ← → to move to another measure.');return;}
  if(this.shown!==next){this.mount.replaceChildren(next.svg);this.shown=next;}
  this.fitted=`${this.mount.clientWidth}x${this.mount.clientHeight}`;this.centre(next);
  this.paint();this.announce();this.prefetch(bar);
 }
 /** Compose the neighbouring windows while idle, so crossing a measure on a
  * slow computer does not wait for layout. */
 private prefetch(bar:number){
  const later=(f:()=>void)=>typeof requestIdleCallback==='function'?requestIdleCallback(f,{timeout:400}):setTimeout(f,60);
  for(const next of [bar+1,bar-1])if(next>=0&&next<this.barCount&&!this.windows.has(next))later(()=>{if(!this.disposed&&this.shown?.bar===bar&&!this.windows.has(next))try{this.window(next);}catch{/* composed again, with its error, when reached */}});
 }
 /** Half the width of the widest three-measure window in the piece, read from
  * the printed measure rules alone. Bars abut in the passage, so a window
  * needs its measure's half plus its wider neighbour. */
 private pieceHalf(){
  if(this.half===undefined){const widths=Array.from({length:this.barCount},(_,bar)=>{try{const {left,right}=measureBounds(this.options.package,this.options.plan,bar);return right-left;}catch{return 0;}});
   this.half=Math.max(0,...widths.map((w,i)=>w/2+Math.max(widths[i-1]??0,widths[i+1]??0)));}
  return this.half;
 }
 /** Centre the current measure exactly on the stage, its neighbours in full
  * either side. One scale serves the whole piece, set by its widest window, so
  * crossing a measure is a pure slide and the notation never changes size. */
 private centre(w:FingeringWindow){
  const width=this.mount.clientWidth,height=this.mount.clientHeight,span=w.spans.get(w.bar);if(!width||!height||!span)return;
  const centre=(span[0]+span[1])/2,before=w.spans.get(w.bar-1)?.[0]??span[0],after=w.spans.get(w.bar+1)?.[1]??span[1];
  const half=Math.max(centre-before,after-centre,this.pieceHalf())*1.04+3,reach=Math.max(w.middle-w.top,w.bottom-w.middle)*1.06;
  // Only a taller window than any yet seen may widen it.
  this.scale=Math.max(this.scale??0,2*half/width,2*reach/height);
  const vw=width*this.scale,vh=height*this.scale;
  w.svg.setAttribute('viewBox',`${centre-vw/2} ${w.middle-vh/2} ${vw} ${vh}`);w.svg.dataset.centre=String(centre);
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
 private go(seat:Seat|undefined){if(!seat)return;this.at(seat);this.labels=undefined;this.render();}
 /** The next or previous note of the cursor's hand; at either end it stays. */
 private move(step:1|-1){const i=Math.max(0,this.index()),hand=this.cursor&&this.stream(this.cursor);
  for(let k=i+step;k>=0&&k<this.units.length;k+=step)if(hand===undefined||this.stream(this.units[k])===hand){this.go(this.units[k]);return;}}
 /** The first note of the measure step measures away, in the cursor's hand
  * when it plays there. */
 private measure(step:number){const bar=Math.max(1,Math.min(this.barCount,(this.cursor?.writtenBar??1)+step));const near=this.units.find(s=>s.writtenBar===bar)??(step<0?[...this.units].reverse().find(s=>s.writtenBar<bar):this.units.find(s=>s.writtenBar>bar));if(!near)return;
  const hand=this.cursor&&this.stream(this.cursor),inBar=this.units.filter(s=>s.writtenBar===near.writtenBar);this.go(inBar.find(s=>this.stream(s)===hand)??inBar[0]);}
 /** Change hands: back to where the other hand was left, or else its first
  * note without a finger, or else its note nearest the cursor. Up is the right
  * hand, down the left, as the score's arrows move between hand rows. */
 private switchHands(direction:-1|1){
  const c=this.cursor;if(!c)return;
  const rank=this.stream(c)==='RH'?0:this.stream(c)==='LH'?1:2,target=rank+direction===0?'RH':rank+direction===1?'LH':undefined;
  if(target){const mark=this.marks.get(target),kept=mark===undefined?undefined:this.units.find(s=>s.contactId===mark&&this.stream(s)===target);
   const seat=kept??this.gap(0,1,true,undefined,target);if(seat)return seat;}
  return this.hands(direction);
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
  this.options.status(`${hand==='RH'||hand==='LH'?hand:'Notes without a hand'} · type the letter beside a note to move there · ↑↓ other hand · Esc cancels`);
 }
 private label(code:string){
  const labels=this.labels!,letter=/^Key([A-Z])$/.exec(code)?.[1].toLowerCase();
  const typed=labels.typed+(letter??''),matches=letter?[...labels.targets.keys()].filter(l=>l.startsWith(typed)):[];
  if(!matches.length){this.labels=undefined;this.paintLabels();this.announce();return;}
  if(matches.length===1&&matches[0]===typed){this.go(labels.targets.get(typed));return;}
  labels.typed=typed;this.paintLabels();
 }
 private announce(){
  const seat=this.cursor;
  if(!seat){this.options.status('This piece has no notes to finger.');return;}
  const hand=this.hand(seat)??'No hand',progress=this.progress(),missing=progress.total-progress.done;
  this.options.progress?.(progress);
  const where=`${hand} · measure ${seat.writtenBar} of ${this.barCount} · ${missing?`${missing} ${missing===1?'note':'notes'} without a finger`:'every note fingered'}`;
  this.options.status(where);
 }
 /** Counted once per saved state, not on every move. */
 progress():FingeringProgress {
  const personal=this.options.personal();
  if(this.counted?.personal!==personal)this.counted={personal,progress:fingeringProgress(this.units,s=>fingerFor(this.options.basePackage,personal,s)!==undefined,this.hand)};
  return this.counted.progress;
 }
 private async choose(finger:number){
  const seat=this.cursor;if(!seat)return;
  const i=this.index();
  // Move on at once to the next note without a finger; the finger paints
  // when it is saved. Once every note has one, the cursor stays.
  if(i>=0)this.at(this.nextGap(i,1,seat.contactId)??seat);
  this.render();
  try{await this.options.save(seat,finger);}catch(error){this.go(seat);this.options.status(`Finger ${finger} was not saved: ${error instanceof Error?error.message:String(error)}`);return;}
  this.announce();
 }
 key(code:string,shift=false):boolean{
  if(this.labels){
   if(code==='ArrowUp'||code==='ArrowDown'){const seat=this.hands(code==='ArrowUp'?-1:1);if(seat){this.at(seat);this.paint();this.startLabels();}return true;}
   if(code==='Escape'){this.labels=undefined;this.paintLabels();this.announce();return true;}
   if(LETTERS.includes(/^Key([A-Z])$/.exec(code)?.[1].toLowerCase()??'-')){this.label(code);return true;}
   // A modifier alone keeps the labels; any other key puts them away and does its ordinary work.
   if(/^(?:Shift|Control|Alt|Meta)(?:Left|Right)$|^CapsLock$/.test(code))return true;
   this.labels=undefined;this.paintLabels();this.announce();
  }
  const digit=/^(?:Digit|Numpad)([1-5])$/.exec(code);
  if(digit){void this.choose(Number(digit[1]));return true;}
  if(code==='Tab'){const seat=this.nextGap(Math.max(0,this.index()),shift?-1:1);if(seat)this.go(seat);else this.options.status('Every note has a finger.');return true;}
  if(code==='ArrowRight'){this.move(1);return true;}
  if(code==='ArrowLeft'||code==='Backspace'){this.move(-1);return true;}
  if(code==='ArrowUp'||code==='ArrowDown'){this.go(this.switchHands(code==='ArrowUp'?-1:1));return true;}
  // L and R choose the note's hand, as in the score; the cursor stays put.
  if((code==='KeyL'||code==='KeyR')&&this.cursor&&this.options.saveHand){const seat=this.cursor,hand=code==='KeyL'?'LH':'RH';void this.options.saveHand(seat,hand).catch(error=>this.options.status(`The hand was not saved: ${error instanceof Error?error.message:String(error)}`));return true;}
  if(code==='KeyJ'){this.startLabels();return true;}
  if(code==='PageDown'||code==='PageUp'){this.measure(code==='PageDown'?1:-1);return true;}
  if(code==='Home'){this.go(this.units[0]);return true;}
  if(code==='End'){this.go(this.units.at(-1));return true;}
  return false;
 }
}
