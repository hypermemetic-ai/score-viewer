# Spec Delta

## Purpose

Refill source-faithful practice music into reusable display space without moving the measure being played or confusing visible note retirement with sounding-note assessment.

## ADDED Requirements

### Requirement: Atomic practice refill
Measured connected practice SHALL retire eligible old ink, allocate incoming music and update continuation cues in one redraw. Other resident measures SHALL change layout only at that event. Music SHALL NOT slide continuously, and a completed four-measure batch turn SHALL NOT substitute for reading lead.

#### Scenario: Reuse earlier space while playing the last resident measure
- **WHEN** incoming music is drawn while the last resident measure is being played
- **THEN** old eligible ink disappears and available space is redistributed in the same redraw
- **AND** the current measure retains its exact position and size

### Requirement: Preserve original measure interiors
Every resident measure SHALL retain its admitted internal note spacing and geometry at one common scale. Allocation SHALL move whole measure intervals rather than stretch their interiors. Genuine source adjacency SHALL remain coherent; wraps SHALL retain unambiguous labels and SHALL NOT imply false musical adjacency.

#### Scenario: Incoming wide measure across an original system break
- **WHEN** a wider source measure enters the display
- **THEN** it retains its original internal spacing and required ties/slurs connect through verified source endpoints
- **AND** the protected current measure's notes remain at the same coordinates and scale

### Requirement: Bounded resident display and preflight reading lead
The active display SHALL contain at most four resident measures and handle three-to-five-bar leaves and longer joined runs. Placement and complete-ink fitting SHALL be verified before count-in. Inside the selection, the next written measure SHALL be resident on entry to its preceding reading measure; admission SHALL also cover earlier legal attack/reveal requests across rests. Queued rates SHALL retain valid admission without delaying musical transitions.

#### Scenario: A wide incoming measure cannot fit a narrow retired prefix
- **WHEN** a candidate allocation has enough total width but no contiguous placement around the pinned current interval
- **THEN** preflight chooses a feasible placement and initial frame before playing, or reports unsupported placement before count-in
- **AND** practice does not conceal the problem until the incoming attack is due

#### Scenario: Early accepted attack across a rest gap
- **WHEN** a required later-measure attack can legally arrive before the preceding rest measure's clock entry
- **THEN** admitted residency and eligible source ink cover that request without waiting for the rest boundary
- **AND** a terminal selected leaf follows its existing repeat/count-in instead of requesting an outside measure

#### Scenario: Queued acceleration
- **WHEN** a queued rate changes the next loop's legal timing states
- **THEN** its placement admission already covers those states without delaying the beat-aligned transition or changing live current geometry

### Requirement: Separate visual retirement from sounding assessment
An older measure's ordinary note ink SHALL become eligible for retirement after all its required attacks are accepted and a later reading measure is entered. Continuing sound SHALL NOT require retaining the entire old note bundle or measure footprint. Visual retirement SHALL NOT modify attack acceptance, hold/sustain obligations, timing or completion evidence.

#### Scenario: Early accepted transition and old sounding notes
- **WHEN** a later measure's first attack is accepted before an older sounding duration ends
- **THEN** eligible older note ink can retire in the refill transaction
- **AND** the original sounding obligations and early-release failure rules remain authoritative

### Requirement: Source-owned held tie cues
A visually retired tied owner SHALL retain an authored continuation cue while useful in the protected current measure. Its actual paint SHALL reserve space independently of the old measure. The cue SHALL end at that measure's finish or the owner's sounding end, whichever occurs first. Untied or pedal-only holds SHALL NOT receive invented ties.

#### Scenario: Zelda19 continues sounding through20
- **WHEN** the note attacked at2592 remains sounding until2880 and its old measure ink retires while20 is being played
- **THEN** a source-owned tie cue remains without its old head or duration stem
- **AND** the continuation head's2736 onset does not prematurely remove the cue or end the assessed hold

### Requirement: Resident restoration and original error context
Pause SHALL restore complete source notation for the current resident measures at their allocated positions. Retired old bundles SHALL NOT overwrite new allocations. An error involving a retired owner SHALL retain access to its original source context and musical obligation.

#### Scenario: Pause after held-note retirement and refill
- **WHEN** the user pauses after newer measures reuse an older held note's space
- **THEN** all resident measures restore complete owned ink without duplicating the retired old note
- **AND** a held-note failure can still display its original source context

### Requirement: Preserve existing modes and musical state
Refill SHALL preserve unmeasured readability/manual windows, beat-aligned count-in/repeat, queued speeds, independent joined/component attainment and reversible Done. Shared rotation/resize SHALL preserve the session and loop clock. Packages, source fingerprints, calculator planning and saved evidence SHALL remain unchanged.

#### Scenario: Repeat, unmeasured practice and rotation
- **WHEN** a loop repeats, an unmeasured window is turned, or the display is rotated
- **THEN** existing musical/state behavior remains correct and no fabricated matched attack enables retirement or attainment
- **AND** a measured repeat starts from its admitted initial allocation at the existing musical transition
