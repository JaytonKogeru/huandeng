# HUANDENG Editor

## Objective and product contract

Deliver a usable scientific desktop editor based on OpenSlide / React / Electron, with PPTD as the persisted document and one GUI / CLI / MCP writer. `docs/SPEC.md` is the Master Product Specification; `SPEC-V02` through `SPEC-V05` record successive product decisions. Read `docs/AUDIT-V05-COVERAGE.md` for combined historical coverage and unfinished work, `docs/AUDIT-V05-VISUAL.md` for visual decisions, and `docs/AUDIT-V05-RECOVERY.md` for the actual Windows save failure and repair. Keep the existing architecture. Visible product names are HUANDENG Editor, HUANDENG Story, and HUANDENG Plugin.

## Current delivered milestone: v0.5

The clean runtime is `03a96957f854ab593400218102928d1feb3c86d0`, product `0.5.0`, built at `2026-11-07T13:26:12.5660629Z`, `sourceDirty=false`. It is installed at the established `D:/_Proj/Huandeng/dist/HUANDENG-win32-x64` location. Packaging, self-contained/relocation checks, desktop/start-menu shortcut targets, working directories and source-matching icons passed. The former v0.4 window closed normally through CloseMainWindow; no force kill was used. Its package is retained in the verification backup noted in `docs/HANDOFF-V05.md`.

The installed EXE opens a three-page synthetic project using the production static service with zero renderer errors. Invoking the actual About menu handler captures `HUANDENG Editor 0.5.0`; this is not a native-dialog screenshot. The ordinary user profile subsequently reopened the original 80-page project: writable, no diagnostics, 82 checked manifest/page/metadata files unchanged. The responsive native window and its service are left open for the user.

The release identifier is `editor-v0.5.0`. Local runtime acceptance does not prove a GitHub push; the publishing step independently checks remote branch/tag refs. The built runtime remains `03a96957` even when later documentation or verification-tool commits advance the repository. Actual provenance and installation receipts are in `docs/RELEASE-V05.md`, `docs/HANDOFF-V05.md`, and `docs/evidence/ui-v05`.

## Product behavior

The foundation remains one Main Slides library per project, flat Sections, multiple Presentation Slides with live or named-version references, per-occurrence notes, and Main / Section / Presentation Story. Main pages retain UUIDs, random short codes and compatible S aliases. v0.5 makes short codes the primary visible identity and displays current order separately; titles, short codes and old aliases remain searchable, and the context menu copies the short code.

Scientific editing includes KaTeX / MathML, merged tables, ECharts data and 13 chart families, Font Awesome Free, shape presets, nested groups, and content-addressed image import. Supported PPTX objects use native tables, OMML, six chart families with embedded workbooks, and native groups; unsupported native representations use reported object-level images. `docs/SCIENTIFIC-OBJECTS.md`, `docs/POWERPOINT-COMPARISON.md`, and `docs/PROJECTS.md` define the limits.

v0.5 adds visible-range thumbnail mounting, structural sharing, draft projection reuse, coalesced refresh and immediate safe add/remove previews. Conventional click/drag placement supports reverse directions, Shift constraints and Escape; text placement enters editing directly. Chinese labels, data/chart grouping, green H branding, recent-project home and restrained interaction feedback are unified. Reduced-motion preferences are respected. Optional quick layouts still produce ordinary objects and preserve manual overrides.

Production frontend prebuilding and static local serving remove development transformation from normal desktop startup while using the same document service/API. `HUANDENG_DEV_SERVER=1` selects source hot reload for development.

## Saving and collaboration

PPTD manifest, independent `.page` files and original media remain authoritative. Preserve IDs, manifest order, z-order, unknown fields and intentional layout; Presentation order is a separate reference list. No second TSX save source. GUI, CLI and MCP share revision checks, idempotent requests and recoverable writes. Dirty project, Story, chart and page drafts must survive navigation failures and cannot silently overwrite remote changes.

An early packaged candidate, `80a83ee`, failed on its third benchmark deletion with Windows EPERM and PENDING_RECOVERY. Its failure archive and original journal remain preserved. The original transaction was recovered at its original project/state locations with the same request/receipt, one history entry, and 81 other document-file hashes unchanged. This failure is not relabeled as a passing run.

The delivered repair uses bounded atomic-replace retries and authenticated `POST /__pptd/recover`, then confirms the original request receipt before rebasing later typing. Known receipts are not submitted again; Undo/Redo preserve request identity. Recovery failure retains pending work and drafts. The in-window recovery action makes the existing leave guard resolvable without forced close or draft discard. Specific RECOVERY_REQUIRED details survive generic pending refreshes. Other-page, metadata or manifest changes observed during recovery remain external events and defer scoped Git checkpoints.

Ordinary autosave/Undo are separate from explicit named page checkpoints. Named versions archive local assets and effective themes inside the project, require no Git, and restore only the target page without overwriting shared current media.

## Verified outcome and boundaries

Final code gates: Linux 800/800 and Windows 799 plus one POSIX-only skip, each in 63 test files; core TypeScript/build pass on both, Windows Biome covers 569 files and the six final changed files pass Linux Biome. Actual packaged EXE passes Desktop 7/7, Editor 8/8 and Recovery 6/6 with observed exit 0. The refreshed third-state explanation and four recovery screenshots pass review. Three distributable editor screenshots use only synthetic content and have no private paths or PNG metadata.

Final same-machine 80-page measurements: 5.981 s to editable canvas, seven thumbnail renderers, 1,734 DOM nodes, 27.4 ms median visual Delete and 222.5 ms observed persistence over five cycles. Installed v0.4 baselines were 27.319 / 24.124 s, 80 renderers and 8,962 nodes. A separate fresh twenty-cycle run passes with visual 19.2–30.5 ms and persistence 178.8–259.5 ms; both final runs preserve 82 source-file hashes and close normally with no renderer/transaction failures. These are copied resident local files with an uncleared OS cache, not OneDrive nonresident-file cold startup.

Twenty-cycle renderer working set grows from 165.4 to 407.9 MiB and service from 201.6 to 265.5 MiB. Do not claim long-session memory stability or elimination of leaks. The raw twenty-sample script used an upper median; raw data stays unchanged, and the evidence summary separately computes the conventional median. The later harness median correction does not alter the packaged runtime.

Project 11/11 retains phase-two provenance; Science 22/22, background/PDF and Office export retain first-transfer provenance. The five-slide native Office sample proves table/chart edit-and-reopen and retained groups/math. All 80 real-deck pages rendered in Office without repair; 78 PNGs exactly match the accepted v0.4 output. The two differing pages were inspected: one preserves a rectangle already present before this task, the other has small edge antialiasing differences only. The 970 source inputs in that separate real-project acceptance remain unchanged. Do not rename these earlier checks as final packaged reruns.

Final installed-directory apparent size is 683,064,563 bytes (651.42 MiB), 29,113 files and no symlinks or scan errors; its build marker is unchanged. This is 0.55% above the old cache-excluded baseline of 679,320,441 bytes. No Electron migration or package-size reduction is claimed. Actual font availability/fallback, reliable text/formula overflow checks and long-session memory profiling are the next priorities; dependency pruning needs export and Agent portability gates.

## Source map and work rules

- `packages/core/src/pptd`: document service, project model, checkpoints, scientific models, CLI / MCP and export.
- `packages/core/src/app/components/pptd`, `app/routes/huandeng.tsx`: visual editor.
- `packages/core/src/vite/routes/pptd.ts`, `pptd/http.ts`, `pptd/static-server.ts`: local API, watchers, static serving and export integration.
- `packages/desktop`: Windows host and release identity.
- `tests/fixtures`: synthetic development documents; scientific originals are external.

Use focused checks for new changes and broaden only for a concrete risk. Available actual-desktop harnesses include `verify-editor-v05.mjs`, `verify-recovery-v05.mjs`, `benchmark-editor-v05.mjs` (default five cycles, optional 1–50), `verify-huandeng-desktop.mjs`, `verify-project-v04.mjs`, `verify-science-v04.mjs`, and `verify-background-export.mjs`. A failed gate needs diagnosis, not a passing claim based on another test.

The user authorized autonomous editor development, testing, installation and meaningful private-origin milestones. Preserve the pre-existing modified `tests/fixtures/studio/pages/identities.page` on THUG and never commit it. Do not write test transactions to scientific originals. Keep daily work local; push source and an annotated editor milestone tag after acceptance and release/handoff documentation. Do not publish npm, push OpenSlide upstream, expose a public server or change repository visibility.
