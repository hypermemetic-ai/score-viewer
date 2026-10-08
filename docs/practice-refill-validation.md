# Adaptive practice refill source validation

This source change implements `reuse-cleared-practice-space` above reviewed
rendering prerequisite `c068334ecd3bbbedba17699d7f3533286f9e2e60`, from isolated
branch base `8bf25709bafd356fe0f4a4717cfacd01f60715b9`. The notation pin remains
`da93cf9e0359d861987fd76611b59b14b6aedb92`. Calculator, saved practice records,
package admission, dependencies and source pages are unchanged by this lane.
This receipt concerns source/browser behavior; the combined source build and
paired native delivery have their own final receipts.

## Allocation and admission

Each resident measure retains its original source interval and internal seats.
The current reading interval is copied exactly; only whole other intervals can
move. A refill occurs when a required incoming source bar is missing, retaining
existing resident identities otherwise. The resident set is at most four bars.
Adjacent source bars share continuous staff and one separator. A cyclic source
wrap has an explicit staff break and accessible original source identities.
Nonconsecutive boundaries reserve `max(8, rightAir + leftAir + 1.6)` source units,
including repeat/final overhangs and stroke air.

Admission tries 49 finite common-frame widths before count-in. Each width
certifies the deterministic runtime placement policy over at most 8192 states:
source reading bar, per-hand source reveal mask and resident placements. Edges
include every conservative source-prefix hand reveal, legal early attack entry,
rest-clock entry and chord-hand order. At most four cyclic source cuts are
considered per placement. The full supported rate envelope is 5–500; a rate
change cannot introduce a new geometry request. The search is conservative and
does not claim to find every feasible arrangement.

If enumeration needs a fallback, let M be the largest source width plus the
largest actual nonconsecutive gap. A frame with usable width 5M admits any
protected position: removing its width leaves at least 4M split between two
sides, whose integer M capacities sum to at least three. One cyclic source cut
places the other at most three intervals within those capacities. This bound is
only used before count-in and only if the final source glyphs remain at least
12 CSS px. No live shrink, delayed attack or clipped incoming bar substitutes for
admission. A failed admission prevents audio unlock/start; an unreadable resize
pauses for a larger view or shorter passage. A still-readable existing
certificate is reused directly on resize.

Full ordinary paint and all possible finger labels are measured before hiding.
The union of every consecutive resident source run of lengths one through four
(at most 4N runs) reserves actual source bow, tie, white reservation and stroke
bounds. Held cue paint is a clipped subset of those authored ties. Disjoint
wrapped runs have independent clearance registries so offscreen ghost contours
cannot displace a different visible run.

## Reading, sounding and restoration

The original matcher and sounding ledger remain authoritative. Accepted source
attacks establish a monotonic reading bar; clocks can enter written rest bars
only after the earlier required attacks are accepted. The first chord member
admits the known reveal requests of that entire source onset, preventing another
allocation for its later members. Ordinary ink belonging only to retired bars
disappears as one owner bundle, including hollow/white stem paint, dots, heads,
flags and annotations. Shared ink stays when a remaining contributor owns it.

A held cue is copied only from a verified authored tie and keeps its original
note owner. Its visual end is the earlier of the current bar finish and original
sounding end, including continuation onset cases. It never creates an untied or
pedal tie. Carry-in ordinary source paint retires during the active run; its
preparation/paused context band stays reserved so hiding it cannot move the
reading reference. All retirement, incoming placement and cue updates complete
in one synchronous redraw before the browser paints.

Pause restores full **resident** source notation at its current placement. It
does not redraw an evicted old measure over incoming source. A held failure in
an evicted measure adds a separate original-source context and establishes a
paused inspection fit with space for that context. Ready/repeat re-primes the
admitted initial layout without changing matching, hold assessment, musical
repeat/count-in timing, Done eligibility or saved progress rules.

The common fitted scale and score origin are stored for the viewport epoch.
The active status footprint is reserved, and score placement no longer follows
the flex area's recentering. Status text, live Fingers display, refills and
ordinary Pause therefore cannot move or rescale the protected reference.
Fingers retains normal annotation ownership while the live allocator continues;
actual paused/error/preparation phases remain frozen. Rotation/resize explicitly
establishes a new viewport fit while retaining the original session/clock epoch.

## Observed source cases

`scripts/inspect-practice-refill.mjs` runs Chromium against an explicit
`PRACTICE_URL` (default `http://127.0.0.1:5208`) with test-owned browser state.
Archive inputs are imported through the real package pipeline. Input goes through
the actual `PracticeSession` matcher and `PracticeView` compositor; session times
are controlled for reproducible source input. This is simulated MIDI timing,
not physical MIDI, audible metronome, pedal or pianist acceptance.

| Source / presentation | Selected source | Matched attacks per trace | Refill events per trace | Certificate |
| --- | --- | ---: | ---: | --- |
| Schumann No.14 / Jankó | 1–64 | 381 | 20 | 600.106667 units, 191 states / 315 edges |
| Schumann No.14 / conventional | 1–64 | 381 | 20 | 600.106667 units, 191 states / 315 edges |
| Private Zelda / Jankó | 1–38 | 204 | 12 | 607.09 units, 105 states / 170 edges |
| Private Zelda / conventional | 1–38 | 204 | 12 | 607.09 units, 105 states / 170 edges |
| Pinned engine fixture / traced ties | 1–12 | 13 | 3 | 1150.0225 units, 21 states / 31 edges |
| Pinned engine fixture / uniform ties | 1–12 | 13 | 3 | 1150.0225 units, 21 states / 31 edges |

Real scores use 1440×900 with offsets −300/0/+300 ms at rate 500. Their source
interval widths vary; no original note seats or pages change. The original
production fixture uses 3000×1200 because its engraving retains wide fixed
two-bar source systems. It contains real rests, shared unison owners, repeat and
final boundaries, paired ties and a 1200-tick hold across seven authored source
components. It uses the pinned engine's continuity layout for the long hold and
tests both traced and uniform source tie profiles at legal −500/0/+500 ms.

Every accepted input verifies required source residency before acceptance,
current screen CTM/origin/width stability within 1e-6, at most four residents,
next written-bar lead and unchanged source pages/saved evidence. On-time traces
also capture actual animation frames around three successive refills; those
frames contain complete resident identities, unchanged protected CTM and zero
visible ordinary ink whose entire owner bundle is retired.

Zelda's authored held owner beginning at 2592 retains its genuine cue in bar20
at the continuation onset 2736 and through the original sounding end 2880.
Old ordinary/hollow paint is absent; cue expiry, full resident Pause restoration
and original early-release authority pass in both presentations. Untied Schumann
produces no fabricated held cue. The generic long-held owner is already evicted
at bar4: its cue ends at the current bar finish 768 while its sounding obligation
remains 1200. Early release still fails that original owner and paints its
separate source context without overlap. The generic 2–5 carry-in selection
keeps preparation context, removes old owned paint with an authored live cue,
and restores the context on Pause with zero current CTM drift.

Separate genuinely height-limited traces keep Fingers active through bar9
(fixture through bar8), clear count-in status, toggle Fingers off and Pause.
All protected origin/CTM/scale comparisons pass. Schumann scale is 2.121446
against width capacity 2.179612; Zelda is 2.107925 against 2.154540. Independent
review reproduced the original 24px status jump and live-Fingers missing-bar
failure, then positively re-observed their fixes at 1440×900 and height-limited
1440×777. Supported 90° rotation uses 1920×1440 for real scores and 3000×3000
for the wide fixture; session/clock epochs remain unchanged and no horizontal
scrollbar appears. A full joined run rotated within 1440×900 may fail the 12px
readability gate and pause understandably. Manual disconnected windows retain
full source, zero fabricated matches and unchanged evidence/clock state.

Raw traces and inspected screenshots are outside Git under
`/tmp/score-viewer-practice-refill`; the private score is supplied only by path.
Schumann archive SHA-256 values are
`75ae62bed0db164281a2e02200213d8a83ec542d50d209c6651e72764cfe3d32` (Jankó) and
`8d57b25c20eca9e5dbfcb345873a1ca1ebc2f3d4b930c968200ea4e83b8e8fc7`
(conventional). Private Zelda SHA-256 is
`d503a145624af20e66c79f80248dbea78acc5444c48a11d522e2ec3e1fedd0c2`.
No private archive contents, operator records or installation changes enter Git.

Focused allocator, production fixture and existing clock/Done lifecycle checks:
37 tests passed through `qq-job`, configured TypeScript checking passed. Final
combined full tests/build and native receipts are pending the reviewed merged
source, as recorded by the delivery owner.
