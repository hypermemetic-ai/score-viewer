# Spec Delta

## Purpose

Provide readable source-owned detached TAB duration and rest notation under an explicit reproducible recipe while preserving historical scores and musical practice identity.

## ADDED Requirements

### Requirement: Detached black duration vocabulary
The new TAB recipe SHALL use black headless duration cues in the close 14pt row below the strings. Upward free tips SHALL share the band top; rails and hook ends SHALL be below, with grouped labels below the lower beams. Short half, normal quarter and absent whole markers SHALL retain their meaning and complete source-owned geometry.

#### Scenario: Whole half quarter and beamed values
- **WHEN** a supported source contains whole, half, quarter and beamed short values
- **THEN** the new recipe paints upward free tips at the common band top with rails and hook ends below, without separate rhythm circles or connections to fret numbers
- **AND** absence of a whole-duration marker does not remove the fret, event ownership or musical clock

### Requirement: Written duration determines paint
Duration and rest glyphs SHALL follow retained written value and dots, including the exact 16th/sixteenth alias, except for the explicitly versioned, independently source-proven isolated-rest display rule below. Performed elapsed ticks SHALL remain timing facts and SHALL NOT substitute for written notation or audit authority.

#### Scenario: Dotted sixteenth rest and tuplets
- **WHEN** a dotted sixteenth rest or supported tuplet has elapsed ticks that differ from a simple written-duration threshold and has no independently proven eligible isolated-rest display
- **THEN** the glyph and dots retain its written value while loop timing retains the original elapsed ticks
- **AND** rest ink is not silently promoted to an eighth glyph

### Requirement: Shared exact isolated-rest display
Only a source-proven isolated REST whose written value, dots and exact ratio resolve to an ordinary undotted rest MAY display that equivalent under an explicit new ISO/TAB recipe pair. One shared source decision SHALL be independently bound to actual raw XML, complete canonical source facts and full cross-bar chronology. Every complete/weighted window SHALL protect its rest members, and the entire candidate prefix and suffix within its completely bound ratio run SHALL each have an exact disjoint contiguous complete homogeneous partition; overlapping-window unions SHALL NOT prove that coverage. Canonical spelling, source bytes, silence/owner identity and clocks SHALL remain exact; derived display SHALL NOT become canonical written-value audit authority. Model-only or unknown scope SHALL remain literal.

#### Scenario: Source-proven isolated rest with exact equivalence
- **WHEN** full-source binding proves a sole ratio rest between straight members, at a genuine source start/end or a singleton with exact disjoint complete prefix/suffix partitions, the rest belongs to no protected window and exact BigInt arithmetic yields an ordinary undotted rest
- **THEN** both opted-in ISO/TAB recipes use that same ordinary display with redundant dots and ratio removed together
- **AND** canonical written dots/ratio, elapsed timing and all source identities remain unchanged

#### Scenario: Protected grouping and genuine fractions
- **WHEN** source scope is unknown, any normalType/normalDots hint exists, grouping is explicit/complete/weighted/mixed/rest-containing/continued/overlapping or the candidate has no exact ordinary equivalent
- **THEN** display retains the meaningful written value, augmentation and scope without guessing isolation from elapsed ticks or nearby-item counts
- **AND** notes and legacy recipe branches never take the new rest-only exception

#### Scenario: Overlapping complete windows do not tile the neighbors
- **WHEN** four neighboring eighth-triplet units are covered only by overlapping complete three-unit windows before or after a candidate
- **THEN** the incomplete prefix/suffix has no disjoint complete partition, so the rest retains its literal spelling
- **AND** complete/weighted windows protecting the rest remain a separate refusal obligation

### Requirement: Closely anchored augmentation squares
Unsimplified values in the new recipe SHALL use 1.6pt augmentation squares with about 1.4pt edge/inter-square gaps, aligned closely to genuine stem/rest bases, retaining meaningful augmentation and complete owned geometry. The isolated-rest exception SHALL remove only independently proven redundant display augmentation. Base-less whole-note duration cues SHALL NOT gain an unselected whole-symbol or fret-attached exception.

#### Scenario: Dotted stem or rest with a real base
- **WHEN** a source augmentation belongs to a value with an actual duration stem or rest base
- **THEN** its small squares sit close to that base with readable edge/inter-square gaps rather than floating at a distant fixed location
- **AND** written dot count, elapsed timing and source component identity remain unchanged

### Requirement: Source-proven rhythmic grouping
The new recipe SHALL preserve authored grouping and use a certified complete local tuplet to merge only safe overlapping inferred beat groups into one lower rail. A thin bracket/3 SHALL scope only the true tuplet. Other ordinary groups and negative fallback SHALL remain truthful; derived rails SHALL NOT claim authored status or alter source/ISO topology or clocks.

#### Scenario: Certified off-beat tuplet continuity
- **WHEN** a complete local homogeneous beamable tuplet is bound to exact source members, owners, components, clocks, part, staff, voice and written values
- **THEN** only its safe overlapping inferred beat groups can merge, keeping their real straight-note members with their original durations instead of extracting the tuplet into another split group
- **AND** the thin bracket/3 covers only actual tuplet members, while other ordinary beat groups remain separate
- **AND** actual measure 163 keeps the first triplet and straight pair separate but joins n6–n10 with a bracket over n8–n10

#### Scenario: Ineligible continuity or ordinary groups
- **WHEN** proof is partial/mixed, a participating carrier is a rest/continuation, a part/staff/voice/bar/system boundary intervenes, or explicit noBeam/authored/numbered-beam authority applies
- **THEN** the original genuine grouping remains the fallback rather than a forced merge or whole-bar default
- **AND** four ordinary aligned triplets keep four beat groups and four truthful scopes

### Requirement: Rest information belongs on the staff
The new recipe SHALL paint each source rest on a neutral TAB-staff reference without a duplicate below. Half and whole rests SHALL remain distinguishable by sitting or hanging on that same reference. Rest positioning SHALL NOT assign a physical string or fabricate a sounded event.

#### Scenario: Half whole and dotted rests
- **WHEN** a supported part contains half, whole or dotted short rests
- **THEN** each appears once on the TAB staff with its source-correct shape and dots
- **AND** the canonical silence identity and absence of a physical string remain exact

#### Scenario: Unsimplified fractional isolated rest
- **WHEN** a retained isolated rest has an actual source triplet scope and does not qualify for the independently proven equivalent-rest display
- **THEN** its meaningful source-owned ratio remains visible below the staff without granting note/beam or physical-string membership
- **AND** final contextual placement of genuinely fractional orphan labels requires separate source visual review

### Requirement: Explicit recipe and literal historical replay
Every supported new-style archive SHALL bind a distinct known TAB engine. Historical archive bytes, source hashes and recipe interpretation SHALL remain literal, and previously valid/admitted historical archives and omitted public recipe selections SHALL reproduce their exact valid output. Reviewed written-value audit repairs MAY accept formerly invalid cases without changing those source/recipe/paint identities; their historical refusal receipts SHALL remain reproducible at the original pin. Unknown or inconsistent recipe identities SHALL refuse without guessing from SVG appearance or upgrading old content.

#### Scenario: Old archive and new recipe mismatch
- **WHEN** an old TAB-v1 archive is opened after the new engine is available
- **THEN** its pages, scenes and geometry replay literally through its old engine
- **WHEN** an archive declares the new engine but retains another engine's output
- **THEN** admission refuses and existing library pointers remain unchanged

### Requirement: Source and ISO compatibility
A presentation edition SHALL retain exact canonical source bytes, owners, written components, tuning/string-fret facts, clocks, repeats, relations and authored grouping/ISO topology. A TAB-only edition SHALL retain exact ISO output. A new shared rest-display pair MAY change ISO paint only through explicit versioned source dispatch and independently replayed proof of the exact adopted isolated-rest display and its geometry; generic unequal ISO output SHALL NOT qualify. Physical capabilities and family authority SHALL remain unchanged.

#### Scenario: Same part with new duration paint
- **WHEN** an admitted Bass or Guitar part is regenerated with the new TAB recipe
- **THEN** all canonical musical facts remain exact, while each view independently replays its declared known recipe
- **AND** ISO output remains exact unless the explicit new pair proves only the adopted isolated-rest display change; legacy ISO interpretation is never replaced
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
New-style full pages and joined windows SHALL retain complete primitive ownership, continuous source guides/separators and relation clearance. Existing one-staff/one-voice limits SHALL remain enforced. Written-value validation SHALL be independently source-owned, keep elapsed clocks separate and refuse malformed source/placement data without changing valid historical identities.

#### Scenario: System join and resolved written-value audit
- **WHEN** supported Bass or Guitar windows cross source systems
- **THEN** actual source-owned guides, one interior separator and admitted relation projection remain continuous with full staff rests and duration ink
- **WHEN** the reviewed written-value repair is deliberately integrated in the consumer's exact source pin
- **THEN** valid half/dotted-triplet source witnesses pass their actual audit and malformed source-versus-placement witnesses refuse
- **AND** painter output, elapsed clocks and valid literal historical receipt identities remain unchanged

### Requirement: Normal-scale visual acceptance
The new production recipe SHALL be inspected at normal reader and practice scales for real Bass and Guitar, including rest, long-value and joined examples. Source, browser and installed-native inspection SHALL be reported separately; a magnified prototype or passing hash SHALL NOT imply normal-scale acceptance.

#### Scenario: Preparing the reviewed delivery
- **WHEN** the new recipe is proposed for production delivery
- **THEN** its evidence includes readable normal-scale full pages and joined manual windows with black cues and staff rests
- **AND** any unexercised native or human inspection remains explicit

#### Scenario: Augmented whole-note duration has no base
- **WHEN** a whole NOTE has augmentation but no duration base stroke and its lower-band squares appear isolated
- **THEN** final production aesthetic acceptance remains explicitly open until a concrete source-owned treatment is reviewed
- **AND** no isolated-rest rule, unselected whole symbol, fret-attached exception or hidden augmentation is used to claim the note issue resolved
