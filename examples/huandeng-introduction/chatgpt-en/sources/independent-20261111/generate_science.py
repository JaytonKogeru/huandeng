from pathlib import Path
import urllib.request, json, hashlib, csv
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib.collections import LineCollection
from matplotlib import font_manager
HERE = Path(__file__).resolve().parent
url = "https://files.rcsb.org/download/1BNA.pdb"
raw = urllib.request.urlopen(url, timeout=45).read()
(HERE / "1BNA.pdb").write_bytes(raw)
atoms, c1 = [], {}
for line in raw.decode().splitlines():
    if line[:6].strip() != "ATOM": continue
    chain, residue, name = line[21], int(line[22:26]), line[12:16].strip()
    xyz = np.array([float(line[30:38]), float(line[38:46]), float(line[46:54])])
    atoms.append((chain, residue, name, xyz))
    if name in ("C1'", "C1*"): c1[(chain, residue)] = xyz
pairs = [(i, 25-i) for i in range(1, 13)]
dist = np.array([np.linalg.norm(c1[("A", a)] - c1[("B", b)]) for a,b in pairs])
with (HERE / "paired-c1-distances.csv").open("w", newline="", encoding="utf-8") as f:
    w=csv.writer(f); w.writerow(["pair","chain_A_residue","chain_B_residue","c1_distance_angstrom"])
    for i,((a,b),d) in enumerate(zip(pairs,dist),1): w.writerow([i,a,b,f"{d:.6f}"])
plt.rcParams.update({"font.family":"DejaVu Sans","font.size":11,"axes.spines.top":False,"axes.spines.right":False,"axes.labelcolor":"#26282B","text.color":"#26282B","xtick.color":"#45484C","ytick.color":"#45484C","savefig.facecolor":"white","svg.fonttype":"none"})
for lang in ("en","zh"):
    if lang == "zh":
        candidates=[f for f in font_manager.fontManager.ttflist if f.name in ("Microsoft YaHei","Noto Sans SC","SimHei")]
        if candidates: plt.rcParams["font.family"] = candidates[0].name
    else: plt.rcParams["font.family"]="DejaVu Sans"
    fig, ax=plt.subplots(figsize=(8.2,3.6))
    ax.plot(np.arange(1,13),dist,color="#3B607E",lw=1.5,marker="o",markersize=4.5,markerfacecolor="white",markeredgewidth=1.25)
    ax.set(xlim=(0.6,12.4),ylim=(10,11.05),xticks=range(1,13),yticks=np.arange(10,11.01,.25))
    ax.set_xlabel("Base-pair position" if lang=="en" else "碱基对位置",labelpad=10)
    ax.set_ylabel("C1′–C1′ distance (Å)" if lang=="en" else "C1′–C1′ 距离 (Å)",labelpad=10)
    ax.grid(axis="y",color="#E6E7E8",lw=.65);ax.set_axisbelow(True)
    for side in ("bottom","left"): ax.spines[side].set_color("#7B7E82");ax.spines[side].set_linewidth(.8)
    ax.tick_params(length=3,pad=5);fig.subplots_adjust(left=.13,bottom=.23,right=.98,top=.95)
    fig.savefig(HERE/f"c1-distances-{lang}.png",dpi=240);fig.savefig(HERE/f"c1-distances-{lang}.svg");plt.close(fig)
xyz=np.array([a[3] for a in atoms]);center=xyz.mean(axis=0)
_,_,axes=np.linalg.svd(xyz-center,full_matrices=False)
proj=(xyz-center) @ axes.T;xy=np.column_stack((proj[:,1],proj[:,0]))
fig,ax=plt.subplots(figsize=(3.0,5.0))
for chain,color in (("A","#263B4B"),("B","#879BA9")):
    ix=[i for i,a in enumerate(atoms) if a[0]==chain];segments=[]
    for j,i in enumerate(ix):
        for k in ix[j+1:]:
            d=np.linalg.norm(xyz[i]-xyz[k])
            if .7<d<1.86: segments.append([xy[i],xy[k]])
    ax.add_collection(LineCollection(segments,colors=color,linewidths=.8,alpha=.9));ax.scatter(xy[ix,0],xy[ix,1],s=2.0,c=color)
for a,b in pairs:
    pa=(c1[("A",a)]-center)@axes.T;pb=(c1[("B",b)]-center)@axes.T
    ax.plot([pa[1],pb[1]],[pa[0],pb[0]],color="#B2B9BF",lw=.6,zorder=0)
ax.autoscale();ax.set_aspect("equal");ax.axis("off");fig.tight_layout(pad=.1)
fig.savefig(HERE/"1bna-projected-bonds.png",dpi=300);fig.savefig(HERE/"1bna-projected-bonds.svg");plt.close(fig)
record={"author":"ChatGPT 6 Astra / root","acquisition":"Fresh independent HTTPS download; no prepared source or figure copied from other authors or common assets","url":url,"source_page":"https://www.rcsb.org/structure/1BNA","sha256":hashlib.sha256(raw).hexdigest(),"method":"Euclidean C1' distances A1..A12 versus antiparallel B24..B13. One static crystallographic structure; no replicate uncertainty. Structure picture uses principal-axis projection and same-chain 0.7–1.86 Å visual bond-distance connections, not chemical bond orders.","bilingual_reuse":"Independent input acquired once by root for its own English and Chinese editions","citation":"Drew et al. (1981), PNAS 78, 2179–2183. PDB 1BNA."}
(HERE/"ACQUISITION.json").write_text(json.dumps(record,ensure_ascii=False,indent=2),encoding="utf-8")
print(json.dumps({"source_bytes":len(raw),"pairs":len(dist),"min":float(dist.min()),"max":float(dist.max())}))
