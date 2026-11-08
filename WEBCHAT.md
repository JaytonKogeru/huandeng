# HUANDENG Editor

## Objective and decisions

Deliver a usable scientific React/Electron PPTD editor with one GUI/CLI/MCP writer. Read the original `docs/SPEC.md`, historical coverage `AUDIT-V05-COVERAGE`, current `AUDIT-V09`, `SPEC-V09`, `IMPLEMENTATION-V09`, `VALIDATION-V09`, and `HANDOFF-V09`. Earlier detailed invariants and diagnostics remain in their versioned reports. Keep HUANDENG Editor, HUANDENG Story and HUANDENG Plugin as the product names.

The user authorizes autonomous audit, implementation, testing, installation and meaningful private-origin milestones. Spend most effort on functionality and real workflows; use focused validation for concrete risks. Animation serves a live talk: clicks reveal, emphasize, move and remove objects, then advance slides. Preserve existing MP4 compatibility. Do not drift into general video editing or add an editor model executor/chat box. Review subagent proposals before accepting them.

## Delivered milestone: v0.9

Clean runtime `17de86d0b49f23c3c7aafe901f3de748d3bcc7e3`, product 0.9.0, Electron 38.7.2, built `2026-11-08T02:35:06.3605865Z`, sourceDirty=false. Runtime provenance stays fixed when delivery documents advance HEAD. Desktop product version is separate from inherited npm package versions.

Installed at `D:/_Proj/Huandeng/dist/HUANDENG-win32-x64`. All 29,201 files / 684,294,324 bytes match the accepted SHA-256/size manifest. Self-contained/relocation and two shortcuts' target/workdir/icon checks passed. Ordinary profile reopened the original 80-page project: fresh service epoch, correct main/service parent relation, responsive native window, production static frontend, writable, protocol 1, zero diagnostics. Leave that window open. Old v0.8 is retained at canonical `.verification/installed-v08-backup-20261108-v09`.

The first installation stopped before replacement because the existing v0.8 window had an unsaved project arrangement. No forced termination occurred. The original metadata and visible draft were backed up, then its existing draft was retained through normal Save project. Only the project field of .huandeng/project.json changed; manifest and all80pages/81files stayed byte-identical. Installation/reopen protected the resulting current82file baseline. Do not claim that no metadata was saved, roll back that preserved draft or substitute an older baseline.

Raw installation receipt: v09 worktree `.verification/install-v09-20261108T024834Z.json`; initial failure `install-v09-20261108T023832Z.json`; backup/evidence `preserved-original-project-draft-v09/`. Shareable summary and synthetic screenshots are in `docs/evidence/v09/`; raw research screens, source paths/hashes and client events stay local.

Code gates: Linux1006/1006; Windows1005pass+onePOSIX-onlyskip,total1006/88files; TypeScript and Biome698files passed. Final EXE: editor/language/Agent/live6 + arrangement6 =12/12, no renderer errors, each suite two normal0/null exits. Exact final reports: `.verification/editor-v09/huandeng-editor-v09-i03OYb/acceptance.json`, `.verification/arrangement-v09/huandeng-arrangement-v09-Lod1dl/result.json`. Packaged SDK doctor verified service0.9,18tools,2guides and the current writable synthetic project.

One new durable preview test exceeded default5s in the initial Windows suite; isolated3.035s passed, that test alone now allows15s, and full suite passed. Early UI context-navigation and 52.5%-instead-of50% harness failures remain archived; business assertions were not relaxed. Final language-menu overlay was a real product defect and fixed with closeOnClick. Do not relabel earlier fd30 candidates as the final17de runtime.

## v0.9 implementation contracts

Language: HUANDENG exposes en/zh-CN. Typed catalogs cover business UI, known complete diagnostic templates, native menus and welcome. Desktop preferences are authoritative across random service ports; save before broadcast and roll back on failure. Initialize before React first mount. Browser mode uses its own localStorage. Switching must not remount, lose selection/dirty input/Undo, translate user content or create document transactions. New placeholders use creation language and then become author content. Unknown external errors retain their details. Keep shared ThemeToggle locale bridged.

Arrangement: reuse pointer capture, drafts and group transforms. Freeze targets per gesture; move root selection and exclude descendants/related ancestors. Use rotated visible AABB for movement/alignment/distribution, retaining actual dimensions/angle. Shift held before pointer-down preserves selection during drag, while click-only still toggles selection; snapping respects the locked axis. Threshold5screenpx. Alt bypasses all guides. Equal-gap candidates have a100000checks/axis budget while retaining all edge/center targets. Unrotated resize keeps fixed anchors/min8/ratio; rotated resize has no new guide promise. Selected/slide reference,6align directions,2distribute axes (>=3roots), unequal-size distribution by empty gaps. Precompute all group patches, update once, end interaction once; Esc restores originals. Snap toggle is an app preference.

Proposal preview: store.prepareTransaction is shared with apply; preview returns before persistence, external observation, history/receipt/checkpoint and commit events. No request consumption. Baseline and fields/files/pages/usage changes are bounded and report truncation; new IDs are provisional. Optional previewHash binds the exact transaction, not human approval. Apply still runs original CAS/idempotency/recovery/Undo; old hashless calls remain compatible. Payload edits or concurrent document edits require a fresh plan/preview.

Plugin:18MCPtools plus Story/operations resources and instructions; shared huandeng-story skill uses four-layer purposes, evidence, constraints, click plans, preview, existing authorization, apply and read/render checks. Do not create a second story store. Desktop Project/native menu Connect an Agent generates current-project configurations from its bundled Plugin and Electron Node runtime; it never edits client settings or calls generated config “connected.” Clear inherited HUANDENG_URL so stale service addresses cannot redirect a new project; preserve the matching runtime directory. Desktop IPC accepts only the fixed client choices.

Official @deepseek-ai/dsh0.2.1-rc.2 completed a real72.40s synthetic task, loaded skill/resources, previewed, applied identical payload/hash, read/rendered, and independently matched save/reopen with one history entry and preserved objects. Command: `dsh --profile headless --patch file --json -`. Existing native host auth stays in-process, no credential export/Vault registration. A denied ancillary clock call was not bypassed; optional recordedAt is not verified UTC and guide requires a real clock or omission. The synthetic1920x1080PNG was independently viewed; it is base-state, not animation proof. Codex0.153.1 native config parsing and Claude2.1.318 plugin validation passed, not full model tasks. ChatGPT uses existing authorized DC-WALT CLI, not a new account connector. See plugin evidence for exact scope.

## Persisted product and writer invariants

One Main library, flat Sections and multiple Presentation reference sequences. pageId/shortcode identify content; occurrenceId identifies an appearance; position is derived. Per-appearance notes and named-version pins exist. Dynamic section references need explicit expansion for per-page settings. Main Slides is not PowerPoint Slide Master; arbitrary occurrence visual variants remain unfinished.

PPTD manifest, independent .page files and original media are authoritative. Preserve stable IDs, unknown fields, intentional layout, z-order and original assets. No second TSX save source. Optional quick layouts emit ordinary objects and retain manual overrides. Native export/scientific scope is in SCIENTIFIC-OBJECTS and POWERPOINT-COMPARISON.

GUI/CLI/MCP share expected revisions, idempotent request IDs, one writer lease, bounded atomic-replace retry and journal/receipt recovery. Preserve dirty page/Story/project/chart/animation drafts on failures. Recovery confirms the same receipt before later typing, rejects unknown third-state bytes and never rewrites a failed journal or invents a replacement request. External unrelated changes defer Git checkpoints. Named versions are explicit and portable with archived assets; autosave/Undo is separate.

Keyboard focus scopes distinguish canvas, thumbnails, inputs, dialogs, animation and show. Tab cycles top-level objects; arrows1/Shift10; Enter edits; Esc cancels; F6 switches areas; F1 help. Native inputs retain their semantics. Canvas tabindex0/objectframes-1 and synchronous URL identity avoid earlier measured focus/navigation regressions. Gesture cancellation must precede local Esc consumption.

Assets share one toolbar/sidebar entry and explicit import-and-place. Missing-image repair is CAS-scoped to that usage, not global replacement. Unused means no current Main reference, not safe deletion from named versions. Asset revision URLs are independent of text saves. HD derivatives never replace source-resolution canvas/detail/export. Existing image/chart/history/export cache budgets, disposal/failed-cleanup ownership and fsync guarantees remain; detailed V07/V08 reports describe them.

## Live animation and performance

PageAnimation supports v1 tracks and v2 BuildTimeline. Persist v2 effects only and purely compile into the existing sampler; no dual editable source. Effects:appear/fade-in/fade-out/disappear/pulse/move; triggers:click/with-previous/after-previous. Relative moves accumulate from base geometry. Copy/delete filtering must preserve each original click group's local timing through resolveBuildTiming; naive effect filtering corrupts scheduling. Mixed nonempty v1/v2 paste rejects the transaction; explicit v2→v1 conversion is one CAS/Undo, no reverse inference. Unknown schemas survive.

Preview/show share usePresentationPlayback. Next starts a group, next while playing completes it, next after final completion changes page. Previous at opening enters prior page's final state. Repeated occurrences reset and pins use saved versions. Identity includes page/occurrence/version, first target frame must be correct. Source change/pause/unmount cancel RAF. F5/ShiftF5 restart through restartKey without fullscreen remount; B/dot pauses blackout; native buttons/inputs and repeat keys do not consume steps. none/fade page transitions affect display; reduced motion skips them. Preview hides authoring UI without discarding dirty input or pretending writable documents are read-only.

PNG/PDF/PPTX remain base-state with TIMELINE_STATIC_EXPORT; transitions report TRANSITION_NOT_EXPORTED. Existing silent FFmpeg/libx264 MP4 is compatibility, not a newly expanded video route. Controlled media clocks/native PPTX timing are unfinished. Font/local extent checks do not certify cross-machine glyphs, font versions or Office layout.

v0.8 corrected the old v0.7~398MiB GC observation: Network inspector response retention was a major confound, not evidence of a product leak repaired by v0.8. Same-process Network.disable+GC released~154MiB with stable JS/DOM; exact controls are in VALIDATION-V08. v0.9 adds no new long-session/HD-soak claim and does not rerun the old25/50round matrix. Investigate real retention/incremental reads/SSE backpressure before changing resources. No periodic GC, clearCache, lost Undo, lower original resolution or weakened CAS/fsync.

## Next product order

1. Adjustable authoring space and necessary object operations: contextual inspector, lock/hide, precise layers, interactive crop and paragraph controls. Expanded animation+inspector remains crowded at1040x680. Also reproduce whether saving project arrangement preserves current page: the old v0.8 window moved from the middle of the sequence to page1 during draft preservation; v0.9 not separately measured.
2. Independent audience/presenter workspace, notes, next slide/step, timer and rehearsal with robust close/disconnect behavior.
3. Click-controlled audio/video and lifecycle; then occurrence visual variants with explicit follow/pin/override semantics.
4. A defined native PPTX animation subset, accepted in real Office slideshow. Extend actual Codex/Claude model tasks from the proven DSH workflow.
5. Keep manual guides/rulers, comments, scientific component registry/advanced statistics, masters, full PPTX roundtrip, batch arrangement and file association visible in backlog.

## Working paths, checks and release

Windows canonical `D:/_Proj/Huandeng`; v09 worktree `D:/_Proj/Huandeng-v09-20261108`, branch `editor/v0.9-daily-editor-plugin`. Linux f6df4ab snapshot was only a transfer workspace, never push its history. Preserve canonical modified `tests/fixtures/studio/pages/identities.page`, SHA256 `fe378a48e57b63f2b9e7286578f68eefe856a381422930a6615f920b02622832`; never broad stage/reset/clean it.

Core model/writer/protocol is packages/core/src/pptd; editor is app/routes/huandeng.tsx and app/components/pptd; shared API is vite/routes/pptd.ts; host is packages/desktop; portable agents are plugins/huandeng. Use the complete source map in HANDOFF-V09.

Use installed direct .bin tools or `corepack pnpm` (plain pnpm is not on this Windows PATH). Developer dependencies remain isolated; packaging deploy is hoisted. Do not “fix” duplicate-React environment issues by changing product code/skipping assertions. Focused EXE scripts:verify-editor-v09 and verify-arrangement-v09; clear HUANDENG_DESKTOP_APP for packaged checks. Old v08 interaction/science/recovery/performance scripts remain available for relevant future changes, not mandatory repetition for every edit. Test scientific materials only in explicit copies; never use originals for synthetic transactions.

Only private `origin=JaytonKogeru/huandeng` receives accepted source and annotated milestone tags. v0.9 tag:`editor-v0.9.0`. Explicitly specify repo in gh: default selection may resolve to public open-slide upstream. Verify remote main/branch/tag after push independently of installation; receipt `.verification/v09-remote-delivery.json`. Do not publish npm, push upstream, change visibility, expose a public service or send Issue comments/messages without authorization. Daily work and raw records stay local.
