# Design

## Context

See proposal.md for the reading problem and the two delta specs for behavior. Planning starts from merged Viewer `8643260b85490cbdd9b3fb9e4f826c8a28993d6d`, tree `5879bf1a63d46c0bf591cca3a8245d0003ca09d2`, with ISO `a5ef9270db44ce9afc4941ad24e95e26c536064a`. `src/dual-reading-package.ts` already binds both views through descriptor-v2 engine IDs, exact pages/owners/scenes/geometry and actual local immutable admission. Its sync and cooperative async paths presently prepare TAB-v1 only. The new rendering has no public production dispatch yet.

The prior direct-source trial is retained on ISO `prototype/detached-tab-rhythm-20261009` at `9d53cbfc03bbc1d6e698387d8f87fcb2bc5a6699`, tree `47cc970ee401149839cf38f0936a635a4bb70328`, runtime commit `7ffc68cc74de2e8686c6619be3171c53eca026ce`. Root verified its source/capture identities and inspected normal-page black Guitar/Bass and rest controls; the source owner reports 87 affected checks, types, strict engraving and build. Its private receipt is `iteration-black-staff-rest-v3/ready.json`, SHA256 `e9bc77158012b38b226b8c19c78e12b7235f4433247580a224bc983d1da34f5f`. The latest user instruction supersedes its top-rail orientation: free stems must point upward toward fret numbers, and the connecting rail must be at the bottom. The next trial must also diagnose the split-looking triplet against actual source beam/tuplet ownership. Its exact checkpoint, final visual closure and production source pin are pending; the retained trial is not supported SDK, Viewer, native or installed acceptance.

Current generic part installation rejects a changed archive for the same collection ID. Manual musical identity excludes declared presentation/layout facts and remains tied to actual source part, partition and effective reference. Saved views keep written-bar/component anchors and notation-specific scale/page-count/advance preferences. Those existing boundaries constrain this adoption.

## Goals / Non-Goals

**Goals:** reuse the exact shared source generator and complete receiving authority; make style evolution additive; retain literal prior defaults and archives; preserve part-scoped musical progress while replacing derived geometry safely.

**Non-Goals:** changing canonical musical facts, source retuning, concurrent voices, guitar/USB assessment, piano audio/MIDI, GP conversion/provider authority, an alternative engraver, explanatory rhythm controls, native/CSP/workflow changes or dispatch during planning.

## Decisions

### 1. A known source presentation selector, outside musical facts

The ISO owner will adopt the selected source profile under a distinct public TAB engine. `fretted-source-tab-v2-detached` and `fretted-tab-geometry-v2-detached` are proposed production names only, subject to exact source-owner review; they are not shipped identities or a mapping to arbitrary prototype revisions. Preserve the current `fretted-source-tab-v1` engine, geometry-v1 and omitted-selection defaults literally. ISO engine identity stays `janko-real-engine-fretted-iso-scene-v1`.

Retained source prototype v1–v3 profile branches also stay literal. This does not make their private identifiers supported Viewer recipes; only explicitly reviewed public engine identities may enter receiving dispatch. The corrected orientation/derived grouping belongs to a distinct profile and honest geometry/ownership evidence.

Extend the public sync/async preparation with an optional known presentation selection. One compatible shape is a fourth sync argument and fifth async argument `{tabEngineId}`, leaving async execution fourth and separate from the saved recipe. Exact signature is settled in the source API review before Viewer wiring. Capture source/options/tokens/selection before the first await; both paths select a branch of the same cooperative generator and commit registered contexts only after complete dual audits and final abort checks. An unknown identity refuses with no fallback.

Changing `score.readingPolicy` would change source hashes and ISO/manual meaning; arbitrary style tokens or callback painters would weaken recipe authority. A separate renderer, prototype-only shortcut or DOM mask would duplicate source behavior. The known selector avoids all three. Use the existing serializable scene schema if complete actual inventory expresses the new primitives; version a schema only if source review proves an actual missing field.

### 2. The source profile owns durations, rests and exact geometry

The latest upward free stems and bottom connecting rail become source-owned paint and audits, not Viewer CSS. Retain smaller digits and entirely detached black duration cues. Whole-note marker absence retains whole-event/fret ownership; short half/normal quarter stems, exact hook/rail geometry, written dots and tuplets need truthful primitive boxes and ownership. The next actual trial settles the corrected hook/rail geometry, not the superseded top-rail drawing. Source rests use retained `sourceWrittenValue.type` plus dots, normalizing the exact `16th`/`sixteenth` alias; elapsed duration remains the clock. Half and whole rests share a neutral staff reference but sit/hang distinctly. Neither gets a fabricated physical string, and no rest duplicates appear below.

Free tips share a common band top; connecting rails and hook ends are below. For the split-looking triplet, consume the already computed `layout.expressions` complete tuplet proof. Regroup only complete local single-written-bar homogeneous beamable note units bound to exact source members/owners/components, ticks/durations, part/staff/voice and written values. Reject regrouping when any member is a rest, continuation, authored beam or `noBeam` unit. Remove only eligible carriers from inferred beat groups, retain their remaining contiguous units, and paint one shared TAB beam through existing source primitives. This intentionally changes derived TAB beam membership/topology under the new engine; it must carry complete source-bound ownership/geometry without claiming the painted rail was authored. Partial/mixed/explicit groups remain truthful. No new global grouping helper or per-system full-score scan is needed; canonical authored beam facts, source clocks and ISO topology remain literal. Equal durations or proximity alone grant no regrouping authority.

Reuse ordinary placement, spacing, rhythm topology, relations and final strict dual commit. The complete inventory and actual source passage helpers must account for new staff rests/duration ink while retaining all foreign rhythm, marks and relations, including same-owner technique ink. Canonical continuous guides, source separators and aggregate projected relations remain source-owned. There is no app clearance tolerance or ad hoc reconstruction.

The authored half-note triplet has written96/elapsed64 and an existing ordinary ISO three-case ring-geometry refusal before TAB registration. It is a separately owned ISO linter dependency, not a new-style rendering input to reinterpret. Before claiming half-triplet support, source must fix and independently review that audit using the original written/elapsed facts. Until then, the exact limitation/refusal and its separate disposition remain explicit in readiness and documentation; adoption cannot bypass it or claim all long tuplets supported.

### 3. Descriptor-v2 engine dispatch in every actual realm

Keep `iso-score` v3 and `instrument-reading-package-v2`. `views.tab.engineId` selects the known TAB recipe; ISO view identity and manifest engine remain the fixed ISO engine. Expand known types/validation, then pass the captured descriptor selection into both strict receiving paths. Compare complete literal pages, owners, scenes, geometry and member names from that exact source preparation. No schema/container bump is required just to select another supported view engine.

The owned builder gains optional `tabEngineId`; omission preserves historical byte/packet APIs. Fresh import/provider callbacks explicitly select the new engine after its reviewed landing. Existing archives dispatch their own engine; opening does not upgrade them. Preserve reading-descriptor-v1, old dual-v2 and piano paths and prior hashes.

The GP public ES Worker is conversion-only. The production piano-readiness Worker does complete `importPackage` before its honest neutral physical-capability refusal, so its real import can exercise new/old engine preparation. Test that actual Worker path and independently cold-import original archive bytes in the Window. Raw Worker outputs, structured clones, persisted certificates and caller digests cannot create receiving-realm scene authority. A new neutral Worker bridge is unnecessary for this change.

### 4. Musical journals survive; derived geometry does not

Keep the exact existing musical digest and reference-envelope contract. Same source bytes, selected part/partition and effective reference produce the same journal across ISO/TAB and old/new TAB styles. Do not add engine/scene/page dimensions to progress identity or remove unknown semantic facts to force a match. Distinct parts/references or changed source semantics remain distinct.

Map the saved written-bar/component anchor through the newly admitted scene, preserving valid scale/page-count/advance preferences. Recompute derived page indices, fit/crop geometry and SVG caches; automatic fit is calculated for the new ink. A geometry invalidation is not progress invalidation. Pause/flush owned playback before replacing the presentation, and retain initiating-operation cancellation/generation guards through saved-view, controller and preference awaits. Copying page ordinals or resetting all manual state would lose a valid musical location or evidence.

### 5. Explicit same-source retained editions, with the generic conflict intact

Do not relax `stageReadingPartsInstall`'s same-collection/different-archive refusal. A separate explicit style edition path cold-admits both old and new archives and compares canonical source JSON, part/staff/scope, owner/component/timing facts, exact ISO output, and retained GP/report/XML derivation where applicable. Only known TAB recipe/output differences qualify. Hashes alone do not establish converter derivation. Historical incomplete tuning/components or a changed conversion is a separate source edition, not this path.

Reuse retained-package storage and existing earlier-edition selection UI where its guards genuinely apply. Preserve entry ID/metadata, personal-file pointers, GP group hints and supported unknown library metadata; retain old content-addressed archives and manual/reference journals. Do not mint a new instrument part or route neutral styles through piano header restore authority. An unavailable old/new engine refuses honestly; the retained older archive stays recoverable.

There is no new TAB style picker, rhythm explanation or renderer-version label in ordinary Options. Fresh imports explicitly select the accepted production engine internally after landing. For prior-edition activation, first use an existing retained-edition action that genuinely supports the neutral archive; if its current gate is piano-only, propose the smallest neutral extension to that same flow for root review before applying it. Exact minimal action placement remains pending that bounded review, not permission to add a settings surface or automatically rewrite/select historical content.

Capture the actual managed-library snapshot before managed writes, stage new files, then reread exact unchanged bytes immediately before one guarded pointer commit. Serialize app writers after `onCommitStarted`, check every await/operation boundary and preserve cancellation behavior. Unreferenced stages may remain. A failed acknowledgement can still mean committed: exact readback confirms when possible, otherwise record unknown commit and retain possibly referenced files. This protocol is not a cross-process CAS or a rollback certificate.

### 6. Deliberate source and native boundaries

Use the ordinary reviewed ISO landing followed by an exact gitlink/provenance update; retain original Viewer extraction provenance. No native policy, CSP, dependency version, MIDI/piano, GP provider, authentication or workflow change is needed for engine selection. Frontend/Worker parity and actual browser reception are separate from native compilation, pair publication, desktop activation and physical sound/input acceptance. Later delivery follows the existing sole-owner paired lane and recipient preservation gates.

## Risks / Trade-offs

- [Rehashed but false new-style archive] → Exact source engine replay and complete per-view comparisons in every realm; no persistent certificate.
- [Rest glyph inferred from elapsed ticks] → Retained written type/dots and dotted-sixteenth/tuplet witnesses; keep linter dependency separate.
- [New primitive inventory omits detached or staff-rest ink] → Actual per-piece/cardinality, foreign-ink and full joined-window controls.
- [Manual progress forks by visual engine] → Equal existing musical/reference digests and byte-preserved journals; geometry cache invalidation separately.
- [Changed source disguised as style] → Exact old/new admitted source/scope/ISO comparison and generic import conflict preserved.
- [Cancellation or lost acknowledgement changes selection unexpectedly] → Single operation ownership through activation, exact library snapshot checks and honest committed/unknown outcomes.
- [Cold synchronous residue still stalls] → Actual import/cold/warm heartbeat and cancellation measurements; the visual profile is not a responsiveness guarantee.

## Migration Plan

1. Review this plan and the pending corrected upward-stem/bottom-rail trial, including the source-proven split-triplet diagnosis; then settle public engine/API/evidence names and record the separate half-triplet audit owner/disposition. Final visual closure stays on hold until that exact trial is supplied and reviewed. No shipping pin comes from the superseded prototype notice.
2. Implement/review production source selection in the shared generator with literal old-profile/ISO/authored-beam parity, eligible complete-tuplet rail and ineligible-group controls, actual primitive audits, packed SDK and real normal-scale/joined proof. Land the source ordinarily.
3. Integrate the exact merged pin into Viewer builder/receiver/Worker dispatch and run historical/forgery/cancel/manual compatibility controls before exposing new fresh preparation.
4. Implement the explicit guarded retained-style transaction and earlier-edition selection. Regenerate current private Bass/Guitar from exact retained source, with public converter replay and complete independent receiving; retain archives additively. Do not publish acquired repertoire.
5. Inspect actual reader/manual windows, journals/source anchors, keyboard behavior and cold/warm responsiveness. Complete ordinary source/frontend evidence, then obtain and independently verify the Windows x64/universal Mac pair through the established lane. Native activation and recipient preservation are separate recorded steps.

Selecting a retained earlier edition restores its literal supported recipe using the same admitted same-source guard; no destructive rewrite or progress rollback is required. Final production SHA/engine spelling, evidence paths and native acceptance remain pending outputs of those phases, not assumptions in this proposal.
