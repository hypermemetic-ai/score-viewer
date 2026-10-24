# Design

## Context

See `proposal.md` for motivation. The prerequisite rendering repair provides admitted source intervals, complete ownership, and verified passage-aware ties/slurs. It currently reserves four equal maximum-width slots and keeps their transforms fixed. `PracticeSlots.recycle` waits for both attack completion and sounding obligations; this proposal intentionally changes that display policy while retaining assessment.

Display gestures are already grouped by written bar and hand in `planSource`. They are not the calculator's multi-measure hand-position units. Their visible end is currently the latest sounding end in that group. Actual source evidence distinguishes display and sound: in a private 3/4 score, a bar-19 note starts at 2592, its continuation head is at 2736 in bar 20, and its tied owner sounds until 2880. Schumann's first bar4 attack can be accepted at420 before its scheduled432 onset. A hand-position boundary alone therefore cannot establish three empty earlier measures. Earlier positions can also already contain newly revealed future bars.

Width evidence uses original intervals, not hypothetical minimum engraving widths. In that private score, retired bars 1–2 provide 153.67 source units and bar 5 requires 104.27; bars 5+6 require 236.14 while the prefix before unchanged bar 4 provides 230.50. Enough total free space does not guarantee a fit on one side of a pinned current measure.

The rendering prerequisite is merged through PR2 at `c068334ecd3bbbedba17699d7f3533286f9e2e60` (independently reviewed head `68d1a6605e93e89f60d66f3dfeb76f5758a67bec`). Its `practice-passage-display` capability is established in the main specs. This change explicitly replaces its affected canonical-slot/lifecycle requirements while preserving their scenarios and the other notation, settings and browsing requirements. The implementation branch carries the original reviewed plan commits above that prerequisite; no saved source or dependency pin is changed.

## Goals / Non-Goals

**Goals:** Original measure interiors at a common scale; a stable current reading reference; atomic useful refills; compact authored tie cues independent of sound assessment; centered consecutive Free view and verifiable lookahead.

**Non-Goals:** Changing note spacing or fingering/hand planning, engraving a new score package, sliding music continuously, changing musical timing/assessment, replacing whole four-bar groups at their end, changing unmeasured playback, or delivering a native installation.

## Decisions

### 1. Identify the protected current measure independently of sounding tails

Track the written bar entered by accepted attacks monotonically within the loop. The first accepted member of a new-bar chord pins that bar; subsequent members do not initiate additional layouts. A rest-only bar is entered by its existing clock boundary. Never advance past unread required attacks on a timer, and never let a still-sounding old owner pull the reading reference backward. Stop automatic allocations in error, inspection or paused modes.

Retire an older bar's ordinary note ink only after all its required attacks were accepted and a later reading bar was entered. Its sound remains in the original obligations/contacts ledger. This permits an early accepted transition without pretending the old duration elapsed, or fabricating observed attacks. Coalesce new placements and cue updates into one render-frame transaction.

Alternative: use the elapsed clock alone, or keep the old whole-bar hold gate. The former can retire unread late notes; the latter preserves the unnecessary old footprint, which is explicitly rejected.

### 2. Allocate original whole-measure footprints around that anchor

Retain each source interval, note coordinates, staff reference, and relation endpoint identity. Use translation plus one fixed common scale; do not stretch a measure horizontally or change its internal note layout. A transient layout snapshot records resident bars, complete interval placements, the protected bar, cue identities and a geometry epoch.

Keep at most four resident measures. A three-bar leaf has three; a five-bar leaf or longer joined run refills the bounded display rather than shrinking the entire selection. Allocate incoming source bars in reading order, within the selected passage. Residency must cover the current written bar, near-term written/rest progression and the next required attack/reveal requests in each hand. Prioritize an imminently required source measure over spare future rest measures when legal early acceptance crosses a rest gap; preserve their source identities and retain exact source identities without breaking the continuous display staff. Other resident future measures can participate in the same atomic layout; they never drift between refill events. Prefer retaining their placements when possible.

Enumerate the small set of cyclic source-order cuts and whole-measure placements to either side of the current interval, accounting for structural edge air and cue collisions. Score feasible placements by source-order clarity and retained placement stability, then balanced occupied footprint as a deterministic tie-break, using identical runtime and certificate policies. Balance-first scoring was rejected because the actual Schumann sequence failed readable admission near measure61; live balance cannot override the protected anchor or reading lead. A spatial wrap retains continuous aligned staff and accessible source identities. Common staff fills allocation air; genuine source separators remain attached. Relations still join only verified consecutive source endpoints, with independent clearance for disjoint source runs. Keep the prerequisite's quiet practice strips and selected-range context outside notation rather than restoring visible individual measure numbers. Total free width alone is not a sufficient fit test.

Alternative: greedily reuse the leftmost blank interval. The observed private-score widths disprove its general feasibility. Continuous reflow and batch page turns are excluded by the reading-reference and lookahead requirements.

### 3. Preflight the sequence before count-in

Start from a naturally framed compact initial allocation. Define finite equivalence states at accepted-bar-entry, hand-reveal and rest boundaries, using the source-ordered attack prefix and cue sounding-end predicates. Include legal timing extrema, different accepted chord-member orders, skipped hand groups/rests and source wraps. Certify every reachable state/transition or a documented conservative superset; representative on-time traces alone do not establish admission safety. Conservative cue admission can reserve the union of all authored cue paint possible in a protected bar, avoiding exponential enumeration of independently expiring owners. Both candidate placement count and state/transition search have explicit bounds.

One written bar of lead is a minimum, not the entire admission rule. Within the selected passage, make the next written measure resident on entry to its preceding reading measure, and cover the earliest legally accepted next-attack/reveal request across rests and sparse hands. The production fixture's bar6 attack at960 can be accepted at760 at rate500, before rest-only bar5 starts at768; a consecutive on-time simulation would miss that request. Actual ink eligibility remains hand-aware and gated by admitted residency, but residency cannot delay an imminently required request. Far-future gesture eligibility alone is not an immediate reading deadline. A leaf's terminal transition uses the existing repeat/count-in rather than requesting a measure outside the selection.

Certify a conservative timing envelope across supported loop rates before starting, or cache rate-specific certificates prepared ahead of a queued musical transition. A queued acceleration must never invalidate an admitted geometry state, delay the beat-aligned repeat, or trigger a live scale change. Any narrower rate-specific certification must explicitly prove coverage of the next queued loop before that transition.

Search a bounded sequence of feasible placements at the proposed scale. If it cannot fit, adjust initial allocation/scale before count-in and repeat the bounded preflight. A canonical maximum-width initial candidate is a safety candidate, not a live fallback. Freeze common scale, origin, vertical frame and the admitted sequence for the run. Reserve full resident paint and all cue/relation states so removal never changes live fitting. Center the live staff with sufficient symmetric reserved vertical air, so selected-score extrema do not push the reading surface down. Restrict the playback cursor to the actual staff span. Free view fits the actual complete source window independently. Store the fitted scale and stage origin for each viewport epoch rather than recomputing them from a changing flex height. Reserve the in-run status footprint so count-in/status changes, live Fingers and refill cannot translate the playing surface. Live Fingers is a presentation overlay during count-in/trial, not a paused inspection phase: it must continue the same residency/retirement/cue updates without changing matching, sounding or finger ownership.

Acceptance includes actual Schumann and private-score width traces and adversarial narrow-left/wide-incoming examples. Do not promise a larger font or three empty measures in every state. An unsupported or unverified placement sequence must fail admission before the loop starts with an understandable message; a violated live invariant must stop for source inspection rather than silently clip, move the current bar, shrink, skip notes, or delay a requested attack.

### 4. Preserve only an authored tie continuation for retired tied owners

Retire each old note's complete head/ordinary or hollow stem/white fill/beam/flag/dot/annotation bundle together, with shared contributor handling intact. Create a separately classified readable visual cue from the verified authored tie. Keep the complete original bow when both transformed verified endpoints remain inside the same displayed consecutive source run. For an evicted/carry-in endpoint, reproject the authored continuation through shared curve primitives to its verified continuation endpoint rather than showing an isolated clipped tail; never extend it to a made-up duration endpoint. Keep source owner/component IDs, staff/side and shared curve rules. Reserve actual path, stroke and white-knockout geometry; never reserve the whole retired bar merely because its sound continues.

Cue lifetime is visual: end at the protected current bar's finish or the original owner's sounding end, whichever is earlier. A new accepted reading-bar entry ends the previous bar's visual cue even if an early transition precedes its clock boundary; the remaining sounding obligation stays unchanged. The destination continuation's onset is not the sounding end. Removing a cue does not send NoteOff, change sustain, release an assessment obligation or mark completion. A later reading interval may receive its own verified source continuation if the same owner still extends there. Do not invent ties for untied or pedal-only holds, and do not substitute a slur for a tie.

Source slurs retain their distinct phrase IDs and are projected through the actual resident consecutive runs. Retired endpoints can supply source context for clipping, but do not reserve an entire old measure. Current note interiors and endpoint seats remain fixed; necessary cross-measure curves, structural joins and cue updates are included in the atomic redraw.

### 5. Restore resident source context and retain musical state

The Free view control retains the internal pause action/phase and existing P route. It stops playback and shows complete consecutive source windows near the current reading location, using natural centered framing rather than the cyclic resident allocation. Windows advance by two source measures: 1–4, 3–6, 5–8; include an end-aligned final window when a tail needs it. A five-measure selection uses 1–4 then 2–5, and shorter selections show their actual bars. Existing Left/Right and configurable Previous measures/Next measures actions browse these windows; Options exposes those rows whenever the selected range has multiple Free view windows while preserving exact saved assignments and capture/Test guards. Free view may change inspection origin, but never changes an active playing anchor. An in-selection failure chooses its original consecutive source window; carry-in outside the selection keeps a separate original context. Original source obligation definitions and saved results remain. The existing pause transition intentionally resets transient attempt matches and the sounding ledger; Ready begins the next admitted attempt under its existing rules.

Ready/repeat re-primes the initial admitted layout and cue state at the existing beat-aligned transition. Keep progress, joined/component evidence, reversible Done and queued speed meanings unchanged. Unmeasured practice retains all readable notation and existing manual-window controls without fabricated matches or automatic retirement. Resize/rotation may establish a new geometry epoch and preflight frame while retaining the session and loop clock.

## Risks / Trade-offs

- Upcoming music can change position at refill -> one transaction, preserve placements where feasible, keep source order clear, and observe reading lead rather than relying on geometry counts alone.
- The pinned current interval partitions the available width -> enumerate placements and preflight the sequence; never treat blank pixel count as available measure capacity.
- Cue paint hides or collides with new notes -> account for exact curve/stroke/white bounds and distinguish cue ink from residual owned note ink in browser assertions.
- Logical display completion diverges from sound -> maintain separate ledgers and test unchanged held-note failures, pedal behavior and sound end under early accepted attacks.
- Free view exposes reordered live residents or poor balance -> use consecutive source windows, centered complete ink, and inspect group/transition/tail/error navigation separately from live anchors.
- Preflight search expands excessively -> at most three movable whole measures, bounded candidate cuts/anchors and compact diagnostics; run heavier traces under `qq-job` limits.

## Migration Plan

Integrate the reviewed rendering prerequisite first and reconcile its main-spec availability. Implement the allocator as a separate scoped child/PR with source-only evidence; preserve the ISO dependency and calculator boundaries. No saved practice/schema/package migration is required. Revert through reviewed source changes if necessary; leave the restored native package and personal data intact. Native builds, hardware behavior and pianist acceptance remain separately observed steps.
