# Design

## Context

`main.ts` creates a full-score matcher and follows played notes even during editing. `PracticeView` also interprets notes in Free view. Full-score Performance is a separate grading/clock/page-following path. Explicit command controls and native piano audio are independent and must remain usable.

Edit seats already carry page/system/x/baseline geometry; Up/Down are currently swallowed. Finger edits reserve physical targets in `EditSequence`, but `commitPersonal` waits on a global persistence queue before updating live state. `ReaderPageCache` retains SVG targets for cheap finger paint.

Personal corrections currently require the imported hand. Hand digests bind package and journal identity. The changed-hand calculation path rebuilds, validates and installs an immutable edition. Hands affect stems/beams/rests/annotations and potentially page packing, so an honest fast update needs shared engraving projection rather than an SVG label patch. See proposal and specs for accepted behavior.

## Goals / Non-Goals

**Goals:** Separate passive display from section interpretation; support source-stable system navigation; introduce source-guarded personal hand/finger authority; decouple visible editing from durable saving; measure coherent visible update latency; expose one effective assignment contract for the later practice change.

**Non-Goals:** Automatic recurrence-wide edits, mechanical finger verification, changing authored pitch/rhythm, solver runs on every keystroke, provider/auth/workflow changes or new native identity. Explicit calculation/export can retain the complete immutable-package preparation path.

## Decisions

### 1. Admit musical interpretation by actual section state

Gate note matching at the reader and practice entry points. Only section Reading/Timed and their owned preparation can interpret musical input. Reader/editor/selector/Free view do not feed a score matcher or note-driven status paint. Retire full-score Performance controls/execution while retaining stored records. Keep Options diagnostics/learning, command bindings, physical held-key/sustain bookkeeping and native sound independent. Re-entry reconciles real held keys without crediting passive-view attacks.

Alternative rejected: disabling MIDI globally, which also breaks explicit commands, audio and future practice readiness.

### 2. System navigation uses source geometry

Build the ordered visible-system index from seats, including continuation aliases. Up/Down find the nearest eligible previous/next system by page/written order and minimize source-horizontal distance. Tie-break by vertical proximity and existing source order; skip systems without editable targets and clamp at score ends. Reveal the destination page and retain the selected source target through existing focus/state handling. Use unrotated source geometry so display rotation does not change musical navigation. Left/Right/Tab keep chronological movement; toolbar/edit/modal guards keep ownership.

### 3. Personal assignments are an overlay with explicit authority

Add versioned source-guarded owner choices separate from immutable source/calculated layers. Store original facts and personal hand/finger values, supporting hand-only, finger-only and combined choices. Resolve one effective map for reader annotations, practice grouping and explicit solver constraints. L/R overrides imported performing-hand authority as a personal decision without deleting the authored statement. It keeps the effective current finger and selected owner; digits use existing ordered advance semantics.

Bind choices to immutable source owner facts, not transient regenerated seat/contact IDs. Coherent tied/duplicate appearances share the same selected source target; do not expand to independent similar notes. Validate merged physical aliases and grace-host relationships using explicit shared projection support rather than silently dropping source facts or pretending an unsupported map was accepted.

Retain base package and storage identities; the personal overlay carries its own assignment digest. Hand and finger edits preserve attained practice progress for the same complete exercise. Retain the assignment provenance of historical evidence without automatically resetting, hiding or reducing its credited value. Current practice uses effective choices; a quiet earlier-choice indication can disclose provenance, and only an explicit player reset removes progress. New or different exercise ranges still require their own legitimate evidence.

Alternative rejected: mutating the admitted package hand hash in place, which redirects storage and invalidates its provenance.

### 4. Faithful bounded shared projection

Introduce an effective personal presentation view separate from the frozen archive. Reuse shared engine model/layout/engraving logic to invalidate affected measures/systems and their dependent beams, rests, curves and annotation reservations. Cache unaffected admitted geometry and projected outputs keyed by source, layout, policy and relevant assignment digest. Propagate reflow only where changed widths or relations demand it, preserving stable source-owner selection even if seats/pages change. Publish a coherent visible result atomically; stale worker completions cannot replace a newer edit.

The existing full-edition API is not sufficient for per-key edits. If required, extend ISO in its own scoped checkout/PR with a reusable bounded projection and explicit personal-authority precedence, then deliberately update the Viewer dependency pin/provenance. Do not implement a competing engraving engine or weaken frozen-package admission. Full cold replay/package generation remains an export/install operation, not the editor's live path.

This contract permits a synchronous cached projection or bounded worker output; correctness and measured latency determine the viable implementation. Hand labels alone do not satisfy faithful-paint completion.

### 5. Immediate ordered intent, independent durable commit

Reserve source targets at key arrival. Apply validated intent to an in-memory edit generation and schedule projection without waiting for disk. Serialize durable snapshots/deltas with explicit base identity and sequence so rapid L/R/digits never redirect to later selections. Older saves cannot overwrite newer view choices, an alternate edition or the latest accepted sequence. Show save errors and retain last durable state plus pending intent; stop unsafe continuation after failure rather than report saved success. Keep undo/recovery source-bound.

### 6. Measurable performance acceptance

Measure key-event receipt through the first animation frame containing correct visible notation, not setter duration or optimistic text alone. Benchmark warmed No14 plus public dense/long and reflow/tie cases in Conventional and Jankó presentations on a named host/viewport. Retain p95 ≤100 ms as a tuning goal and aim for the next frame when possible. On 2026-10-10, after being told that notation calculation alone measured 223–239 ms for No14 and 289–311 ms for the dense fixture, the user accepted delivery at the achieved speed unless a very promising optimization remained. Complete the promising geometry calculation check, report final end-to-end percentiles separately from source-only timings, and proceed with delivery without treating 100 ms as a release blocker. Correct rendering, complete benchmark coverage, source preservation and ordered save recovery remain required. Include failed/timed-out edits in diagnostics, record sample count/score size and verify final notation correctness independently. Add delayed-save/rapid-input cases; edit responsiveness must not depend on disk completion. Cold score opening is a separate metric.

No timing is claimed before measurement. Native WebView2/WK, physical MIDI and actual installed behavior need their own delivery evidence.

## Risks / Trade-offs

- Hand-dependent widths propagate reflow → Shared bounded invalidation and atomic visible updates; retain source selection through changed geometry.
- Imported instructions conflict with personal intent → Explicit personal precedence retains original provenance and uses independently checked source guards.
- Optimistic state outruns disk → Ordered source-bound durable sequence, failure indication and pending-intent recovery.
- Shared renderer lacks bounded API → Extend it in ISO ownership, with source-preservation and geometry tests before the Viewer pin changes.
- Historical main spec still mentions a 1% fresh increase while current accepted code uses 2% → Retiring full-score Performance preserves current admitted defaults and retained exact settings; it does not restore the obsolete value.
- Personal hand changes alter practice meaning → Assignment-aware local claim identities retain old raw evidence and protect unrelated exercises.

## Migration Plan

1. Ship passive routing and geometric navigation with independent regression gates.
2. Add compatible personal overlay reading and effective assignment resolution, preserving existing sidecars and source archives.
3. Integrate reviewed shared projection, fast intent/persistence and edit controls; independently inspect both presentations and source preservation.
4. Verify warm p95 and rapid/delayed/failing-save cases, full configured checks and real viewer behavior.
5. Deliver this change before bounded practice exercises. The later change consumes the effective assignment interface and stays passive outside its active section modes.
6. Complete source review, spec sync/archive and the established paired native delivery/activation path. Rollback retains original archives/journals and new personal choices separately rather than translating them into incompatible historical evidence.
