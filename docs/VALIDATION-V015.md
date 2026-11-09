# Editor 0.15 validation

Status: source implementation and task reviews passed; package/install acceptance remains in progress. This document distinguishes observed results from remaining delivery checks.

## Observed source checks

- Task 1: 44 focused tests, core typecheck and repository Biome passed. A full-suite writer-lock test encountered host port EACCES; its isolated nine-test file passed. The final integrated suite is recorded separately below when complete.
- Task 2: 67 focused tests across seven files, core typecheck and repository Biome passed. Independent review found numeric headings were excluded by title inference; the fix was verified with a failing-before/passing-after regression and a clean scoped re-review.
- Existing v0.14 native visual/layout/review regression: 11/11 passed against the integrated source candidate, with zero renderer exceptions. New view/animation acceptance remains a separate run.
- Task 3: 28 focused tests across six files and 12/12 new native workspace/animation checks passed, with zero renderer exceptions. Independent spec and quality review approved the task. The pinned-artwork assertion checks element count rather than a distinct live/checkpoint visual change; this is a disclosed coverage limitation, not a demonstrated product failure.
- Final integrated unit suite: **112 files passed, 1,189 tests passed, one existing skip**, 71.46 seconds. Core typecheck passed. Full repository Biome checked 806 files without changes. Eight portable-client configure/discovery tests passed.

Native scenarios use the actual Electron menu and close-window paths. Guard dialogs are recorded and acknowledged by the harness; physical pointer/menu appearance is not claimed. Chinese composition uses Chromium IME events and exact disk read-back, not a physical Windows candidate popup. Real effect opacity is checked before and after two separate clicks. Both locales, wide/light and narrow/dark Edit/Browser/Notes screens were inspected. Opening every panel at 1040 px leaves a small fitted animation canvas; controls remain accessible, but comfortable fine layout editing at that density is not claimed.

## Private authoring checks

Private project contents and detailed receipts remain outside Git. One deck had 21 confirmed stable-code footers converted to dynamic Main Position fields; pages without a footer were retained. The other had two missing chapter dividers added in its existing visual style, chapter anchors updated and seven existing index ranges corrected. All original evidence pages and identifiers were retained. Before/after named versions, exact writer receipts, source comparisons and rendered checks were recorded locally.

The existing publisher regenerated both PPTX outputs and reported the configured local shared copies current. One output has 26 slides; the other has 91 visible slides from 92 Main pages because an existing hidden page remains hidden. Archive integrity, dynamic footer text, divider text and index ranges were checked. Existing font/geometry/text-style fallback diagnostics remain in the export reports. This is not a claim of cloud synchronization or a new native Office visual test.

## Delivery checks still to record

Final whole-branch review, clean runtime revision, exact packaged acceptance, canonical installation, restored Projects and client/account plugin read-back.
