# Spec Delta

## Purpose

Collect optional effective fingertip reach differences with explicit measurement context, preserving raw evidence without inferring anatomical dimensions.

## ADDED Requirements

### Requirement: Four pooled adjacent readings
The viewer SHALL offer thumb–index, index–middle, middle–ring and ring–pinky readings in one collection for the selected instrument. The player SHALL choose the performing hand without being asked to complete a second hand collection.

#### Scenario: Change hands
- **WHEN** the player changes performing hand
- **THEN** the placement reflects that hand and saved readings retain the hand used, while progress counts each pair once

### Requirement: Independent percent and millimeter methods
Jankó SHALL offer Percent and Millimeters; conventional SHALL offer only Millimeters. Percent SHALL accept signed finite decimals up to 100 with no lower bound. Direct millimeters SHALL accept nonnegative finite decimals. The viewer SHALL preserve independent drafts by pair, method and reference without conversion.

#### Scenario: Switch methods
- **WHEN** a player enters -12.5 percent, switches to millimeters and enters 8.2, then returns
- **THEN** each method retains its own draft and neither value is converted or clamped

### Requirement: Visible primary selection
Comparable pairs SHALL display an editable primary-finger selector throughout the reading. Thumb–index SHALL use index as the primary reference. Both SHALL set 100 percent and Equal SHALL set zero millimeters, requiring explicit save confirmation.

#### Scenario: Correct finger ordering
- **WHEN** the player changes the primary finger for index–middle
- **THEN** the instruction and diagram identify the new reference and show its independent draft without silently reusing the previous value

### Requirement: Accepted physical measurement guidance
The viewer SHALL show the approved player-facing connected keys, uniform tip thickness, aligned front plane, natural surface colors and unfilled measurement brackets. Labels SHALL follow the chosen notation. It SHALL explain 0 at the entry line and 100 at the wall, show flat perpendicular finger placement, and preserve established URW Gothic typography.

#### Scenario: Thumb reading
- **WHEN** thumb–index percent is displayed
- **THEN** the thumb and index use their distinct approved levels and landmark bands, with index as reference and no anatomical equality inferred

### Requirement: Durable readings and navigation
Fresh readings SHALL be empty. Save & next and Enter SHALL validate and save before advancing. Previous/next and unmodified horizontal arrows, including from the field, SHALL preserve drafts and permit unanswered pages without manufacturing completion. Held keys SHALL not skip multiple pages.

#### Scenario: Invalid draft and failed save
- **WHEN** a draft is blank, nonnumeric, percent above 100, negative millimeters, or its write fails
- **THEN** save does not advance or count completion, the draft remains available and the last saved evidence stays unchanged

### Requirement: Separate recoverable evidence
The viewer SHALL store raw values with instrument, pair, method, performing hand, reference, date and illustration provenance in additive versioned storage. It SHALL retain malformed bytes for export and prohibit overwrite. Measurement pages SHALL admit no effort grading or practice telemetry and SHALL leave scores and legacy calibration unchanged.

#### Scenario: Reopen or malformed data
- **WHEN** calibration is reopened or unsupported evidence is found
- **THEN** valid saved readings return, while unsupported bytes remain read-only and exportable
