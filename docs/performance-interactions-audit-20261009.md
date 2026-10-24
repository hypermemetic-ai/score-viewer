# Rendering and interaction audit — 2026-10-09

This application-owned increment removes repeated source parsing, preview
composition and unchanged finger text replacement. It does not change musical
spacing, source identity, admission, timing, active refill or audio behavior.

## Matched browser observations

The baseline is merged Viewer `7473fdadbbd1c9c94bde5feea3145b013f178ed0`
with ISO `42ac072da5af34de00b2fe8096cc434210ef05e9`. Before and after runs
use the actual application, isolated copies of a retained private score and No.14
library/state, Chromium on the Linux host, a 1920×1080 viewport and distinct
loopback servers with HMR disabled. Each leaf is visited once cold and twice
warm. Runs are serial; medians/p95/max use the same operations and sample counts.
Work measures synchronous main-thread completion. Paint also waits for two
animation frames, so its floor is different from work time.

| Operation | Before p50 / p95 / max (ms) | After p50 / p95 / max (ms) |
| --- | ---: | ---: |
| Private score warm leaf selection, 18 samples | 32.0 / 47.5 / 50.4 | 2.1 / 2.9 / 3.3 |
| No.14 warm leaf selection, 24 samples | 29.1 / 32.6 / 34.7 | 2.5 / 2.9 / 3.3 |
| Private score cold leaf selection, 9 samples | 30.9 / 39.7 / 1729.0 | 19.7 / 25.0 / 1527.3 |
| No.14 cold leaf selection, 12 samples | 31.5 / 40.0 / 79.0 | 20.6 / 23.8 / 68.8 |

Twelve same-leaf column moves decrease from 315.1 to 15.9 ms for the private score and
325.5 to 19.0 ms for No.14. Warm paint p50/p95 changes from 34.3/48.5 to
20.5/32.0 ms for the private score and 31.8/35.4 to 31.3/32.7 ms for No.14. The warm
work reduction is about 12–15×; this is not a whole-application or native
audio speedup claim. One 50 ms warm long task in the baseline is absent after.

Idle Free view previously replaced 744 private-score or 1,488 No.14 text nodes each
second, despite unchanged fingers. Identical paint now performs no text-node
replacement. This increment still executes the existing frame loop; separate
timing work owns reducing idle passes and repeat/count-in scheduling.

The cold private-score outlier is required written-head reconstruction for a
wrapperless opposite-stem relation. It remains a main-thread stall here and
is tracked by the separate admission/worker audit. Cold score opening and
required engraving replay also remain outside these warm-preview gains.

## Retention and invalidation

Leaf previews retain at most 16 detached, fully admitted SVGs for one practice
visit. Exact page bytes, bars, viewport, device pixel ratio and actual FontFace
identities/descriptors—including supported metric overrides—bound reuse.
Pending fonts and failed geometry builds are never reused. Every preview read
checks the pinned footer-face capability. Active practice never uses these
inert SVGs. Closing practice releases the preview cache.

Private source-page documents retain at most eight pages per live package,
touch hits in LRU order and reuse only the same package and exact source bytes;
crops always clone them. The reader helper retains at most eight
pages, resets its seat/owner indices for a new package and preserves actual
glyph nodes/focus when the page group is unchanged. Its application hook is
owned by the keyboard/options integration. Mutable annotations, contact state
and selection remain caller-owned paint, including both interactivity states.

At matched post-GC warm-selector checkpoints, JS heap is 29.80→29.94 MB for
the private score and 27.96→28.25 MB for No.14. Retained DOM nodes increase from
7,332→26,101 and 13,308→42,499 respectively while the bounded caches are
open. After returning to the library, node/document counts are identical to
baseline (4,310/one and 8,429/one); JS heap is 24.42→24.42 MB and
24.72→24.69 MB. These are JS/DOM observations, not renderer resident-memory
measurements or a memory-reduction claim.

## Safety and observation limits

Twenty-one cold preview ink/frame snapshots match the prior implementation
exactly, and both warm revisits match each cold snapshot. Eighteen actual
browser controls cover page/glyph/focus identity, changed package/source
invalidation, source-clone isolation, unchanged finger paint, real finger/error
restoration, interactive↔noninteractive transitions and loaded-face identity
and metric changes. Original score/pages/seats remain byte-identical.

The integrated four-edition check cold-admits original/+1 editions of the private score for both
keyboards through ordinary Workers and independent receiving readers. All
36 leaf previews, 16 Free view windows and eight active passages pass. Ties,
held cues, earlier-note/stem removal, full paused restoration and refill
remain intact; protected reading transforms have zero measured drift. Active
visibility work has p50 0.6–0.7 ms, p95 1.2–1.4 ms and max 7.4–10.6 ms.
Actual private-score and No.14 selector and cross-system Free view captures were
visually inspected. Existing strict geometry refusals remain refusals.

The complete integrated suite passed 505 tests and configured build; the
final font/interactivity refinement passed 35 affected tests, configured
build and the 18 browser controls. The final source-page LRU bound passed
45 affected tests and the same 18 actual browser controls. All 29 configured carrier/runtime checks
passed. No native delivery, physical MIDI, audio latency, low-end laptop or
human musical acceptance is claimed by this rendering audit.

Detailed private receipts, profiles and captures are retained outside Git at
`<private-state>/score-viewer-performance-interactions-20261009/`:
`matched-comparison.json`, both `merged-*-gc-nohmr/receipt.json`,
`cache-controls/receipt.json` and `final-all-editions-active/receipt.json`.
Owned probe servers and browser processes are closed after every run.
