import type {IsoLayoutOptions} from '../vendor/iso-notation/src/score-presentation';

// The page and spacing dimensions a reading may choose, as the shared reading
// admission lists them. Every other option a reading records, and every token,
// is the shared engraving rule of the day it was drawn: no reading producer
// chooses tokens.
const READING_DIMENSIONS=['pageWidth','pageHeight','pageMargin','pageMarginLeft','pageMarginRight','pageMarginTop','pageMarginBottom',
  'headerHeight','footerHeight','runningHeaderHeight','measuresPerSystem','systemsPerPage','measureInset','interStaffGap'] as const;
/** A reading drawn afresh keeps its own page dimensions and takes the current
 * shared engraving rules and tokens, so a rule changed since (slur routing, a
 * stroke weight) is not replayed from the earlier archive. */
export function currentReadingOptions(options:Partial<IsoLayoutOptions>):Partial<IsoLayoutOptions>{
  return Object.fromEntries(READING_DIMENSIONS.filter(key=>Object.hasOwn(options,key)).map(key=>[key,options[key]])) as Partial<IsoLayoutOptions>;
}
