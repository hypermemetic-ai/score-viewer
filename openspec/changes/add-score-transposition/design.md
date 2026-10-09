# Design

## Context

See proposal.md for motivation. Planning baseline `8667c098` owns the complete reviewed application; ISO `d79292fb` remains the pinned notation/planning dependency. Historical packages enforce pitch-identical immutable source projections, replayed recipe/page/seat identities and independently checked calculated-hand receipts. The tempo-only ISO calculation context has a strict whitelist. Historical same-hand readiness can retain fixed pages, which is invalid for a new pitch context. The additive Viewer policy below landed in PR25 at `fa6593feff0a6c103db0fbd5bd12b286c92fe2a6` without changing those historical contracts.

At that planning baseline, `main.ts` put Score in a collapsed details element after all general Options sections. PR25 expands the shared Score section first in reader Options and immediately after Practice, using existing centered numeric controls, vertically stacked non-tabbable chevrons, draft editing and shared keyboard ownership. Edition installation stages new content-addressed archives and sidecars before committing the library pointer. Personal/practice/performance storage binds edition identity, and active corrections carry exact pitch/contact guards.

The current reference MIDI module provides passive admission only. Both supported presentations use the shared numeric notation engine, so traditional key-signature respelling is not an existing behavior to extend.

## Goals / Non-Goals

**Goals:** Use one explicit Viewer transformation authority across main, workers and cold readers; provide complete pitch-consistent notation and assessment; activate derived editions transactionally; implement the approved visible Score design through shared controls.

**Non-Goals:** Change source conversion, traditional staff notation, solver defaults or hand policy; alter the global piano's physical MIDI passthrough; add score-MIDI playback; migrate original corrections or achievement across changed physical pitches; update the ISO pin, authentication, providers or workflow configuration.

## Decisions

### A separate, deterministic Viewer transposition policy

Define a new versioned derivation envelope with the immutable original source identity, integer steps and effective-source digest. Reconstruct an effective score by transforming every supported absolute pitch reference and its guards. Preserve non-pitch musical facts and explicitly refuse unfamiliar pitch-bearing projections until covered. Compute legal offsets from all sounding/grace/override pitches and the supported keyboard range.

Retain the exact admitted untransposed baseline archive once, with its archive hash and original source hash; a baseline containing another transposition envelope is refused. Bind a separate new Viewer selected-hand-map authority: the complete unique owner set, known layout and canonical hands, guarded by original owner pitch/tick/duration. Inverse replay normalizes guards from a currently transposed edition. Original authored/editorial hand requirements remain enforced after transformation. The baseline can contain distinct conventional/Jankó maps.

Receiving request admission independently requires this full map to equal the actually selected admitted edition; bind that selected edition fingerprint to the request token without recursively storing prior derived editions. Cold admission proves the guarded map under explicit Viewer selection authority, not historical user intent or source-authored hand authority. It independently admits the retained baseline, complete original guards, effective source and newly calculated layer/recipe/receipt. This bounded archive supports repeated transposition and exact 0 restoration after sharing without recursive growth.

Worker preparation, the receiving realm and package cold admission replay this transformation separately. Bind the envelope into the new preparation/request/receipt path and compare effective musical facts rather than weakening historical pitch equality. Existing policy versions, literal archived bytes and old recipe semantics retain their exact dispatch. Do not add fields to ISO's tempo-only calculation context or overload its meaning.

Alternatives rejected: mutable imported source loses restoration/provenance; shifting only displayed numbers or assessed MIDI produces inconsistent music; admitting a worker's claimed effective hash without replay breaks the cold trust boundary.

### Fresh shared engraving and physical planning

Use ISO's existing calculated-hand presentation and planning APIs against the effective source. Retain the selected edition's complete owner hand assignment while recalculating fingers and physical contacts for new pitches. Nonzero transposition must not take the fixed-page same-hand optimization. Retain complete source-owner coverage, annotation ink policy, recipe/page/seat and whole-page geometry gates, including the reviewed pinned footer face.

Conventional key geometry is not transposition-isomorphic, so shifting an old finger layer/cache is not valid. Both keyboard layouts must generate/admit their own presentations for the same selected offset. Original reference MIDI stays byte-exact and is an original-source attachment rather than a newly claimed playback route.

### Retained editions and atomic collection selection

Store the selected offset and retained offset editions with the original collection's library state, with an exact retained untransposed edition for 0. Share the selected offset across reader, practice and keyboard selection. Derived archives include the original source and derivation for portable cold admission; per-layout personal state and pitch-specific achievement remain bound to the actual derived edition.

Save the current original sidecar first, stage newly admitted package/state bytes additively, and commit library/offset selection only once the request is still current. Reuse a retained derived edition only after independently admitting it. Preserve every prior archive and sidecar. Set 0 by selecting the exact retained original, including original corrections and journals, rather than regenerating baseline pages. Do not bypass `personalForCalculatedEdition` pitch/contact protections; a genuinely new pitch edition gets fresh corrections/history/achievement bindings.

Retained-offset reuse also requires matching root baseline identity, current per-layout complete hand map and hand-policy context; an internally valid archive at the same steps is insufficient if those inputs differ. Store retained offset archives per keyboard layout. When importing a shared derived archive, stage its admitted baseline additively so 0 remains available without access to the originating computer.

If a user first adds a keyboard while transposed and the retained baseline lacks that layout, use the existing ordinary layout-generation path to stage an independently admitted untransposed companion before preparing the derived view. Keep existing zero archives, pages and journals exact; the newly added layout's zero points to this new companion. Each derived archive still contains exactly one nonnested untransposed baseline, which can be the admitted dual-layout companion. The intermediate companion does not activate by itself. Selecting 0 never switches the user's keyboard preference or regenerates an already available original presentation.

Changing the pitch context pauses/cancels transient assessment and resets input. Rebuild an active practice view with the equivalent selected owner/bar passage and its own edition evidence before resuming. A genuinely new pitch context keeps non-achievement practice preferences, such as starting speed, increase and personal target; a retained edition's saved preferences and evidence take priority. Admit its practice state and grouping before committing the selected library pointer. Add only compatible navigation joins: if a retained grouping crosses the old selected joined range, preserve the retained tree and show the passage selector with an explicit unavailable-passage message. Do not introduce overlapping practice journal authority or silently practice a different range. Request supersession guards cover score selection, keyboard, offset, cancellation and stale output. Failed save/generation leaves both visible value and selected package unchanged.

Alternatives rejected: a global preference wrongly affects unrelated pieces; storing pitch in a view-only state cannot bind archived music; importing old progress into a shifted physical exercise falsely credits achievement.

### Shared Score section and numeric interaction

Replace the outer Score disclosure with a normal section heading and current piece subtitle. Reader ordering is Score, then existing general sections; practice ordering is Practice, Score, then those sections. Keep established Options binding/footer/navigation and shared styling. Use the numeric control's existing draft and chevron semantics for Transpose, with centered integer value and an external steps label. The row has no explanatory commentary; show only a concise validation error when needed.

Place Generate fingerings and Share score in a prominent compact action group immediately below settings. Keep the current calculation/history, retained-edition/header and cancel behaviors where applicable. Display correction count with applicable export/restore and undo actions without irrelevant disabled buttons. Put provenance and font-license access in Source & review after the useful controls. Do not add a new global shortcut, reset button or alternative options dialog.

### Existing exact-source native seam

Review and merge the source PR before preparing a fresh isolated carrier from the retained published lineage. Freeze the exact merged Viewer head and unchanged ISO pin; preserve current native/piano/config inputs and source-owned helper/notice/resource proof. Run the established paired Windows/Mac operation with the exact carrier branch as ref, independently validate extracted recipient assets and publish only a complete admitted pair. Additively activate the usual Windows shortcut after streaming preservation and actual native score checks. A source test/build does not certify installed, physical piano or minimum-OS behavior.

## Risks / Trade-offs

- Incomplete pitch transformation → enumerate all admitted absolute pitch structures and add independent positive/negative/octave/range/unknown-field tests; refuse incomplete projection rather than alter musical meaning.
- Historical package regression → separate new version dispatch, retain existing fixtures/policy replay and test unchanged original/cold-open paths.
- New engine fit refusal → retain the active score and report it; observe complete pages and practice strips for representative original and shifted sources on both keyboards.
- Stale worker or interrupted persistence → stage additively with request-token and current-library checks; activate only a fully admitted durable edition.
- Incorrect correction/progress reuse → keep edition-specific journals and verify original bytes and saved identities before and after round trips.
- Hidden or inconsistent UI → browser inspection of actual production worker output at ordinary/narrow/rotated widths, with keyboard edit/cancel and practice Options checks.
- Native package/host differences → preserve exact carrier and recipient checks; report platform and human inspection limits separately.

## Migration Plan

1. Land reviewed additive source policy, admission, retained selection and UI changes with complete source tests/build and visual evidence.
2. Existing library records default to 0 without rewriting old archives/journals. New records are admitted strictly; unsupported or stale records preserve data and remain recoverable.
3. Freeze a reviewed exact-source carrier, build/verify/publish the paired packages, then preserve and additively activate Windows.
4. Roll back by selecting the preserved prior executable/shortcut and retained data; source/native preparation never destroys that recovery path. Selecting 0 within the new application restores the original edition independently of app rollback.

## Delivery evidence and remaining gates

Source PR25 is merged at `fa6593feff0a6c103db0fbd5bd12b286c92fe2a6`; merged tree `05e78e699d3a9fb2a55eb1d11c3707aa8a25af01` matches reviewed head `bd245b5c9a00682ffb3d46ee4a450b980cc6e02e`. Parent independent review passed 478 viewer tests, the configured TS/Vite build, strict OpenSpec validation and 29 carrier/runtime checks. Production browser/worker/cold evidence includes original-journal round trips and complete original/transposed notation on both layouts. Existing separator-template and written-hold relation-side preview refusals remain documented in `docs/score-transposition.md`; complete pages for those controls remain admitted.

Selected carrier `ca6e4a44eeff9ea5fd3d2144acacd3d5c9d61c55`, branch `release/viewer-score-transposition-20261008` and review-only ISO PR340 freeze that source with unchanged ISO `d79292fb0c80aa6e880d61acc641fcb8e8c602e4`. Parent carrier/prepared reviews prove retained published `46da21ed` ancestry, 1,892 unchanged native files, the complete 11-file frontend, 12 decoded Rust probes, 28 notices and the typed 27-retained/1-additive resource map. These are preparation facts; the native task boxes remain pending the parent coordinator's unified evidence.

Actual platform results and extracted-recipient checks, atomic pair publication, streaming Windows preservation, original/transposed native inspection, 0 restoration and usual-shortcut activation are still pending. Final tracking must bind exact run, package and installed identities independently of later documentation main. Existing Mac WK loopback/custom-origin, architecture and minimum-OS limits and unobserved physical MIDI/pedal/audio/latency limits remain explicit. The prior pair, application, data/bank and recovery shortcut must stay retained until the gated replacement is verified. No OpenSpec archive is part of this tracking work.
