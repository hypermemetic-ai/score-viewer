import {initialPractice,readPractice,passageHierarchy,sharedPracticePlan,requirePracticeHands,practicePartition,setPracticeGoal,type PracticePartition,type PracticePassagePlan,type PracticePlan,type PracticeState} from './practice';
import type {PracticeMode,PracticePrimaryMode} from './practice-view';
import type {PersonalState} from './state';
import type {ScorePackage} from './package';
import {savedPlayerTempo,playerTempo} from './player-tempo';
import {FoldedPracticeJournal,foldedPracticeJournal,foldedPracticePreferences} from './practice-fold-journal';
import type {ReferencePerformanceTempo} from '../vendor/iso-notation/src/model/reference-performance-tempo';

export type PracticePreferences=Pick<PracticeState,'start'|'connectionStart'|'step'|'target'|'personalGoal'|'tolerance'|'offset'|'keepTempo'|'audioOutput'|'countInBars'|'resumeCooldownSeconds'>;
export function practicePreferences(state:PracticeState):PracticePreferences {
 const {start,connectionStart,step,target,personalGoal,tolerance,offset,keepTempo,audioOutput,countInBars,resumeCooldownSeconds}=state;
 return structuredClone({start,connectionStart,step,target,personalGoal,tolerance,offset,keepTempo,audioOutput,countInBars,resumeCooldownSeconds});
}
/** Retained evidence owns its settings; a fresh pitch only inherits preferences. */
export function practiceStateForContext(plan:PracticePassagePlan,saved:unknown,context?:PracticeViewContext):PracticeState {
 const fresh=initialPractice(plan),state=readPractice(saved??(context?.preferences?{...fresh,...context.preferences,working:context.preferences.start}:undefined),plan);
 return context?restorePracticeGrouping(plan,state,context):state;
}
/** Lays out measures for Fingers only; nothing is timed against it. */
export const FINGERS_LAYOUT_TEMPO=80;
export interface AdmittedPracticeContext {plan:PracticePlan;state:PracticeState;saved:boolean;rememberTempo?:true;
 /** On a folded edition, the score's journal it reads and saves in written-out terms. */
 journal?:FoldedPracticeJournal}
/** The written-out edition behind a folded one, and the fold's own name in the journal. */
export interface PracticeFoldSource {key:string;written:ScorePackage;personal:PersonalState}
/** A score without a reference tempo uses the remembered player tempo, else
 * the newly chosen one; the journal keeps it as the personal goal. Fingers
 * alone needs no tempo: a stand-in lays out the measures, is never saved and
 * never asked for. */
export function admitPracticeContext(p:ScorePackage,saved:unknown,context?:PracticeViewContext,personal?:PersonalState,chosenTempo?:ReferencePerformanceTempo,fingersOnly=!!context?.fingersOnly,fold?:PracticeFoldSource):AdmittedPracticeContext {
 requirePracticeHands(p,personal);
 const remembered=savedPlayerTempo(p.score,saved,context?.preferences),standIn=fingersOnly&&!remembered&&p.score.referencePerformanceTempo===undefined;
 const player=standIn?playerTempo(p.score,FINGERS_LAYOUT_TEMPO):remembered??(p.score.referencePerformanceTempo===undefined?chosenTempo:undefined);
 const plan=sharedPracticePlan(p,'bounded-exercises-v1',personal,player);
 // A folded edition reads the score's journal by music. Fingers alone saves
 // nothing and reads only the player's settings.
 let journal:FoldedPracticeJournal|undefined;
 if(fold&&fingersOnly)saved=foldedPracticePreferences(saved,plan);
 else if(fold){const written={key:fold.key,written:sharedPracticePlan(fold.written,'bounded-exercises-v1',fold.personal,player)},raw=saved;saved=foldedPracticeJournal(raw,plan,written);journal=new FoldedPracticeJournal(written,raw);}
 let state=practiceStateForContext(plan,saved,context);journal?.read(state);
 // The stand-in never becomes the player's goal, so no snapshot can carry it.
 const rememberTempo=!!plan.playerTempo&&!state.personalGoal&&!standIn;
 if(rememberTempo)state=setPracticeGoal(state,plan,plan.referencePerformanceTempo!.bpm);
 return {plan,state,saved:!!saved,...(rememberTempo?{rememberTempo:true as const}:{}),...(journal?{journal}:{})};
}

/** Navigation/group structure only. No played evidence or completion claim. */
export interface PracticeViewContext {
 partition:PracticePartition;composites:Record<string,string[]>;
 selected:string;parent?:string;component?:string;includeManual:boolean;
 passage?:string;window?:[number,number];mode?:PracticeMode;previousMode?:PracticePrimaryMode;readingWindow?:number;
 /** Fingers alone, and its cursor, kept when practice is rebuilt after a hand choice. */
 fingersOnly?:true;fingering?:{passage:string;contactId?:string;marks?:Record<string,string>};
 preferences?:PracticePreferences;
}
export function restorePracticeGrouping(plan:PracticePassagePlan,state:PracticeState,context:PracticeViewContext):PracticeState {
 if(plan.partition==='bounded-exercises-v1'){passageHierarchy(plan,state);return state;}
 if(plan.partition!==context.partition)return state;
 // Both trees must be independently sound. A retained tree has priority when
 // the old navigation joins would cross it; played evidence is never removed.
 passageHierarchy(plan,{...initialPractice(plan),composites:structuredClone(context.composites)});
 passageHierarchy(plan,state);
 const candidate=structuredClone(state);candidate.composites??={};
 const joins=Object.entries(context.composites).sort(([a],[b])=>{const span=(id:string)=>Number(id.split('-')[1])-Number(id.split('-')[0]);return span(a)-span(b);});
 for(const [id,children]of joins){if(candidate.composites![id])continue;const proposed:PracticeState={...candidate,composites:{...candidate.composites,[id]:structuredClone(children)}};try{passageHierarchy(plan,proposed);candidate.composites=proposed.composites;}catch{/* An independently valid old join cannot replace a crossing retained tree. */}}
 return candidate;
}

/** Native MIDI timestamps are monotonic; queued old pitch input is never new assessment. */
export class PitchInputEpoch {
 private since=0;private blocked=false;
 block(){this.blocked=true;}
 reset(timestampMicros:number){if(!Number.isFinite(timestampMicros)||timestampMicros<0)throw Error('The musical input clock is unavailable. Reopen the score before playing.');this.since=timestampMicros;this.blocked=false;}
 accepts(event:{timestamp_micros?:number}){return !this.blocked&&(event.timestamp_micros===undefined?this.since===0:Number.isFinite(event.timestamp_micros)&&event.timestamp_micros>=this.since);}
}
