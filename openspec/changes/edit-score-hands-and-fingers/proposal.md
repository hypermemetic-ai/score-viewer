# Proposal

## Why

The ordinary score viewer interprets played notes and can turn pages or move the editing cursor without the player's intent. Players also need to choose the performing hand and finger directly, with faithful notation updating fast enough for uninterrupted editing.

## What Changes

- **BREAKING behavior:** make the reader, editor, selector and Free view passive with respect to musical note matching; retain score interpretation only in section Reading/Timed and their owned preparation. Retire full-score Performance execution and controls while preserving historical records.
- Preserve explicit keyboard/pedal commands, MIDI diagnostics/configuration and independent piano sound without using them as score-following evidence.
- Move Up/Down editing selection by whole systems to the horizontally nearest editable note, crossing pages as needed. Preserve existing Left/Right/Tab movement and input ownership.
- Add L/R personal hand choices for the selected note, even when they differ from imported assignments. Keep the current finger until replaced and keep selection after a hand key; digit entry retains its advance behavior.
- Persist source-guarded personal hand/finger choices and retain original assignments, package bytes, fingering history, library, settings and raw practice evidence. Notation, practice and future calculation requests consume the effective personal choices. Hand/finger edits preserve practice progress; historical evidence retains its earlier choices, and only an explicit player reset removes credit.
- Provide a fast shared-engraving projection path rather than recalculating/repackaging the score on each keypress. Aim for the next display frame and retain 100 ms p95 as a tuning goal on named warm-score/device benchmarks; report the achieved correctly rendered latency honestly. The user accepted delivery at the achieved speed after the promising geometry optimization is checked, so 100 ms is not a release blocker. Ordered saves do not block editing.
- Prioritize this change before `form-bounded-practice-exercises`, which consumes its effective assignment interface.

## Capabilities

### New Capabilities

- `score-editing`: Passive score interaction, whole-system edit navigation, source-guarded hand/finger choices, faithful live projection, ordered persistence and measurable edit latency.

### Modified Capabilities

- `practice-passage-display`: Retire full-score Performance presentation requirements while preserving shared practice tempo controls and restricting musical interpretation outside active section modes.

## Impact

Reader/input routing and edit handlers in `src/main.ts`; `src/selection.ts`, `src/edit-sequence.ts`, personal state/journal and cached page/annotation rendering; effective musical assignments consumed by practice and calculator request authority. Current changed-hand preparation renders and independently admits a complete immutable edition, so it cannot be the interactive edit path.

A reviewed extension to the shared ISO renderer/projection and authority contracts is required if the existing dependency cannot produce bounded faithful updates. Develop that extension in its owning repository and deliberately update the pinned dependency; do not duplicate engraving or mutate frozen source SVGs. Provider/authentication/workflow configuration and native identity remain outside scope. Source/browser latency proof is separate from native installed acceptance.
