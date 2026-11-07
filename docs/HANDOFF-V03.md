# HUANDENG Editor v0.3 — Implementation Handoff

Updated: 2026-11-07 (Australia/Sydney). Status: verified Windows release candidate; formal installation and GitHub milestone push are the remaining release steps.

## Names and compatibility

- Product-facing names are **HUANDENG Editor**, **HUANDENG Story**, **HUANDENG Plugin**. UI window titles begin with `HUANDENG Editor`; project folder may follow. No Chinese product name or DING branding is shown.
- GitHub repository was renamed in place to the private `JaytonKogeru/huandeng`. `origin` points there; `upstream` still points to OpenSlide and must never receive HUANDENG pushes.
- Canonical CLI command is `huandeng story`; MCP advertises `huandeng_story_record`; HTTP endpoint is `/__pptd/story`. Old `frame` and DING protocol spellings remain input aliases for existing clients, not user-facing product names.
- Existing `.huandeng` file storage and `designIntent` metadata remain unchanged. Project history and recent-project preferences are preserved.

## Delivered in v0.3

- Electron + React Windows desktop, PPTD manifests with separate `.page` files, stable page identity and source tree, page-history previews/restores, external agent editing.
- Table rendering using merged-cell layout with compressed rows and column widths. Inspector edits a source cell while preserving neighboring content and merge metadata.
- Inline and display LaTeX fragments render using KaTeX MathML; the original editable LaTeX source is preserved in the page file.
- Reusable scientific desktop acceptance: `scripts/verify-science-v03.mjs`. Core interaction acceptance: `scripts/verify-huandeng-desktop.mjs`.

## Verified on THUG

- `corepack pnpm check`: pass; `corepack pnpm --filter @open-slide/core typecheck`: pass; core build: pass.
- PPTD tests: 75 passed, 1 skipped (7 test files).
- Desktop workflow: 6/6 passed, including native Open/New, external MCP, Story, page history and restart persistence; 0 leftover editor processes.
- Scientific workflow: merged table, inline/display MathML, cell editing, original LaTeX, sibling-page byte stability, and English-only product window title; all passed.
- On the same scientific fixture, actual PNG (102,585 bytes) and PDF (357,144 bytes) export files were generated and their magic signatures checked; 0 leftover editor processes.
- Recorded screenshots: `.verification/desktop-v03-editor.png`, `.verification/desktop-v03-history.png`, `.verification/science-v03.png`; build logs and output are local `.verification` evidence.

## Safeguards and known gaps

- User-modified `tests/fixtures/studio/pages/identities.page` remains uncommitted and excluded from editor commits. Preserve SHA-256 `FE378A48E57B63F2B9E7286578F68EEFE856A381422930A6615F920B02622832`.
- Editing must be completed/blurred before quitting. The science test now ends its active Inspector interaction before requesting a clean exit. No application process remains after verification.
- Advanced table styling and PPTX-native editable math/OMML are not yet covered by this release. Do not claim scientific PPTX fidelity on the strength of PDF/PNG tests.
- Historical page previews use current project media. Binary media-version archives, cross-device history synchronization, and full multi-agent arbitration remain future work.

## Release operation

1. Commit only editor source and docs; never include the user-modified `.page` file.
2. Build formal `dist/HUANDENG-win32-x64/HUANDENG Editor.exe` from committed source, verify self-contained packaging, and run `scripts/Install-Huandeng.ps1`.
3. Confirm Desktop/Start Menu shortcuts target the new executable, remove only old shortcuts belonging to this project, and verify no stray test windows.
4. Push `main` and annotated `editor-v0.3.0` to origin after acceptance; verify remote SHA, private visibility, and HUANDENG CI. Do not publish npm or push upstream.

## Next feature direction

Further improve high-fidelity scientific table/formula/PPTX editing and robust per-page AI collaboration without fixed slide templates.
