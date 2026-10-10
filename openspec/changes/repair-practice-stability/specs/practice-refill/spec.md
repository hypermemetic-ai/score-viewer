## ADDED Requirements

### Requirement: Structural residency survives note retirement
A refill request containing only a subset of already resident measures SHALL NOT remove structural staff or measure frames. A terminal allocation in a longer selected passage SHALL retain a bounded window of real selected source measures, up to four, rather than deleting frames as the reading position approaches the end. Retirement SHALL affect eligible owned note ink independently of structural residency, while the current measure retains its exact position and size.

#### Scenario: Finish the last resident measure
- **WHEN** accepted attacks retire earlier note bundles and the reading position reaches the final selected measure
- **THEN** the continuous staff and bounded real source measure frames remain visible
- **AND** no fabricated outside measure, duplicated source bar or sliding current interval is introduced

### Requirement: Stable restoration across practice phases
When Free view, Ready, count-in, active play or error recovery displays the same source window in an unchanged viewport, it SHALL use a common scale and source reading reference. Longer-passage restoration SHALL include all owned source ink. A Viewer readability policy SHALL NOT silently introduce a MIDI-dependent or phase-dependent zoom. Incompatible wider browsing windows SHALL be resolved through an explicit source-faithful fit policy rather than hidden ink, crop clipping or motion of the current played interval.

#### Scenario: Miss and restart a longer passage
- **WHEN** a connected longer passage enters full Free view after a missed note and then restarts the same source window
- **THEN** complete restored ink and active ink share the established frame without a scale or position jump
- **AND** current source note spacing, structural residency and owned-ink lifecycle remain authoritative
