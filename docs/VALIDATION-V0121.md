# Editor 0.12.1 validation

Accepted clean runtime: **c82b36885ed125c348b3a5e110aff141f221d515**, built **2026-11-08T23:57:51.4525420Z**, Editor **0.12.1**, Electron **38.7.2**. Runtime source and delivery-only documentation commits are separate.

## Gates

| Gate | Result |
| --- | --- |
| Full units | 100 files; 1,102 passed and one existing platform skip; 72.73 seconds |
| Core TypeScript | Passed |
| Biome | 753 files; no changes required |
| Production build | Passed |
| Clean package | Passed; staged and relocated self-contained checks; 79.70 seconds |
| Matching packaged UI | All seven groups passed; 34.92 seconds; two launches and two normal exits; no renderer errors |
| Independent review | No blocking defects; separate execution confirmed current Main visibility overrides archived visibility in repeated pinned appearances without mutating the archive |

The exact candidate executable ran without a development application override and used a fabricated Project plus isolated profile. Four package screenshots were inspected for selected text, folded card edges, named Page Version History and explicit hidden-slide inclusion. The source Project and manifest order were unchanged by visibility and export filtering.

## Packaged journeys

1. Keyboard text selection renders solid blue with white text and does not change saved artwork.
2. Folding a later Section retains its first-Slide preview, card edges, count, selected Slide and heading position.
3. Create Section works immediately before an existing Section and at deck end. It inserts a cover and stable boundary atomically; one Undo restores the previous structure.
4. Saving a named Page Version produces a visible history entry and an archived snapshot with the saved artwork and Notes.
5. Hide slide retains the editable Slide and Main order, supports Undo, and skips the hidden Slide in current/start/next/previous playback.
6. Actual PDF and PPTX delivery excludes hidden Slides by default and includes them explicitly when requested. PNG directly renders the hidden Slide. The export dialog shows the choice.
7. Normal close and reopen retain Section structure, hidden metadata and the named checkpoint. Show slide restores it to live playback.

The raw acceptance receipts and native output stay local. [Public receipt](evidence/v0121/acceptance.json) contains only allowlisted build identity and result fields. The synthetic screenshots contain no private Project material.

## Observed failures and corrections

The first focused unit pass exposed a test fixture that referenced an SVG without creating it. Supplying that synthetic asset made the archive test valid; product code was unchanged for this correction. The full suite subsequently passed.

The first development UI pass used `downloadUrl` instead of the existing export result's `url`; the harness assertion was corrected to the actual contract. Its seven groups then passed, followed by the exact clean package's seven groups. No product assertion was removed.

The initial commit lacked a local Git author identity. The resumed commit used the established agent identity for that command only. No global identity or unrelated repository settings changed.

## Installation

Guarded ordinary-profile installation passed. The old application exited normally with code zero and changed no Project files on close. The previous package remains retained. The current Project, profile settings, unrelated canonical fixture and installed/candidate byte manifests were protected and checked. The reopened production frontend matches the installed package; its fresh protocol-1 service is writable and owned by the installed main process. The existing local client doctor verified 18 tools and two guides. This read-only connection check is not a new model-authoring task.

Chromium exposed its native window but no renderer accessibility text. The installer recorded that limitation and used the unchanged `flushBeforeLeave` close veto, a normal exit, and fresh before/after inventories. It did not discard drafts, force termination, rewrite preferences or restore any historical Project baseline. Detailed receipts and Project inventories remain private.
