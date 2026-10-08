/** Application-owned practice arrow repetition, independent of OS keyboard cadence. */
export interface RepeatClock {now:()=>number;set:(callback:()=>void,delay:number)=>unknown;clear:(timer:unknown)=>void}
const systemClock:RepeatClock={now:()=>performance.now(),set:(fn,delay)=>setTimeout(fn,delay),clear:timer=>clearTimeout(timer as ReturnType<typeof setTimeout>)};
export class TempoRepeat {
 private code?:string;private started=0;private timer?:unknown;private adjust?:(repeated:boolean,elapsed:number)=>boolean;
 constructor(private readonly clock:RepeatClock=systemClock){}
 owns(code:string){return this.code===code;}
 begin(code:string,adjust:(repeated:boolean,elapsed:number)=>boolean){
  if(this.owns(code))return;this.cancel();if(!adjust(false,0))return;this.code=code;this.started=this.clock.now();this.adjust=adjust;this.schedule(450);
 }
 release(code:string){if(this.owns(code))this.cancel();}
 cancel(){if(this.timer!==undefined)this.clock.clear(this.timer);this.timer=undefined;this.code=undefined;this.adjust=undefined;}
 private schedule(delay:number){this.timer=this.clock.set(()=>this.tick(),delay);}
 private tick(){this.timer=undefined;const elapsed=this.clock.now()-this.started;if(!this.code||!this.adjust?.(true,elapsed)||!this.code){this.cancel();return;}this.schedule(elapsed>=3000?125:elapsed>=1500?150:200);}
}
