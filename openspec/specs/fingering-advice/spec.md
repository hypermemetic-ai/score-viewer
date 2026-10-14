# Fingering Advice Specification

## Purpose

Explain potentially demanding or unusual finger transitions in the editor using current personal assignments and explicit physical and timing evidence.

## Requirements

### Requirement: Source-bound physical travel advice
Advice SHALL evaluate consecutive performed contacts of the same effective hand and finger using actual keyboard contact geometry, reference-performance timing and hold constraints, including bar and repeat boundaries. Missing assignment, contact or timing evidence SHALL remain an unassessed gap. Advice SHALL NOT certify biomechanical feasibility or alter fingerings automatically.

#### Scenario: Repeated material with different transition context
- **WHEN** identical measures occur after different preceding contacts
- **THEN** shared fingering can remain identical while transition advice reflects each occurrence's actual performed context
- **AND** current practice slowdown does not change the reference-tempo assessment

#### Scenario: Missing contact evidence
- **WHEN** a contact or timing value required for the transition is unavailable
- **THEN** the transition is unassessed rather than silently treated as zero travel or safe movement
- **AND** a diagnostic is not derived from page-space note distance

### Requirement: Distinguishable warning reasons
Advice SHALL distinguish movement above the configured absolute threshold, unavailable movement time and unusualness relative to comparable personal decisions. Absolute advice SHALL initially flag speeds strictly above 0.25 m/s. Personal unusualness SHALL require at least 20 independent comparable decision lineages and a result above the 95th percentile; copies and the assessed lineage SHALL NOT inflate its evidence.

#### Scenario: Absolute warning without enough personal history
- **WHEN** a transition exceeds the absolute threshold but there is insufficient comparable personal evidence
- **THEN** absolute advice is available while no personal-percentile conclusion is claimed

#### Scenario: Many copies of one choice
- **WHEN** one personal choice appears in many matching occurrences
- **THEN** those copies do not satisfy the independent-evidence minimum by themselves
- **AND** editing or retracting a decision replaces or removes its previous contribution

### Requirement: Quiet editor-only warnings
Warnings SHALL appear beside affected notes while editing and provide an explanation on selection, including the transition, hand/finger and reason. They SHALL remain distinguishable without relying on color alone, avoid obscuring musical ink and follow current rendered owners. They SHALL NOT interrupt entry into practice, require acknowledgement or create a separate review screen.

#### Scenario: Select a warned note
- **WHEN** the player selects a warned note
- **THEN** the explanation identifies the relevant transition and available distance/time evidence without labeling a demanding motion as proven impossible
- **AND** normal editing and source navigation remain available

#### Scenario: Start practice or receive stale advice
- **WHEN** the player enters practice or asynchronous advice finishes for an obsolete assignment revision
- **THEN** practice begins through its ordinary flow without a warning review
- **AND** obsolete advice is not shown as current and editor warning markers do not enter the practice display

### Requirement: Persistent advice preferences
Options SHALL allow a positive finite absolute travel threshold in cm/s and independent enablement of absolute and personal-unusual advice. Defaults SHALL enable both categories with an absolute threshold of 25 cm/s. Preference changes SHALL affect editor highlighting without rewriting choices, deleting evidence or introducing a practice gate.

#### Scenario: Reduce warning noise
- **WHEN** the player disables personal-unusual advice or changes the absolute threshold and later reopens the application
- **THEN** the setting is retained, the other category remains independently controlled, and current editor warnings reflect the preference
- **AND** invalid numeric input does not replace the last valid threshold
