/** Where the application is, declared on its root element as `data-*`
 * attributes, so a script (the rehearsal) can follow it without reading text
 * or pixels. Nothing here is visible; a person sees the screens themselves. */
export type AppScreen='startup'|'library'|'reader'|'practice';
/** What practice shows: Fingers through the whole piece, the sections at
 * tempo, or the reading practice of a score for another instrument. */
export type AppStep='fingers'|'sections'|'manual';
export interface AppState {
 screen:AppScreen;
 /** The open dialog's kind (score-reading, practice-menu, options …). */
 dialog?:string;
 /** The open score's library id. */
 score?:string;
 /** Whether the open score is a piano score. */
 instrument?:'piano'|'other';
 /** The player's keyboard layout. */
 layout?:string;
 step?:AppStep;
 /** The section being practised; absent on the list of sections. */
 section?:string;
 /** Fingers are being edited in the reader (a note is selected). */
 editing?:'fingers';
 /** Why a press may not act at once: a score opening, a press waiting for
 * readiness, practice starting. Absent when idle. */
 busy?:string;
 /** The score the library's background work is preparing (its line may show under its row). */
 preparing?:string;
}
/** The attribute each fact is declared as. */
export const APP_STATE_ATTRIBUTES:Readonly<Record<keyof AppState,string>>={screen:'data-screen',dialog:'data-dialog',score:'data-score',instrument:'data-instrument',layout:'data-layout',step:'data-step',section:'data-section',editing:'data-editing',busy:'data-busy',preparing:'data-preparing'};
/** Counts of what ran, `action:count` separated by spaces: an action run
 * twice for one press shows as two. */
export const APP_RAN_ATTRIBUTE='data-ran';
/** How many failures the player was told about. */
export const APP_FAILURES_ATTRIBUTE='data-failures';

export interface AppStateInput {
 started:boolean;
 dialog?:string;
 score?:{id:string;piano:boolean};
 layout?:string;
 practice?:{step:AppStep;section?:string};
 editing?:boolean;
 reading:boolean;pressWaiting:boolean;practiceStarting:boolean;
 preparing?:string;
}
export function appState(input:AppStateInput):AppState {
 const busy=[!input.started?'startup':'',input.reading?'reading':'',input.pressWaiting?'press':'',input.practiceStarting?'practice':''].filter(Boolean).join(' ');
 const state:AppState={screen:!input.started?'startup':input.practice&&input.score?'practice':input.score?'reader':'library'};
 if(input.dialog)state.dialog=input.dialog;
 if(input.score){state.score=input.score.id;state.instrument=input.score.piano?'piano':'other';}
 if(input.layout)state.layout=input.layout;
 if(state.screen==='practice'){state.step=input.practice!.step;if(input.practice!.section)state.section=input.practice!.section;}
 if(state.screen==='reader'&&input.editing)state.editing='fingers';
 if(busy)state.busy=busy;
 if(input.preparing)state.preparing=input.preparing;
 return state;
}
type Attributes=Pick<Element,'getAttribute'|'setAttribute'|'removeAttribute'>;
/** Writes only what changed, so declaring often costs nothing. */
export function declareAppState(root:Attributes,state:AppState){
 for(const [key,name] of Object.entries(APP_STATE_ATTRIBUTES) as [keyof AppState,string][]){
  const value=state[key];
  if(value===undefined){if(root.getAttribute(name)!==null)root.removeAttribute(name);}
  else if(root.getAttribute(name)!==value)root.setAttribute(name,value);
 }
}
/** Counts one run of an action. */
export function declareRan(root:Attributes,action:string){
 const counts=readRan(root.getAttribute(APP_RAN_ATTRIBUTE));counts.set(action,(counts.get(action)??0)+1);
 root.setAttribute(APP_RAN_ATTRIBUTE,[...counts].map(([a,n])=>`${a}:${n}`).join(' '));
}
export function readRan(value:string|null):Map<string,number> {
 return new Map((value??'').split(' ').filter(Boolean).map(token=>{const at=token.lastIndexOf(':');return [token.slice(0,at),Number(token.slice(at+1))] as [string,number];}));
}
export function declareFailure(root:Attributes){
 root.setAttribute(APP_FAILURES_ATTRIBUTE,String(Number(root.getAttribute(APP_FAILURES_ATTRIBUTE)??0)+1));
}
