# Consistent musical count-ins

The previous repeat path treated a phrase-end count origin as usable even after saving or stream startup had consumed some clicks. Its two-reference-beat count also reset Zelda's 3/4 downbeat after only two quarters. This repair gives every attempt a complete source-meter cue and prepares ordinary same-passage repeats before the preceding phrase ends.

Schumann No.14 counts two dotted quarters in 6/8; Zelda counts three quarters in 3/4. Quarter, half, dotted and fractional reference units keep their original source tick clocks. Irregular meters use their denominator beats; the Viewer does not invent asymmetric grouping that the source does not retain.

V2 transports exact source boundaries, full meter/metric beat/phase for every bar, complete entry-meter count length, count-start phase and explicit metric beat starts. All arrays are bounded, finite and independently regenerated during admission. Their first entries agree with the count fields. Legacy requests without V2 retain their exact earlier meaning; malformed or mixed contracts refuse. This requires the matching reviewed native implementation in the ordinary paired delivery.

An opening short bar needs a following full bar in the same meter to establish upbeat context. Retained written zero numbering or literal repeat-entry facts can establish another pickup with that context, and performed occurrence mapping carries the known written phase. A later short ending or partial meter-change bar is downbeat-aligned when pickup authority is absent. Viewer phase metadata is separate from the archived source and does not change its bytes or hashes.

An initial cue starts at entry-meter phase zero, lasts a whole bar and continues to the genuine entry phase. Repeats preserve the prior source exit phase when its meter and metric beat match the entry meter. A 4/4 one-quarter pickup followed by a three-quarter ending initially counts `1 2 3 4 1 2 3`; each subsequent full-bar cue counts `4 1 2 3`, and the pickup enters on `4`. Meter changes select entry-meter phase zero explicitly. A bounded common pulse resolution preserves a fractional compatible exit phase; unsupported resolution refuses.

Prepared playback owns one current and one future cue. Automatic next tempo is projected only after every attack is accepted; held-note/error obligations can still cancel it. Actual completion alone awards attainment and captures its save snapshot. Saving proceeds independently of an already prepared cue; a save failure stops playback and retains the earned in-memory record. Done/withdrawal and queued speeds keep their existing completion boundary. Late readiness advances by whole entry bars and plays a full cue.

Renderer-wide monotonically allocated arm tokens prevent separate clocks from reusing a cancellation identity, even when their mocked origins are equal. Native ownership retains the original integer microsecond receipt rather than round-tripping it through milliseconds. Cancellation names the exact arm and prior origin, including a raced activation. An acknowledgement arriving during its already scheduled complete cue can be adopted before that cue's score entry. If it misses that deadline, targeted cancellation precedes complete-bar fallback. Pause, error, settings, output changes and disposal invalidate the owned generation and pending deadline.

The browser scheduler excludes the predecessor's terminal boundary pulse within one nanosecond of arithmetic noise. A real compound-meter run exposed two otherwise identical clicks at `3483.3333333333335` and `3483.333333333334` milliseconds; its failed receipt was retained and an exact-boundary regression added.

## Evidence

The reproducible `scripts/inspect-practice-countin.mjs` uses real Chromium `PracticeView`, running WebAudio oscillators and source-linked note timing. Private archives enter only through a caller-supplied file and are never stored in Git. The probe records actual oscillator starts, frequencies, source exits, count receipts, display changes and unchanged score/page/seat data. It asserts one correctly accented pulse at every completed repeat count position and exact source-end handoff. All temporary servers and browsers close in its `finally` path.

The final integrated V2-shape receipt is retained privately at `/home/qqp/.local/state/score-viewer-repeat-countin-20261009/source-final-ack-expiry/receipt.json`:

| Case | Completed tempos | Repeat preparation/adoption | Artificial save delay |
| --- | --- | --- | --- |
| Public Schumann, measured | 170 → 171.8 → 173.6 | 3 / 3 | 250 ms |
| Original private Zelda, conventional, manual | 80 → 80 | 2 / 2 | 350 ms |
| Original private Zelda, Jankó, measured | 60 → 60.8 | 2 / 2 | 350 ms |

Every checked complete cue had the expected accent and spacing, exactly one boundary click and no additional silent bar. The underlying score, pages and seats remained unchanged. Earlier failed double-click and Vite WebSocket harness receipts remain available alongside the passing receipts. The probe's isolated HTTP/WebSocket server owns an ephemeral port and does not use an existing studio or application server.

Focused source tests also cover two complete pickup repeats, complementary short endings, written repeated pickups, mixed meters, fractional reference units, bounded vectors, delayed/absent acknowledgements, cancellation before acknowledgement, original ownership at `35,037,631,353,801` microseconds, save failure, reversible Done, held terminal notes and repeated selector arrows. The final configured Viewer suite passes all 531 tests; TypeScript/Vite build, strict OpenSpec and whitespace checks pass. These checks and the final browser receipt bind runtime head `5df580e96d9c1d3dd7fbd7581989e53fa57bae3e`, with ISO `42ac072da5af34de00b2fe8096cc434210ef05e9`. A retained earlier 530/531 run exposed an already-expired acknowledgement deadline being deferred through a timer; completion now immediately cancels/falls back when its entry deadline has already passed.

These observations establish source scheduling and real browser audio-event behavior. They do not certify the user's speaker latency, physical MIDI/pedal path, audible musical acceptance or an installed native package. Windows/Mac compilation, native waveform/owner-race tests, paired packet verification and activation remain separate delivery gates owned by the parent.

The later [complete-main integration](main-operation-validation-20261009.md) wires Performance to the same admitted source grid for count labels and exact playback duration. Its real browser main/WebAudio probe observes Schumann's two dotted-quarter and Zelda's three quarter counts through source entry; MIDI connection is explicitly simulated and full Performance recording is not claimed.

Native PR32 was independently reviewed and merged at `760a4b8e1d3ea173637b43b825979da26cb54111` (reviewed head `d03b83b52629214594615e918c992804177167ba`, identical tree `99d407d4e52f6c16980882f3f23396e8c0e6a237`). Its 55 exact-source tests include rendered PCM at 44.1/48 kHz, V2/legacy admission, future queue deadlines and owner/activation/cancellation races. The actual complete Windows/Tauri test executable compiled and linked with 16 expected system imports and no new VC runtime prerequisite; it was not executed on Windows. The source-bound receipt is `/home/qqp/.local/state/score-viewer-repeat-countin-20261009/native/native-checkpoint-review.json`.
