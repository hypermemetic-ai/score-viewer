# Spec Delta

## MODIFIED Requirements

### Requirement: Canonical bounded collection
The viewer SHALL inherit the selected instrument and collect one pooled set of central-reference judgments. Jankó SHALL contain 208 judgments in eight blocks; conventional SHALL contain 52 at a standard central reference. Performing-hand selection SHALL choose a physically equivalent realization and record the hand used without requiring a second set. Missing required keys SHALL prevent starting.

#### Scenario: Start either instrument
- **WHEN** the player begins on the selected instrument
- **THEN** progress counts each canonical target once and changing performing hand displays an equivalent physical target without creating another collection

#### Scenario: Reference near an edge
- **WHEN** a physical target cannot be represented within available keys
- **THEN** collection cannot start and identifies incomplete coverage without assigning unavailable grades

### Requirement: Physical contact display
The viewer SHALL use one stable keyboard illustration with connected Jankó levels, one line per boundary, correct conventional key shapes and colors, highlighted contacts and direct finger names. Note notation SHALL follow saved application choice independently from color choices. The physical action and all five descriptions SHALL be visible together on the approved black URW Gothic layout.

#### Scenario: Jankó and conventional guidance
- **WHEN** a target is displayed
- **THEN** the player sees exactly which finger presses each physical key and level, with neighboring keys at a stable scale
- **AND** changing naming or colors changes no target identity or saved evidence

### Requirement: Five reported effort grades
New collection SHALL prescribe “Press both keys together, then alternate.” with a genuine alternating trill and a distinct protocol identity. It SHALL ask “How much effort does that take?” and retain the five approved natural fit, easy adjustment, comfortable effort, barely possible and unavailable descriptions. Grades 0–3 SHALL attest both tasks; grade 4 SHALL not require them. Historical held-anchor records SHALL retain their original protocol.

#### Scenario: Report a grade
- **WHEN** a player rates an acknowledged new trial
- **THEN** saved evidence identifies combined pressing and alternating trill, with no inferred pose, anatomy or old held-anchor attestation

### Requirement: Separate resumable evidence and complete export
The viewer SHALL persist the new alternating effort collection separately from historical pilot sessions, legacy span calibration, fingertip readings and personal score data. It SHALL offer Continue, Change a rating and Export without history or dimension menus. Reopening and hand changes SHALL require fresh setup acknowledgment. Invalid bytes SHALL remain recoverable and protected from replacement.

#### Scenario: Resume or invalid data
- **WHEN** the player reopens calibration
- **THEN** the instrument collection resumes with setup pending and complete evidence remains exportable, including retained historical records under their original protocol
- **AND** existing legacy calibration and calculated or personal fingerings remain unchanged
