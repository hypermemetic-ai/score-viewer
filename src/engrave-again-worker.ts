/// <reference lib="webworker" />
// Engraves a saved archive again off the reader's thread, for ahead-of-time
// work in the library (engrave-again-client.ts). It writes nothing: what it
// made goes back to the page, encoded, which keeps it as derived files.
import {engravedAgainRecord,useEngravedAgainStore} from './engraved-again';
import {completeEdition,rebuildEdition} from './edition-rebuild';
import {reengraveReadingArchive} from './reading-package';
import {importPackage,requireCurrentEngraving,useCalculatedAdmissionEvidence,usePianoPageCheckReceipts,useReadingAdmissionReceipts} from './package';
import {encodeDerivedPayload} from './derived-payload';
import type {EngraveAgainRecord,EngraveAgainReply,EngraveAgainRequest} from './engrave-again-client';

const scope=self as unknown as DedicatedWorkerGlobalScope;
scope.onmessage=async(event:MessageEvent<EngraveAgainRequest>)=>{
 const {bytes,admit,layouts,earlier}=event.data,made:Promise<EngraveAgainRecord>[]=[],
  keep=(kind:string,key:string,value:unknown,tag?:string)=>{made.push(encodeDerivedPayload(value).then(encoded=>({kind,key,encoded,...(tag===undefined?{}:{tag})})));};
 // Every engraving made on the way (a transposed edition's original too) goes
 // back, and so do the checks admitting it ran: opening it then checks nothing twice.
 useEngravedAgainStore({get:async()=>undefined,put:(key,engraved)=>keep('engraved-again-v1',key,engravedAgainRecord(engraved))});
 useReadingAdmissionReceipts({get:async()=>undefined,put:(sha,receipt)=>keep('reading-admission-v1',sha,receipt)});
 usePianoPageCheckReceipts({has:async()=>false,add:key=>keep('piano-page-checks-v1',key,true,'checked')});
 useCalculatedAdmissionEvidence({get:async()=>undefined,put:(key,evidence)=>keep('calculated-admission-v1',key,evidence)});
 let error:string|undefined;
 try{
  // The layouts an edition left for later, engraved from its earlier edition.
  if(earlier&&layouts)await completeEdition(bytes,earlier,layouts);
  else{
   // Admitted first when asked, as opening admits it: an archive the current
   // engraving still reproduces needs nothing more than the receipts it gave.
   let refusal:unknown=Error('This saved edition does not read.'),current=false;
   if(admit)try{requireCurrentEngraving(await importPackage(bytes,{allowLegacyTempo:true}));current=true;}catch(admission){refusal=admission;}
   // Only content that still reads is engraved again; anything else keeps its refusal.
   if(!current&&!await reengraveReadingArchive(bytes,refusal))await rebuildEdition(bytes,{refusal,...(layouts?{layouts}:{})});
  }
 }catch(failure){error=(failure as Error)?.message??String(failure);}
 const records=await Promise.all(made),reply:EngraveAgainReply={made:records,...(error===undefined?{}:{error})};
 scope.postMessage(reply,records.map(record=>record.encoded.body.buffer as ArrayBuffer));
};
