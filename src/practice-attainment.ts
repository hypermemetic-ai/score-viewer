/** Player claims are additive evidence; legacy bests keep their original provenance. */
export interface ManualAttainment {version:1;marks:Record<string,number[]>}
export interface AttainmentState {best:Record<string,number>;manualAttainment?:ManualAttainment}
export interface DoneTarget {passage:string;pattern:string;rate:number}
export function claimIdentity(key:string):[string,string]{let value:unknown;try{value=JSON.parse(key);}catch{throw Error('Self-reported passage identity differs; saved evidence retained.');}if(!Array.isArray(value)||value.length!==2||value.some(v=>typeof v!=='string'||!v))throw Error('Self-reported passage identity differs; saved evidence retained.');return value as [string,string];}
const validRate=(rate:number)=>Number.isFinite(rate)&&rate>=5&&rate<=500;
export function readManualAttainment(value:unknown):ManualAttainment|undefined {
 if(value===undefined)return;
 const v=value as ManualAttainment;
 if(!v||v.version!==1||!v.marks||typeof v.marks!=='object'||Array.isArray(v.marks)||Object.entries(v.marks).some(([pattern,rates])=>!pattern||!Array.isArray(rates)||rates.some(rate=>!validRate(rate))||new Set(rates).size!==rates.length))throw Error('Self-reported Practice marks differ; saved evidence retained.');
 for(const key of Object.keys(v.marks))claimIdentity(key);
 return structuredClone(v);
}
const claimKey=(t:Pick<DoneTarget,'passage'|'pattern'>)=>JSON.stringify([t.passage,t.pattern]);
export function attainedRate(state:AttainmentState,pattern:string,passage?:string){return Math.max(state.best[pattern]??0,...(passage?state.manualAttainment?.marks[claimKey({pattern,passage})]??[]:[]));}
export function hasDone(state:AttainmentState,target:DoneTarget){return !!state.manualAttainment?.marks[claimKey(target)]?.includes(target.rate);}
export function toggleDone(state:AttainmentState,target:DoneTarget){if(!target.passage||!target.pattern||!validRate(target.rate))throw Error('Invalid passage/rate claim.');state.manualAttainment??={version:1,marks:{}};const rates=state.manualAttainment.marks[claimKey(target)]??[],marked=!rates.includes(target.rate);if(marked)state.manualAttainment.marks[claimKey(target)]=[...rates,target.rate];else{const remaining=rates.filter(rate=>rate!==target.rate);if(remaining.length)state.manualAttainment.marks[claimKey(target)]=remaining;else delete state.manualAttainment.marks[claimKey(target)];}return marked;}
const key=(t:DoneTarget)=>JSON.stringify([t.passage,t.pattern,t.rate]);
/** Eligibility is local observed loop history, never manufactured attack evidence. */
export class PracticeDone {
 private eligible=new Set<string>();private lastCompleted?:DoneTarget;private undoTarget?:DoneTarget;
 private increase?:{target:DoneTarget;rate:number};private applied?:{target:DoneTarget;rate:number};
 select(){this.lastCompleted=undefined;this.undoTarget=undefined;this.increase=undefined;this.applied=undefined;}
 completed(target:DoneTarget){this.eligible.add(key(target));this.lastCompleted={...target};if(this.undoTarget&&key(this.undoTarget)!==key(target)){this.undoTarget=undefined;this.applied=undefined;}}
 target(current:DoneTarget,counting:boolean,state?:AttainmentState){const stable=this.undoTarget??(counting?this.lastCompleted:undefined);if(stable)return stable;if(!state||hasDone(state,current)||this.eligible.has(key(current)))return current;const prior=state.manualAttainment?.marks[claimKey(current)]?.at(-1);return prior===undefined?current:{passage:current.passage,pattern:current.pattern,rate:prior};}
 canToggle(state:AttainmentState,target:DoneTarget){return hasDone(state,target)||this.eligible.has(key(target));}
 toggle(state:AttainmentState,target:DoneTarget,keep:boolean,step:number,goal:number){if(!this.canToggle(state,target))return undefined;const marked=toggleDone(state,target);if(marked){this.undoTarget={...target};this.increase={target:{...target},rate:keep?target.rate:Math.min(goal,target.rate+step)};return {marked,rate:this.increase.rate};}const revert=this.applied&&key(this.applied.target)===key(target)?target.rate:undefined;this.undoTarget=undefined;if(this.increase&&key(this.increase.target)===key(target))this.increase=undefined;this.applied=undefined;return {marked,rate:revert};}
 /** Prediction is not attainment and does not consume the queued change. */
 peekNextRate(current:number,keep:boolean){return this.increase?(keep?this.increase.target.rate:this.increase.rate):current;}
 /** Called at a safe loop boundary/count-in, never while notes sound. */
 nextRate(current:number,keep:boolean){if(!this.increase)return current;const change=this.increase;this.increase=undefined;const rate=keep?change.target.rate:change.rate;this.applied={target:change.target,rate};return rate;}
 cancelIncrease(){this.increase=undefined;this.applied=undefined;}
}
