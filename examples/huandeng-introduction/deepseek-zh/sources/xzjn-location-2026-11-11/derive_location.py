"""Derive the XZJN location pair from this round's full-Editor capture.

The detail crop is exactly the rectangle that is marked on the full-window image,
so the marker and the readable detail refer to the same pixels.
"""

import hashlib
import json
import os

from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
MEDIA = os.path.join(ROOT, "media", "imported")
CAPTURE = os.path.join(
    MEDIA, "d10c3052147bb33e50befdf57a56761d21da64229c465f2b1feb7e4beed3a1f3.png")
OUT_DIR = os.path.join(ROOT, "sources", "xzjn-location-2026-11-11")


def sha256(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


os.makedirs(OUT_DIR, exist_ok=True)
im = Image.open(CAPTURE).convert("RGB")
print("capture", im.size, sha256(CAPTURE))

box = (0, 1140, 560, 1512)
crop = im.crop(box)
out = os.path.join(OUT_DIR, "usedby-detail.png")
crop.save(out)
digest = sha256(out)
asset = os.path.join(MEDIA, digest + ".png")
if not os.path.exists(asset):
    crop.save(asset)

viewer = Image.open(CAPTURE).convert("RGB")
viewer.save(os.path.join(OUT_DIR, "editor-full.png"))

record = {
    "capture": "media/imported/d10c3052147bb33e50befdf57a56761d21da64229c465f2b1feb7e4beed3a1f3.png",
    "captureSha256": sha256(CAPTURE),
    "captureState": "Editor, page Z4XP, edit view, project sidebar, zh-CN, "
                    "1920x1080 viewport, 3840x2160 output, "
                    "captured 2026-11-11T14:05:39Z",
    "detailCrop": list(box),
    "detailSize": list(crop.size),
    "detailSha256": digest,
    "detailAsset": "media/imported/" + digest + ".png",
    "markerOnFullWindow": {
        "note": "same rectangle as the detail crop, mapped onto the on-slide "
                "full-window image bounds [470,52,330,186]",
        "scale": 330 / im.width,
        "bounds": [470, 52 + box[1] * 330 / im.width,
                   330 * (box[2] - box[0]) / im.width,
                   330 * (box[3] - box[1]) / im.width],
    },
    "note": "The detail is exactly the marked rectangle of the full window; no "
            "pixel change other than the crop.",
}
with open(os.path.join(OUT_DIR, "xzjn-location.json"), "w", encoding="utf-8") as fh:
    json.dump(record, fh, ensure_ascii=False, indent=2)
    fh.write("\n")
print(json.dumps(record, ensure_ascii=False, indent=2))
