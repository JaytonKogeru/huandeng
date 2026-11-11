# 1BNA slide figure (claude-zh, page BRHY)

`plot.py` draws `paired-c1-distances-slide-zh.png/.svg` with Matplotlib from `../paired-c1-distances.csv`, the twelve C1′–C1′ distances measured from the unchanged PDB 1BNA coordinates by `../generate.py`. The figure is sized for the slide frame (604 × 310 pt) so its type sizes are true slide points; the PNG is 300 dpi with a transparent background.

The slide shows this figure instead of a chart redrawn inside the slide. To change a value, label or style: edit the CSV or the script, run `python plot.py`, and replace the image on BRHY through the HUANDENG writer. `manifest.json` records the CSV hash, Matplotlib version, plotted values and output hashes.

Scope is unchanged from `../README.md`: twelve positions in one deposited structure — not replicates, not uncertainty, not hydrogen-bond lengths. The two highlighted points are simply the minimum (position 7, T–A) and maximum (position 12, G–C).

Created 2026-11-11 by Claude Code for the claude-zh edition after the author asked that data plots be made with professional plotting tools rather than inside the slides.
