# Spec Delta

## Purpose

Read genuine Bass and Guitar source parts in ISO notation or tablature while preserving the same musical facts and source ownership.

## ADDED Requirements

### Requirement: Bounded source-faithful Guitar Pro intake
The Viewer SHALL import supported Guitar Pro through the reviewed bounded converter contract, preserve its source/provenance and select genuine source tracks. Unsupported formats/features or incomplete required facts SHALL refuse without replacing existing data.

#### Scenario: Supported part and unsupported input
- **WHEN** a supported source part is imported
- **THEN** its original bytes, selected track identity, report and canonical musical facts are retained
- **WHEN** conversion is canceled or source support is insufficient
- **THEN** no partially admitted score or replacement library pointer is installed

### Requirement: Genuine instrument and physical facts
Bass and Guitar selection SHALL choose an admitted source part/profile without retuning or transposing source notes. TAB SHALL use complete retained tuning and source string/fret positions for every written component; missing or conflicting facts SHALL refuse.

#### Scenario: Alternate tuning and tied components
- **WHEN** a part contains alternate tuning, tied written components, chords or dead notes
- **THEN** TAB retains their exact source strings/frets and musical ownership
- **AND** a dead note retains null sounding pitch rather than an invented piano note

### Requirement: Independent dual notation admission
ISO and TAB SHALL have independent source-owned preparation recipes, complete component appearances/relations and valid geometry against the same canonical part. Historical archive authority SHALL remain literal. Neither view SHALL fabricate piano seats, fingers or hand roles.

#### Scenario: Malformed second view
- **WHEN** a TAB page, owner, component, tuning or relation differs from exact source preparation
- **THEN** admission refuses before installation while retaining the original source and existing score

### Requirement: Consistent notation selection
The reader SHALL visibly expose Instrument and Notation controls using Bass/Guitar and ISO/TAB consistently with Score options. Switching notation SHALL preserve source location, selected passage and musical evidence across different pagination; switching during playback SHALL enter Free view first.

#### Scenario: Keyboard switch and cold reopening
- **WHEN** the user switches ISO to TAB with keyboard controls and later reopens the score
- **THEN** the same source measure/component and saved notation are available
- **AND** source pitch, tuning, manual progress and other source parts remain unchanged
