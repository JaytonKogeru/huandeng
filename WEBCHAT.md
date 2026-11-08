# HUANDENG Editor

## Objective and accepted v0.10 runtime

HUANDENG is the user's scientific React/Electron PPTD editor with one shared GUI/CLI/MCP writer. Preserve upstream attribution. The user authorizes autonomous Audit → Spec → Implementation → Validation → Release, real Windows installation and significant private-origin milestones. Use independent subagent UX reviews and practical user journeys. English is the default; Chinese retains core English product vocabulary. Do not add a reverse proxy or public tunnel for Agent access.

Read `docs/AUDIT-V010.md`, `SPEC-V010`, `IMPLEMENTATION-V010`, `VALIDATION-V010`, `RELEASE-V010`, `HANDOFF-V010` and `WORKFLOW-V010`. The interrupted v010 worktree was recovered at f62dd72; no completed prior audit/spec/implementation was found. Two fresh independent audits repeated the same workflow and implementation was integrated after review.

Accepted runtime: `54513193b5e8004d51815265b75d99e6425cfba1`, product 0.10.0, Electron 38.7.2, clean build `2026-11-08T06:50:30.6528822Z`. Desktop version is separate from inherited npm versions. Later delivery documentation and UI-harness refinements do not change the accepted runtime bytes. Milestone: `editor-v0.10.0`, private origin `JaytonKogeru/huandeng`.

Installed at `D:/_Proj/Huandeng/dist/HUANDENG-win32-x64`; all 29,214 files / 685,392,219 bytes match the accepted manifest. Both shortcuts verified. Ordinary English profile reopened the original 80-page Project, writable protocol 1, zero diagnostics, fresh service epoch, responsive window and verified packaged frontend/service. The app was left open. Retain v0.9 at canonical `.verification/installed-v09-backup-20261108-v010`.

All 82 current Project files and the separate protected fixture were preserved; normal close saved 0 files. Raw receipt: v010 `.verification/install-v010-20261108T070716Z-ff9d3c.json`. Preferences were backed up; only uiLocale was explicitly changed to en. Preserve the current baseline: v0.9 intentionally saved an existing Project draft, so never restore historical research data. Shareable evidence remains synthetic/example content in docs/evidence/v010.

Source gates: Windows: 1,028 passed, one platform skip, 1,029 tests in 91 files; TypeScript, Biome: 718 files, production build and self-contained package/relocation passed. Actual packaged UI:7 Project + 17 objects/workspace + 8 Drug Design = 32 groups, zero renderer errors and normal 0/null exits. All ten Drug slides were visually inspected; representative final package screens/renders and compact workspace were also reviewed. No new long-session/high-resolution performance conclusion.

Failed tests remain recorded. Legacy default-Chinese assertions were corrected without weakening business checks. A real zero-height resize handle and immediate-close preference loss were fixed. Submenu automation now waits for an open submenu; Drug automation foregrounds its owned window before export/capture. A diagnostic confirmed real PDF HTTP 200 and 10 pages before screenshot timeout; the exact first HTTP timeout cause was not established. The final unchanged runtime passed all 32 groups.

## v0.10 product contracts

Visual source picker:content title, thumbnail, stable Slide ID, derived Position, search and hover/focus preview. Optional Story/version/occurrence details are collapsed. Save Project preserves the viewed slide/occurrence when its collection and source remain. New Section ranges persist stable start/end page IDs and resolve current Main order. Insertions inside join the range; missing/reversed/overlapping boundaries remain visible diagnostics. Preserve legacy lists until explicit Set range.

Workspace:document header, object insertion toolbar, Settings and identity/zoom footer. Panel-edge controls resize/collapse/reopen. Notes docks below/right and preserves drafts. Mounted Properties/Layers/Story/Checks contexts retain Story/chart drafts. Shared object actions preserve theme-effective formatting, group order and one Undo boundary. Assets defaults to images; Files/All files retains supporting artifacts.

Internal image placement engages pending-import protection before lookup/decode, validates the current asset and retains the original target. Layout persistence uses renderer/revision stamps; the normal leave response carries latest layout after document guards, and the host saves inside its current operation. Preserve stale-write rejection and retryability, and avoid queued IPC deadlock.

Agent setup generates current-Project configuration only. ChatGPT uses existing authorized DC-WALT CLI. Existing 18 MCP tools, shared writer and Story services remain compatible; future providers are distinguished from existing interfaces in EXTENSIONS.md. No built-in model runner or marketplace was shipped.

Drug Design: `examples/drug-design-v010/deck.pptd`, ten native editable Main Slides, three Section ranges, full 10 and brief 5 Presentations, primary sources in Notes/SOURCES. Native PNG/PDF exports are validated; authored scientific examples remain conceptual method/decision slides.

## Persisted product and writer invariants

One Main library, flat Sections and multiple Presentation reference sequences. pageId/shortcode identify content; occurrenceId identifies an appearance; position is derived. Per-appearance notes and named-version pins exist. Dynamic section references need explicit expansion for per-page settings. Main Slides is not PowerPoint Slide Master; arbitrary occurrence visual variants remain unfinished.

PPTD manifest, independent .page files and original media are authoritative. Preserve stable IDs, unknown fields, intentional layout, z-order and original assets. No second TSX save source. Optional quick layouts emit ordinary objects and retain manual overrides. Native export/scientific scope is in SCIENTIFIC-OBJECTS and POWERPOINT-COMPARISON.

GUI/CLI/MCP share expected revisions, idempotent request IDs, one writer lease, bounded atomic-replace retry and journal/receipt recovery. Preserve dirty page/Story/project/chart/animation drafts on failures. Recovery confirms the same receipt before later typing, rejects unknown third-state bytes and never rewrites a failed journal or invents a replacement request. External unrelated changes defer Git checkpoints. Named versions are explicit and portable with archived assets; autosave/Undo is separate.

Keyboard focus scopes distinguish canvas, thumbnails, inputs, dialogs, animation and show. Tab cycles top-level objects; arrows1/Shift10; Enter edits; Esc cancels; F6 switches areas; F1 help. Native inputs retain their semantics. Canvas tabindex0/objectframes-1 and synchronous URL identity avoid earlier measured focus/navigation regressions. Gesture cancellation must precede local Esc consumption.

Assets has one library entry; Image insertion can import and place directly. Missing-image repair is CAS-scoped to that usage, not global replacement. Unused means no current Main reference, not safe deletion from named versions. Asset revision URLs are independent of text saves. HD derivatives never replace source-resolution canvas/detail/export. Existing image/chart/history/export cache budgets, disposal/failed-cleanup ownership and fsync guarantees remain; detailed V07/V08 reports describe them.

## Live animation and performance

PageAnimation supports v1 tracks and v2 BuildTimeline. Persist v2 effects only and purely compile into the existing sampler; no dual editable source. Effects:appear/fade-in/fade-out/disappear/pulse/move; triggers:click/with-previous/after-previous. Relative moves accumulate from base geometry. Copy/delete filtering must preserve each original click group's local timing through resolveBuildTiming; naive effect filtering corrupts scheduling. Mixed nonempty v1/v2 paste rejects the transaction; explicit v2→v1 conversion is one CAS/Undo, no reverse inference. Unknown schemas survive.

Preview/show share usePresentationPlayback. Next starts a group, next while playing completes it, next after final completion changes page. Previous at opening enters prior page's final state. Repeated occurrences reset and pins use saved versions. Identity includes page/occurrence/version, first target frame must be correct. Source change/pause/unmount cancel RAF. F5/ShiftF5 restart through restartKey without fullscreen remount; B/dot pauses blackout; native buttons/inputs and repeat keys do not consume steps. none/fade page transitions affect display; reduced motion skips them. Preview hides authoring UI without discarding dirty input or pretending writable documents are read-only.

PNG/PDF/PPTX remain base-state with TIMELINE_STATIC_EXPORT; transitions report TRANSITION_NOT_EXPORTED. Existing silent FFmpeg/libx264 MP4 is compatibility, not a newly expanded video route. Controlled media clocks/native PPTX timing are unfinished. Font/local extent checks do not certify cross-machine glyphs, font versions or Office layout.

v0.8 corrected the old v0.7~398MiB GC observation: Network inspector response retention was a major confound, not evidence of a product leak repaired by v0.8. Same-process Network.disable+GC released~154MiB with stable JS/DOM; exact controls are in VALIDATION-V08. v0.9 adds no new long-session/HD-soak claim and does not rerun the old25/50round matrix. Investigate real retention/incremental reads/SSE backpressure before changing resources. No periodic GC, clearCache, lost Undo, lower original resolution or weakened CAS/fsync.

## Working paths and release

Windows canonical `D:/_Proj/Huandeng`; v010 worktree `D:/_Proj/Huandeng-v010-20261108`, branch `editor/v0.10-product-workflow`. Linux scratch was a source transfer mirror, never authoritative Git history. Preserve canonical modified `tests/fixtures/studio/pages/identities.page`, SHA256 `fe378a48e57b63f2b9e7286578f68eefe856a381422930a6615f920b02622832`; never broad stage/reset/clean it.

Use `corepack pnpm` on THUG. Run the three `scripts/verify-*-v010.mjs` sequentially against `HUANDENG_DESKTOP_EXE`, clearing `HUANDENG_DESKTOP_APP` for packaged checks; Drug requires `--exports`. Tests create isolated profiles and copies. Raw research content, per-file manifests and client paths stay in ignored .verification; shareable evidence is docs/evidence/v010.

Private origin alone receives significant tested milestones and annotated tags. Never push upstream OpenSlide, npm-publish, change visibility, expose a public listener or send Issue comments/messages without authorization. Verify remote refs independently of installation. Preserve historical source/writer/animation invariants and their focused tests.

The agreed v0.10 finishing scope is complete. Independent audience/presenter windows, full PPTX round-trip/native animation, occurrence visual overrides and a plugin marketplace remain separate future capabilities. Do not silently turn those into new release requirements.
