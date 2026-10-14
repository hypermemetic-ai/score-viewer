import {personalMemoryDocument} from './personal-memory-session';
import type {AssistanceStore} from './durable-assistance-store';
export const personalConsolidationRequestDocument='personal-fingering-consolidation-request';
export interface PersonalConsolidationRequest {version:1;entryIds:string[];receiptId:string;sourceRevisions:Record<string,string>;personalKeys?:string[]}
/** Delivery stages an explicit request in the same supported atomic store.
 * Absence is an ordinary startup; no undeclared managed path is probed. */
export async function pendingPersonalConsolidation(store:AssistanceStore,entryIds:readonly string[]):Promise<PersonalConsolidationRequest|undefined>{
 const snapshot=await store.read(),raw=snapshot.documents[personalConsolidationRequestDocument];if(raw===undefined)return;
 const request=raw as unknown as PersonalConsolidationRequest;
 const memory=snapshot.documents[personalMemoryDocument] as unknown as {receipts?:Record<string,{completed?:boolean}>}|undefined;
 if(typeof request?.receiptId==='string'&&memory?.receipts?.[request.receiptId]?.completed===true)return;
 if(!request||request.version!==1||!Array.isArray(request.entryIds)||!request.entryIds.length||new Set(request.entryIds).size!==request.entryIds.length||request.entryIds.some(id=>typeof id!=='string'||!entryIds.includes(id))||typeof request.receiptId!=='string'||!request.receiptId||!request.sourceRevisions||typeof request.sourceRevisions!=='object'||Array.isArray(request.sourceRevisions)||request.entryIds.some(id=>typeof request.sourceRevisions[id]!=='string'||!request.sourceRevisions[id])||request.personalKeys!==undefined&&(!Array.isArray(request.personalKeys)||!request.personalKeys.length||request.personalKeys.some(key=>typeof key!=='string'||!key)))throw Error('The requested fingering consolidation does not match this library. Saved choices are retained.');
 return structuredClone(request);
}
