/** ISO's historical fingering studio (scripts/lib/fingering-studio-review.ts)
 * replays a frozen No. 14 edition and refuses unless its pages come back byte
 * for byte. ISO #388, pinned at bee8c67, seats dynamics by their own music,
 * which moves the frozen No. 14 systems, so the studio refuses that replay.
 * Saved pages are derived output, not a byte-identity gate (owner direction,
 * 2026-10-17): the reader engraves such an edition again from its content
 * (docs/saved-edition-reengraving.md). Tests that need the studio's frozen
 * replay are recorded as todo with this reason. */
export const frozenNo14StudioRefused='ISO #388 (pin bee8c67) moves the frozen No. 14 systems, so the historical fingering studio refuses to replay them';

/** True only for the studio's own frozen-replay refusal. */
export const isFrozenNo14StudioRefusal=(error:unknown)=>error instanceof Error&&error.message==='The real-engine recipe does not reproduce the frozen No.14 pages and seats.';
