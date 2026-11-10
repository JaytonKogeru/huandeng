# HUANDENG 中文介绍 · 16 页候选

Open `deck.pptd` in HUANDENG. Keep the entire directory together when moving it.

## What this is

A 16-page, 960×540 Chinese introduction to HUANDENG as a scientific slide editor with external AI collaboration. It was rebuilt from the rejected 21-page edition rather than extended page by page. The new arc is:

1. a real scientific evidence page;
2. one source of content, stable page identity and several talk appearances;
3. object-level editing and Story;
4. one concrete change, external AI clients, review, delivery, boundaries and a first step.

Three title-only Section pauses separate “一份内容”, “一页证据” and “一次修改”. The fourth Section, “使用与边界”, intentionally begins directly on the provenance page rather than adding another pause.

Main Slides contains the complete 16-page sequence. Two real Presentations reuse it:

- `完整介绍` — 16 pages, roughly 12–15 minutes.
- `短版 · 八分钟` — 8 pages, selected and reordered from the same Main Slides.

## Delivery files

- `Exports/deck.pdf` — final static candidate, 16 pages.
- `Exports/deck.pptx` — final editable PowerPoint candidate, 16 pages.
- `Exports/deck.pdf.report.json` and `Exports/deck.pptx.report.json` — native export reports.

Both exports were produced from the final manifest `sha256:bb704e34cdf4fc4e448b657e8875b6a0249bb4db860ab815b4a8134ba411f498` and metadata `sha256:2d15c134d745563a6514b495e6bfebc9b059a968db158a68a45f02545d5fe2da`.

The PDF report is complete with no diagnostics. The PPTX report is complete, with one advisory only: `FONT_FILES_NOT_EMBEDDED` — PowerPoint uses the original font names, so font availability and native reflow can differ from the browser. An Office-level visual inspection of the exported PPTX/PDF was not performed in this shell-restricted session; the export reports verify structure, not Office rendering.

## Provenance and scientific scope

- HUANDENG identity uses the supplied `huandeng-icon.png` / `huandeng.png`; third-party marks retain their original colors and proportions. Provider marks identify products and do not imply endorsement.
- Product screenshots are actual HUANDENG 0.18 public-product UI captures. They were not redrawn or mocked.
- The scientific example uses PDB 1BNA (Dickerson–Drew DNA dodecamer), Drew et al., PNAS 78 (1981) 2179–2183, DOI `10.1073/pnas.78.4.2179`. Structure DOI `10.2210/pdb1BNA/pdb`.
- The twelve plotted values are C1′–C1′ Euclidean distances at twelve positions in one deposited structure. They are not independent replicates, an experiment, a performance benchmark or hydrogen-bond distances. The displayed range is 10.23–10.89 Å.
- Sources and reproduction notes live in `../assets/science/README.md`, `source.json`, `measurements.json` and `paired-c1-distances.csv`.

`SOURCE-MANIFEST.json` records the pre-rework copied input (21 pages) and is retained as historical provenance. It does not describe the current page set. Current page paths and revisions are in `deck.pptd`, `pages/` and `.huandeng/project.json`.

## Validation and history

- All 16 final pages were rendered at 1920×1080 and inspected for clipping, line breaks, image legibility, privacy and visual variation.
- Final design audit at 960-wide normalization: 16 pages, 0 findings with `maxTitle=34`, `maxBody=22`.
- Final page count: 16. Full Presentation: 16. Short Presentation: 8.
- Existing named checkpoints were retained. New named milestones:
  - `checkpoint:f1dfcc8985dcccfa545617113c262c9d` — cover
  - `checkpoint:8b6865b495117b2e59c3583724073a18` — scientific evidence
  - `checkpoint:2e328715d27226562139dcf639ba7794` — AI collaboration
  - `checkpoint:f551a8cfd9266b8cb8a742039116ec0f` — review and versions
- Applied operation receipts: `513be3ed-6348-4e47-a07e-bc15978ea880`, `e44712b2-0eda-49de-a51c-f2d66aef5b78`, `d97bc39f-aa2e-485d-a3a6-47c0daad9a12`, `600593c3-0165-4955-b69a-64e79a43f311`, `e4c39f14-72b9-4773-8aa0-4ad44e5b6428`, `a9d539f8-6f61-445a-9ed2-3b34a8887740`, `8848319d-33c2-48fc-bad5-7f2da0ff21a2`, `be4ed6d5-2bf3-41be-9e70-623af1897801`, `f9573414-3405-49c9-9c10-c62979a2d65e`, `3721e977-9cbc-49c1-a08e-ba440b7f7035`.

This is a completed candidate, not author-approved artwork. The owner's visual decision remains separate from structural checks, rendered review and export reports. No commit or push was made.
