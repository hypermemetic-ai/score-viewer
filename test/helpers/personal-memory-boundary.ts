import {PersonalEditQueue} from '../../src/personal-edit-queue';

/** Controlled persistence boundary for the legacy geometry-only VM fixtures.
 * This does not model matching or CAS: real-session tests cover those. Mutations
 * run against durable state; navigation saves can never replace musical fields. */
export function personalMemoryBoundary(context:any,read:()=>any,write:(value:any,kind:'intent'|'navigation')=>Promise<void>|void){
 let serial=0;const operations=new Map<number,(latest:any)=>any>();
 const queue=new PersonalEditQueue<number>('fixture-intents',async id=>{
  const operation=operations.get(id)!;await write(operation(structuredClone(read())),'intent');operations.delete(id);
 });
 const update=(change:(latest:any)=>any)=>{const id=++serial;operations.set(id,change);return queue.accept(id).saved;};
 const session={
  get error(){return queue.error;},get recovery(){return queue.recovery;},resolve(){return {byOwner:{}};},personalFor(){return structuredClone(read());},
  accept(input:any,action:any){
   if(queue.error)throw queue.error;
   const ownerId=action.kind==='finger'?action.edit.ownerId:action.ownerId;
   const choice=action.kind==='finger'?{finger:action.edit.finger}:action.kind==='hand'?{hand:action.hand}:{};
   const change=(latest:any)=>context.assigned(input.p,latest,{ownerIds:[ownerId]},choice);
   return {personal:change(structuredClone(input.personal)),saved:update(change)};
  },
  updatePersonal(_input:any,change:(latest:any)=>any){return update(change);},
  async saveView(input:any){
   await queue.flush();const latest=structuredClone(read()),snapshot=input.personal;
   latest.view=structuredClone(snapshot.view);latest.editContactId=snapshot.editContactId;latest.navigation=structuredClone(snapshot.navigation);
   await write(latest,'navigation');
  },
  flush:()=>queue.flush(),retry:()=>queue.retry(),
 };
 Object.assign(context,{personalMemory:session,crypto,rawMemoryPersonal:structuredClone,
  memoryInput:(target:any)=>({entryId:target.entry.id,p:target.package,personal:structuredClone(target.personal)}),
  resolveMemory:(target:any)=>structuredClone(target.personal),effectiveAssignmentKey:(_p:any,s:any)=>JSON.stringify(s.choices),
  adviceRunner:{cancel(){}},adviceKey:'',PracticeView:context.PracticeView??class{},
  scoreCapabilities:()=>({pianoPreparation:true}),loadPersonal:async()=>structuredClone(read()),
 });
 return session;
}
