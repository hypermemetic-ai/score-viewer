# Proposal

## Why

Growing practice joins repeatedly rehearse the beginning and make completion increasingly demanding. Players need manageable, musically informed sections, independent adjacent connections, and focused exercises for choosing correctly between similar continuations.

## What Changes

- Form variable-length original sections around 25 distinct score onsets: five estimated practice seconds at a sizing rate of five onsets/second, with a preferred 20–30-onset range. Simultaneous notes count once; musical evidence can move boundaries.
- Combine substantial repeated pitch/timing patterns, transposition-aware interval patterns, genuine gaps/long notes, authored boundaries and sustained texture changes. Strong evidence permits more snapping; weak evidence stays near the workload target. Full cadence inference is outside this increment.
- **BREAKING behavior:** replace recursive growing joins with independent overlapping pairs of consecutive originals, A–B, B–C, C–D. Preserve historical records without presenting old long joins as current exercises.
- Find section pairs with at least 75% matching notes under one constant pitch transposition; exclude 100% matches. Practice their divergent continuations with a target 2.5 estimated-second common lead-in and 2.5-second continuation, musically snapped and shortened at sustained reconvergence.
- Give every included original, adjacent pair and contrast exercise equal weight in Total. Define the full catalog before unlocking exercises.
- Allow surgical, reversible exclusion of any exercise. Keep its row visible in place with tasteful canceled-out styling; exclusion changes the assessment set and never fabricates completion.
- Preserve source packages, finger edits, library, settings, and raw measured/manual/history records through a versioned plan transition. This is primarily a logic change, with restrained selector additions.

## Capabilities

### New Capabilities

- `practice-exercises`: Workload-based section formation, musical boundary evidence, bounded connections, similarity/contrast exercises, stable catalog identities and evidence-preserving plan migration.

### Modified Capabilities

- `practice-passage-display`: Replace growing-join browsing and weighted-leaf totals with bounded exercise browsing and equal-weight included-exercise totals; add reversible exclusion presentation and faithful contrast excerpt context.

## Impact

Application-owned planning and state in `src/practice.ts`, `src/manual-practice-plan.ts`, practice context/storage and attainment/equivalence adapters; selector/display, library summaries, progression and session/preview integration. The catalog replaces the current nonoverlapping recursive tree, which cannot represent A–B and B–C together or distant contrast excerpts. Relevant practice, manual, migration, timing and browser checks must change accordingly.

The pinned notation dependency, engraving authority, authentication/providers/workflows and native application identity remain outside this change. Linux checks and browser inspection do not establish native activation or human musical acceptance.
