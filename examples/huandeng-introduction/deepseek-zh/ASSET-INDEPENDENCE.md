# Independent asset acquisition — Chinese edition

Project: `deepseek-zh/deck.pptd`. This file replaces the earlier claim of independence with
the record of what was actually retrieved, generated and captured for the active pages on
2026-11-11 (UTC). Historical files are untouched.

## Correction to the earlier record

The previous version of this file said the active artwork was independent because the
scientific batch was "this project's own". That was not verified: `sources/science/source.json`
describes the 2026-11-10 11:22 shared generation batch, and
`media/imported/d5576a93…png` was byte-identical to the old shared plot. Page 7PV4 still
mounted that plot, and AVJE / CKFY / XZJN used native text cards. None of that proves an
acquisition by this edition. The files below are this round's evidence; the old ones stay
as history.

## Retrieval receipts (HTTP GET, recorded in `sources/independent-2026-11-11/acquisition.json`)

| Source | Status | Retrieved (UTC) | Bytes | SHA-256 |
| --- | --- | --- | --- | --- |
| `https://files.rcsb.org/download/1BNA.pdb` | 200, text/plain | 2026-11-11T13:28:21Z | 76,464 | `df42f150…4670` |
| `https://www.ebi.ac.uk/pdbe/static/entry/1bna_deposited_chain_front_image-800x800.png` | 200, image/png | 2026-11-11T13:28:21Z | 134,400 | `8c7c6a56…4310` |
| `https://cdn.rcsb.org/images/structures/1bna_assembly-1.jpeg` (cover verification) | 200, image/jpeg | 2026-11-11T13:41:50Z | 37,106 | `4d9fa07f…da38` |

The coordinate file and the RCSB image match bytes that already existed because they are the
same public record; the retrieval, timestamp and hash are recorded instead of treating the
presence of a file as proof. The PDBe image is a different archive and a different rendering,
so the structure artwork used inside pages is genuinely new here.

## Produced from the retrieved coordinates (`acquire.py`, Python 3.14 / matplotlib 3.11.2)

| File | Method | Size | SHA-256 | Page |
| --- | --- | --- | --- | --- |
| `sources/independent-2026-11-11/paired-c1-distances-recomputed-2026-11-11.csv` | C1′ ATOM records parsed; A1–A12 paired with B24–B13; Euclidean distance | 292 B | `5acff28b…be7a` | WMFA (values) |
| `sources/independent-2026-11-11/paired-c1-distances-deepseek-zh-2026-11-11.png` | matplotlib lollipop chart, Chinese labels, 2130×1005 | 102,126 B | `704bfa99…b6b4` | 7PV4 |
| `media/imported/a61ef1ea…c584b5.png` | PDBe image composited on white, whitespace and orientation glyph cropped, 90° rotation (`derive_crops.py`, crop box `7,185,800,594`) | 104,391 B | `a61ef1ea…c584b5` | WMFA, 7PV4 |

Recomputed distances (Å): 10.71, 10.77, 10.58, 10.35, 10.44, 10.46, 10.23, 10.49, 10.59,
10.44, 10.81, 10.89. They match the values already in the deck's table, which is expected for
the same deposited structure; the table was not regenerated from a shared slide image.
The chart's y axis is 10.0–11.1 Å and this truncation is stated on the slide.

## Editor captures (this bound Project, `huandeng_editor_capture`, zh-CN, 1920×1080 viewport, 3840×2160 output)

| Capture (in `media/imported/`) | State | Captured (UTC) | Used on |
| --- | --- | --- | --- |
| `5370be7d…74509` | page XZJN, edit view, before the right-column revision | 13:32:45 | CKFY (before) |
| `31b5b6d1…ed45` | page Z4XP, browse view, project sidebar (superseded on XZJN by the 14:05 capture) | 13:32:30 | history only |
| `619a120b…33b8f` | page XZJN, edit view, after the revision | 13:34:58 | CKFY (after) |
| `2875ddd4…91e70` | page 7PV4, History view, named version selected | 13:38:04 | AVJE (crop) |
| `b9d1f2ac…d4f80` | page 7PV4, saved-operation review dialog | 13:38:15 | AVJE (crop) |
| `d10c3052…3a1f3` | page Z4XP, edit view, project sidebar, project panel showing "使用位置" | 14:05:39 | XZJN (full window + marker + detail) |

Derived crops, each with its crop box in `sources/independent-2026-11-11/ui-crops/*.json`:

- `ckfy-before-canvas.png` / `ckfy-after-canvas.png` (2536×1425, identical box `640,555,3176,1980`)
  → `media/imported/9a59ed3e…8d9b` / `ab94e793…c48fb` on CKFY;
- `avje-history.png` (2772×1550, box `500,110,3272,1660`) → `media/imported/e2e48393…1753` on AVJE;
- `avje-review.png` (2380×1500, box `700,220,3080,1720`) → `media/imported/c3dbc13b…f667` on AVJE;
- `usedby-detail.png` (560×372, box `0,1140,560,1512` of the 14:05 capture)
  → `media/imported/9fbf6eac…ac7` on XZJN. The four brown lines on the full-window image mark
  exactly this rectangle (`sources/xzjn-location-2026-11-11/xzjn-location.json`).

Each capture was taken with this project as the selected Project; the page short code, the
seven workspace tabs and the page list are visible in the crops, so the region has an
intelligible place in the Editor. No other author's media is shown as a current case.

## Page roles after the revision

- **AVJE** — real History workspace (named version "2026-11-11 独立素材重校", author
  `deepseek-flash`, `82e121cd`) plus the read-only saved-operation review of the 7PV4 rebuild.
- **CKFY** — two matched Editor-canvas frames of XZJN (same view, same zoom, same crop box),
  before/after the right-column revision.
- **XZJN** — a full Editor window of this Project (page Z4XP, project panel on the left) with
  a brown rectangle marking the "Z4XP 的使用位置" block, and directly below it the readable
  detail cropped from exactly that rectangle (560×372): `用于 2 场演讲`, Main Slides,
  完整介绍 and 短版.
- **7PV4** — this round's PDBe structure and this round's recomputed chart; the old shared
  plot is no longer referenced by any Main page.
- **WMFA** — the same PDBe structure and the recomputed 12-value native table.

## Brand identity marks (independently acquired 2026-11-11)

The active pages use seven brand marks. Each one was retrieved from its official source at
2026-11-11T13:57Z (UTC); the retrieval, method, hash and page mapping are in
`sources/brand-acquisition/brand-acquisition.json` and `brand-placement.json`. Byte-identical
results are recorded as identical rather than re-encoded to look different. The earlier
"shared identity set" exemption is withdrawn: nothing in the current AGENTS.md exempts brand
marks, and the old bundle under `sources/brand` is history, not the current source of record.

| Mark | Official source and method | SHA-256 | Current file → pages |
| --- | --- | --- | --- |
| HUANDENG | Official product working tree `D:\_Proj\Huandeng` (git origin `JaytonKogeru/huandeng`, HEAD `b43e3e08`), file `plugins/huandeng/assets/icon.png`, git-tracked. Public raw URLs returned 404, so the official checkout is the source. | `c6cce013…` (identical) | `media/imported/c6cce013…png` → CZD7, Z4XP, K9P9, QHUX |
| ChatGPT | `https://chatgpt.com/cdn/assets/favicon.6a33781f61.svg`, 200; source hash `2021463d…` matches the recorded SVG. Rasterised 720×720 with resvg-py 0.5.0 and `svg { fill: #000; }` (the SVG's `:root` fill is not applied by resvg, otherwise it renders transparent). | SVG `2021463d…`; raster `3adcc98e…` (22,462 B) | `media/imported/3adcc98e…png` → Z4XP, 2FMW, 5ZZM |
| Claude Code | `https://claude.com/icon.png`, 200 | `733f24f4…` (identical) | `media/imported/733f24f4…png` → Z4XP, 2FMW, 5ZZM |
| DeepSeek | `https://avatars.githubusercontent.com/u/148330874?v=4`, 200 | `e51e0607…` (identical) | `media/imported/e51e0607…png` → Z4XP, 2FMW, 5ZZM |
| OpenSlide | Official `icon.svg` at pinned commit `3233309b…` of `open-slide/open-slide`, 200; source hash `761935b3…` matches the recorded SVG. Rasterised 512×512 with resvg-py 0.5.0. | SVG `761935b3…`; raster `f02ae887…` (32,673 B) | `media/imported/f02ae887…png` → K9P9 |
| GitHub | `https://brand.github.com/GitHub_Logos.zip`, 200; member `GitHub Logos/PNG/GitHub_Invertocat_Black.png` (the archive hash may change; the member hash is the check). | member `2a2f5cbc…` (identical) | `media/imported/2a2f5cbc…png` → K9P9 (OpenPPTD repository identifier) |
| PptxGenJS | `https://gitbrent.github.io/PptxGenJS/img/favicon.png`, 200 | `d697acf6…` (identical) | `media/imported/d697acf6…png` → K9P9 |

The two re-rasterised marks keep the official geometry and proportions: the ChatGPT mask
intersection-over-union against the previous file is 0.997 and the OpenSlide one is 0.9999,
with the same pixel sizes. The old `0f4797ac…` (ChatGPT) and `44e2a2aa…` (OpenSlide) files
remain in `media/imported` as history but are no longer referenced by any active page.
`sources/brand/*` is retained unchanged as the historical bundle.

## Verified in this round

- `huandeng_assets_list` (used, current Main): 20 assets. `d5576a93…` (old shared plot) and the
  old `dna-duplex-*` renders are no longer used by any active page.
- Presentations: `full` (22 items) and `brief` (12 items) have no `versionId` pin; their
  presentation notes are unchanged ("完整版，约十五分钟…" and "短版复用完整版的 Main Slides，
  不复制页面。"). The brief export resolves b10 → XZJN at the current page revision
  `5a4a2141…` (render `9e6fae29…`), so the short talk carries this revision.
- Outputs refreshed: `Exports/deck.pdf` / `deck.pptx` (22 pages), `Exports/短版 · 约十分钟-brief.pdf`
  / `.pptx` (12 pages), and the `brief.pdf` / `brief.pptx` aliases, which are byte-identical
  copies of the 12-page brief export. All reports carry metadata revision `378964317…`.
- The 22-page and 12-page contact sheets were regenerated and inspected
  (`sources/independent-2026-11-11/export-check/contact-sheet.png`,
  `sources/brand-acquisition/export-check/brief-contact-sheet.png`); the brief page 10 and the
  Main page 17 are pixel-identical for XZJN.
- Both PPTX reports carry the expected `FONT_FILES_NOT_EMBEDDED` warning, so PowerPoint may
  reflow text with local fonts.

Historical `source.json`, the 2026-11-10 batch, `ASSET-PROVENANCE.json`, `MEDIA-INPUTS.json`,
`sources/brand/*` and the old shared plot remain on disk unchanged.
