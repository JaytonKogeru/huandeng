# 中英文语义对应（2026-11-11）

这份记录对照 `../deepseek-en` 的当前提交，只记录实质性主张、演示、用户步骤、限定与致谢。中文版的顺序、页数和视觉是独立设计，不复制英文布局。

## 已经覆盖的同一组主张

| 主题 | 中文页 | 对应英文内容 |
| --- | --- | --- |
| 产品定义：项目、Editor、插件/连接器、助手 | 2 | One project. One writer. Any assistant. |
| 组会现场与 AI 质感 | 3–5 | The texture is not a style; the tell |
| 副本问题与页面作为修改单位 | 5 | Two edits should not leave three decks |
| 文件夹、入口、页面/素材/Story/历史 | 11 | The folder is the deck |
| 页面是结构化对象，不只是截图 | 12 | The page is not a picture |
| 真实工作区 | 8 | One working document |
| 一页科学证据（1BNA） | 13 | A page can carry real evidence |
| Story 的目的与保留项 | 15 | Story tells the agent what to keep |
| 位置会变，Slide ID 稳定 | 9 | A page keeps its name when it moves |
| 页面级操作历史与命名版本 | 10 | History belongs to the page |
| 一次修改的前后与字段差异 | 16 | One requested change, reviewed |
| 一份内容，多次出场 | 17 | One source, many audiences |
| 素材库不是粘贴板 | 14 | A library, not a pasteboard |
| 多助手共享写入器的并发边界 | 18–19 | Several assistants, one shared writer |
| 交付与未完成能力 | 20 | The work leaves as slides |
| 来源、商标和未完成边界 | 21 | Built on open work |
| 可用第一步 | 22 | Start with your story |

## 对英文材料的实际纠正

- **PPTX 页面身份**：英文表里“no page identity”过于绝对。PPTX 已有 slide parts 和 slide 标识符。中文版第 11 页只说 PPTX 是开放包，HUANDENG 把工作目录与页面服务显式化，并没有否认 PPTX 的页面结构。
- **截图不是全部**：中文版没有把 PowerPoint / Google Slides 说成“只能看屏幕”。第 12 页说明截图仍是审阅面，但页面、对象、边界和 revision 才是可读写的数据。
- **多助手不是在线状态**：第 19 页把“不同页面并行、同一页冲突、共享 metadata 需协调、活动面板不是在线状态/章节锁/排班”写成一张原生表格，未宣传自动锁或调度。
- **Story 不是保证**：第 15 页保留“不保证 AI 一定做对”，Story 只帮助对齐。
- **文件夹入口**：中文版按实际 0.19 行为说明可以打开项目文件夹或其中的 `deck.pptd`，一个目录只解析一个入口；`.huandeng` 后缀可选，不是必需，也不是系统级双击关联。
- **科学限定**：1BNA 的 12 个 C1′–C1′ 距离是同一结构中的 12 个位置，不是独立重复实验、不是氢键长度、也不是产品性能。

## 有意的地方化差异

- 中文版共 22 页；英文版也是 22 页，但顺序不同。中文把“产品定义”放在第 2 页，组会故事缩成 3 页问题入口，随后进入编辑器。
- 英文有独立的 Views 页；中文把浏览/大纲/历史视图书写进第 8 页工作区截图与第 9 页身份页。
- 中文使用 0.19 的文件夹入口和后缀说明；这是中文版对当前运行时的补充。
- 中文用 0.18 中文公开示例截图，因此截图说明写 0.18；产品封面写 0.19。没有把 0.18 截图伪装成 0.19 界面。
- 中文保留 HUANDENG、OpenSlide、OpenPPTD/GitHub、PptxGenJS 的实际标识和各自归属；没有把 GitHub 标记说成 OpenPPTD logo，也没有声称 Kimi 隶属或背书。

## 受众完成后能做什么

打开一个项目文件夹或 `deck.pptd`；接上已有助手；读 Story；只改一页；看预览、应用回执和页面历史；用 Main Slides 组织不同 Presentation；导出 PDF/PPTX，并把整个项目目录带走。

## 尚未声称的能力

任意 PPTX 往返、Google Slides 编辑、独立演讲者窗口、可继承母版、原生 PowerPoint 动画、插件市场。活动面板/客户端报告不是实时在线状态，也没有自动章节锁、排班或 scheduler。

这是一份 agent 维护的对应记录，不是作者批准；最终取舍以作者实际反馈为准。
