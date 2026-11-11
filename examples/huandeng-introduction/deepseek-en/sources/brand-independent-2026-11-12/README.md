# Independent identity-mark acquisition — 2026-11-12

This directory records this edition's own retrieval of the official identity marks used by the active pages. The historical `sources/brand/` image files are untouched and are not used as the acquisition evidence; its manifest was used only to recover the recorded official URLs.

## Method

- Direct official files were fetched with HTTP GET from the URLs in `download-record.json`; status, content type, `Last-Modified`, `ETag`, time and SHA-256 are recorded.
- `chatgpt.svg` and `open-slide.svg` were fetched from their official URLs and rasterised with sharp 0.35.5 by `rasterize_svg.js`: ChatGPT at 720 × 720, OpenSlide at its 512 × 512 intrinsic size. No recolouring, crop or redraw.
- The GitHub repository symbol was extracted unchanged from the official `GitHub_Logos.zip` archive.
- The HUANDENG product mark was retrieved with `git show b43e3e08:packages/desktop/icon.png` from the author's official repository object. The historical public raw URL with commit `00482d…` returns 404 anonymously, so the repository commit is the available authoritative source. This is not a copy of `sources/brand`.

## Active page mapping

`manifest.json` contains every page/element use. Summary:

| Active asset | SHA-256 | Source | Match to active file | Uses |
| --- | --- | --- | --- | --- |
| `huandeng.png` | `6b49274a…` | author's repository, commit `b43e3e08`, `packages/desktop/icon.png` | byte-identical | cover, page footers and diagram marks; 25 elements listed in the manifest |
| `claude-code.png` | `733f24f4…` | https://claude.com/icon.png | byte-identical | `BR4V` `p2-logo-claude`; `7GWR` `p8-plugin-logo-claude`; `EKZK` `pa-logo-claude` |
| `chatgpt.png` | `0f4797ac…` | https://chatgpt.com/cdn/assets/favicon.6a33781f61.svg (`2021463d…`), sharp 720 raster | pixel-identical (both `66e3b493…`) | `BR4V` `p2-logo-chatgpt`; `7GWR` `p8-plugin-logo-chatgpt`; `EKZK` `pa-logo-chatgpt` |
| `deepseek.png` | `e51e0607…` | https://avatars.githubusercontent.com/u/148330874?v=4 | byte-identical | `BR4V` `p2-logo-deepseek`; `7GWR` `p8-plugin-logo-deepseek`; `EKZK` `pa-logo-deepseek` |
| `open-slide.png` | `44e2a2aa…` | https://raw.githubusercontent.com/open-slide/open-slide/3233309b…/apps/web/app/icon.svg (`761935b3…`), sharp 512 raster | pixel-identical (both `d7c1c041…`) | `7GWR` `p8-box2-logo` |

The direct files are byte-identical to the active page assets. The two SVG-derived marks are **pixel-identical but not byte-identical**, because the independent PNG encoder's compressed stream differs; the active files were deliberately left unchanged rather than re-encoded to manufacture a hash difference. There is therefore no visual or page change from this acquisition.

Other official sources fetched for completeness, but not used by a current page element:

| File | SHA-256 | Note |
| --- | --- | --- |
| `codex.png` | `2ce1c57d…` | official Visual Studio Marketplace icon; no active use |
| `github-repository.png` | `2a2f5cbc…` | exact `GitHub Logos/PNG/GitHub_Invertocat_Black.png` from the official archive; no active use |
| `pptxgenjs.png` | `d697acf6…` | official PptxGenJS site; no active use |

They are kept as source records, not inserted. The old `huandeng-user-original.png` is not active and was not re-fetched; it remains historical.

## Files

- `download-record.json` — HTTP/commit records and hashes.
- `manifest.json` — active-asset mapping to page elements, source and match level.
- `acquire_brand.py` — reproducible fetch/extract script.
- `rasterize_svg.js` — sharp 0.35.5 raster script; run `npm install sharp@0.35.5` outside the project, then `node rasterize_svg.js`.
- `chatgpt.svg` / `open-slide.svg` — fetched official source vectors.
- `chatgpt-720.png` / `open-slide-512.png` — independent rasters; pixel-identical to the active PNGs.
- `codex.png`, `claude-code.png`, `deepseek.png`, `pptxgenjs.png`, `github-repository.png`, `huandeng.png` — fetched/extracted originals.
- `GitHub_Logos.zip` — official archive from which the GitHub symbol was extracted.

These marks identify products and sources only; no endorsement is implied.
