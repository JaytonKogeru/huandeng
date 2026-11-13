# HUANDENG Editor v0.24.0 — AI Authoring Standard and Validate Gate

Date: 2026-11-13. Previous released Editor: 0.23.3. This is a new source-backed quality workflow, not a promise that any connected model will automatically make beautiful Slides.

## Why
User testing exposed common AI slide flaws: empty launch slogans, repeated equal-size rounded cards, Unicode arrow/middle-dot chains, decorative stripes and rules, oversized explanatory text crowding actual figures, fake tables, fragmented text boxes, template-gradient palettes, and irrelevant safety/disclaimer copy in page subtitles and bottom corners. The positive objective is evidence-first visual storytelling: independently sourced figures and authentic screenshots, meaningful comparisons, editable scientific diagrams and actual rendered revision.

## A single design standard
- Canonical registry: `packages/core/src/pptd/editorial-standard.json` (19 clear rules, ID, category, avoided pattern and preferred behavior).
- Generated Skill reference: `plugins/huandeng/skills/huandeng-story/references/editorial-standard.md`.
- Generated runtime/MCP resource: `huandeng://guide/editorial`; inspect with `huandeng guide editorial`.
- `pnpm sync:editorial` generates these identical representations; `pnpm check:editorial` and `pnpm check:release` detect version/hash drift.
- Per-Project `AGENTS.md` remains scoped style/context and does not become another global rule source.

## Quality checks and gate
- Expanded read-only Design Audit recognizes cautious anti-pattern signals with exact page IDs: repeated three-card layouts, unrelated footer disclaimers, middle-dot separators, ASCII/Unicode arrow chains, generic slogans, text fragmentation, text-heavy pages without direct figure/chart/table evidence. Existing title/body sizes, image sampling, divider and background diagnostics remain.
- Design Check UI shows the canonical standard version and count of observations; every finding is an inspectable specific page, not an AI-feeling number.
- New `huandeng_authoring_gate` MCP tool and CLI `quality --gate prototype|release --review-evidence <file>` validate actual saved render revisions, explicit per-page visual review observations, and unaddressed machine findings. Non-ready CLI exits 2.
- Prototype requires at least two pages with current render-revision observations; release requires all active pages and a complete, non-truncated audit. Empty decks or unresolved significant findings cannot be marked ready.
- `ready-for-author` means the structural gate and **self-reported** visual inspection requirements were satisfied. The model can still lie; this is not a trusted human acceptance or proof of perceptual quality. The gate does not block manual editing/export globally; enforcing it in agent workflows is deliberate.

## Test project
The isolated Genshin/“teyvat chicken farm → pig farm” private Project and original story are at `D:\_Proj\HUANDENG-Authoring-Lab\Genshin-Farm-DSH-20261113` on THUG. It contains a DSH-specific ten-slide authoring brief and unchanged user theory. Neither is uploaded to GitHub. Genuine DSH Headless model execution could not authenticate its DeepSeek official/account providers; a local model fallback also did not yield an accepted result. Therefore this release does **not** claim a ten-page DSH-authored deck.

## Compatibility and delivery
Current 0.23.3 user Projects, page identities, images and history are not rewritten. Existing UI can be used as before; new CLI/MCP quality functions are additive and read-only. The canonical rule set is bundled for Claude/Codex and DSH native plugin packages. Applying this release to an installed Editor/plugin requires their independent upgrade; publishing a ZIP does not update a running user application.

See [detailed architecture and limits](EDITORIAL-GATE-V024.md) and [verification report](VALIDATION-V024.md).
