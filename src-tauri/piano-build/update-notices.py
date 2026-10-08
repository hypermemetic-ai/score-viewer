"""Copy exact linked-component notices; used for development, never downloading."""
import hashlib
import json
from pathlib import Path

native = Path(__file__).resolve().parents[1]
vendor = native / "vendor" / "sfizz"
notice = native / "piano-notices"
provenance = json.loads((vendor / "provenance.json").read_text())
# These optional command-line/XMMS components are not linked by piano_bundle.
unlinked = {"external/cxxopts/LICENSE", "external/fmidi/LICENSE.md", "external/st_audiofile/thirdparty/wavpack/xmms/COPYING"}
paths = [p for p in provenance["licenses"] if p not in unlinked] + ["provenance.json"]
manifest = {"schema": 1, "name": "Dusk-Fizz/sfizz", "version": "1.2.3", "revision": provenance["engine"]["revision"], "files": {}}
for relative in sorted(paths):
    data = (vendor / relative).read_bytes()
    target = notice / relative
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(data)
    manifest["files"][relative] = {"size": len(data), "sha256": hashlib.sha256(data).hexdigest()}
modifications = "BUILD-MODIFICATIONS.md"
source_path = "piano-build/WINDOWS-UTF8-COMPATIBILITY.md"
data = (native / source_path).read_bytes()
(notice / modifications).write_bytes(data)
manifest["files"][modifications] = {"size": len(data), "sha256": hashlib.sha256(data).hexdigest(), "sourcePath": source_path}
(notice / "manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
(native / ".gitattributes").write_text("# Preserve exact upstream engine and notice bytes on every checkout.\nvendor/sfizz/** -text\npiano-notices/** -text\n")
config = native / "tauri.macos.conf.json"
value = json.loads(config.read_text())
resources = value["bundle"]["resources"]
for key in list(resources):
    if key.startswith("piano-notices/"):
        del resources[key]
for relative in ["manifest.json"] + sorted(paths + [modifications]):
    resources["piano-notices/" + relative] = "notices/piano/" + relative
config.write_text(json.dumps(value, indent=2) + "\n")
print(json.dumps({"notices": len(manifest["files"]), "bytes": sum(p["size"] for p in manifest["files"].values())}))
