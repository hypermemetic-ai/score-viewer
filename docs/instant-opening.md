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

**Derived files are bound to the code that makes them** (`scripts/derived-identity.ts`). The identity covers every file reachable from the modules that produce derived files: package admission (`src/package.ts`), the personal projection and its two workers, the vendored engraver, and the build inputs (`package.json`, the lockfile, `tsconfig.json`, `vite.config.ts` and the identity script itself). The module graph is followed through static imports, re-exports, literal dynamic imports and `new URL('…', import.meta.url)` workers and assets. An import or worker URL that is computed at run time fails the build, so no code that makes a derived file can fall outside the identity. A change to menus, practice, styling or the library keeps every saved engraving. A change to the engraver, admission or projection makes all of them misses, as it must. `DERIVED_ENTRY_MODULES` is kept by hand, so a test (`test/instant-open.test.ts`) requires two things. Every module that uses the derived-file cache, and every module that `src/main.ts` hands the cache to, must lie inside the closure. Otherwise it must be named as a holder, with the reason it makes nothing that goes in the cache.

**Scores are prepared ahead of time** (`src/ahead-of-time-engraving.ts`, `prepareAheadOfTime` in `src/main.ts`). While the player is in the library and the viewer is idle, it prepares each library score's projection for the saved hands. It starts with the last score worked on and does one score at a time. The score just closed is left out of that visit's work: its pages are in memory, and the reader writes them to disk itself. Between its steps the work lets input through, so a click never waits behind it. This is the same work opening would do, and it writes the same cache entry, so an opening right after an engraver update finds the pages ready. Opening a score stops the background work, except when the score being prepared is the one opening: the opening joins that work instead of starting it again. The background work writes no player data. It also skips anything only an opening may do: rebuilding an edition, a layout the score lacks, or memory that is not yet indexed. Native builds only.

A score already looked at costs a hash and a few header reads, not an admission. Every preparation records its outcome in a small `ahead-of-time-v2` entry, keyed by everything known before admission: the archive bytes, the keyboard layout, the entry, and the stored objects that hold the score's hand choices. The outcome is one of three:

- **Served.** The record names the projection entry that serves the score. If that projection was evicted, the header check fails and the score is prepared again.
- **Nothing to prepare.** For example, a reading-only archive, a layout the score lacks, or an edition that opening must engrave again.
- **Refused.** The engraver refused the saved hands, or admission rejected the edition (such as one saved before its repeats were known).

A refusal is recorded like a success, so a library visit never repeats a whole engrave the engraver will refuse again. The record also names each further file the preparation read after admission, such as a personal journal kept outside the store, with its digest. If one of those files changes, the score is prepared again. A stop is not an outcome and records nothing.

The work runs in its own projection worker and preparation pool, and frees them when no work remains or the work stops. Stopping it for another score therefore never terminates the reader's worker or discards the warm engine of the score being reopened. When the score under way is the one being opened, the opening waits for that preparation and then reads its pages from disk.

**Page checks leave receipts.** Admission checks every piano page as passive ink for its seats, which means parsing each page's SVG. A page this build already checked leaves a `piano-page-checks-v1` receipt keyed by the digests of the exact page bytes and seats, so a later start skips the parse. A changed page has a different key and is checked as before.

**Personal memory is read once per change.** Stored assistance objects are named by their content. The session therefore reads and validates the memory document again only when its stored object changes. It keeps each recent score's registered occurrences, and its fingering resolution, by memory identity and hand choices, because every opening reads its package afresh. Another session's change gives the memory document a new name, which forces a fresh read.

## Opening steps after this change

| Situation | What happens |
| --- | --- |
| Reopen, nothing changed | Admission checks digests and seats; the pages' passive-ink check comes from its receipt. Personal memory and its resolution come from the memo, whose key leaves out where the reader is looking (page, rotation, selected contact). The projection comes from memory when the score was last read or engraved in this window (the last two are kept), otherwise from disk. No engraving. |
| First opening after an app update that leaves the engraving code unchanged | The same as a reopen: the derived identity has not changed. |
| First opening after an engraver update | Usually prepared already in the library. Otherwise one engrave, as before. |
| Hand edit | Re-engraves in the settled engine (ISO notation's incremental path). It is not cached ahead of time. |
| A score that must be rebuilt (policy change) | Rebuilt and installed when opened, as before. The installed archive is then prepared. |

## Limits

- An engrave itself is ISO notation's work: about 14 s for No. 13 on one thread, against a 3 s budget. A hand edit takes 1.2–2.4 s, against 300 ms. Making those faster belongs to the engraver, not to this cache.
- Ahead-of-time preparation runs only while the library is idle. A score opened straight after an engraver update, before its turn comes, still engraves on opening.
