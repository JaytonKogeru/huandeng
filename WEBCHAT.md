# HUANDENG Editor

## Objective and product contract

Deliver a usable scientific desktop editor based on OpenSlide / React / Electron, with PPTD as the persisted document and one GUI / CLI / MCP writer. `docs/SPEC.md` is the Master Product Specification; `SPEC-V02` through `SPEC-V05` describe successive product decisions. Read `docs/AUDIT-V05-COVERAGE.md` for combined historical coverage and remaining gaps, and `docs/AUDIT-V05-VISUAL.md` for visual decisions. Keep the existing architecture. Visible product names are HUANDENG Editor, HUANDENG Story, and HUANDENG Plugin.

## Current implementation

v0.4 implements one Main Slides library per project, flat Sections, multiple Presentation Slides with live or named-version references, per-occurrence notes, and Main / Section / Presentation Story. Main pages retain UUIDs, short codes and stable S aliases. v0.5 makes random short codes the primary visible identity and shows current order separately; old aliases and references remain valid. Ordinary autosave and Undo are separate from explicit named page checkpoints, which archive local assets and effective themes inside the project.

Scientific editing includes KaTeX / MathML, merged tables, ECharts data and 13 chart families, Font Awesome Free, shape presets, nested groups, and content-addressed image import. Supported PPTX objects use native tables, OMML, six chart families with embedded workbooks, and native groups; unsupported native representations use reported object-level images. See `docs/SCIENTIFIC-OBJECTS.md`, `docs/POWERPOINT-COMPARISON.md`, and `docs/PROJECTS.md` for exact contracts and limits.

v0.4.0 is installed on THUG from clean runtime commit `c2fede5`, with the formal executable and shortcuts verified. The release milestone is `editor-v0.4.0`. Exact acceptance and source provenance are in `docs/RELEASE-V04.md` and `docs/HANDOFF-V04.md`. Native synthetic PowerPoint evidence is tracked in `docs/evidence/native-v04`; real research output stays in ignored verification directories. Do not infer installation or visual fidelity from source code or an RPC receipt alone.

## Active milestone: v0.5 candidate

The current local work addresses Issue #6 and the full product audit: visible-range thumbnail rendering, structural sharing and coalesced refresh, immediate add/remove previews with truthful persistence state, conventional click/drag placement, shortCode navigation, coherent Chinese labels and green H branding. The document service retains revision checks, idempotency and recoverable writes while reusing unchanged parsing and deduplicating shared asset work.

Production frontend prebuilding and a static local serving path are being integrated to remove development-server transformation from normal desktop startup. Continue using the same document service and API. `HUANDENG_DEV_SERVER=1` selects the development server when source hot reload is needed.

Status, completed checks and outstanding acceptance are in `docs/RELEASE-V05.md` and `docs/HANDOFF-V05.md`. v0.5 is not yet recorded as installed or released. The measured Windows v0.4 baseline is `.verification/performance-v05/before-v04.json`: first editable canvas 27.319 s, 80 thumbnail renderers, 8,962 DOM nodes, five Delete samples with median visual response 2,388.4 ms and observed persistence 930.7 ms. This is a fresh process/profile/runtime on a copied 80-page project; the OS filesystem cache was not cleared. Do not describe it as an OS-cold benchmark.

## Project truths

- Manifest, independent `.page` files and original media remain authoritative. No second TSX save source.
- Preserve IDs, manifest order, z-order, unknown fields and intentional layout. Presentation order is a separate reference list.
- Agents and people share revision checks, idempotent requests and recoverable saves. Dirty project, Story and chart drafts must not disappear on navigation or silently overwrite remote changes.
- Named page versions are portable project data and do not require Git. Restore affects only the target page; shared current media is not overwritten.
- Keep old protocol aliases and OpenSlide package names compatible. Never rename persisted identity to simplify display.
- A rendered object is not proof of PowerPoint editability; native / original-image / fallback / blocked modes must stay explicit.

## Source map

- `packages/core/src/pptd`: document service, project model, checkpoint storage, scientific models, CLI / MCP and export.
- `packages/core/src/app/components/pptd`, `app/routes/huandeng.tsx`: visual editor.
- `packages/core/src/vite/routes/pptd.ts`: local API, watcher and export integration.
- `packages/desktop`: Windows host and product release identity.
- `tests/fixtures`: synthetic development documents. Scientific originals are external.

## Verification

For this release: Biome, core TypeScript, unit tests and core build; then actual Windows `verify-editor-v05.mjs`, the comparable 80-page `benchmark-editor-v05.mjs`, and regression coverage with `verify-huandeng-desktop.mjs`, `verify-science-v04.mjs`, `verify-project-v04.mjs`, `verify-background-export.mjs` and relevant real-project/native Office flows. The static serving change must preserve exports, external updates and local access controls. Tests and screenshots use synthetic projects or isolated research copies. A failed gate needs diagnosis, not a success claim based on another test. Small subsequent changes need only checks resolving their concrete risks.

THUG canonical code location is `D:/_Proj/Huandeng`. Package committed source in an isolated worktree, validate portability, test the actual EXE, then install to the existing `dist/HUANDENG-win32-x64` path and inspect shortcuts and the build marker.

## Authority and preservation

The user authorized autonomous completion of the editor core, testing, installation and a meaningful private-origin release milestone. Preserve the pre-existing modified `tests/fixtures/studio/pages/identities.page` on THUG; never include it in code commits. Do not use formal research decks as write targets. Do not publish npm, push OpenSlide upstream, expose a public server, or change repository visibility. Push source and an annotated editor milestone tag only after acceptance and release / handoff documentation.
