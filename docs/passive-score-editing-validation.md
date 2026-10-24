# Passive reader and system navigation validation

The first source checkpoint is `bff72dc865987018a31aa3800642662370f34fab`, with `src/main.ts` SHA256 `9e9ed4f87c9333b3b504402c40969b14612748940550d0d96ebd535dc1105feb`. Source-pin admission, TypeScript and Vite build passed. The focused routing/navigation/Reading/repeat/progression checks passed 98 tests, including six tests executing the actual production keyboard/MIDI/toolbar handlers. The final inactive-reader guard also passed those six handler tests and TypeScript.

The reusable [production browser check](../scripts/check-passive-score-editing.mjs) serves `dist` under the application's actual CSP. It opens fully admitted public archives through the real library and reader, connects MIDI through Options, and sends simulated native MIDI callbacks into production dispatch. Its storage is isolated browser storage, not the user's managed library. It records source and frontend hashes, fixture identities, host, browser, viewport, checks and screenshots.

The first actual browser run used host `qq-box`, Linux, Node `v26.7.0`, Chromium `151.0.7922.34` and a 1440 × 900 CSS-pixel viewport:

| Case | Simulated note/controller events | Observed behavior |
| --- | ---: | --- |
| No. 14, Conventional piano | 3,068 | Passive reader/editor/selector/Free view; real system/page navigation and rotation |
| No. 14, Jankó four-row | 3,068 | Equivalent behavior with its own admitted presentation/finger choices |
| Public written-tie study, Conventional piano | 64 | Page crossing selects a genuine visible continuation alias |
| Public written-tie study, Jankó four-row | 64 | Equivalent alias/source-owner selection and page focus |

All four cases passed: 48 checks and 6,264 simulated events, with no browser page errors. Passive inputs left page, selection, highlighting, notation and all stored bytes unchanged. Up/Down revealed the nearest note in the next/previous printed system across page boundaries, including the tied continuation; the destination owned keyboard focus. At 90° display rotation, navigation still followed source system geometry. The visible reader toolbar omitted full-score Performance. Explicit keyboard and configured pedal page commands still worked, Options still detected the note's channel, independent piano configuration remained called, and the seeded historical Performance journals remained byte-exact.

Twenty-two screenshots and the detailed `receipt.json` are retained outside Git at `/tmp/score-viewer-passive-score-editing-20261011`; the receipt SHA256 is `34fabcb870bdf6748fcdd53adc9b9bcecbb14cfd5e2b5d3c4809e6dd3fb44c40`. Visual inspection of both No. 14 next-page images and both continuation next-page images observed the original notation and the selected destination glyph. The visible Conventional toolbar image confirmed the remaining reader controls and absence of Performance. Existing page fit and selection styling remain; the source removes the Performance affordance and note-driven highlighting rather than redesigning the score surface.

To repeat against an integrated build:

```sh
qq-job -- npm run build
PRACTICE_PLAYWRIGHT=/path/to/playwright-core/index.mjs \
PRACTICE_CHROMIUM=/path/to/chrome \
PASSIVE_EDIT_ARTIFACTS=/tmp/score-viewer-passive-score-editing \
qq-job -- node --import tsx scripts/check-passive-score-editing.mjs
```

The written-tie fixture uses the existing public complete-tie regression and shared publisher/calculator/admission helpers; no note geometry is fabricated. This checkpoint verifies passive input and navigation. It does not certify later hand-edit projection, edit latency, physical keys/MIDI/pedals, audible piano, installed WebView behavior or human musical acceptance. The browser and temporary server close in the script's cleanup path.
