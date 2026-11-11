# HUANDENG 产品介绍 / Product introductions

这组介绍的任务是让读者理解工具、看懂工作区，并完成一次有证据可查的编辑与交付。作者的经历解释为什么要做这些设计；页面顺序按观众需要理解和使用的事情组织。
These introductions explain what HUANDENG does, how to use it and why the design helps. The founder's account informs editorial choices; each author organizes the explanation around actual work.

Editor and AI plugins: 0.19.0. The current source/Office reviews and native-author outcomes are recorded separately in [product validation](../../docs/PRODUCT-INTRODUCTION-VALIDATION.md). These remain candidates for owner review.

## 选择一稿 / Choose an edition

| 作者与语言 | Main | Brief | 可编辑入口 | 本轮状态 |
| --- | ---: | ---: | --- | --- |
| ChatGPT 中文 | 24 | 12 | [chatgpt-zh/deck.pptd](chatgpt-zh/deck.pptd) | 内容、对象、视觉、中英对应及 PowerPoint 检查完成 |
| ChatGPT English | 24 | 12 | [chatgpt-en/deck.pptd](chatgpt-en/deck.pptd) | Content, editable objects, visual, bilingual and PowerPoint checks complete |
| Claude Code 中文 | 26 | 9 | [claude-zh/deck.pptd](claude-zh/deck.pptd) | 稿件、对应修正与四导出完成；保留原生日志追加的权限拒绝记录 |
| Claude Code English | 25 | 9 | [claude-en/deck.pptd](claude-en/deck.pptd) | Preferred design preserved; factual/function alignment complete; retained Office chart-label issue |
| DeepSeek Harness 中文 | 22 | 12 | [deepseek-zh/deck.pptd](deepseek-zh/deck.pptd) | 原生完成；保留 4 类内容/对应问题，Brief 已按保存序列机械导出 |
| DeepSeek Harness English | 22 | — | [deepseek-en/deck.pptd](deepseek-en/deck.pptd) | Native completion; factual and stale-Notes findings retained |

The six canonical projects on the working machine are D:/_Proj/Huandeng/examples/huandeng-introduction/<edition>/deck.pptd. Keep using these directories; historical versions do not require another dated project tree.

## 下载 / Delivery files

The verified 0.19 delivery assets are listed in [the release](https://github.com/JaytonKogeru/huandeng/releases/tag/editor-v0.19.0). A source ZIP includes the complete editable project, current exports and export reports. A PDF or PPTX alone is not the HUANDENG project. Git maintains the editable source and evidence; each project's existing Exports/ ignore rule keeps its generated deliveries out of Git. When browsing GitHub, use the download table below. Relative Exports/ links inside a project README resolve in the complete ZIP or after a local export.

| Edition | Complete project | Main PDF | Main PowerPoint |
| --- | --- | --- | --- |
| ChatGPT 中文 | [ZIP](https://github.com/JaytonKogeru/huandeng/releases/download/editor-v0.19.0/huandeng-chatgpt-zh.zip) | [PDF](https://github.com/JaytonKogeru/huandeng/releases/download/editor-v0.19.0/huandeng-chatgpt-zh.pdf) | [PPTX](https://github.com/JaytonKogeru/huandeng/releases/download/editor-v0.19.0/huandeng-chatgpt-zh.pptx) |
| ChatGPT English | [ZIP](https://github.com/JaytonKogeru/huandeng/releases/download/editor-v0.19.0/huandeng-chatgpt-en.zip) | [PDF](https://github.com/JaytonKogeru/huandeng/releases/download/editor-v0.19.0/huandeng-chatgpt-en.pdf) | [PPTX](https://github.com/JaytonKogeru/huandeng/releases/download/editor-v0.19.0/huandeng-chatgpt-en.pptx) |
| Claude Code 中文 | [ZIP](https://github.com/JaytonKogeru/huandeng/releases/download/editor-v0.19.0/huandeng-claude-zh.zip) | [PDF](https://github.com/JaytonKogeru/huandeng/releases/download/editor-v0.19.0/huandeng-claude-zh.pdf) | [PPTX](https://github.com/JaytonKogeru/huandeng/releases/download/editor-v0.19.0/huandeng-claude-zh.pptx) |
| Claude Code English | [ZIP](https://github.com/JaytonKogeru/huandeng/releases/download/editor-v0.19.0/huandeng-claude-en.zip) | [PDF](https://github.com/JaytonKogeru/huandeng/releases/download/editor-v0.19.0/huandeng-claude-en.pdf) | [PPTX](https://github.com/JaytonKogeru/huandeng/releases/download/editor-v0.19.0/huandeng-claude-en.pptx) |
| DeepSeek Harness 中文 | [ZIP](https://github.com/JaytonKogeru/huandeng/releases/download/editor-v0.19.0/huandeng-deepseek-zh.zip) | [PDF](https://github.com/JaytonKogeru/huandeng/releases/download/editor-v0.19.0/huandeng-deepseek-zh.pdf) | [PPTX](https://github.com/JaytonKogeru/huandeng/releases/download/editor-v0.19.0/huandeng-deepseek-zh.pptx) |
| DeepSeek Harness English | [ZIP](https://github.com/JaytonKogeru/huandeng/releases/download/editor-v0.19.0/huandeng-deepseek-en.zip) | [PDF](https://github.com/JaytonKogeru/huandeng/releases/download/editor-v0.19.0/huandeng-deepseek-en.pdf) | [PPTX](https://github.com/JaytonKogeru/huandeng/releases/download/editor-v0.19.0/huandeng-deepseek-en.pptx) |

Where a Brief exists, its release filenames add -brief before .pdf/.pptx. The same fixed files live under Exports/brief.* inside the project. Current Main files are Exports/deck.pdf and Exports/deck.pptx. DeepSeek English did not author a separate Presentation.

## 继续编辑 / Continue editing

1. Extract the complete project folder and open its deck.pptd, or choose the folder in Editor 0.19.
2. Keep pages, media, .huandeng, sources and supporting files together. The entry is a launch/order manifest, not the whole deck.
3. Choose Main or one of that author's saved Presentations. Full and Brief reference the real source pages.
4. Read speaker-notes.md for the continuous speaking notes; edit the corresponding page/occurrence Notes in the project.

A folder must directly contain exactly one .pptd for folder opening. No entry or multiple entries produce an explicit error. A descriptive .huandeng suffix is optional. Windows icons can be added through the visible Application menu → File → Identify project folder route; portable archives exclude OS folder decorations. See [project folders](../../docs/PROJECT-FOLDERS.md).

The two ChatGPT editions use 24 Main pages and 12-occurrence briefs. Main positions 4, 13 and 19 are title-only Section pages. The sequence follows one page, one talk, then people and assistants working together. Their brief includes a real named-version pin and occurrence-specific Notes; those are saved project behavior, not a diagram of an unimplemented feature.

## 材料与功能 / Material and product evidence

[The original spoken account](story/USER-STORY.zh-CN.md) remains unchanged. [FACTS.md](story/FACTS.md) checks technical format and source attribution. Current [PRODUCT-BRIEF.md](story/PRODUCT-BRIEF.md) separates the audience's task from the author's transcript. Portable source copies live under each project's sources/story/.

Each root project uses 26 current distinct images: ten shared scientific/brand sources, nine real localized UI captures, four actual page previews and three historical evidence images. The real UI captures were made from the actual installed 0.18 Editor at DPR 3 before the runtime upgrade; they are not simulated 0.19 screenshots. The later folder-entry behavior has its own 0.19 validation.

- [Scientific source package](assets/science/README.md): public PDB 1BNA coordinates, reproducible C1′ distance measurements, CSV and structure views. Twelve positions from one crystal structure are not independent experimental replicates.
- [Original nominated demo](assets/reference/README.md): the unchanged 19-page reference and its identity.
- [Brand marks](assets/brand/README.md): HUANDENG, client and dependency assets with provenance.
- [Earlier task screenshot library](assets/README.md): public reference and diagnostic captures.

Genuine tables use native table objects. Ordinary prose remains coherent text where practical. Scientific figures, real UI, icons and deliberate light/dark/color backgrounds retain their communicative roles. Text-only minimalism is not an acceptance criterion.

Each ChatGPT Main PPTX contains three native tables, one native chart and one Office equation, verified in PowerPoint. The chart retains the twelve source values. The Brief intentionally shows an earlier pinned scientific version with its historical image fallback. Other unsupported objects and static-animation limits are listed in each export report.

Named page versions and their media travel with the project. Machine-local operation/recovery journals remain with the originating installation; selected public edit evidence is included under evidence/. Current SOURCE-MANIFEST.json describes the packaged files, not a second authoring source.

## 预览 / Previews

### ChatGPT 中文

![ChatGPT 中文：编辑页面、组织演讲和共同修改](previews/chatgpt-zh-overview.png)

### ChatGPT English

![ChatGPT English: a page, a talk and shared work](previews/chatgpt-en-overview.png)

### Claude Code 中文

![Claude Code 中文：当前原生作品](previews/claude-zh-overview.png)

### Claude Code English

![Claude Code English: current native edition](previews/claude-en-overview.png)

### DeepSeek Harness 中文

![DeepSeek Harness 中文：当前原生作品](previews/deepseek-zh-overview.png)

### DeepSeek Harness English

![DeepSeek Harness English: current native edition](previews/deepseek-en-overview.png)

## 独立试作与验收 / Independent trials

Claude English retains its successful design and the user's actual page edits. The Chinese counterpart must cover the same substantive explanation. ChatGPT and DeepSeek did not use Claude's artwork as their style template.

Native results retain their real successes and shortcomings. Each project README and product-trial/product-review evidence distinguish native completion, technical recovery, coordinator-only documentation/export work and content findings. Earlier native-trial/story records remain historical. Loading an authoring guide, a zero-warning geometry audit or a successful process exit does not establish editorial approval.

Read the [current specification](../../docs/PRODUCT-INTRODUCTION-SPEC.md), [validation](../../docs/PRODUCT-INTRODUCTION-VALIDATION.md) and [native integration](../../docs/NATIVE-INTEGRATION-0.19.md). The root pair passed independent review; the owner has not yet accepted the current revision.

## License and integrity

Repository MIT terms and upstream notices apply. Scientific sources, figures, icons, captures and dependencies retain their attribution. Scoped Git attributes preserve authored bytes and checkpoint hashes. The collection's Biome configuration keeps authored formatting while retaining parsing and lint checks.
