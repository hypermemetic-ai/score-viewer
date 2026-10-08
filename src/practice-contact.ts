import type {PracticeAttack} from './practice';
/** Physical contact belongs to the accepted source occurrence, never every matching pitch seat. */
export class PracticeContacts {
 private contacts=new Map<number,PracticeAttack>();
 press(attack:PracticeAttack){
  for(const [pitch,previous]of this.contacts)if(previous.end<=attack.tick)this.contacts.delete(pitch);
  this.contacts.set(attack.midi,attack);
 }
 release(pitch:number){this.contacts.delete(pitch);}
 replace(attacks:PracticeAttack[]){this.clear();for(const attack of attacks.sort((a,b)=>a.tick-b.tick))this.press(attack);}
 hasOwner(owner:string){return [...this.contacts.values()].some(a=>a.owners.includes(owner));}
 clear(){this.contacts.clear();}
}
