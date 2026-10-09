# Design

## Context

See proposal.md for scope. At Viewer d7dc / ISO7205, reading v3 admits exact source-owned ISO pages, head appearances and musical clocks with empty seats. `planSource` instead requires piano hands/MIDI pitches; `PracticeView` selects measured assessment from global piano connection. Progress/hierarchy, score pulse grids and musical repeat clocks are otherwise reusable. Current v3 source retains attack string/fret but not complete tuning or tied-component positions. The converter's reviewed API is Node ESM with a bounded worker; it is not a browser SDK.

## Goals / Non-Goals

**Goals:** preserve exact existing piano plans, journals, controls and assessment while adding truthful manual musical planning and source-owned passage geometry. Prepare both notations independently against one source and share manual evidence across them.

**Non-Goals:** audio/USB guitar assessment, guessed fret positions, source retuning, a duplicate engraving engine, broad GP-version claims, native activation or an audio experiment.

## Decisions

### Neutral plan with a separate piano refinement

Extract the existing clock/passage/progress shape as `PracticePassagePlan`: partition, revision, bars/phases, reference tempo, time signatures and chunks. Existing `PracticePlan` extends it with genuine MIDI attacks, hand gestures and owner groups. A new `ManualPracticePlan` extends the common shape with musical owners and written components, without MIDI/hand/seat fields. Progress and hierarchy consume only the common shape. This keeps physical semantics out of generic planning and preserves literal piano patterns and storage. Casting reading heads into seats or supplying arbitrary MIDI values is rejected.

`PracticeAssessment` is `manual | piano-midi`, selected from admitted score capability plus actual input availability. Neutral manual sessions expose clock/phase/window/completion state, not MIDI assessment. Existing piano practice keeps its assessment/refill behavior. Connecting a piano cannot change a Bass/Guitar session's assessment. Manual completion uses the existing reversible self-report ledger; elapsed clock completion never writes measured success.

### Shared source and versioned appearance interface

The coordinated ISO source contract supplies complete tuning and a written-component ledger. Viewer consumes:

```ts
interface MusicalComponent {
  id: string; // exact source written-event identity
  ownerIds: string[]; // rests use a separate silence identity
  kind: 'pitched' | 'unpitched' | 'rest';
  partId: string; staffId: string; voiceId: string;
  writtenBar: number; tick: number; durationTicks: number;
  string?: number; fret?: number;
}
interface MusicalPassagePresentation {
  kind: 'iso' | 'tab'; engineId: string;
  bars: {bar:number;page:number;system:number;start:number;end:number;
    frame:{left:number;right:number;top:number;bottom:number};guides:unknown[]}[];
  appearances: {componentId:string;ownerIds:string[];page:number;system:number;
    bounds:{left:number;right:number;top:number;bottom:number};inkIds:string[]}[];
  relations: {id:string;kind:'tie'|'slur'|'hammer-on'|'pull-off';
    fromComponentId:string;toComponentId:string;ownerIds:string[]}[];
}
```

These shapes are integration requirements; the exact public ISO API/receipt versions are owned and reviewed there. The first Viewer foundation uses actually admitted ISO reading content and canonical clocks. It does not expose TAB until source-owned preparation and complete admission exist. Structural staff/string lines and barlines are separate from musical ink. Every displayed component and relation must have true source ownership; rests are included. Source geometry stays immutable. Cross-system relations use shared source-owned contour rules, not a Viewer TAB engraver.

### Musical identity and state

New manual evidence is bound to a versioned digest of canonical musical facts, the selected real source part and partition. The digest includes owner clocks/pitches or explicit unpitched references, written components, tuning/positions, ties/techniques, measure/traversal/meter and reference tempo. It excludes renderer, pagination, center/guides/stem policy and notation choice. Existing v3 facts use a bounded deterministic projection until the coordinated source ledger lands. Unknown semantic additions must not be silently discarded.

Use an additive manual-practice storage namespace keyed by that musical identity and part; retain all existing piano filenames/journals byte-exact. ISO/TAB have separate saved page/scale cursors and a shared written-bar/component anchor. Switching maps the anchor into the chosen view rather than reusing page indices. Distinct source parts never borrow progress. Historical archives retain old admission; missing physical TAB facts require additive regeneration from the retained authorized source.

### Explicit readable manual windows

Manual playback presents complete consecutive windows of up to four source bars, stepping by two and ending with a bounded tail. Previous/Next use existing inherited navigation bindings during manual playback as well as Free view. An explicit turn changes whole windows atomically without altering loop start, source pulse grid, tempo, eligibility or evidence. It does not hide individual notes or fabricate accepted attacks. At the actual start of a repeat count-in, the first window is restored once. Resize/rotation changes fitting only. No continuous sliding or elapsed-time retirement is introduced. A five-bar leaf and a multi-page joined run are required controls.

### Visible consistent controls and bounded import

Instrument uses the same Bass/Guitar names in library, reader and Options; it selects an admitted source part/profile, not sounding-pitch changes. Notation uses ISO/TAB and remains visible beside the reader instrument control and in Score options. The existing category-column Options and keyboard navigation remain. When a notation switch occurs during playback, retain the passage/progress and enter Free view before replacing geometry. Other explicit manual window turns preserve playback. Piano-only controls are absent for neutral scores while global audio/options remain accessible.

GP input goes through a reviewed public converter runtime adapter with byte/time/memory bounds, cancellation and source-track selection. Existing internal converter modules must not be borrowed to bypass public admission. Exact supported-format/profile facts are reported; source bytes/report stay managed/private. No library pointer is committed until both required presentations and canonical source/owner/geometry admission succeed.

## Risks / Trade-offs

- Incomplete tuning/tied positions → TAB refuses before library writes; original source remains recoverable.
- Reusing physical assessment via a connection flag → explicit score-derived assessment mode and connected-piano isolation tests.
- Different pagination → source-bar/component anchors; view-specific cursors.
- Shared progress bound to visual recipes → independent musical digest and notation-switch round-trip tests.
- Manual joined runs have no measured retirement → explicit overlapping windows, visible navigation and repeat reset; no auto-hide workaround.
- Existing rich GP features expose real geometry/tempo limits → authored passing baseline plus honest feature refusals; no scope claim from one fixture.

## Migration Plan

Land reviewable neutral foundation first with authored tests and unchanged dependency pin. Coordinate and review source-ledger/TAB and converter adapter separately, then deliberately integrate exact merged pins through the ordinary path. Add public dual-view fixtures and actual-browser keyboard/practice/cold-read evidence before claiming usable TAB. Existing saved/source data are retained; a failed new preparation never replaces their pointers. Native delivery remains a separately coordinated outcome.
