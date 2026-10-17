import {HandPresentationError} from '../vendor/iso-notation/src/score-presentation';

/** The viewer no longer calculates fingers or hands, so it never asks a player
 * to recalculate an edition the current engraving can't draw. */
export const UNDRAWABLE_CALCULATED_EDITION='This edition was made by the fingering calculator, which the viewer no longer offers, and it can no longer be drawn. It stays saved.';

/** A saved calculated edition that the current engraving refuses to draw. */
export const undrawableCalculatedEdition=(error:unknown)=>error instanceof HandPresentationError&&error.code==='incompatible-recipe';
