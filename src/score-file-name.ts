/** A stored library score file is named by the SHA-256 of its exact bytes:
 * `package-<sha256>.tuna`. */
export const scoreFileName=(sha256:string)=>`package-${sha256}.tuna`;

// SCORE-FILE MIGRATION: libraries saved before 2026-10-17 name their score
// files `package-<sha256>.isoscore`. Such a name stays readable until
// score-file-migration.ts has renamed it. Remove the old suffix from this
// pattern together with that file.
const stored=/^package-([a-f0-9]{64})\.(?:tuna|isoscore)$/;

/** A library reference to one stored score file. */
export const isScoreFileName=(value:unknown):value is string=>typeof value==='string'&&stored.test(value);
/** The SHA-256 a stored score file name declares, or undefined. */
export const scoreFileSha256=(name:string)=>stored.exec(name)?.[1];
