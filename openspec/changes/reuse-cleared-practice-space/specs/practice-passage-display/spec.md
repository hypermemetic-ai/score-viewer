# Spec Delta

This delta targets the main requirement blocks established by prerequisite `repair-practice-rendering`, merged at `c068334ecd3bbbedba17699d7f3533286f9e2e60`. Its updated bodies explicitly replace the canonical-slot/lifecycle contract while preserving the existing scenario identities.

## MODIFIED Requirements

### Requirement: Stable active reading references
Measured active practice SHALL retain the current measure's exact position and size within an unchanged viewport. Other whole measures can be rearranged only in an atomic refill that draws incoming music. Internal source geometry and one common scale SHALL remain unchanged. Music SHALL NOT slide continuously. Nonconsecutive positions SHALL NOT be presented as consecutive musical boundaries.

#### Scenario: Naturally centered active passage
- **WHEN** an active bounded display is fitted before count-in
- **THEN** complete admitted notation is framed naturally with substantial outer breathing room and a clear left inset
- **AND** subsequent hides/refills do not recenter the surface or change the protected current measure

#### Scenario: Protected and eligible source positions
- **WHEN** measured practice has accepted every required attack in an older measure and entered a later reading measure
- **THEN** its old ordinary ink can retire as incoming music is atomically allocated around the current measure
- **AND** continuing sound remains assessed independently, with authored tie cues where applicable
- **AND** unread required attacks, errors or an unmeasured run cannot manufacture automatic retirement

#### Scenario: A joined run wraps through fixed positions
- **WHEN** replacement displays resident bars across a genuine reading-order wrap
- **THEN** current-measure references, source order and accessible source identities remain clear, with an explicit staff break at each nonconsecutive boundary
- **AND** consecutive source measures have coherent notation without falsely connecting a nonconsecutive wrap

### Requirement: Complete note-ink ownership
All ordinary ink owned by a note SHALL retire together, including ordinary/hollow stems, white interiors, heads, flags, dots and annotations. Hidden ordinary notes SHALL leave no residual duration ink. Shared ink required by another visible owner and unrelated notes/staff SHALL remain correct. A separately classified source-owned held tie cue SHALL use its explicit visual lifetime without retaining the old ordinary bundle.

#### Scenario: A long-duration note becomes hidden
- **WHEN** practice retires an eligible note with a hollow half- or whole-duration stem
- **THEN** the hollow outline and white interior disappear with its ordinary note ink
- **AND** other visible notes and structural staff remain intact
- **AND** any retained tie cue is explicit source-owned continuation paint rather than an orphaned stem or head

#### Scenario: Shared duration and relation ink
- **WHEN** a displayed beam or relation has multiple source owners and some remain visible
- **THEN** paint required by those contributors remains correct without orphaned duration ink from retired ordinary bundles
- **AND** tie cue removal does not alter sounding obligations

### Requirement: Full-window Pause restoration
Pausing a running passage SHALL restore complete source notation for the current resident measures, including every note-owned duration mark and white reservation, at their current allocated positions. Restoration SHALL use the same ownership model as removal. Retired measure identities SHALL NOT restore old full notation over newer resident measures or require score-specific exceptions.

#### Scenario: Pause after ordinary and hollow notes were removed
- **WHEN** the user pauses after ordinary and hollow-stem groups disappeared or their space was reused
- **THEN** all resident measures restore complete source notation at their allocated reading positions
- **AND** repeated start, retirement, refill and Pause cycles preserve source ownership and geometry without duplicated retired ink
