import test from 'node:test';
import assert from 'node:assert/strict';
import {getPiano,parseVolume,pianoStatusText,startingStatus,trackVolume,volumeText} from '../src/piano-acquire';
import {defaultPianoPreferences,readPianoPreferences,type PianoPreferences} from '../src/piano-preferences';
import type {PianoBankStatus} from '../src/piano-host';

const notInstalled:PianoBankStatus={supported:true,installed:false,phase:'not-installed',progress:null,message:'Hear your keyboard through this computer. One 1.7 GB download, then it works offline.',cancellable:false};
const ready:PianoBankStatus={...notInstalled,installed:true,phase:'ready',message:'Piano installed. Works offline.'};
function player(result:()=>Promise<PianoBankStatus>,start:Partial<PianoPreferences>={}){
 let preferences={...defaultPianoPreferences(),volume:.42,latencyTier:2 as const,...start};const saved:PianoPreferences[]=[];let downloads=0;
 return {saved,get downloads(){return downloads;},get preferences(){return preferences;},
  api:{download:()=>{downloads++;return result();},preferences:()=>preferences,save:async(value:PianoPreferences)=>{saved.push(value);preferences=value;}}};
}

test('one press installs the piano and turns its sound on, keeping volume and latency',async()=>{
 const p=player(async()=>ready);
 assert.deepEqual(await getPiano(p.api),ready);
 assert.equal(p.downloads,1);
 assert.deepEqual(p.saved,[{version:1,enabled:true,volume:.42,latencyTier:2,levels:2}]);
});

test('a cancelled, interrupted or refused download leaves sound and saved choices alone',async()=>{
 for(const bank of [
  {...notInstalled,phase:'cancelled',message:'Piano installation cancelled.'},
  {...notInstalled,phase:'error',message:"Can't reach the piano download. Check the internet connection. Press Download piano to continue where it stopped."},
  {...notInstalled,phase:'error',message:'The downloaded piano differs from the one this viewer knows, so it was not installed. Press Download piano to try again.'},
 ]){
  const p=player(async()=>bank);
  assert.deepEqual(await getPiano(p.api),bank);
  assert.deepEqual(p.saved,[]);assert.equal(p.preferences.enabled,false);
  assert.equal(pianoStatusText(bank),bank.message,'the reason is shown as the native side gives it');
 }
 // A failed command (for example a second press while one runs) reaches the caller unchanged.
 const busy=player(async()=>{throw Error('Piano installation is already running.');});
 await assert.rejects(getPiano(busy.api),/already running/);
 assert.deepEqual(busy.saved,[]);
});

test('an already installed piano is not downloaded again and sound already on is not saved again',async()=>{
 const on=player(async()=>ready,{enabled:true});
 await getPiano(on.api);
 assert.deepEqual(on.saved,[]);
 assert.equal(pianoStatusText(ready),'','a ready piano needs no status line');
});

test('if sound cannot start after installing, the piano stays installed and the reason is kept',async()=>{
 const warnings:string[]=[];const p=player(async()=>ready);
 p.api.save=async()=>{throw Error('Its sound output did not start.');};
 assert.deepEqual(await getPiano(p.api,message=>warnings.push(message)),ready);
 assert.deepEqual(warnings,['Its sound output did not start.']);
});

test('progress reads as the pianist sees it, from the first instant of a press',()=>{
 const download=startingStatus(notInstalled,'download');
 assert.equal(pianoStatusText(download),'Downloading piano (1.7 GB)… 0%');
 assert.equal(download.cancellable,true);
 assert.equal(pianoStatusText({...download,progress:42}),'Downloading piano (1.7 GB)… 42%');
 assert.equal(pianoStatusText({...download,phase:'checking',message:'Checking piano…',progress:7}),'Checking piano… 7%');
 assert.equal(pianoStatusText(startingStatus(notInstalled,'file')),'Choose the piano ZIP.');
 assert.equal(pianoStatusText(notInstalled),notInstalled.message);
 assert.equal(pianoStatusText(download,'Piano volume must be 0 to 100%.'),'Piano volume must be 0 to 100%.','an entry error wins');
 assert.equal(pianoStatusText(ready,'', 'Its sound output did not start.'),'Its sound output did not start.');
});

test('the volume track sets whole percents from 0 to 100 and the field reads them back exactly',()=>{
 assert.equal(trackVolume(100,100,200),0);
 assert.equal(trackVolume(300,100,200),1);
 assert.equal(trackVolume(190,100,200),.45);
 assert.equal(trackVolume(191,100,200),.46,'rounded to the nearest percent');
 assert.equal(trackVolume(-50,100,200),0);assert.equal(trackVolume(900,100,200),1);
 assert.equal(trackVolume(150,100,0),0,'an unlaid-out track never yields NaN');
 for(const volume of [0,.45,.7,1])assert.equal(parseVolume(volumeText(volume)),volume);
 assert.equal(volumeText(.123456),'12.3456','an exact saved value is shown, not rounded away');
 assert.equal(parseVolume(' 55 '),.55);assert.equal(parseVolume('.5'),.005);
 for(const text of ['','-1','101','5%','abc','1e2'])assert.equal(parseVolume(text),undefined,text);
 // A track-set volume is a valid saved preference.
 assert.equal(readPianoPreferences({version:1,enabled:false,volume:trackVolume(190,100,200),latencyTier:0}).volume,.45);
});
