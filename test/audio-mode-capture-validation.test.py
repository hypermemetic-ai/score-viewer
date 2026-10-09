import importlib.util
import pathlib
import unittest
import tempfile
import json
import array
import struct

path = pathlib.Path(__file__).parents[1] / "scripts/validate-audio-mode-capture.py"
spec = importlib.util.spec_from_file_location("audio_mode_capture", path)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class PacketAdmission(unittest.TestCase):
    def packets(self):
        return [{"startSample": i * 882, "frames": 441, "flags": 0,
                 "devicePosition": i * 441, "qpc100ns": 1_000_000 + i * 100_000}
                for i in range(8)]

    def admit(self, packets):
        return module.validate_packets(packets, 3 * 882, 6 * 882,
                                       1_300_000, 1_600_000, 8 * 882)

    def test_clean_packets_admit_fine_gate(self):
        self.assertTrue(self.admit(self.packets())["fineTimestampGatePassed"])

    def test_invalid_qpc_cannot_hide_sample_overlap_flags(self):
        for flag in [1, 4, 5]:
            packets = self.packets()
            packets[4]["qpc100ns"] = 90_000_000
            packets[4]["flags"] = flag
            with self.assertRaises(AssertionError):
                self.admit(packets)

    def test_predecessor_flags_refuse(self):
        packets = self.packets()
        packets[1]["flags"] = 4
        with self.assertRaises(AssertionError):
            self.admit(packets)

    def test_equal_or_backward_qpc_refuses(self):
        for delta in [0, -1]:
            packets = self.packets()
            packets[4]["qpc100ns"] = packets[3]["qpc100ns"] + delta
            with self.assertRaises(AssertionError):
                self.admit(packets)

    def test_fine_gate_does_not_relax_to_pass_coarse(self):
        packets = self.packets()
        packets[4]["qpc100ns"] += 1001
        result = self.admit(packets)
        self.assertFalse(result["fineTimestampGatePassed"])
        self.assertEqual(result["qpcDeltasOver100us"], 2)

    def test_sample_inventory_or_device_position_gap_refuses(self):
        for field in ["startSample", "devicePosition"]:
            packets = self.packets()
            packets[4][field] += 1
            with self.assertRaises(AssertionError):
                self.admit(packets)

    def test_uncovered_or_empty_window_refuses(self):
        with self.assertRaises(AssertionError):
            module.validate_packets([], 1, 100, 100, 200, 0)
        with self.assertRaises(AssertionError):
            module.validate_packets(self.packets(), 882, 8000, 1_100_000, 1_200_000, 7056)


class MatchedAdmission(unittest.TestCase):
    def test_empty_or_clipped_correlation_refuses(self):
        for source, captured in [([], []), ([1.0, 2.0], [1.0]), ([1.0], [1.0, 2.0])]:
            with self.assertRaises(AssertionError): module.correlation(source, captured)

    def write_pcm(self, path, samples):
        content = array.array("f", samples).tobytes()
        path.write_bytes(b"RIFF" + struct.pack("<I", 36 + len(content)) + b"WAVEfmt "
                         + struct.pack("<IHHIIHH", 16, 3, 2, 44100, 352800, 8, 32)
                         + b"data" + struct.pack("<I", len(content)) + content)

    def fixture(self, root):
        source, capture = root / "render", root / "capture"
        source.mkdir(); capture.mkdir()
        source_pcm = [0.0] * (44100 * 3 * 2)
        captured_pcm = [0.0] * (44100 * 4 * 2)
        sent, attacks = [], []
        for ms, key in [(400, 60), (747, 64), (1109, 67)]:
            frame = round(ms / 1000 * 44100)
            for offset in range(2205):
                value = 0.01 * (1 + offset % 17) / 17
                for channel in range(2):
                    source_pcm[(frame + offset) * 2 + channel] = value
                    captured_pcm[(frame + 882 + offset) * 2 + channel] = value
            sent.append({"key": key, "beforeQpc100ns": 1_000_000 + ms * 10_000,
                         "afterQpc100ns": 1_000_010 + ms * 10_000})
            attacks.append({"firstSourceFrame": frame})
        self.write_pcm(source / "source.wav", source_pcm)
        self.write_pcm(capture / "pure-capture.wav", captured_pcm)
        report = {"failure": None, "nonce": "a" * 32, "endpoint": module.OUT,
                  "sfzSha256": module.LIVE_SHA, "volume": 0.04,
                  "metadata": {"rate": 44100}, "mode": "shared", "sent": sent, "attacks": attacks}
        capture_report = {"failure": None, "nonce": "a" * 32, "endpoint": module.PURE,
                          "name": "Loopback", "driverFamily": "MOTU M Series",
                          "packets": [{"startSample": i * 882, "frames": 441, "flags": 0,
                                       "devicePosition": i * 441, "qpc100ns": 1_000_000 + i * 100_000}
                                      for i in range(400)]}
        (source / "render.json").write_text(json.dumps(report))
        (capture / "capture.json").write_text(json.dumps(capture_report))
        return source, capture, report, capture_report

    def test_complete_matched_signature_and_coarse_intervals(self):
        with tempfile.TemporaryDirectory() as temp:
            source, capture, _, _ = self.fixture(pathlib.Path(temp))
            result = module.admit(source, capture)
            self.assertEqual(len(result["attacks"]), 3)
            first = result["attacks"][0]
            self.assertAlmostEqual(first["correlation"], 1)
            self.assertTrue(first["timestampControls"]["fineTimestampGatePassed"])
            self.assertFalse(first["finePointAccepted"])
            self.assertGreater(first["enqueueToDigitalCaptureCoarseIntervalMs"][0], 19.9)

    def test_unrelated_nonce_refuses(self):
        with tempfile.TemporaryDirectory() as temp:
            source, capture, _, report = self.fixture(pathlib.Path(temp))
            report["nonce"] = "b" * 32
            (capture / "capture.json").write_text(json.dumps(report))
            with self.assertRaises(AssertionError): module.admit(source, capture)

    def test_flagged_signature_refuses(self):
        with tempfile.TemporaryDirectory() as temp:
            source, capture, _, report = self.fixture(pathlib.Path(temp))
            report["packets"][45]["flags"] = 4
            (capture / "capture.json").write_text(json.dumps(report))
            with self.assertRaises(AssertionError): module.admit(source, capture)


if __name__ == "__main__":
    unittest.main()
