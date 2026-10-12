# fingertip-calibration Specification

## Purpose

Collect optional effective fingertip reach differences with explicit measurement context, preserving raw evidence without inferring anatomical dimensions.

## Requirements

### Requirement: Four pooled adjacent readings
Each hand collection SHALL have four adjacent signed relative reach readings in one declared forward frame. Other pair differences SHALL derive by summing signed adjacent differences without anatomical length inference.

#### Scenario: Change hands
- **WHEN** a second hand is measured
- **THEN** it receives separate evidence rather than mirrored progress

### Requirement: Independent percent and millimeter methods
Percentage SHALL be the default alongside direct millimeters. Finite signed inputs SHALL be accepted; percentage SHALL retain both fractions and known axis endpoints, and raw entries SHALL retain their method.

#### Scenario: Switch methods
- **WHEN** the player enters a negative percentage or switches methods
- **THEN** their drafts remain intact and any physical conversion uses the declared window

### Requirement: Visible primary selection
The player SHALL retain an editable primary-finger selector. Saved readings SHALL normalize second-minus-first in the common frame without assuming which finger is longer.

#### Scenario: Correct finger ordering
- **WHEN** the reference finger changes
- **THEN** the diagram/instructions and stored sign remain consistent with the actual choice

### Requirement: Accepted physical measurement guidance
Measurement guidance SHALL use the accepted profile and anchored starting/end lines with system-font labels, full playable regions and clear flat-finger placement. Camera rotation SHALL only change projection.

#### Scenario: Thumb reading
- **WHEN** the model is rotated or zoomed
- **THEN** 0/100 positions remain attached to the same physical window

### Requirement: Durable readings and navigation
Fresh readings SHALL be empty; save/Enter SHALL validate and persist before advancement. Navigation SHALL preserve drafts and held inputs SHALL not skip readings. Explicit omissions SHALL remain distinct from measurements.

#### Scenario: Invalid draft and failed save
- **WHEN** a blank draft or failed save is submitted
- **THEN** completion and durable evidence do not advance

### Requirement: Separate recoverable evidence
Relative readings SHALL retain player/hand/frame/window, raw entry, method and date in the stretch ledger. Historical readings SHALL remain unresolved unless an explicit physical mapping is verified.

#### Scenario: Reopen or malformed data
- **WHEN** old readings lack a verified frame/window mapping
- **THEN** their original bytes remain exportable and no conversion is fabricated
