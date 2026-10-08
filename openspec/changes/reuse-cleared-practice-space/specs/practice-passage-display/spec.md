# Spec Delta

This delta targets the main requirement blocks established by prerequisite `repair-practice-rendering`, merged at `c068334ecd3bbbedba17699d7f3533286f9e2e60`. Its updated bodies explicitly replace the canonical-slot/lifecycle contract while preserving the existing scenario identities.

## MODIFIED Requirements

### Requirement: Stable active reading references
During measured count-in or playing, the current measure SHALL retain its exact screen position and size within an unchanged viewport. Other whole measures SHALL change layout only in an atomic refill that draws incoming music. Original interiors and one common live scale SHALL remain unchanged. The reading surface SHALL remain continuous and naturally framed; music SHALL NOT slide continuously. Source identities and relation ownership SHALL remain truthful through spatial wraps.

#### Scenario: Naturally centered active passage
- **WHEN** an active bounded display is fitted before count-in
- **THEN** its complete initial notation and continuous staff are naturally centered with substantial outer breathing room and a clear left inset
- **AND** subsequent hides/refills do not recenter the live surface or change the protected current measure

#### Scenario: Live finger display and status changes retain reading references
- **WHEN** measured count-in or playing toggles finger display, changes status text or refills without a viewport change
- **THEN** source residency and reading retirement continue through live finger display while common scale and screen origin remain fixed
- **AND** Free view, error and preparation phases do not fabricate accepted attacks or advance live residency

#### Scenario: Protected and eligible source positions
- **WHEN** measured practice has accepted every required attack in an older measure and entered a later reading measure
- **THEN** its ordinary ink can retire as incoming music is atomically allocated around the current measure
- **AND** continuing sound is assessed independently, with readable authored tie cues where applicable
- **AND** unread attacks, errors and unmeasured runs cannot manufacture automatic retirement

#### Scenario: A joined run wraps through fixed positions
- **WHEN** replacement displays resident bars across a genuine reading-order wrap
- **THEN** staff lines remain continuous and aligned, with correctly attached source barlines and accessible source identities
- **AND** ties and slurs retain verified musical endpoints without inventing a relation between nonconsecutive source notes

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
Entering Free view SHALL stop active or pending playback and restore complete source notation for a consecutive window of up to four selected measures. Full owned ink and source relations SHALL restore through the common ownership model. The window SHALL be naturally centered independently of the live refill canvas. A cyclic resident layout SHALL NOT be used as the Free view window. Original error obligations and source context SHALL remain accessible.

#### Scenario: Pause after ordinary and hollow notes were removed
- **WHEN** the user enters Free view after ordinary or hollow note ink disappeared or its space was reused
- **THEN** a consecutive source window near the current reading location restores complete source notation in natural order and centered framing
- **AND** repeated playing, refill, Free view and Ready cycles preserve source ownership without duplicating retired ink
- **AND** Ready returns to the admitted initial live allocation at the existing count-in transition
