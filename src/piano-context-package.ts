import {strToU8,zipSync} from 'fflate';
import {scoreWithCalculationContext,validatePianoCalculationContext,type PianoCalculationContext} from '../vendor/iso-notation/src/model/piano-calculation-context';
import {hashBytes,importPackage,type ScorePackage,type Manifest} from './package';
import {publishPackage} from './publication';

/** Isolated source-bound preparation, never a finger-readiness result. Existing
 * calculated layers cannot be re-pinned under a different performance clock. */
export async function preparePianoCalculationContext(p:ScorePackage,context:PianoCalculationContext):Promise<Uint8Array> {
  const published=await publishPackage(p),prior=published.package,m=structuredClone(prior.collectionManifest??prior.manifest);
  if(m.version!==2||!prior.sourceScore||!m.sourceSha256)throw Error('Piano calculation context requires a linked native source');
  const checked=validatePianoCalculationContext(context,m.sourceSha256,prior.sourceScore);
  if(JSON.stringify(m.calculationContext)===JSON.stringify(checked))return published.bytes;
  if(Object.values(m.presentations??{}).some(d=>d?.fingers))
    throw Error('A changed calculation context requires fresh complete finger replay; existing choices retained');
  const files:Record<string,Uint8Array>={...prior.files};delete files['manifest.json'];
  m.calculationContext=checked;
  for(const d of Object.values(m.presentations??{})){
    if(!d)continue;
    const score=JSON.parse(new TextDecoder().decode(files[d.score]));
    files[d.score]=strToU8(JSON.stringify(scoreWithCalculationContext(score,checked,m.sourceSha256)));
    d.revision=await hashBytes(files[d.score]);
    d.calculationContext=checked;
  }
  const primary=m.presentations![m.keyboardLayout!]!;
  m.revision=m.semanticSha256=primary.revision;
  m.files=Object.fromEntries(await Promise.all(Object.entries(files).map(async([name,bytes])=>[name,await hashBytes(bytes)])));
  files['manifest.json']=strToU8(JSON.stringify(m satisfies Manifest));
  const bytes=zipSync(files,{level:9});await importPackage(bytes);
  return bytes;
}
