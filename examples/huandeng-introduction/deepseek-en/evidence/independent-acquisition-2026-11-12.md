# Independent acquisition and review map — 2026-11-12

Project: `deepseek-en/deck.pptd` · 24 Main Slides · 2 title-only Sections · 1 Presentation (`Short introduction`, 6 items). Writer: the bound HUANDENG project service; no `.page`, `.pptd` or `.huandeng/project.json` was edited by hand.

This is the current verification note. It supersedes the `MKPP`/`CRUA` render-cache statements in `final-validation-2026-11-11.md`, which are corrected there.

**Fact patch, 2026-11-12:** `EKZK` Notes were corrected to separate the manifest (Main page order) from metadata (Project Story, Sections, Presentation configuration and referenced page order). Only Notes changed. Main PDF/PPTX were re-exported; the six-slide short/brief outputs were unaffected. Exact text, receipt and hashes: `evidence/ekzk-notes-correction-2026-11-12.md`.

## What changed

| Page | Change | Stable ID |
| --- | --- | --- |
| `KWPT` | New plot and structure from this edition's own acquisition; source line records `download 2026-11-12`; body/caption say recomputed; Notes record the own fetch; frame added around the structure plate. | `dc6dccad-86a9-4629-a4aa-e494e5d6f53b` |
| `TJKM` | Same new plot and structure plate; captions updated to `2,240 × 1,120 / 1BNA plot` and `600 × 600 / RCSB plate`; Notes distinguish the own recomputation from the RCSB assembly image. | `b792b954-ed0c-4510-881d-bb8b297db885` |
| `98RC` (cover) | Official RCSB assembly view, background un-matted for the ink field, credited in the caption. | `3833f199-98ab-4056-b521-ab542137f524` |
| `MKPP` | Activity entry crop, whole Review window, A/B region rectangles and letters, readable saved-fields crop, new caption and Notes. | `738289ee-5cfc-4b6f-a0f1-e0492cfafc06` |
| `H29N` | Re-captured Story panel for the new Keep/This change; portrait crop shows the whole Story; table matches. | `d3aed85c-d9fc-4750-8ffe-caf9a4fb2d4f` |

Operations: `c9d62448-76bb-413d-8b15-eb55ae9168c1` (figures), `a4a85337-7700-4fb4-a5e7-184f5d4aed12` (plate/cutout), `74b804ab-fdab-4ba4-b7c0-6e0b25a57fb1` (reviewed wording), `3030c88b-5a45-43d7-a938-e39ea22d3cd4` (H29N), `e33ef75c-c1fb-42f1-8de9-2b2e42954a8f` and follow-ups (MKPP map), `5675f03e-1c37-4bf0-b29b-6b3bd77635a9` (MKPP entry pre-crop).

## Acquisition, not reuse

The old `sources/science/source.json` batch (2026-11-10 11:22) is retained as history but is not referenced by any current page. The current figures come from `sources/independent-2026-11-12/`:

- `1BNA.pdb` was fetched from `https://files.rcsb.org/download/1BNA.pdb` on 2026-11-12 00:26 UTC+11 (2026-11-11T13:26:10Z), HTTP 200, `Last-Modified` 2025-09-25, SHA-256 `df42f150…`. Its bytes match the earlier public copy because it is the same immutable RCSB record; it was not copied from the old folder.
- The official assembly image was fetched from `https://cdn.rcsb.org/images/structures/1bna_assembly-1.jpeg` at 2026-11-11T13:26:12Z, 500 × 500, SHA-256 `4d9fa07f…`.
- `measure_and_plot.py` (Biopython + Matplotlib 3.11.2, Python 3.14) recomputes the twelve C1′–C1′ distances from that download. Values 10.2329–10.8877 Å; position 7 = 10.2329 Å; one deposited structure, not replicates.
- The plot is a new 2240 × 1120 dot plot (`7b30b159…`), not the old connected-line plot (`a36d62e3…`). The light pages use a 600 × 600 white-padded plate (`b271ca77…`); the cover uses a 500 × 500 RGBA cutout (`6061804a…`). The unmodified JPEG is kept.
- `download-record.json`, `measurements.json`, `capture-record.json` and the README in that directory carry the HTTP headers, hashes, method and derived-file list.

No old shared image was copied, renamed, recropped or re-encoded as new acquisition. The old files remain in place.

## Identity marks, 2026-11-12

The active marks were independently retrieved in `sources/brand-independent-2026-11-12/`; the old `sources/brand/` image files were not read or copied (the historical manifest was used only to recover the recorded official URLs):

- `huandeng.png` `6b49274a…`: `git show b43e3e08:packages/desktop/icon.png` from the author's official repository object; byte-identical; the historical public raw URL with commit `00482d…` returns 404 anonymously.
- `claude-code.png` `733f24f4…` and `deepseek.png` `e51e0607…`: official URLs, byte-identical.
- `chatgpt.png` `0f4797ac…`: official SVG `2021463d…`, independently rasterised at 720 × 720 with sharp 0.35.5; pixel-identical (`66e3b493…`), not byte-identical because the PNG encoder differs.
- `open-slide.png` `44e2a2aa…`: official SVG `761935b3…`, independently rasterised at 512 × 512 with sharp 0.35.5; pixel-identical (`d7c1c041…`), not byte-identical.
- The page/element mapping is in `manifest.json`; the active files were left unchanged rather than re-encoded. The client marks appear on `BR4V`, `7GWR` and `EKZK`; OpenSlide on `7GWR`; the HUANDENG mark on the cover and footers.
- Codex, the GitHub repository symbol and PptxGenJS were fetched from their official sources but no current page element uses them; they are recorded, not inserted.

## UI capture states

- Review: `huandeng_editor_capture`, page `KWPT`, operation `74b804ab…`, 1600 × 1000, DPR 2, 2026-11-11T13:32:57Z → `b6e7587f…`.
- Activity entry: Playwright against the project's own `/huandeng` editor, page `KWPT`, Activity panel with the saved receipt and `Review changes`, 1600 × 1000, DPR 2 → `3dbd7bb9…`. This is a real capture with no document edit or save; it uses the same `data-hd-open-activity` control as the review capture and was imported through the writer's `/assets/import`. The page uses an exact 704 × 180 crop of the receipt (`activity-entry-crop.png`, `778afcbc…`) so PowerPoint receives a normal image instead of a 91%-height source rectangle; the full capture remains in the project and in `capture-record.json`.
- Story: `huandeng_editor_capture`, page `KWPT`, Inspector > Story, 1600 × 1000, DPR 2, 2026-11-11T13:33:07Z → `328dfb25…`.

The Review dialog's own banner says its previews use current project image bytes. The reviewed receipt `74b804ab…` is a text-only change applied after the figure swap; its after-preview shows the current new figures, and its saved-fields list is `Page notes/metadata`, `p10-source`, `p10-body`, `p10-caption`. The caption on `MKPP` states exactly that. The old review capture `98a67660…` and old Story capture `eb1e17d5…` are no longer referenced.

## Visual inspection

Actual renders and the actual PDF were inspected, not only geometry:

- `KWPT`: chart labels, units, 12 positions, source block and structure plate fit; `download 2026-11-12` is visible; the body wraps to two lines and the caption sits above the footer.
- `TJKM`: the 2:1 plot and the 1:1 plate keep their aspect; captions match the asset dimensions; the page's asset-library argument still reads.
- Cover: the cutout sits on the ink field without a white page; the caption credits the RCSB assembly view.
- `H29N`: the portrait Story crop shows Purpose, all three Preserve bullets and the This change value; the table text matches; the panel is not cut on either side.
- `MKPP`: the Activity entry names the receipt and `Review changes`; the whole Review window shows the page at A and the saved fields at B; the A/B boxes and letters locate both regions; the B crop shows the three content changes at readable size; the running head `02 / THE EDITOR` and the table are present in the PDF raster. The PDF page 15 (`CRUA`) also shows its running head and the three-row `Named version / Operation history / Restore` table.

The actual PDF page 13 raster (`evidence/pdf-2026-11-12/page-13.png`) shows `02 / THE EDITOR`, the title, the Activity entry, the A/B-marked Review window and the B crop. The actual PDF page 12 and 19 rasters show the updated Story/table and the new figures. `huandeng_design_audit` with `requireSectionDividers: true` reports 24 pages, two title-only section starts, and only the two intentional 64 pt divider titles plus pre-existing minor warnings (cover structure 0.89 px/px; `p8-editor-title` 21; `p13-shot` 0.99). The audit is not a substitute for the raster inspection.

## Output verification

- `Exports/deck.pdf`: 24 pages, 960 × 540, 6,350,953 bytes, SHA-256 `91f0731c1760cb795cf97461449db28e0733865d7775291f4f9463167d5ce4ba` (post-EKZK-Notes patch), generated 2026-11-12. Actual PDF rasters inspected for pages 1, 2, 9, 11, 12, 13, 15, 19 and 22. Page 13 is `evidence/pdf-2026-11-12/page-13.png` and contains the running head, the Activity receipt, the A/B-marked Review window and the B crop; page 11 contains `download 2026-11-12` and `recomputed`; page 12 contains the updated Story/table; page 15 contains the `CRUA` head and three-row table; page 19 contains the new captions; pages 2 and 9 are the title-only section pages and page 22 is the acknowledgments page.
- `Exports/deck.pptx`: 24 slides, 6,589,973 bytes, SHA-256 `04b930e3d6757b42380f82baa19db1ea7ab251ad431ebece62f8005673c749a0` (post-EKZK-Notes patch), generated 2026-11-12. PowerPoint 16 opened the Main PPTX and rendered slide 13 natively: the Activity entry, whole Review window, A/B markers, B crop and caption are visible, with no shape issue. The EKZK Notes patch is Notes-only; slide 20's notes were read back from the final PPTX and contain the new text, with the old sentence absent. Slide 13 has four pictures (whole review, entry crop, B crop and the mark) and the `02 / THE EDITOR` text; slide 12 has the native table and the new Keep/This change rows; slide 11 and 19 reference the new images. Media hashes include `7b30b159…`, `b271ca77…`, `6061804a…`, `b6e7587f…`, `778afcbc…`, `328dfb25…`; the source activity capture `3dbd7bb9…` remains in the project. Old science hashes `a36d62e3…` and `ff6d1434…` and old review/Story hashes `98a67660…` and `eb1e17d5…` are absent from the PPTX media.
- Only export warning: Consolas/Georgia/Segoe UI are not embedded in the PPTX, so PowerPoint may reflow with the same fonts. No unsupported objects.

## Presentation verification, 2026-11-12

The resolved project has one existing Presentation, `short-introduction`; no new Presentation was created and no new output kind was added.

- **Main (full introduction):** 24 pages. The two title-only real section pages are `RK7Q` at position 2 (`Why this exists`) and `WEZS` at position 9 (`The editor`); the formal acknowledgments page `JYJD` is at position 22. The current full PDF pages 2, 9 and 22 were rasterised and inspected (`evidence/pdf-2026-11-12/full-sections-2026-11-12.png`): both section pages contain only the title, and the acknowledgments page contains the code/dependency table, workflow references and non-affiliation note. The full PDF/PPTX contain all 24 pages/slides.
- **Short presentation:** `short-introduction` has six items in this resolved order: `98RC` (cover), `RK7Q` (the first real divider), `BR4V` (product), `KWPT` (the scientific evidence page with the new figures), `444J` (reuse/project overview) and `TCMD` (closing). Its story still says “A six-slide version for a short lab introduction”; the sequence keeps that short intent and does not add the full acknowledgments section.
- **Versions and Notes:** `pinnedPageCount` is 0; all six items are live page references with no `versionId`. The presentation `notes` field is empty and no item has occurrence-specific Notes. The export occurrence IDs are `short-introduction:pres-short-1` … `pres-short-6`; the exported PDF/PPTX resolve those six current Main page revisions. There was no pinned occurrence to re-check against an older asset set.
- **Current short outputs:** the writer's `Exports/Short introduction-short-in.pdf` (6 pages, 911,035 bytes, SHA-256 `4e691ab30c88dd90c76720b89aff9ed766d2cdd6eeebe2e2b9df98ebf1000218`) and `.pptx` (6 slides, 918,548 bytes, SHA-256 `bb99518780356ecc212d8cf80e3f78fd91dc2db1ad5220821bb3702d5a8ae920`). The existing six-slide short presentation is `short-introduction`; its canonical brief alias outputs are `Exports/brief.pdf` / `brief.pptx`, byte-identical copies of those six-slide exports. `Exports/brief-alias.json` records the mapping `brief → short-introduction`. No new presentation or output kind was created.
- **Actual short-output inspection:** the six PDF pages were rasterised to `evidence/short-presentation-2026-11-12/` and inspected as a contact sheet; PowerPoint 16 opened the six-slide PPTX and rendered all six natively. Slide 4 is the updated `KWPT` with the new plot and RCSB plate; slide 3 uses the independently retrieved Claude/ChatGPT/DeepSeek marks; slide 5 shows the current “24 slides, 2 sections, 1 presentation” overview. No old shared science or review image is visible. PowerPoint's mechanical check reports the same cover-subtitle box warning on slide 1 and a 1.24 px body-box warning on slide 3; the native 1920 × 1080 renders show no visible clipping.
- The existing Main PDF/PPTX are `Exports/deck.pdf` (24 pages, `91f0731c…`) and `Exports/deck.pptx` (24 slides, `04b930e3…`) after the EKZK Notes-only patch. The EKZK page revision is `d6ebe9f9…`; the operation review lists only `Page → notes`. The project's existing `mainStory`, section stories and `short-introduction` story remain the briefs; the canonical files are the `brief` alias above, and no presentation id/title was renamed.

## Correction of the earlier cache statement

The 2026-11-11 note claimed a persistent PNG render-cache miss for `MKPP`'s head and `CRUA`'s table, and suggested a cache refresh or editor restart. That attribution was not reproduced. The coordinator's settled PNG/PDF check found the running head and table present and the MKPP before/after PNGs byte-identical; this session's two consecutive `MKPP` renders also return the same image hash and render revision. The current statement is: the objects are present; no deterministic render-cache defect was established; no writer restart is required or requested.

## Remaining limits

- The cover structure is 500 × 500 displayed at 280 × 280 (0.89 source pixels per output pixel at 1920 delivery). It is a decorative view, not the measured evidence; the light pages use the same view at a larger source-to-display ratio.
- PowerPoint's mechanical check on slide 1 reports the cover subtitle box 1.29 px wider and 30.39 px shorter than its text frame; the native 1920 × 1080 render shows both lines fully inside the slide. This is left as a box-metric warning, not a visible clipping.
- PowerPoint font embedding is not available here; the PPTX references the original font names.
- The HUANDENG mark's historical public raw URL (commit `00482d…`) returns 404; the acquisition record therefore uses the author's official repository commit `b43e3e08`. Other active marks are public-fetched or official-SVG rasterised; see the identity-mark section above.
- Owner acceptance is pending. This document is an agent verification, not approval.
- The Chinese edition and other authors' projects were not modified.
- The old `sources/science/` and old `media/imported/` shared files remain untouched. No current page references the old science files.
