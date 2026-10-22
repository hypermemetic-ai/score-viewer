import type {AdmittedReading} from '../vendor/iso-notation/src/score-presentation';

/** The pages a recipe names: its source and the exact page and seat bytes it
 * was made from. Two engraves with the same name made the same pages. */
type NamedRecipe={sourceSha256:string;baseline:{pageSha256:readonly string[];seatSha256:string}};
const name=(recipe:NamedRecipe)=>JSON.stringify([recipe.sourceSha256,recipe.baseline.pageSha256,recipe.baseline.seatSha256]);

/** An edition engraved again (to rebuild it, transpose it or give it a
 * keyboard layout) is opened next, often with the player's own hands. Its
 * reading engrave is kept here, by the pages it made, so hand editing starts
 * from it instead of engraving the score a second time. Only the latest few
 * are kept: an edition engraves at most one reading per keyboard layout. */
const readings=new Map<string,AdmittedReading>();
const KEPT=2;
export function rememberEngravedReading(recipe:NamedRecipe,reading:AdmittedReading){
 const key=name(recipe);readings.delete(key);readings.set(key,reading);
 while(readings.size>KEPT)readings.delete(readings.keys().next().value!);
}
/** The reading engraved for these pages, given up to the one caller that takes it. */
export function takeEngravedReading(recipe:NamedRecipe|undefined):AdmittedReading|undefined{
 if(!recipe?.baseline)return;
 const key=name(recipe),reading=readings.get(key);readings.delete(key);return reading;
}
