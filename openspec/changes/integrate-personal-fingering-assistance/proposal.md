# Proposal

## Why

A player's fingering decision should remain available when the same musical material appears again, without requiring the player to repeat the reasoning or manually copy it. The merged fingering-calculator PR36 supplies matching and travel-advice primitives; the viewer needs the persistence, editing behavior and provenance that make them useful.

## What Changes

- Automatically reuse personal fingerings for exact whole-measure matches and for a matching hand when the other hand differs. Update the open score immediately and resolve other scores against current shared choices when loaded.
- Distinguish new information from a changed preference: entering a previously unknown personal finger contributes shared knowledge; modifying an inherited personal finger creates a local exception. Editing the reference updates its shared choices.
- Provide a quiet source indication, a source/return command using the same binding in both directions, and an explicit action to make the current occurrence the reference. Transfer a deleted reference to the next-oldest matching occurrence while retaining shared values.
- Record explicit field intent and authorship for new edits. Import existing personal choices automatically, using the earliest available recorded authorship and normally preserving other existing choices as local exceptions.
- Perform a one-time consolidation of Schumann 14: apply the same earliest-choice rule across exact whole-measure and hand matches, replacing conflicting old fingerings there, retaining originals and a change/provenance report. This special migration includes saved legacy fingers with uncertain field authorship; it does not become the default for new users or run again over later exceptions.
- Add a persistent Notes/Measures editing toggle, defaulting to Space, with Left/Right moving to the first editable contact in adjacent written measures when enabled. Preserve system navigation and ordinary digit advance.
- Show descriptive fingering-travel warnings beside affected notes in the editor, with explanations on selection. Do not interrupt entry into practice or require review acknowledgement.

## Capabilities

### New Capabilities

- `personal-fingering-memory`: Automatic exact musical reuse, shared and local edit semantics, provenance, reference lifecycle, durable library resolution and one-time consolidation.
- `fingering-advice`: Source-bound physical-travel diagnostics and their nonblocking editor presentation.

### Modified Capabilities

- `score-editing`: Add notes/measures navigation and context-aware command bindings; replace the blanket prohibition on editing recurrences with exact personal-memory rules while preserving responsive, source-bound editing and practice progress.

## Impact

- Viewer: `src/main.ts`, `src/selection.ts`, personal assignment/state/authority resolution, ordered persistence, library loading/cache invalidation, shared notation projection, controls and editor presentation.
- Calculator: consume the reviewed PR36 package APIs and extend their contracts for adding missing shared fields, reference transfer and deterministic historical import. Existing `publish` does not transfer origin, and ordinary edits at copies currently always become local. These changes belong in a separately reviewed calculator PR before the viewer pins the resulting package.
- Native storage: serialize revisioned memory and personal-state transactions without losing edits from another process. Preserve immutable score packages and raw practice records.
- Existing `score-editing` scenarios currently require unrelated recurrences to stay unchanged; the delta explicitly narrows that guarantee to nonmatching material and protected local exceptions.
- Delivery remains source, built package, installed package and human acceptance as separate evidence. Planning does not modify the live library or interrupt the current practice session.
