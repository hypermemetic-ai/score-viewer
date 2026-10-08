# Proposal

## Why

The operator reports disconnected measure fragments in passage selection and active practice, plus long-duration hollow stems left behind after their notes disappear. Schumann No. 14 practice was also unusable, prompting a separately completed Windows rollback; repairs now belong in the extracted viewer repository so the intended fixed-position practice can receive a usable visual and musical review.

## What Changes

- Compose selected consecutive measures into one continuous horizontal strip with aligned staff lines, correctly owned musical separators, and no independent crop gaps or horizontal scrollbar.
- Use the same passage composition rules in the leaf selection preview and active practice, while retaining fixed reading positions, existing slot replacement eligibility, and paused/unmeasured page controls.
- Fit an ordinary four-bar leaf across the available width efficiently. Keep large joined passages bounded to useful windows rather than compressing a whole work into a tiny preview.
- Bind all owned duration ink, including hollow stems and their white interiors, to the same visibility and Pause restoration as the associated notes. Handle supported glyph families and scores generically.
- Preserve joined/component attainment independence, timing and beat-aligned transitions, Done/Enter/pedal completion, queued speeds, shared rotation/input bindings, frozen package identity, and saved data.
- Require rendered lifecycle observations and visual inspection alongside meaningful geometry/ownership regression tests. Distinguish agreement with the fixed-position idea from acceptance of its implementation.

## Capabilities

### New Capabilities

- `practice-passage-display`: Continuous source-faithful practice passages, fixed reading references, readable selection previews, and complete note-ink visibility/restoration across supported keyboard presentations.

### Modified Capabilities

None. `practice-package` governs shared engraving preparation and frozen recipe compatibility; this change composes existing presentation ink for application practice. `score-viewer-delivery` retains its separate paired native delivery contract.

## Impact

- Viewer application composition and lifecycle: `src/practice-view.ts`, `src/practice-browser.ts`, `src/practice-crop-fit.ts`, associated styles, and a scoped application passage/ownership helper if needed. `src/practice-window.ts` supplies the existing fixed-slot contract and should change only if integration requires a behavior-preserving adjustment.
- Tests: existing practice browser/window/session/lifecycle coverage, new meaningful rendered geometry/ownership regressions, and browser observations of actual preview and practice output. `src/practice-preview.ts` is the MIDI attack-preview matcher, not the passage-selection renderer; its matching behavior is preserved.
- Source baseline: merged viewer `11c1128a6140b9964aa7f2b4035de761ed7814fa`; shared notation/calculator remains pinned at `da93cf9e0359d861987fd76611b59b14b6aedb92`. No competing extraction, duplicated engine, package regeneration, permanent raw shared API, or dependency-pin change is proposed.
- The current Zelda package is private and absent from this repository. A generic real-engine long-note fixture can establish source regression evidence, while private Zelda observation remains an explicit acceptance check.
- This proposal does not port the ISO release lane, build or activate a replacement native package, or alter the restored Windows installation. Native delivery remains separately coordinated through the documented release seam.
