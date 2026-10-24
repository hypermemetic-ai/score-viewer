# Metronome waveform continuity

An armed repeat previously evaluated every click sample from the callback's estimated playback timestamp. A change in that estimate between buffers could skip or repeat part of the decaying sine waveform. Integer-microsecond rounding also perturbed its sample spacing. Initial count-in already advanced by emitted frames and did not have this behavior.

The private `Cue` now captures the fractional offset of the first eligible presented sample from the admitted count origin. Subsequent armed samples use that offset plus emitted frames divided by the actual output rate. The same `Metronome::at_time` computes the waveform. Frequency, decay, gain, accents, pulse grid and source duration remain unchanged.

Callback estimates still control the existing handoff deadline, source ownership, submission horizon and completion checks. Receipt origin, cancellation, retirement, sampler mixing, channel routing, format conversion, queue policy and device settings are unchanged. No allocation or reclamation is added to the render callback. Each replacement cue and rebuilt mixer has a fresh sample cursor.

## Source evidence

The retained baseline is Viewer `d8a59afe4da15f0c1a5680423c73d37f35d36c14`, with ISO `7205da0d6b62a4a023eda5f2f5d66bdec4fa6493`. A private harness imports the actual production Mixer, cue, metronome, pulse-grid and repeat modules. It compares contiguous PCM with ordinary callback estimates and alternating 250 microsecond disturbances after the first handoff.

At 44.1 kHz and 512-frame blocks, the baseline armed cue differs by up to 0.07176356 in normalized sample amplitude, with RMS error 0.01275625. Initial count-in PCM is identical under the same disturbance. The waveform does not clip: its observed peak is below 0.157. The repaired armed PCM is identical between disturbed and undisturbed callback estimates. Private raw float PCM and 16-bit WAV witnesses retain both results.

The native pure suite passes 65 controls, including the prior 61 controls and four new waveform/lifecycle controls:

- Every armed sample matches a continuous sample-index reference for V2 and V3 clocks, common rates and the admitted 8–384 kHz rate limits, variable and one-frame blocks, and a fractional first handoff offset.
- Float, signed 16/24/32-bit conversion and mono/stereo/eight-channel routing preserve identical emitted PCM under timestamp disturbances.
- Cancellation, invalidation, fresh count-in, mixer destruction/reset and new-rate reconstruction retain no previous waveform phase. Actual timestamp completion still refuses samples independently of the PCM cursor.
- Render fills allocate and deallocate no Rust storage. Existing future-owner, missed-boundary, cancellation, retirement, high-water, MIDI and sampler controls remain enabled.

Three previous musical waveform tests moved the callback clock over unrendered audio. They now emit contiguous PCM. Their independent analytic checks retain the original frequencies, amplitudes and decay for two complete compound-meter count bars, the exact source entry, pickup exit phase and successive repeat origins. The old timestamp-based sampling fails the new continuity regression.

## Acceptance limits

This establishes a reproducible source defect and its software correction. It does not establish that the defect caused the reported listening problem. Synthetic callback disturbances do not measure device underruns, DAC output, speaker latency or audible quality. No installed application, output endpoint, driver, timbre or volume was changed. Actual platform packages and device/listening acceptance remain separate delivery gates.
