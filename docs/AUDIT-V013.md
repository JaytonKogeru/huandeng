# v0.13 — Workspace and presentation audit

Baseline: editor v0.12.1, source/doc head `68ab059f4b1a9a84951cce6adab22fdbccc40985`. Inspect the installed runtime separately from this source state. Private project content is excluded from repository evidence.

## Observed product problems

- Desktop keeps one active service and replaces its renderer when another Project opens. Home also replaces that session. A Project tab needs an independent persistent service and renderer, not a cosmetic tab label.
- Files render in the right inspector even when the file is the current object of attention. Slides, Inspector and Notes own drafts which must remain mounted when a file is viewed.
- Sections are duplicated as long editor cards in Project and as groups in Pages. There is no compact Outline. Section editing offers boundary, range and member modes although the intended normal model is a continuous first-Slide boundary.
- Presentation controls begin visible and whole-canvas pointer motion reveals them. Focus can keep the controls open. Fullscreen requires a separate action.
- Folded Section cards communicate stacking but lack a restrained depth treatment.
- Page history records source/Story/Notes changes correctly. Position numbers authored as ordinary text necessarily change page sources after reordering; a true derived Position field is required instead of ignoring arbitrary numeric text in history.
- Shared writer transactions have real execution receipts, but the workspace has no task activity stream. External conversations cannot be inferred; clients must explicitly report concise task stages.
- PPTX is an export target with native and object-raster fallback paths. PPTX import and Google Slides editing are not implemented. Interoperability must state these boundaries.
- The existing local scheduled publisher already exports into each Project before copying fixed latest PPTX files. Its interactive task starts a console executable directly, explaining a visible console despite hidden child processes. OneDrive does not support symbolic-link/junction synchronization.
- Current application association and shortcuts point at HUANDENG; installation should consistently register and verify them. The supplied mark still has an opaque white background.
- The portable authoring skill already discourages decorative templates, but needs a concrete reference-first visual review and milestone-only changed-page history workflow.

## Accepted product direction

One desktop workspace has Home and persistent Project tabs. Each Project contains a Slides document and read-only file documents. Pages owns slide/Section navigation with Thumbnails and Outline. Project retains project-level Story, Presentation composition and settings. Activity is Project-scoped and reports actual client events and writer results. No private examples, screenshots, paths or research data are release fixtures.
