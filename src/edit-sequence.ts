import type {Seat} from './package';
/** Reserve physical targets at key arrival; serialize writes, and never redirect an accepted digit. */
export class EditSequence {
 private epoch=0;private cancelVersion=0;private reserved?:Seat;private queued=Promise.resolve();
 reset(){this.epoch++;this.reserved=undefined;}
 submit(units:Seat[],current:Seat,write:(seat:Seat,next:Seat,isCurrent:()=>boolean)=>Promise<void>,advance:(next:Seat)=>void){
  const epoch=this.epoch,cancelVersion=this.cancelVersion,seat=this.reserved??current,index=units.findIndex(s=>s.contactId===seat.contactId),next=units[Math.min(units.length-1,index+1)];this.reserved=next;
  const job=this.queued.then(async()=>{if(cancelVersion!==this.cancelVersion)return;try{await write(seat,next,()=>epoch===this.epoch);if(epoch===this.epoch)advance(next);}catch(error){this.cancelVersion++;if(epoch===this.epoch)this.reset();throw error;}});
  this.queued=job.catch(()=>{});return job;
 }
}
