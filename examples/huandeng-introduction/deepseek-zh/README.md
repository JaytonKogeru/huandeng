# HUANDENG · DeepSeek Harness · 中文故事版

当前候选由原生客户端独立完成页面、叙事、Story 与 Notes。此 README 和讲稿索引由协调者整理；页面内容与美术未由协调者改写。

[PPTD 项目](deck.pptd) · [PDF](Exports/deck.pdf) · [PowerPoint](Exports/deck.pptx) · [实际 Notes 讲稿](speaker-notes.md) · [Native trial](evidence/native-trial.json) · [QA](evidence/qa.json)

**Main Slides: 18.** 完整介绍: 18; 短版 · 约十分钟: 11.

**Native model:** `deepseek-flash`. official --profile headless --dump-config, 17.config.model; configured model, not response model metadata.

## 当前验证

- Native turn: completed; exit code 0; native completion confirmed. 1 recorded turn(s).
- PDF / PPTX: 18 / 18 pages; export reports match the reviewed source revisions.
- PowerPoint 16.0: 18/18 pages opened read-only and rendered at 1920×1080.
- Native PowerPoint objects: 18 Notes pages, 2 tables, 0 chart objects, 17 media parts.
- The whole Office-rendered sequence was reviewed in contact sheets; additional full-page checks and observations are recorded in [the visual review](evidence/office-visual-review.json).
- No blocking Office layout defect was observed within that stated review scope. Narrative and aesthetic acceptance remain with the owner.

## Notes 与场次

讲稿文件逐字提取原生作者保存的 Main Notes，并按场次列出实际解析的 occurrence Notes。没有给短版另编讲稿，也没有把沿用的 Main Notes 说成独立场次讲稿。

- 完整介绍 (`full`): 18 pages; 0 explicit occurrence Notes.
- 短版 · 约十分钟 (`brief`): 11 pages; 0 explicit occurrence Notes.

## 来源与原生记录

- [User story excerpt](sources/story/USER-STORY.zh-CN.md) and [verified technical facts](sources/story/FACTS.md).
- [Native author's handoff](evidence/native-author-report.md) is preserved as a historical author report. Its at-the-time Office limitation is superseded by the coordinator verification above.
- [Native trial evidence](evidence/native-trial.json) records the real model evidence, tool failures, connection recovery where applicable, and the separation between native completion and delivery completion.
- Keep the entire project directory when moving it; the PPTD entry references its pages and assets.

## 本轮内容审计的保留项

技术导出完成不代表叙事全部通过。以下问题保留在原生候选中；协调者没有替原生作者改写页面，也没有要求美术返工。

- 第3页Notes增加了用户没有逐字讲出的导师对白和时间细节，不能当成真实逐字引语；第5页的页码/副本数是作者自选示例。
- 第16页标题说改两页，实际前后证据是同一页的标题和导语两个字段，标题与证据范围不一致。

[Independent content review](evidence/content-review.json) · [Saved narrative and Notes data](evidence/narrative.json).

## 短版导出

[PDF](Exports/brief.pdf) · [PowerPoint](Exports/brief.pptx) — 11 pages. 由协调者对原生作者已保存的Presentation机械导出；页面/顺序/Notes未代写。Main的原生PDF/PPTX字节未改变。

[Short export evidence](evidence/short-exports.json).
