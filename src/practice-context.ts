import {initialPractice,readPractice,passageHierarchy,planPractice,practicePartition,type PracticePartition,type PracticePassagePlan,type PracticePlan,type PracticeState} from './practice';
import type {ScorePackage} from './package';

export type PracticePreferences=Pick<PracticeState,'start'|'step'|'target'|'personalGoal'|'tolerance'|'offset'|'keepTempo'|'audioOutput'|'countInBars'|'resumeCooldownSeconds'>;
export function practicePreferences(state:PracticeState):PracticePreferences {
 const {start,step,target,personalGoal,tolerance,offset,keepTempo,audioOutput,countInBars,resumeCooldownSeconds}=state;
 return structuredClone({start,step,target,personalGoal,tolerance,offset,keepTempo,audioOutput,countInBars,resumeCooldownSeconds});
}
/** Retained evidence owns its settings; a fresh pitch only inherits preferences. */
export function practiceStateForContext(plan:PracticePassagePlan,saved:unknown,context?:PracticeViewContext):PracticeState {
 const fresh=initialPractice(plan),state=readPractice(saved??(context?.preferences?{...fresh,...context.preferences,working:context.preferences.start}:undefined),plan);
 return context?restorePracticeGrouping(plan,state,context):state;
}
export interface AdmittedPracticeContext {plan:PracticePlan;state:PracticeState;saved:boolean}
export function admitPracticeContext(p:ScorePackage,saved:unknown,context?:PracticeViewContext):AdmittedPracticeContext {
 const plan=planPractice(p,saved?practicePartition(saved):context?.partition??practicePartition(saved));
 return {plan,state:practiceStateForContext(plan,saved,context),saved:!!saved};
}

/** Navigation/group structure only. No played evidence or completion claim. */
export interface PracticeViewContext {
 partition:PracticePartition;composites:Record<string,string[]>;
 selected:string;parent?:string;component?:string;includeManual:boolean;
 passage?:string;window?:[number,number];
 preferences?:PracticePreferences;
}
export function restorePracticeGrouping(plan:PracticePassagePlan,state:PracticeState,context:PracticeViewContext):PracticeState {
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
