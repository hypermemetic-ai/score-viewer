#!/usr/bin/env python3
"""Read-only admission of exact pure-MOTU digital-return evidence, never ear latency."""
import array
import json
import math
import pathlib
import struct
import sys

PURE = "{0.0.1.00000000}.{ab6d0c57-ec15-4272-8aa6-a0e28e38f9e3}"
OUT = "{0.0.0.00000000}.{246c67bf-6de3-48d2-8878-3a8813262c1d}"
LIVE_SHA = "6567611a435eb3503b5425f13c1092de4abec32fa237c6cf7f0467949ec729ee"


def pcm(path):
    data = path.read_bytes()
    assert data[:4] == b"RIFF" and data[8:12] == b"WAVE"
    cursor, format_data, samples = 12, None, None
    while cursor + 8 <= len(data):
        kind, length = struct.unpack_from("<4sI", data, cursor)
        body = data[cursor + 8:cursor + 8 + length]
        assert len(body) == length
        if kind == b"fmt ":
            tag, channels, rate, _, align, bits = struct.unpack_from("<HHIIHH", body)
            assert (tag, channels, align, bits) == (3, 2, 8, 32)
            format_data = rate, channels
        elif kind == b"data":
            samples = array.array("f")
            samples.frombytes(body)
            if sys.byteorder != "little":
                samples.byteswap()
        cursor += 8 + length + (length % 2)
    assert format_data == (44100, 2) and samples is not None
    assert len(samples) % 2 == 0 and all(math.isfinite(s) for s in samples)
    return samples


def validate_packets(packets, sample_start, sample_end, time_start, time_end, total):
    """Union of sample-index and QPC windows; predecessor belongs to admission."""
    selected = set()
    expected = 0
    for i, p in enumerate(packets):
        count = p["frames"] * 2
        assert p["frames"] > 0 and p["startSample"] == expected
        expected += count
        end = p["qpc100ns"] + p["frames"] * 10_000_000 / 44100
        if (p["startSample"] < sample_end and expected > sample_start) or (
            end >= time_start and p["qpc100ns"] <= time_end
        ):
            selected.add(i)
    assert expected == total and expected >= sample_end and selected
    assert min(selected) > 0, "Missing adjacent predecessor"
    selected.add(min(selected) - 1)
    fine_deltas = []
    for i in sorted(selected):
        p = packets[i]
        assert p["flags"] & 5 == 0, "Capture discontinuity or timestamp error"
        if i > 0:
            previous = packets[i - 1]
            assert previous["flags"] & 5 == 0, "Invalid predecessor"
            assert p["devicePosition"] == previous["devicePosition"] + previous["frames"]
            assert p["qpc100ns"] > previous["qpc100ns"], "Nonmonotonic QPC"
            delta = p["qpc100ns"] - previous["qpc100ns"]
            expected_delta = previous["frames"] * 10_000_000 / 44100
            fine_deltas.append(abs(delta - expected_delta))
    return {"selectedPacketRange": [min(selected), max(selected)],
            "fineTimestampGatePassed": all(delta <= 1000 for delta in fine_deltas),
            "qpcDeltasOver100us": sum(delta > 1000 for delta in fine_deltas),
            "maximumQpcDeltaError100ns": max(fine_deltas, default=0)}


def correlation(reference, captured):
    dot = a = b = 0.0
    for x, y in zip(reference, captured):
        dot += x * y
        a += x * x
        b += y * y
    assert a > 0 and b > 0
    return dot / math.sqrt(a * b)


def admit(render_dir, capture_dir):
    render = json.loads((render_dir / "render.json").read_text())
    capture = json.loads((capture_dir / "capture.json").read_text())
    assert render["failure"] is None and capture["failure"] is None
    assert render["nonce"] == capture["nonce"] and len(render["nonce"]) == 32
    assert capture["endpoint"] == PURE and capture["name"] == "Loopback"
    assert capture["driverFamily"] == "MOTU M Series"
    assert render["endpoint"] == OUT, "All modes must use the same output1–2"
    assert render["metadata"]["rate"] == 44100
    assert render["sfzSha256"] == LIVE_SHA and render["volume"] == 0.04
    assert len(render["sent"]) == len(render["attacks"]) == 3
    assert [note["key"] for note in render["sent"]] == [60, 64, 67]
    source, recorded = pcm(render_dir / "source.wav"), pcm(capture_dir / "pure-capture.wav")
    packets = capture["packets"]
    attacks = []
    for sent, attack in zip(render["sent"], render["attacks"]):
        before, after = sent["beforeQpc100ns"], sent["afterQpc100ns"]
        assert after >= before
        # Raw synth start may quantize to silence. Match actual submitted PCM.
        source_start = attack["firstSourceFrame"] * 2
        source_first = next(i for i in range(source_start, min(source_start + 2048, len(source)))
                            if abs(source[i]) > 1e-9)
        source_frame = source_first // 2
        lower = next(p["startSample"] for p in packets
                     if p["qpc100ns"] >= before - 100_000)
        upper = next(p["startSample"] for p in packets
                     if p["qpc100ns"] >= after + 2_000_000)
        candidate = next(i for i in range(lower, upper) if abs(recorded[i]) > 1e-9)
        candidate -= candidate % 2
        count = round(0.160 * 44100) * 2
        assert source_frame * 2 + count <= len(source) and candidate + count <= len(recorded)
        reference = source[source_frame * 2:source_frame * 2 + count]
        # Quantized leading samples can shift by at most a few frames. A fixed
        # bounded search is explicit; do not fit a new tolerance to failed data.
        choices = []
        for shift in range(-2, 3):
            start = candidate + shift * 2
            if start >= 0:
                choices.append((correlation(reference, recorded[start:start + count]), start))
        corr, onset = max(choices)
        assert corr >= 0.98, f"Signature mismatch {corr}"
        quiet_frames = round(0.050 * 44100)
        assert onset >= quiet_frames * 2
        quiet_start = onset - quiet_frames * 2
        quiet_peak = max(abs(s) for s in recorded[quiet_start:onset])
        source_quiet = max(abs(s) for s in source[max(0, source_frame * 2 - quiet_frames * 2):source_frame * 2])
        assert quiet_peak <= 1e-8 and source_quiet <= 1e-8, "No proven quiet baseline"
        onset_packet_index = next(i for i, p in enumerate(packets)
                                 if p["startSample"] <= onset < p["startSample"] + p["frames"] * 2)
        packet, next_packet = packets[onset_packet_index:onset_packet_index + 2]
        assert next_packet["qpc100ns"] > packet["qpc100ns"]
        validity = validate_packets(packets, quiet_start, onset + count,
                                    before - 500_000, next_packet["qpc100ns"] + 1_600_000,
                                    len(recorded))
        lower_ms = max(0, packet["qpc100ns"] - after - 1) / 10_000
        upper_ms = (next_packet["qpc100ns"] - before + 1) / 10_000
        assert upper_ms >= lower_ms >= 0
        attacks.append({"key": sent["key"], "correlation": corr, "quietPeak": quiet_peak,
                        "sourceFirstPackedFrame": source_frame, "captureOnsetSample": onset,
                        "enqueueToDigitalCaptureCoarseIntervalMs": [lower_ms, upper_ms],
                        "timestampControls": validity,
                        "finePointAccepted": False})
    assert len(attacks) == 3
    return {"version": 1, "mode": render["mode"], "nonce": render["nonce"], "attacks": attacks,
            "scope": "Same pure MOTU Out1–2 digital-return packet brackets; not DAC/ear/hardware MIDI",
            "fineTimingPolicy": "100µs unchanged; no interpolated point used for a route ranking"}


if __name__ == "__main__":
    assert len(sys.argv) == 3, "render-dir capture-dir"
    print(json.dumps(admit(pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])), indent=2))
