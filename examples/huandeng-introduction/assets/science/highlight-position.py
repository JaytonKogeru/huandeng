from pathlib import Path
import numpy as np
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
from mpl_toolkits.mplot3d.art3d import Line3DCollection
ROOT=Path(__file__).resolve().parent
atoms=[]
for line in (ROOT/"1BNA.pdb").read_text().splitlines():
    if line[:6].strip()=="ATOM" and line[21] in "AB" and line[16] in " A":
        atoms.append((line[21],int(line[22:26]),line[12:16].strip().replace("*","'"),[float(line[30:38]),float(line[38:46]),float(line[46:54])]))
xyz=np.array([a[3] for a in atoms]); _,_,vt=np.linalg.svd(xyz-xyz.mean(0),full_matrices=False)
coords=((xyz-xyz.mean(0))@vt.T)[:,[1,2,0]]
segments={c:[] for c in "AB"}
for i,a in enumerate(atoms):
    for j in range(i+1,len(atoms)):
        b=atoms[j]
        if a[0]!=b[0] or abs(a[1]-b[1])>1: continue
        d=np.linalg.norm(xyz[i]-xyz[j])
        if .6<d<(2 if "P" in (a[2],b[2]) else 1.85): segments[a[0]].append([coords[i],coords[j]])
fig=plt.figure(figsize=(5.2,7.3),dpi=300,facecolor="none"); ax=fig.add_subplot(111,projection="3d",proj_type="ortho")
for c,col in {"A":"#356f68","B":"#c48758"}.items():
    ax.add_collection3d(Line3DCollection(segments[c],colors=col,linewidths=1.5,alpha=.86))
ids=[i for i,a in enumerate(atoms) if (a[0],a[1],a[2]) in [("A",7,"C1'"),("B",18,"C1'")]]
assert len(ids)==2
ax.plot(*coords[ids].T,color="#a64f38",lw=3,ls="--",zorder=30)
ax.scatter(*coords[ids].T,c="#a64f38",s=44,depthshade=False,zorder=40)
ax.set_xlim(-13,13); ax.set_ylim(-13,13); ax.set_zlim(-20,20); ax.set_box_aspect((26,26,40)); ax.view_init(elev=10,azim=-62)
ax.set_axis_off(); fig.subplots_adjust(0,0,1,1)
fig.savefig(ROOT/"dna-duplex-position7.png",transparent=True,bbox_inches="tight",pad_inches=.02)
print("Rendered actual C1′ endpoints: A7 / B18; dashed segment is geometric distance.")
