# Score Viewer

Private repository for the TUNA score viewer: score library, reading and performance, instrument setup, editable piano fingerings and guided practice on Windows and macOS.

The application source has been extracted from accepted [ISO notation](https://github.com/hypermemetic-ai/iso-notation) revision `da93cf9e0359d861987fd76611b59b14b6aedb92`. Source extraction preserves the existing behavior, including the practice defects reported in [the repair handoff](docs/practice-repair-handoff.md). It does not install or publish a new application.

```sh
git submodule update --init --recursive
npm ci --ignore-scripts
npm run build
npm test
```

New clones should use `git clone --recurse-submodules`. The pinned private ISO submodule requires organization access. `npm run dev` starts the optional local browser preview on port 5205; stop it when finished. Desktop development remains `npm run tauri -- dev`. Browser mode has no native MIDI input, native audio routing or desktop file dialogs.

The viewer owns `src/`, `src-tauri/`, its tests and application assets. Notation, the score format, editorial tools and engraving remain ISO-owned; `vendor/iso-notation` is an explicitly temporary, full-revision source dependency for those modules and the calculator. It is not a new permanent public API. Format conversion belongs to [score-converter](https://github.com/hypermemetic-ai/score-converter); the interval-learning application belongs to [learning-app](https://github.com/hypermemetic-ai/learning-app). The fingering calculator's separate repository extraction is pending.

Current piano practice modes and controls are described in [Reading and Timed practice](docs/practice-reading-timed.md).

Common instrument reading and local MusicXML preparation are described in [instrument reading](docs/instrument-reading.md).

See [migration and native delivery boundaries](docs/migration.md), [source provenance](docs/source-provenance.json) and [the immediate practice repair handoff](docs/practice-repair-handoff.md). The extracted [historical application README](docs/source-viewer-readme.md) describes the original accepted source and its delivery history; paths and installation claims there refer to the earlier monorepo.
