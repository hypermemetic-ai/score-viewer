## MODIFIED Requirements

### Requirement: Visible primary selection
Comparable adjacent pairs SHALL retain an editable primary-finger selector. Thumb/index SHALL use the accepted fixed index reference. Saved readings SHALL normalize second-minus-first in the common forward frame without assuming which comparable finger is longer.

#### Scenario: Correct finger ordering
- **WHEN** the reference finger changes for a comparable pair
- **THEN** diagram, instructions and stored sign remain consistent with the actual choice

#### Scenario: Thumb reference
- **WHEN** thumb/index length difference is measured
- **THEN** index is the fixed wall reference and thumb is read against its own staggered gap

## ADDED Requirements

### Requirement: Finger-specific length-difference landmarks
Straight, flat length-difference readings SHALL use the accepted finger-specific contact levels and each finger's local window. Thumb/index SHALL use the lowest odd level and lower-main even level respectively. Other adjacent pairs SHALL use neighboring same-parity lower-main keys. Left-hand placement SHALL reflect actual pitch and preserve parity. Zero SHALL align with the neighboring opposite-parity next level's starting line; 100 SHALL align with the finger's own next-level wall. Span/stretch conditions SHALL remain separate.

#### Scenario: Staggered thumb and index windows
- **WHEN** a right-hand thumb/index reading opens
- **THEN** thumb uses ISO 1's lowest level with window 34–59.8 mm and index uses ISO 4's lower main level with window 66–93.75 mm on the accepted profile
- **AND** local percentages map to physical depths in one common forward wire axis, retaining raw entries and local window definitions without equating the two rear walls

#### Scenario: Other fingers and left hand
- **WHEN** another adjacent pair or the left hand is measured
- **THEN** placement remains anatomically ordered, same-parity lower-main windows use 66–93.75 mm, and camera rotation changes only projection
