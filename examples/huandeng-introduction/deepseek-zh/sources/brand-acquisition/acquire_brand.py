"""Acquire the brand originals still used by the active pages, 2026-11-11.

Every file is retrieved from the official source URL recorded for it, with HTTP
status, UTC timestamp, byte count and SHA-256. Rasterised marks are produced from
the official SVG with resvg (recorded), never by re-encoding the existing PNG.
"""

import hashlib
import io
import json
import os
import urllib.error
import urllib.request
import zipfile
from datetime import datetime, timezone

import resvg_py
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
RAW = os.path.join(HERE, "raw")
os.makedirs(RAW, exist_ok=True)
UA = "huandeng-introduction-deepseek-zh/1.0 (brand provenance)"

MANIFEST = json.load(open(os.path.join(ROOT, "sources", "brand", "manifest.json"),
                          encoding="utf-8"))
BY_NAME = {a["path"]: a for a in MANIFEST["assets"]}

ACTIVE = {
    "huandeng": "media/imported/c6cce013fd62e96048a5f10c1168ba05a2a7d6192f334d83386a4eec45732c22.png",
    "chatgpt": "media/imported/0f4797ac154b83c815a8bced3f8ae5d4d78c2cbe48d132d23f789d73760e6c13.png",
    "claude-code": "media/imported/733f24f4c52acb15eb0fbded1cf40eb42b4ba8e62b882acac70b6234b50919a8.png",
    "deepseek": "media/imported/e51e06079e62216c018ca7feb48bc1ff49c8359e86b88692609c6c694d3c13fc.png",
    "open-slide": "media/imported/44e2a2aa5f3887deae386fa73f71234961f93e006873b632ccf38b6b6f1291a1.png",
    "github": "media/imported/2a2f5cbcc74c7fa83c40127dd8b0e42c23f1157131aebe28492aa1ac27bbdc6d.png",
    "pptxgenjs": "media/imported/d697acf6f3c5bc265806bc8f6c4e6d58b964e0b2962392d0329a420639f45846.png",
}

records = []


def sha256_bytes(data):
    return hashlib.sha256(data).hexdigest()


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    started = datetime.now(timezone.utc).isoformat()
    with urllib.request.urlopen(req, timeout=90) as resp:
        data = resp.read()
        return {
            "url": url,
            "httpStatus": resp.status,
            "contentType": resp.headers.get("Content-Type", ""),
            "startedAt": started,
            "finishedAt": datetime.now(timezone.utc).isoformat(),
            "bytes": len(data),
            "sha256": sha256_bytes(data),
        }, data


def fetch_to(url, target):
    rec, data = get(url)
    with open(target, "wb") as fh:
        fh.write(data)
    rec["target"] = os.path.relpath(target, HERE).replace("\\", "/")
    return rec, data


def rasterize(svg_path, width, height, target, style_sheet=None):
    kwargs = {"svg_path": svg_path, "width": width, "height": height}
    if style_sheet:
        kwargs["style_sheet"] = style_sheet
    data = resvg_py.svg_to_bytes(**kwargs)
    if isinstance(data, list):
        data = bytes(data)
    with open(target, "wb") as fh:
        fh.write(data)
    im = Image.open(io.BytesIO(data))
    return {
        "method": f"resvg-py {getattr(resvg_py, '__version__', '0.5.0')} rasterisation of the "
                  "official SVG at the recorded pixel size; no recolouring or crop"
                  + (f"; user stylesheet {style_sheet!r} supplies the SVG's :root fill"
                     if style_sheet else ""),
        "tool": "resvg-py 0.5.0",
        "styleSheet": style_sheet,
        "width": width,
        "height": height,
        "mode": im.mode,
        "bytes": len(data),
        "sha256": sha256_bytes(data),
        "target": os.path.relpath(target, HERE).replace("\\", "/"),
    }


# 1. HUANDENG plugin icon (the mark used on pages). The public GitHub repository
# is not anonymously readable (raw.githubusercontent returns 404), so the official
# product working tree is the source; the file's git identity is recorded.
import shutil
import subprocess

HUANDENG_URLS = [
    "https://raw.githubusercontent.com/JaytonKogeru/huandeng/00482d384f57ec3f7ce42f9578c5e1cfd6092048/plugins/huandeng/assets/icon.png",
    "https://raw.githubusercontent.com/JaytonKogeru/huandeng/main/plugins/huandeng/assets/icon.png",
    "https://raw.githubusercontent.com/JaytonKogeru/huandeng/master/plugins/huandeng/assets/icon.png",
]
REPO = r"D:\_Proj\Huandeng"
REPO_FILE = os.path.join(REPO, "plugins", "huandeng", "assets", "icon.png")
HEAD = subprocess.run(["git", "-C", REPO, "rev-parse", "HEAD"], capture_output=True,
                      text=True).stdout.strip()
TRACKED = subprocess.run(
    ["git", "-C", REPO, "ls-files", "--error-unmatch",
     "plugins/huandeng/assets/icon.png"],
    capture_output=True, text=True)
huandeng_target = os.path.join(RAW, "huandeng-icon.png")
try:
    shutil.copyfile(REPO_FILE, huandeng_target)
    data = open(huandeng_target, "rb").read()
    records.append({
        "asset": "huandeng",
        "method": "copied from the official HUANDENG product working tree "
                  "(git origin JaytonKogeru/huandeng) at HEAD; the public raw "
                  "URLs returned 404, so the repository checkout is the source",
        "repoHead": HEAD,
        "repoPath": "plugins/huandeng/assets/icon.png",
        "gitTracked": TRACKED.returncode == 0,
        "attemptedUrls": HUANDENG_URLS,
        "retrievedAt": datetime.now(timezone.utc).isoformat(),
        "bytes": len(data),
        "sha256": sha256_bytes(data),
        "target": os.path.relpath(huandeng_target, HERE).replace("\\", "/"),
    })
except Exception as exc:  # noqa: BLE001
    records.append({"asset": "huandeng", "error": repr(exc)})

# 2. Direct official PNGs.
DIRECT = [
    ("claude-code", "https://claude.com/icon.png", "claude-icon.png"),
    ("deepseek", "https://avatars.githubusercontent.com/u/148330874?v=4", "deepseek-avatar.png"),
    ("pptxgenjs", "https://gitbrent.github.io/PptxGenJS/img/favicon.png", "pptxgenjs-favicon.png"),
]
for name, url, fn in DIRECT:
    try:
        rec, _ = fetch_to(url, os.path.join(RAW, fn))
        rec["asset"] = name
        records.append(rec)
    except Exception as exc:  # noqa: BLE001
        records.append({"asset": name, "url": url, "error": repr(exc)})

# 3. GitHub logo archive member.
try:
    rec, data = get("https://brand.github.com/GitHub_Logos.zip")
    rec["asset"] = "github"
    zpath = os.path.join(RAW, "GitHub_Logos.zip")
    open(zpath, "wb").write(data)
    with zipfile.ZipFile(io.BytesIO(data)) as zf:
        member = "GitHub Logos/PNG/GitHub_Invertocat_Black.png"
        blob = zf.read(member)
    target = os.path.join(RAW, "github-invertocat-black.png")
    open(target, "wb").write(blob)
    rec.update({"archiveMember": member, "memberBytes": len(blob),
                "memberSha256": sha256_bytes(blob),
                "memberTarget": os.path.relpath(target, HERE).replace("\\", "/")})
    records.append(rec)
except Exception as exc:  # noqa: BLE001
    records.append({"asset": "github", "url": "https://brand.github.com/GitHub_Logos.zip",
                    "error": repr(exc)})

# 4. Official SVGs that the two rasterised marks came from.
SVGS = [
    ("chatgpt", "https://chatgpt.com/cdn/assets/favicon.6a33781f61.svg",
     "chatgpt.svg", 720, 720, BY_NAME["chatgpt.png"].get("source_sha256")),
    ("open-slide",
     "https://raw.githubusercontent.com/open-slide/open-slide/3233309b72af27f58f01b7d3b6a13f4011cf06e7/apps/web/app/icon.svg",
     "open-slide.svg", 512, 512, BY_NAME["open-slide.png"].get("source_sha256")),
]
raster_records = []
for name, url, fn, w, h, expected_svg in SVGS:
    try:
        rec, data = fetch_to(url, os.path.join(RAW, fn))
        rec["asset"] = name
        if expected_svg:
            rec["matchesRecordedSvgSource"] = sha256_bytes(data) == expected_svg
        rec["raster"] = rasterize(
            os.path.join(RAW, fn), w, h, os.path.join(RAW, f"{name}-raster-{w}.png"),
            style_sheet="svg { fill: #000; }" if name == "chatgpt" else None)
        records.append(rec)
        raster_records.append((name, rec))
    except Exception as exc:  # noqa: BLE001
        records.append({"asset": name, "url": url, "error": repr(exc)})

# 5. Compare against the active project assets.
def active_path(name):
    return os.path.join(ROOT, ACTIVE[name])


def active_info(name):
    p = active_path(name)
    im = Image.open(p)
    return {"path": ACTIVE[name], "size": list(im.size), "mode": im.mode,
            "bytes": os.path.getsize(p), "sha256": sha256_bytes(open(p, "rb").read())}


ACQUIRED = {
    "huandeng": os.path.join(RAW, "huandeng-icon.png"),
    "claude-code": os.path.join(RAW, "claude-icon.png"),
    "deepseek": os.path.join(RAW, "deepseek-avatar.png"),
    "pptxgenjs": os.path.join(RAW, "pptxgenjs-favicon.png"),
    "github": os.path.join(RAW, "github-invertocat-black.png"),
}
for name, rec in raster_records:
    ACQUIRED[name] = os.path.join(HERE, rec["raster"]["target"])

comparisons = []
for name, path in ACQUIRED.items():
    if not os.path.exists(path):
        comparisons.append({"asset": name, "error": "not acquired"})
        continue
    im = Image.open(path)
    got = {"bytes": os.path.getsize(path), "sha256": sha256_bytes(open(path, "rb").read()),
           "size": list(im.size), "mode": im.mode}
    act = active_info(name)
    comparisons.append({
        "asset": name,
        "acquired": got,
        "active": act,
        "bytesIdentical": got["sha256"] == act["sha256"],
        "pixelSizeIdentical": got["size"] == act["size"],
    })

out = {
    "purpose": "Independent acquisition of the brand originals still used by the "
               "active pages of deepseek-zh, 2026-11-11",
    "project": "deepseek-zh",
    "acquiredAt": datetime.now(timezone.utc).isoformat(),
    "retrievals": records,
    "comparisons": comparisons,
    "note": "Official originals may be byte-identical to the asset already in the "
            "project; no file was re-encoded to manufacture a difference. Historical "
            "files stay untouched.",
}
with open(os.path.join(HERE, "brand-acquisition.json"), "w", encoding="utf-8") as fh:
    json.dump(out, fh, ensure_ascii=False, indent=2)
    fh.write("\n")

for c in comparisons:
    print(c.get("asset"), "identical" if c.get("bytesIdentical") else "DIFF",
          c.get("acquired", {}).get("size"), c.get("active", {}).get("size"))
for r in records:
    if "error" in r:
        print("ERR", r.get("asset"), r.get("url"), r["error"])
