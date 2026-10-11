# Spec Delta

## Purpose

Collect a bounded, setup-controlled set of physical-contact effort judgments with durable provenance, understandable progress and rating-only input.

## ADDED Requirements

### Requirement: Canonical bounded collection
The viewer SHALL use its existing instrument selection and prescribe the exploratory protocol for one selected hand and central reference location. Jankó SHALL contain 208 judgments in eight blocks; conventional SHALL contain 52 per explicitly selected reference pitch, with at most two references. Missing required target keys SHALL prevent starting.

#### Scenario: Start either instrument
- **WHEN** the player chooses a hand and valid reference pitch on the selected instrument
- **THEN** the viewer shows the exact canonical count, finger pairs, mirrored usual-side roles and physical-copy coverage before starting
- **AND** a second hand requires a separate session

#### Scenario: Reference near an edge
- **WHEN** the selected instrument lacks a required target within thirteen decimal semitone steps on either side
- **THEN** collection cannot start and identifies incomplete coverage without assigning unavailable grades

### Requirement: Physical contact display
The viewer SHALL identify the actual anchor and tested finger, pitches, rows and levels on usable physical surfaces, with surrounding keys and correct colors. Horizontal-center guidance SHALL permit front-to-back contact choice without inventing a measured strike point. The viewer SHALL distinguish finger adjustment from whole-hand swivelling with a visual example before collection.

#### Scenario: Jankó and conventional guidance
- **WHEN** a target is displayed
- **THEN** anchor and active finger indicators identify their physical keys, Jankó rows run near-to-far with both levels, and conventional white-key rear narrowing is respected
- **AND** changing Jankó colors changes no trial identity or evidence

### Requirement: Fixed setup and block acknowledgment
The viewer SHALL keep “Keep your wrist in place. Keep your hand pointing the same way.” visible next to rating controls. Every new block and resumed session SHALL require acknowledgment of the displayed relaxed fixed setup before accepting ratings; the pending block SHALL display its first target.

#### Scenario: Block change and resume
- **WHEN** the player enters a different block or resumes after closing or losing focus
- **THEN** previous judgments and current target remain available but new ratings are gated until the setup is acknowledged and saved

### Requirement: Five reported effort grades
The viewer SHALL show the protocol's five ordinal grade meanings and short combined-pressing then held-anchor tapping task. Grades 0–3 SHALL attest both patterns; grade 4 SHALL permit an unavailable realization without performed patterns. Untested and uncertain SHALL remain unknown, and grade 4 SHALL not prune later tests.

#### Scenario: Report a grade
- **WHEN** the player enters a grade under an acknowledged setup
- **THEN** the saved observation contains that trial's fixed-setup association and reported pattern evidence, without inferred pose, contact-depth coordinates or anatomical costs

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
The viewer SHALL persist exploratory sessions separately from legacy span calibration, fingering calculations and personal score data. It SHALL retain sessions across instrument changes and resume through fresh setup gating. Export SHALL contain the complete versioned session, plan, provenance and histories. Invalid or unsupported stored bytes SHALL remain recoverable without silent replacement.

#### Scenario: Resume or invalid data
- **WHEN** the player reopens a saved session or storage contains unsupported data
- **THEN** valid evidence resumes with setup pending, while invalid bytes are retained for export and protected from overwrite
- **AND** existing legacy calibration and calculated or personal fingerings remain unchanged
