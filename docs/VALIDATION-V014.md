# Editor 0.14 validation

## Accepted identities

- Base: `5040bb10b0037fa93bb3e09743750fe2479a539f`.
- Runtime: `2f3e627ec3c27f07111824937118e0f76be265b2`, clean package marker, Editor 0.14.0, Electron 38.7.2, core 2.3.1.
- Built: `2026-11-09T10:07:59.5096295Z`.
- Subsequent evidence/documentation commits do not rebuild the accepted runtime.

## Source gates

- `corepack pnpm test`: 110 files, 1,171 passed, one existing skipped test, zero failures.
- Core TypeScript check passed, including after both scoped review fixes.
- Changed TypeScript/JavaScript files passed scoped Biome checks; `git diff --check` passed.
- Explicit Node test paths `plugins/huandeng/scripts/configure.test.mjs` and `discovery.test.mjs`: eight passed. An earlier wrong glob selected zero tests and is not counted as evidence.
- Local plugin package passed Claude's manifest validator. This is not a claim of marketplace safety review.
- Desktop packaging verified self-containment and relocation with hoisted production dependencies.

## Exact packaged native acceptance

`scripts/verify-visual-review-v014.mjs` ran against the final packaged executable with an isolated profile and synthetic three-slide Project: **11/11 passed**, zero renderer exceptions.

Checks cover real checkpoint/pin and repeated usage counts; image selection; full-page preview with no write; exact preview/save object geometry; preserved original objects; Activity receipt identity; real before/after rendering; changed-object highlight; navigation to the current object; explicit client claim versus saved evidence; historical review after subsequent edits; delayed response cancellation; 1600/1040 widths; English/Chinese; light/dark appearance; pinned read-only state; setup/report separation; CLI review; stdio protocol; source-image and unrelated-page byte preservation. Playwright's renderer color-scheme override is set alongside Electron native appearance for deterministic theme testing.

`scripts/verify-workspace-v013.mjs` ran against the same final package: **14/14 passed**, zero renderer exceptions. It covers actual secondary process launches with spaces/Unicode, Project deduplication, background service identity, Home switching, unsaved Story guards, central file focus isolation, background Agent writes and Activity, Outline/Sections, native fullscreen/F5/Escape, independent tab close and normal native exit.

Selected synthetic screenshots and sanitized acceptance records: [evidence/v014](evidence/v014/README.md). Research Projects and private installation receipts are excluded from this repository.

## Review and fixes

All four implementation tasks received independent scoped reviews. The Task 3 reviewer found exact image validation incorrectly searching only the first substring-search page; it now paginates with a strict bound and distinguishes incomplete lookup. The Task 4 reviewer found retained Activity storage errors could masquerade as no reports; observed reports and unavailable-history errors now remain distinct. Both fixes have focused regressions and clean scoped re-reviews. A Task 2 minor Chinese label omission was corrected and tested during Task 3.

The whole-branch review of `5040bb1..2f3e627` approved source quality with no material findings and inspected actual wide/narrow, English/Chinese, light/dark screenshots. Delivery verification below was subsequently completed by the primary agent; it was not attributed to that reviewer.

## Installed and plugin evidence

The accepted package was copied to a new stage and **29,278 files** compared by SHA-256 before replacement. The preceding Editor received a normal close request and exited; no force-close was used. Its package was retained. The canonical install path, Desktop/Start Menu shortcuts and PPTD association were verified.

The two previously open Projects and active Project were restored through native launches. Both services were writable with zero diagnostics. **121 source files**, captured after normal draft flush, remained byte-identical after installation; the pre-existing unrelated repository fixture was unchanged. Independent stdio doctor checks against both restored Projects reported **21 tools, two guides, review support, protocol verified**. `modelTaskVerified` remained false: no model-authoring task is claimed by protocol tests.

Codex and Claude Code inventories reported the original local plugin enabled at 0.14.0. A versioned DeepSeek patch/launcher was prepared and its referenced paths checked without changing profiles or executing a model task. The existing private account plugin was updated to 0.14.0; read-back confirmed its release, preserved App binding, presentation/default prompts and private USER audience, plus the new review instructions. Existing chats may retain cached instructions.
