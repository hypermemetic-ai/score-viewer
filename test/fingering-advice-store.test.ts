import test from 'node:test';import assert from 'node:assert/strict';
import {browserAssistanceStore} from '../src/durable-assistance-store';
import {personalMemoryDocument} from '../src/personal-memory-session';
import {createAdviceCorpusState} from '../src/fingering-advice';
import {saveAdviceCorpus,storedAdviceCorpus,adviceCorpusDocument} from '../src/fingering-advice-store';
const store=()=>{const data=new Map<string,string>();return browserAssistanceStore({getItem:k=>data.get(k)??null,setItem:(k,v)=>{data.set(k,v);}},{request:async(_name,work)=>work()});};
const input=()=>({version:1 as const,memoryRevision:3,contextKey:'a'.repeat(64),state:createAdviceCorpusState()});
test('derived advice survives reload and never changes personal memory or other manifest records',async()=>{
 const s=store();await s.commit({expectedRevision:0,changes:{[personalMemoryDocument]:{revision:3},personal:{finger:2}}});
 assert.equal(await saveAdviceCorpus(s,input(),()=>true),true);const snapshot=await s.read();assert.deepEqual(storedAdviceCorpus(snapshot,3,'a'.repeat(64)),createAdviceCorpusState());
 assert.deepEqual(snapshot.documents.personal,{finger:2});assert.deepEqual(snapshot.documents[personalMemoryDocument],{revision:3});assert.equal(storedAdviceCorpus(snapshot,4,'a'.repeat(64)),undefined);assert.equal(storedAdviceCorpus(snapshot,3,'b'.repeat(64)),undefined);
});
test('new personal revision or cancelled generation cannot activate obsolete observations',async()=>{
 const s=store();await s.commit({expectedRevision:0,changes:{[personalMemoryDocument]:{revision:4}}});
 assert.equal(await saveAdviceCorpus(s,input(),()=>true),false);assert.equal((await s.read()).documents[adviceCorpusDocument],undefined);
 const current={...input(),memoryRevision:4};assert.equal(await saveAdviceCorpus(s,current,()=>false),false);assert.equal((await s.read()).documents[adviceCorpusDocument],undefined);
});
test('a CAS race with a new decision rejects old evidence rather than retrying it against new authority',async()=>{
 const s=store();await s.commit({expectedRevision:0,changes:{[personalMemoryDocument]:{revision:3}}});let raced=false;
 const wrapper={read:s.read,commit:async(request:any)=>{if(!raced){raced=true;await s.commit({expectedRevision:request.expectedRevision,changes:{[personalMemoryDocument]:{revision:4}}});}return s.commit(request);}};
 assert.equal(await saveAdviceCorpus(wrapper,input(),()=>true),false);assert.equal((await s.read()).documents[adviceCorpusDocument],undefined);
});

test('fresh startup probes only the supported assistance store and a staged consolidation stays explicitly scoped',async()=>{
 const {pendingPersonalConsolidation,personalConsolidationRequestDocument}=await import('../src/personal-consolidation-request');const s=store();
 assert.equal(await pendingPersonalConsolidation(s,['piece']),undefined);
 const request={version:1,entryIds:['piece'],receiptId:'one-time',sourceRevisions:{piece:'source-revision'}};
 await s.commit({expectedRevision:0,changes:{[personalConsolidationRequestDocument]:request}});
 assert.deepEqual(await pendingPersonalConsolidation(s,['piece']),request);await assert.rejects(pendingPersonalConsolidation(s,['another']),/does not match this library/);
});
test('completed consolidation request stays inert even after its score is removed',async()=>{
 const {pendingPersonalConsolidation,personalConsolidationRequestDocument}=await import('../src/personal-consolidation-request');const s=store();
 await s.commit({expectedRevision:0,changes:{[personalConsolidationRequestDocument]:{version:1,entryIds:['removed'],receiptId:'done',sourceRevisions:{removed:'old'}},[personalMemoryDocument]:{revision:2,receipts:{done:{completed:true}}}}});
 assert.equal(await pendingPersonalConsolidation(s,[]),undefined);
});
