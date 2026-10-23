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
Clicks use the practice metronome voice on the same clock, scaled by the
Metronome volume rather than the piano volume. The callback publishes the frame
it has rendered and its transfer size. From these the commands return
`leadMicros`, the earliest instant a new event can be sounded on time. A note-on
or click more than 50 ms late is dropped and counted.

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

## Getting the piano

Download piano is one press. The native side downloads the author's current
Accurate-Salamander V6.2a 48 kHz/24-bit ZIP (1.66 GB) from archive.org with the
system curl, HTTPS only, and shows Downloading, Checking and Installing with a
percentage and Cancel. The finished `.part` file is checked where it lies and
admitted exactly like a chosen ZIP (size, SHA256, file fingerprint, live SFZ hash,
SFZ closure); it is deleted only once the bank is published. A dropped connection
keeps the partial file and the next press continues from it; Cancel, a refused
server answer or a changed archive discard it, and Cancel says so ("Download
cancelled. The partial download was removed."). After a successful install the
piano is switched on; MIDI stays the player's choice. Install from a file… stays
for offline use and accepts V6.2 or V6.2a. Any successful install, either way,
deletes every unfinished download and its records, for both admitted archives,
and removes the bank it replaced; nothing reads them again once a piano is
installed.

Focus follows the press: Download piano moves focus to Cancel, which is its own
Options row (arrows go Download piano, Cancel, Piano volume, Metronome volume);
a cancel or failure returns focus to the button that started it, and success to
Enable piano sound. Dragging the Piano volume track is heard at once
(`piano_audio_volume` sets the gain only) and saved once on release; the number
box and track move together. The Metronome volume row below it works the same
way (`cue_audio_volume`) for the metronome and practice cues, and is shown
whether or not the piano is installed; the built-in browser clicks follow it too.
It is saved as the optional `cueVolume` in the piano preferences; a missing value
means the default 70%.

Before downloading, a HEAD request reads the server's size and ETag (or
Last-Modified). A size other than the pinned 1.66 GB stops at once with "The
piano file online has changed. This viewer needs an update before it can
download the piano." (a chosen copy of that file would be refused too); curl
also gets `--max-filesize`. archive.org re-uploaded the item on 2026-10-13 and
2026-10-15, so the pinned SHA256 can stop matching without the size changing;
the ETag is stored beside the partial and a different one discards the partial
before resuming rather than splicing two uploads. A download of the right size
with the wrong SHA256 may be a resume gone wrong, so the first one is discarded
with "The downloaded piano was damaged… Press Download piano to download it
again."; the same ETag failing again is refused as changed online, and that ETag
is remembered so a repeat press is refused after the HEAD request alone, not
after another 1.7 GB. A resume the server
refuses (curl 33/36, HTTP 416) discards the partial and starts again once. Messages
never show curl or HTTP numbers.

Quitting the viewer mid-download stops curl and keeps the partial for the next
press; quitting while Checking or Installing keeps the `.part` too, and any
`pending-*` stage left by a quit is removed (a complete ZIP in it is moved back)
on the next download or install; only a download moves a complete ZIP back, so
a chosen ZIP never becomes a download. A bank folder that `current.json` does
not name (a kill between moving it in and writing the pointer) is removed on the
next start or press, with the lock held. Only one viewer works on the piano
folder at a time: it holds `piano.lock` (the lock alone decides; a virus scanner
holding the `.part` open is not mistaken for another viewer), and curl inherits
that lock, so a curl that outlives
its viewer still keeps every other press out instead of having its file appended
to. curl cannot outlive the viewer for long: on macOS it runs under a small shell
watcher in its own process group that kills it within a second of the viewer
disappearing (Cancel kills the group), and on Windows it runs in a Job Object
that kills it when the viewer's handle closes, however the viewer ends. The
Windows curl (`%SystemRoot%\System32\curl.exe`) gets only ASCII arguments: the
piano folder, which may contain a non-ASCII user name, is its working directory
and the output is a relative name, and `--disable` ignores personal curl
settings.

Earlier the button opened the author's page in a browser. On a Mac that meant a
Japanese academic page whose hosts are share sites, a 1.66 GB browser download,
Safari possibly unzipping it, then a second button and a file picker. Since the
author replaced V6.2 with V6.2a (2026-09-28) every reachable archive was refused,
so a new install could not succeed at all.

On this Linux host the production core with real curl against archive.org took
314 s to download (about 4.9 MB/s, including a forced interruption that resumed
from 225 MB), 4.9 s to check and about 30 s to extract and hash: 348 s in all.
Offline verification of the installed bank took 1.6 s at 15 MB peak memory. App
start and score open do no piano work.

## Delay and loudness

Live notes are applied at the start of each 256-frame sampler chunk inside the
output callback; the engine sounds a note in the block it arrives (the live SFZ
has no note-on delay; the recorded attack reaches half its peak 2–10 ms later).
The software delay is the wait for the next callback (0 to one buffer) plus the
buffer itself, before driver and device latency:

| Latency setting | macOS buffer at 48 kHz | macOS software delay | Windows queue |
| --- | --- | --- | --- |
| Lowest | device minimum (e.g. 15 frames) | under 1 ms | 1 period |
| Low | 256 frames | 5.3–10.7 ms | 2 periods |
| Medium | 512 frames | 10.7–21.3 ms | 3 periods |
| High | larger of default and 10 ms | from 10.7–21.3 ms | 4 periods |

Windows adds a wait of up to one period; with a 10 ms shared period the lowest
choice is roughly 10–20 ms of software delay. An earlier coarse loopback on a MOTU
interface at 44.1 kHz/512 frames measured 18.9–30.5 ms end to end.

Earlier the bank sounded at unity and the piano volume was a plain linear factor,
so at the default 70% a hard middle C peaked at only −17.2 dBFS and 100% added
3 dB. The piano gain is now applied to the sampler's float output inside the
output callback, then a peak limiter turns the piano down when needed, and the
metronome and practice cues are added last at their own level:

- The engine renders float, so a gain there has no rounding and no clipping
  before the limiter. Changing the bank (an SFZ `volume`) or the engine's own
  volume would need a reload or a re-render for each change, and could not see
  the cues; a drag must be heard at once.
- It is the one place where everything that reaches the device is summed, so the
  limiter there sees both the piano's peak and the cue's.
- It costs one multiply per sample. While it is limiting, the limiter costs about
  4.4 ns per stereo frame, about 0.02% of real time at 48 kHz (measured by the
  review on the earlier limiter, and again on this one on a Ryzen 7 250); it has
  no lookahead and adds no delay.

The piano gain is 2.25 × (setting / 70%)^1.94: 70% stays the default and is
+10.1 dB over the old default, 100% is +6 dB over 70%, 50% is −5.7 dB and 35% is
−11.7 dB. A saved setting is never quieter than before (the gain is at least the
old linear one), and 0% is silent. The Metronome volume uses the same curve
without the piano's 2.25, so its default leaves the click as before.

A piano volume saved by an earlier version above 70% is set to 70% once, the
first time this version reads the settings, so the louder curve cannot startle
at first launch; 70% is still about 7 dB louder than the old 100%. Volumes at or
under 70% keep their number. The settings then carry `levels: 2`, which marks a
volume chosen on this curve, so the change never repeats; the file is written
back as it was read with only the piano entry changed.

The limiter follows the piano's peak (stereo-linked) and the cue's peak
separately, each with an instant attack, a 30 ms hold and a 150 ms release. It
lowers only the piano, just enough that the held piano peak plus the held cue
peak stay under the −1 dBFS ceiling, so a fortissimo chord on the beat never
turns the click down. A soft knee begins at −3 dBFS (lower while a cue sounds,
to leave it room): above it a held peak maps to knee + span·x/(1 + x), whose
slope is 1 at the knee and which approaches the ceiling without reaching it.
With no lookahead, the frames of a rising peak still get more gain than the rest
of the note, but they are bent by that curve instead of being cut flat at the
ceiling. The piano passes unchanged while its held peak is under the knee; after
a loud peak, quieter frames are scaled too, during the hold and the release. The
final ±1.0 clamp stays as a backstop. The status reports how many frames the
limiter reduced and its deepest reduction.

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

The separate, manually started workflow `piano-playability-probe.yml` (not the
native build) runs the ignored test
`practice_audio::playability_macos::loopback_delay_and_loudness` on a GitHub
macOS 15 runner. It installs the BlackHole 2ch loopback, downloads and checks the
V6.2a archive, plays through the real CoreAudio host at each latency setting and
records the loopback input. It reports, per setting, note-on handed to the engine
to the first non-zero input sample, timed in CoreAudio host time, and the peak and
300 ms RMS per velocity, chord, pedalled chord and metronome click, with the
limiter's frames and deepest reduction. Since report version 2 the peak covers
both channels (the left-only peak is kept beside it), and loudness runs three
times: the old linear 70% (`before`), the default 70% and 100%. It saves no cache
and publishes only a JSON report; the whole run takes about 7 minutes.

Run 39871601774 (48 kHz, BlackHole reports zero device latency and safety offset;
16 notes per setting):

| Latency setting | Buffer | Note-on to loopback input |
| --- | --- | --- |
| Lowest | 15 frames (0.31 ms) | 0.26–0.54 ms, median 0.44 |
| Low | 256 frames (5.33 ms) | 3.78–9.08 ms, median 6.23 |
| Medium | 512 frames (10.67 ms) | 7.10–19.21 ms, median 14.60 |
| High | 512 frames (10.67 ms) | 7.20–21.26 ms, median 14.52 |

High equals Medium here because the device default is 512 frames. Loudness at
the device matches the offline rendering within about 4 dB (left channel only):
middle C at 70% peaks at −53.8, −45.7, −33.7, −26.1 and −20.9 dBFS for velocities
16, 32, 64, 96 and 127; a five-note chord at velocity 100 peaks at −14.9; 100%
adds 3.1 dB. The metronome click peaks at −16.1 dBFS at both volumes.

Run 39888612133 (application 654570a, piano gain 2.7, report version 2; peaks
over both channels in dBFS at the device):

| Sound | Before (old 70%) | Now, default 70% | Now, 100% |
| --- | --- | --- | --- |
| Middle C, velocity 127 | −17.2 | −5.5 | −1.0 (limited 1.5 dB) |
| Middle C, velocity 96 | −22.1 | −10.3 | −4.3 |
| Middle C, velocity 64 | −29.0 | −17.3 | −11.4 |
| Middle C, velocity 32 | −39.9 | −28.2 | −22.2 |
| Middle C, velocity 16 | −47.9 | −36.2 | −30.1 |
| Five-note chord, velocity 100 | −13.3 | −1.6 (not limited) | −1.0 (limited 5.5 dB) |
| Pedalled two-hand chord, ten notes at 120 then 127 | −5.8 | −1.0 (limited 7.8 dB, 0.74 s) | −1.0 (limited 13.5 dB) |
| Metronome click | −16.1 | −16.1 | −10.1 |

C2 and C6 at velocity 127 peak at −6.3 and −7.0 dBFS at the default. At the
default the metronome click sits near a mezzo-forte note, under a forte one.

| Latency setting | Note-on to loopback input |
| --- | --- |
| Lowest | 0.21–0.58 ms, median 0.44 |
| Low | 3.47–17.71 ms, median 6.20 (one note at 17.71; the rest at most 9.63) |
| Medium | 6.97–18.44 ms, median 11.76 |
| High | 8.47–20.80 ms, median 13.48 |

The delays match run 39871601774 within the runner's scatter; the limiter cannot
move the first sound, since it only scales samples.

Run 39895851435 (application faac45f, piano gain 2.25, knee at −3 dBFS, report
version 3; peaks over both channels in dBFS at the device; "Before" is the old
linear 70% through the new limiter):

| Sound | Before (old 70%) | Default 70% | 100% |
| --- | --- | --- | --- |
| Middle C, velocity 127 | −17.2 | −7.1 (not limited) | −2.0 (limited 0.9 dB, 0.14 s) |
| Middle C, velocity 96 | −22.1 | −11.9 | −5.9 |
| Middle C, velocity 64 | −29.0 | −18.8 | −12.8 |
| Middle C, velocity 32 | −39.9 | −29.8 | −23.8 |
| Middle C, velocity 16 | −47.9 | −37.7 | −31.7 |
| Five-note chord, velocity 100 | −13.3 | −3.1 (not limited) | −1.4 (limited 4.3 dB, 0.27 s) |
| Pedalled two-hand chord, ten notes at 120 then 127 | −6.1 | −1.3 (limited 6.4 dB, 0.80 s of 1.6 s) | −1.1 (limited 11.7 dB) |
| Metronome click | −16.1 | −16.1 | −10.1 |
| Click under a pedalled ten-note chord at 127 | +0.1 dB | +0.2 dB | +0.5 dB |

The last row is the click's level under the chord relative to the same click
alone (0 dB: its own level), found by least squares against the lone recording;
the piano alone leaks −28 dB into that estimate, so the figures agree with 0 dB
within it. C2 and C6 at velocity 127 peak at −7.9 and −8.6 dBFS at the default.

| Latency setting | Note-on to loopback input |
| --- | --- |
| Lowest | 0.30–8.07 ms, median 0.45 (one note at 8.07, one at 1.34; the rest at most 0.59) |
| Low | 3.41–9.96 ms, median 6.66 |
| Medium | 8.48–18.76 ms, median 13.77 |
| High | 7.07–18.01 ms, median 13.82 |

The delays match the earlier runs within the runner's scatter.

The loopback has no converters, so a real interface or built-in speakers add their
own reported device latency and safety offset, which this run cannot measure, and
the keyboard's USB MIDI and the room are not counted. CI has no speakers.

These checks establish source/stream behavior. Final package launch, physical
MIDI, audible quality, pedal response, sound-to-ear latency and the timing of
scheduled notes on a real output need their separate native and human acceptance
evidence. A scheduled instant is when the frame leaves the mixer; output latency
after that is not included.
