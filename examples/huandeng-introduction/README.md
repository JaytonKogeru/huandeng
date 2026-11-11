# HUANDENG：可编辑的 Editor 教程与独立示例
# Editable Editor walkthroughs and independent examples

这组项目让读者在故事里学会实际操作：打开项目、选页与选对象、使用素材和 Story、保存并检查改动、组织演讲、预演和导出。最终 ChatGPT 两稿围绕 Editor 操作重新制作；Claude Code 与 DeepSeek Harness 四稿按作者要求冻结，只新增语言与模型水印。

These projects connect the product story to actual editing work. The final ChatGPT editions are independent Editor walkthroughs. The four Claude Code and DeepSeek Harness editions preserve their accepted content and design, with language/model watermarks added to every page.

Editor and plugin version: **0.19.0**. Current checks are recorded in [final validation](../../docs/PRODUCT-INTRODUCTION-VALIDATION.md). Earlier release files and historical evidence describe their own revisions.

## 选择一稿 / Choose an edition

| Edition | Main | Brief | Editable entry | Watermark / authorship |
| --- | ---: | ---: | --- | --- |
| ChatGPT English | 24 | 12 | [chatgpt-en/deck.pptd](chatgpt-en/deck.pptd) | English · ChatGPT 6 Astra |
| ChatGPT 中文 | 24 | 12 | [chatgpt-zh/deck.pptd](chatgpt-zh/deck.pptd) | Chinese · ChatGPT 6 Astra + Subagents |
| Claude Code English | 25 | 9 | [claude-en/deck.pptd](claude-en/deck.pptd) | English · Claude Opus 5.5 |
| Claude Code 中文 | 26 | 9 | [claude-zh/deck.pptd](claude-zh/deck.pptd) | 中文 · Claude Opus 5.5 |
| DeepSeek Harness English | 22 | — | [deepseek-en/deck.pptd](deepseek-en/deck.pptd) | English · DeepSeek V4.1 Flash 1017 |
| DeepSeek Harness 中文 | 22 | 12 | [deepseek-zh/deck.pptd](deepseek-zh/deck.pptd) | Chinese · DeepSeek V4.1 Flash 1017 |

The primary ChatGPT session wrote and designed every English page. Three parallel section agents authored eight Chinese pages each; the primary session coordinated the project and personally inspected all 24 Chinese pages. The two languages do not follow a forced alignment.

The native freeze audit covers **95 pages**. Removing the one newly added attribution object from each page reproduces its prior page data exactly. Original Notes, objects, scientific values, page order, metadata and Presentation arrangements also match the frozen baseline. The [native integration record](../../docs/NATIVE-INTEGRATION-0.19.md) separates actual host execution from document and process results.

## 先做一处修改 / Make a first edit

1. Keep the complete project folder and open its `deck.pptd` in Editor 0.19. Folder opening also works when the folder directly contains exactly one `.pptd`.
2. In the English walkthrough, find **GX5Z** and read its Story. In the Chinese walkthrough, begin with the opening and selection lessons.
3. Select a text object, change one phrase, inspect the canvas and save.
4. Inspect the exact saved operation. Name a page version when the result is worth keeping.
5. Choose the short Presentation, inspect its occurrence Notes and version choice, then rehearse and export the selected range.

The English short talk is **First edit · short talk**. The Chinese short talk is **第一次修改 · 简短演讲**. Each has 12 occurrences and a real named-version pin: **Project map · tutorial** in English and **保存页面 · 教程定稿** in Chinese.

Sections begin at useful content pages. The previous title-only divider pattern and scientific pin are historical; they are not requirements of these final tutorials.

## 交付文件 / Delivery files

Each complete project contains editable pages, original assets, source material, named versions, Notes and supporting evidence. Main deliveries are `Exports/deck.pdf` and `Exports/deck.pptx`. Where a Brief exists, its files are `Exports/brief.pdf` and `Exports/brief.pptx`.

There are **22 final PDF/PPTX files** across the six projects. Each format contains 143 Main pages plus 54 Brief occurrences. DeepSeek English has no authored short Presentation.

Generated exports are intentionally excluded from Git. They are included in the prepared complete-project delivery archives and can be regenerated through the Editor. Public release links should be attached to the exact reviewed candidate; an earlier 0.19 download is not automatically this final revision. See [open-source readiness](../../docs/OPEN-SOURCE-READINESS.md).

Use each project's README and `speaker-notes.md` to inspect its current sequence. Continue editing the corresponding source page or Presentation occurrence. Send the whole folder to another HUANDENG author; a PDF or PPTX does not contain all of that project context.

## 材料与功能 / Material and product evidence

[The original spoken account](story/USER-STORY.zh-CN.md) remains unchanged. [FACTS.md](story/FACTS.md) records technical and attribution checks. The current [PRODUCT-BRIEF.md](story/PRODUCT-BRIEF.md) describes the final tutorial mission and ownership.

The ChatGPT walkthroughs use real 0.19 Editor captures and selected retained 0.18 operation/identity evidence. Current captures show the actual working projects. Earlier evidence is identified as such; it is not presented as a simulated current interface. Crops remain tied to original files, and arrows, labels and diagrams remain native editable objects.

- [Scientific source package](assets/science/README.md): original public PDB material, measurements, CSV and reproducible views. It remains available as source and historical material.
- [Original nominated demo](assets/reference/README.md): the unchanged reference and its identity.
- [Brand marks](assets/brand/README.md): client and dependency marks with provenance.
- [Screenshot library](assets/README.md): retained public interface and diagnostic captures.

The final ChatGPT narrative teaches the Editor rather than using DNA measurements as its main subject. Native author editions retain their scientific demonstrations unchanged. Their native chart and table behavior is checked separately in the export and Office records.

Named page versions and archived assets travel with the project. Installation-local operation and recovery journals do not. Public evidence contains selected results and file identities; raw prompts, account bindings and private runtime state are excluded.

## 预览 / Previews

The overview images show selected pages from the final saved editions. Open the project or PDF to inspect the full sequence.

### ChatGPT English

![English Editor walkthrough: selection, Story, comparison, versions and delivery](previews/chatgpt-en-overview.png)

### ChatGPT 中文

![中文 Editor 教程：定位、编辑、回看、编排与交付](previews/chatgpt-zh-overview.png)

### Claude Code English

![Claude Code English: frozen native design with attribution](previews/claude-en-overview.png)

### Claude Code 中文

![Claude Code 中文：保留原生设计并新增水印](previews/claude-zh-overview.png)

### DeepSeek Harness English

![DeepSeek Harness English: frozen native design with attribution](previews/deepseek-en-overview.png)

### DeepSeek Harness 中文

![DeepSeek Harness 中文：保留原生设计并新增水印](previews/deepseek-zh-overview.png)

## 验收与来源 / Review and provenance

The current [specification](../../docs/PRODUCT-INTRODUCTION-SPEC.md) and [validation record](../../docs/PRODUCT-INTRODUCTION-VALIDATION.md) identify the final source, render and export checks. The ChatGPT editions received personal page-by-page visual review. The four native designs remain frozen; mechanical delivery and watermark verification do not rewrite or erase earlier authoring findings.

PowerPoint and PDF are checked as delivered files. A retained Office layout difference is recorded where applicable. Successful tool execution, a clean geometry report and reviewer acceptance are distinct from the owner's final review.

Repository MIT terms and upstream notices remain. Scientific material, figures, icons, brand marks and third-party code retain their individual source and license terms. Scoped Git attributes preserve authored page and checkpoint bytes.
