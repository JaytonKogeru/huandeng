# Huandeng

## Objective

Deliver Huandeng Editor (幻灯编辑器), a local OpenSlide-based visual editor whose persisted document is PPTD, with stable page identities and one GUI/CLI/MCP writer. Huandeng Frame carries narrative intent and scientific evidence. Future extensions use Huandeng Plugin.

## Meaningful progress

Forked OpenSlide commit `327dd09bcd530eb97647fc33fa67e99f8137d860`, MIT, core 2.3.1. The v0.1 local editing workflow is implemented; `docs/IMPLEMENTATION.md` records verified capabilities and limitations.

## Project truths

- One persisted document: manifest, independent pages and original media. No generated TSX authority.
- Existing TSX mode remains available. PPTD selection uses page/element IDs.
- Preserve manifest order, element z-order, unknown fields and the user's intentional layout.
- Agents and humans share one writer with revisions, idempotent receipts and recoverable saves.
- Product naming is Huandeng. Upstream package names and external `fss_*` interfaces remain compatibility identifiers.

## Source-of-truth map

- `docs/SPEC.md`: user-approved implementation contract, renamed to Huandeng.
- `packages/core/src/pptd`: document service, agent interfaces, recipes and exports.
- `packages/core/src/app/components/pptd`, `app/routes/huandeng.tsx`: visual editor.
- `packages/core/src/vite/routes/pptd.ts`: local API, watcher and export integration.
- `tests/fixtures`: synthetic development documents. Scientific originals remain external.

## Verification surfaces

Run core typecheck, PPTD tests, Biome and browser integration. Windows verification is on THUG at `D:/_Proj/Huandeng`; record actual evidence in `docs/IMPLEMENTATION.md`.

## Authority boundaries

User authorized implementation and the Huandeng product family. Develop with fixtures. Do not overwrite formal research decks, alter legacy projects' uncommitted work, publish packages, or expose a public server. Local Git checkpoints are permitted; upstream is attribution, not a push target.
