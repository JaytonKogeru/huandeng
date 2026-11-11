"""Remove the white page from the official RCSB assembly image for the ink cover.

The ribbon is not redrawn or recoloured. Each pixel is un-matted from the white
background and kept as RGBA; the source pixels and the full assembly view remain
available in rcsb-1bna-assembly.jpeg and rcsb-1bna-plate.png.
"""
from pathlib import Path

import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
source = Image.open(HERE / "rcsb-1bna-assembly.jpeg").convert("RGB")
pixels = np.asarray(source).astype(np.float32)
minimum = pixels.min(axis=2)
alpha = np.clip((255.0 - minimum) / 225.0, 0.0, 1.0) ** 0.85
safe = np.maximum(alpha[..., None], 1e-3)
colour = np.clip((pixels - (1.0 - alpha[..., None]) * 255.0) / safe, 0, 255)
rgba = np.dstack([colour, alpha * 255.0]).astype(np.uint8)
cutout = Image.fromarray(rgba, "RGBA")
cutout.save(HERE / "rcsb-1bna-cover-cutout.png")
print(HERE / "rcsb-1bna-cover-cutout.png")
