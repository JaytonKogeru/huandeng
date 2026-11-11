"""Independent 1BNA analysis for claude-en (2026-11-11).
Reads the RCSB-deposited PDB, computes paired C1'-C1' distances (A1-B24 ... A12-B13),
and draws a side-view stick model of the two strands (heavy atoms, MODEL 1, altloc A/blank)."""
import sys, json, csv, math
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt

pdb, out = sys.argv[1], sys.argv[2]
atoms = []
for line in open(pdb):
    if line.startswith("ENDMDL"): break
    if line.startswith(("ATOM", "HETATM")):
        alt = line[16]
        if alt not in (" ", "A"): continue
        res = line[17:20].strip()
        if res == "HOH": continue
        atoms.append(dict(name=line[12:16].strip(), res=res, chain=line[21], seq=int(line[22:26]),
                          xyz=np.array([float(line[30:38]), float(line[38:46]), float(line[46:54])]),
                          el=line[76:78].strip() or line[12:14].strip()[0]))
def c1(chain, seq):
    return next(a["xyz"] for a in atoms if a["chain"] == chain and a["seq"] == seq and a["name"] in ("C1'", "C1*"))
def base(chain, seq):
    return next(a["res"] for a in atoms if a["chain"] == chain and a["seq"] == seq).replace("D", "")
rows = []
for i in range(1, 13):
    j = 25 - i
    d = float(np.linalg.norm(c1("A", i) - c1("B", j)))
    rows.append(dict(position=i, chainA=i, chainB=j, pair=f"{base('A', i)}–{base('B', j)}", distance_A=round(d, 4)))
with open(out + "/paired-c1-distances.csv", "w", newline="", encoding="utf-8") as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0])); w.writeheader(); w.writerows(rows)
json.dump(rows, open(out + "/measurements.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
for r in rows: print(r)

# Side view: helix axis = principal axis of the C1' atoms, drawn vertically.
dna = [a for a in atoms if a["chain"] in "AB"]
X = np.array([a["xyz"] for a in dna]); ctr = X.mean(0)
c1s = np.array([a["xyz"] for a in dna if a["name"] in ("C1'", "C1*")]) - ctr
_, _, vt = np.linalg.svd(c1s); axis = vt[0]
u = np.cross(axis, [0, 0, 1.0]); u /= np.linalg.norm(u); v = np.cross(axis, u)
P = np.c_[(X - ctr) @ u, (X - ctr) @ axis]
fig, ax = plt.subplots(figsize=(5, 5), dpi=400)
col = {"A": "#3D7468", "B": "#B9783F"}
for i, a in enumerate(dna):
    for k in range(i + 1, len(dna)):
        b = dna[k]
        if a["chain"] != b["chain"] or abs(a["seq"] - b["seq"]) > 1: continue
        if np.linalg.norm(a["xyz"] - b["xyz"]) < 1.9:
            ax.plot(P[[i, k], 0], P[[i, k], 1], color=col[a["chain"]], lw=0.8, solid_capstyle="round")
ax.set_aspect("equal"); ax.axis("off")
fig.savefig(out + "/dna-1bna-side.png", transparent=True, bbox_inches="tight", pad_inches=0.04)
print("saved")
