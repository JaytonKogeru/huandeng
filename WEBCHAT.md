# HUANDING

## Objective

Deliver HUANDING Editor, an Electron desktop editor based on OpenSlide whose persisted document is PPTD, with stable page identities and one GUI/CLI/MCP writer. External agents maintain HUANDING Frame intent. No embedded AI chat. Extensions use HUANDING Plugin.

## Meaningful progress

Forked OpenSlide commit `327dd09bcd530eb97647fc33fa67e99f8137d860`, MIT, core 2.3.1. v0.1 baseline is `41af882`. v0.2 is implemented: native Electron editor, project tree, durable page history and agent-maintained intent. Final Windows EXE passed six core flows; four new history tests pass. Evidence is in `docs/IMPLEMENTATION-V02.md`; next gaps are in `docs/HANDOFF-V02.md`.

## Project truths

- One persisted document: manifest, independent pages and original media. No generated TSX authority.
- Existing TSX mode remains available. PPTD selection uses page/element IDs.
- Preserve manifest order, element z-order, unknown fields and the user's intentional layout.
- Agents and humans share one writer with revisions, idempotent receipts and recoverable saves.
- Visible naming is HUANDING per the latest explicit spelling. Existing Huandeng paths, metadata and old CLI/MCP aliases remain compatible; upstream package names and external `fss_*` interfaces are unchanged.

## Source-of-truth map

- `docs/SPEC.md`: user-approved implementation contract, renamed to Huandeng.
- `packages/core/src/pptd`: document service, agent interfaces, recipes and exports.
- `packages/core/src/app/components/pptd`, `app/routes/huandeng.tsx`: visual editor.
- `packages/core/src/vite/routes/pptd.ts`: local API, watcher and export integration.
- `tests/fixtures`: synthetic development documents. Scientific originals remain external.

## Verification surfaces

Run typecheck, Biome, focused page-history/save tests, and one real desktop/agent editing flow. Do not repeatedly expand or run the full inherited suite without a concrete need. Verify Windows on THUG at `D:/_Proj/Huandeng`.

## Authority boundaries

User authorized the v0.2 SPEC and HUANDING product family. Use disposable fixtures. Preserve the user's existing changes in `tests/fixtures/studio/pages/identities.page` on THUG. Do not overwrite formal decks, alter legacy projects' uncommitted work, publish packages, or expose a public server. Local commits are permitted; upstream is attribution, not a push target.
