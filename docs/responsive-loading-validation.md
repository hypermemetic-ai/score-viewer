# Responsive loading validation

The implementation uses disposable persisted library summaries, a bounded pool of captured personal preparation, and one loading presentation for startup and score opening. Unchanged retained opens preserve existing package and personal-journal pointers. Current archive bytes and contributing records remain authoritative; the caches do not grant rendering authority or practice completion.

## Production comparison

Linux headless Chromium, 1440 × 1000 viewport, production bundles, copied existing score/journal/settings inputs and simulated native IPC. Writes were isolated in memory. Times end after the ready library or admitted reader is mounted; score openings also wait for the loading dialog to close and two animation frames. These are single-run observations, not percentiles or native/device acceptance.

| Score | Previous first open | New first open | Previous reopen | New reopen |
| --- | ---: | ---: | ---: | ---: |
| No. 14 · Kleine Studie | 15.724 s | 15.265 s | 14.689 s | 0.362 s |
| Zelda’s Lullaby | 3.525 s | 2.322 s | 0.844 s | 0.547 s |
| Add It Up | 4.240 s | 4.194 s | 0.210 s | 0.147 s |

The old library mounted before its summaries settled; No. 14’s complete summary snapshot took 8.665 s. New cold startup waits visibly for that work (8.145–8.411 s). After the disposable summaries were saved, a fresh document became ready in 0.347–0.368 s. A canceled cold No. 14 open returned to the library in 17.5 ms, published no reader and wrote no files. Successful retained opens wrote only the existing last-worked preference; they created no package or personal-journal versions.

The final comparison ran after the configured suite/build finished. An earlier run overlapped test work and is retained only as a diagnostic. Private receipts bind the original inputs, source and frontend assets; private scores and journals are not committed or packaged.

## Checks and visible inspection

- Configured viewer suite: 1,015 passed, zero failed. The subsequent retained-open change also passed three focused production-function controls; these are reported separately, rather than as a single larger suite.
- Final configured TypeScript/production build passed. The calculator pin is unchanged; notation is the reviewed merged `b3fb5faa4297f92500f53513cdfee8496ab14d93` from ISO PR #364.
- Shared preparation: 87 distinct focused regressions across runs, configured types/build, literal synchronous/asynchronous No. 14 pages, raw hashes, seats and geometry. Both final-await cancellation and reentrant capture findings were fixed before merge.
- Independent viewer review accepted the exact runtime source, including complete summary dependencies/null fallbacks, bounds, stale-generation protection, fresh activation wrappers, serialized cores, cooperative ownership and unchanged retained opens. Sixteen independently executed focused cases passed.
- Three built-browser startup cases passed with no page errors: delayed enabled sound remains behind the loader; resolved unavailable sound is explained; retained-data errors keep Tab/Enter close and resize usable. Only disposable summary writes occurred, with no score/journal/settings writes or MIDI activation.

The startup, sound-error, retained-data-error, library, score-opening/cancel and reader screenshots were inspected. The loading treatment adds a quiet status line and slim progress bar; existing score notation, edit controls, shortcut styling and practice Speed frames remain unchanged. Actual phase text and completed-score counts replace hidden preparation; no elapsed-time estimate or fabricated completion percentage is presented.

## Remaining limits

Cold work is still costly. The longest observed cold tasks were 389 ms for No. 14, 272 ms for Zelda and 4,002 ms for Add It Up’s admission; warm tasks were 151 ms, 288 ms and below the 50 ms reporting floor respectively. Individual legacy normalization, archive/XML validation, drawing and geometry steps remain indivisible. This change does not claim every cold operation is instantaneous or meet the separate 100 ms visible-edit percentile target.

Enabled native sample-bank verification and audio configuration are awaited, with their status visible. Their costs were not simulated as measured performance, and integrity checks were not weakened. The existing host Rust runtime cannot execute local native tests because `libLLVM.so.22.1` is unavailable; exact native cache-name assertions are included and recipient native checks remain a paired-release gate. Browser evidence does not certify physical MIDI/audio, scanout, player acceptance or a user-installed Mac GUI. Native publication and data-preserving activation are recorded separately after delivery.

The subsequent [native delivery](responsive-loading-delivery-20261011.md) passed both recipient native suites and the complete paired release gates, then observed the installed Windows reader/loading panel and warm reopening on the original screen. Its closed audit retained all 831 authoritative files exactly and added only the bounded disposable cache. The final HTML serialization correction passed three startup controls and three built readiness cases separately; its other 18 frontend assets are byte-identical to the measured bundle.
