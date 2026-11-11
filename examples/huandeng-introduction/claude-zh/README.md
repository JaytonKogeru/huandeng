# HUANDENG：Claude Code 中文介绍

在 Editor 中打开 [deck.pptd](deck.pptd)，并保留整个项目文件夹。

本稿从作者的组会经历、修改两页却产生整套副本的问题出发，解释项目架构，并用真实科学页的修改、回看与复用把 Editor 教学融入故事。Claude Code（Opus 5.5）通过官方 HUANDENG CLI 和已有共享 writer 完成本轮局部修订，保留已经成立的叙事与视觉设计。

## 当前保存的版本

| 集合 | 页数 | 版本与备注行为 |
| --- | ---: | --- |
| Main | 27 | 包含五张实际的标题独占章节页。 |
| 幻灯介绍（完整版，约 25 分钟） | 27 | 与 Main 同序、同解析后备注，全部跟随当前页面，没有 pin。 |
| 组会简版（约 8 分钟） | 9 | 全部跟随当前页面，没有 pin；四次页面引用有自己的备注。 |

封面和内容页使用精确水印 `chinese claude opus5.5`。章节页只有标题与纯色背景。正式致谢页 MK7X 已纳入完整介绍。

[实际保存的讲稿](speaker-notes.md) 从当前 Main 与 Editor 正式解析的演讲生成，保留命名版本及单次引用备注的实际行为，不改写作者的正文。BRHY 在短讲中的备注已经同步为 CSV、脚本和 Matplotlib 的事实。

## 素材与真实操作

本轮独立来源见 [ACQUISITION.md](sources/ACQUISITION.md)。科学坐标与计算保留在 `sources/science/own/`，[绘图脚本](sources/science/slide-figure/plot.py)使用 Matplotlib；品牌标记由作者自行取得，详见[品牌采集记录](sources/brand-own/ACQUISITION.json)。

界面素材来自本项目实际运行的中文 HUANDENG Editor 0.19。修改前后与 Review 使用本版实际发生的操作；完整窗口、所在位置和可读细节一起说明如何找到对应功能。末轮把关系图中的连接改为图形箭头，保留原内容与层级。历史资料继续保留，不作为本轮跨作者共用的素材输入。

## 审阅与输出

当前 27 页完整序列和受影响的关键画面已完成本轮内部视觉复查。Office 基线检查以禁用修复的只读方式打开了 Main（27 页）、Full（27 页）、组会简版（9 页）与 brief 别名（9 页）四个文件。最后修正 FK8W 的文字断行并重新导出后，再次只读打开 Main，确认第 22 页不再出现行首孤立顿号；短讲别名与正式短讲文件逐字节一致。最终 Full 与短讲没有重复 Office 打开。所有检查均未改变被读取的文件；内部审阅与输出检查不代表用户已经最终验收。

原生作者已重新导出当前 Main、Full 与组会简版的 PDF/PPTX。常用本地文件为 `Exports/deck.pdf`、`Exports/deck.pptx`、`Exports/brief.pdf` 和 `Exports/brief.pptx`，按演讲名称生成的文件也保留。Git 不跟踪生成的导出。

当前六页选览见[项目集合入口](../README.md)。移动项目时请保留页面、素材、来源、元数据与历史。旧 `product-*` 证据、`MEDIA-INPUTS.json` 及下列记录只说明其原来的版本，不能用旧页数或旧输出结论代替当前状态。

## 历史记录

以下原文保留旧 26 页稿件、当时的水印范围、原生图表及审阅说明。它们属于历史，不再规定本轮只能改水印；当前输出的独立 Office 检查范围以上文为准。

<details>
<summary>保留的早期原生交付与复核记录</summary>

# HUANDENG · Claude Code · Chinese product introduction

## Final watermark-only revision

The owner froze this edition’s content and visual design. Its native author added one editable attribution object to every Main page: **中文 · Claude Opus 5.5**. Main has **26 pages**; the authored Brief has **9 occurrences**.

An independent full-data comparison confirmed that all original page objects, Notes, page order, metadata, Presentation arrangements and scientific values remain unchanged. Final PDF/PPTX files were regenerated mechanically from that saved source. See the [current collection](../README.md), [freeze evidence](../../../docs/evidence/final-examples/native-watermark-freeze.json) and [final validation](../../../docs/PRODUCT-INTRODUCTION-VALIDATION.md).

The records below document the earlier native authoring and reviews. Their original outcomes and retained limitations remain historical; this watermark pass does not constitute another content rewrite.


The native author completed this revision in the original session. The coordinator assembled this index, exact saved Notes and read-only evidence; it did not rewrite authored pages, Story or metadata.

[PPTD project](deck.pptd) · [Main PDF](Exports/deck.pdf) · [Main PowerPoint](Exports/deck.pptx) · [9-page Brief PDF](Exports/brief.pdf) · [9-page Brief PowerPoint](Exports/brief.pptx) · [Saved speaker notes](speaker-notes.md)

**Native-run boundary:** the final native result has native_completed=true and exit code 0, but the runner is needs_attention. A PowerShell request to append DELIVERY-R2.md in the author working directory was denied; the author reported that interactive approval was unavailable. The two page repairs and all four final exports were independently verified. No permission/account change, denied-file rewrite or whole-task retry was performed.

**Main: 26 pages. Full Presentation: 26. Brief: 9 pages, four occurrence Notes, no pins.** This is a preserved native candidate, not owner acceptance.

## What changed and who did it

The preceding completed native task made 51 tool calls. A separately scoped factual continuation made 9 calls in the same session, preserving account/model and the existing design. It corrected the screenshot-measurement and Story-guarantee claims in visible text, relevant Notes and Story. This was a content-correctness gate, not a taste-based rerun or first-pass approval.

The Chinese continuation changes only the corresponding page-5/page-6 statements and associated Notes/Story. The 26-page layout, original evidence and dedicated verified collaboration page remain intact.

The native author exported all four final Main/Brief PDF/PPTX artifacts. Their reports and resolved Notes match the saved source. The coordinator only standardized any title-based Brief filenames without changing native bytes. Earlier export provenance is retained separately; the preceding English Brief had been mechanically exported by the coordinator, and is not confused with these final native artifacts.

## Verification scope and retained limits

The preceding complete 26-page deck was actually rendered read-only in PowerPoint 16.0 and reviewed in full contact sheets plus selected full pages. After this factual continuation, only the changed pages were visually rechecked and targeted current Office renders were inspected. Unchanged pages are linked by identical source hashes to the prior evidence; this is not a claim that every page of the new PPTX was rendered again.

The Chinese scientific page was independently checked in actual Office before this factual pass and remains source-identical. It does not have the English manual pair-label alignment problem. No new blocking overflow or missing content was found on the affected current pages within the documented scope.

All twelve native chart values in final Main and Brief match the public CSV exactly. Main PPTX retains one native chart and eight native tables. Current Brief PDFs and all nine resolved Notes were verified; Main-numbered footers remain in the Brief. No new complete Brief Office pass is claimed.

The language pair now carries corresponding core product claims, evidence, use steps and boundaries. Chinese uses an additional dedicated collaboration page; English covers the same verified facts in the existing agents explanation and Notes. A real DSH + ChatGPT fixture is evidence of coordinated revision-checked saves, not a native Claude collaboration test, online presence, section locks or automatic scheduling. [Independent correspondence](evidence/product-pair-review.json).

## Evidence and use

[Current native trial](evidence/product-trial.json) · [Current QA](evidence/product-qa.json) · [Independent review](evidence/product-review.json) · [Prior full-sequence evidence](evidence/product-prior-stage.json) · [Brief provenance](evidence/product-brief.json) · [Native values](evidence/product-science-check.json) · [Image use](evidence/product-assets.json) · [Visible final author report](evidence/product-native-author-report.md)

Keep the whole directory when moving the project. deck.pptd is the entry; pages, media and metadata belong together. [Sources and notices](SOURCES.md), [public input manifest](MEDIA-INPUTS.json) and [technical facts](sources/story/FACTS.md) preserve provenance. The 1BNA example measures twelve positions of one public structure, not experimental replicates or a product benchmark.

Existing unprefixed evidence describes older submissions. Its counts/hashes remain historical, not claims about current exports. Archived before-product README/Notes preserve exact bytes and retain the original project-root relative-link origin.

![Current native PDF cover](evidence/product-preview.png)

## Native handoff clarification

The handoff calls the preceding canonical Brief seven pages. The retained prior artifact and saved sequence were already nine pages after earlier filename normalization. Final Main26/Brief9 counts and all current reports are verified from the files, not inferred from that sentence.

Existing miniature page previews retain their original snapshot bytes; only the actual affected page bodies were refreshed in this wording-only maintenance.

</details>
