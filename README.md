# Score Viewer

Private repository for the TUNA score viewer: score library, viewing and editing, instrument setup, editable piano fingerings and guided practice on Windows and macOS.

The application source has been extracted from accepted [ISO notation](https://github.com/hypermemetic-ai/iso-notation) revision `da93cf9e0359d861987fd76611b59b14b6aedb92`. Source extraction preserves the existing behavior, including the practice defects reported in [the repair handoff](docs/practice-repair-handoff.md). It does not install or publish a new application.

```sh
git submodule update --init --recursive
npm ci --ignore-scripts
npm run build
npm test
```

New clones should use `git clone --recurse-submodules`. The pinned private ISO submodule requires organization access. `npm run dev` starts the optional local browser preview on port 5205; stop it when finished. Desktop development remains `npm run tauri -- dev`. Browser mode has no native MIDI input, native audio routing or desktop file dialogs.

The viewer owns `src/`, `src-tauri/`, its tests and application assets. Notation, the score format, editorial tools and engraving remain ISO-owned; `vendor/iso-notation` is an explicitly temporary, full-revision source dependency for those modules and the calculator. It is not a new permanent public API. Format conversion belongs to [score-converter](https://github.com/hypermemetic-ai/score-converter); the interval-learning application belongs to [learning-app](https://github.com/hypermemetic-ai/learning-app). The fingering calculator's separate repository extraction is pending.

The ordinary score viewer and editor are passive: played notes do not turn pages, move selection or highlight score matches. In Edit, Up/Down jump to the horizontally nearest note in the previous/next whole system, revealing the next page when needed; Space toggles a persistent Notes/Measures mode: Left/Right move by note or to the first editable contact in the adjacent written measure. Empty measures are skipped; held continuations remain selectable. Tab/Shift+Tab and digit entry keep note-by-note movement. Editing starts in Notes; its navigation bindings can be changed in Options while editing. Explicit page/pedal commands, piano sound and Options input diagnostics remain available. L/R set the selected note’s performing hand and keep its finger and selection; digits set a finger and advance. Personal hand/finger edits preserve practice progress.

Practice offers bounded original sections, overlapping connections of two consecutive sections, and separate A/B contrast excerpts for similar sections. Excluding an exercise changes the displayed total while preserving its progress. Current modes and controls are described in [Reading and Timed practice](docs/practice-reading-timed.md).

Common instrument reading and local MusicXML preparation are described in [instrument reading](docs/instrument-reading.md).

Application navigation places Back at the bottom left and Options at the bottom right of the active screen or dialog, with task controls between them. The reader keeps its hideable toolbar. Scrolling uses no stock bars; Options retains its thin position marker. See the [interface rules](docs/interface.md).

See [migration and native delivery boundaries](docs/migration.md), [source provenance](docs/source-provenance.json) and [the immediate practice repair handoff](docs/practice-repair-handoff.md). The extracted [historical application README](docs/source-viewer-readme.md) describes the original accepted source and its delivery history; paths and installation claims there refer to the earlier monorepo.
