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
MIDI, audible quality, pedal response and sound-to-ear latency need their separate
native and human acceptance evidence.
