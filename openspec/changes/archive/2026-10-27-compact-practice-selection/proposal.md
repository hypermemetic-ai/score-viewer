# Proposal

## Why

Completed material occupies redundant selector rows, and an unpracticed connection can misleadingly show 0% in the completed area. Active timed practice also uses historical achievement to select another exercise after a slow replay; the player wants to choose when to change exercises and take a break.

## What Changes

- Represent each maximal consecutive run of completed original sections as one left-column group row. The group is navigable but cannot be practiced, marked Done or excluded as an exercise.
- Put incomplete original sections below those groups. For the selected group, show incomplete connections first on the right, then completed sections and completed connections for revisiting.
- Use short descriptive categories: Completed, Incomplete and Connections. Preserve existing Contrasts and navigation labels; omit instructional headings and invented terms such as learned regions or sections to learn.
- Keep exercise identities, previews, exclusion state, independent percentages, manual evidence filtering and Total calculation intact. Group rows have no synthetic percentage or assessment identity.
- Remove every automatic transition to a different exercise, including after target-speed success or completion of the entire catalog. Preserve normal same-exercise repeats, speed progression, count-in and explicit player navigation. A/B alternation remains inside its selected contrast exercise.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `practice-passage-display`: Compact non-practiceable groups, concise category labels, two-column navigation and truthful exercise-only progress.
- `practice-exercises`: Explicit player ownership of the active exercise, independent of historical or newly earned completion.

## Impact

- Primary implementation: `src/practice-browser.ts`, `src/practice-view.ts`, selector styles and existing practice docs/tests.
- `nextPracticePassage` remains available for passive selector recommendations but leaves active continuation paths. `passed` retains achievement and speed rules; no journal migration or new setting is required.
- Existing selector specs assume every row is an exercise and displays a percentage; those requirements need explicit group exceptions. Tests expecting automatic transition to a newly available join must change to assert availability without activation.
- Source diagnosis reproduced the reported Schumann 14 10% jump through production completion methods in both legacy and current bounded partitions. That controlled reproduction does not claim observation of today's running Windows binary.
- The fingering integration plan remains separate in PR96. This change does not depend on it or alter the user's running practice session during development.
