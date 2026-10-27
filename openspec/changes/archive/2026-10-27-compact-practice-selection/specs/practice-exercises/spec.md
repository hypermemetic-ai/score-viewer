# Spec Delta

## ADDED Requirements

### Requirement: Player-controlled active exercise
The selected practice exercise SHALL remain active until the player explicitly chooses another exercise or leaves practice. Historical attainment, current success, target-speed completion, manual Done, newly unlocked connections and completion of the catalog SHALL NOT automatically select another exercise or open the selector. Normal repeats and speed progression SHALL continue within the selection.

#### Scenario: Slow replay of a completed section
- **WHEN** a section with historical target-speed achievement succeeds at 10% with a configured 2% increase
- **THEN** it repeats the same section at 12%, subject to existing count-in and repeat readiness rules
- **AND** the historical target-speed achievement remains intact
- **AND** a missing or late repeat receipt pauses that same section for explicit Resume

#### Scenario: Newly reach target speed
- **WHEN** the selected section first succeeds at target speed or repeats another success at that speed
- **THEN** the same exercise remains selected and normal repetition continues at the admitted rate
- **AND** a newly unlocked connection becomes available without being selected or started

#### Scenario: Complete the catalog or change manual evidence
- **WHEN** all catalog exercises reach their targets or an eligible Done/undo action changes completion
- **THEN** neither action selects another exercise or automatically returns to the selector
- **AND** speed locks, queued edits, reversible claims and save-failure handling retain their existing semantics

#### Scenario: Repeat a selected contrast
- **WHEN** the player completes A then B of a selected contrast exercise
- **THEN** A-to-B remains an internal transition and the next cycle returns to A of that same exercise
- **AND** credit requires the accepted complete cycle, with no automatic selection of another section or contrast

#### Scenario: Explicitly choose another exercise
- **WHEN** the player returns to the selector and activates another eligible exercise
- **THEN** that explicit selection changes the active exercise through its existing entry flow
- **AND** passive suggestions and browser highlighting alone cannot start or replace active practice
