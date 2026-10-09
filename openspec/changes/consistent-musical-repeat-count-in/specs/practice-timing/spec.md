## Purpose

Provides reliable musical count-ins and repeat transitions aligned to the score's actual meter and source bar clock across browser and native playback.

## ADDED Requirements

### Requirement: Complete meter-based cue
Every practice entry SHALL hear at least one complete entry-meter count bar, with metric accents and truthful pickup phase. The reference tempo unit SHALL NOT substitute for the written meter.

#### Scenario: Simple and compound entry
- **WHEN** practice begins or repeats in 3/4 or 6/8
- **THEN** it hears three quarter beats or two dotted-quarter beats respectively before entering at the source bar phase

#### Scenario: Pickup and mixed meter
- **WHEN** entry is a short source bar or the selected phrase changes meter
- **THEN** the complete cue precedes the source-authoritative entry phase and genuine source boundaries determine accents without rounding to a reference beat

### Requirement: Prepared musical repetition
A normal same-passage repeat SHALL start its full cue at the exact previous phrase boundary without an unnecessary silent bar. Delayed output SHALL preserve every count pulse and advance only by whole entry-meter bars.

#### Scenario: Save and output jitter
- **WHEN** progress saving or output readiness varies
- **THEN** prepared audio retains the exact boundary independently of saving, or a complete aligned fallback cue plays before reentry

### Requirement: Owned repeat cancellation
Prepared repeats SHALL preserve queued speeds, attainment, first-loop eligibility and source identity. Pause, error, changed prerequisite or stale ownership SHALL cancel the owned future cue without stopping unrelated audio.

#### Scenario: Speed or completion changes
- **WHEN** a queued speed or reversible Done claim changes before repetition
- **THEN** the changed rate begins on an admitted musical boundary and stale receipts cannot install an older attempt

### Requirement: Honest metronome protocol
Native and browser SHALL admit the same explicit versioned source-meter clock. Legacy requests SHALL retain their prior meaning; malformed or mixed clock contracts SHALL refuse.

#### Scenario: Unsupported clock request
- **WHEN** v2 metadata is malformed or combined with incompatible legacy fields
- **THEN** playback does not start and no truncated attempt is installed
