# exploratory-calibration Specification

## Purpose

Collect a bounded, setup-controlled set of physical-contact effort judgments with durable provenance, understandable progress and rating-only input.

## Requirements

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

### Requirement: Fixed setup and block acknowledgment
The viewer SHALL keep “Keep your wrist in place. Keep your hand pointing the same way.” visible next to rating controls. Every new block and resumed session SHALL require acknowledgment of the displayed relaxed fixed setup before accepting ratings; the pending block SHALL display its first target.

#### Scenario: Block change and resume
- **WHEN** the player enters a different block or resumes after closing or losing focus
- **THEN** previous judgments and current target remain available but new ratings are gated until the setup is acknowledged and saved

### Requirement: Five reported effort grades
New collection SHALL prescribe “Press both keys together, then alternate.” with a genuine alternating trill and a distinct protocol identity. It SHALL ask “How much effort does that take?” and retain the five approved natural fit, easy adjustment, comfortable effort, barely possible and unavailable descriptions. Grades 0–3 SHALL attest both tasks; grade 4 SHALL not require them. Historical held-anchor records SHALL retain their original protocol.

#### Scenario: Report a grade
- **WHEN** a player rates an acknowledged new trial
- **THEN** saved evidence identifies combined pressing and alternating trill, with no inferred pose, anatomy or old held-anchor attestation

### Requirement: Concurrent rating inputs and edge protection
Digit0–4 and Numpad0–4 SHALL accept ratings during collection whether MIDI is connected or not. MIDI SHALL accept any complete eligible C–G♯ block outside the whole current tested span, mapping C/D/E/F♯/G♯ to grades 0/1/2/3/4. Held controls, repeats and simultaneous chords SHALL not grade later targets.

#### Scenario: Reclassified held note
- **WHEN** a held test note becomes an eligible control after navigation or a readiness gate opens
- **THEN** its repeated note-on remains ignored until release and a fresh press

#### Scenario: Concurrent keyboard and MIDI
- **WHEN** MIDI is connected and a control is released
- **THEN** either raw Digit/Numpad code or a fresh eligible MIDI control can enter the next rating without an exclusive mode switch
- **AND** velocity-zero note-on is treated as release

### Requirement: Calibration isolates playing telemetry
Active calibration SHALL receive validated rating input before practice observers and independently of score-clock activation. Test-note messages SHALL create no observations, playing timelines or performance measurements. Device generation, focus and session lifecycle SHALL prevent stale input; disconnect, focus loss and session replacement SHALL clear transient edge state. Normal instrument sound SHALL remain usable.

#### Scenario: Calibrate without a score
- **WHEN** the calibration modal is active with no score open
- **THEN** current-device rating input works and no practice observer receives test or control notes

### Requirement: Durable advancement and recovery
The viewer SHALL save the complete versioned session before publishing setup, rating advancement, navigation or undo. Pending writes SHALL prevent additional judgments. A failed save SHALL retain the last durably accepted target and evidence and report the error without manufacturing progress.

#### Scenario: Slow or failed write
- **WHEN** persistence is pending or rejects
- **THEN** a second input cannot rate an unseen target and the viewer advances only after a successful write

### Requirement: Revisit correction undo and finite progress
The viewer SHALL show measured and remaining required judgments and block progress. Revisiting and correcting SHALL append history; undo SHALL retain an auditable retraction and restore a prior judgment or unknown. Completion SHALL require an active judgment for every canonical target, not revision count or queue-page exhaustion.

#### Scenario: Correct and retract
- **WHEN** the player corrects an earlier target and later undoes that observation
- **THEN** original evidence remains, the last unretracted judgment is effective, and completion counts unique rated targets only

### Requirement: Separate resumable evidence and complete export
The viewer SHALL persist the new alternating effort collection separately from historical pilot sessions, legacy span calibration, fingertip readings and personal score data. It SHALL offer Continue, Change a rating and Export without history or dimension menus. Reopening and hand changes SHALL require fresh setup acknowledgment. Invalid bytes SHALL remain recoverable and protected from replacement.

#### Scenario: Resume or invalid data
- **WHEN** the player reopens calibration
- **THEN** the instrument collection resumes with setup pending and complete evidence remains exportable, including retained historical records under their original protocol
- **AND** existing legacy calibration and calculated or personal fingerings remain unchanged
