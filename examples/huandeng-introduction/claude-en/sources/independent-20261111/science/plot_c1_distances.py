"""Figure for slide AVNM: paired C1'-C1' distances in PDB 1BNA.

Reads paired-c1-distances.csv (written by generate_1bna.py) and draws the figure at
its true size on the 960 x 540 pt slide (604 x 304 pt), so the type sizes match the slide.
Outputs PNG (300 dpi, transparent), SVG and PDF next to this script, or to argv[1].
"""
import csv
import os
import sys

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = sys.argv[1] if len(sys.argv) > 1 else HERE

INK, MUTED, AXIS, GRID, TEAL, OCHRE = "#1C2321", "#56615D", "#9AA5A0", "#E1E6E3", "#2E6B5E", "#B9783F"
plt.rcParams.update({
    "font.family": "Arial",
    "font.size": 12,
    "axes.edgecolor": AXIS,
    "axes.labelcolor": MUTED,
    "xtick.color": MUTED,
    "ytick.color": MUTED,
    "svg.fonttype": "none",
    "pdf.fonttype": 42,
})

rows = list(csv.DictReader(open(os.path.join(HERE, "paired-c1-distances.csv"), encoding="utf-8")))
pos = [int(r["position"]) for r in rows]
dist = [float(r["distance_A"]) for r in rows]
pairs = [r["pair"] for r in rows]
lo = min(range(len(dist)), key=dist.__getitem__)
hi = max(range(len(dist)), key=dist.__getitem__)

fig, ax = plt.subplots(figsize=(604 / 72, 304 / 72))
fig.subplots_adjust(left=0.105, right=0.985, top=0.95, bottom=0.25)
ax.set_ylim(10.0, 11.0)
ax.set_yticks([10.0, 10.2, 10.4, 10.6, 10.8, 11.0])
ax.yaxis.set_major_formatter(matplotlib.ticker.FormatStrFormatter("%.1f"))
ax.set_xlim(0.4, 12.6)
ax.set_xticks(pos)
ax.set_xticklabels([f"{p}\n{b}" for p, b in zip(pos, pairs)], linespacing=1.35)
ax.grid(axis="y", color=GRID, linewidth=0.8)
ax.set_axisbelow(True)
for s in ("top", "right"):
    ax.spines[s].set_visible(False)
ax.tick_params(axis="x", length=0, pad=6)
ax.tick_params(axis="y", length=3, width=0.8)

ax.plot(pos, dist, color=TEAL, linewidth=1.6, zorder=2)
ax.scatter(pos, dist, s=34, facecolor="white", edgecolor=TEAL, linewidth=1.5, zorder=3)
ax.scatter([pos[lo], pos[hi]], [dist[lo], dist[hi]], s=40, color=TEAL, zorder=4)
ax.annotate(f"{dist[lo]:.2f} Å, shortest", (pos[lo], dist[lo]), xytext=(0, -17),
            textcoords="offset points", ha="center", va="top", fontsize=11.5, color=INK)
ax.annotate(f"longest, {dist[hi]:.2f} Å", (pos[hi], dist[hi]), xytext=(-9, 3),
            textcoords="offset points", ha="right", va="bottom", fontsize=11.5, color=INK)

ax.set_ylabel("C1′–C1′ distance (Å)", fontsize=13, labelpad=8)
ax.set_xlabel("Paired position and base pair (chain A 1–12 with chain B 24–13)", fontsize=12.5, labelpad=8)

for ext in ("png", "svg", "pdf"):
    fig.savefig(os.path.join(OUT, f"c1-distances-1bna.{ext}"), dpi=300, transparent=True)
print("saved", OUT, "shortest", pos[lo], dist[lo], "longest", pos[hi], dist[hi])
