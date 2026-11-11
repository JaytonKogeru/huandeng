"""Slide figure for the claude-zh introduction: paired C1'-C1' distances in PDB 1BNA.

Reads the measured values from ../own/paired-c1-distances-own.csv (computed by ../own/structure.py
from 1BNA coordinates Claude Code downloaded from RCSB) and draws a publication-style Matplotlib plot sized
for the 1BNA slide (BRHY). The values are plotted exactly as stored; nothing is redrawn
by hand in the slide.

Run:  python plot.py      (requires Python 3, Matplotlib, a CJK font such as Microsoft YaHei)
"""
from pathlib import Path
import csv
import hashlib
import json

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.ticker import MultipleLocator

HERE = Path(__file__).resolve().parent
CSV = HERE.parent / "own" / "paired-c1-distances-own.csv"
OUT = "paired-c1-distances-slide-zh"

rows = list(csv.DictReader(CSV.open(encoding="utf-8")))
x = [int(r["position"]) for r in rows]
y = [float(r["paired_C1_distance_A"]) for r in rows]
pairs = [r["base_pair"].replace("-", "–") for r in rows]
assert len(x) == 12

INK, MUTED, GRID, LINE = "#1C2321", "#56615D", "#DCE1DD", "#2E6B5E"
plt.rcParams.update({
    "font.family": "sans-serif",
    "font.sans-serif": ["Microsoft YaHei", "Noto Sans CJK SC", "DejaVu Sans"],
    "font.size": 11,
    "axes.unicode_minus": False,
    "svg.fonttype": "none",
})

# Sized for the slide frame (604 x 310 pt), so type sizes are true slide points.
fig, ax = plt.subplots(figsize=(604 / 72, 310 / 72), dpi=300)
fig.patch.set_alpha(0)
ax.set_facecolor("none")

ax.plot(x, y, color=LINE, lw=1.8, zorder=2)
ax.scatter(x, y, s=34, color="white", edgecolors=LINE, linewidths=1.6, zorder=3)

i_min, i_max = y.index(min(y)), y.index(max(y))
for i, dy, va in [(i_min, -0.07, "top"), (i_max, 0.06, "bottom")]:
    ax.scatter([x[i]], [y[i]], s=34, color=LINE, zorder=4)
    ax.annotate(f"{y[i]:.2f} Å", (x[i], y[i]), xytext=(x[i], y[i] + dy), ha="center", va=va,
                fontsize=10.5, color=INK, fontweight="bold")

ax.set_xlim(0.5, 12.5)
ax.set_ylim(10.0, 11.0)
ax.yaxis.set_major_locator(MultipleLocator(0.2))
ax.yaxis.set_minor_locator(MultipleLocator(0.1))
ax.set_xticks(x)
ax.set_xticklabels([f"{p}\n{bp}" for p, bp in zip(x, pairs)], linespacing=1.35)
ax.set_ylabel("C1′–C1′ 距离（Å）", color=INK, labelpad=8)
ax.set_xlabel("配对位置与碱基对（链 A 残基 1–12 对应链 B 残基 24–13）", color=MUTED, labelpad=8, fontsize=10.5)

for side in ("top", "right"):
    ax.spines[side].set_visible(False)
for side in ("left", "bottom"):
    ax.spines[side].set_color("#9DA7A2")
    ax.spines[side].set_linewidth(0.9)
ax.tick_params(colors=MUTED, length=3.5, width=0.9)
ax.tick_params(which="minor", length=2, width=0.7, colors="#9DA7A2")
ax.grid(axis="y", color=GRID, lw=0.7)
ax.set_axisbelow(True)

fig.tight_layout(pad=0.4)
for ext in ("png", "svg"):
    fig.savefig(HERE / f"{OUT}.{ext}", transparent=True)
plt.close(fig)

manifest = {
    "figure": OUT,
    "data": "../own/paired-c1-distances-own.csv",
    "dataSha256": hashlib.sha256(CSV.read_bytes()).hexdigest(),
    "matplotlib": matplotlib.__version__,
    "values": dict(zip(x, y)),
    "files": {p.name: hashlib.sha256(p.read_bytes()).hexdigest()
              for p in sorted(HERE.iterdir()) if p.suffix in (".png", ".svg", ".py")},
}
(HERE / "manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
print(json.dumps({"min": min(y), "max": max(y), "out": OUT}, ensure_ascii=False))
