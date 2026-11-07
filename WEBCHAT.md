# HUANDENG Editor

## Objective and product contract

Deliver a usable scientific React / Electron editor with PPTD as the persisted document and one GUI / CLI / MCP writer. Read `docs/SPEC.md` and the successive `SPEC-V02` through `SPEC-V07` decisions. `docs/AUDIT-V05-COVERAGE.md` traces the original requirements; `docs/AUDIT-V07.md` reviews the current UI, workflow, frontend/backend performance and delivery decisions. Keep the existing architecture and the product names HUANDENG Editor, HUANDENG Story and HUANDENG Plugin.

## Current delivered milestone: v0.7

The clean runtime is `ba18ac0d95502361fb8a423a732c808218374915`, product `0.7.0`, built `2026-11-07T21:34:36.5584922Z`, sourceDirty=false, Electron 38.7.2. It is installed at the established `D:/_Proj/Huandeng/dist/HUANDENG-win32-x64` location. All 29,153 files (683,653,487 bytes) matched the accepted package by SHA-256 and size. Self-contained/relocation checks, desktop/start-menu shortcut targets, working directories and source-matching icons passed.

The former v0.6 user window closed normally with CloseMainWindow; no force kill. Its package remains at `.verification/installed-v06-backup-20261108-v07` in the canonical repo. Installed smoke at 2026-11-07T21:50:52.066Z uses an isolated three-page project, static service, writable=true, zero renderer errors, normal 0/null. The real About menu handler returns HUANDENG Editor 0.7.0 through a temporary dialog stub; not a native-dialog screenshot. PATH FFmpeg/libx264 is available. The package does not bundle/download FFmpeg or hard-code a machine path.

The ordinary profile reopened the original 80-page project at 2026-11-07T21:50:57.727761+00:00. Native window responds, service is writable with no diagnostics and video capability available, and all 82 checked manifest/page/metadata hashes remain unchanged. Leave this ordinary window available for the user; never use it for test writes.

Release identifier: `editor-v0.7.0`. Runtime provenance stays at `ba18ac0` when later delivery-document commits advance HEAD. Remote refs must be independently checked after pushing; installation evidence is not a push receipt. See RELEASE-V07, VALIDATION-V07, HANDOFF-V07 and docs/evidence/v07. Prior V06/V05 reports keep their historical provenance.

## Product behavior

One project contains Main Slides, flat Sections and multiple Presentation reference sequences. Overview and used-by navigation open exact page/presentation/occurrence identities. UUID/pageId and short code identify content; occurrenceId identifies an appearance; position is derived order. Explicit page references allow per-appearance notes and named-version pins. Dynamic whole-section references must first be expanded into independent page references for per-page configuration. Arbitrary occurrence visual overrides are not implemented.

PPTD manifest, independent .page files and original media remain authoritative. Preserve IDs, unknown fields, intentional layout, manifest and z-order. Presentation order is a separate reference list. No second TSX save source. Optional quick layouts generate ordinary objects and retain manual overrides. Scientific editing and native export scope remain documented in SCIENTIFIC-OBJECTS, POWERPOINT-COMPARISON and PROJECTS.

Keyboard scope distinguishes canvas objects, thumbnails, native inputs, dialogs, timeline and presentation. Tab cycles top-level objects, arrows move 1 / Shift 10, Enter edits, Esc cancels or returns, F6 switches workspaces and F1 opens help. Native text editing retains its commands. Keep canvas root tabindex fixed at 0 and object frames at -1: changing a focused root tabindex introduced measured 44–46 ms overhead. Fast navigation uses the latest synchronous URL identity because React Router transitions can lag behind focus. Gesture Esc cancellation must precede local canvas consumption.

Asset library is the common toolbar/sidebar entry, with explicit device import-and-place. It supports search, previews, usage, locating, reuse and missing-image repair. Repair is scoped to a missing/unavailable native image usage and uses CAS; do not describe it as global replacement or cleanup. Unused means unreferenced by current Main, not safe to delete from versions. Resource URLs follow the asset revision, not unrelated text saves. Chart SVG cache has 32 entries plus an estimated 8 MiB UTF-16 budget and LRU eviction.

Story briefing combines Main/Section/Presentation/Page, neighbors, occurrence notes, pins, assets and revisions. Selection is read separately first; briefing does not automatically embed selected objects. CLI/MCP share the opened document writer and expose 17 tools, including MP4 export plus export status/cancel. The packaged CLI was used for real stdio status on a completed job. Local stdio launcher is verified, with Claude Code packaging and Codex config examples. Actual client installation, private ChatGPT connection and marketplace deployment are separate unfinished gates. Do not create another model executor or an editor chat box.

Timeline schemaVersion 1 supports x/y, rotation, scaleX/scaleY and opacity tracks, integer-ms keyframes, linear/ease-in-out/hold, cues and up to 600000 ms per page. Multi-track editing, preview, playback and cue presentation use pure sampling; base geometry is not rewritten each frame. Page copy remaps targets, deletion prunes tracks, Undo and named versions preserve animation. Unknown future schema stays intact. PNG/PDF/PPTX export the base layout and report TIMELINE_STATIC_EXPORT. MP4 is now implemented: deterministic seek, one occurrence mounted, resource readiness, PNG pipe backpressure to optional FFmpeg/libx264; 720/1080p,24/30fps, silent, no page transitions. Default static 3s/end 1s/cue extra 0s; max600s/18000frames. Repeat and pinned occurrences remain exact; ambiguous page-only selection fails. Autonomous GIF/APNG/animated WebP/SVG are explicitly rejected for video. Native PPTX animation/media-clock sync are not implemented. See docs/ANIMATION.md.

Font checks use real local enumeration / loaded faces and effective stacks, not FontFaceSet.check as existence proof. Local rendered text/formula/table extent checks can locate objects and become stale after changes. They do not certify glyph coverage, font versions or Office layout, and do not auto-shrink or reflow.

## Saving and collaboration invariants

GUI/CLI/MCP share expected revisions, idempotent request IDs, bounded atomic-replace retry, journal/receipt recovery and one writer lease. Dirty page, Story, project, chart and timeline drafts must survive navigation failures and external changes. Timeline draft identity includes page/occurrence/version; unknown schema or deleted source cannot silently clear a draft. A recovered receipt confirms only the same request; clear dirty only when persisted timeline equals the draft and no input/drag remains unconfirmed.

Preserve the v0.5 Windows recovery repair and its failure archives. Recovery confirms the original request receipt before replaying later typing, refuses unknown third-state content, keeps specific recovery diagnostics and defers Git checkpointing when other-page/manifest/metadata changes are observed externally. Never repair a failure by overwriting the original journal or manufacturing a new request. Named page versions remain explicit and portable with their assets; autosave/Undo are separate.

Preview pauses base editing without making the underlying writable document appear read-only. Save state must use actual pageReadonly. Future animation UI changes must preserve one completed drag / one transaction and Escape cancellation.

## Resource and interaction invariants added in v0.7

Single horizontal 56px header and unified export dialog. Preview releases base inspector without changing manual preference. Fit-to-window must use actual remaining height in short windows; manual zoom may scroll. Do not reintroduce min-h-64. Portal reduced-motion must reset independent translate/scale using initial/active rules that survive LightningCSS; preserve dialog centering and focus. New tracks select the endpoint and prompt a value edit without guessing motion; UI seconds convert exactly to persisted integer ms. Focus intentions carry page/occurrence identity so stale router commits cannot consume them.

History holds summary/index plus hot full states <=8 entries/4MiB estimated UTF-16; all disk history remains. Read-only new observations use an owned temporary directory and explicit errors when unavailable. getCurrentSnapshot is a queued committed read; explicit refresh still checks external bytes. Checkpoint event projections avoid full clones; queue tails do not retain completed snapshots. Returned snapshots stay isolated; same-length/restored-mtime CAS remains.

HD previews: grid/thumbnails use optional 320/640px PNG derivatives; canvas/details/dimensions/export use originals. True SHA256 uses revision, other hints use hint; check before200/304, old revision409, strong ETag/private no-cache. Two read/encode slots, queue32, disk256entries/128MiB,32Mpixel budget, owned children/timeouts; missing encoder/unsupported/failure falls back to verified originals. Read via file handle/stat with fixed allocation+one-byte growth probe and finally close. Eviction only deducts after successful delete; cleanup failures retain ownership and stop new derivative allocations while falling back.

Export workspace: one active heavy job/project; frozen snapshot/assets; unique immutable downloads streamed from disk. Release work references on every outcome. Default latest8/15min; downloading pins prevent premature eviction; published Exports files remain. Main-file rename is the commit point. Earlier failures/cancel keep the old file; later sidecar update failure returns success+warning. Cleanup errors cannot undo a published success; retain owned paths and retry with a hard bound of8 failed-cleanup jobs. Dispose closes owned browser/encoder/streams; external locks may remain with warning. Renderer status404 releases controls, transient network errors keep polling. Do not confuse mocked fs.rm/EBUSY export tests with real Windows page-save lock tests.

## Verified outcome and limits

Code gates: Linux918/918; Windows917 pass+one POSIX-only skip,total918;79files. TypeScript and Biome637files pass; clean build/package exit0. Final EXE: keyboard14,UI12,animation16,project/assets11,video16,desktop7,editor8,recovery6,HD6,fallback6 =102/102 with no renderer errors. New suites record0/null; old desktop/editor reports do not record exit tuples. Installed smoke independently records0/null. Actual MP4 probe is1280x720/24fps/36frames/1.5s; decoded first/middle/last red-frame x=186/506.004/826. Do not claim all output combinations or ten-minute limit were exercised.

80-page copied project,50 insert/delete pairs,1600x1000/DPR1: startup observation6.003s,visual Delete median25.6ms,persistence observation245.75ms,ack/button-ready403.80ms. DOM1777 stable,80 thumbnail buttons/6 preview renderers/7 total renderers. Original82 hashes unchanged. OS cache not cleared; current canvas has0images, so this is not HD image validation. Source and final package reports are distinct.

Near-adjacent same-harness20pair control: old v06 visual26.30/persistence211.65/ack495.05ms; installedv07 26.85/255.45/418.50ms. Post-persistence work is shorter, but earlier file visibility is slower. Existing evidence does not establish the queue/watcher phase root cause; do not call overall persistence faster using isolated store-flow timing.

Final50pairs: service working set about212-223MiB; renderer159.37→497.30MiB,explicitGC→397.83MiB;JS13.70→56.47→17.01MiB. Renderer growth remains unresolved. CDP global nodes/listeners3968/586→5666/5861→4066/747 afterGC; mounted DOM is a different measure. No multi-hour stability or no-leak claim.

HD final:30pages/30distinct3840x2160images/3sweeps/90truechanges. Derived vs fallback31deduplicated positive-length representations797,062 vs119,177,776bytes; this is representation size, not total traffic. Original canvas/export retained,1920x1080PNG verified. Mean switching245.91 vs311.16ms; aggregateP95~512/510ms (no globalP95 improvement claim); later sweeps and max improve. GPU/Tab last interval trends toward a plateau, JS/service still vary. FinalTab~387/439MiB,peak~515/687MiB. No multi-hour inference. Both6/6,normal0/null.

Windows isolated store diagnostic uses v07 code legacy-flow vs current-flow:40cycles,reads6600→3400,loads/clones80→40,median299.00→207.97ms. Linux separate actualv06source comparison99.51→64.56ms. Never mix internal timings with GUI persistence.100external versions keep hot8/2,288,800estimatedbytes;oldpreview/restore pass.

m6A57slide actualOffice reference remainsv06 evidence; not re-run in v07 and not PPTX import support. Scientific originals, screenshots and path/hash inventories stay local. Shareable v07 screenshots contain synthetic content only and no PNG metadata. Actual Codex/Claude client installation, privateChatGPT connection, editable occurrence variants, nativePPTX animation, audio/media clock, paths/curves, dual-screen rehearsal, comments/fullPPTXroundtrip/cross-machine collaboration remain unfinished. Prioritize renderer retained-resource and pre-persistence phase attribution, then animation efficiency/adjustable workspace, real presentation variants and actual client entry. Follow Audit→Spec→Implementation→Validation.

## Source map and work rules

- packages/core/src/pptd: model, writer, persistence, assets, timeline, Story, CLI/MCP and exports.
- packages/core/src/app/components/pptd and app/routes/huandeng.tsx: editor, workspaces and rendering.
- packages/core/src/vite/routes/pptd.ts and pptd/static-server.ts: shared local API and production serving.
- packages/desktop: Windows host, release identity and launcher. HUANDENG_DEV_SERVER=1 selects hot reload; normal desktop uses the prebuilt frontend.
- tests/fixtures: synthetic documents. Production research materials are external.

Use focused checks for concrete changes. Full milestones require code gates and actual packaged/installed acceptance. Current harnesses: verify-keyboard-v07,verify-ui-v07,verify-animation-v07,verify-video-v07,verify-hd-assets-v07,verify-installed-v07. Preserve prior project/assets,desktop/editor/recovery and science/export checks. benchmark-editor-v07 accepts1–50cycles and optional memory/CPU profiling; build-store-diagnostic-v07 and diagnose-store-v07 reproduce service flow. Profiling timings are not normal response baselines.

Canonical Windows repo is D:/_Proj/Huandeng; v0.7 worktree D:/_Proj/Huandeng-v07-20261108,branch editor/v0.7-workspace-video. Linux local snapshot ad4168db is a transfer workspace,never push its history. Preserve canonical modified tests/fixtures/studio/pages/identities.page,SHA256 fe378a48e57b63f2b9e7286578f68eefe856a381422930a6615f920b02622832;do not stage,reset or overwrite it.

The user authorizes autonomous development, testing, installation and meaningful private-origin milestones. Daily work and notes stay local. Push source and annotated milestone tags after acceptance and delivery documentation. Do not send issue comments/messages without explicit authorization; do not publish npm, push OpenSlide upstream, expose a public service or change repository visibility. Never use scientific originals for test transactions.
