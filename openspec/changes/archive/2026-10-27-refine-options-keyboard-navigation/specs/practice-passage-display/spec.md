# Spec Delta

## MODIFIED Requirements

### Requirement: Shared Options menu keyboard binding and name
Options SHALL have a configurable keyboard binding in the shared Keys and pedals interface, available from the full-score reader, passage selection and active practice. Its buttons, dialog title, binding entry, and accessible names SHALL use the same Options label. Configurable buttons SHALL show the current configured control. The default keyboard chord SHALL be O, with conflict-free admission for older preferences that preserves existing assignments and explicitly empty controls using the compatible persisted action identity. The library SHALL retain its Options entry. For an opened score, Score SHALL be a visible expanded section with the current piece subtitle, normal heading hierarchy and aligned settings; it SHALL appear first in reader Options and immediately after Practice in practice Options. Share score SHALL be a visible action beneath score settings, followed by applicable correction and retained-edition actions. Source & review SHALL remain the secondary disclosure.

#### Scenario: Opening Options from either practice interface
- **WHEN** the user presses the configured Options key in passage selection or active practice
- **THEN** the shared Options dialog opens with Practice first in its section list and selected, with applicable Score, audio/MIDI, Piano, Keys and pedals and fingering display sections available
- **AND** active practice follows the existing Pause behavior without changing completion eligibility, progress, or speed policy, and closing Options retains the passage and paused session

#### Scenario: Practice Options describes applicable actions
- **WHEN** Options is opened from passage selection or active practice
- **THEN** its shared binding panel omits irrelevant practice actions such as Edit fingers and page turning where no manual passage window can be browsed
- **AND** an existing page-binding equivalent is labelled Previous measures or Next measures where paused passage-window browsing is supported
- **AND** applicable finger display, Done and Options controls remain available, with Done shown for an active passage
- **AND** hidden rows retain their exact saved binding identities and assignments for the full-score reader, with shared capture, conflict and Test ownership unchanged

#### Scenario: Rebinding and guarded input
- **WHEN** the user changes the Options binding or activates it while a field, modal, or binding capture owns input
- **THEN** the binding entry and reader/practice buttons agree on its name and configured control
- **AND** existing focus, capture, held-key and repeat guards prevent unintended activation

#### Scenario: Older saved controls and the full-score reader
- **WHEN** preferences without the added persisted action are admitted, including preferences that already assign O
- **THEN** all original assignments remain unchanged and the new action receives an available default or fallback
- **AND** explicitly empty Options controls remain empty and a hardcoded reader O does not bypass the configured binding
- **AND** the library Options entry remains available

#### Scenario: Confident opened-score controls
- **WHEN** the user opens Options from the reader
- **THEN** Score and the piece subtitle appear before general device settings, with Transpose aligned
- **AND** Share score is visible without expanding a disclosure
- **AND** correction count and correction actions are proportionate, irrelevant disabled actions are omitted, and Undo restore remains available when applicable
- **AND** expanding Source & review retains provenance and applicable font-license access

#### Scenario: Options without an opened score
- **WHEN** the user opens Options from the library
- **THEN** general settings remain available without an empty Score section or a Transpose control for an unspecified score
