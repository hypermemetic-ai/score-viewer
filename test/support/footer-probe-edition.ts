/** Builds fixtures/footer-probe-calculated-edition.tuna: the footer probe's
 * saved calculated edition of the public authored fixture, on both keyboards.
 * Nothing is calculated. Each keyboard keeps the hands and fingers its earlier
 * saved edition carries; only its pages are drawn again by the pinned engine,
 * so the edition opens through its receipt at the current ISO pin.
 *
 *   npx tsx test/support/footer-probe-edition.ts <earlier edition> <output>
 */
import {readFileSync,writeFileSync} from 'node:fs';
import {importPackage,readEditionContent,selectPresentation,type ScorePackage} from '../../src/package';
import {rebuildEdition} from '../../src/edition-rebuild';
import {prepareCalculatedEdition} from './calculator';
import {pianoRequestAuthority} from '../../src/piano-request-authority';
import {scoreWithCalculationContext} from '../../vendor/iso-notation/src/model/piano-calculation-context';
import {packagePianoPresentation} from './piano-package-presentation';

export async function footerProbeEdition(earlierBytes:Uint8Array):Promise<Uint8Array>{
 const earlier=await readEditionContent(earlierBytes);
 // The current engine's plain edition of the same source is the base each
 // keyboard's saved hands and fingers are drawn onto.
 let bytes=(await rebuildEdition(earlierBytes)).bytes;
 for(const layout of [earlier.keyboardLayout!,...(earlier.availablePresentations??[]).filter(id=>id!==earlier.keyboardLayout)].reverse()){
  const saved=await selectPresentation(earlier,layout),layer=saved.fingerLayer;
  if(!layer)throw Error(`The earlier ${layout} view carries no fingers.`);
  const prior:ScorePackage=await selectPresentation(await importPackage(bytes),layout),bound={...structuredClone(layer),revision:prior.manifest.revision},
   source=scoreWithCalculationContext(prior.sourceScore!,prior.calculationContext,prior.sourceSha256!),
   // The guards the reader will apply on opening: the layer's own provided choices.
   constraints=pianoRequestAuthority(prior,source,layout,bound,undefined,'calculate'),
   prepared=await prepareCalculatedEdition({...prior,keyboardLayout:layout},bound,'calculate',constraints),r=prepared.result;
  bytes=await packagePianoPresentation(prior,{layoutId:layout,sourceSha256:prior.sourceSha256!,score:JSON.stringify(r.score),seats:JSON.stringify(r.seats),pages:r.pages,
   layer:bound,effectiveHandSha256:saved.effectiveHandSha256!,engineVersion:prepared.recipe.engineId,recipe:prepared.recipe,calculatedHandReceipt:prepared.receipt,
   preparationRequest:{handPolicy:'calculate',maxExpansions:200_000}});
 }
 return bytes;
}

if(process.argv[1]&&import.meta.url.endsWith(process.argv[1].split('/').pop()!)&&process.argv.length===4)
 writeFileSync(process.argv[3],await footerProbeEdition(new Uint8Array(readFileSync(process.argv[2]))));
