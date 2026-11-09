# Editor 0.13 — selected acceptance evidence

These receipts and captures use synthetic Projects only. The final workspace package source is **`886d6460cc3f690b2f153ba51a512e010d0dfb56`**, a clean **0.13.0** package built at `2026-11-09T05:45:58.5461954Z` with Electron 38.7.2. The package identity is recorded in [workspace acceptance](workspace-acceptance.json); [manifest](manifest.json) records the selected evidence hashes.

## Desktop workspace

[Workspace acceptance](workspace-acceptance.json) records **14/14 checks**, zero renderer errors and a normal code-zero exit. The journey covers Home and multiple Project tabs, sender-bound background work, retained drafts, central files, scoped Activity, Outline, Section editing, fullscreen controls and normal close. It also launches real native second instances using `--entry`, `--entry=value`, and positional paths containing Unicode and spaces. See [validation](../../VALIDATION-V013.md) for the test list and the F5 focus defect it exposed and verified.

| Capture | What it shows |
| --- | --- |
| [Project strip](strip-02-multiple-projects.png) | Home and two retained Project tabs |
| [Central files](01-central-files.png) | Read-only file tabs alongside the retained Slides document |
| [Project Activity](04-alpha-activity.png) | A synthetic Agent update and explicit local task reports |
| [Outline](outline-section-navigation.png) | Section-based structure, search and Slide identity |
| [Folded Section](section-card-shadows.png) | Cover card and restrained stacked edges/shadows |
| [Section manager](section-manager-first-slide.png) | First-Slide boundary editing in the shared Project draft |
| [Fullscreen](03-fullscreen.png) | The Slide with controls initially hidden |

The Project strip belongs to the shell; document captures come directly from the active `WebContentsView`. They are separate captures, not a composited screen. Early `BrowserWindow.capturePage()` images that omitted child views and produced blank centers are excluded. The hidden shell is not used as fullscreen evidence.

The source gate comprises **82 focused Vitest tests across 13 files**, including 16 native-launch parser cases, plus five desktop recovery tests, 11 publisher regressions and eight client tests. These focused counts are separate from historical full-suite totals. Office and publisher receipts retain their own source-artifact or module identities.

## Native PowerPoint

[Office acceptance](office-acceptance.json) records a five-slide synthetic file opened in PowerPoint 16.0 with automatic repair disabled. It verifies a native table, six native charts with workbook values, a group, and five equations. Table and chart edits saved and reopened; the equations survived. The original file was unchanged, with SHA-256:

`142d67ff0aae16455ae57f7efe81b95a97046dd00ab6d1fc1afbfb35acf9d229`

The inspected Office renders are [table and equations](office-slide-1.png), [category and combination charts](office-slide-2.png), [numeric XY and bubble charts](office-slide-3.png), [pie and area charts](office-slide-4.png), and [scientific shapes and group](office-slide-5.png). This is evidence for those native export objects; it does not certify arbitrary PPTX import, round-trip fidelity, font equivalence or animation export.

## Packaged publisher

[Publisher acceptance](publisher-acceptance.json) records two isolated synthetic Projects. Both excluded the hidden page, retained Notes, passed native export checks, kept source files unchanged, and produced byte-equal Project/shared files. An unchanged rerun skipped export. The first isolated attempt encountered a Windows-reserved writer-lock port (`EACCES`); a fresh isolated fixture passed without bypassing production locking.

## Delivery boundary

Only selected synthetic screenshots and sanitized receipts are included. Private research Projects, authoring receipts, account/plugin identifiers, workstation configuration, installed-profile screenshots and real shared files remain outside this repository. Exact-package acceptance, guarded installation, client registration, protocol doctor, real private publication and OneDrive cloud synchronization are distinct results. See the final [handoff](../../HANDOFF-V013.md) for completed delivery steps; local file replacement alone does not establish cloud upload completion.
