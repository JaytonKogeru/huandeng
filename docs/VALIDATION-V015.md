# Editor 0.15 validation

Status: source, review, exact packaged acceptance and canonical installation passed. This document distinguishes observed results from untested boundaries.

## Observed source checks

- Task 1: 44 focused tests, core typecheck and repository Biome passed. A full-suite writer-lock test encountered host port EACCES; its isolated nine-test file passed. The final integrated suite is recorded separately below when complete.
- Task 2: 67 focused tests across seven files, core typecheck and repository Biome passed. Independent review found numeric headings were excluded by title inference; the fix was verified with a failing-before/passing-after regression and a clean scoped re-review.
- Existing v0.14 native visual/layout/review regression: 11/11 passed against the integrated source candidate, with zero renderer exceptions. New view/animation acceptance remains a separate run.
- Task 3: 28 focused tests across six files and 12/12 new native workspace/animation checks passed, with zero renderer exceptions. Independent spec and quality review approved the task. The pinned-artwork assertion checks element count rather than a distinct live/checkpoint visual change; this is a disclosed coverage limitation, not a demonstrated product failure.
- Final accepted aggregate unit suite: **113 files passed, 1,197 tests passed, one existing skip**, 94.59 seconds with two workers. The preceding parallel package/test run encountered one host lock-port EACCES and one 5-second timeout; the affected two files passed all 33 tests separately, then the complete low-concurrency run passed. Earlier 1,189-test evidence is not substituted for the final tree.
- The semantic-title fix has eight failing-before regressions and 19/19 passing covering tests, including prior numeric-title tests. Core typecheck passed; repository Biome checked 807 files without changes. Eight portable-client configure/discovery tests passed.

Native scenarios use the actual Electron menu and close-window paths. Guard dialogs are recorded and acknowledged by the harness; physical pointer/menu appearance is not claimed. Chinese composition uses Chromium IME events and exact disk read-back, not a physical Windows candidate popup. Real effect opacity is checked before and after two separate clicks. Both locales, wide/light and narrow/dark Edit/Browser/Notes screens were inspected. Opening every panel at 1040 px leaves a small fitted animation canvas; controls remain accessible, but comfortable fine layout editing at that density is not claimed.

## Review and exact package

Independent task reviews passed. Whole-branch review found a semantic subtitle/title search defect and a private identifier in planning evidence. One bounded fix wave corrected both; scoped re-review independently verified the source fix, exact aggregate parent/tree and outgoing patch. The sanitized aggregate is byte-identical to the reviewed fixed tree and has the original base as its sole parent; intermediate planning commits are excluded from publication.

An actual installed-window inspection then found mixed-language labels in the outer Project strip. A bounded desktop-shell correction updates its language, accessibility labels and Chinese wording; a pre-fix native failure was reproduced, the corrected 12-check native run passed, and a separate scoped spec/quality review approved it. The complete 1,197-test run belongs to core/state aggregate `127e9c8900203ea5abe7dc1774396c4c4cd58fde`; core tracked source is unchanged in the final runtime. The final shell correction is covered by its source and exact-package native language checks.

Accepted clean runtime source: `100659c513161356413eb9ef3707f6e772a64897`; built at `2026-11-09T13:00:57.9576537Z`; Editor/plugin 0.15.0, Electron 38.7.2, core 2.3.1, `sourceDirty: false`. Self-contained hoisted packaging passed before and after relocation. Existing virtual-module build warnings remain disclosed; production output succeeded.

This exact package passed **12/12 new workspace/animation checks and 11/11 existing visual-layout/review checks**, both with zero renderer exceptions. [Synthetic receipts and screens](evidence/v015/README.md) are retained separately from private authoring evidence.

## Plugin delivery

Codex and Claude Code native inventories report the original local plugin enabled at 0.15.0. Configuration comparisons confirmed other Codex settings and other Claude settings/catalogs remained unchanged. The durable DeepSeek patch/launcher references existing 0.15.0 paths; model profiles were not changed.

The existing private account plugin is 0.15.0; the exact release receipt is retained in the local upgrade record. Read-back verified all 18 existing files retained, unchanged App binding, complete preserved manifest presentation/default prompts and private USER audience, with the updated workspace instructions. This records installation and saved account release; it does not claim hot-reload in an existing chat or an actual model task.

## Private authoring checks

Private project contents and detailed receipts remain outside Git. One deck had 21 confirmed stable-code footers converted to dynamic Main Position fields; pages without a footer were retained. The other had two missing chapter dividers added in its existing visual style, chapter anchors updated and seven existing index ranges corrected. All original evidence pages and identifiers were retained. Before/after named versions, exact writer receipts, source comparisons and rendered checks were recorded locally.

The existing publisher regenerated both PPTX outputs and reported the configured local shared copies current. One output has 26 slides; the other has 91 visible slides from 92 Main pages because an existing hidden page remains hidden. Archive integrity, dynamic footer text, divider text and index ranges were checked. Existing font/geometry/text-style fallback diagnostics remain in the export reports. This is not a claim of cloud synchronization or a new native Office visual test.

## Installed runtime checks

The canonical 0.15.0 runtime marker matches clean source `100659c513161356413eb9ef3707f6e772a64897`. All 29,285 package files matched the staged copy before replacement. The actual native window restored both Projects and the previous active Project; the final Chinese shell and Section browser were visibly inspected. Preferences retained the expected Project set and locale. All 128 private source-file hashes and the unrelated dirty fixture hash remained unchanged after final launch.

Both installed stdio connections passed discovery and context read-back: 26 and 92 pages respectively, 21 tools, two guides, writable context and operation-review support. These checks did not modify the Projects or execute a client model task. Detailed private receipts remain outside Git. [Handoff](HANDOFF-V015.md) records rollback locations and the first candidate's resolved hidden-launch incident.
