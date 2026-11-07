import base64
import hashlib
import io
import json
import pathlib
import subprocess
import sys
import zipfile
root = pathlib.Path(__file__).resolve().parents[1]
archive = base64.b64decode(pathlib.Path(sys.argv[1]).read_text(encoding="utf-8-sig"))
if hashlib.sha256(archive).hexdigest() != sys.argv[2]:
    raise SystemExit("Transfer checksum mismatch")
baseline = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()
receipt = root / ".verification" / "last-import-manifest.json"
prior = json.loads(receipt.read_text()) if receipt.exists() else {"files": {}}
with zipfile.ZipFile(io.BytesIO(archive)) as bundle:
    manifest = json.loads(bundle.read("huandeng-transfer-manifest.json"))
    if baseline != manifest["baseline"]:
        raise SystemExit("Unexpected destination repository")
    for name, digest in manifest["files"].items():
        destination = (root / name).resolve()
        if not destination.is_relative_to(root) or ".git" in pathlib.PurePosixPath(name).parts:
            raise SystemExit("Unsafe transfer path")
        if hashlib.sha256(bundle.read(name)).hexdigest() != digest:
            raise SystemExit("File checksum mismatch: " + name)
        actual = hashlib.sha256(destination.read_bytes()).hexdigest() if destination.exists() else None
        allowed = {manifest.get("before", {}).get(name), digest, prior.get("files", {}).get(name)}
        if actual not in allowed:
            raise SystemExit("Destination contains independent changes: " + name)
    for name in manifest["files"]:
        destination = root / name
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_bytes(bundle.read(name))
    verified = all(hashlib.sha256((root / name).read_bytes()).hexdigest() == digest for name, digest in manifest["files"].items())
receipt.parent.mkdir(parents=True, exist_ok=True)
receipt.write_text(json.dumps(manifest), encoding="utf-8")
print(json.dumps({"files": len(manifest["files"]), "verified": verified}))
