import {conservativeMaterialBytes,PACKAGE_MATERIAL_BUDGET_BYTES} from './package-material';

export const GUITAR_PRO_SELECTION_TOO_LARGE='This selection is too large to prepare together. Import fewer tracks.';

/** Retained parts plus the current pending owned material share one counter.
 * Recompute per stage so expired transient conversion graphs are not retained
 * by accounting. No caller can raise the ordinary 64 MiB selection budget. */
export function assertGuitarProStagedMaterial(retained:unknown,pending:unknown):void {
 if(conservativeMaterialBytes({retained,pending},PACKAGE_MATERIAL_BUDGET_BYTES)>PACKAGE_MATERIAL_BUDGET_BYTES)
  throw Error(GUITAR_PRO_SELECTION_TOO_LARGE);
}
