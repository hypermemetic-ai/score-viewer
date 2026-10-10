## ADDED Requirements

### Requirement: Structural residency survives note retirement
A refill request containing only a subset of already resident measures SHALL NOT remove structural staff or measure frames. A terminal allocation in a longer selected passage SHALL retain a bounded window of real selected source measures, up to four, rather than deleting frames as the reading position approaches the end. Retirement SHALL affect eligible owned note ink independently of structural residency, while the current measure retains its exact position and size.

#### Scenario: Finish the last resident measure
- **WHEN** accepted attacks retire earlier note bundles and the reading position reaches the final selected measure
- **THEN** the continuous staff and bounded real source measure frames remain visible
- **AND** no fabricated outside measure, duplicated source bar or sliding current interval is introduced
