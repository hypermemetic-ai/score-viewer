import {unzipSync,strToU8} from 'fflate';
import {parseMusicXmlAsync,projectMusicXml,type HandPolicy} from '../vendor/iso-notation/src/musicxml';
import {renderScorePresentationAsync} from '../vendor/iso-notation/src/score-presentation';
import {approvedProductionJankoOptions} from '../vendor/iso-notation/src/render/janko/approved-production';
import {resolveJankoTokens} from '../vendor/iso-notation/src/render/janko/types';
import {APPROVED_SCORE_RENDERING_ENGINE,SCORE_RENDERING_RECIPE_VERSION,validateScoreRenderingRecipe} from '../vendor/iso-notation/src/render/janko/score-rendering-recipe';
import {archivePackage,hashBytes,importPackage} from './package';
import {publishPackage,publishPreparedNative} from './publication';
import {capturedReadingExecution,checkReadingExecution,type ReadingExecution} from './reading-execution';

const MAX_XML_BYTES=10_000_000;
export class MusicXmlImportRefusal extends Error {}
export interface MusicXmlAssets {font:{name:string;bytes:Uint8Array};notices:Record<string,Uint8Array>}

/** Plain MusicXML in UTF-8/UTF-16, or the root file of a compressed .mxl. */
export function musicXmlText(bytes:Uint8Array):string {
 if(bytes[0]===80&&bytes[1]===75){
  let total=0;const files=unzipSync(bytes,{filter:f=>{total+=f.originalSize;if(f.originalSize>MAX_XML_BYTES||total>4*MAX_XML_BYTES)throw new MusicXmlImportRefusal('This compressed MusicXML file is too large.');return true;}}),
   container=files['META-INF/container.xml'],root=container&&/<rootfile\b[^>]*\bfull-path\s*=\s*"([^"]+)"/.exec(decodeXml(container))?.[1];
  if(!root||!files[root])throw new MusicXmlImportRefusal('This compressed MusicXML file has no readable score.');
  return decodeXml(files[root]);
 }
 if(bytes.byteLength>MAX_XML_BYTES)throw new MusicXmlImportRefusal('This MusicXML file is larger than 10 MB.');
 return decodeXml(bytes);
}
function decodeXml(bytes:Uint8Array){
 const encoding=bytes[0]===0xff&&bytes[1]===0xfe?'utf-16le':bytes[0]===0xfe&&bytes[1]===0xff?'utf-16be':'utf-8';
 return new TextDecoder(encoding,{fatal:true}).decode(bytes).replace(/^\uFEFF/,'');
}

/** One printed piano part becomes a native .tuna archive. Hands come from the
 * printed staff (upper right, lower left) and are never calculated; the
 * player corrects them in the handedness editor. Pages use the approved
 * production engraving, and the package passes ordinary admission. */
export async function prepareMusicXmlScore(bytes:Uint8Array,assets:MusicXmlAssets,inputExecution:ReadingExecution={}):Promise<{bytes:Uint8Array;filename:string}> {
 const execution=capturedReadingExecution(inputExecution),inputSha256=await hashBytes(bytes);checkReadingExecution(execution);
 let written;
 try{written=await parseMusicXmlAsync(musicXmlText(bytes),'import.musicxml');}
 catch(error){if(error instanceof MusicXmlImportRefusal)throw error;throw new MusicXmlImportRefusal(`This MusicXML file can't be read yet: ${(error as Error).message}`);}
 checkReadingExecution(execution);
 const parts=written.parts?.length??new Set(written.measures.map(m=>m.part)).size;
 if(parts!==1)throw new MusicXmlImportRefusal(`This file contains ${parts} instruments. The score viewer opens one instrument at a time; export just the piano part.`);
 const part=written.measures[0].part,staves=[...new Set(written.events.filter(e=>e.kind!=='rest').map(e=>e.staff))].sort();
 if(staves.join()!=='1,2')throw new MusicXmlImportRefusal(`This part is written on ${staves.length} ${staves.length===1?'staff':'staves'}. MusicXML import currently reads two-staff piano scores.`);
 const hands:HandPolicy[]=[{part,staff:'1',hand:'RH',rationale:'printed upper staff',confidence:'contextual'},{part,staff:'2',hand:'LH',rationale:'printed lower staff',confidence:'contextual'}];
 let score;
 try{score=projectMusicXml(written,{id:`musicxml-${inputSha256}`,hands}).score;}
 catch(error){throw new MusicXmlImportRefusal(`This MusicXML file can't be read yet: ${(error as Error).message}`);}
 score.title||='Untitled score';score.composer??='';
 const source=strToU8(JSON.stringify(score)),sourceSha256=await hashBytes(source);
 let recipe=validateScoreRenderingRecipe({version:SCORE_RENDERING_RECIPE_VERSION,engineId:APPROVED_SCORE_RENDERING_ENGINE,sourceSha256,
  options:approvedProductionJankoOptions(),tokens:resolveJankoTokens({}),baseline:{pageSha256:['0'.repeat(64)],seatSha256:'0'.repeat(64)}},{sourceSha256});
 let rendered;
 try{rendered=await renderScorePresentationAsync(score,recipe,execution);}
 catch(error){if((error as Error).name==='AbortError')throw error;throw new MusicXmlImportRefusal(`This score can't be engraved yet: ${(error as Error).message}`);}
 checkReadingExecution(execution);
 if(rendered.lint.violations.length)throw new MusicXmlImportRefusal(`This score can't be engraved cleanly yet (${rendered.lint.violations.length} layout problems).`);
 recipe=validateScoreRenderingRecipe({...recipe,baseline:{pageSha256:await Promise.all(rendered.rawPages.map(hashBytes)),seatSha256:await hashBytes(JSON.stringify(rendered.seats))}},{sourceSha256});
 const published=await publishPreparedNative({source,metadata:{title:score.title,composer:score.composer,provenance:[`MusicXML import ${inputSha256}; hands from printed staves.`]},
  engineVersion:APPROVED_SCORE_RENDERING_ENGINE,createdAt:new Date().toISOString(),font:assets.font,notices:assets.notices,
  presentations:(['conventional-piano','janko-four-row'] as const).map(layoutId=>({layoutId,seats:rendered.seats,pages:rendered.pages}))});
 checkReadingExecution(execution);
 // Retain the recipe that reproduces these pages, as calculated editions require.
 const m=structuredClone(published.package.manifest),files={...published.package.files},recipeBytes=strToU8(JSON.stringify(recipe));delete files['manifest.json'];
 files['rendering-recipe.json']=recipeBytes;m.files['rendering-recipe.json']=await hashBytes(recipeBytes);m.renderingRecipe='rendering-recipe.json';
 for(const d of Object.values(m.presentations??{}))if(d)d.renderingRecipe='rendering-recipe.json';
 const final=await publishPackage(await importPackage(archivePackage(m,files),{allowLegacyTempo:true}));
 checkReadingExecution(execution);
 return {bytes:final.bytes,filename:final.filename};
}
