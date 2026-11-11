"""Derive presentation crops from the freshly retrieved PDBe 1BNA entry image.

The PDBe PNG uses transparency; this script measures the alpha bounds, composites
onto white, crops the whitespace and the PDBe orientation glyph, and records the
exact source hash, crop box and rotation for every derived file.
"""

import hashlib
import json
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(HERE, "1bna_deposited_chain_front_image-800x800.png")


def sha256(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


raw = Image.open(SRC)
print("mode", raw.mode, "size", raw.size)
rgba = raw.convert("RGBA")
w, h = rgba.size
alpha = rgba.getchannel("A")
abox = alpha.getbbox()
print("alpha bbox", abox)

# The PDBe image carries a small orientation glyph in the lower-left corner;
# exclude that region from the molecule bounds.
px = rgba.load()
minx, miny, maxx, maxy = w, h, -1, -1
for y in range(0, h):
    for x in range(0, w):
        if px[x, y][3] > 12 and not (x < 150 and y > 600):
            minx, maxx = min(minx, x), max(maxx, x)
            miny, maxy = min(miny, y), max(maxy, y)
print("molecule bbox", (minx, miny, maxx, maxy))

pad = 18
box = (max(0, minx - pad), max(0, miny - pad),
       min(w, maxx + pad), min(h, maxy + pad))

white = Image.new("RGBA", rgba.size, (255, 255, 255, 255))
flat = Image.alpha_composite(white, rgba).convert("RGB")
crop = flat.crop(box)
vertical = crop.rotate(90, expand=True)

land = os.path.join(HERE, "1bna-pdbe-front-crop.png")
vert = os.path.join(HERE, "1bna-pdbe-vertical.png")
crop.save(land)
vertical.save(vert)

record = {
    "source": os.path.basename(SRC),
    "sourceSha256": sha256(SRC),
    "sourceSize": [w, h],
    "sourceMode": raw.mode,
    "sourceUrl": "https://www.ebi.ac.uk/pdbe/static/entry/"
                 "1bna_deposited_chain_front_image-800x800.png",
    "alphaBoundsPx": list(abox),
    "moleculeBoundsPx": [minx, miny, maxx, maxy],
    "cropBoxPx": list(box),
    "rotationDegrees": 90,
    "note": "Transparent background composited on white; whitespace and the PDBe "
            "orientation glyph cropped; molecule pixels unchanged apart from a 90 "
            "degree rotation for portrait placement. No resampling.",
    "derived": [
        {"path": os.path.basename(land), "size": list(crop.size),
         "sha256": sha256(land)},
        {"path": os.path.basename(vert), "size": list(vertical.size),
         "sha256": sha256(vert)},
    ],
}
with open(os.path.join(HERE, "structure-crop.json"), "w", encoding="utf-8") as fh:
    json.dump(record, fh, ensure_ascii=False, indent=2)
    fh.write("\n")
print(json.dumps(record, ensure_ascii=False, indent=2))
