import type {PreparationStage} from '../vendor/iso-notation/src/score-presentation';
import {LoadingProgress,stageDetail} from './viewer-loading';
import type {PersonalHand} from './personal-assignments';

/** A hand choice made while the engraver is still settling for hand editing. */
export interface WaitingHandChoice {
 /** The note it was made on; a later choice on the same note replaces it. */
 key:string;
 hand:PersonalHand;
 /** The printed bar, for saying where the choice lands. */
 bar:number;
}
const bars=(choices:readonly WaitingHandChoice[])=>{
 const unique=[...new Set(choices.map(c=>c.bar))].sort((a,b)=>a-b);
 return unique.length===1?`bar ${unique[0]}`:`bars ${unique.slice(0,-1).join(', ')} and ${unique.at(-1)}`;
};

/** Hand choices wait in the order they were made, one per note. None is
 * dropped while it waits: it applies once hand editing is ready, or is
 * reported as not applied when the score it belongs to closes first. */
export class HandChoiceQueue {
 private choices=new Map<string,WaitingHandChoice>();
 get size(){return this.choices.size;}
 add(choice:WaitingHandChoice){this.choices.delete(choice.key);this.choices.set(choice.key,{...choice});}
 /** The oldest waiting choice, which leaves the queue. */
 shift():WaitingHandChoice|undefined{const first=this.choices.values().next().value;if(first)this.choices.delete(first.key);return first;}
 /** Every waiting choice, oldest first; the queue is then empty. */
 take():WaitingHandChoice[]{const all=[...this.choices.values()];this.choices.clear();return all;}
 list():readonly WaitingHandChoice[]{return [...this.choices.values()];}
}

/** What a waiting choice will do, in one line. */
export function waitingChoicesText(choices:readonly WaitingHandChoice[]):string {
 if(!choices.length)return '';
 if(choices.length===1)return `${choices[0].hand} for the note in ${bars(choices)} applies once this is ready.`;
 return `${choices.length} hand choices (${bars(choices)}) apply once this is ready.`;
}
/** A reason sentence read as the clause after a colon. */
const clause=(reason:string)=>reason.trim().replace(/[.!?]$/,'').replace(/^[A-Z](?=[a-z])/,c=>c.toLowerCase());
const notes=(choices:readonly WaitingHandChoice[])=>choices.length===1?`${choices[0].hand} for the note in ${bars(choices)}`:`${choices.length} hand choices (${bars(choices)})`;
/** The engraver's reason, a clause about one refused note, as a sentence. */
const keptReasonSentence=(notes:number,reason?:string)=>reason?`${notes===1?'It':'One of them'} ${clause(reason)}.`:'';
/** Said when a hand choice is refused because the engraver can't draw it:
 * the note keeps its hand, nothing waits to be saved, and the reason (from
 * the engraver's diagnosis) says why. */
export function keptHandsText(keys:number,reason?:string):string {
 const kept=keys===1?'That hand can’t be drawn on the page yet, so the note keeps the hand it had.':'Those hands can’t be drawn on the page yet, so the notes keep the hands they had.';
 return reason?`${kept} ${keptReasonSentence(keys,reason)}`:kept;
}
/** What became of the waiting choices once hand editing is ready: applied,
 * kept as they were because the engraver cannot draw that hand yet, or not
 * applied with the reason. */
export function waitingOutcomeText(outcome:{applied:readonly WaitingHandChoice[];kept?:readonly WaitingHandChoice[];keptReason?:string;unapplied?:readonly WaitingHandChoice[];reason?:string}):string {
 const {applied,kept=[],unapplied=[]}=outcome,parts=['Hand editing is ready.'];
 if(applied.length)parts.push(applied.length===1?`${applied[0].hand} applied to the note in ${bars(applied)}.`:`${applied.length} hand choices applied in ${bars(applied)}.`);
 if(kept.length)parts.push(kept.length===1?`The note in ${bars(kept)} keeps the hand it had: that hand can’t be drawn on the page yet.`:`The notes in ${bars(kept)} keep the hands they had: those hands can’t be drawn on the page yet.`);
 if(kept.length&&outcome.keptReason)parts.push(keptReasonSentence(kept.length,outcome.keptReason));
 if(unapplied.length)parts.push(`${notes(unapplied)} ${unapplied.length===1?'was':'were'} not applied${outcome.reason?`: ${clause(outcome.reason)}`:''}.`);
 return parts.join(' ');
}
/** Said when waiting choices land. */
export function appliedChoicesText(choices:readonly WaitingHandChoice[]):string {return waitingOutcomeText({applied:choices});}
/** Said when the score was closed or changed before its waiting choices could land. */
export function abandonedChoicesText(choices:readonly WaitingHandChoice[],reason='the score was closed or changed before hand editing was ready'):string {
 return `${notes(choices)} ${choices.length===1?'was':'were'} not applied: ${clause(reason)}. Nothing was saved for ${choices.length===1?'it':'them'}.`;
}

/**
 * The calm status shown while a hand choice waits for the engraver: the
 * shared loading surface in its compact form, with the engraver's current
 * stage, the elapsed clock and what the waiting choices will do.
 */
export class HandPreparationStatus {
 readonly loading=new LoadingProgress('Preparing hand editing',['hand-editing'],{compact:true});
 private queued='';
 /** Only this status's own panels: another score's wait keeps its own. */
 private readonly asides=new Set<HTMLElement>();
 constructor(stage?:PreparationStage){this.loading.step('hand-editing',stage?stageDetail(stage):'');}
 /** The worker reports each stage once, so pages are not counted here. */
 stage(stage:PreparationStage){this.loading.detail(stageDetail(stage));}
 queue(choices:readonly WaitingHandChoice[]){
  this.queued=waitingChoicesText(choices);
  for(const aside of this.asides){const line=aside.querySelector<HTMLElement>('.viewer-hand-preparation-queue');if(line){line.textContent=this.queued;line.hidden=!this.queued;}}
 }
 markup(){return `${this.loading.markup()}<p class="viewer-hand-preparation-queue"${this.queued?'':' hidden'}>${this.queued.replaceAll('&','&amp;').replaceAll('<','&lt;')}</p>`;}
 /** Show the status on a reader surface; a redrawn surface is given it again. */
 show(surface:Element|null){
  if(!surface||surface.querySelector(':scope > [data-hand-preparation]'))return;
  const aside=document.createElement('aside');aside.className='viewer-hand-preparation';aside.dataset.handPreparation='';aside.innerHTML=this.markup();
  for(const old of this.asides)if(!old.isConnected)this.asides.delete(old);
  surface.append(aside);this.asides.add(aside);this.loading.attach(aside);
 }
 close(){this.loading.stop();for(const aside of this.asides)aside.remove();this.asides.clear();}
}
