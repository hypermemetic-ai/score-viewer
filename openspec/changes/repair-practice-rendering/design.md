# Design

## Context

See `proposal.md` for the repair motivation and `specs/practice-passage-display/spec.md` for the behavior contract. This design spans both application display paths and their note-ownership adapter, so a design artifact is warranted.

The source inspected at merged viewer `11c1128a6140b9964aa7f2b4035de761ed7814fa` establishes these constraints:

- `cropMeasure` in `src/practice-view.ts` clones genuine prepared system ink into one SVG per measure. Its viewBox includes per-edge air; authored barline ownership already distinguishes ending separators from start repeats.
- `PracticeBrowser.render` creates separate measure wrappers. `fitLeafPreview` tightens each crop independently and switches to two rows below a width ratio. Current styles add a four-pixel preview gap.
- `PracticeView.paintScore` uses four grid cells, a passage-wide scale, independent crop origins, and centered per-measure SVGs. Equal cell heights do not establish a common staff coordinate frame or connect the staff between cells.
- Duration ownership covers `.janko-stem` and flag-axis metadata, but the pinned engine serializes hollow stems as `.janko-hollow-stem` rectangles and ordinary long-duration rings as `.janko-stem-ring`. Rectangles need their actual center/attachment geometry; the existing line-only `x1/y1` mapper cannot simply be applied to them.
- Seats carry source owner IDs, including shared heads and continuation seats. Prepared reading-head groups also retain source ownership metadata; duration serialization does not universally include it. Some ordinary/secondary stems are paths rather than lines.
- `PracticeSlots` controls fixed positions and protects unmatched attacks and active holds. It can display 5, 2, 3, 4 while cycling a joined run. `PracticeSession.visibleGroups` supplies group visibility and restores the displayed groups on ordinary Pause.
- `test/practice-attainment.test.ts` and `test/practice.test.ts` explicitly preserve readable unmeasured source music without inventing observed attacks. The older rollback's timed-clearing observation concerns a different runtime and is not a mandate to change this source contract.

Both Conventional piano and Jankó four-row use supported prepared presentations; keyboard choice is separate from fingering annotations/replacement. The ISO submodule remains the shared notation/model/calculator owner at its documented pin.

## Goals / Non-Goals

**Goals:** One application passage compositor, source-correct structural joins, reliable ownership for complete painted note geometry, and predictable coordinates for every surviving active position. Visual reproduction must test the renderer and the lifecycle together.

**Non-Goals:** Changing assessment clocks or eligibility, introducing automatic unmeasured note removal, redesigning passage navigation, regenerating stored packages, duplicating shared engraving, advancing the ISO pin, or adapting/dispatching the native release lane. Agreement with the fixed-position concept does not certify its current implementation.

## Decisions

### 1. Compose a passage in one SVG coordinate frame

Introduce a scoped viewer passage helper consumed by the browser and active view. Extract admitted measure intervals from prepared source systems while retaining source note geometry, boundary type, structural lane/reference identity, owner bindings, and source-to-display transforms. Use one outer SVG with namespaced clips/IDs and transformed content groups. Keep styles/definitions and painter order compatible with the frozen source.

Align source systems by their musical staff/reference coordinates. Determine the common vertical extent from the complete admitted passage ink, including long stems, relations, and finger annotations, before visibility changes. Independently tightened crop tops must not determine individual staff placement. If source frames cannot be mapped without changing musical meaning, report the specific unsupported passage instead of inventing a staff alignment.

Join structural staff rules using their accepted source styles and lane identities. Assign each authored separator to one source side; preserve repeat dots, start/end repeats, double/final rules, and relation continuations. Remove duplicated crop-edge structure and per-measure exterior padding at consecutive joins. Preserve genuinely required source spacing. Extending admitted structural rules through fixed-position padding is application composition, not a new note engraving recipe.

Alternative: remove the CSS gap and align the existing SVG boxes. This leaves independent vertical origins, source-system seams, per-edge air, duplicate structure, and ownership spread across view-specific implementations. A whole-work re-engraving path would couple practice to generation and exclude frozen packages without supported recipes.

### 2. Give the compositor two explicit placement policies

Leaf selection uses compact consecutive placement based on admitted measure widths and one complete passage bounding box. Fit all original leaf measures together in one strip; remove the automatic two-row threshold and use available width efficiently. A large joined selection keeps its current bounded browsing/component interaction rather than gaining a full-work miniature.

Active practice uses a canonical four-position track computed from the entire selected passage and current viewport. Fix position offsets, shared staff frame, and scale before the run; reserve enough width/height for every admitted source measure. Individual source content has a stable transform in its assigned position. Continue staff across consecutive positions, including necessary structural padding, without moving surviving note ink when a different measure refills another position.

Consume `PracticeSlots` output directly. A nonconsecutive wrap retains clear source labels and the existing return to the first position; no new separator can imply false source adjacency. Paused/unmeasured window turns remain existing actions. Resize/rotation can refit the surface but must retain session, clock, progress, and input state. A moving playhead remains permitted; the score reference itself stays fixed during a run.

Alternative: compact active layout on every refill or continuously scroll a strip. Both would move the remaining reading reference. Keep compact fitting specific to preview and explicit surface layout changes.

### 3. Bind complete painted ink before composing or hiding it

Centralize the application ownership adapter and retain direct element references with complete source-owner/group bindings after transforms. Prefer verified source metadata. For the pinned frozen SVG families lacking metadata, use shape-aware geometry and source seat/slot identity: hollow rectangle center and attachment/end coordinates, ring center, flag axes, and ordinary line/path geometry. Reject ambiguous or missing ownership rather than selecting an arbitrary nearby note. No score title/ID exception is allowed.

Inventory the actual admitted note families: reading heads and their knockouts, ordinary/path/hollow stems and rings, flags and dots, shared beam paint, and owned tie/phrase fragments or reservations. A hollow rectangle's white fill and rim share one visibility decision. Preserve source grouping/painter order; shared geometry must retain every contributing owner and any ink required by owners that remain visible. Staff, rests, and independent structural rules stay outside note visibility. Continuation/carry-in displays retain their original owners.

Use the session's existing visibility rules for removal, error context, and ordinary Pause restoration. Reuse the registry on every paint without losing bindings or recalculating fit from the remaining visible ink. Update finger labels/contact/error feedback and playhead coordinates through the same source-to-display transforms.

Alternative: add only a selector for hollow stems. This would neither map rectangle geometry through the line-only mapper nor cover other admitted duration forms, shared owners, reservations, or composition transforms. Reconstructing a complete InkScene from arbitrary frozen packages would require source-generation authority that those packages do not all provide.

### 4. Test real geometry and visible lifecycle separately from musical acceptance

Use retained Schumann No. 14 fixtures for system/page joins, rest bars, and supported keyboard presentations. Use a small source-linked real-engine long-note fixture for hollow half/whole values, dots, ordinary/ring/path controls, shared ownership, and continuation cases; the pinned engine's `janko-hollow-stem.test.ts` supplies an existing production geometry route. Do not encode the private Zelda score or fabricate placeholder note paint.

Meaningful regressions must cover structural seam coordinates and separator counts, fixed surviving seat positions after refill, complete owned-ink removal/restoration, and preserved unrelated staff/notes. Exercise actual DOM/SVG painting in a real browser where SVG geometry is needed; pure string checks or fake bounding boxes cannot establish staff alignment. Keep existing session/window/timing/Done tests as protection for behavior outside the renderer.

Observe both views with Schumann and the actual private Zelda package in each available keyboard presentation, plus rotation/resize and repeated Pause/Ready cycles. Use isolated test-owned state for browser checks. Record the exact score/presentation, viewport, action sequence, visible result, source commit, and limits. Browser injection of practice events is simulated input, not physical MIDI or musical-performance acceptance.

## Risks / Trade-offs

- Different source-system register/reference frames or painter orders -> admit and test an explicit common musical mapping; preserve source layering and refuse unsupported mappings clearly.
- White reservations, shared beams, and relations outlive a hidden head -> bind complete glyph families and contributors; observe exposed staff and surviving voices through removal and restoration.
- Canonical active width uses the widest passage measure -> preview keeps compact widths; inspect active readability using complete ink bounds rather than shrinking from page-sized whitespace.
- Fixed-position wraps look consecutive despite different source order -> retain numbered positions and existing order; join only actual source adjacency and inspect a joined run through multiple refill states.
- Tests pass while the viewer remains visually broken -> require before/after browser observations and leave private-score/native/operator acceptance explicitly pending until actually observed.
- Private Zelda package is unavailable in this repository -> generic production-fixture regression proceeds independently; private Zelda acceptance remains an unchecked task, with no access inferred from the source handoff.

## Migration Plan

Implement the reviewed change on a separate repair branch through the ordinary PR path, normally in a child agent while decisions continue in the parent session. No saved-state migration or stored-page rewrite is expected. Keep focused source validation, built-frontend observation, installed-native verification, and human musical acceptance as separate receipts.

The reported restored Windows build is `4e64dfedaed12892d73c6164b2965b0a1a594577`. Leave that installed package and its retained application/data/shortcut backups in place. A future paired native build requires deliberate coordination of reviewed viewer and ISO inputs through the documented release seam; this change supplies source repair evidence, not a release port or activation. Revert a source repair through reviewed Git changes if necessary; do not reset personal data or replace the restored installation as part of source rollback.
