"""1BNA ladder view for the claude-zh introduction (Claude Code, 2026-11-11).

Independent of the shared example package: reads 1BNA.pdb downloaded by Claude Code from
https://files.rcsb.org/download/1BNA.pdb into this folder, and draws its own figure:
  * each strand's sugar-phosphate backbone as a smooth curve through its P / C4' atoms,
  * the twelve paired C1'-C1' segments (the quantity plotted on the BRHY slide) as rungs,
  * position 7 (shortest) and 12 (longest) emphasised.
Coordinates are projected orthographically onto the two largest principal axes of the
duplex, so the helix axis is vertical. Nothing is redrawn by hand.

Run: python structure.py   (Python 3, NumPy, Matplotlib)
Outputs: dna-ladder-1bna.png (transparent, 300 dpi) and .svg, plus structure-manifest.json
"""
from pathlib import Path
import os
PLAIN = os.environ.get("PLAIN") == "1"
STEM = "dna-ladder-1bna-plain" if PLAIN else "dna-ladder-1bna"
import hashlib
import json

import numpy as np
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.colors
plt.rcParams.update({"font.sans-serif": ["Microsoft YaHei", "DejaVu Sans"]})

HERE = Path(__file__).resolve().parent
PDB = HERE / "1BNA.pdb"
assert PDB.read_text()[:6] == "HEADER" and "1BNA" in PDB.read_text()[:80]

atoms = []
for line in PDB.read_text().splitlines():
    if line[:4] != "ATOM" or line[21] not in "AB" or line[16] not in " A":
        continue
    atoms.append({"chain": line[21], "res": int(line[22:26]), "base": line[17:20].strip()[-1],
                  "name": line[12:16].strip().replace("*", "'"),
                  "xyz": np.array([float(line[30:38]), float(line[38:46]), float(line[46:54])])})

xyz = np.array([a["xyz"] for a in atoms])
center = xyz.mean(axis=0)
_, _, vt = np.linalg.svd(xyz - center, full_matrices=False)
# principal axis 0 = helix axis -> vertical; axis 1 -> horizontal; rotate about the helix axis
# by a fixed angle so the minor/major grooves read clearly.
theta = np.deg2rad(35)
h = vt[1] * np.cos(theta) + vt[2] * np.sin(theta)
depth_axis = np.cross(vt[0], h)


def project(p):
    q = p - center
    return np.array([q @ h, q @ vt[0]]), q @ depth_axis


def atom(chain, res, name):
    for a in atoms:
        if a["chain"] == chain and a["res"] == res and a["name"] == name:
            return a
    return None


A_COL, B_COL, RUNG, EMPH = "#356F68", "#C48758", "#9AA39F", "#1C2321"
fig, ax = plt.subplots(figsize=((3.2 if PLAIN else 4.2), 5.2), dpi=300)
fig.patch.set_alpha(0)
ax.set_facecolor("none")


def smooth(points, n=12):
    pts = np.array(points)
    out = []
    for i in range(len(pts) - 1):
        p0 = pts[max(i - 1, 0)]; p1 = pts[i]; p2 = pts[i + 1]; p3 = pts[min(i + 2, len(pts) - 1)]
        for t in np.linspace(0, 1, n, endpoint=False):
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t
                              + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(pts[-1])
    return np.array(out)


segments = []  # (depth, kind, data)
for chain, color in (("A", A_COL), ("B", B_COL)):
    residues = sorted({a["res"] for a in atoms if a["chain"] == chain})
    trace = []
    for r in residues:
        for name in ("C4'",):
            a = atom(chain, r, name)
            if a is not None:
                trace.append(a["xyz"])
    curve3 = smooth(trace, 16)
    for i in range(0, len(curve3) - 1, 4):
        chunk = curve3[i:i + 5]
        pts = [project(c)[0] for c in chunk]
        depth = float(np.mean([project(c)[1] for c in chunk]))
        segments.append((depth, "backbone", (np.array(pts), None, color)))

pairs = []
for i, (ra, rb) in enumerate(zip(range(1, 13), range(24, 12, -1)), 1):
    ca, cb = atom("A", ra, "C1'"), atom("B", rb, "C1'")
    dist = float(np.linalg.norm(ca["xyz"] - cb["xyz"]))
    pairs.append((i, ra, rb, round(dist, 4)))
    p, d0 = project(ca["xyz"]); q, d1 = project(cb["xyz"])
    segments.append(((d0 + d1) / 2, "rung", (p, q, i)))

def mix(color, k, paper=(0.965, 0.965, 0.953)):
    c = np.array(matplotlib.colors.to_rgb(color))
    return tuple(c * k + np.array(paper) * (1 - k))


xs = [pt[0] for d, kd, dt in segments for pt in ((dt[0] if kd == "backbone" else [dt[0], dt[1]]))]
XR = max(xs) + 2.0
import csv as _csv
BASES = {}
for a in atoms:
    BASES[(a["chain"], a["res"])] = a["base"]
with (HERE / "paired-c1-distances-own.csv").open("w", newline="", encoding="utf-8") as f:
    w = _csv.writer(f)
    w.writerow(["position", "chain_a_residue", "chain_b_residue", "base_pair", "paired_C1_distance_A"])
    for i, ra, rb, d in pairs:
        w.writerow([i, ra, rb, BASES[("A", ra)] + "-" + BASES[("B", rb)], d])

dmin, dmax = min(s[0] for s in segments), max(s[0] for s in segments)
short = min(pairs, key=lambda x: x[3])[0]
long_ = max(pairs, key=lambda x: x[3])[0]
for depth, kind, data in sorted(segments, key=lambda s: s[0]):
    fade = 0.35 + 0.65 * (depth - dmin) / (dmax - dmin)  # nearer = stronger
    p, q, extra = data
    if kind == "backbone":
        col = mix(extra, fade)
        ax.plot(p[:, 0], p[:, 1], color=col, lw=4.6, solid_capstyle="round", solid_joinstyle="round", zorder=2 + fade)
    else:
        emph = extra in (short, long_)
        ax.plot([p[0], q[0]], [p[1], q[1]], color=EMPH if emph else mix(RUNG, fade), lw=2.4 if emph else 1.7,
                solid_capstyle="round", zorder=2 + fade)
        for end, col in ((p, A_COL), (q, B_COL)):
            ax.scatter([end[0]], [end[1]], s=10, color=mix(col, fade), zorder=3 + fade, edgecolors="none")
        if emph and not PLAIN:
            right = max(p[0], q[0])
            label = "第 %d 对" % extra
            ax.annotate(label, (right, (p[1] + q[1]) / 2), xytext=(XR, (p[1] + q[1]) / 2), ha="left", va="center",
                        fontsize=14, color=EMPH, fontweight="bold",
                        arrowprops=dict(arrowstyle="-", color="#7A8480", lw=0.6, shrinkA=1, shrinkB=3))

ax.set_aspect("equal")
ax.set_xlim(min(xs) - 1, (max(xs) + 1) if PLAIN else XR + 11)
ax.axis("off")
fig.tight_layout(pad=0.1)
for ext in ("png", "svg"):
    fig.savefig(HERE / f"{STEM}.{ext}", transparent=True)
plt.close(fig)

manifest = {
    "source": "https://files.rcsb.org/download/1BNA.pdb",
    "pdbSha256": hashlib.sha256(PDB.read_bytes()).hexdigest(),
    "atomsUsed": len(atoms),
    "pairs": [{"position": i, "chainA": a, "chainB": b, "c1_c1_A": d} for i, a, b, d in pairs],
    "emphasised": {"shortest": short, "longest": long_},
    "matplotlib": matplotlib.__version__,
    "outputs": {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(HERE.glob(f"{STEM}.*"))},
}
(HERE / f"{STEM}-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
print(json.dumps({"short": short, "long": long_, "atoms": len(atoms)}))
