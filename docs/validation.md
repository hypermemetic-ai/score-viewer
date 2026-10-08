# Extraction validation

This records source/build checks of the migration branch, not installed-app acceptance or a repair of the operator's practice report.

- Source audit: all 137 original file hashes match accepted ISO revision `da93cf9e0359d861987fd76611b59b14b6aedb92`; the 143 recorded path rewrites reconstruct the carried source byte-for-byte. The documented exceptions are package.json/package-lock.json for root npm scripts and the development dependency, and Mac notice resource paths. All four notice files retain their original bytes. The original application README is retained as a historical document.
- `npm ci --ignore-scripts`: the locked application dependencies installed successfully; the previously inherited `@tonejs/midi` development closure is now explicit at the original version 2.0.28, added without lifecycle scripts.
- `npm run build`: configured TypeScript plus Vite production frontend passed in 1.889 seconds. The output includes the real reader, CSS, piano-readiness worker and 83,580-byte URW font. The three worker source modules normalize exactly to the originals after reversing only the import relocations, and the built font equals the carried source font.
- `npm test`: 364 passed, 0 failed/skipped/cancelled, in 87.497 seconds, with Node file concurrency limited to two. This covers the carried application suite, including package/state/input/practice lifecycle and real No.14 calculation/engraving. The historical studio helper remains a pinned ISO integration as described in migration.md.
- Source/configuration `git diff --cached --check` excluding `licenses/*`: passed. The full check reports two inherited whitespace findings in the byte-preserved Bravura/URW license texts; those notices were retained exactly rather than reformatted. The source-pin check verifies the dependency's actual commit, tracked gitlink and tracked cleanliness.

**Visual impact: not affected by the migration.** The source audit establishes unchanged application/engraving logic, while the existing rendering and lifecycle tests pass. No desktop visual inspection, native Windows/Mac build, normal launch, or physical MIDI/audio/pedal acceptance was performed. The reported disconnected practice strips and remaining long-note stem ink remain work for the separate repair.

No temporary server, browser profile, release dispatch, installed-app update, original ISO source change or legacy-tree removal was part of these checks. Durable detailed receipts belong to the migration coordinator's private state rather than the application or user interface.
