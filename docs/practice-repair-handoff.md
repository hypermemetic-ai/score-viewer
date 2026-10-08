# Immediate practice repair handoff

## Operator report

The operator reports that the current Windows Score Viewer breaks Schumann No. 14 practice as well as Zelda practice. Consecutive measures in both the practice run and passage-selection preview are cut into independent fragments. They should read as one continuous strip. Zelda long-note stems remain visible after the corresponding played notes are removed; duration stem ink must participate in the same note lifecycle as ordinary stems.

These are reports to reproduce, not independently confirmed diagnoses. The operator requested an emergency rollback before repair, followed by creating this private repository and its Paseo workspace so the actual repair can be commissioned here.

## Ownership and delivery

An ISO-session child owns rollback on the operator's verified Windows machine. It must preserve personal library, scores, edited fingerings, settings and progress, preserve the replaced application package and select a prior build with evidence that Schumann practice works. Its exact restored build and observed checks will be appended after delivery. No source fix or new release is part of that rollback.

The application extraction is a separate reviewed source change. It must preserve accepted musical and application behavior, native identity and saved-data contracts, carry relevant tests and document pinned notation/fingering dependencies. It must not absorb the independent interval-learning application or the conversion product. Do not claim the new repository is runnable until its source and build path have been validated.

## Requested repair behavior

- Consecutive measures in both selection previews and active practice runs render as **one continuous strip**, with coherent staff lines and barlines. Remove independent per-measure crop gaps and duplicate edges. These measures are consecutive by construction; they should not look like disconnected page fragments.
- Existing fixed reading positions and musical transitions remain stable; do not reintroduce horizontal scrolling or continuously moving references.
- Played-note removal also removes all ink belonging to that note owner, including long-duration hollow stem ink, through the same lifecycle as ordinary stems. Pause/full-passage restoration brings that ink back with the associated note. Preserve other notes and staff ink.
- Verify Schumann No. 14 and the current Zelda score in both affected views and both supported keyboard presentations where applicable. Test the actual lifecycle and visible output, rather than only inspecting stored layout or hashes.

Apply these rules generically across supported scores and presentations, rather than as a Zelda-only adjustment. Preserve existing joined/component mastery, musical timing and beat-aligned count-in, and reversible Done completion behavior; those are not the requested redesign.

The root migration coordinator owns repository/Paseo setup and source landing. The operator intends to commission the repair separately in this project. The application source extraction preserves the reported defects; no repair implementation has been started by the migration.
