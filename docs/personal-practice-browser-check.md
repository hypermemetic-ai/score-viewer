# Active practice Restore and Undo browser evidence

`scripts/check-personal-practice-restoration.mjs` runs the emitted production frontend under the application CSP, with isolated native managed-storage and MIDI callbacks. It authors a public two-bar, four-owner transfer study through the real source publisher and calculated preparation. Both Conventional piano and Jankó four-row views first enter Reading practice, leave to apply a genuine hand-only `R` edit, then return to active practice and use the ordinary Score Options Restore all and Undo restore controls.

The check retains original and edited full SVG geometry, confirms they differ, and requires Restore/Undo to recover their respective geometry. Source glyph visibility is checked against an independently constructed `ReadingSession` for each expected personal hand map. Simulated native MIDI finishes the first solo, then the second solo, and must reveal the correct adjacent pair. Original/restored groups are `0:LH`, then `1:RH`, then `[0:LH, 1:RH]`; edited/undone groups are `0:RH`, then `0:LH`, then `[0:RH, 0:LH]`. This observes actual source glyphs and changed stem/beam engraving rather than accepting a hand dataset as the visual result.

After each restore and undo, the stored bests, groundwork, self-reported attainment and working-by-pattern records must match the seeded source-bound evidence exactly. The seeded 45-BPM best and 75-BPM Done claim remain at 83% shown progress. Reference beat, target, start, connection start, increase, timing tolerance/offset, count-in, cooldown, speed lock and audio-output preferences are retained. Reading does not manufacture additional attainment. The original archive remains byte-exact.

The configured TypeScript/Vite build passed. The actual browser run passed both views, 28 checks and 28 screenshots, with zero page errors on qq-box, Node 26.7.0, Chromium 151.0.7922.34 and a 1440 × 900 viewport. Tested viewer `f2281b112fa22477e0c6ada61e15f863916a77f5` incorporates editing root `9d1390460ff7c08a4d3b08770b36c2f864cdfe3d`; main source SHA-256 is `3ea69d5745f9a4ab0aa74bad2e4e29dbe8b11b61640e25f47f8f9f6cb4657199`. Its isolated renderer candidate is exact `ee7f444d4e9c027618154d8b065476ff11407d17`, explicitly unapproved as a final dependency pin.

The complete receipt and screenshots are retained at `/tmp/score-viewer-personal-practice-restoration-root9d13904-ee7-complete`; receipt SHA-256 is `f1fbd88643ea12b4b38fa3bf292d1d240c43901339abfe61faf3b296662ee9d8`. The receipt records both archive/source identities, emitted frontend hashes, source glyph observations and retained evidence/settings. Restored Conventional and undone Jankó solo and adjacent-pair screenshots were visually inspected: the original lower-hand beam and complete group return on Restore, while Undo recovers the transferred stem/beam and its different group sequence. Earlier fixture-name and hidden-toolbar interaction failures remain in separate diagnostic directories; this receipt is the corrected complete run.

Run after a configured build:

```sh
PRACTICE_PLAYWRIGHT=/path/to/playwright-core/index.mjs \
PRACTICE_CHROMIUM=/path/to/chrome \
PERSONAL_PRACTICE_ARTIFACTS=/tmp/personal-practice-restoration \
/home/qqp/.local/bin/qq-job -- node --import tsx scripts/check-personal-practice-restoration.mjs
```

This is bounded functional evidence for the editing application and a small authored score. It excludes the separate combined practice redesign, final renderer approval, the six-case 100-ms benchmark, actual earned timed runs, physical MIDI, native WebView behavior and human musical acceptance. No operator-managed data was used. Server, browser contexts and temporary dependency links were stopped or removed after the check.
