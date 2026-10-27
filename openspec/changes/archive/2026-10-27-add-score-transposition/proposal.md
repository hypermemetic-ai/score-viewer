# Proposal

## Why

Pianists need to read and practise an opened score at a different pitch. The current Score controls are concealed in a collapsed section at the bottom of Options, making score-specific work unnecessarily hard to find.

## What Changes

- Make Score an always-visible section first in reader Options, or immediately after Practice in practice Options, with the current piece subtitle and aligned settings.
- Add a compact Transpose numeric control labelled **steps**, using the shared stacked chevrons and keyboard browse/edit behavior. Positive values raise pitch, negative values lower it, and 0 restores the exact untransposed edition.
- Persist the selected transposition for the score, shared between reading, practice and keyboard presentations. Displayed music and assessed MIDI pitches use the same effective source.
- Regenerate complete supported presentations and physical fingerings for the new pitches through the existing shared engine. Preserve timing, source owner identities, ties, slurs, hand assignments and immutable original archives.
- Give transposed editions their own corrections and achievement evidence. Keep the original corrections, editions and history intact; a failed or cancelled request retains the current edition and setting.
- Present Generate fingerings and Share score prominently beneath score settings, with applicable correction/history actions and only Source & review collapsed.
- Carry the reviewed source through the existing paired native delivery and additive Windows activation path, retaining the current installation and user data.

## Capabilities

### New Capabilities

- `score-transposition`: Reversible per-score pitch transformation, trustworthy regenerated presentations, consistent assessment and preserved edition state.

### Modified Capabilities

- `practice-passage-display`: Make the shared Options Score section visible and order it directly after Practice when practising, while retaining the existing shared binding and input ownership.

## Impact

Viewer source transformation, package/worker/request/cold admission, preparation identity, edition installation and library selection, plus the shared Options markup/styles. Existing ISO rendering/planning APIs remain the notation authority at the current pinned revision; no competing engine or audio-routing change is introduced. Reference MIDI remains an immutable original-source attachment, since the current application does not play score MIDI. Native delivery uses the existing source-owned carrier seam and preserves font, notice, piano, native identity and publication gates; no authentication, provider or workflow configuration changes.
