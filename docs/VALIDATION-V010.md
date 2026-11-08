# HUANDENG v0.10 validation

Date: 2026-11-08. Contract: [Audit](AUDIT-V010.md) → [Specification](SPEC-V010.md) → [Implementation](IMPLEMENTATION-V010.md) → validation → release. Recovery continued the existing Windows worktree, with two independent UX audits and desktop acceptance.

## Accepted runtime and evidence

| Identity | Accepted value |
| --- | --- |
| Product | HUANDENG Editor 0.10.0 |
| Runtime source | `54513193b5e8004d51815265b75d99e6425cfba1` |
| Build timestamp | `2026-11-08T06:50:30.6528822Z` |
| Source state | `sourceDirty=false` |
| Electron | 38.7.2 |
| Authoritative worktree | `D:/_Proj/Huandeng-v010-20261108` |
| Branch | `editor/v0.10-product-workflow` |

Windows owns build provenance; Linux was an editing/transfer mirror. Later harness/documentation commits do not change the binary's source identity. Product version 0.10.0 remains separate from npm workspace versions.

The final **actual packaged executable passed 32/32 checks**: workflow A 7/7, objects/workspace B 17/17 and Drug Design 8/8. Shareable results are indexed in [acceptance.json](evidence/v010/acceptance.json). Full local receipts remain under:

- `.verification/workflow-v010/huandeng-workflow-v010-9Bxr6Y/acceptance.json`
- `.verification/object-workspace-v010/huandeng-object-workspace-v010-OSXZhA/acceptance.json`
- `.verification/drug-design-v010/huandeng-drug-design-v010-fWwWXs/acceptance.json`

## Code and package gates

| Gate | Result |
| --- | --- |
| Windows unit suite | 1,028 passed, one platform-specific skip; 1,029 tests across 91 files |
| Biome | 718 files checked clean |
| Core TypeScript | Passed |
| Core/editor build | Passed |
| Windows packaging | Hoisted, self-contained dependency package passed verification |
| Relocation | Packaged application passed the independent-location check |

Focused tests cover Sections, group ordering, formatting/keyboard scopes, rich/multiline underline and native text export, image filtering, and layout persistence. Desktop acceptance is separately recorded below.

## The 32 packaged checks

Every row passed using isolated profiles/runtimes, synthetic projects or an example copy, real controls, saved-data readback and file comparisons. Suite A substituted temporary native-dialog destinations while exercising Welcome's New/Open actions. Drug PNGs used the native render endpoint; PDFs used the Export dialog.

| ID | Verified behavior |
| --- | --- |
| A1 | Welcome New Project creates a writable Project. |
| A2 | Pages adds Main Slides and preserves saved identities. |
| A3 | Section boundary Positions save a continuous range without moving the current Slide. |
| A4 | Presentation building offers previews, individual Slides, Sections and repeated references. |
| A5 | Reorder/remove/save retains the selected repeated occurrence. |
| A6 | Normal and compact windows preserve the Project without document overflow. |
| A7 | Normal close and Welcome Open restore Sections and Presentation references. |
| B1 | Fresh profiles default to English; authored text and page-theme overrides remain intact. |
| B2 | Image right-click selects the object and Properties receives focus. |
| B3 | Bold/Italic/Underline agree across menus, shortcuts and Undo/Redo. |
| B4 | Size uses the effective theme; color changes both stored and rendered text. |
| B5 | Multiselection remains atomic; Shift+F10 opens the menu and restores canvas focus. |
| B6 | All four layer actions match shortcuts and preserve object content. |
| B7 | Inspector tabs retain unsaved Story/chart drafts without document writes. |
| B8 | Notes drag-resize/dock retains text and input shortcut ownership. |
| B9 | Assets defaults to images; JSON/Python remain in All files and Files. |
| B10 | Image reuse/import creates editable objects; Undo restores the Slide. |
| B11 | Actual library-image dragging places an image through the editor. |
| B12 | Panel edges collapse/resize; layout survives normal reopening. |
| B13 | Immediate close after a Notes layout change retains the latest dock and size. |
| B14 | Settings resets layout and opens keyboard help. |
| B15 | Optional Chinese retains core English product nouns and authored text. |
| B16 | Agent setup explains configuration and existing DC-WALT without starting an Agent. |
| B17 | Final documents remain readable and the isolated app closes normally. |
| D1 | The native ten-slide example opens in English. |
| D2 | Full/brief Presentations resolve ten/five stable Main Slide references. |
| D3 | All ten Slides present in order with readable native objects and source Notes. |
| D4 | The five-slide briefing follows its own order over the same Slides. |
| D5 | Native rendering produces ten complete 1920 × 1080 PNGs. |
| D6 | Export produces the full ten-page and briefing five-page PDFs. |
| D7 | Browsing/export preserves canonical example and copied-project bytes. |
| D8 | Normal close/reopen preserves the Project and both Presentations. |

The coordinator visually inspected all ten development-host Slides and representative final-package screens, separately from automated traversal/layout/export checks. Deliverables: [full PDF](evidence/v010/Drug-Design-full.pdf), [briefing PDF](evidence/v010/Drug-Design-briefing.pdf), [editable Project](../examples/drug-design-v010/deck.pptd). Sources remain in Notes and [SOURCES.md](../examples/drug-design-v010/SOURCES.md).

## Failures retained and resolved

Eight early unit failures expected obsolete Chinese-default labels. English/explicit-locale assertions replaced them; source-preservation, unsupported-schema and disabled-control checks stayed intact. Selectors were corrected for Section labels containing option text and the keyboard-help F1 badge.

A real Notes defect arose from `hr` resize handles inheriting zero height. Explicit height/stretch styling fixed dragging; the harness requires positive dimensions. Internal image placement now enters leave protection before lookup/decode. The normal leave response carries the latest stamped layout, fixing immediate-close loss without a queued-IPC deadlock or stale overwrite.

Menu harness failures remain recorded: repeated Escape during closure cleared selection; a packaged run timed out awaiting Teal with its hover submenu collapsed. Closure now waits for hidden state, dismissal sends one Escape, and submenus use ArrowRight, visible-state confirmation and one Enter. Color/model and single-Undo assertions remain unchanged.

The first packaged Drug export hit a **120-second HTTP timeout whose cause remains unexplained**. A diagnostic attempt received HTTP 200 and a ten-page PDF, then hit a 15-second screenshot timeout. Foreground/focus synchronization enabled the final eight-check pass; it does not explain or erase the first timeout. Assertions were not weakened. The final submenu/foreground harness fixes ran as ignored copies to retain clean runtime provenance; their later harness/documentation commit does not alter the accepted executable.

## Installation and publication evidence

Separate installation preflight passed 32 checks and matched the 82-file original baseline. Installation, shortcuts and ordinary-profile reopening are recorded separately:

Installation completed successfully. The installed v0.10 directory contains **29,214 files / 685,392,219 bytes**, matching the accepted SHA-256/size manifest. The retained v0.9 backup was verified against its original manifest. Desktop and Start menu shortcuts both use the installed executable, correct working directory and supplied-logo icon.

All **82 current original Project files**, plus the separately protected canonical fixture, remained byte-identical through replacement and reopening; normal close saved no files. No historical research baseline was restored and no ordinary user application was force-terminated. The preference file was backed up and only `uiLocale` was explicitly changed to `en`.

The ordinary profile reopened the original **80-page Project** with zero diagnostics, writable protocol 1, a fresh service epoch, a responsive native window, verified service parent and frontend bytes matching the installed package. The application was left open. Raw local receipt: `.verification/install-v010-20261108T070716Z-ff9d3c.json`. Curated preservation and reopen results are in [acceptance.json](evidence/v010/acceptance.json).

Commit only synthetic/example artifacts and sanitized summaries. Original user content, research screenshots, private paths and raw inventories stay local. Verify private-origin branch/tag refs separately. This release claims no new sustained-load benchmark, complete PPTX round trip or native PowerPoint animation mapping.
