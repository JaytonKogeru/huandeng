"""Pad the official RCSB assembly image for the light figure plates.

The deposited-image pixels are unchanged; only a white margin is added so the
ribbon does not touch the frame on the cream pages.
"""
from pathlib import Path

from PIL import Image

HERE = Path(__file__).resolve().parent
source = Image.open(HERE / "rcsb-1bna-assembly.jpeg").convert("RGB")
plate = Image.new("RGB", (600, 600), (255, 255, 255))
plate.paste(source, (50, 50))
plate.save(HERE / "rcsb-1bna-plate.png")
print(HERE / "rcsb-1bna-plate.png")
