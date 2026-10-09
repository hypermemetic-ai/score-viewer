import {readFile,writeFile,stat} from 'node:fs/promises';
import {resolve} from 'node:path';
import {parseArgs} from 'node:util';
import {parseMusicXml} from '../vendor/iso-notation/src/import/musicxml/parse';
import {projectMusicXml} from '../vendor/iso-notation/src/import/musicxml/project';
import {prepareReadingPackage} from '../src/reading-package';
import {importPackageForReading} from '../src/package';
import {isPitchedEvent} from '../vendor/iso-notation/src/model/musical-event';

const usage='Usage: node --import tsx scripts/prepare-reading-score.ts source.musicxml output.tuna --part=PART --center-midi=36 --guide-midi=24,36,48';
async function main():Promise<void> {
  const {positionals,values}=parseArgs({allowPositionals:true,options:{part:{type:'string'},'center-midi':{type:'string'},'guide-midi':{type:'string'}}});
  if(positionals.length!==2||!values.part||values['center-midi']===undefined||!values['guide-midi'])throw Error(usage);
  const [input,output]=positionals;
  if(!output.endsWith('.tuna')||input===output)throw Error('Choose a new .tuna output file.');
  const center=Number(values['center-midi']),guides=values['guide-midi'].split(',').map(Number);
  if(!Number.isInteger(center)||center<0||center>127||!guides.length||guides.length>32||
    guides.some(p=>!Number.isInteger(p)||p<0||p>127)||!guides.includes(center)||new Set(guides).size!==guides.length)
    throw Error('Center and guides must be distinct MIDI pitches from 0 to 127, including the center.');
  if((await stat(input)).size>10_000_000)throw Error('MusicXML input exceeds 10 MB.');
  const xml=new TextDecoder('utf-8',{fatal:true}).decode(await readFile(input)),written=parseMusicXml(xml,'source.musicxml');
  if(!written.parts?.some(p=>p.id===values.part))throw Error('The selected part is absent from this MusicXML file.');
  const {score,coverage}=projectMusicXml(written,{id:'local-'+written.rawSha256,readingPolicy:{version:'instrument-reading-v1',
    partId:values.part,centerPitch:center-12,guidePitches:guides.map(p=>p-12),pitchFolding:'literal',stemPolicy:'register'}});
  const root=new URL('../',import.meta.url),notices:Record<string,Uint8Array>={};
  for(const name of ['URW-base35-COPYING','URW-base35-LICENSE','URW-base35-provenance.md'])
    notices['licenses/'+name]=await readFile(new URL('licenses/'+name,root));
  const bytes=await prepareReadingPackage({score,metadata:{title:score.title,composer:score.composer,provenance:coverage},
    createdAt:new Date().toISOString(),font:{name:'fonts/URWGothic-Demi.otf',bytes:await readFile(new URL('src/URWGothic-Demi.otf',root))},notices});
  const p=await importPackageForReading(bytes);
  await writeFile(output,bytes,{flag:'wx'});
  console.log(JSON.stringify({output:resolve(output),
    events:score.notes.length,pitched:score.notes.filter(isPitchedEvent).length,unpitched:score.notes.filter(e=>!isPitchedEvent(e)).length,
    pages:p.pages.length,centerMidi:center,guideMidi:guides,coverage},null,2));
}
main().catch(error=>{console.error((error as Error).message);process.exitCode=1;});
