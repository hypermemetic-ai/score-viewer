# Approved engraving recipe compatibility

## Purpose

Prepare genuinely new score presentations with the accepted real-engine rules while retaining exact, versioned execution authority for existing passive recipes and fixed-page packages.

## Requirements

### Requirement: Generic approved engraving preparation
New or genuinely regenerated Jankó score presentations SHALL construct a passive validated real-engine recipe using the reusable approved production preset. Existing resolved recipes SHALL remain readable with their retained engine authority and SHALL NOT be silently upgraded. Unsupported geometry or missing matching source/owner data SHALL refuse generation.

#### Scenario: New supported source-bar score
- **WHEN** generic viewer generation requests a new fixed-three production presentation
- **THEN** it uses the shared accepted duration, spacing and register rules and admits actual complete painted geometry before installing output

#### Scenario: Frozen package reading
- **WHEN** the viewer reads an existing prepared package
- **THEN** adopting shared capabilities does not rewrite its fixed pages or claim a new generation certificate
