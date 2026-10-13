## ADDED Requirements

### Requirement: Direct hand-only calibration start
The viewer SHALL begin a new collection from a hand choice without requiring keyboard endpoints, row, central key, body offset or seating text. Its automatic protocol frame and working window SHALL be labeled nominal in retained evidence; unmeasured body position and physical keyboard endpoints SHALL remain unverified.

#### Scenario: Start and measure with the keyboard
- **WHEN** the player starts a new hand collection and selects a hand with R, L or Enter
- **THEN** the first fingertip reading opens with numeric focus and its visible primary action works without tabbing through setup fields

#### Scenario: Nominal coverage
- **WHEN** an automatic working window reaches its limit
- **THEN** the collection records test-window coverage without claiming a measured hardware endpoint or classifying untested contacts unavailable

### Requirement: Historical calibration stays out of collection entry
The current calibration interface SHALL omit the obsolete thumb–pinky collection editor while retaining complete historical evidence and its existing export behavior.

#### Scenario: Retained old evidence
- **WHEN** a player opens current calibration or its options
- **THEN** no old thumb–pinky collection entry appears, and exporting all evidence still retains the original historical records
