# Proposal

## Why

The pair screen includes technical target metadata, an unnecessary skip command and ambiguous camera controls. Its rating area can be clipped, and grade 5 incorrectly requires a prior reachable report instead of recording the player's actual answer.

## What Changes

- Use static-contact instructions and remove target bookkeeping from the measurement screen.
- Move between finger pairs with left/right, leaving unanswered contacts unmeasured.
- Make keyboard rotation an explicit mode with compact controls and clear input ownership.
- Keep the complete rating area clear of the footer and enable unavailable reports on every prepared target.
- Require actual reachable evidence only when declaring an outward unavailability boundary.

## Capabilities

### New Capabilities
None.

### Modified Capabilities
- `exploratory-calibration`: player-facing pair navigation, camera mode and unconditional actual unavailable reports.

## Impact

Viewer controller, archive admission, pair view, model controls and scoped styles/tests. No dependency, geometry, native identity or saved-data migration changes.
