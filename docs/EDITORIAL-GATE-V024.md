# HUANDENG 0.24 — Canonical Editorial Standard + Authoring Quality Gate

Date: 2026-11-13. Design seed: actual author feedback on repetitive “AI-looking” slides, explicit non-decorative scientific/product presentation rules, and visual validation failures in prior multi-agent trials.

## Architectural decision

**One canonical source, multiple generated consumers, with Project-specific preferences kept separate.** The authoritative global anti-pattern + positive-design rules are `packages/core/src/pptd/editorial-standard.json`. All 19 entries carry IDs, levels (`hard`, `advisory`, `visual`), avoided behavior, preferred behavior, and domain. A rule is not an arbitrary ban on cards, dots, arrows or any color: the relation to content and author-approved style determines legitimacy.

`scripts/sync-editorial-standard.mjs` produces, deterministically:
- `plugins/huandeng/skills/huandeng-story/references/editorial-standard.md`: user-visible Skill reference; included in portable Claude/Codex and DSH native packages.
- `packages/core/src/pptd/editorial-guide.generated.json`: runtime `huandeng://guide/editorial` MCP resource and `huandeng guide editorial` CLI output.
- `pnpm check:editorial` fails on generated-source drift; product `pnpm check:release` also checks drift before distribution.

No second design policy database is needed. Root `AGENTS.md` contains only the Project's audience, approved references and exceptions; `Story`/`designIntent` contain per-page intent. The Plugin provides workflow triggers. Generic reference documents remain instructional technique, not an independent source of global anti-pattern definitions.

## Executable checks

`design-audit.ts` keeps its existing type, raster sampling, requested background and divider checks. `editorial-audit.ts` now appends cautious, ID-linked signals:
- `VOICE-05`: footer/subtitle defensive disclaimer furniture;
- `DOT-07`: gratuitous middle dot chains;
- `ARROW-06`: arrow-character chains used as diagrams;
- `GENERIC-10`: generic high-tech slogan;
- `FRAG-13`: likely fragmented prose;
- `TEXT-12`: text-heavy explanation without evidence object;
- `CARDS-08`: three or more consecutive, geometrically identical three-card layouts.

These checks report exact Page IDs and sometimes element IDs. They are **not** a pseudo-objective AI-feel score. Contextual art direction, true diagram meaning, asset provenance and style need actual rendered human/agent judgment. Legitimate three-condition scientific comparisons, intentional sparse pages, meaningful caveats and arrows are not banned.

`authoring-gate.ts` adds a read-only, reproducible `prototype` / `release` gate:
- `huandeng_authoring_gate` MCP accepts `stage`, `reviews` with exact current `renderRevision`, and reasoned `exceptions`.
- `huandeng quality --gate prototype|release --review-evidence <json>` returns machine-readable report; non-ready exits **2** to allow CLI pipeline enforcement.
- Prototype requires at least two distinct Page IDs with current revision-bound reviews; release requires a review for every included page. Empty decks, unreviewed/stale pages, truncated audits and unresolved reviewable warnings cannot be marked ready.
- Warning exceptions need an explicit specific-page rule code and a substantive reason. This is explicit review documentation, not a model’s autonomous permission to ignore the author's style.
- `ready-for-author` means machine checks + **self-reported** review evidence satisfied. A model can still misreport having viewed pixels, and this gate neither proves actual image inspection nor records author acceptance. Actual screenshots/full-size contact sheet inspection remain a separate obligation.

The new UI Design Check exposes generated standard version and rule-linked observations. The shared writer's CAS/revision controls are unchanged; manual author edits and export are not globally blocked by a quality gate. Strict enforcement applies to workflows calling the gate, not to every possible external client bypassing it.

## Recommended generation workflow

`Audit → Spec → Prototype (2–3 unlike pages) → Implement → Validate → Release`.

1. **Audit**: read explicit user brief, Project `AGENTS.md`, story and approved pages; gather original images with provenance.
2. **Spec**: map each Page’s audience question, required evidence, visual form, and note; preserve original figures and citations.
3. **Prototype**: use the one shared writer to create 2–3 representative pages; actually render, inspect, fix and call Gate stage `prototype`.
4. **Implement**: complete all Pages with native editable objects and purposeful visual variety; actively acquire real images/plots/screenshots instead of decorating text.
5. **Validate**: run machine checks, look at a full deck contact sheet and every Page at intended size, record current revision observations, correct warnings and call Gate stage `release`.
6. **Release**: record meaningful named version; verify editable PPTD and requested outputs, actual asset sources and complete delivery; distinguish agent review from human acceptance.

## Genshin farm-world DSH benchmark

A separate private isolated test Project was initialized at
`D:\_Proj\HUANDENG-Authoring-Lab\Genshin-Farm-DSH-20261113\deck.pptd`.
It contains the user's original `teyvat_farm_universe_story_bible_v0.2.md`, the Project policy, independent asset-acquisition plan, and `sources/DSH-TASK.md` for ~10 slides. Private story text is **not published to GitHub**.

DSH 0.2.2-rc.1 Headless direct model routes were tried without editing existing profiles or credentials. The official DeepSeek route returned `MISSING_CREDENTIAL`; the DeepSeek account route returned `ACCOUNT_SIGN_IN_REQUIRED`. Local Ollama through DSH direct provider returned `NO_ADAPTER`, and a temporary Qwen2.5 7B openai-compatible adapter did not complete a simple response and was stopped. This is **not** a completed ten-page DSH generation and must not be reported as one. Existing GUI DSH and authored scientific Projects were left untouched.

The original theory differentiates established story, invented corporate metaphor and uncertainty; do not use this as an “official lore” presentation. The benchmark requires truly independently sourced images, unlike composition prototypes, revision-bound rendered observations and a real gate report after any DSH model execution.

## Validation and limitations

The canonical source's rendered/reference bytes are SHA-256 linked; compilation and unit tests verify runtime and report behavior. Checks for repeated card geometry are intentionally conservative; actual visual evidence review is irreplaceable. The strict quality workflow can be adopted by any agent using the same version of the Plugin and MCP, but it cannot force arbitrary unaffiliated clients to read resources or prevent an end-user's manual work.

Release packaging, full core regression and isolated runtime CLI quality smoke must be captured in a separate validation report when available. No source modifications may rewrite private Slides or user preferences to force an audit pass.
