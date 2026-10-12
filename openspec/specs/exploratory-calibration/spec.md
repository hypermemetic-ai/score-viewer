# exploratory-calibration Specification

## Purpose

Collect a bounded, setup-controlled set of physical-contact effort judgments with durable provenance, understandable progress and rating-only input.

## Requirements

### Requirement: Canonical bounded collection
The viewer SHALL collect four relative readings, ten adaptive pair sweeps and ten conditional triple slots per explicitly measured hand and central setup. Unknowns and omissions SHALL remain explicit, with no invented remaining judgment total.

#### Scenario: Start either instrument
- **WHEN** a hand collection begins
- **THEN** its provenance and admitted keyboard range are retained separately from other hands and historical protocols

#### Scenario: Reference near an edge
- **WHEN** the admitted physical range ends before another target exists
- **THEN** the sweep records coverage-edge without labeling unknown contacts unavailable

### Requirement: Physical contact display
The viewer SHALL display the accepted sloping physical profile with full playable contact regions, surface/actuator identity, actual depressed states, free camera rotation/zoom/reset and system-font labels. Camera changes SHALL preserve physical measurement endpoints.

#### Scenario: Jankó and conventional guidance
- **WHEN** the player rotates the view or changes key colors
- **THEN** geometry, target identity, fractions and saved readings remain unchanged and the front tongue remains non-playable

### Requirement: Fixed setup and block acknowledgment
The viewer SHALL allow free hand/arm repositioning between static pair trials while requiring flat fingertips aligned parallel to the keyboard on one same-parity physical row with both keys depressed. Resume SHALL require contact reproduction.

#### Scenario: Block change and resume
- **WHEN** a pair begins or resumes
- **THEN** the player reproduces its contacts before ratings, with no trill or fixed-wrist instruction

### Requirement: Five reported effort grades
The new protocol SHALL use six ordinal stretch grades: 0 none/barely detectable, 1 a little, 2 moderate, 3 large/little room, 4 only just reachable, 5 unavailable. Every prepared displayed contact SHALL accept the player's actual grade, including 5 before a reachable baseline. Historical effort meanings SHALL remain unchanged.

#### Scenario: Report a grade
- **WHEN** grade 4 is entered under the new protocol
- **THEN** it records reachable stretch and does not terminate the sweep without an explicit maximum

#### Scenario: First contact unavailable
- **WHEN** the first displayed contact is rated 5
- **THEN** the actual unavailable report is saved without a fabricated reachable result or outward terminal, and the player can choose another starting contact

#### Scenario: Actual outward boundary
- **WHEN** grade 5 is reported outward of an earlier actual reachable result
- **THEN** the terminal links both actual reports while smaller untested contacts remain unknown

### Requirement: Concurrent rating inputs and edge protection
On-screen ratings and Digit0–5/Numpad0–5 SHALL remain available. One fresh down event SHALL commit at most one judgment, with all held controls released before another; repeated/chord input and pending writes SHALL not rate future trials. MIDI input SHALL not rate calibration.

#### Scenario: Reclassified held note
- **WHEN** a key is held across advancement or piano notes arrive
- **THEN** no subsequent judgment is manufactured

#### Scenario: Concurrent keyboard and MIDI
- **WHEN** piano MIDI is connected while a stretch trial is active
- **THEN** computer and screen ratings remain available and MIDI creates no calibration judgment

### Requirement: Calibration isolates playing telemetry
Calibration SHALL isolate piano messages and measurement-page digits from practice, score observers and stretch grading. Focus loss/session replacement SHALL break readiness and clear transient input state.

#### Scenario: Calibrate without a score
- **WHEN** a numeric reach field is edited or piano keys are played during calibration
- **THEN** only the intended measurement field changes and no playing evidence is created

### Requirement: Durable advancement and recovery
All session mutations SHALL persist before publishing their accepted state. Invalid/unsupported bytes SHALL stay read-only and exportable; failed writes SHALL retain the accepted target/evidence.

#### Scenario: Slow or failed write
- **WHEN** persistence fails or malformed evidence loads
- **THEN** the original bytes and pending draft remain available without false progress

### Requirement: Revisit correction undo and finite progress
Review SHALL group readings, sweeps and triples with shared practice-selector navigation. Corrections/retractions SHALL append evidence. Triples SHALL link real grade-3 pair realizations and retain withdrawn/revised dependencies visibly.

#### Scenario: Correct and retract
- **WHEN** a source pair report is revised or withdrawn
- **THEN** the original triple loads with its unchanged source link and a review-needed status

### Requirement: Separate resumable evidence and complete export
New stretch sessions SHALL persist separately from historical effort, pilot, fingertips, legacy spans and score data. Export SHALL retain geometry/provenance, complete ledgers and recoverable historical evidence.

#### Scenario: Resume or invalid data
- **WHEN** a collection is exported or reopened
- **THEN** all recorded identities remain intact and no old grade is reinterpreted numerically

### Requirement: Pair measurement presentation and navigation
The pair screen SHALL use static-contact instructions, omit technical target summaries, and keep its complete rating controls clear of the footer. Left/right SHALL navigate adjacent finger pairs without manufacturing ratings or omissions. Model and editable controls SHALL retain ownership of their input.

#### Scenario: Leave a pair unanswered
- **WHEN** the player moves right then left without rating a pair
- **THEN** that pair remains unmeasured, its target is recoverable and any earlier observations remain unchanged

#### Scenario: Rating area at a short viewport
- **WHEN** the pair screen is displayed at 1280×720 or a narrow viewport
- **THEN** every rating remains fully visible or reachable by unobstructed body scrolling without a stock scrollbar

### Requirement: Explicit keyboard camera mode
The model SHALL provide a clearly indicated keyboard rotation mode with compact controls. While active, arrows rotate, plus/minus zoom and Home resets; Escape SHALL leave the mode. Camera changes SHALL preserve targets and recorded evidence.

#### Scenario: Return to measurement navigation
- **WHEN** the player turns keyboard rotation off or leaves it with Escape
- **THEN** left/right can navigate measurements again without changing any camera or measurement data accidentally
