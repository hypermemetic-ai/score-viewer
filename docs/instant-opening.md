# Opening a score instantly

Reopening a score whose source, saved hand choices, engraver and recipe have not changed reads its pages from disk. Nothing is engraved. The pages are the ones the engraver made for exactly those inputs, so the reader sees the same pages either way.

## What an opening costs

An opening does these steps:

1. Admit the archive: unzip, check member digests, parse.
2. Load the player's hands and fingerings.
3. Project the player's hand choices onto the score.
4. Draw the pages.

Step 3 is the expensive one. When any note is in a hand other than the one the score gives it, the projection engraves the whole score in the worker. No. 13 takes about 14 s on one thread on qq-box. The derived-file cache (`src/derived-file-cache.ts`) keeps the latest projection per captured package. It holds up to 2 GB, evicts the least recently used entries, stops writing when free disk falls below 5 GB, and refuses any single entry over 256 MB (`src-tauri/src/derived_cache.rs`). A hit reads the pages instead of engraving them.

Before this change, two problems meant a reopen was rarely instant:

- **Every app update threw away every saved engraving.** Derived files were bound to a hash of the whole viewer source, so a change to a menu label made every projection a miss. The first opening of each score after an install then engraved it again.
- **Loading personal memory was quadratic.** Every opening compared each of the score's occurrences against every registered occurrence by re-serializing both. That cost about 6 s for No. 13, and it ran two or three times per opening, on every opening, including reopens.

## What changed

**Derived files are bound to the code that makes them** (`scripts/derived-identity.ts`). The identity covers every file reachable from the modules that produce derived files: package admission (`src/package.ts`), the personal projection and its two workers, the vendored engraver, and the build inputs (`package.json`, the lockfile, `tsconfig.json`, `vite.config.ts` and the identity script itself). The module graph is followed through static imports, re-exports, literal dynamic imports and `new URL('…', import.meta.url)` workers and assets. An import or worker URL that is computed at run time fails the build, so no code that makes a derived file can fall outside the identity. A change to menus, practice, styling or the library keeps every saved engraving. A change to the engraver, admission or projection makes all of them misses, as it must.

**Scores are prepared ahead of time** (`src/ahead-of-time-engraving.ts`, `prepareAheadOfTime` in `src/main.ts`). While the player is in the library and the viewer is idle, it prepares each library score's projection for the saved hands. It starts with the last score worked on and does one score at a time. This is the same work opening would do, and it writes the same cache entry, so an opening right after an engraver update finds the pages ready. Opening a score stops the background work, except when the score being prepared is the one opening: the opening joins that work instead of starting it again. The background work writes no player data. It also skips anything only an opening may do: rebuilding an edition, a layout the score lacks, or memory that is not yet indexed. Native builds only.

A score that is already prepared costs a hash and two header reads, not an admission. A small `ahead-of-time-v1` entry, keyed by the archive bytes, the keyboard layout and the stored objects holding the score's hand choices, records which projection entry serves it. If that projection was evicted or never written, the header check fails and the score is prepared again.

**Personal memory is read once per change.** Stored assistance objects are named by their content. The session therefore reads and validates the memory document again only when its stored object changes. It keeps each recent score's registered occurrences by memory identity and hand choices. Another session's change gives the memory document a new name, which forces a fresh read.

## Opening steps after this change

| Situation | What happens |
| --- | --- |
| Reopen, nothing changed | Admission from its receipt, personal memory from the memo, projection from disk. No engraving. |
| First opening after an app update that leaves the engraving code unchanged | The same as a reopen: the derived identity has not changed. |
| First opening after an engraver update | Usually prepared already in the library. Otherwise one engrave, as before. |
| Hand edit | Re-engraves in the settled engine (ISO notation's incremental path). It is not cached ahead of time. |
| A score that must be rebuilt (policy change) | Rebuilt and installed when opened, as before. The installed archive is then prepared. |

## Limits

- An engrave itself is ISO notation's work: about 14 s for No. 13 on one thread, against a 3 s budget. A hand edit takes 1.2–2.4 s, against 300 ms. Making those faster belongs to the engraver, not to this cache.
- Ahead-of-time preparation runs only while the library is idle. A score opened straight after an engraver update, before its turn comes, still engraves on opening.
