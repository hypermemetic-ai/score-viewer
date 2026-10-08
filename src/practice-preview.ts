import {isQuietStray,type PracticeAttack,type PracticePlan} from './practice';
interface Path {next:number;chord:Set<string>;history:PracticeAttack[]}
export interface PreviewResult {decision:'preview'|'quiet-ignored'|'preview-unmatched';attack?:PracticeAttack;contacts:PracticeAttack[];ambiguous:boolean}
/** A small source-order follower for ungraded practice; fresh paths begin only at hand-position starts. */
export class PracticePreview {
 private chords=new Map<number,PracticeAttack[]>();private startsByPitch=new Map<number,number[]>();private scope='';private events:PracticeAttack[]=[];private starts=new Set<number>();private paths:Path[]=[];private held=new Set<number>();private lastPositive=-Infinity;
 constructor(private readonly plan:PracticePlan){}
 clear(){this.scope='';this.paths=[];this.held.clear();this.lastPositive=-Infinity;}
 release(midi:number){this.held.delete(midi);}
 note(midi:number,velocity:number,now:number,groups:Set<string>):PreviewResult {
  const scope=[...groups].sort().join('|');if(scope!==this.scope){this.clear();this.scope=scope;this.events=this.plan.attacks.filter(a=>a.groups.some(g=>groups.has(g)));this.starts=new Set(this.plan.gestures.filter(g=>groups.has(g.id)).map(g=>g.start));this.chords.clear();this.startsByPitch.clear();for(const [i,a]of this.events.entries()){const chord=this.chords.get(a.tick)??[];chord.push(a);this.chords.set(a.tick,chord);if(this.starts.has(a.tick)){const seeds=this.startsByPitch.get(a.midi)??[];seeds.push(i);this.startsByPitch.set(a.midi,seeds);}}}
  if(now-this.lastPositive>25000){this.paths=[];this.held.clear();}
  const advance=(path:Path):Path|undefined=>{const next=this.events[path.next];if(!next)return;const found=this.chords.get(next.tick)!.find(a=>!path.chord.has(a.id)&&a.midi===midi);if(!found)return;
   const chord=new Set(path.chord);chord.add(found.id);let index=path.next;if(this.chords.get(next.tick)!.every(a=>chord.has(a.id))){while(this.events[index]?.tick===next.tick)index++;chord.clear();}
   return {next:index,chord,history:[...path.history,found].slice(-32)};};
  const continued=this.paths.map(advance).filter((p):p is Path=>!!p);
  // Keep start alternatives even when continuation fits: a later pitch can distinguish a restart.
  const seeds=this.startsByPitch.get(midi)??[];
  const restarts=seeds.map(i=>advance({next:i-this.chords.get(this.events[i].tick)!.findIndex(a=>a.id===this.events[i].id),chord:new Set(),history:[]})).filter((p):p is Path=>!!p);
  const paths=[...continued,...restarts];if(!paths.length){if(!isQuietStray(velocity))this.lastPositive=now;return this.result(isQuietStray(velocity)?'quiet-ignored':'preview-unmatched');}this.lastPositive=now;
  const unique=new Map<string,Path>();for(const p of paths){const key=`${p.next}|${[...p.chord].sort().join(',')}`,old=unique.get(key);if(!old||p.history.length>old.history.length)unique.set(key,p);}
  this.paths=[...unique.values()].sort((a,b)=>b.history.length-a.history.length||a.history.at(-1)!.tick-b.history.at(-1)!.tick).slice(0,64);this.held.add(midi);return this.result('preview');
 }
 private result(decision:PreviewResult['decision']):PreviewResult {const path=this.paths[0],attack=decision==='preview'?path?.history.at(-1):undefined,last=path?.history.at(-1),latest=new Map<number,PracticeAttack>();for(const a of path?.history??[])if(this.held.has(a.midi)&&(a.end>(last?.tick??0)||a.tick===last?.tick))latest.set(a.midi,a);return {decision,attack,contacts:[...latest.values()],ambiguous:new Set(this.paths.map(p=>p.history.at(-1)?.bar)).size>1};}
}
