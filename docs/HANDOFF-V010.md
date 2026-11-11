# HUANDENG v0.10 handoff

Date: 2026-11-08. The recovered implementation and final packaged acceptance are complete. Installation is recorded below; remote publication is verified separately.

## Runtime, repository and installed location

Accepted runtime: **0.10.0**, clean source `54513193b5e8004d51815265b75d99e6425cfba1`, built `2026-11-08T06:50:30.6528822Z`, Electron 38.7.2. Later harness/evidence/documentation commits do not change the binary's `huandeng-build.json` identity.

| Purpose | Location |
| --- | --- |
| Authoritative development worktree | `<workspace-checkout>` |
| Development branch | `editor/v0.10-product-workflow` |
| Canonical repository | `<editor-checkout>` |
| Established installed directory | `<editor-checkout>/dist/HUANDENG-win32-x64` |
| Established executable | `<editor-checkout>/dist/HUANDENG-win32-x64/HUANDENG Editor.exe` |
| Installation rollback destination | `<editor-checkout>/.verification/installed-v09-backup-20261108-v010` |
| Release destination | Private `origin`, `JaytonKogeru/huandeng` |
| Milestone tag | `editor-v0.10.0` |

The guarded installation plan passed 32 checks and matched all 82 original baseline files. Final installed-file counts, byte/hash matching, shortcuts and ordinary-profile reopening are recorded in the installation receipt:

Installation completed successfully. The installed v0.10 directory contains **29,214 files / 685,392,219 bytes**, matching the accepted SHA-256/size manifest. The retained v0.9 backup was verified against its original manifest. Desktop and Start menu shortcuts both use the installed executable, correct working directory and supplied-logo icon.

All **82 current original Project files**, plus the separately protected canonical fixture, remained byte-identical through replacement and reopening; normal close saved no files. No historical research baseline was restored and no ordinary user application was force-terminated. The preference file was backed up and only `uiLocale` was explicitly changed to `en`.

The ordinary profile reopened the original **80-page Project** with zero diagnostics, writable protocol 1, a fresh service epoch, a responsive native window, verified service parent and frontend bytes matching the installed package. The application was left open. Raw local receipt: `.verification/install-v010-20261108T070716Z-ff9d3c.json`. Curated preservation and reopen results are in [acceptance.json](evidence/v010/acceptance.json).

Retain the v0.9 rollback directory after installation. Close normally and confirm saves before replacing executables; never roll back documents with the application. Preserve unrelated fixture changes and raw research material.

## What is ready to use

English is the fresh-profile default; Chinese remains optional with core terms in English. Main Slides carry stable Slide IDs while Position reflects collection order. Project supports visual source previews, repeated Slide references, contiguous Section ranges and save-in-place selection. Legacy Section membership is retained until explicitly converted.

Object right-click menus, shortcuts and Inspector share formatting/layer actions and Undo. Properties, Layers, Story and Checks retain drafts when switching views. Notes resizes and docks below or right; panel preferences survive immediate normal close. Assets starts with images while supporting files remain accessible. Agent setup generates instructions; ChatGPT uses existing DC-WALT and adds no reverse proxy, public endpoint or tunnel.

The native Project is `examples/drug-design-v010/deck.pptd`; its canonical delivery path is `<editor-checkout>/examples/drug-design-v010/deck.pptd`. Ten editable Main Slides and three Sections supply full/brief Presentations. Choose a collection, use F5/Shift+F5 to present, then Export. Slide edits and Project arrangement have distinct save actions. Instructions: [WORKFLOW-V010](WORKFLOW-V010.md).

## Acceptance and evidence

The actual packaged EXE passed **A 7/7 + B 17/17 + Drug 8/8 = 32/32**. Windows unit tests passed 1,028 with one platform skip; Biome checked 718 files clean; core TypeScript/build, self-contained hoisted packaging and relocation passed. All ten development-host Slides received visual review, with representative final-package screens also inspected.

The final run suffixes are workflow `9Bxr6Y`, objects `OSXZhA` and Drug `fWwWXs`. [VALIDATION-V010](VALIDATION-V010.md) records the exact paths, checks and earlier failures. [acceptance.json](evidence/v010/acceptance.json) indexes safe evidence. Exports include ten 1920 × 1080 PNGs, [Drug-Design-full.pdf](evidence/v010/Drug-Design-full.pdf) with ten pages and [Drug-Design-briefing.pdf](evidence/v010/Drug-Design-briefing.pdf) with five. Canonical example bytes were preserved.

The first packaged Drug HTTP timeout remains unexplained; later diagnostic success and the final foreground-synchronized pass are recorded separately. Menu and foreground harness fixes changed no runtime behavior and weakened no assertions.

## Release discipline and boundaries

Synchronize this tested milestone only to private origin and independently verify branch/tag refs. Do not push upstream, publish npm, change visibility or publish original user contents. Keep raw logs and private inventories local; commit scoped source, documentation and safe example evidence. Source, installation and remote publication are three separate receipts.

Separate presenter windows, full PPTX import/export round trips, native PowerPoint animation mapping, arbitrary occurrence visual overrides and a plugin marketplace remain outside this finishing release. Continue from [RELEASE-V010](RELEASE-V010.md), [SPEC-V010](SPEC-V010.md) and the recorded validation boundary.
