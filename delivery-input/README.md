# Frozen native release inputs

These inputs build reviewed viewer e105b5eac0887bb544d79723cdfea1c3f625fe92 with notation b3fb5faa4297f92500f53513cdfee8496ab14d93. The public score-viewer repository owns the native workflow and application. The shared frontend was checked and built once before freezing; native preparation verifies its inventory and source-check receipt, adds the release identity, and generates payload probes. Native builds do not check out the private notation repository.

The workflow selects a score-viewer delivery commit. Packages record that delivery revision separately from the frozen application and notation revisions. Windows native tests, Mac native tests, MIDI, signatures, deployment, DMG, launch, piano and embedded payload checks remain required. Building does not install the application or change recipient data. See docs/native-delivery.md.
