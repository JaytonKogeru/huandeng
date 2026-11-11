# HUANDENG v0.14 Implementation Plan

> For agentic workers: use superpowers:subagent-driven-development for isolated implementation tasks and scoped reviews. Execute continuously under the user's explicit authorization.

**Goal:** Connect workspace hierarchy, source-based layout and exact Agent change review.
**Architecture:** Reuse the Project writer, journal, renderer, Assets and recipes. Add a read-only review API; connect it to Activity and live page navigation. Preserve PPTD schema and older clients.
**Tech Stack:** React, TypeScript, Electron 38.7.2, existing Vite service, Vitest, Playwright; no new dependencies.
**Spec:** [SPEC-V014.md](SPEC-V014.md), [AUDIT-V014.md](AUDIT-V014.md).

## Global Constraints

- Worktree `<workspace-checkout>`, base `5040bb1`; preserve unrelated files and private Projects.
- Synthetic fixtures only. One revision-checked writer; no direct document writes from UI/plugin.
- English/Simplified Chinese, light/dark, 1040px/1600px desktop widths.
- Exact operation identity; null only for truly absent sides; unavailable history fails honestly; current-asset/theme limitations visible.
- Existing APIs compatible. Editor/plugin 0.14.0 independent of core npm package; add changeset, never npm publish.
- Use `corepack pnpm` 10.17.0 or installed direct tool entry points; no unrelated dependency updates.

## Review Focus

1. Rapid operation/page/Project changes must not display stale asynchronous responses.
2. Notes/Story-only edits, additions and removals require correct historical sides.
3. Same image path does not prove original bytes; theme provenance is independent of asset provenance.
4. Layout preview must include existing content and exactly match committed generation.
5. A client report is not an independently verified heartbeat or writer receipt.

### Task 1: Exact operation review service and tools

Files: `pptd/{types,store,page-history,activity,mcp,cli,agent-guide}.ts`, `vite/routes/pptd.ts`, `app/lib/pptd-backend.ts`, adjacent tests. Paths are under `packages/core/src/`.
Interfaces: produce `OperationReview`/`OperationReviewChange`, `PptdStore.operationReview(operationId,pageId?)`, `GET /reviews/:operationId?pageId=`, `PptdBackend.operationReview`, `huandeng_review`, CLI `review`; optional bounded Activity `operationIds`.

- [x] Write and run failing tests for consecutive changes, notes/Story-only changes, additions/removals, missing evidence, invalid IDs, theme provenance and Activity bounds/legacy reports.
- [x] Implement R2/R4 data contracts using journal evidence. Cap changes at 100; operation IDs per client report at 20. No new named versions or full-project duplicate store.
- [x] Run affected history/review/Activity/MCP/API tests and typecheck. Format, commit only owned files; scoped independent review.

### Task 2: Activity and visual change review

Files: `app/components/pptd/activity-panel.tsx`, new `operation-review-dialog.tsx`/helper, `app/routes/huandeng.tsx`, `locale/huandeng.ts`, focused tests.
Interfaces: consume Task 1; Activity page/operation navigation callbacks; dialog consumes backend/snapshot/theme and live-page/object navigation. Root owns open/selection state.

- [x] Test truthful client/writer labels and change summaries.
- [x] Build readable activity rows with affected pages, explicit receipt links and technical details disclosure.
- [x] Build actual-renderer before/after dialog with page picker, bounded changes, object highlighting, Story and usage scope; null/error/truncation/current-assets cases and stale response protection.
- [x] Keep review read-only; route restoration to existing History. Typecheck/tests/format/commit, then scoped review.

### Task 3: Visual layout authoring

Files: `app/components/pptd/{recipe-panel,inspector,title-layout-panel}.tsx`, new picker/preview helper(s), locale/tests.
Interfaces: use `createRecipe`, Assets, renderer and existing onApply; distinct Layout Inspector tab; preserve title matching and recipe binding/reset.

- [x] Test full composed preview and payload equivalence, revision invalidation and invalid sources before implementation.
- [x] Visual recipe thumbnails, bounded project image picker, actual composed preview, advanced path fallback.
- [x] Commit the exact previewed payload/revisions only on Add; disable pinned/read-only and missing inputs. Preserve existing objects and source pixels.
- [x] Focused tests/typecheck/format/commit and scoped review.

### Task 4: Workspace hierarchy and connection evidence

Files: desktop workspace shell CSS/JS as needed, `app/styles.css`, route/page-scope component, Section editor, Agent connection dialog, locale/tests.
Interfaces: current live/pinned usages from `projectInsights`; observed client reports from Activity. No fabricated heartbeat or cloud state.

- [x] Align fonts/selection/focus/appearance and distinguish navigation levels; expose current page context and scope.
- [x] Disclose technical identifiers; retain copy and keyboard behavior.
- [x] Setup status and last client-report evidence remain distinct. Check narrow/wide and English/Chinese.
- [x] Focused tests/typecheck/format/commit and scoped review.

### Task 5: Plugin, full workflow evidence and delivery

Files: plugin skill/references/examples/README/metadata, guide, desktop release metadata, changeset, new `scripts/verify-visual-review-v014.mjs`, release/validation/handoff docs.

- [x] Update plugin around reference-led layouts, exact receipt IDs, actual rendering and separate verification levels.
- [x] Isolated synthetic layout preview→commit→Activity→review→object navigation acceptance, including pinned state and stale selection. Capture full workspace, Layout, Review at wide/narrow sizes.
- [x] Run v0.13 native Project/draft/fullscreen checks, build, typecheck, formatting and plugin validation.
- [x] Whole-branch independent review, fix material findings and verify affected cases.
- [x] Versioned Windows candidate, packaged acceptance, then safe installation preserving drafts. Record real Editor and plugin delivery states.
- [x] Release/handoff docs, screenshots and meaningful local milestone commit. Never claim cloud plugin publication without actual verification.

## Decisions

The user explicitly requested direct execution; no additional approval gate is inserted. Complete source/provenance extraction, inheritable masters and a cloud publisher dashboard remain named subsequent product lines. Review does not manufacture named versions or force approvals.

## Delivered milestone

All five tasks completed. Final source review approved `5040bb1..2f3e627`; the clean runtime package subsequently passed11new+14existing native checks and was installed safely. See VALIDATION-V014.md, HANDOFF-V014.md and UI-WALKTHROUGH-V014.md for source, installation and plugin evidence.
