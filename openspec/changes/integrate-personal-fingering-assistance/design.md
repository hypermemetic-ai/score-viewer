# Design

## Context

See proposal.md for motivation and scope. The upstream baseline is [fingering-calculator PR36](https://github.com/hypermemetic-ai/fingering-calculator/pull/36), reviewed revision `a09238d54a393d842aab66d8f121486bb2c3969f`. Its `docs/editor-assistance.md`, `docs/measure-memory-api.md` and `docs/travel-advice-api.md` define pure APIs, not viewer storage or UI.

Current viewer evidence:

- `src/personal-assignments.ts` stores source-owner guards but materializes both effective hand and finger on either kind of edit. Its `createdAt` is retained after later edits. This cannot establish exact per-field historical intent.
- `src/state.ts` likewise retains the first timestamp for legacy corrections; `fingerFor` uses nullish fallback. Absence and deliberate suppression need distinct representation.
- `src/presentation-install.ts` can rewrite `original` while preserving saved choices/timestamps. Comparing a current finger with that baseline cannot reliably reconstruct whether it was personally chosen.
- `src/main.ts` reserves the edit target before its asynchronous projection/save; `src/personal-edit-queue.ts` preserves write order. Native atomic file replacement and a process mutex do not provide cross-process revision checks for a multi-file change.
- `src/piano-request-authority.ts` resolves authority by owner, so sparse new fields must not hide retained authority for another field.
- `src/selection.ts` supplies physical-contact edit units and system navigation including visible continuation aliases. The editor toolbar auto-hides, so navigation mode needs persistent feedback.
- Library entries retain `importedAt` across same-entry reimports and editions. Timestamp validity must be checked before ordering; file modification times and enumeration order are not authorship.
- The direct calculator package is absent. Existing solver/engraving code remains a separately pinned notation dependency. This change adds only the reviewed assistance package contract and does not switch solvers or revive the removed tool.

## Goals / Non-Goals

**Goals:** One effective assignment view for notation, practice and calculation; sparse explicit authorship; deterministic reference lineage; immediate open-score updates without whole-library rewrites; reversible migration of the operator's chosen piece; contextual editor assistance.

**Non-Goals:** Approximate/transposed motif matching, a new fingering solver, changes to musical source identity or practice attainment, a mandatory warning review, or any live desktop intervention during the current practice session.

## Decisions

### 1. Keep musical rules in the calculator and application lifecycle in the viewer

Extend the upstream package in its own reviewed PR, with emitted-package tests, for three missing operations: add a previously absent shared field from any occurrence without replacing existing shared information; explicitly transfer reference ownership while preserving field provenance/local exceptions; import a deterministic historical snapshot without replay/load order choosing the reference. Distinguish explicit promotion (adopts current choices) from deletion succession (preserves shared values). Keep revision/source guards and diagnostic retention.

Pin the resulting exact package artifact and its provenance in the viewer. A viewer fork of the matching algorithm would create divergent musical rules; directly mutating package internals would bypass invariants. PR36's current `publish` retains the original origin and is therefore insufficient for the requested reference action.

### 2. Build complete matching inputs and compose scopes automatically

Adapt every measure's complete pitched source material, including unannotated notes, exact rational relative onset/duration, full measure extent, crossing durations and independent duplicate owners. Use admitted physical aliases only; equal pitch/onset alone is not proof that independent owners are one decision. Match MIDI pitch exactly; presentation, voice/staff and expression do not replace musical identity. Follow the package's field-specific compatibility: hand/finger knowledge can cross physical profiles of the same keyboard, while physical contacts require the identical immutable profile. Do not partition reusable fingers more narrowly merely because contact geometry differs.

Maintain whole-measure and LH/RH projections from effective hand authority. Resolve each field as local exception, then exact whole-measure shared value, then matching-hand shared value for holes, then calculated/imported fallback. Explicit suppression blocks lower levels. Keep whole and hand records linked to the same originating decision so copies do not create additional authorship. An edit that adds or updates eligible shared finger knowledge updates the relevant whole and hand projections coherently; an explicit whole-measure exception retains priority over a more general hand match. This lets the player use full matches and hand-only matches without scope controls.

Hand-scoped finger reuse never reassigns hand. A direct hand edit is first applied as authoritative viewer intent, then affected scopes are rebuilt in the same transaction. Do not repeatedly feed inherited values into the donor index. Ambiguous mappings or stale guards retain data and produce an inspectable diagnostic instead of guessing.

### 3. Store field intent separately from display values

Record hand and finger actions independently, with source guard, authored time, stable decision ID and lineage. An inherited finger displayed during a hand edit is not a new finger decision. Preserve other authority fields when applying a sparse edit.

The finger operation is chosen against the resolved personal knowledge at key arrival:

| Existing personal knowledge | Edit result |
| --- | --- |
| No personal value; a calculated digit may be visible | Add shared knowledge and retain this occurrence as the field donor |
| Shared value at a copy | Create/change a local exception |
| Shared value at its reference, without an intervening local exception | Update the shared value |
| Existing local exception | Update that exception |
| Explicit make-reference action | Publish the chosen occurrence's effective personal choices and transfer the reference |

No-op entry of an already inherited value does not manufacture new evidence. Returning a local value to inheritance is a separate reset operation; restoring calculated output must not erase the global reference accidentally. Deliberate suppression and inheritance remain distinct. Resolve pending edits against the same ordered optimistic state used for rendering, and reconcile stale durable revisions by replaying intent, not a stale full snapshot.

### 4. Track current reference and original donors separately

Each pattern has a current reference occurrence; each populated field retains its contributing decision. Sparse additions can come from several occurrences without repeatedly moving the reference. The source command goes to the current reference/context, while detail text retains the original donor when different. Save a return anchor containing score/edition identity, source selection, visible alias, page/view and edit navigation mode. The same command returns without discarding edits; ordinary navigation must not corrupt the saved return target. Choose an unused default binding during implementation through the existing command registry, and expose rebinding rather than taking over a conflicting binding.

Order initial references by the oldest valid retained personal-record timestamp, with stable occurrence identity as tie-breaker. Succession chooses the next-oldest survivor using retained personal age, or stable import age for occurrences with no personal authorship; persist the order. Invalid legacy dates use a deterministic identity fallback and are labeled unknown, never fabricated. Preserve shared values when deleting a score, including when no successor survives; a later admitted match can host the retained reference. If the next-oldest survivor already has a local exception, preserve it: reference custody does not implicitly publish that exception. Source detail must distinguish its local variation from the shared value.

### 5. Persist shared memory without rewriting every score

Add a versioned library memory index and source-bound per-occurrence records. Store immutable versions and activate a manifest referencing the matching memory/personal revisions through an expected-revision transaction. Implement native interprocess exclusion plus expected-revision checks; use the analogous single-writer transaction in browser storage. An in-process edit queue alone cannot prevent a second application from overwriting accepted work. Keep a journal of source-bound pending intent for recoverable failure.

Reserve edit target and scope at input receipt. Immediately project affected occurrences in the open score; enqueue durable work without waiting in key handling. Other score files remain untouched and resolve against current memory on load. Include relevant memory revisions in resolved-assignment, projection, practice-preparation and library cache keys. Initial import/index discovery must finish reference election before a score claims stable inherited results; background indexing must not silently choose whichever score happened to open first. Use bounded batches and progress where a library scan is necessary.

### 6. Consolidate the operator's existing piece exactly once

This explicitly overrides conflict preservation only for Schumann 14, the piece identified by the operator. Bind the execution to its actual admitted library/source identity; no score title or machine-local path is hard-coded into the product.

Freeze the current admitted package and active saved personal records. Build field-equivalence groups from admitted exact whole-measure and hand mappings before electing donors; reject contradictory or ambiguous mappings. Order current donors by retained timestamps and stable identity. For each equivalent field, choose its earliest eligible saved value across both kinds of match; later donors fill gaps. Missing data is not suppression. Include ambiguous legacy saved fingers in this explicitly requested consolidation, marking their provenance as legacy recorded intent rather than verified finger-entry events. Do not import historical editions, undo buffers or calculated layers as fresh donors: doing so could resurrect rejected choices.

Only after donor election, materialize coherent whole/hand records linked to the same elected field decisions. Do not seed contradictory whole defaults and then attempt hand fallback: two different left-hand accompaniments could otherwise shield conflicting right-hand choices from consolidation. Replace conflicting local fingers within the authorized target and remove their active exception status so future shared changes can reach them. Preserve personal hand authority while constructing hand matches; do not infer new hand choices from finger propagation. Never use newly copied values as donors during the pass. Record copied values as inherited with original donor lineage, not newly authored choices. Later deliberate local or published whole-context exceptions follow normal precedence and are not normalized again.

Produce a durable receipt containing target/source identities, input hashes, policy version, chosen donors, every replaced value and its old provenance, before/after state hashes, and completion marker. Keep an immutable exact pre-migration personal-state snapshot. A retry after success is a no-op even after later edits. An interrupted precommit attempt recomputes from current guarded state; it must not replay old normalization over new exceptions.

Prepare and inspect using local snapshots. Eventual activation is app-owned: drain pending edits, ensure no active practice attempt, verify current input hashes, stage memory/personal/receipt versions, and atomically commit their manifest and completion marker. Stale input aborts that attempt without losing edits. Do not externally replace the live journal while the old app can write it. Restore reading/edit location and retain all practice data. For any legacy import outside this explicit scope, known personal choices become automatically reusable while conflicting choices remain local; uncertain field intent remains preserved rather than silently becoming authoritative training evidence.

### 7. Make editor navigation mode visible and commands contextual

Default to Notes on entering editing; Space toggles Notes/Measures without moving selection. Expose a persistent compact mode control and accessible state independent of the auto-hidden toolbar. In Measures, Left/Right use adjacent written measure order, land on its first editable visible contact and reveal its page. Skip measures with no editable occurrence; a measure containing only a selectable held continuation is eligible. Do not jump back to its original attack page. Ends do not wrap.

Tab/Shift+Tab and digit auto-advance remain note-based; Up/Down remain system-based; L/R remain hand assignment. Do not let Shift+Right accidentally mean previous merely because the old handler groups it with Shift+Tab. Route commands through context ownership so dialogs, input fields, toolbar navigation, binding capture, explicit user bindings and practice retain their behavior. Rebinding can map the same physical controls to analogous editor/practice actions. Keyboard hints use shared undecorated `kbd` styling.

### 8. Present measured advice in the editor without changing the score

Build performed-contact streams from effective hand/finger assignments, actual physical row/contact, complete repeat traversal, timing and hold coverage. Feed package geometry/travel APIs rather than estimating from page coordinates. Consecutive uses of the same hand/finger can cross bars or repeats. Missing contact/timing/finger data breaks coverage; it is not zero travel or evidence of safety. Use reference-performance tempo, independent of current practice slowdown, and respect explicit hold floors when applying the package release helper.

Keep absolute movement advice (default strictly above 0.25 m/s), impossible-time conflicts and personal unusualness distinguishable. Personal comparison requires the package's compatible displacement context, at least 20 independent comparable decision lineages, and above the 95th percentile. Inherited copies do not multiply samples; editing/retracting a choice replaces/removes its previous contribution and excludes self-lineage from comparison. Imported uncertain authorship cannot claim extra verified decisions. Use the package's fixed contact convention and geometry identity; this is straight-line travel advice, not a biomechanical feasibility claim.

Expose the package's absolute threshold in existing Options using cm/s (initially 25), with independent persisted switches for absolute and personal-unusual advice. Validate positive finite thresholds and explain that they control highlighting, not allowable playing speed. These settings do not add a prompt, review requirement or practice gate; disabling a category does not erase evidence or turn unassessed data into assessed data.

Render quiet, accessible markers outside musical ink, with a selected-note explanation identifying both transition ends, hand/finger, relevant distance/time and reason. Warn only from the current source and assignment revision; cancel stale background results. Marker position follows shared rendered owner geometry and does not become an engraving obstacle or reproduce the recently repaired distant-fingering placement defect. Warnings are editor-only in this change; there is no practice interruption, required acknowledgement, automatic fingering rewrite or new review screen.

## Risks / Trade-offs

- Legacy timestamps describe retained records, not exact field authorship → preserve that limitation in receipts and source detail; record sparse intent going forward.
- Exact full/hand projections can disagree → whole personal context precedes matching-hand fallback; keep per-field lineage and test sparse overlap/conflicts.
- Index/load order could choose different defaults → deterministic initial election, immutable source snapshots and explicit index completeness.
- Practice can use cached assignments after a shared change → one effective map and revision-bound invalidation; retain raw attainment evidence.
- Migration could race the practicing app → app-owned guarded activation only, no external live journal replacement, idempotent receipt and retained original.
- Advice may be unassessed for incomplete contacts → preserve coverage gaps and explain unavailable evidence without inventing a warning or safety claim.
- Native build availability differs from frontend verification → report package/native/installed/human evidence separately; do not claim the known missing host LLVM issue is resolved by source checks.

## Migration Plan

1. Land reviewed upstream contract extensions, then pin and verify the emitted artifact in a separate viewer implementation change.
2. Add versioned memory/personal storage alongside existing records. Test deterministic import, mixed field authority, failure recovery and rollback on local fixtures before any user-data activation.
3. Wire effective resolution, editor commands, navigation and warnings; validate real rendered output and end-to-end warm edit latency as well as tests.
4. Bind the selected Schumann 14 to its actual admitted library/source identity, prepare the local consolidation report with its current snapshot, and retain private artifacts outside Git. Refuse any ambiguous identity rather than choosing another score by title resemblance.
5. At an ordinary safe application boundary, activate the guarded one-time transaction. Verify effective consolidated choices, source/return, completion marker and preservation of score bytes, practice progress and settings.
6. Recovery restores retained personal/memory versions through the same guarded transaction. Preserve post-migration edits as recoverable history; do not overwrite them by blindly restoring old files. Do not delete immutable inputs or alter application identity.
