import {dependencyRevision} from '../docs/source-provenance.json';

/** The engraver this build draws piano pages with: the pinned ISO notation
 * revision (`npm test` and `npm run build` check the pin against the
 * submodule first). Every keyboard view an edition saves records the engraver
 * that drew its pages (`PresentationDescriptor.engraver`), so pages an
 * earlier engraver drew are engraved again once after each engraver update,
 * even when no policy key changed; see `savedPagesBehindPolicy`. */
export const CURRENT_ENGRAVER=`iso-notation ${dependencyRevision}`;
