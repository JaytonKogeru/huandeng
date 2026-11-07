import base64
import hashlib
import io
import json
import pathlib
import subprocess
import zipfile
root = pathlib.Path(__file__).resolve().parents[1]
tracked = subprocess.check_output(["git", "-C", str(root), "diff", "--name-only", "-z"], text=True).split("\0")
untracked = subprocess.check_output(["git", "-C", str(root), "ls-files", "--others", "--exclude-standard", "-z"], text=True).split("\0")
files = sorted({name for name in tracked + untracked if name})
baseline = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()
manifest = {"baseline": baseline, "files": {}, "before": {}}
buffer = io.BytesIO()
with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as bundle:
    for name in files:
        file = root / name
        if not file.is_file():
            raise RuntimeError("A deletion needs explicit handling: " + name)
        data = file.read_bytes()
        manifest["files"][name] = hashlib.sha256(data).hexdigest()
        previous = subprocess.run(["git", "-C", str(root), "show", baseline + ":" + name], capture_output=True)
        manifest["before"][name] = hashlib.sha256(previous.stdout).hexdigest() if previous.returncode == 0 else None
        bundle.writestr(name, data)
    bundle.writestr("huandeng-transfer-manifest.json", json.dumps(manifest))
data = buffer.getvalue()
print(json.dumps({"files": len(files), "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest(), "base64": base64.b64encode(data).decode()}))
