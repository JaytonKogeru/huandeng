# HUANDENG introductions

四份独立的产品介绍，围绕科学演示的素材、数据、持续编辑与页面复用。
Four independently authored introductions to editing scientific presentations with HUANDENG.

The previous 0.18 introductions were rejected by the author. These are their replacements for review. Technical checks and agent visual review do not establish author acceptance. The Editor stays at 0.18.0; the authoring plugin is 0.18.2.

## Choose an edition

| Edition | Slides | Editable source | PDF | PowerPoint | Portable project |
| --- | ---: | --- | --- | --- | --- |
| ChatGPT 中文主稿 | 19 | [Source](chatgpt-zh) | [PDF](https://github.com/JaytonKogeru/huandeng/releases/download/plugin-v0.18.2/huandeng-chatgpt-zh.pdf) | [PPTX](https://github.com/JaytonKogeru/huandeng/releases/download/plugin-v0.18.2/huandeng-chatgpt-zh.pptx) | [ZIP](https://github.com/JaytonKogeru/huandeng/releases/download/plugin-v0.18.2/huandeng-chatgpt-zh.zip) |
| ChatGPT English | 19 | [Source](chatgpt-en) | [PDF](https://github.com/JaytonKogeru/huandeng/releases/download/plugin-v0.18.2/huandeng-chatgpt-en.pdf) | [PPTX](https://github.com/JaytonKogeru/huandeng/releases/download/plugin-v0.18.2/huandeng-chatgpt-en.pptx) | [ZIP](https://github.com/JaytonKogeru/huandeng/releases/download/plugin-v0.18.2/huandeng-chatgpt-en.zip) |
| DeepSeek Harness 中文 | 16 | [Source](deepseek-zh) | [PDF](https://github.com/JaytonKogeru/huandeng/releases/download/plugin-v0.18.2/huandeng-deepseek-zh.pdf) | [PPTX](https://github.com/JaytonKogeru/huandeng/releases/download/plugin-v0.18.2/huandeng-deepseek-zh.pptx) | [ZIP](https://github.com/JaytonKogeru/huandeng/releases/download/plugin-v0.18.2/huandeng-deepseek-zh.zip) |
| Claude Code English | 20 | [Source](claude-en) | [PDF](https://github.com/JaytonKogeru/huandeng/releases/download/plugin-v0.18.2/huandeng-claude-en.pdf) | [PPTX](https://github.com/JaytonKogeru/huandeng/releases/download/plugin-v0.18.2/huandeng-claude-en.pptx) | [ZIP](https://github.com/JaytonKogeru/huandeng/releases/download/plugin-v0.18.2/huandeng-claude-en.zip) |

## Continue editing

1. Extract the complete portable project directory.
2. Open its `deck.pptd` in HUANDENG Editor 0.18.0.
3. Keep `pages`, `media`, `.huandeng` and the supporting files together.
4. Choose Main, Full introduction or Brief introduction where available.

The two ChatGPT editions have a full 19-page talk and a seven-page brief. Three actual title-only Section pages occur at Main positions 3, 7 and 12. The brief changes the sequence and genuinely pins its scientific page to a named version. Ordinary paper, sage structural pages and sand source/folder pages form the background system.

PPTX and PDF deliver static pages. The main editions use native text, charts, tables, equations and functional icons where supported; original scientific figures and actual interface captures remain images. Portable named versions travel with the project. Local operation journals do not; the important copy-edit values, exact operation identity and preservation evidence are summarized under `evidence/`.

## Preview

### ChatGPT 中文

![ChatGPT Chinese introduction](previews/chatgpt-zh-overview.png)

### ChatGPT English

![ChatGPT English introduction](previews/chatgpt-en-overview.png)

### DeepSeek Harness 中文

![DeepSeek Chinese introduction](previews/deepseek-zh-overview.png)

### Claude Code English

![Claude English introduction](previews/claude-en-overview.png)

## Scientific example and visual sources

The root editions use public PDB 1BNA coordinates. The structure view, marked A7/B18 C1′ atoms, 12-point chart, selected-value table and equation refer to the same measured distances. These twelve positions are within one structure, not experimental replicates. The reproducible calculation, coordinate file, CSV, method and attribution are included.

- [Scientific source package](assets/science/README.md), also included in every portable project's `sources/science/`.
- [Original user-nominated design reference](assets/reference/README.md): the unchanged 19-page demo PDF and contact sheets.
- [Original brand marks](assets/brand/README.md): HUANDENG, client and dependency imagery with provenance.
- [Earlier task screenshot library](assets/README.md): retained public reference and diagnostic captures.
- Current root-edition UI captures show their own scientific example and 19-page project, in matching Chinese or English UI, at native DPR3. Their exact imported pixels and current uses are listed in each edition's `evidence/assets.json`.

## Independent native trials

DeepSeek chose and completed its own 16-page Chinese introduction. Supplied public assets were preloaded through the supported project API after its previously observed shell-write limitation. It received no fixed page count or ChatGPT narrative and no cosmetic rewrite. Its result retains an overbroad OpenPPTD attribution on page 15 and a minor PowerPoint-only punctuation wrap. Those are recorded trial findings, not endorsed product claims.

Claude chose and authored 20 English pages. Its native account hit the five-hour usage limit during final review. Its then-current PDF had only 18 pages. The coordinator exported the saved 20-page source to PDF/PPTX and applied Claude's already-written full-20 / lab-9 presentation plan without changing any authored page. Four occurrence notes and a completion named version remain unfinished; the exact original submission and quota evidence are retained. After quota reset, the same native session verified the current source and exports read-only. The initial authoring turn remains incomplete. Its inherited 21-page README/media index were preserved and replaced with clearly labelled coordinator indexes. This is independent Claude authorship with coordinator packaging, not a claim that the native authoring task completed. A PowerPoint-only axis-label collision on page 5 remains visible in the trial result.

See [current delivery and comparison](../../docs/INTRODUCTION-DELIVERY.md) for the exact validation scope and limitations. Native output remains a tool trial, not a source of product facts.

## Review and history

[Current contract](../../docs/INTRODUCTION-REWORK.md) → [independent visual audit](../../docs/INTRODUCTION-VISUAL-AUDIT.md) → [delivery and handoff](../../docs/INTRODUCTION-DELIVERY.md).

Earlier versions remain in Git and their release records. This directory contains exactly four current introduction projects; it does not add dated parallel editions. The original demo is a read-only reference. Preserved retired pages and archived image bytes inside a project support its document history.

## License and source integrity

Repository MIT terms and upstream notices apply. Source figures, icons, screenshots and dependencies retain their own attribution and provenance. Repository visibility is managed separately from these public-content examples.

Scoped Git attributes preserve authored bytes and checkpoint hashes. The collection's Biome configuration disables reformatting of authored data while retaining parsing and linting.
