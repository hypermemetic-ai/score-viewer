# Spec Delta

## Purpose

Let users select additive source-compatible reading styles while retaining previous archives, musical practice records and recoverable managed-library identity.

## ADDED Requirements

### Requirement: Compact product controls
Fresh imports SHALL explicitly select the accepted production renderer without a new TAB style picker, renderer-version labels or explanatory rhythm commentary in ordinary Options. Retained compatible editions SHALL use existing applicable edition flows; historical content SHALL NOT be automatically rewritten or selected.

#### Scenario: Fresh import and retained older edition
- **WHEN** a supported part is freshly imported after the new renderer lands
- **THEN** its accepted rendering recipe is selected internally while Instrument and ISO/TAB controls retain their existing meaning
- **WHEN** a prior compatible style is restored
- **THEN** it follows the reviewed minimal existing edition flow without adding another settings surface

### Requirement: Explicit admitted same-source style selection
A presentation edition SHALL use an explicit path admitting both archives and proving the same canonical source, real part/scope and musical facts. TAB-only changes SHALL retain exact ISO output. A known new shared rest-policy pair SHALL require complete independent old/new recipe replay and source-owned proof of only the approved isolated-rest display and derived geometry; generic ISO inequality or app-normalized SVG comparison SHALL NOT establish compatibility. Missing proof SHALL refuse. Generic different-archive imports SHALL retain their conflict refusal, and changed source facts SHALL NOT be called a presentation-only edition.

#### Scenario: Compatible style versus changed source
- **WHEN** a new supported TAB recipe changes only the admitted presentation of the same source part
- **THEN** explicit style selection can retain that part's collection identity
- **WHEN** its canonical source, converter scope or musical facts differ
- **THEN** style-only installation refuses without replacing the current edition

#### Scenario: New versioned pair changes a rest display
- **WHEN** the same source is prepared under a reviewed new ISO/TAB isolated-rest policy pair
- **THEN** compatibility requires actual independent source replay and proof of the exact approved display-only change while preserving all canonical facts and old recipe interpretation
- **AND** unrelated ISO differences or absent source proof preserve the current edition through refusal

### Requirement: Additive archives and personal pointers
Selecting a compatible style SHALL retain the old archive, collection ID, personal/reference/manual journal pointers and supported library metadata. It SHALL NOT create a duplicate instrument part, rewrite historical archives or reuse unrelated-part progress.

#### Scenario: New style then earlier edition
- **WHEN** the player selects a new style and later its retained earlier edition
- **THEN** both original archive byte sequences remain available and the same musical journals remain attached
- **AND** source pitch, family authority and other library entries remain unchanged

### Requirement: Guarded managed-library commit
Edition installation SHALL stage complete admitted material before publishing one managed-library selection update. It SHALL compare actual prior library state and verify it unchanged immediately before commit under application operation ownership. Stale state, cancellation or precommit failure SHALL preserve existing referenced data.

#### Scenario: Library changes while staging
- **WHEN** an edition is prepared against one library snapshot but that library changes before commit
- **THEN** installation refuses while retaining the current library bytes and referenced archives/journals
- **AND** unreferenced staged files are not mistaken for an activated edition

### Requirement: Honest uncertain commit outcome
A failed pointer-write acknowledgement SHALL NOT be treated as proof of rollback. Exact readback SHALL confirm a completed commit when possible; otherwise its outcome SHALL remain explicitly unknown with possibly referenced files retained.

#### Scenario: Pointer write succeeds but acknowledgement fails
- **WHEN** the host commits the edition selection but the write acknowledgement fails
- **THEN** exact readback can report the committed selection
- **AND** cleanup does not delete archives or journals that the committed library may reference

### Requirement: Cancellation respects activation ownership
Edition activation SHALL verify the initiating operation before and after awaited pre-activation work and before mutating reader selection, controllers or preferences. A cancelled or superseded activation SHALL NOT display its stale reader or write its last-worked selection. A previously committed install SHALL retain its truthful commit status.

#### Scenario: Cancel during saved-view read
- **WHEN** Escape or a newer open invalidates the edition operation during an awaited saved-view read
- **THEN** the stale operation cannot activate or persist its selection after that read settles
- **AND** a selection already committed before cancellation is reported honestly

### Requirement: Genuine private-source regeneration
Regeneration of a GP-derived style SHALL retain original input/report/XML and independently replay the supported public converter for the actual part scope. Historical archives lacking required source facts SHALL need a separate additive source preparation; a style change SHALL NOT fabricate missing facts or publish private repertoire.

#### Scenario: Current source and incomplete historical source
- **WHEN** an existing fully admitted private Bass or Guitar part is regenerated
- **THEN** the new style retains exact canonical input and confirmed source-part binding without rewriting its historical archive
- **WHEN** an older archive lacks complete tuning or written components
- **THEN** it is not silently upgraded or given borrowed progress under the style-only path

### Requirement: Preserve ordinary application and delivery policy
Style-edition support SHALL preserve existing piano/MIDI behavior, GP-provider authority, native identity, CSP and managed-storage policy. Publishing or installing a native pair SHALL use the existing ordinary reviewed delivery gates; planning or browser acceptance SHALL NOT claim installed usability.

#### Scenario: Delivery and unrelated piano score
- **WHEN** a style-capable frontend is later built for native delivery
- **THEN** source, embedded payload, both native packages and recipient preservation are independently verified
- **AND** opening an ordinary piano score retains its prior preparation, assessment and storage behavior
