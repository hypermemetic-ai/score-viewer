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
Comparable adjacent pairs SHALL retain an editable primary-finger selector. Thumb/index SHALL use the accepted fixed index reference. Saved readings SHALL normalize second-minus-first in the common forward frame without assuming which comparable finger is longer.

#### Scenario: Correct finger ordering
- **WHEN** the reference finger changes for a comparable pair
- **THEN** diagram, instructions and stored sign remain consistent with the actual choice

#### Scenario: Thumb reference
- **WHEN** thumb/index length difference is measured
- **THEN** index is the fixed wall reference and thumb is read against its own staggered gap

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

### Requirement: Finger-specific length-difference landmarks
Straight, flat length-difference readings SHALL use the accepted finger-specific contact levels and each finger's local window. Thumb/index SHALL use the lowest odd level and lower-main even level respectively. Other adjacent pairs SHALL use neighboring same-parity lower-main keys. Left-hand placement SHALL reflect actual pitch and preserve parity. Zero SHALL align with the neighboring opposite-parity next level's starting line; 100 SHALL align with the finger's own next-level wall. Span/stretch conditions SHALL remain separate.

#### Scenario: Staggered thumb and index windows
- **WHEN** a right-hand thumb/index reading opens
- **THEN** thumb uses ISO 1's lowest level with window 34–59.8 mm and index uses ISO 4's lower main level with window 66–93.75 mm on the accepted profile
- **AND** local percentages map to physical depths in one common forward wire axis, retaining raw entries and local window definitions without equating the two rear walls

#### Scenario: Other fingers and left hand
- **WHEN** another adjacent pair or the left hand is measured
- **THEN** placement remains anatomically ordered, same-parity lower-main windows use 66–93.75 mm, and camera rotation changes only projection
