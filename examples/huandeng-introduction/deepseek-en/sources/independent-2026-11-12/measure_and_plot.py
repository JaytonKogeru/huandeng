"""Measure C1'--C1' separations in this edition's own 1BNA download and plot them.

The pairing follows the deposited duplex: chain A residues in ascending order
against chain B residues in descending order. One structure; twelve positions.
"""
from __future__ import annotations

import csv
import hashlib
import json
import math
from datetime import datetime, timezone
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
from Bio.PDB import PDBParser

HERE = Path(__file__).resolve().parent
PDB = HERE / "1BNA.pdb"
PLOT = HERE / "paired-c1-distances.png"

BASE = {"DA": "A", "DC": "C", "DG": "G", "DT": "T"}


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def load_c1() -> dict[tuple[str, int], tuple[float, float, float]]:
    parser = PDBParser(QUIET=True)
    structure = parser.get_structure("1BNA", str(PDB))
    model = next(structure.get_models())
    chains = list(model.get_chains())
    if len(chains) != 2:
        raise SystemExit(f"Expected two DNA chains, found {len(chains)}")
    atoms: dict[tuple[str, int], tuple[float, float, float]] = {}
    for chain in chains:
        for residue in chain.get_residues():
            if residue.get_resname().strip() not in BASE:
                continue
            if "C1'" not in residue:
                raise SystemExit(f"Missing C1' in {chain.id} {residue.id}")
            atoms[(chain.id, residue.id[1])] = tuple(float(v) for v in residue["C1'"].coord)
    return atoms


def main() -> None:
    atoms = load_c1()
    chain_ids = sorted({chain for chain, _ in atoms})
    a, b = chain_ids
    a_numbers = sorted(res for chain, res in atoms if chain == a)
    b_numbers = sorted((res for chain, res in atoms if chain == b), reverse=True)
    if len(a_numbers) != 12 or len(b_numbers) != 12:
        raise SystemExit(f"Expected 12 residues per chain, got {len(a_numbers)} and {len(b_numbers)}")

    rows = []
    for position, (ra, rb) in enumerate(zip(a_numbers, b_numbers), start=1):
        pa, pb = atoms[(a, ra)], atoms[(b, rb)]
        distance = math.dist(pa, pb)
        rows.append(
            {
                "position": position,
                "chain_a_residue": ra,
                "chain_b_residue": rb,
                "paired_C1_distance_A": round(distance, 4),
                "distance_A": distance,
            }
        )

    parser = PDBParser(QUIET=True)
    structure = parser.get_structure("1BNA", str(PDB))
    model = next(structure.get_models())
    names = {}
    for chain in model.get_chains():
        for residue in chain.get_residues():
            names[(chain.id, residue.id[1])] = BASE.get(residue.get_resname().strip(), "?")
    for row in rows:
        row["base_pair"] = f"{names[(a, row['chain_a_residue'])]}-{names[(b, row['chain_b_residue'])]}"

    values = [row["distance_A"] for row in rows]
    if not (10.1 < min(values) and max(values) < 11.0):
        raise SystemExit("Measured range is outside the plotted axis")
    if abs(rows[6]["distance_A"] - 10.2329) > 0.001:
        raise SystemExit("Position 7 does not reproduce the deposited geometry")

    with (HERE / "measurements.csv").open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "position",
                "chain_a_residue",
                "chain_b_residue",
                "base_pair",
                "paired_C1_distance_A",
            ],
        )
        writer.writeheader()
        for row in rows:
            writer.writerow({key: row[key] for key in writer.fieldnames})

    metadata = {
        "identifier": "PDB 1BNA",
        "record": "https://www.rcsb.org/structure/1BNA",
        "coordinateSource": "https://files.rcsb.org/download/1BNA.pdb",
        "structureDOI": "https://doi.org/10.2210/pdb1BNA/pdb",
        "primaryPublication": "Drew et al. (1981), PNAS 78:2179-2183",
        "publicationDOI": "https://doi.org/10.1073/pnas.78.4.2179",
        "coordinateSha256": sha256(PDB),
        "downloadedAtUtc": json.loads((HERE / "download-record.json").read_text(encoding="utf-8"))[
            "records"
        ][0]["completedAtUtc"],
        "reportedMethod": "X-ray diffraction",
        "reportedResolutionAngstrom": 1.9,
        "chains": [a, b],
        "residuesMeasured": [len(a_numbers), len(b_numbers)],
        "pairedPositions": len(rows),
        "pairing": "chain A residues ascending against chain B residues descending",
        "measurement": "Euclidean distance between C1' atoms in angstrom",
        "scope": "Twelve positions in one deposited structure; not independent replicates, an experiment, a performance benchmark, or hydrogen-bond distances.",
        "computedAtUtc": datetime.now(timezone.utc).isoformat(),
        "script": "measure_and_plot.py",
        "scriptSha256": sha256(Path(__file__)),
        "valuesFile": "measurements.csv",
        "valuesSha256": sha256(HERE / "measurements.csv"),
        "minimum": {"position": int(np.argmin(values)) + 1, "distance_A": round(min(values), 4)},
        "maximum": {"position": int(np.argmax(values)) + 1, "distance_A": round(max(values), 4)},
    }
    (HERE / "measurements.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )

    plt.rcParams.update(
        {
            "font.family": ["Segoe UI", "DejaVu Sans"],
            "font.size": 10,
            "axes.edgecolor": "#CFC9BB",
            "axes.linewidth": 0.8,
            "text.color": "#3A3833",
            "xtick.color": "#5E5A51",
            "ytick.color": "#5E5A51",
            "axes.labelcolor": "#3A3833",
        }
    )
    fig = plt.figure(figsize=(11.2, 5.6), dpi=200, facecolor="#F7F5F0")
    ax = fig.add_axes([0.115, 0.16, 0.855, 0.79])
    ax.set_facecolor("#F7F5F0")

    ys = [row["position"] for row in rows]
    ax.hlines(ys, 10.1, values, color="#D6CFBF", linewidth=1.0, zorder=1)
    ax.scatter(values, ys, s=62, color="#2F6B62", edgecolor="#F7F5F0", linewidth=1.1, zorder=3)

    ax.set_xlim(10.1, 11.0)
    ax.set_ylim(0.4, 12.6)
    ax.set_yticks(ys)
    ax.set_yticklabels([str(y) for y in ys], fontsize=9.5)
    ax.set_xticks(np.arange(10.2, 11.01, 0.2))
    ax.set_xticklabels([f"{value:.1f}" for value in np.arange(10.2, 11.01, 0.2)], fontsize=9.5)
    ax.set_xlabel("C1′–C1′ distance (Å)", fontsize=12.5, labelpad=9)
    ax.set_ylabel("Paired position", fontsize=12.5, labelpad=12)

    ax.grid(axis="x", color="#E5DFD2", linewidth=0.7, zorder=0)
    ax.set_axisbelow(True)
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    for side in ("left", "bottom"):
        ax.spines[side].set_color("#CFC9BB")
    ax.tick_params(axis="both", length=0, pad=6)

    fig.savefig(PLOT, dpi=200, facecolor="#F7F5F0")
    print(f"plot: {PLOT} {PLOT.stat().st_size} bytes {sha256(PLOT)}")
    print(f"range: {min(values):.4f}..{max(values):.4f} A")


if __name__ == "__main__":
    main()
