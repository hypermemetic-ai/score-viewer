# Design

## Context

See proposal.md for motivation. The delivered baseline is viewer c844b518 with ISO 08c2b34c. Calculated editions already persist as archives. Private read-only original user inputs and production frontend measurements remain outside Git.

On the unchanged Linux production browser, No. 14 Jankó opens in 15.724 seconds and reopens in 14.689 seconds; longest tasks are 15.115 and 14.319 seconds. Startup first mounts the library at 430 milliseconds but replaces its complete progress snapshot only at 8.665 seconds. Larger retained scores open in 3.525 and 4.240 seconds. These are browser measurements, not laptop or physical-device acceptance.

A source-stage split locates the No. 14 cost: replaying its retained rendering recipe takes 7.379 seconds, then warming personal projection takes 7.838 seconds, including 7.559 seconds of layout. A warmed core returns in 0.027 milliseconds. Existing library scans use a two-entry in-memory admission cache, so cycling three entries can miss on every repeat. Shared source and final-ink authority is private, scoped and cannot be persisted as JSON.

## Goals / Non-Goals

**Goals:** Consolidate readiness, remove repeated derived work, and keep host tasks and cancellation available during cold preparation. Retain exact source, notation and current personal-choice meaning.

**Non-Goals:** Alter section sizing, calibration protocol, practice credit, physical MIDI/audio interpretation, native identity or the accepted editing trade-off. Do not persist private admission certificates or duplicate shared engraving in the viewer.

## Decisions

### Persist display summaries with complete input dependencies

Add one exact, versioned managed derived-cache file with a bounded envelope. Each row binds the archive SHA-256, canonical entry selection/personal-pointer context, instrument, derivation version and content hashes for every journal read, including null reads and fallback paths. Wrap the summary reader to collect dependencies from the actual cold derivation. On a hit, compare exact archive bytes by digest and reread the contributing small records; skip package admission and planning only when every dependency matches. Validate structure, bounds and a canonical row checksum before accepting a row.

Caches contain display percentages only and never supply practice state or package authority. Corrupt, missing, incompatible or failed cache reads/writes use the valid cold path, retaining all source files. Cache persistence has its own ordered writes and generation checks. Live progress remains directly bound to its current score; persisted rows are refreshed against the newly saved journals before reuse. Snapshot publication retains existing supersession semantics. A memory-only larger admission cache would not fix restarts or the three-entry scan cycle.

### Retain shared preparation, create independent viewer wrappers

Use a bounded in-process pool of captured shared personal-projection cores, keyed by exact archive identity plus literal source, effective baseline, instrument, calculation context and rendering recipe inputs. Retain at most two entries and a conservative source-material budget of 64 MiB; this is a retention bound, not an exact JavaScript heap claim. The shared core owns its immutable captured inputs and frozen projection results. A new viewer session always constructs a view from its own newly admitted package and current personal state, never returns another session's package, member buffers or personal journal. Core use is serialized through completion; canceled/failed preparation is not retained as ready.

This removes both retained-baseline replay and cold layout on compatible reopening while preserving font checks in package admission. Persisting the shared core would cross private ownership boundaries and is rejected.

### Shared cooperative execution stays in ISO

Extend the shared supported preparation seam with cooperative full-score rendering and cold personal warm. Use existing layout/lint generators and the existing execution budget/task-yield mechanism. Source-operation and final-ink records are activated only for each synchronous generator step and return cleanup; they expire before checkpoint callbacks or host tasks. Never hold a synchronous final-scope callback across an await. Paint pages and collect geometry at bounded checkpoints. Build local candidate state and commit the personal session only after successful completion; aborts retain the previous warm state.

The synchronous APIs remain compatible and share the same preparation logic and output. Forward execution through retained recipe replay, calculated-edition admission and viewer personal warm. Add checkpoints to viewer-owned piano package validation without relaxing any archive, source, font, companion or receipt checks. An async function wrapped around the existing synchronous render would leave the 15-second long task intact and is rejected.

### One readiness surface with owned lifecycle

Provide initial accessible loading markup before the main module starts. Startup owns one loading surface while settings/library, input subscriptions, complete summaries and enabled piano configuration settle. Report actual named phases and completed library counts; show indeterminate activity when work cannot be counted. Optional sound failure becomes a visible sound-unavailable result, without changing saved preferences. Library failure retains data and offers recovery feedback.

Score opens use the same visual component with the existing cancel/install boundaries, updating it from preparation checkpoints. Ordinary interaction is admitted after readiness. Existing generation checks retire stale background refreshes, and foreground preparation stops background work at its next checkpoint. There is no fake time-based percentage, competing loader stack, or hidden engraving after the surface declares readiness.

## Risks / Trade-offs

- [Cold preparation still requires valid engraving] → Show and measure the remaining work; cooperative execution improves responsiveness while bounded reuse removes repeated engraving.
- [An omitted missing fallback could serve stale progress] → Record all actual reads, including nulls, and test additions/deletions, pointers, layouts, archives and version changes.
- [Shared mutable wrapper reuse could cross editions] → Pool only captured cores; bind fresh view wrappers to each current base and keep private ownership active only within synchronous steps.
- [Yielding exposes ambient or source mutation] → Capture literal inputs before yielding and retain existing ambient/prototype guards and abort cleanup tests.
- [Native sample-bank verification may dominate enabled-sound startup] → Include it in readiness and measure it on the recipient; do not fabricate native timing from browser simulations or weaken bank integrity checks.

## Migration Plan

Deliver the shared execution seam through a reviewed ISO PR, integrate its exact merged pin and unchanged source provenance into a reviewed viewer PR, and execute the existing paired Windows/Mac carrier path. Observe the built viewer and repeat named cold/warm benchmarks. Preserve a fresh closed-app snapshot before switching the normal laptop shortcut and restoring the current secondary monitor placement. Derived cache files are additive and disposable; rollback retains authoritative data and the prior verified application.
