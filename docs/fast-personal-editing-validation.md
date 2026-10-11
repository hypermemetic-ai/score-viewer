# Fast personal editing validation

The [production browser benchmark](../scripts/check-fast-personal-editing.mjs) measures an actual keydown event through the first animation-frame callback containing the correct projected score. It serves the built production frontend under the application's CSP; native managed-file IPC is simulated in isolated browser storage. It reads and preserves public archive bytes and never uses the operator's managed library.

Its six cases combine Conventional piano and Jankó four-row presentations with the retained public Schumann No. 14, a newly authored 120-bar independent-voice study (480 source owners), and a public complete written-tie study spanning pages. Each case includes twenty hand edits across ten successive source selections, changing each hand and changing it back, followed by twenty finger edits with ordinary chronological advance. Opening and four preparation edits are reported separately. The original target was correctly rendered p95 at most 100 milliseconds for every case and edit class. On 2026-10-10 the user accepted delivery at the achieved speed after checking the remaining promising geometry optimization; 100 milliseconds remains a tuning goal, not a release blocker. The default runner still requires that goal; the explicit measured-speed opt-in below records the accepted trade-off without changing timing results. Final end-to-end measurements must still report the goal honestly and retain all correctness, coverage and recovery checks. A projection refusal is checked independently through full cold preparation and the actual production key path; its retained evidence includes the refusal reason and whether visible geometry, selection and saved journal remain unchanged. Such a refusal does not count as a successful edit sample. Missing or failed samples fail correctness acceptance. The delayed-save rapid edit reports its achieved time against the same 100-millisecond tuning goal.

Completion requires the entire visible SVG's geometric primitives, stable paint/font attributes, original text, all visible finger values and positions, effective hands, selected source alias, page and keyboard focus to match expected output. Expected geometry for every distinct hand map comes from independent full cold shared preparation, with a fresh transient session used only to resolve source-stable alias IDs. The benchmark neither uses a changed browser scene as expected output nor accepts a changed dataset or finger caption as a substitute for engraving. Benchmark authority identities describe isolated transient operator choices; no expected scene is archived as a calculator result.

The long source uses the ordinary shared source renderer and native publisher to create both admitted source presentations without a calculated finger layer; its warm edits therefore cover the required no-layer path. The first attempt to calculate a 480-owner finger layer exhausted the ordinary regression helper's 200,000-expansion bound before any browser case opened. That separate fixture-preparation failure is retained as diagnostic evidence; it is not a warm-edit timing result. No. 14 and the small tie fixture retain their admitted calculated finger layers.

After timing, native writes are blocked while a hand key and finger key are issued rapidly. The benchmark requires coherent latest notation before either write completes, stable owner intent, suppression of older projection publication and ordered saved snapshots. The simulated storage gate identifies the active journal by its source and keyboard binding, including a new journal staged during cold activation, rather than assuming the seed filename stays active. Library transitions expand the correct composer group through ordinary controls. It also injects a write failure, verifies further edits pause without losing the rendered intent, retries the retained snapshot through the ordinary UI, and checks source-bound notation after switching scores and reopening. Original archives remain byte-exact.

Run after the tracked shared source pin has been admitted:

```sh
/home/qqp/.local/bin/qq-job -- npm run build
PRACTICE_PLAYWRIGHT=/path/to/playwright-core/index.mjs \
PRACTICE_CHROMIUM=/path/to/chrome \
FAST_EDIT_ARTIFACTS=/tmp/score-viewer-fast-personal-editing \
/home/qqp/.local/bin/qq-job -- node --import tsx scripts/check-fast-personal-editing.mjs
```

The receipt retains source/frontend/fixture hashes, named host/browser/viewport, all successful and failed timings (including frame-callback arrival and correctness-verification overhead), sample counts, cold-opening time, correctness checks and screenshot names. The first changed-hand frame and its restored-hand counterpart are captured separately, alongside finger editing and recovery screens. Freshly generated public fixtures and screenshots remain in the artifact directory. At least twenty samples per class are enforced; `FAST_EDIT_SAMPLES` may increase the count. `FAST_EDIT_CASES` may select comma-separated exact case names for a bounded diagnostic run; a subset always fails the six-case acceptance gate and is labeled in the receipt.

Results must be read from an actual retained receipt. This document describes the acceptance method until a successful run is recorded. Browser-frame correctness is evidence for this frontend and host, not display scanout, physical keyboard timing, native WebView timing or human musical acceptance.

A historical candidate trial on qq-box (Linux, Node 26.7.0, Chromium 151.0.7922.34, 1440 × 900) used shared revision `6b2ed7e30d256118e2c1d91360271f63bc096382` with the earlier editing application base `3d59d38`. This is diagnostic evidence, not acceptance of that renderer or the current combined application. The corrected six-case receipt is `/tmp/score-viewer-fast-personal-editing-candidate-6b2ed7e-corrected/receipt.json`, SHA-256 `92057e2e99bb806bc1f4e86845c68300d4ec23ebb5fcf71cc76079b220c89ccb`, with twenty retained screenshots.

| Complete measured case | Hand p95 | Finger p95 | Correctness and recovery | 100 ms gate |
| --- | ---: | ---: | --- | --- |
| No. 14 Conventional | 651.9 ms | 12.6 ms | Passed | Failed |
| No. 14 Jankó | 896.2 ms | 21.0 ms | Passed | Failed |
| Tie/page-reflow Conventional | 20.8 ms | 12.3 ms | Passed | Passed |
| Tie/page-reflow Jankó | 19.4 ms | 13.0 ms | Passed | Passed |

Both 120-bar long cases opened admitted archives but could not complete the positive samples. After correcting warmups to restore each original hand, an isolated `dense-0-2:0` transfer to RH produced the same physical beam-clearance refusal in the fresh expected projection, independent full cold preparation, and actual production key path. Both layouts retained the complete visible SVG, selected alias and saved journal byte-for-byte while showing pending recovery controls. The separate bounded refusal receipt is `/tmp/score-viewer-fast-personal-editing-candidate-6b2ed7e-long-refusal/receipt.json`, SHA-256 `237817d74a00811c3fbefe928b94bd0546ccde0eb284244dc7d4e6e131cdd5f1`. A preserved refusal is useful failure evidence; it does not satisfy the required twenty successful edits. The original positive fixture remains unchanged for the engineering repair and rerun.

For a bounded real-client CPU investigation, build the production frontend with source maps, then run one named case with `FAST_EDIT_CPU_PROFILE=1` and `FAST_EDIT_CASES=no14-conventional-piano`. The harness warms and restores the first owner, measures its cached toggle pair, then captures the next source owner's first unseen hand transfer. Chromium CDP records the CPU samples and timeline only around the actual key. Performance marks bound the interval from real keydown to independently correct full-page frame; source maps resolve sampled minified locations. The artifacts include `.cpuprofile`, `.trace.json`, and `.profile-summary.json` with self and inclusive samples and timeline durations. Inclusive costs overlap, instrumentation adds overhead, and three samples plus one presentation cannot satisfy acceptance; the ordinary coverage/count gate deliberately fails this diagnostic run.

The independent full-map parity check is `node --import tsx scripts/check-annotation-position-parity.mjs`. `ANNOTATION_PARITY_FIXTURES` selects the retained public fixtures directory and `ANNOTATION_PARITY_ARTIFACTS` selects its receipt directory. It extracts the historical annotation, SVG-clearance and carrier implementations from Git revision `3b7553f` into the artifact directory only; old production code is not checked into the application. The receipt records the original and generated oracle module hashes and current module hashes. Separately instantiated old/current modules and inputs compare complete positions, bounds, carrier IDs and associated stems for all six presentations at baseline and two isolated unseen hand transfers, using identical fonts and admission readiness.

A later c92 renderer CPU diagnostic used the current editing client and profiled the same first unseen No. 14 Conventional source owner, `14-Petite-etude.ly:185:16:lower:47:1`, transferring to RH. The complete visible geometry and annotations matched the independent cold view at completion. The initial application frame took 734.7 ms, with sampled shared projection 303.2 ms and annotation placement 347.8 ms. Repeated `pianoSeatPage` linear searches accounted for 185.3 ms of self time. After application revision `57cc983` appended collision bounds by page, the frame took 561.8 ms, annotation placement fell to 149.6 ms, and the linear-search hotspot disappeared. Shared projection sampled 331.1 ms in that second run; these single instrumented runs show the client bottleneck and improvement, not a stable latency percentile or 100 ms acceptance.

The post-fix trace retains its exact source maps in `/tmp/score-viewer-fast-personal-editing-candidate-c92aa49-root57cc983-cpu/source-maps`. Its receipt SHA-256 is `f7311fc6ac9e1dd7bc3b2d642da742d6fb9d9d426d868e26a9f32989041be0db`; the pre-fix diagnostic receipt is `49e20b2ab513d1de459612d3e7a3dc95d6ccb962c5645428807002159dc13393`. Remaining post-fix sampled client costs include carrier discovery 66.1 ms, SVG obstacle inventory 41.2 ms and affiliated-position search about 35 ms of self/filter work. Recursive and inclusive costs overlap and must not be added as separate totals.

The independent Git-oracle full-map check passed all six cases at baseline and two isolated hand transfers (18 complete maps: 381 No. 14 aliases, 480 long-study aliases and 24 tie-study aliases per view). Its receipt is `/tmp/score-viewer-annotation-position-parity-root57cc983-c92-git-oracle/receipt.json`, SHA-256 `e19b9d4afdd0e81f20b084f72979e2e05563b30c91b89671419dc4c87552f684`. Historical source module hashes, before temporary import-path relocation, are:

| Git `3b7553f` oracle | SHA-256 |
| --- | --- |
| `src/fingering-presentation.ts` | `fec2c534d93096a069e8289ffd51e3de7d8474c91b7bf57685db4a1d45a78794` |
| `src/svg-annotation-clearance.ts` | `4589c9ffe9c7b24b0fafa2e898ca662e52e832927167dad1e206f2244fa0a739` |
| `src/fingering-carriers.ts` | `ba0e0b3e28433981d97baf46b8783173d842c9b42674a79ace4f629076b53cae` |

Restore and history commands now enter the same ordered personal-intent queue as
keyboard hand/finger edits. Ten production-body regressions cover interleaved
commands, reversed projection completion, delayed/failed writes, retry and score
switches. The original slow-restore/newer-hand case fails against the prior code
and passes after the change. Modal completion is guarded by its owning dialog
and score, so closing an old edit during a pending save does not close a newer
dialog. These checks do not establish the still-open latency target.


The user accepted the achieved editing speed and made 100 milliseconds a tuning
goal rather than a release blocker. Set `FAST_EDIT_ACCEPT_MEASURED_LATENCY=1`
explicitly when running the complete benchmark under that decision. This flag
changes only the benchmark verdict: it does not change the application, measured
frame times, sample counts, original `hand.pass`/`finger.pass` timing results or
`delayedSaveRapidPass`. The receipt adds `latencyGoal`, `correctnessCoverage`,
`releaseAcceptance` and `acceptedTradeOff`. Acceptance still requires all six
named cases, at least twenty correct samples in each edit class, a correct latest
frame while saves are blocked, stale-publication suppression, ordered delayed
writes, failure recovery, source-bound reopening and no reported errors. A
subset, a renderer refusal, a missing sample or a recovery failure still fails,
even with the flag. A receipt that accepts measured speed must show its timing
goal failure plainly. This frontend verdict does not approve a source pin,
reviewed merge, installed native application or musical acceptance.

Reader overlays now compute only the viewport's visible pages, using the entire
original package, source owners and admitted geometry. Practice and the default
full-map API retain complete placement. Font policy is checked on every request;
selected-page requests also audit complete seat ownership and geometry identity
on cache hits. Exact page-local placement order, physical carrier discovery and
collision rules remain unchanged. The parity script now compares each selected
page, overlapping/duplicate-page requests, empty selections and subsequent
complete calls to an independent historical COMPLETE map. Its default still
checks all six cases at baseline and two unseen hand maps (18 views).
`ANNOTATION_PARITY_CASES` and `ANNOTATION_PARITY_VIEWS` permit bounded diagnostic
runs; their receipt explicitly marks incomplete scope.

The scoped visible-page implementation `02c2d7b` passed 22 focused annotation,
carrier and physical-clearance tests. The ee7 trial passed four baseline complete
maps and twenty selected-page/spread/empty comparisons against Git `3b7553f`:
No. 14 and the three-page, 24-alias tied study in both keyboard presentations.
Both measured-policy tie cases also retained the old exact altered-font refusal.
The receipt is
`/tmp/score-viewer-visible-annotations-ee7-02c2d7b/receipt.json`, SHA-256
`5ced622dd8d9f62a1757259800e1eaae60f5b2ebb24da7122d595ff4c7dbec5c`.
Its five-sample warmed Node overlay timings used fresh complete inputs and are
reported separately from browser frame timing; a concurrent source diagnostic
means those durations are not isolated performance evidence. This bounded
receipt does not establish final eighteen-view parity or final browser speed.
The initial whole-project type check also exposed two pre-existing practice-gate
fixture typing errors, subsequently fixed by the parent in `4f0f16f`.


## Completed production-frame benchmark

The complete run on application `7326f5c21375f6a417b157d1f0d3b4c57fa61801` and reviewed notation `08c2b34c6c96f59cd78c7231965016a29808ba3d` passes all six cases: twenty correct hand edits and twenty correct finger edits per case (240 total), coherent latest frames with blocked saves, ordered writes, stale-publication suppression, failure recovery and source-bound reopening. The host is qq-box, Linux, Node 26.7.0, Chromium 151.0.7922.34, at 1440 × 900.

| Case | Hand median / p95 (ms) | Finger median / p95 (ms) |
| --- | ---: | ---: |
| tie-page-reflow-conventional-piano | 6.9 / 15.4 | 11.7 / 12.4 |
| tie-page-reflow-janko-four-row | 9.7 / 16.4 | 12.0 / 12.4 |
| long-dense-120-bars-conventional-piano | 7.7 / 269.1 | 9.3 / 11.1 |
| long-dense-120-bars-janko-four-row | 9.4 / 285.6 | 10.2 / 11.2 |
| no14-conventional-piano | 16.9 / 302.0 | 11.8 / 14.7 |
| no14-janko-four-row | 18.9 / 315.9 | 11.6 / 14.7 |

The 100 ms goal remains unmet for dense/No14 hand changes and delayed rapid frames. The explicit user-accepted measured-speed policy admits this complete correctness result without changing the original timing booleans. The receipt is `/tmp/score-viewer-fast-personal-editing-final-7326f5c-08c2b34/receipt.json`, SHA-256 `b0f97eba2f46ddba8106788b0d9e0aecedaabb8ebbf49eb1dcae0088cb4e9fbd`, with 36 screenshots and no reported errors. This is production-frontend evidence with simulated native IPC, not native WebView timing, display scanout, physical MIDI, audible playback or human musical acceptance.

The earlier complete e666 run correctly refused the second-bar dense hand change because unchanged neighboring noteheads overlapped. Its immutable failed receipt is `/tmp/score-viewer-fast-personal-editing-final-d8b0576-e666/receipt.json`, SHA-256 `9c4ad3b474ac6bac917018a08643953bead36ac773a30c347d7394e1ec408041`. Reviewed source PR360 reserves existing physical head clearance at actual shared time fractions under `fitted-rails-v1`, preserving historical recipes and strict audits. The exact original archive and formerly failed owner pass warm/full-cold regression; the final browser run completes that same owner in both presentations. Dense page/system counts and the complete No14 fresh plan remain unchanged.
