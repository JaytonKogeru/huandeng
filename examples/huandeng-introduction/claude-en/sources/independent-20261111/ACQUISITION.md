# Independent acquisition record — claude-en, 11 November 2026

Acquired by Claude Code (Opus 5.5) for this edition only. No file was copied from the common asset package, MEDIA-INPUTS, another author's project, or this project's older `media/imported` folder. Those older files stay in place as history. All active page artwork now comes from `media/independent-20261111/`, except for thumbnails that this project rendered from its own pages (`media/derived/thumbs/r1-*`, `r3-*`).

## Science (1BNA)

| File | Source and method |
| --- | --- |
| `science/1BNA.pdb` | Downloaded from https://files.rcsb.org/download/1BNA.pdb (sha256 `df42f150…`). |
| `science/generate_1bna.py` | Written for this edition. Reads MODEL 1, altloc A or blank, and computes C1′–C1′ distances for A1–B24 … A12–B13. It also draws the side-view stick model: heavy-atom bonds under 1.9 Å, with the helix axis taken from the principal axis of the C1′ atoms. Chain A is `#3D7468` and chain B is `#B9783F`. |
| `science/paired-c1-distances.csv`, `measurements.json` | Script output. All twelve values match the native chart on slide AVNM to four decimals: 10.7121, 10.7665, 10.5802, 10.3531, 10.4416, 10.4606, 10.2329, 10.4912, 10.5912, 10.4362, 10.8052 and 10.8877 Å. |
| `science/plot_c1_distances.py` → `c1-distances-1bna.png/.svg/.pdf`, `media/…/figures/c1-distances-1bna.png` | The data plot on AVNM, drawn with Matplotlib 3.11 from the CSV at its true slide size (604 × 304 pt, Arial, 300 dpi, transparent). It replaced the in-slide native chart in operation 8d3042fd. |
| `media/…/science/dna-1bna-side.png` | Script output, 789 × 1572 px, transparent. Used on QMYQ and AVNM. |

Citation: Drew et al., PNAS 78 (1981) 2179–2183, https://doi.org/10.1073/pnas.78.4.2179; structure https://www.rcsb.org/structure/1BNA.

## Marks

These are product, repository or organisation marks, used only to identify each party. No affiliation or endorsement is implied. Some files match bytes in the older shared package because they come from the same official source. That match is coincidental, not copying.

| File | Original URL or location | Method |
| --- | --- | --- |
| `brand/huandeng.png` | The installed `HUANDENG-v0.19.0-win32-x64/resources/app/icon.png` | Copied from the product build |
| `brand/open-slide.png` | https://github.com/open-slide.png?size=460 (GitHub organisation avatar) | Downloaded |
| `brand/github-mark.png` | https://raw.githubusercontent.com/primer/octicons/main/icons/mark-github-24.svg | Rendered from SVG to 512 px PNG (Chromium) |
| `brand/pptxgenjs.png` | https://raw.githubusercontent.com/gitbrent/PptxGenJS/gh-pages/img/favicon.png | Downloaded |
| `brand/openai.png` | https://github.com/openai.png?size=512 (served at 200 px) | Downloaded. Identifies OpenAI, the maker of Codex and ChatGPT, and appears on both rows |
| `brand/claude.png` | https://claude.ai/favicon.svg | Rendered from SVG to 512 px PNG |
| `brand/deepseek.png` | https://github.com/deepseek-ai.png?size=460 | Downloaded |

The original SVG files are kept in `sources/independent-20261111/brand/`.

## Interface captures

These captures show the real HUANDENG Editor 0.19.0 serving this project (`claude-en/deck.pptd`) on its loopback web origin. A headless Chromium browser drove it at a 1600 × 900 viewport with device scale 2 and English UI. Navigation only opened views, tabs and dialogs. No edit was made through the browser. All edits went through the CLI writer with preview, then apply. The captures contain no personal paths, accounts or other projects.

| File | State captured |
| --- | --- |
| `ui/editor-overview.png` | Normal view, slide AVNM selected (DKSN) |
| `ui/story-panel.png` | Inspector › Story tab for AVNM, after the axis-label request (QK69) |
| `ui/outline-section.png` | Outline view at Section 3, with AVNM selected (AZJC) |
| `ui/activity-receipt.png`, `ui/review-dialog.png` | Activity receipt and Review saved changes for operation `9c021a9e` (4V98) |
| `ui/history-versions.png` | History › Saved versions for AVNM: Before axis-label edit, then Axis labels in chart (73AG) |
| `ui/status-before.png`, `ui/status-after.png` | Status bar on SMGE at Position 25/25, then 26/26 after acknowledgments slide 9JFE was inserted (V2SV) |
| `ui/browse-agents.png` | Browse view of the Working with agents Section (V2SV) |
| `ui/project-overview.png` | Project tab with the Main library and both Presentations (JZ7U) |
| `ui/design-check.png`, `ui/export-dialog.png`, `ui/present-menu.png` | Design check (English, Section title slides expected), Export dialog and Present menu (SY94) |
| `ui/pptx-before-chart-4k.png`, `ui/pptx-after-chart-4k.png` | Microsoft PowerPoint 16 rendering of slide 12 from this project's own PPTX exports at 3840 × 2160, cropped to the same region. The before export predates this revision; the after export follows operations `9c021a9e` and `6a5c6224` (6FNH). The 1920-px crops are earlier drafts, kept for history. |

After the Matplotlib change, the captures were taken again with a `-mpl` suffix. These are `editor-overview-mpl`, `story-panel-mpl`, `outline-section-mpl`, `activity-receipt-mpl`, `review-dialog-mpl` and `history-versions-mpl`. `review-slide-before.png` and `review-slide-after.png` are crops of the slide preview in the Review dialog for operation 8d3042fd, and 6FNH uses them. The earlier captures and PowerPoint crops remain as history; no page uses them now.

The status-bar crops are 460 × 48 px, shown at 400 pt. The before state cannot be captured again, so these two images stay slightly soft.
