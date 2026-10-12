import test from 'node:test';
import assert from 'node:assert/strict';
import {FINGERTIPS_FILE,initialFingertips,parseFingertip,fingertipBytes,loadFingertips,validateFingertips,type FingertipFiles} from '../src/calibration-fingertips';
import {FingertipController} from '../src/calibration-fingertips-controller';
class Files implements FingertipFiles {
 bytes?:Uint8Array;names:string[]=[];hold=false;fail=false;pending?:()=>void;
 async read(name:string){this.names.push(name);return this.bytes;}
 async write(name:string,bytes:Uint8Array){this.names.push(name);if(this.hold)await new Promise<void>(r=>{this.pending=r;});if(this.fail)throw Error('Disk offline');this.bytes=new Uint8Array(bytes);}
}
const create=(files:Files,instrument:'janko-four-row'|'conventional-piano'='janko-four-row')=>{let i=0;return new FingertipController({files,load:{value:initialFingertips()},instrument,id:()=>`reading-${++i}`,now:()=>new Date('2026-10-11T12:00:00.000Z').toISOString()});};
test('signed percent and direct millimeters accept decimal domains without clamping or conversion',()=>{
 for(const raw of ['-1','-250.75','-.2','-1'+'0'.repeat(200),'+0.5','100','100.0'])assert.equal(parseFingertip(raw,'percent'),Number(raw));
 for(const raw of ['',' ','NaN','Infinity','-Infinity','1e2','0x10','101','100.0001','1.2.3','-1'+'0'.repeat(400)])assert.equal(parseFingertip(raw,'percent'),undefined);
 for(const raw of ['0','-0','12.5','.1','+2'])assert.equal(parseFingertip(raw,'millimeters'),Number(raw));
 for(const raw of ['-0.1','-100','none'])assert.equal(parseFingertip(raw,'millimeters'),undefined);
});
test('fresh drafts stay empty, references and methods retain distinct drafts; navigation does not record',()=>{
 const c=create(new Files());assert.equal(c.state.raw,'');assert.equal(c.state.reference,'second');c.setRaw('-12.5');
 c.selectPair(1);assert.equal(c.state.reference,null);c.selectReference('first');c.setRaw('35');c.selectReference('second');assert.equal(c.state.raw,'');c.setRaw('not yet');
 c.selectReference('first');assert.equal(c.state.raw,'35');c.selectMethod('millimeters');assert.equal(c.state.raw,'');c.selectReference('second');c.setRaw('5.7');
 c.selectMethod('percent');assert.equal(c.state.raw,'35');c.selectReference('second');assert.equal(c.state.raw,'not yet');c.move(-1);assert.equal(c.state.raw,'-12.5');assert.equal(c.state.archive.readings.length,0);
 c.setHand('LH');assert.equal(c.state.raw,'-12.5');assert.equal(c.state.hand,'LH');
 const piano=create(new Files(),'conventional-piano');piano.selectMethod('percent');assert.equal(piano.state.method,'millimeters');
});
test('blank, invalid and equal drafts commit only explicit save, preserving four pair navigation',async()=>{
 const files=new Files(),c=create(files);assert.equal(await c.saveAndNext(),false);assert.equal(files.names.length,0);assert.equal(c.state.pair,0);
 c.setRaw('101');assert.equal(await c.saveAndNext(),false);assert.equal(c.state.raw,'101');c.selectReference('both');assert.equal(c.state.raw,'100');assert.equal(await c.saveAndNext(),true);assert.equal(c.state.pair,1);
 c.selectMethod('millimeters');c.selectReference('both');assert.equal(c.state.raw,'0');c.setHand('LH');assert.equal(await c.saveAndNext(),true);
 assert.deepEqual(c.state.archive.readings.map(r=>[r.method,r.reference,r.value,r.hand]),[['percent','both',100,'RH'],['millimeters','both',0,'LH']]);assert.ok(files.names.every(n=>n===FINGERTIPS_FILE));
 c.move(100);assert.equal(c.state.pair,3);c.move(1);assert.equal(c.state.pair,3);c.move(-100);assert.equal(c.state.pair,0);
});
test('write acceptance gates advancement, duplicate saves, failed saves and modal lifecycle',async()=>{
 const files=new Files(),c=create(files);c.setRaw('-2');files.hold=true;const saving=c.saveAndNext();assert.equal(c.state.busy,true);assert.equal(c.state.archive.readings.length,0);assert.equal(c.state.pair,0);assert.equal(await c.saveAndNext(),false);c.move(1);c.setRaw('5');assert.equal(c.state.raw,'-2');
 let flushed=false;void c.flush().then(()=>{flushed=true;});await Promise.resolve();assert.equal(flushed,false);files.pending!();assert.equal(await saving,true);await c.flush();assert.equal(flushed,true);assert.equal(c.state.pair,1);assert.equal(c.state.archive.readings[0].value,-2);
 c.selectReference('first');c.setRaw('12.25');files.hold=false;files.fail=true;assert.equal(await c.saveAndNext(),false);assert.equal(c.state.pair,1);assert.equal(c.state.raw,'12.25');assert.equal(c.state.archive.readings.length,1);assert.match(c.state.error!,/Disk offline/);
 files.fail=false;files.hold=true;const afterBreak=c.saveAndNext();c.break();files.pending!();assert.equal(await afterBreak,true);assert.equal(c.state.pair,1);assert.equal(c.state.archive.readings.length,2);
 c.setRaw('13');const afterClose=c.saveAndNext();let emissions=0;c.subscribe(()=>emissions++);c.dispose();const count=emissions;files.pending!();assert.equal(await afterClose,true);assert.equal(emissions,count);assert.equal(await c.saveAndNext(),false);
 const reopened=new FingertipController({files,load:await loadFingertips(files),instrument:'janko-four-row'});reopened.selectPair(1);assert.equal(reopened.state.raw,'13');assert.equal(reopened.state.archive.readings.length,3);
});
test('unsupported or malformed saved bytes remain losslessly exportable and read-only',async()=>{
 for(const bytes of [new Uint8Array([0xff,0,0xfe]),new TextEncoder().encode('{"version":"future","readings":[]}'),new TextEncoder().encode('{')]){
  const files=new Files();files.bytes=bytes;const load=await loadFingertips(files);assert.ok(load.error);assert.deepEqual(load.raw,bytes);const c=new FingertipController({files,load,instrument:'janko-four-row'});c.setRaw('10');assert.equal(await c.saveAndNext(),false);assert.equal(c.state.readOnly,true);assert.deepEqual(files.bytes,bytes);assert.deepEqual(new Uint8Array(Buffer.from(JSON.parse(c.exportArchive()).data,'base64')),bytes);assert.deepEqual(files.names,[FINGERTIPS_FILE]);
 }
 const load=await loadFingertips({read:async()=>{throw Error('Access denied');}});assert.ok(load.error);assert.equal(load.raw,undefined);
});
test('append-only corrections preserve raw context and strict provenance on reopen',async()=>{
 const files=new Files(),c=create(files);c.setRaw('-3.25');await c.saveAndNext();c.selectPair(0);c.setRaw('-2.75');await c.saveAndNext();
 const loaded=await loadFingertips(files);assert.equal(loaded.value.readings.length,2);const opened=new FingertipController({files,load:loaded,instrument:'janko-four-row'});assert.equal(opened.state.raw,'-2.75');assert.equal(opened.state.archive.readings[0].raw,'-3.25');
 assert.deepEqual(validateFingertips(JSON.parse(new TextDecoder().decode(fingertipBytes(loaded.value)))),loaded.value);
 for(const mutate of [(a:any)=>a.readings.push(a.readings[0]),(a:any)=>a.readings[0].value=999,(a:any)=>a.readings[0].instrument='conventional-piano',(a:any)=>a.readings[0].illustration='unknown',(a:any)=>a.extra=true]){const a=structuredClone(loaded.value);mutate(a);assert.throws(()=>validateFingertips(a));}
});
