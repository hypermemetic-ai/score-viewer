"""Import pinned regular source bytes from an already verified local checkout.

This tool is a development import, never a native-build/download step.
"""
import hashlib
import io
import json
from pathlib import Path
import subprocess
import sys
import tarfile

PIN = "f3ac7c0ae830104ae3bc8979dc2ed9fff939a926"
source = Path(sys.argv[1]).resolve()
destination = Path(__file__).resolve().parents[1] / "vendor" / "sfizz"
excluded = {".github", "tests", "test", "testing", "testdata", "test_data", "fuzzing", "benchmarks", "benchmark", "doc", "docs", "examples", "example", "demos", "devtools"}
manifest = {"schema": 1, "engine": {"repository": "https://github.com/dusk-audio/dusk-fizz", "revision": PIN}, "components": [], "files": {}, "excluded": [], "licenses": []}

def revision(repo):
    return subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=repo, text=True).strip()

def copy_tree(repo, prefix, commit):
    manifest["components"].append({"path": prefix or ".", "revision": commit})
    process = subprocess.Popen(["git", "archive", "--format=tar", commit], cwd=repo, stdout=subprocess.PIPE)
    with tarfile.open(fileobj=process.stdout, mode="r|") as archive:
        for entry in archive:
            path = Path(entry.name)
            target = (Path(prefix) / path).as_posix()
            if not entry.isfile():
                if entry.issym() or entry.islnk():
                    raise RuntimeError(f"Unexpected source link: {target}")
                continue
            if excluded.intersection(path.parts) or path.name.endswith(("_test.cc", "_test.cpp", "_test.c", "_benchmark.cc")) or entry.size == 0:
                manifest["excluded"].append(target)
                continue
            if entry.size > 5_000_000:
                raise RuntimeError(f"Unexpected oversized source: {target}")
            data = archive.extractfile(entry).read()
            full = destination / target
            full.parent.mkdir(parents=True, exist_ok=True)
            full.write_bytes(data)
            manifest["files"][target] = {"bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}
            if path.name.upper().startswith(("LICENSE", "COPYING", "COPYRIGHT", "NOTICE")):
                manifest["licenses"].append(target)
    if process.wait() != 0:
        raise RuntimeError("git archive failed")

if revision(source) != PIN:
    raise RuntimeError("Engine source pin mismatch")
copy_tree(source, "", PIN)
submodules = ["external/abseil-cpp", "external/filesystem", "external/simde", "external/st_audiofile/thirdparty/dr_libs", "external/st_audiofile/thirdparty/libaiff", "external/st_audiofile/thirdparty/wavpack"]
for path in submodules:
    expected = subprocess.check_output(["git", "ls-tree", PIN, path], cwd=source, text=True).split()[2]
    if revision(source / path) != expected:
        raise RuntimeError(f"Submodule pin mismatch: {path}")
    copy_tree(source / path, path, expected)
expected_files = set(manifest["files"]) | {"provenance.json"}
for full in destination.rglob("*"):
    if full.is_file() and full.relative_to(destination).as_posix() not in expected_files:
        full.unlink()
(destination / "provenance.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
print(json.dumps({"files": len(manifest["files"]), "bytes": sum(p["bytes"] for p in manifest["files"].values()), "licenses": manifest["licenses"]}))
