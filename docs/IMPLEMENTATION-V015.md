# HUANDENG v0.15 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Execute tasks sequentially with fresh task reviews. User authorized audit → spec → implementation → acceptance without another planning approval.

**Goal:** Deliver coherent bilingual workspace views, permanent Slides, section browsing, notes authoring and discoverable interactive playback.

**Architecture:** Reuse the shared writer, snapshot, selection, animation and notes drafts. Extract view components rather than duplicating the route's document model. Private deck edits and final packaging are controlled separately from source implementation.

**Tech Stack:** React, TypeScript, Electron, existing Tailwind/renderer, Vitest, native Electron acceptance.

**Spec:** docs/SPEC-V015.md; evidence docs/AUDIT-V015.md.

## Global Constraints

- UI locale values remain `zh-CN` and `en`; translate UI-owned text only. Keep authored slide text, titles, notes, paths, IDs and figure pixels verbatim.
- Slides is a permanent document; Ctrl+W closes only an active file preview. Explicit Project/window close remains available and uses existing draft guards.
- Use the existing shared writer and revision checks. Do not introduce an independent page, notes, order or review store.
- Keep pageId, mainPosition, occurrenceId and versionId distinct. Repeated and pinned presentation occurrences must keep their identity and read-only semantics.
- Use existing dependencies. Preserve unrelated work and private project content outside Git.
- Use `corepack pnpm`; add a core changeset; editor/plugin versions are independent of core package versions.

## Review Focus

1. Switching locale must not translate authored content or lose drafts (Task 1).
2. Native Ctrl+W and browser key capture must both preserve the permanent Slides document, including when focus is in text input (Task 1).
3. Repeated/pinned occurrences must not collapse onto pageId or change Main ordering (Task 2).
4. Filtered/collapsed section views must not produce ambiguous drop boundaries or lose selection (Task 2).
5. Animation/notes drafts, Chinese composition and changing views must not silently discard unsaved data (Tasks 2–3).

### Task 1: Bilingual application navigation and permanent Slides

**Files:** Modify `packages/core/src/locale/huandeng.ts`, locale message modules, `packages/core/src/app/routes/huandeng.tsx`, `packages/desktop/main.cjs`, UI-owned labels found by targeted audit; tests `packages/core/src/locale/huandeng.test.ts`, `packages/core/src/app/lib/pptd-keyboard.test.ts` and existing desktop test conventions. Add one core patch changeset.

**Interfaces:** Preserve existing onCloseDocument/closeFilePreview, AgentConnectionDialog and executeCommand presentation behavior. Expose no new document store. Later tasks add workspace views within the same permanent Slides tab.

- [x] Add focused failing assertions: zh terms Properties/Layout/Layers/Story/Checks/Notes/Project/Section correctly Chinese; en reverse remains English; authored parameters and unknown prose untouched; fixed Slides close policy returns no project-close action.
- [x] Remove productVocabulary and fill UI-owned bilingual gaps in visible editor, dialogs and native menus. Audit source-generated labels rather than translating arbitrary DOM text. Update obsolete locale expectations only to the specified language behavior.
- [x] Move Agent connection from Project body to top application actions beside Activity; preserve `data-hd-agent-connect` and same dialog. Localize visible copy and tooltip.
- [x] Protect permanent Slides in native close-document handler and key capture. Close active file as before; no fallback closeProject. Keep explicit project/window close guarded. Label base tab “幻灯片 / Slides”.
- [x] Add an explicit presentation menu with `从头放映 / From beginning` and `从当前页放映 / From current slide`, F5 and Shift+F5 hints, calling existing commands. Preserve empty/hidden pages and draft guards.
- [x] Run focused tests, core typecheck and Biome; commit scoped files. Record native assertions to be exercised by Task 3/controller.

### Task 2: Section browser, notes page and compact navigation

**Files:** Create `packages/core/src/app/components/pptd/workspace-views.tsx` for view switch and preview helpers, `section-browser.tsx`, `notes-page-view.tsx`; pure grouping/selection helpers and tests under `packages/core/src/app/lib/`; modify route integration, `thumbnail-rail.tsx`, relevant locale and styles. Reuse existing ThumbnailSection, PptdPageRenderer/SlideCanvas and notes draft behavior.

**Interfaces:** Add type `WorkspaceView = 'edit' | 'browse' | 'notes'`. Route owns view state, current page/occurrence and existing callbacks; components consume snapshots and callbacks, never create another writer. Preserve existing file tab state. Share existing notes onChange/composition/readonly path with NotesPanel. Root accepts reasonable prop naming local to these components.

- [x] Add tests for section order/unassigned pages, empty/search/no result, long titles, same page repeated with different occurrence IDs, pinned identity, and filtered/collapsed movement boundaries. UI tests/acceptance must verify note edits survive view changes and composition.
- [x] Add localized Edit / Section browser / Notes page controls inside the Slides workspace. Show insertion/selection tools and Inspector in edit only; files remain independent. Preserve selection on switching and clear transient preview safely; block switching that would discard auxiliary drafts.
- [x] Implement responsive actual-preview grid grouped by valid contiguous sections. Section headers show title/count and collapse control; ungrouped pages explicit. Include query, thumbnail size (small/medium/large), selected state, primary Position and secondary Slide ID, double-click/Enter edit. Search matches authored title/story/ID and section title. Keep missing images/empty states legible.
- [x] Repair `pptd-project-source.ts` title/search helpers: respect explicit title/metadata elementRoles; exclude derived position fields and prefer prominent upper headings over preceding footer/citation objects. Include existing Story in search. Test imported generic-ID footer/citation/heading order, explicit roles, empty title, field-only page and Story-only search without changing authored content.
- [x] Provide Main sorting using existing `moveAtBoundary`/shared writer callbacks and explicit keyboard move controls; suppress ambiguous drag reorder when filtering. Keep section management routed to existing dialog. Presentation browser preserves occurrence order and identity and offers no Main reordering; clarify read-only/pinned state. Do not assume first page is a divider.
- [x] Implement Notes Page preview and wide notes textarea with previous/next controls, sharing existing draft callbacks. Presentation occurrence notes use existing edit path; pinned versions remain read-only. Preserve IME and long-text scrolling; do not render duplicate editable notes controls simultaneously.
- [x] Reduce thumbnail insertion gap to a compact stable baseline (4–8 px), retain visible focus/insertion and drag target without hover layout jumps. Verify actual screenshot spacing, not only CSS tokens.
- [x] Run focused unit tests, core typecheck, Biome; commit scoped work with report of actual behavior/limits and selectors for native acceptance.

### Task 3: Animation workflow, plugin guidance and native acceptance

**Files:** Modify `animation-panel.tsx`, `build-panel.tsx` and locale messages as necessary; docs/ANIMATION.md; plugin skill/references for workspace/position/section/animation instructions; create `scripts/verify-workspace-v015.mjs` using existing native acceptance harness and synthetic fixtures. Version/packaging metadata remains controller-owned.

**Interfaces:** Keep existing v1/v2 animation schema, shared preview/presenter engine, writer revisions and entry callback. Consume Task 1 and Task 2 actual selectors from their reports. Use no private research fixtures.

- [x] Inspect animation UI and add concise localized hierarchy/instructions: selected-object effects, click-step sequence, separate page transition; retain advanced timeline. Show static-export limitation where relevant. No second animation entry or engine; no animation-video feature.
- [x] Ensure empty selection offers concrete choose-object next action; preview/save/reset states and blocked unsaved animation transitions are clear. Add meaningful focused behavioral tests if changed logic requires them.
- [x] Update plugin generic workflow for UI language vs authored language, Position vs stable ID, Section anchor vs divider, task views, explicit playback origin, render/inspect and real saved receipts. Preserve configure/report evidence distinction, public app binding and client compatibility.
- [x] Add and run native synthetic acceptance covering: zh/en UI while authored text unchanged, fixed Slides Ctrl+W vs file close via actual native menu, Agent moved, small thumbnail gaps, Section browser/selection/filter/collapse/move, repeated/pinned occurrences, Notes edit/save/view changes, from-beginning/current show, two click effects and exit, auxiliary draft guard. Include light/dark and narrow viewport screenshots without private material.
- [x] Run focused tests, typecheck, Biome and native script with existing Electron runtime; commit and provide acceptance report with failures honestly unresolved.

## Controller delivery work (after task gates)

- [x] Apply separately recorded footer-correction deck footer corrections and section-divider deck missing divider decisions through existing writer; render private results and keep baseline/receipts outside Git.
- [x] Run one complete unit suite and full repository Biome, typecheck, build. Perform whole-branch independent review.
- [ ] Prepare editor/plugin v0.15 release notes/handoff and version metadata per release policy; package, test packaged runtime, safely replace installation with rollback, restore open projects. Deliver compatible local/client plugin updates without claiming unobserved client execution.
- [ ] Preserve main dirty fixture; integrate accepted commits and push one verified origin milestone/tag as repository workflow authorizes. No npm publish or upstream push.

## Observed desktop-strip completion

- [x] Actual installed-window inspection found remaining mixed-language Project-strip tooltips and accessibility labels. Translate them through the existing shell locale/render path and set document language, preserving authored titles/paths/selection/close behavior.
- [x] Extend the native language loop to inspect the real shell document. Reproduce the pre-fix failure and pass all 12 source-native checks after the bounded fix.
- [ ] Complete scoped review and exact final package/installation verification before the milestone push.
