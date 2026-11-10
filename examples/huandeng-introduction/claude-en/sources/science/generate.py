from pathlib import Path
import hashlib, json, math, csv, datetime, urllib.request
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Line3DCollection
ROOT = Path(__file__).resolve().parent
pdb = ROOT / "1BNA.pdb"
if not pdb.exists():
    with urllib.request.urlopen("https://files.rcsb.org/download/1BNA.pdb", timeout=40) as response:
        raw = response.read()
    if not raw.startswith(b"HEADER") or b"1BNA" not in raw[:100]:
        raise ValueError("Unexpected PDB response")
    pdb.write_bytes(raw)
atoms = []
for line in pdb.read_text().splitlines():
    if line[:6].strip() != "ATOM" or line[21] not in "AB" or line[16] not in " A": continue
    atoms.append(dict(chain=line[21], res=int(line[22:26]), base=line[17:20].strip(),
        atom=line[12:16].strip().replace("*", "'"), xyz=[float(line[30:38]),float(line[38:46]),float(line[46:54])]))
residues = {}
for atom in atoms: residues.setdefault((atom["chain"],atom["res"]), {})[atom["atom"]] = atom
a = sorted(k for k in residues if k[0]=="A")
b = sorted((k for k in residues if k[0]=="B"), reverse=True)
assert len(a)==len(b)==12
rows = []
for i,(ra,rb) in enumerate(zip(a,b),1):
    aa,bb = residues[ra]["C1'"],residues[rb]["C1'"]
    pair = aa["base"][-1]+bb["base"][-1]
    assert pair in ("AT","TA","GC","CG"), pair
    distance = float(np.linalg.norm(np.array(aa["xyz"])-bb["xyz"]))
    rows.append(dict(position=i, chain_a_residue=ra[1], chain_b_residue=rb[1],
                     base_pair=pair[0]+"-"+pair[1], paired_C1_distance_A=round(distance,4)))
with (ROOT/"paired-c1-distances.csv").open("w",newline="",encoding="utf-8") as f:
    out=csv.DictWriter(f,fieldnames=rows[0].keys()); out.writeheader(); out.writerows(rows)
(ROOT/"measurements.json").write_text(json.dumps(rows,indent=2)+"\n",encoding="utf-8")
xyz=np.array([x["xyz"] for x in atoms]); center=xyz.mean(axis=0)
_,_,vt=np.linalg.svd(xyz-center,full_matrices=False)
aligned=(xyz-center)@vt.T; coords=aligned[:,[1,2,0]]
colors={"A":"#356f68","B":"#c48758"}; segments={c:[] for c in colors}
for i,ai in enumerate(atoms):
    for j in range(i+1,len(atoms)):
        aj=atoms[j]
        if ai["chain"]!=aj["chain"] or abs(ai["res"]-aj["res"])>1: continue
        d=float(np.linalg.norm(xyz[i]-xyz[j]))
        threshold=2.0 if "P" in (ai["atom"],aj["atom"]) else 1.85
        if 0.6<d<threshold: segments[ai["chain"]].append([coords[i],coords[j]])
plt.rcParams.update({"font.family":"sans-serif","font.sans-serif":["Microsoft YaHei","Arial","DejaVu Sans"],"font.size":12})
for name,elev,azim,size in [("dna-duplex-side",10,-62,(5.2,7.3)),("dna-duplex-end",88,-62,(6,6))]:
    fig=plt.figure(figsize=size,dpi=300,facecolor="none")
    ax=fig.add_subplot(111,projection="3d",proj_type="ortho")
    for c in colors:
        ax.add_collection3d(Line3DCollection(segments[c],colors=colors[c],linewidths=1.5,alpha=.94))
        ids=[i for i,a0 in enumerate(atoms) if a0["chain"]==c and a0["atom"] in ("P","C1'")]
        ax.scatter(*coords[ids].T,c=colors[c],s=7,depthshade=False,edgecolors="none")
    ax.set_xlim(-13,13); ax.set_ylim(-13,13); ax.set_zlim(-20,20)
    ax.set_box_aspect((26,26,40)); ax.view_init(elev=elev,azim=azim)
    ax.set_axis_off(); fig.subplots_adjust(0,0,1,1)
    fig.savefig(ROOT/(name+".png"),transparent=True,bbox_inches="tight",pad_inches=.02)
    plt.close(fig)
x=[r["position"] for r in rows]; y=[r["paired_C1_distance_A"] for r in rows]
for lang in ("en","zh"):
    fig,ax=plt.subplots(figsize=(9,4.5),dpi=300)
    fig.patch.set_facecolor("#f7f5ef"); ax.set_facecolor("#f7f5ef")
    ax.plot(x,y,c="#356f68",lw=2,marker="o",ms=5.5,mec="#f7f5ef",mew=1)
    ax.set_xlim(.5,12.5); ax.set_xticks(x); ax.set_ylim(math.floor(min(y)*5)/5-.1,math.ceil(max(y)*5)/5+.1)
    ax.set_xlabel("Paired position" if lang=="en" else "配对位置",labelpad=10)
    ax.set_ylabel("C1′–C1′ distance (Å)" if lang=="en" else "C1′–C1′ 距离（Å）",labelpad=10)
    ax.spines[["top","right"]].set_visible(False)
    for s in ("left","bottom"): ax.spines[s].set_color("#9da7a2")
    ax.tick_params(colors="#3d4945",length=3)
    ax.grid(axis="y",color="#d9ded7",linewidth=.7); ax.set_axisbelow(True)
    fig.tight_layout(pad=1.2)
    for ext in ("png","svg"): fig.savefig(ROOT/("paired-c1-distances-"+lang+"."+ext),facecolor=fig.get_facecolor())
    plt.close(fig)
provenance={"identifier":"PDB 1BNA","record":"https://www.rcsb.org/structure/1BNA",
 "coordinateSource":"https://files.rcsb.org/download/1BNA.pdb","structureDOI":"https://doi.org/10.2210/pdb1BNA/pdb",
 "primaryPublication":"Drew et al. (1981), PNAS 78:2179–2183","publicationDOI":"https://doi.org/10.1073/pnas.78.4.2179",
 "downloadedAt":datetime.datetime.now(datetime.timezone.utc).isoformat(),
 "reportedMethod":"X-ray diffraction","reportedResolutionAngstrom":1.90,
 "atomsUsed":len(atoms),"residuesUsed":len(residues),"pairedPositions":12,
 "measurement":"Euclidean distance between C1′ atoms of chain A residues in ascending order and chain B residues in descending order.",
 "scope":"Twelve positions in one deposited structure; not independent replicates, an experiment, a performance benchmark, or hydrogen-bond distances.",
 "rendering":"Orthographic coordinate projection. Approximate covalent sticks are inferred by distance for visual context, not a bond-order annotation.",
 "chainColors":colors}
provenance["files"]=[{"path":p.name,"sha256":hashlib.sha256(p.read_bytes()).hexdigest(),"bytes":p.stat().st_size}
 for p in sorted(ROOT.iterdir()) if p.is_file() and p.name!="source.json"]
(ROOT/"source.json").write_text(json.dumps(provenance,indent=2,ensure_ascii=False)+"\n",encoding="utf-8")
print(json.dumps({"identifier":"PDB 1BNA","atomsUsed":len(atoms),"pairedPositions":12,"distanceRange":[min(y),max(y)],"files":[p.name for p in sorted(ROOT.iterdir())]},ensure_ascii=False))
