# Public scientific example: PDB 1BNA

This optional worked example lets an introduction show an original scientific figure, measured values, a chart and a small comparison table. It is not a prescribed presentation outline.

## Evidence and interpretation

The source is [RCSB PDB 1BNA](https://www.rcsb.org/structure/1BNA), the Dickerson–Drew DNA dodecamer, reported at 1.90 Å X-ray resolution. Citation: Drew et al., PNAS 78 (1981), 2179–2183; https://doi.org/10.1073/pnas.78.4.2179. Structure DOI: https://doi.org/10.2210/pdb1BNA/pdb.

The two structure images use the deposited atomic coordinates. Chain A is green; chain B is ochre. Hydrogens and water are not added. Approximate sticks are inferred by distance for visual context and do not annotate bond order.

The CSV/JSON measure the Euclidean distance between paired C1′ atoms: chain A in ascending residue order and chain B in descending order. The twelve points are positions in one structure. They are not independent replicates, uncertainty estimates, hydrogen-bond distances or a performance benchmark. The chart has a labelled non-zero y-axis to show this geometric variation.

## Files

- 1BNA.pdb — unchanged public coordinate source.
- dna-duplex-side.png / dna-duplex-end.png — transparent, high-resolution coordinate views.
- paired-c1-distances.csv / measurements.json — editable source values and residue identities.
- paired-c1-distances-en and -zh, PNG/SVG — derived plots with labels and units.
- generate.py — reproducible coordinate parsing, measurement and plotting.
- source.json — source URLs, method, scope and SHA-256 hashes.

Authors may use a native HUANDENG chart or table built from these exact values, or another appropriately sourced scientific example. Cite the structure on the audience slide and retain methods in the notes. Never present the plot as an experiment run by HUANDENG.

## Marked measurement and reproduction

`dna-duplex-position7.png` adds the actual A7/B18 C1′ endpoints and their geometric distance segment to the coordinate view. The red segment is a measured separation, not an annotated chemical bond. `highlight-position.py` reproduces that view from the same `1BNA.pdb`.

The scripts require Python, NumPy and Matplotlib. With the bundled PDB present, run `python highlight-position.py` and then `python generate.py` in this directory. The final generator step refreshes the file manifest after both figures have been generated. A CJK-capable font is required for the Chinese plot labels; the recorded originals used Microsoft YaHei.

The measured values can be recomputed from the unchanged coordinates. Image bytes can vary with Matplotlib and font versions; `source.json` records the exact distributed files. Its file list includes this README and both scripts, and deliberately excludes `source.json` itself.
