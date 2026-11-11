"""Independent acquisition for the deepseek-zh introduction, 2026-11-11.

Downloads the 1BNA coordinates and a professional structure image from public
sources, recomputes the paired C1'-C1' distances, and renders this project's own
distance chart with matplotlib. Records URL, HTTP status, UTC time and SHA-256
for every retrieved or produced file in acquisition.json.
"""

import csv
import hashlib
import json
import math
import os
import sys
import urllib.error
import urllib.request
from datetime import datetime, timezone

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
UA = "huandeng-introduction-deepseek-zh/1.0 (independent acquisition; research deck)"

PDB_URL = "https://files.rcsb.org/download/1BNA.pdb"
PDBE_CANDIDATES = [
    "https://www.ebi.ac.uk/pdbe/static/entry/1bna_deposited_chain_front_image-800x800.png",
    "https://www.ebi.ac.uk/pdbe/static/entry/1bna_updated_chain_front_image-800x800.png",
    "https://www.ebi.ac.uk/pdbe/static/entry/1bna_deposited_chain_side_image-800x800.png",
]

records = []


def sha256(path):
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def retrieve(url, target):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    started = datetime.now(timezone.utc).isoformat()
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            status = resp.status
            ctype = resp.headers.get("Content-Type", "")
            payload = resp.read()
    except urllib.error.HTTPError as exc:
        records.append({"url": url, "startedAt": started, "httpStatus": exc.code,
                        "error": "HTTPError", "target": None})
        return False
    except Exception as exc:  # noqa: BLE001 - record the concrete failure
        records.append({"url": url, "startedAt": started, "error": repr(exc),
                        "target": None})
        return False
    with open(target, "wb") as fh:
        fh.write(payload)
    records.append({
        "url": url,
        "startedAt": started,
        "finishedAt": datetime.now(timezone.utc).isoformat(),
        "httpStatus": status,
        "contentType": ctype,
        "method": "GET (urllib.request, python 3.14)",
        "target": os.path.relpath(target, HERE).replace("\\", "/"),
        "bytes": len(payload),
        "sha256": sha256(target),
    })
    return True


pdb_path = os.path.join(HERE, "1BNA-retrieved-2026-11-11.pdb")
if not retrieve(PDB_URL, pdb_path):
    sys.exit("coordinate download failed")

structure_path = None
for url in PDBE_CANDIDATES:
    target = os.path.join(HERE, os.path.basename(url))
    if retrieve(url, target):
        if structure_path is None:
            structure_path = target
        break

# ---- parse coordinates -------------------------------------------------------
residues = {"A": {}, "B": {}}
with open(pdb_path, "r", encoding="utf-8", errors="replace") as fh:
    for line in fh:
        if not line.startswith(("ATOM  ", "HETATM")):
            continue
        name = line[12:16].strip()
        chain = line[21].strip()
        resseq = int(line[22:26])
        x, y, z = float(line[30:38]), float(line[38:46]), float(line[46:54])
        if name == "C1'":
            residues.setdefault(chain, {})[resseq] = (
                x, y, z, line[17:20].strip())

if len(residues.get("A", {})) != 12 or len(residues.get("B", {})) != 12:
    sys.exit(f"unexpected chain lengths: {[len(v) for v in residues.values()]}")

BASE = {"DA": "A", "DC": "C", "DG": "G", "DT": "T"}
rows = []
for idx, resid in enumerate(sorted(residues["A"]), start=1):
    partner = 25 - idx  # chain B runs 13-24; pair A1 with B24 (antiparallel)
    ax, ay, az, aname = residues["A"][resid]
    bx, by, bz, bname = residues["B"][partner]
    label = f"{BASE.get(aname, aname)}-{BASE.get(bname, bname)}"
    rows.append((idx, resid, partner,
                 math.dist((ax, ay, az), (bx, by, bz)), label))

csv_path = os.path.join(HERE, "paired-c1-distances-recomputed-2026-11-11.csv")
with open(csv_path, "w", newline="", encoding="utf-8") as fh:
    writer = csv.writer(fh)
    writer.writerow(["position", "chain_a_residue", "chain_b_residue", "base_pair",
                     "distance_angstrom"])
    for idx, resid, partner, dist, label in rows:
        writer.writerow([idx, resid, partner, label, f"{dist:.2f}"])

values = np.array([r[3] for r in rows])
np.save(os.path.join(HERE, "values.npy"), values)

# ---- own distance chart ------------------------------------------------------
plt.rcParams.update({
    "font.family": ["Microsoft YaHei", "DejaVu Sans"],
    "axes.edgecolor": "#7C877C",
    "axes.linewidth": 0.9,
    "text.color": "#1D2A22",
    "axes.labelcolor": "#364339",
    "xtick.color": "#364339",
    "ytick.color": "#364339",
})

fig, ax = plt.subplots(figsize=(7.1, 3.35), dpi=300)
positions = [r[0] for r in rows]
FLOOR = 10.0
ax.vlines(positions, FLOOR, values, color="#C3CFC2", linewidth=6.2, zorder=1)
ax.scatter(positions, values, s=150, color="#2F6B5F", edgecolor="#FFFFFF",
           linewidth=1.6, zorder=3)
lo = int(np.argmin(values))
hi = int(np.argmax(values))
ax.annotate(f"{values[lo]:.2f}", (positions[lo], values[lo]),
            textcoords="offset points", xytext=(0, 17), ha="center",
            fontsize=12.5, color="#8A4B33", weight="bold")
ax.annotate(f"{values[hi]:.2f}", (positions[hi], values[hi]),
            textcoords="offset points", xytext=(0, 17), ha="center",
            fontsize=12.5, color="#8A4B33", weight="bold")

ax.set_xlim(0.45, 12.55)
ax.set_ylim(FLOOR, 11.15)
ax.set_xticks(positions)
ax.set_xticklabels([f"{r[0]}\n{r[4]}" for r in rows], fontsize=11.4, linespacing=1.35)
ax.set_yticks([10.0, 10.2, 10.4, 10.6, 10.8, 11.0])
ax.tick_params(axis="y", labelsize=11.4)
ax.set_xlabel("配对位置（链 A 升序 / 链 B 降序）", fontsize=12.2, labelpad=9)
ax.set_ylabel("C1′–C1′ 距离 (Å)", fontsize=12.2, labelpad=9)
ax.grid(axis="y", color="#E1E7DE", linewidth=0.8)
ax.set_axisbelow(True)
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
ax.yaxis.set_major_formatter(matplotlib.ticker.FormatStrFormatter("%.1f"))
fig.subplots_adjust(left=0.115, right=0.985, top=0.965, bottom=0.245)
plot_path = os.path.join(HERE, "paired-c1-distances-deepseek-zh-2026-11-11.png")
fig.savefig(plot_path, facecolor="#FFFFFF")
plt.close(fig)

# ---- record ------------------------------------------------------------------
out = {
    "project": "deepseek-zh",
    "purpose": "Independent active artwork for the 2026-11-11 revision of the "
               "Chinese HUANDENG introduction",
    "acquiredAt": datetime.now(timezone.utc).isoformat(),
    "tool": f"Python {sys.version.split()[0]}, matplotlib {matplotlib.__version__}, "
            f"numpy {np.__version__}",
    "retrievals": records,
    "derived": [
        {
            "path": os.path.basename(csv_path),
            "method": "parsed C1' ATOM records from the retrieved 1BNA coordinate "
                      "file and computed Euclidean A/B distances",
            "bytes": os.path.getsize(csv_path),
            "sha256": sha256(csv_path),
        },
        {
            "path": os.path.basename(plot_path),
            "method": "matplotlib chart drawn from the recomputed distances "
                      "(script acquire.py in this folder)",
            "bytes": os.path.getsize(plot_path),
            "sha256": sha256(plot_path),
        },
    ],
    "values": [{"position": r[0], "distance": round(r[3], 2)} for r in rows],
    "previousSharedPlotSha256": "d5576a93749be3608a7127b9a45d7d92e62fa9f0258043a13835ac7c1d971e19",
    "note": "The previous shared plot and this project's 2026-11-10 batch remain "
            "untouched historical files. This folder is the current acquisition.",
}

with open(os.path.join(HERE, "acquisition.json"), "w", encoding="utf-8") as fh:
    json.dump(out, fh, ensure_ascii=False, indent=2)
    fh.write("\n")

print(json.dumps({"records": records, "plot": plot_path,
                  "csv": csv_path, "structure": structure_path,
                  "values": [round(v, 2) for v in values.tolist()]},
                 ensure_ascii=False, indent=2))
