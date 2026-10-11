# viewer-loading Specification

## Purpose

Make application and score readiness clear, reuse safe derived work across sessions, and keep preparation from silently occupying the interface.

## Requirements

### Requirement: Explicit application readiness
The viewer SHALL show a single loading surface while startup prerequisites are pending, including library display preparation and enabled audio readiness. It SHALL expose actual phases or completed work, show failures with retained data, and enable ordinary interaction only when readiness is established.

#### Scenario: Startup with expensive prerequisites
- **WHEN** a saved library or enabled sound requires slow initialization
- **THEN** visible loading feedback precedes that work and remains until all startup prerequisites settle
- **AND** readiness is not announced while hidden initialization still occupies the interface

#### Scenario: Recoverable service failure
- **WHEN** optional sound initialization fails
- **THEN** the viewer identifies the sound failure, retains preferences and library data, and permits use with sound unavailable
- **AND** a library failure retains the original files and presents an actionable failure state

### Requirement: Persistent disposable derived summaries
The viewer SHALL reuse persisted library display summaries only when the exact archive, selected edition and instrument, derivation revision and every contributing record still match. Missing fallback records SHALL participate in invalidation. Derived caches SHALL be bounded and disposable; cache failure SHALL rebuild without modifying authoritative data.

#### Scenario: Warm application restart
- **WHEN** the same library, selected instrument and journals reopen in a new process
- **THEN** matching summaries are restored without repeating full score admission or practice-plan derivation
- **AND** original journals remain the authority for earned progress and exercise exclusion

#### Scenario: Edited record or invalid cache
- **WHEN** an archive, journal, personal pointer, missing fallback, selected instrument or derivation revision changes, or a cache is corrupt
- **THEN** the affected summary is recomputed from original data
- **AND** no old summary grants practice credit, changes a journal or suppresses valid edited evidence

### Requirement: Responsive foreground preparation
Foreground score preparation SHALL report its actual work through the loading surface, yield between supported bounded preparation steps, and retain cancellation and supersession checks. Background library work SHALL yield priority to foreground work. A failed or canceled open SHALL retain the previous score and saved data.

#### Scenario: Cancel during cold preparation
- **WHEN** the player cancels an opening score between preparation steps
- **THEN** preparation relinquishes its owned work without committing a partial presentation
- **AND** the previous score and all saved evidence remain available

#### Scenario: Foreground supersedes a library refresh
- **WHEN** the player opens a score during a library refresh
- **THEN** stale background work cannot replace current display state or launch another competing cold producer
- **AND** the foreground loading surface describes remaining foreground work

### Requirement: Bounded exact preparation reuse
Warm score reopening SHALL reuse matching detached preparation within bounded retention limits while retaining fresh wrapper ownership, exact source and rendering identity, font checks and current personal assignments. Reuse SHALL preserve actual notation and practice meaning and SHALL NOT treat serialized private rendering authority as a certificate.

#### Scenario: Reopen a previously warmed score
- **WHEN** a score with matching source, presentation and rendering inputs reopens
- **THEN** its reusable preparation avoids a second full cold layout
- **AND** current personal choices are applied to independent view wrappers without borrowing stale mutable package buffers

#### Scenario: Changed source or rendering policy
- **WHEN** package bytes, instrument, rendering recipe, font policy or calculation context differ
- **THEN** incompatible preparation is not reused
- **AND** eviction or a cache miss uses the complete valid cold path

### Requirement: Honest loading measurements
Delivery evidence SHALL distinguish cold startup/opening, warm restart/reopening and ordinary interactions on named fixtures, builds and hosts, including longest blocked interface intervals. It SHALL compare against the retained baseline, include failures, and identify browser simulation and native observation limits.

#### Scenario: Performance acceptance report
- **WHEN** a performance build is proposed for delivery
- **THEN** comparable baseline and candidate measurements show whether repeated expensive work was eliminated and what remains slow
- **AND** the existing editing target is not reported as achieved without its own end-to-end visible measurements
