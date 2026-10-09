# Spec Delta

## Purpose

Provide readable source-owned detached TAB duration and rest notation under an explicit reproducible recipe while preserving historical scores and musical practice identity.

## ADDED Requirements

### Requirement: Detached black duration vocabulary
The new TAB recipe SHALL use black headless duration cues detached below the strings. Upward free tips SHALL share the band top; rails and hook ends SHALL be below. Short half, normal quarter and absent whole markers SHALL retain their selected meaning. Source-owned hook/rail geometry SHALL retain complete ownership.

#### Scenario: Whole half quarter and beamed values
- **WHEN** a supported source contains whole, half, quarter and beamed short values
- **THEN** the new recipe paints upward free tips at the common band top with rails and hook ends below, without separate rhythm circles or connections to fret numbers
- **AND** absence of a whole-duration marker does not remove the fret, event ownership or musical clock

### Requirement: Written duration determines paint
Duration and rest glyphs SHALL follow retained written value and dots, including the exact 16th/sixteenth alias. Performed elapsed ticks SHALL remain timing facts and SHALL NOT substitute for written notation.

#### Scenario: Dotted sixteenth rest and tuplets
- **WHEN** a dotted sixteenth rest or a supported tuplet has elapsed ticks that differ from a simple written-duration threshold
- **THEN** the glyph and dots retain its written value while loop timing retains the original elapsed ticks
- **AND** rest ink is not silently promoted to an eighth glyph

### Requirement: Source-proven rhythmic grouping
The new recipe SHALL preserve authored beam and tuplet facts. It SHALL use complete existing source expression proof to give an eligible local homogeneous beamable tuplet one source-bound derived TAB rail, without claiming that rail was authored. Adjacent durations alone SHALL NOT authorize merging independent groups or changing source/ISO topology or clocks.

#### Scenario: Split-looking triplet and adjacent independent groups
- **WHEN** a complete single-written-bar tuplet has homogeneous beamable note units with exact member, owner, component, tick, duration, part, staff, voice and written-value binding
- **THEN** its source-proven units can use one shared TAB rail if none is a rest, continuation, authored beam or noBeam unit
- **AND** only those carriers leave their inferred beat groups, whose remaining contiguous units retain truthful groups
- **AND** adjacent independent groups remain independent even when their durations are equal

#### Scenario: Ineligible tuplet grouping
- **WHEN** a source tuplet is partial, mixed, crosses written bars, contains rests/continuations or has explicit beam/noBeam syntax
- **THEN** the new recipe retains those genuine facts without forcing a complete local rail or scanning for invented replacement ownership

### Requirement: Rest information belongs on the staff
The new recipe SHALL paint each source rest on a neutral TAB-staff reference without a duplicate below. Half and whole rests SHALL remain distinguishable by sitting or hanging on that same reference. Rest positioning SHALL NOT assign a physical string or fabricate a sounded event.

#### Scenario: Half whole and dotted rests
- **WHEN** a supported part contains half, whole or dotted short rests
- **THEN** each appears once on the TAB staff with its source-correct shape and dots
- **AND** the canonical silence identity and absence of a physical string remain exact

### Requirement: Explicit recipe and literal historical replay
Every supported new-style archive SHALL bind a distinct known TAB engine. Historical archives and omitted public recipe selections SHALL retain their exact prior interpretation and output. Unknown or inconsistent recipe identities SHALL refuse without guessing from SVG appearance or upgrading old content.

#### Scenario: Old archive and new recipe mismatch
- **WHEN** an old TAB-v1 archive is opened after the new engine is available
- **THEN** its pages, scenes and geometry replay literally through its old engine
- **WHEN** an archive declares the new engine but retains another engine's output
- **THEN** admission refuses and existing library pointers remain unchanged

### Requirement: Source and ISO compatibility
A style-only TAB edition SHALL retain exact canonical source bytes, ISO result, owners, written components, tuning/string-fret facts, clocks, repeats, relations and authored beam facts/ISO topology. Its source-proven TAB rail grouping SHALL NOT alter those facts. The style SHALL NOT change physical capabilities or grant an instrument family.

#### Scenario: Same part with new duration paint
- **WHEN** an admitted Bass or Guitar part is regenerated with the new TAB recipe
- **THEN** the ISO view and all musical facts remain exact while only declared TAB presentation output and evidence change
- **AND** a connected piano cannot assess the neutral part

### Requirement: Actual Worker and independent cold replay
Actual Worker admission and independent receiving/cold admission SHALL execute the declared source preparation and compare complete output. Serialized Worker results, hashes or persisted certificates SHALL NOT grant local scene authority. Conversion-only work SHALL NOT be reported as engraving replay.

#### Scenario: Worker result followed by cold receiving
- **WHEN** a real Worker imports a new-style dual archive and its original bytes are later imported in the receiving realm
- **THEN** each realm independently runs the declared rendering recipe and exact checks
- **AND** only actually prepared local scenes authorize passage projection; forged or cloned graphs do not

### Requirement: Shared musical progress and separate geometry state
Style editions and ISO/TAB of the same musical part SHALL retain the same manual/reference identity and journal. Distinct parts or changed musical/reference facts SHALL remain separate. Source anchors SHALL carry between editions, while derived page/crop/fit geometry is rebuilt from the selected admitted scene.

#### Scenario: Reopen at a source anchor with manual progress
- **WHEN** a player selects a compatible new style edition after marking an eligible passage Done
- **THEN** the same source-bar/component anchor, manual progress and reference remain available and reversible
- **AND** the page is resolved from the new scene without borrowing old coordinates or another part's journal

### Requirement: Source-owned joined geometry and honest limits
New-style full pages and joined windows SHALL retain complete primitive ownership, source-correct continuous guides/separators and relation clearance. Existing one-staff/one-voice limits and unsupported shared ISO geometry SHALL remain enforced. The known half-triplet written-versus-elapsed audit SHALL NOT be bypassed by style selection.

#### Scenario: System join and known half-triplet audit
- **WHEN** supported Bass or Guitar windows cross source systems
- **THEN** actual source-owned guides, one interior separator and admitted relation projection remain continuous with full staff rests and duration ink
- **WHEN** the independently tracked half-triplet audit is not yet resolved
- **THEN** its existing source refusal and support limit are explicitly reported, with no elapsed-duration substitute or falsely accepted geometry

### Requirement: Normal-scale visual acceptance
The new production recipe SHALL be inspected at normal reader and practice scales for real Bass and Guitar, including rest, long-value and joined examples. Source, browser and installed-native inspection SHALL be reported separately; a magnified prototype or passing hash SHALL NOT imply normal-scale acceptance.

#### Scenario: Preparing the reviewed delivery
- **WHEN** the new recipe is proposed for production delivery
- **THEN** its evidence includes readable normal-scale full pages and joined manual windows with black cues and staff rests
- **AND** any unexercised native or human inspection remains explicit
