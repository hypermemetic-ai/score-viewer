# Optional native piano audio

Piano and practice cues share one selected native output. Piano starts disabled;
disabled startup creates no audio worker, sampler, sample load or silent stream.
An actual metronome cue can still open the existing output independently. Enabling
Piano requires the bank installer's admitted SFZ path and loads one sampler on the
audio worker. Practice stop cancels its cue without stopping a playing piano.

On Windows, the host requests Media/RAW on a fresh IAudioClient3, then selects a
legal shared engine period and starts an event-driven render stream. Unsupported
RAW falls back to a fresh normal client. A locked engine can retain its current
legal period and format; older endpoints can use the event-driven shared default.
The host matches the endpoint mix format and does not change endpoint defaults,
system enhancements, driver bindings or hardware sample-rate settings. Status
reports the actual rate, period, mode and fallback, not sound-to-ear latency.

On macOS, the host uses CoreAudio HAL through CPAL at the device's current format.
Its explicit selected-device buffer lease reads the supported range, settable
state, original size and immutable UID. Latency tiers request nondecreasing
supported sizes, retaining the exact minimum at the lowest tier. A successful
write is confirmed off callback. Stream stop precedes restoration on disable,
reconfiguration, initialization failure and normal shutdown. Restoration checks
the UID and current owned value, so a later different external-host size wins.
Apply and restore both use bounded settling confirmation. CPAL uses Default buffer
mode so it cannot create a second untracked buffer write. The shared buffer may
affect other apps using that device; the rate, default device and driver remain
unchanged. A read-only buffer retains its current size and reports that fallback.

The native MIDI callback forwards valid notes and controllers before web events,
independently of reader-only rebound filtering and window focus. The passive
assessment route is unchanged. A fixed 1024-entry queue admits messages without
allocation, locks or waits. Connection and panic epochs reject stale messages;
queue overflow requests all-off without needing a free queue slot. Sixteen MIDI
channels retain independent pitch contacts and sustain values. Same-channel
attacks retrigger; an overlapping second channel retains the pitch until the last
contact releases. Sustain uses the greatest channel value, including half-pedal.

The mixer renders in 256-frame sampler chunks even when a device buffer is larger.
Render storage is prepared before streaming. Cue grids and sampler ownership are
prepared, retired and destroyed by the worker. Callbacks do not lock a practice
session, emit Tauri events, perform file work, or allocate/deallocate host Rust
storage. The existing monotonic MIDI clock and cue onset/count-in/repeat formulas
remain authoritative. The allocator test covers host Rust; it does not assert
that all internals of the C++ sampler are allocation-free.

## Scheduled notes

The web layer can play a scheduled stream on the piano through the selected
output: `piano_schedule_open`, `piano_schedule_replace` and `piano_schedule_submit`.
An event is `[atMicros, kind, key, value]`, a presentation instant on the native
MIDI clock: note-on, note-off, controller, or metronome click (value 1 accents).
Calls carry at most 512 nondecreasing events no more than 60 s ahead. The commands
refuse while Piano is off or its output is not running, so they never create a
worker, sampler, sample load or stream.

A fixed 2048-entry lock-free queue carries events to the callback, which holds a
single lookahead event and applies events at their sample offsets within each
256-frame sampler chunk, at most 512 per chunk. Offsets never decrease within a
chunk. Scheduled notes play on a seventeenth contact channel beside live MIDI's
sixteen, and the stream's own release lifts only its notes. The piano is one
sampler, so the two streams share a voice per pitch and one sustain pedal (the
highest of all channels):

- A live strike on a key only the stream holds sounds its own attack. The stream
  never strikes over a key a live channel holds; it holds contact silently.
- A key sounds until every channel holding it lets go.
- Holding your own sustain pedal holds the stream's notes too. When the preview
  stops, its notes lift, but under your held pedal they ring until you lift it.
  The sampler cannot end only the stream's notes then: lifting and pressing the
  pedal again in one instant re-catches every releasing note.
Clicks use the practice metronome voice on the same clock, unscaled by piano
volume. The callback publishes the frame it has rendered and its transfer size.
From these the commands return `leadMicros`, the earliest instant a new event can
be sounded on time. A note-on or click more than 50 ms late is dropped and counted.

Each replacement starts a new epoch, and late submits to an old epoch are
rejected. A plain replacement releases the stream: earlier events are discarded
and its sounding notes and clicks stop at once. A replacement with `keepUntil`
keeps the earlier epoch's events before that cut and drops them after it, so a
tempo change keeps sounding notes. The ring remembers the last eight cuts. While
the callback lags four epochs behind, a replacement waits briefly and then reports
that the schedule is busy. Events kept before the cuts of those four replacements,
releases among them, still play; the ring is twice the window, so their cuts are
intact. A fresh stream whose first event the output has already passed is refused
as too soon, like a cut that has, and the producer retries once with a new lead.
A new output (`Mixer::at_rate`) restarts the stream.
Practice cues, panic, live MIDI and the cue formulas are unchanged. The callback
still takes no locks, emits no events, does no file work and does not allocate;
the allocator test covers the scheduled path.

`node scripts/check-piano-audio-core.mjs` (inside qq-job) compiles the portable
core and its tests without Tauri, GUI or outputs. Stand-in `tauri` crates
type-check the commands. The paired native build compiles the Windows and macOS
hosts.

Ordinary native tests do not open audio outputs. The explicitly ignored Windows
test `practice_audio::stream_diagnostic::initialized_windows_stream_and_virtual_midi_pcm`
requires `VIEWER_AUDIO_DIAGNOSTIC_SFZ`, `VIEWER_AUDIO_DIAGNOSTIC_OUTPUT_ID` and
`VIEWER_AUDIO_DIAGNOSTIC_REPORT_DIR`. It records a bounded selected-output stream,
virtual notes/controllers, panic, cue onset and submitted float PCM. The macOS
test `practice_audio::diagnostic_macos::initialized_macos_stream_buffer_restore`
requires the report directory and optionally an output ID. It creates a tiny
test-owned SFZ/WAV and exercises real stream initialization and buffer restoration.
No active Mac outputs produces an explicit unavailable receipt; failures on an
available output fail the test. Host close/drop is distinct from observing the
normal Tauri exit hook, which acknowledges shutdown and preserves restoration
errors in a small native audit file.

These checks establish source/stream behavior. Final package launch, physical
MIDI, audible quality, pedal response, sound-to-ear latency and the timing of
scheduled notes on a real output need their separate native and human acceptance
evidence. A scheduled instant is when the frame leaves the mixer; output latency
after that is not included.
