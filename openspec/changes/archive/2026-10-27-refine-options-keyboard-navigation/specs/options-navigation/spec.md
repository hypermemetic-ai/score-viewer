# Spec Delta

## Purpose

Let players find and change the relevant viewer settings with predictable keyboard navigation while preserving their score context and existing saved controls.

## ADDED Requirements

### Requirement: Centered section-based Options
Options SHALL be a moderate centered dialog with a narrow section list and one visible settings panel. It SHALL preserve the surrounding score, use the shared navigation footer, and retain all applicable existing settings and score actions.

#### Scenario: Reader and library sections
- **WHEN** Options opens with a score loaded
- **THEN** Score is the first section and its controls are visible
- **AND** without a loaded score, Score is absent
- **AND** Input/output, Piano, Keys and pedals and other applicable settings remain accessible
- **AND** piano controls appear only when the bank is installed, with download/install actions available otherwise

### Requirement: Explicit browse and edit ownership
Up/Down SHALL browse sections or visible setting rows without changing values. Right SHALL enter the selected section's settings, Left SHALL return to sections when no edit or popup owns input, and Enter SHALL activate or edit the focused control. Numeric drafts, popups and binding capture SHALL own their keys until committed or cancelled.

#### Scenario: Numeric edit and popup cancellation
- **WHEN** a numeric field is browsed and Enter is pressed
- **THEN** Up/Down and typing edit its draft while chevrons remain outside keyboard navigation
- **AND** Enter admits the value and Escape cancels the draft
- **AND** Escape in an open dropdown cancels that dropdown before closing Options

### Requirement: Context and focus preservation
Navigation SHALL retain existing saved bindings and their inheritance, omit actions unavailable in the current context, restore a connected opener after closing, and avoid focus traps or musical action dispatch while a control or modal owns input.

#### Scenario: Toolbar and nested dialog ownership
- **WHEN** the reader toolbar, a nested popup or a binding editor owns focus
- **THEN** its navigation does not accidentally turn score pages or modify an uncommitted value
- **AND** closing the owning popup or dialog returns focus to its connected opener or an appropriate surviving control
