# Proposal

## Why
The installed calibration starts with six mandatory empty setup fields and still exposes the obsolete thumb–pinky editor. The player needs to choose a hand and begin producing measurements immediately.

## What Changes
- Start directly from a right/left hand choice, with keyboard shortcuts and Enter support.
- Generate a declared nominal protocol frame and operational test window without claiming measured seating, body position or physical keyboard endpoints.
- Remove the old thumb–pinky collection entry while retaining historical evidence and export.
- Verify the real keyboard path from starting a hand to saving the first actual fingertip reading.
- Restore the accepted finger-specific length-difference placements and inset 0/100 landmarks, including the staggered thumb window and anatomical hand reflection.

## Capabilities
### New Capabilities
None.
### Modified Capabilities
- `exploratory-calibration`: direct hand-only start with honest automatic setup and retained historical evidence.
- `fingertip-calibration`: restore the accepted straight, flat length-difference protocol on the current physical model.

## Impact
Viewer setup helper, calibration view/entry route, focused regressions and documentation. The accepted model, calculator wire format, measurement protocol, native identity and saved data remain intact.
