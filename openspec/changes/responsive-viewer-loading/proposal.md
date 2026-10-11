# Proposal

## Why

Starting the viewer and opening scores can occupy the interface for several seconds without a clear readiness boundary. Repeated library scans and personal-hand preparation repeat work that should be reused, even though calculated score editions are already retained.

## What Changes

- Show one coherent loading surface from initial startup until the library and enabled services are ready, and through foreground score preparation. Report actual phases and completed work rather than invented elapsed-time percentages.
- Persist bounded, disposable library display summaries keyed to the exact score archive, selected instrument/edition, derivation version and all contributing journals, including missing fallback records.
- Reuse bounded, source-bound in-process score/edit preparation and make unavoidable cold work cooperative, so cancellation and loading feedback can run between preparation steps.
- Prioritize foreground work over library refreshes and prevent stale loading/cache results from replacing newer state.
- Measure cold startup/opening, warm restart/reopening and the longest blocked interface intervals on named fixtures and devices. Preserve the existing accepted editing trade-off and report remaining limits.

## Capabilities

### New Capabilities

- `viewer-loading`: Explicit application readiness, safe derived-data reuse and responsive foreground preparation.

### Modified Capabilities

None. Existing score-editing, practice and paired delivery requirements remain in force.

## Impact

Viewer startup, score opening, library practice summaries, managed derived-cache storage and personal presentation session ownership are affected. Shared engraving preparation remains ISO-owned: any new execution seam must be reviewed there and integrated through an exact dependency pin. Native application identity, scores, personal choices, calibration evidence, preferences and earned practice records remain preserved. Delivery follows the reviewed source and paired Windows/Mac release path, with ordinary data-preserving activation on the music laptop's existing screen.
