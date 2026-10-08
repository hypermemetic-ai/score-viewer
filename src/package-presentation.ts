import {strToU8,zipSync} from 'fflate';
import {hashBytes,type ScorePackage} from './package';
import type {PreparedConventionalPresentation} from './presentation-generation';
import type {ConventionalFingerLayer} from '../vendor/iso-notation/src/model/conventional-finger-layer';

// Archive assembly preserves checked historical presentations as well as fresh
// action-v2 results. It does not create or certify a physical replay itself.
export type PresentationPackageInput=Omit<PreparedConventionalPresentation,'layer'|'replay'> & {layer:ConventionalFingerLayer};

/** Construct a new immutable archive before the library pointer is changed.
 * Every other keyboard presentation and the original source bytes survive. */
export async function packagePresentation(p:ScorePackage,next:PresentationPackageInput):Promise<Uint8Array> {
  const original=p.collectionManifest??p.manifest,sourcePath=original.sourceScore??'score.json',source=p.files[sourcePath];
  if(!source||await hashBytes(source)!==next.sourceSha256)throw Error('Calculated presentation has a different source.');
  const files:Record<string,Uint8Array>={...p.files,'source-score.json':source,'score.json':strToU8(next.score),
    'seats.json':strToU8(next.seats),'fingers.json':strToU8(JSON.stringify(next.layer)),'rendering-recipe.json':strToU8(JSON.stringify(next.recipe))};
  delete files['manifest.json'];
  const presentations={...(original.presentations??{})};
  if(original.version===1){
    if(!p.fingerLayer||p.fingerLayer.version!=='physical-attack-finger-layer-v1'||p.fingerLayer.physicalRowOrder!=='rr-even-far-last-v1')
      throw Error('Generation needs a declared compatible keyboard presentation; existing score is retained.');
    const prefix='presentations/janko-four-row/';
    for(const name of ['score.json','seats.json','fingers.json',...original.pages])files[prefix+name]=p.files[name];
    files[prefix+'rendering-recipe.json']=strToU8(JSON.stringify(next.recipe));
    presentations['janko-four-row']={layoutId:'janko-four-row',score:prefix+'score.json',seats:prefix+'seats.json',fingers:prefix+'fingers.json',
      pages:original.pages.map(name=>prefix+name),renderingRecipe:prefix+'rendering-recipe.json',revision:original.revision,
      profileId:p.fingerLayer.profileId as string,profileSha256:p.fingerLayer.profileSha256 as string,
      effectiveHandSha256:p.effectiveHandSha256!,layerSourceHash:p.fingerLayer.sourceHash,engineVersion:original.engineVersion};
  } else {
    const companion=presentations['janko-four-row'];
    if(companion){
      const prefix='presentations/janko-four-row/';
      const relocate=(name:string)=>{
        const target=prefix+name;
        const bytes=p.files[name];
        if(!bytes)throw Error('The retained keyboard presentation is incomplete.');
        files[target]=bytes;
        return target;
      };
      // A Jankó-primary v2 archive may use root paths that the new member
      // replaces. Copy those original bytes before updating its descriptor.
      const replaced=new Set(['score.json','seats.json','fingers.json','rendering-recipe.json',...next.pages.map((_,i)=>`pages/${i+1}.svg`)]);
      if([companion.score,companion.seats,companion.fingers,companion.renderingRecipe,...companion.pages].some(name=>name&&replaced.has(name))){
        presentations['janko-four-row']={...companion,score:relocate(companion.score),seats:relocate(companion.seats),
          fingers:companion.fingers?relocate(companion.fingers):undefined,
          renderingRecipe:companion.renderingRecipe?relocate(companion.renderingRecipe):undefined,
          pages:companion.pages.map(relocate)};
      }
    }
  }
  // The conventional member always occupies the root. Existing companion
  // paths remain untouched, including their glyph inventory and layer bytes.
  next.pages.forEach((svg,index)=>files[`pages/${index+1}.svg`]=strToU8(svg));
  const selected={layoutId:'conventional-piano' as const,score:'score.json',seats:'seats.json',fingers:'fingers.json',pages:next.pages.map((_,i)=>`pages/${i+1}.svg`),
    renderingRecipe:'rendering-recipe.json',revision:next.semanticSha256,profileId:next.layer.profileId,profileSha256:next.layer.profileSha256,
    effectiveHandSha256:next.effectiveHandSha256,layerSourceHash:next.layer.sourceHash,engineVersion:next.recipe.engineId};
  presentations['conventional-piano']=selected;
  const hashes=Object.fromEntries(await Promise.all(Object.entries(files).map(async([name,bytes])=>[name,await hashBytes(bytes)])));
  const manifest={...original,version:2,sourceScore:'source-score.json',sourceRevision:next.sourceSha256,sourceSha256:next.sourceSha256,
    keyboardLayout:selected.layoutId,revision:selected.revision,semanticSha256:selected.revision,layerSourceHash:selected.layerSourceHash,
    profileId:selected.profileId,profileSha256:selected.profileSha256,effectiveHandSha256:selected.effectiveHandSha256,engineVersion:selected.engineVersion,
    pages:selected.pages,renderingRecipe:selected.renderingRecipe,presentations,files:hashes,createdAt:new Date().toISOString()};
  files['manifest.json']=strToU8(JSON.stringify(manifest));
  return zipSync(files,{level:9});
}
