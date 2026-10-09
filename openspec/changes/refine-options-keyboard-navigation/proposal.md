# Why

Options currently puts every setting into one long scrolling dialog. Its arrow navigation guesses neighboring controls from their rendered positions, and reader-toolbar arrows can turn pages while the player is trying to browse controls. The operator approved a moderate centered, section-based Options dialog and asked for a keyboard-first audit across the interface.

# What Changes

- Put relevant sections in a compact left column and show only the selected section's settings on the right, using the passage selector's spacing and shared navigation footer.
- Make section/settings ownership explicit: arrows browse, Enter opens or edits, and Escape backs out of an edit or popup before closing its containing dialog.
- Pressure-test library, reader toolbar, practice selection/Free view/active controls, nested dialogs and binding capture, and fix observed focus or accidental-edit failures.
- Preserve existing settings, stored controls, context-specific actions, piano/device setup, score actions, journals and preparation/assessment behavior.

# Capabilities

## New Capabilities

- `options-navigation`: Section-based Options, predictable control browsing/edit ownership, focus return and context-relevant settings.

## Modified Capabilities

- `practice-passage-display`: Update the shared Options entry contract to present Practice first in the section list while retaining the current paused passage and shared settings.

# Impact

Viewer UI/navigation modules, main event routing, shared styles and focused browser verification. No native engine, archive/admission authority, dependency, workflow, authentication, device policy or persisted schema change is planned. Source review remains distinct from paired native delivery and physical musical acceptance.
