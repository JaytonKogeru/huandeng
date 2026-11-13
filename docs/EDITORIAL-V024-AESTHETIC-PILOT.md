# HUANDENG 0.24.0 — Existing Slides visual comparison pilot

Date: 2026-11-13. This is **not** an A/B generation experiment and does **not** validate that the new Editorial Standard improves a model's aesthetics.

## Method

Two existing authoring trial projects were opened **read-only** with the v0.24.0 CLI/writer and audited against the generated `2026-11-13-v1` Editorial Standard. The original PPTD files were not modified:
- `examples/huandeng-introduction/chatgpt-zh/deck.pptd` — 32 active pages.
- `examples/huandeng-introduction/deepseek-zh/deck.pptd` — 22 active pages.

Full `huandeng quality --language zh-CN` reports are retained locally in `.verification/existing-chatgpt-zh-quality-v024.json` and `.verification/existing-deepseek-zh-quality-v024.json`.

Individual saved Page positions **4 and 10** from each were rendered by the real `huandeng render` endpoint and visually inspected, not inferred from JSON alone. These are different stories/editing stages, not matched pages, and the current artifacts may already incorporate several manual revisions.

## Actual machine findings

| Source | Active pages | All design-audit findings | New editorial signals | Categories |
| --- | ---: | ---: | ---: | --- |
| ChatGPT Chinese | 32 | 12 | 3 | 4 low-resolution assets, 3 large typography, 3 prose fragmentation, 2 wholly bold paragraphs |
| DeepSeek Chinese | 22 | 8 | 4 | 3 prose fragmentation, 2 large typography, 2 low-resolution assets, 1 mid-dot chain |

**Interpretation:** The current deterministic signals do not rank these editions in line with the author's previously reported qualitative preference for DeepSeek. They catch a few explainable layout symptoms; they do not capture narrative completion, instructional usefulness, actual screenshots' readability, or the meaningfulness of visual relations. Signal counts are **not AI-feel scores**.

## Rendered visual observations

**ChatGPT page position 4** (short ID MSVB): An explicit 50-page revision example is communicated through a left-to-right group of three slide-document diagrams and individual changes A/B at right. The simple diagrams are relevant to its point; blindly banning repeated boxes would incorrectly penalize this page. However, the design is somewhat schematic, and fine labels are small.

**DeepSeek page position 4** (short ID UGA7): A single dominant dark green statement panel and explanatory phrases presents the manager's complaint about generic AI work. The typography is intentionally sparse and readable, but there is a long horizontal rule and no external evidence image; this does not make it intrinsically superior or inferior by a heuristic.

**ChatGPT page position 10** (short ID 9RZG): The native, editable comparison table mapping PPTX structure to PPTD parts is genuinely useful. The actual software screenshot at right is too small to read details, which undermines the slide's claim that it teaches the user where to find something. This **instructional legibility / screenshot location** issue was not surfaced by the new anti-pattern signals.

**DeepSeek page position 10** (short ID AVJE): Two real Editor captures show the history/previous-version workflow, with additional short context. The images are larger and the visual materials have a closer relationship to the user's practical question, though fine interface labels are still too small for a conference room. The source's own provenance labels remain visible. Its success is about demonstrated operation and spatial context, not any particular palette.

## Decision and remaining quality gap

The engineering implementation and CI gates for v0.24.0 were confirmed. A better-looking DSH output, or a before/after improvement caused by the new canonical rules, **was not established**.

Next true acceptance must use a controlled creative trial: exact same topic and story brief, same source assets and model/credential context, baseline vs Editorial Standard + Prototype Gate, actual rendered 10-page outputs, blind reviewer comparison against usefulness and instruction coverage, matched screenshot readability, layout appropriateness, figure provenance, and duplication; inspect every page. No claim of effectiveness without this output.

The isolated Genshin farm story is prepared in `D:\_Proj\HUANDENG-Authoring-Lab\Genshin-Farm-DSH-20261113`, but DSH Headless model routes returned `MISSING_CREDENTIAL` / `ACCOUNT_SIGN_IN_REQUIRED`. Until a functional DeepSeek route is established, this trial cannot be reported as completed.

## Follow-up engineering opportunities

1. Attach verifiable Page render transaction IDs/current revision to the gate and preserve review artifacts, while not claiming that image receipt proves visual judgment.
2. Add optional diagnostics for figure/screenshot on-slide size and readable effective resolution, not just source pixels; inspect a real Editor screenshot with context + enlarged region.
3. Audit information/teaching fulfillment in addition to decoration heuristics: genuine workflow example, what action to take, what changes, what stays, and audience follow-through.
4. Evaluate false positives: legitimate scientific multi-panels, real native data tables, meaningful arrow relationships and intentionally minimalist pages must not be penalized merely for their appearance.
