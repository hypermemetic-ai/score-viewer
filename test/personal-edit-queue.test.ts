import {test} from 'node:test';
import assert from 'node:assert/strict';
import {PersonalEditQueue} from '../src/personal-edit-queue';

test('queued snapshots reserve choices without waiting for disk and persist in order',async()=>{
 let release!:()=>void;const gate=new Promise<void>(resolve=>release=resolve),written:string[]=[];
 const queue=new PersonalEditQueue('source-A',async(value:{owner:string;hand:string},sequence)=>{if(sequence===1)await gate;written.push(`${value.owner}:${value.hand}`);});
 const first={owner:'a',hand:'RH'},a=queue.accept(first);first.owner='wrong';
 const b=queue.accept({owner:'b',hand:'LH'});
 assert.deepEqual(queue.recovery.map(r=>r.snapshot.owner),['a','b']);
 assert.deepEqual(written,[]);release();await Promise.all([a.saved,b.saved]);
 assert.deepEqual(written,['a:RH','b:LH']);assert.deepEqual(queue.recovery,[]);
});

test('failure retains all unwritten intentions, blocks unsafe edits and retries ordered snapshots',async()=>{
 let fail=true;const written:number[]=[];
 const queue=new PersonalEditQueue('source-A',async(value:number)=>{if(fail)throw Error('disk unavailable');written.push(value);});
 const a=queue.accept(1),b=queue.accept(2);
 await assert.rejects(a.saved,/disk unavailable/);await assert.rejects(b.saved,/disk unavailable/);
 assert.deepEqual(queue.recovery.map(r=>r.snapshot),[1,2]);assert.throws(()=>queue.accept(3),/paused/);
 fail=false;await queue.retry();assert.deepEqual(written,[1,2]);await queue.flush();
});
