# HUANDENG Editor

## Objective and product contract

Deliver a usable scientific React / Electron editor with PPTD as the persisted document and one GUI / CLI / MCP writer. Read `docs/SPEC.md` and the successive `SPEC-V02` through `SPEC-V06` decisions. `docs/AUDIT-V05-COVERAGE.md` traces the original requirements; `docs/AUDIT-V06.md` adds the current delivered/partial/missing matrix. Keep the existing architecture and the product names HUANDENG Editor, HUANDENG Story and HUANDENG Plugin.

## Current delivered milestone: v0.6

The clean runtime is `9c27465aa88b5b2b59288f5b321596ad10fcb92c`, product `0.6.0`, built `2026-11-07T16:47:49.8347220Z`, sourceDirty=false. It is installed at the established `D:/_Proj/Huandeng/dist/HUANDENG-win32-x64` location. All 29,141 prepared files (683,432,467 bytes) matched the accepted package by SHA-256 and size. Self-contained/relocation checks and both desktop/start-menu shortcut targets, working directories and source-matching icons passed.

The former v0.5 user window closed normally with CloseMainWindow; no force kill was used. Its package remains at `.verification/installed-v05-backup-20261108-v06` in the canonical repo. Installed smoke uses an isolated three-page project, the static service, writable=true and zero renderer errors, and exits 0 / null. The real About menu handler returns HUANDENG Editor 0.6.0 using a temporary dialog stub; this is not a native-dialog screenshot.

The ordinary user profile reopened the original 80-page project. The native window responds, the static service is writable with no diagnostics, and all 82 checked manifest/page/metadata hashes remain unchanged. Leave this ordinary window available for the user. Do not use it for test writes.

The release identifier is `editor-v0.6.0`. Runtime provenance stays at `9c27465` when later delivery-document or verification-script commits advance the repository. Remote branch/tag/peeled refs must be independently checked after publishing; installation evidence alone is not a push receipt. See `docs/RELEASE-V06.md`, `docs/VALIDATION-V06.md`, `docs/HANDOFF-V06.md` and `docs/evidence/ui-v06`.

## Product behavior

One project contains Main Slides, flat Sections and multiple Presentation reference sequences. Overview and used-by navigation open exact page/presentation/occurrence identities. UUID/pageId and short code identify content; occurrenceId identifies an appearance; position is derived order. Explicit page references allow per-appearance notes and named-version pins. Dynamic whole-section references must first be expanded into independent page references for per-page configuration. Arbitrary occurrence visual overrides are not implemented.

PPTD manifest, independent .page files and original media remain authoritative. Preserve IDs, unknown fields, intentional layout, manifest and z-order. Presentation order is a separate reference list. No second TSX save source. Optional quick layouts generate ordinary objects and retain manual overrides. Scientific editing and native export scope remain documented in SCIENTIFIC-OBJECTS, POWERPOINT-COMPARISON and PROJECTS.

Keyboard scope distinguishes canvas objects, thumbnails, native inputs, dialogs, timeline and presentation. Tab cycles top-level objects, arrows move 1 / Shift 10, Enter edits, Esc cancels or returns, F6 switches workspaces and F1 opens help. Native text editing retains its commands. Keep canvas root tabindex fixed at 0 and object frames at -1: changing a focused root tabindex introduced measured 44–46 ms overhead. Fast navigation uses the latest synchronous URL identity because React Router transitions can lag behind focus. Gesture Esc cancellation must precede local canvas consumption.

Asset library supports search, previews, usage, locating, reuse and missing-image repair. Repair is scoped to a missing/unavailable native image usage and uses CAS; do not describe it as global replacement or cleanup. Unused means unreferenced by current Main, not safe to delete from versions. Resource URLs follow the asset revision, not unrelated text saves. Chart SVG cache has 32 entries plus an estimated 8 MiB UTF-16 budget and LRU eviction.

Story briefing combines Main/Section/Presentation/Page, neighbors, occurrence notes, pins, assets and revisions. Selection is read separately first; briefing does not automatically embed selected objects. CLI/MCP share the opened document writer and expose 15 tools. Local stdio launcher is verified, with Claude Code packaging and Codex config examples. Actual client installation, private ChatGPT connection and marketplace deployment are separate unfinished gates. Do not create another model executor or an editor chat box.

Timeline schemaVersion 1 supports x/y, rotation, scaleX/scaleY and opacity tracks, integer-ms keyframes, linear/ease-in-out/hold, cues and up to 600000 ms per page. Multi-track editing, preview, playback and cue presentation use pure sampling; base geometry is not rewritten each frame. Page copy remaps targets, deletion prunes tracks, Undo and named versions preserve animation. Unknown future schema stays intact. PNG/PDF/PPTX still export the base layout and report TIMELINE_STATIC_EXPORT; no native PPTX animation or video encoding claim. See docs/ANIMATION.md.

Font checks use real local enumeration / loaded faces and effective stacks, not FontFaceSet.check as existence proof. Local rendered text/formula/table extent checks can locate objects and become stale after changes. They do not certify glyph coverage, font versions or Office layout, and do not auto-shrink or reflow.

## Saving and collaboration invariants

GUI/CLI/MCP share expected revisions, idempotent request IDs, bounded atomic-replace retry, journal/receipt recovery and one writer lease. Dirty page, Story, project, chart and timeline drafts must survive navigation failures and external changes. Timeline draft identity includes page/occurrence/version; unknown schema or deleted source cannot silently clear a draft. A recovered receipt confirms only the same request; clear dirty only when persisted timeline equals the draft and no input/drag remains unconfirmed.

Preserve the v0.5 Windows recovery repair and its failure archives. Recovery confirms the original request receipt before replaying later typing, refuses unknown third-state content, keeps specific recovery diagnostics and defers Git checkpointing when other-page/manifest/metadata changes are observed externally. Never repair a failure by overwriting the original journal or manufacturing a new request. Named page versions remain explicit and portable with their assets; autosave/Undo are separate.

Preview pauses base editing without making the underlying writable document appear read-only. Save state must use actual pageReadonly. Future animation UI changes must preserve one completed drag / one transaction and Escape cancellation.

## Verified outcome and limits

Final code gates: Linux 870/870; Windows 869 pass plus one POSIX-only skip, both 75 test files; TypeScript and Biome 615 files pass. Build and package exit 0. Final EXE: keyboard 14, project/assets 11, animation 15, existing desktop 7, editor 8 and recovery 6: 61/61, no renderer errors. New suites explicitly capture normal exit 0 / null; old desktop/editor reports lack that field and must not be retroactively filled. Installed smoke independently records 0 / null.

Final copied 80-page benchmark, 20 insertion/deletion pairs, 1600x1000 / DPR 1: startup observation 5.497 s, visual Delete median 24.7 ms (21.2–36.8), observed persistence median 191.25 ms (179.6–219.9), receipt acknowledgement median 476.7 ms. DOM remains 1820, 80 thumbnail buttons / 7 thumbnail renderers. Original 82 file hashes stay unchanged. OS filesystem cache was not cleared; this is not a nonresident OneDrive cold-start test. The benchmark page has zero images; separate project/assets coverage has at least three decoded images and positive resource-revision tests.

Renderer working set grows 170.36 → 405.01 MiB and falls to 322.01 MiB after explicit GC; JS heap 17.54 → 31.09 → 16.47 MiB; service grows 211.84 → 290.88 MiB. Do not claim long-session memory stability or no leaks. Prior candidate 62.6 ms Delete regression and fixes remain recorded separately from final packaged results.

Real m6A 57-slide PPTX was inspected on a copy in actual PowerPoint without repair and all pages rendered; only selected contact sheets were visually reviewed. Original stayed unchanged. This is requirements/Office reference work, not PPTX import support. Prior scientific/Office export acceptance retains its original v0.4/v0.5 provenance; no new all-page native Office export rerun is implied by v0.6 tests. Scientific originals, full screenshots and path/hash inventories stay local. Two distributable v0.6 UI images use only synthetic content and have no PNG metadata.

Next priorities: long-session/large-image retention analysis; first-animation guidance, time/focus clarity and efficient keyframe operations; explicit repeated-page variants and large-deck compilation; actual Agent client installation; deterministic selected-time rendering before video/media synchronization. High-DPI density preferences, comments, arbitrary React components, full statistical-chart controls, dual-screen rehearsal, PPTX round-trip and cross-machine collaboration remain distinct unfinished items. Follow Audit → Spec → Implementation → Validation.

## Source map and work rules

- packages/core/src/pptd: model, writer, persistence, assets, timeline, Story, CLI/MCP and exports.
- packages/core/src/app/components/pptd and app/routes/huandeng.tsx: editor, workspaces and rendering.
- packages/core/src/vite/routes/pptd.ts and pptd/static-server.ts: shared local API and production serving.
- packages/desktop: Windows host, release identity and launcher. HUANDENG_DEV_SERVER=1 selects hot reload; normal desktop uses the prebuilt frontend.
- tests/fixtures: synthetic documents. Production research materials are external.

Use focused checks for concrete changes; full milestones require code gates and actual packaged/installed acceptance. New harnesses are verify-keyboard-v06.mjs, verify-project-assets-v06.mjs and verify-animation-v06.mjs. Keep existing desktop/editor/recovery, project/science/export and benchmark harnesses. benchmark-editor-v05.mjs supports 1–50 cycles, memory and optional CPU profiling; profile instrumentation timings are not normal response baselines.

Canonical Windows repo is D:/_Proj/Huandeng; v0.6 worktree D:/_Proj/Huandeng-v06-20261108, branch editor/v0.6-authoring-motion. Linux local snapshot 2cec4bfc is a transfer workspace, never push its history. Preserve the pre-existing modified tests/fixtures/studio/pages/identities.page on THUG, SHA-256 fe378a48e57b63f2b9e7286578f68eefe856a381422930a6615f920b02622832; do not stage, reset or overwrite it.

The user authorizes autonomous development, testing, installation and meaningful private-origin milestones. Daily work and notes stay local. Push source and annotated milestone tags after acceptance and delivery documentation. Do not send issue comments/messages without explicit authorization; do not publish npm, push OpenSlide upstream, expose a public service or change repository visibility. Never use scientific originals for test transactions.
