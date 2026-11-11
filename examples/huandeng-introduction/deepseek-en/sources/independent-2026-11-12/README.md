# Independent acquisition — 2026-11-12

This directory is this edition's own acquisition record for the scientific worked example. It is separate from the historical shared batch in `sources/science/`; that older directory is left untouched and is not read by the current pages.

## Public source, fetched here

| File | Source | Fetched | SHA-256 |
| --- | --- | --- | --- |
| `1BNA.pdb` | https://files.rcsb.org/download/1BNA.pdb | 2026-11-11T13:26:10Z (2026-11-12 00:26 UTC+11) | `df42f1506792f191b957227b061360652adcf6f813eb69d9ec553067ea584670` |
| `rcsb-1bna-assembly.jpeg` | https://cdn.rcsb.org/images/structures/1bna_assembly-1.jpeg | 2026-11-11T13:26:12Z | `4d9fa07ff878f8ab785c00869eb9a9149b6c3c85e5ca57a56855da7d0665da38` |

HTTP records (status 200, content type, `Last-Modified`, `ETag`, byte size, timestamp) are in `download-record.json`. The coordinate file is byte-identical to the earlier copy in `sources/science/` because RCSB serves the same immutable public entry; it was downloaded again from the recorded URL, not copied. The same applies to the measured CSV values: the arithmetic is the same because the deposited coordinates are the same. The rendered plot and structure images below are new bytes from this edition's run.

Citation: Drew et al., *PNAS* 78 (1981), 2179–2183, https://doi.org/10.1073/pnas.78.4.2179. Structure: https://www.rcsb.org/structure/1BNA, DOI https://doi.org/10.2210/pdb1BNA/pdb. Reported method X-ray diffraction, 1.9 Å; 486 atoms in two DNA chains.

## Measurement and plot

`measure_and_plot.py` parses this directory's `1BNA.pdb` with Biopython, takes the C1′ atom of chain A residues 1–12 against chain B residues 24–13, and writes `measurements.csv`/`measurements.json`. It plots the twelve positions with Python 3.14, Matplotlib 3.11.2, as a dot plot with paired position on y and distance in Å on x. Units, axes and the one-structure scope are retained; positions are not connected, because they are not a time series.

- Values: 10.2329–10.8877 Å; position 7 is 10.2329 Å.
- Scope: twelve positions in one deposited structure; not independent replicates, an experiment, a performance benchmark or hydrogen-bond distances.
- `paired-c1-distances.png`: 2240 × 1120, SHA-256 `7b30b159527f8ea568e68e613efe661f81d29e2fdd0662d3e2c3ffee4e954c65`.
- `measurements.json` records the source hash, script hash, timestamp, pairing and scope; `measurements.csv` is the editable values.

## Structure derivatives

- `rcsb-1bna-plate.png` (600 × 600, `b271ca77…`): the official 500 × 500 assembly view unchanged, padded with a 50 px white margin by `make_plate.py` so the ribbon does not touch the frame on the cream pages.
- `rcsb-1bna-cover-cutout.png` (500 × 500 RGBA, `6061804a…`): the same official view with its white page un-matted for the ink cover by `make_cover_cutout.py`; the ribbon is not redrawn or recoloured.
- The unchanged original remains `rcsb-1bna-assembly.jpeg`. The light pages use the plate, the cover uses the cutout, so the cover is not a white block and the detail pages keep the official pixels.

## Real UI captures

The review, Story and Activity states are captures of this project, not reference screenshots. Their states and hashes are in `capture-record.json`.

| Use | Asset | Capture state |
| --- | --- | --- |
| Review whole window + B crop | `b6e7587f…` | Real web Editor, page KWPT, Review of operation `74b804ab-fdab-4ba4-b7c0-6e0b25a57fb1`, 1600 × 1000, DPR 2, 2026-11-11T13:32:57Z |
| Activity entry crop | `3dbd7bb9…` source; `778afcbc…` page crop | Real web Editor, page KWPT, Activity panel with the saved receipt and `Review changes`, 1600 × 1000, DPR 2 |
| Story panel | `328dfb25…` | Real web Editor, page KWPT, Inspector > Story, 1600 × 1000, DPR 2, 2026-11-11T13:33:07Z |

The `MKPP` entry uses `activity-entry-crop.png`, an exact 704 × 180 crop of the Activity capture (`0.18..0.40` × `0.81..0.90`). The full 3200 × 2000 capture remains in the project. The separate bitmap avoids PowerPoint interpreting the 91%-height source rectangle as an empty picture; the PDF and the PowerPoint slide were both checked after this change.

The Activity capture used Playwright against the same local `/huandeng` editor at 1600 × 1000 / DPR 2, clicking the existing `data-hd-open-activity` control; no document edit or save was performed, and the screenshot was imported through the writer's `/assets/import`. The Review and Story captures used `huandeng_editor_capture`. None of them shows the old shared review or Story captures; the KWPT page in each capture already carries the new figure.

## File manifest

| File | Bytes | SHA-256 |
| --- | --- | --- |
| `1BNA.pdb` | 76464 | `df42f1506792f191b957227b061360652adcf6f813eb69d9ec553067ea584670` |
| `acquire.py` | 2353 | `3293f7abaedff68c9ca32fe673bffa77936695ce90ef73967c7a57c3363832dd` |
| `activity-entry-crop.png` | 23632 | `778afcbc35c6d3f3118dc88a6c551201890a11b2d7aa95ea5405161a887c2fb2` |
| `capture-record.json` | 2957 | `b3a5cec9a81cc0879989c354f93be8adc33f619c1816f2f276f168fb43907435` |
| `download-record.json` | 1440 | `11148d0d9c2d1cd5cf2320bf95515abafb092cbe3cec12812b1311284c17767f` |
| `make_cover_cutout.py` | — | `71144d4855355133504e0d512e55d5f4d1bddb50a46084be692d58a95175d377` |
| `make_plate.py` | — | `de8be08fafaa05a40a3675ef9ba24455c2c205afda98726cabddfa2641377a77` |
| `measure_and_plot.py` | 7051 | `fe81bd34d61afa311f9a4ebe2ca8f7821b12ccd89ab74e9666af21e92b501bce` |
| `measurements.csv` | 319 | `84f6c1daa9c34184d3a6ed3eecca30b5d7e211fd5c16d55c65d40d872f8ce249` |
| `measurements.json` | 1431 | `fdde1c27ce9ae7e35584a374650a40777349ad811c0c193ebcd73ecfe12a2ec5` |
| `paired-c1-distances.png` | 43532 | `7b30b159527f8ea568e68e613efe661f81d29e2fdd0662d3e2c3ffee4e954c65` |
| `rcsb-1bna-assembly.jpeg` | 37106 | `4d9fa07ff878f8ab785c00869eb9a9149b6c3c85e5ca57a56855da7d0665da38` |
| `rcsb-1bna-cover-cutout.png` | 144654 | `6061804a1b53efebdba14e577ed371c7d7b984efdc01d8e3e25e02a93427fb54` |
| `rcsb-1bna-plate.png` | 105529 | `b271ca7713d90645462fe533dc1f420775b7f3ebf3acd062681dae7c693d39f9` |

Run order from this directory: `python acquire.py`, `python measure_and_plot.py`, `python make_plate.py`, `python make_cover_cutout.py`. `acquire.py` is kept for reproducibility; the recorded download above is the run used for the delivered files.

## What this record does not claim

- It does not claim the DNA geometry is new science, independent replicates or a HUANDENG result.
- It does not claim the HUANDENG or client marks are independently captured; they remain official identity marks recorded in `sources/brand/manifest.json`.
- It does not delete or rewrite the old shared package. Old files stay as history; no current page references them.
