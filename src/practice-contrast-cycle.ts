/** A/B acceptance is local attempt state. Neither preparation nor A alone
 * grants a whole exercise claim. A restart always begins a new A. */
export class PracticeContrastCycle {
 private generation=0;private attempt?:{token:number;rate:number;measured:boolean;index:0|1;acceptedA:boolean};
 start(rate:number,measured:boolean){if(!Number.isFinite(rate)||rate<5||rate>500)throw Error('Invalid contrast cycle rate.');const token=++this.generation;this.attempt={token,rate,measured,index:0,acceptedA:false};return token;}
 get active(){return this.attempt!==undefined;}
 get index(){return this.attempt?.index??0;}
 get rate(){return this.attempt?.rate;}
 get measured(){return this.attempt?.measured;}
 get token(){return this.attempt?.token;}
 accept(index:0|1,rate:number,measured:boolean,token=this.token):'next'|'completed'|'stale'{
  const attempt=this.attempt;
  if(!attempt||token!==attempt.token||index!==attempt.index||rate!==attempt.rate||measured!==attempt.measured)return 'stale';
  if(index===0){attempt.acceptedA=true;attempt.index=1;return 'next';}
  if(!attempt.acceptedA)return 'stale';this.attempt=undefined;return 'completed';
 }
 cancel(){this.generation++;this.attempt=undefined;}
}
