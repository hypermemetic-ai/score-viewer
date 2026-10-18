import {strFromU8,strToU8} from 'fflate';
import {renderScorePresentationAsync,type AdmittedReading} from '../vendor/iso-notation/src/score-presentation';
import {approvedProductionIsoOptions} from '../vendor/iso-notation/src/render/iso/approved-production';
import {resolveIsoTokens,type IsoLayoutOptions,type IsoTokens} from '../vendor/iso-notation/src/render/iso/types';
import {APPROVED_SCORE_RENDERING_ENGINE,SCORE_RENDERING_RECIPE_VERSION,validateScoreRenderingRecipe} from '../vendor/iso-notation/src/render/iso/score-rendering-recipe';
import type {QuantizedGridScore} from '../vendor/iso-notation/src/model/types';
import {archivePackage,hashBytes,importPackage,type Metadata} from './package';
import {publishPackage,publishPreparedNative} from './publication';
import {checkReadingExecution,type ReadingExecution} from './reading-execution';
import {withLayoutPeer} from './layout-peer';

export interface NativePianoAssets {font:{name:string;bytes:Uint8Array};notices:Record<string,Uint8Array>}
export interface NativePianoPreparation {
 metadata:Metadata;
 assets:NativePianoAssets;
 /** Already captured by the caller; checked between stages. */
 execution?:ReadingExecution;
 /** Approved-production option and token additions, such as a source's own
  * duration engraving controls. The shared production policy always wins. */
 options?:Partial<IsoLayoutOptions>;
 tokens?:Partial<IsoTokens>;
 /** How a refusal reaches the caller's players. */
 refusal?:new(message:string)=>Error;
}

/** The shared tail of native piano preparation. The score's own hands are
 * kept exactly; nothing is calculated or inferred. Pages use the approved
 * production engraving with zero lint violations, both keyboards get the
 * same pages, and the recipe that reproduces them is retained, as calculated
 * editions and personal hand editing require. The package passes ordinary
 * admission. The reading engrave is returned too, so hand editing can start
 * from it instead of engraving the score again. */
export async function publishNativePianoScore(score:QuantizedGridScore,input:NativePianoPreparation):Promise<{bytes:Uint8Array;filename:string;reading:AdmittedReading}> {
 const {execution,assets}=input,Refusal=input.refusal??Error;
 const source=strToU8(JSON.stringify(score)),sourceSha256=await hashBytes(source);
 let recipe=validateScoreRenderingRecipe({version:SCORE_RENDERING_RECIPE_VERSION,engineId:APPROVED_SCORE_RENDERING_ENGINE,sourceSha256,
  options:approvedProductionIsoOptions(input.options),tokens:resolveIsoTokens(input.tokens??{}),baseline:{pageSha256:['0'.repeat(64)],seatSha256:'0'.repeat(64)}},{sourceSha256});
 // The score as the package stores it: hand editing reads it from there, and
 // takes this engrave as its own only for that very score.
 let rendered;
 try{rendered=await withLayoutPeer(layoutPeer=>renderScorePresentationAsync(JSON.parse(strFromU8(source)),recipe,{...execution,layoutPeer}));}
 catch(error){if((error as Error).name==='AbortError')throw error;throw new Refusal(`This score can't be engraved yet: ${(error as Error).message}`);}
 checkReadingExecution(execution);
 if(rendered.lint.violations.length)throw new Refusal("This score can't be engraved cleanly yet: some of its notation doesn't fit the page layout.");
 recipe=validateScoreRenderingRecipe({...recipe,baseline:{pageSha256:await Promise.all(rendered.rawPages.map(hashBytes)),seatSha256:await hashBytes(JSON.stringify(rendered.seats))}},{sourceSha256});
 const published=await publishPreparedNative({source,metadata:input.metadata,
  engineVersion:APPROVED_SCORE_RENDERING_ENGINE,createdAt:new Date().toISOString(),font:assets.font,notices:assets.notices,
  presentations:(['conventional-piano','janko-four-row'] as const).map(layoutId=>({layoutId,seats:rendered.seats,pages:rendered.pages}))});
 checkReadingExecution(execution);
 // Retain the recipe that reproduces these pages, so Transpose can engrave
 // the moved score with the same contract.
 const m=structuredClone(published.package.manifest),files={...published.package.files},recipeBytes=strToU8(JSON.stringify(recipe));delete files['manifest.json'];
 files['rendering-recipe.json']=recipeBytes;m.files['rendering-recipe.json']=await hashBytes(recipeBytes);m.renderingRecipe='rendering-recipe.json';
 for(const d of Object.values(m.presentations??{}))if(d)d.renderingRecipe='rendering-recipe.json';
 const final=await publishPackage(await importPackage(archivePackage(m,files),{allowLegacyTempo:true}));
 checkReadingExecution(execution);
 // Only what hand editing reads, so the rest of the engrave is let go.
 return {bytes:final.bytes,filename:final.filename,reading:{score:rendered.score,layouts:rendered.layouts,rawPages:rendered.rawPages}};
}
