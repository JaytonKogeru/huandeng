# HUANDENG · Claude Code · 中文故事版

当前候选由原生客户端独立完成页面、叙事、Story 与 Notes。此 README 和讲稿索引由协调者整理；页面内容与美术未由协调者改写。

[PPTD 项目](deck.pptd) · [PDF](Exports/deck.pdf) · [PowerPoint](Exports/deck.pptx) · [实际 Notes 讲稿](speaker-notes.md) · [Native trial](evidence/native-trial.json) · [QA](evidence/qa.json)

**Main Slides: 20.** 组会简版: 7.

**Native model:** `claude-opus-5-5`. native assistant message model metadata.

## 当前验证

- Native turn: completed; exit code 0; native completion confirmed. 1 recorded turn(s).
- PDF / PPTX: 20 / 20 pages; export reports match the reviewed source revisions.
- PowerPoint 16.0: 20/20 pages opened read-only and rendered at 1920×1080.
- Native PowerPoint objects: 20 Notes pages, 2 tables, 1 chart objects, 17 media parts.
- The whole Office-rendered sequence was reviewed in contact sheets; additional full-page checks and observations are recorded in [the visual review](evidence/office-visual-review.json).
- No blocking Office layout defect was observed within that stated review scope. Narrative and aesthetic acceptance remain with the owner.

## Notes 与场次

讲稿文件逐字提取原生作者保存的 Main Notes，并按场次列出实际解析的 occurrence Notes。没有给短版另编讲稿，也没有把沿用的 Main Notes 说成独立场次讲稿。

- 组会简版 (`lab-brief`): 7 pages; 2 explicit occurrence Notes.

## 来源与原生记录

- [User story excerpt](sources/story/USER-STORY.zh-CN.md) and [verified technical facts](sources/story/FACTS.md).
- [Native author's handoff](evidence/native-author-report.md) preserves the current native author report or a labelled excerpt of its visible final response. Its at-the-time Office limitation is superseded by the coordinator verification above.
- [Native trial evidence](evidence/native-trial.json) records the real model evidence, tool failures, connection recovery where applicable, and the separation between native completion and delivery completion.
- Keep the entire project directory when moving it; the PPTD entry references its pages and assets.

## 本轮内容审计的保留项

技术导出完成不代表叙事全部通过。以下问题保留在原生候选中；协调者没有替原生作者改写页面，也没有要求美术返工。

- 第9页把PPTD说成将PPTX目录摊开、替换入口，未保持两种文件模型的技术区别。
- 第20页又放入用户要求暂不进入slides的素材库优化，以及尚未形成方案的视频/图片方向。

[Independent content review](evidence/content-review.json) · [Saved narrative and Notes data](evidence/narrative.json).

## 短版导出

[PDF](Exports/brief.pdf) · [PowerPoint](Exports/brief.pptx) — 7 pages. 由协调者对原生作者已保存的Presentation机械导出；页面/顺序/Notes未代写。Main的原生PDF/PPTX字节未改变。

[Short export evidence](evidence/short-exports.json).
