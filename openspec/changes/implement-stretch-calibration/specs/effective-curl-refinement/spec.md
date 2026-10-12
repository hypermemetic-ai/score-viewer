# Spec Delta

## Purpose

Preserve optional endpoint-specific curl evidence with explicit personal and supplied-assumption provenance.

## ADDED Requirements

### Requirement: Optional companion evidence
Curl refinement SHALL be separate from core collection progress and bound to player/hand. Fingers 2–5 SHALL accept optional positive finite ruler readings with method and nullable uncertainty.

#### Scenario: Accepted behavior
- **WHEN** the player completes core calibration without curl readings
- **THEN** core completion remains available

### Requirement: Honest assumptions and endpoints
Supplied estimates SHALL retain immutable basis/endpoint/source identities and remain labeled estimates. Empty assumptions SHALL show unavailable estimates; relative reach SHALL never become an absolute finger-length default.

#### Scenario: Accepted behavior
- **WHEN** no supplied assumption exists
- **THEN** a personal reading can still be saved without a fabricated default

### Requirement: Append-only corrections and admission
Measurement/assumption identities SHALL remain unique and immutable; retractions SHALL reference earlier measurements only. Ledger order SHALL determine current personal overrides. Malformed bytes SHALL remain read-only and exportable.

#### Scenario: Accepted behavior
- **WHEN** a reading is corrected or retracted
- **THEN** its original entry and displayed assumption remain retained and the effective value follows ledger order

