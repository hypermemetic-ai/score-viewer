# Viewer source migration

## Accepted source and ownership

The application is copied from `score-viewer/` at ISO revision `da93cf9e0359d861987fd76611b59b14b6aedb92`, with its files promoted to this repository root. That revision is the accepted Git source, not the dirty root checkout, unlanded introduction refinements, provisional fragment renderer or cancelled joint engraving study. The legacy ISO application tree remains in place until its retirement is coordinated; it has not been deleted by this extraction.

`docs/source-provenance.json` inventories the original bytes and the mechanical dependency path changes. The native identifier remains `dev.qqp.iso-score-viewer`, product name remains `ISO Score Viewer`, version remains `0.1.0`, and Tauri keeps its original managed-file commands, storage keys, capabilities, dialogs, MIDI and audio implementations. A different repository directory does not rename or migrate the user's library, finger edits, practice progress or settings.

## Transitional shared dependency

`vendor/iso-notation` is a private Git submodule pinned to the same full revision as the extracted application. Existing source-level imports are rerouted there. It supplies the musical model, fingering calculators, full-score engraving, source fixtures and historical studio integrations. No engine or calculator is duplicated as viewer-owned code. The fragment renderer being developed for the learning application is not a substitute for these full-score responsibilities.

`npm run build` and `npm test` verify the declared pin, the tracked gitlink and the dependency's tracked cleanliness before execution. Install dependencies with `npm ci --ignore-scripts`; build explicitly afterward. The test command limits Node file concurrency to two. `@tonejs/midi@2.0.28` is an explicit development dependency for the existing score/studio test closure; it previously resolved from the ISO root. Existing application dependencies retain their locked versions.

This source-level seam is migration machinery. A later reviewed change should define deliberate full-score/model/calculator package contracts, remove internal import coupling, and update the dependency deliberately. To update the temporary pin, review the desired ISO commit, move the submodule to that exact commit, update `dependencyRevision` in the provenance file (retaining the original application `sourceRevision`) and rerun the relevant checks. Do not run `git submodule update --remote` as a release input.

The submodule includes the original repository's tracked source and historical tests; merely fetching it does not activate its viewer, learning app, server or workflows. Viewer tests that use the old inline-studio helper still exercise that pinned historical integration, while runtime modules and the app build use this repository's viewer source. They are not desktop visual acceptance.

## Local build and native limitations

`npm run build` checks the configured application TypeScript and produces the browser frontend, including real calculation/presentation workers and the embedded URW font. `npm test` runs the carried application tests; `node --import tsx --test --test-concurrency=2 test/practice-*.test.ts` is a narrower practice check during repair. Test packages are the existing Schumann fixtures from the accepted repository. No private uploaded Zelda PDF/MIDI, personal library or Windows state is copied into this repository.

The native shell is preserved under `src-tauri/`. On a suitable native Windows host, `npm run tauri -- build` uses the existing Windows configuration. On a Mac host, the existing Mac override is `src-tauri/tauri.macos.conf.json`; building the universal target requires both Apple Rust targets and the native SDK. Its minimum macOS version remains 13.3 and the existing ad-hoc signing policy remains unchanged. The four bundled font notices have their paths adapted for the root application layout, with identical notice bytes. Linux frontend tests/builds do not establish native Windows/Mac compilation, normal launch, GUI, physical MIDI, pedal or audio acceptance.

## Release ownership remains separate

This migration creates no workflow, performs no release dispatch and publishes no download. The existing paired release lane, exact embedded-frontend proof and native launch checks remain in the ISO repository. Its historical worker scripts expect a source root containing `score-viewer/`; running them against this new root without a reviewed adaptation would be incorrect. Do not invoke the old workflow and assume it built this repository's changes.

The retained [paired delivery specification](../openspec/specs/score-viewer-delivery/spec.md) remains the required release behavior, not a claim that the new repository already implements its release lane. Porting that lane is a follow-up, with explicit identity for both the viewer revision and notation dependency. Until then, repairs can be developed and reviewed here; native release coordination must deliberately choose the reviewed combined inputs. The local Windows emergency rollback is independently owned and does not alter this source extraction.

## Practice repair starts here

The report in [practice-repair-handoff.md](practice-repair-handoff.md) is intentionally retained as work to reproduce and fix separately. Relevant starting points are `src/practice-preview.ts`, `src/practice-view.ts`, `src/practice-window.ts`, `src/practice-crop-fit.ts` and the corresponding tests. The known disconnected strips and remaining long-note stem ink are not repaired by this migration.
