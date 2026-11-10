# HUANDENG 中文介绍 · 故事版候选（18 页）

打开 `deck.pptd`。移动项目时请保留整个目录。

## 这次改了什么

不再从“产品有什么功能”开始，而是从创始人为什么做 HUANDENG 讲起：

1. 组会现场：导师一眼看出 AI 幻灯片；
2. AI 质感来自“太完整、太均匀、太安全”，缺少人的取舍；
3. 只改两页，却多出三份副本，历史开始分叉；
4. 因而把页面作为修改单位：Slide ID、逐页历史、项目目录；
5. 用一页真实的 PDB 1BNA 内容、素材证据链和 Story 说明“那到底能做成什么样”；
6. 最后说明一份内容如何多次出场、AI 如何在同一个项目里改一页、交付与尚未完成的能力。

Main Slides 是 18 页完整顺序。三个 title-only Section 停顿页：`从组会说起`、`一页证据`、`一个项目`。没有强制页数模板。

## 两个 Presentation

- `完整介绍` — 18 页，约十五分钟。
- `短版 · 约十分钟` — 11 页，复用完整版的 Main Slides，不复制页面。

## 交付文件

- `Exports/deck.pdf` — 18 页静态候选。
- `Exports/deck.pptx` — 18 页可编辑 PowerPoint 候选。
- `Exports/deck.pdf.report.json`、`Exports/deck.pptx.report.json` — 本次导出报告。

最终导出对应：

- manifest `sha256:0c72d800be0dae93d48dea518e49b1a3b8a13072d66f5bff5fb290da1fc2d5a9`
- metadata `sha256:9970277e15198e2af3e36f06b9bcba4977307353ea05602763eb1d12666f427b`

PDF 报告：`complete: true`，诊断为空。PPTX 报告：`complete: true`，仅 `FONT_FILES_NOT_EMBEDDED` advisory；PowerPoint 使用原始字体名，字体可用性和原生换行可能与浏览器不同。未声称做过 Office 级视觉检查；该检查在当前 Windows shell 环境未能执行（`SetNamedSecurityInfoW ... grantWrite(...)`，Win32 5）。导出报告只证明结构与原生对象转换，不等于 Office 渲染通过。

## 叙事和视觉依据

- 故事与措辞来自本轮用户口述及 `sources/story/USER-STORY.zh-CN.md`；技术区分参考 `sources/story/FACTS.md`。
- HUANDENG 标识使用真实 `huandeng-icon.png`；第三方标识保持原色和比例，不暗示官方背书。
- 真实产品截图来自 HUANDENG 0.18 公开产品示例，未重绘或伪造。
- 技术来源：页面/项目目录模型受 PPTD 的组织方式启发；界面建立在 open-slide/open-slide 的 React 编辑环境上，使用 Electron 桌面壳；PPTX 生成使用 PptxGenJS。PPTX 本身也是开放包，并不缺少页面结构；HUANDENG 的选择是把工作目录与页面服务显式化。HUANDENG 不是上游官方项目，也不代表 PPTD 标准。
- PDB 1BNA：Dickerson–Drew DNA dodecamer；Drew et al., PNAS 78 (1981) 2179–2183；DOI `10.1073/pnas.78.4.2179`；structure DOI `10.2210/pdb1BNA/pdb`。
- 12 个点是同一结构中 12 个 C1′–C1′ 位置的距离，不是独立重复实验，不是性能指标，也不是氢键距离。范围为 10.23–10.89 Å。
- 科学素材、坐标、CSV、来源与复现说明在 `sources/science/`；原始导入素材仍在 `media/imported/`。
- 表格使用真实原生表格（科学事实表、导出格式表）。Story、页面身份和项目目录分别使用单一文本块，不再以多个文本框/卡片拼成表格。

`SOURCE-MANIFEST.json` 记录的是更早的复制输入，不是当前 18 页清单。当前页面路径、修订和顺序以 `deck.pptd`、`pages/` 和 `.huandeng/project.json` 为准。

## 检查范围

- 全部 18 页以 1920×1080 实际渲染并检查了画序、裁切、断行、截图可读性、隐私和视觉节奏。
- 最终 design audit：18 页，0 findings（`maxTitle=34`、`maxBody=22`）。
- 所有修改均经 HUANDENG 写入器：读取 revision → preview → apply → 读回 → render。
- 导出请求按同一 Project 串行执行。
- 用户新增的 UGA7 保留稳定身份，并填入组会故事；旧页面/素材的 named checkpoints 未被覆盖。

## 完成版 named checkpoints

- `checkpoint:62c071bec03a80ddd4eb144753b1ac8b` — 封面
- `checkpoint:6cf8d913367260e4d97d1785319a6222` — 组会现场 UGA7
- `checkpoint:f0aa26b844b7f6b687e66aa68d274cb1` — 一页证据
- `checkpoint:43cfd7285f4fd690d3e97f088a7f17e4` — 项目结构
- `checkpoint:abcf2ae3b2dfd02dcf799b3ced246504` — 先讲清楚

这些是页面级命名版本，不是整份 deck 副本。

## 本轮 operation receipts

`7402890a-0691-4483-bdbd-cc829a29c323`  
`47b5e104-d972-4979-acea-6e6319af6f0f`  
`fb429c9d-eb04-44e0-8a77-a50f7492fef1`  
`578c5d3f-8304-4af1-b988-8c72204198e8`  
`bb51f339-b2d5-4eff-be89-ba02ffc1c77a`  
`ba4029f0-1273-4b03-b07c-4fa7d7ea0ed9`  
`211ca2e5-e0aa-43b3-9fdb-d1b079922527`  
`f7594ecf-9b55-439d-8771-a88292efff4d`  
`0cc00111-1390-4e03-a532-788fa16a0882`  
`4789fbc7-b5eb-4142-b8ec-5d1962f798e9`  
`0376948d-d3d8-4343-b8a4-9591ad82ee6c`  
`64fe284e-5aae-4729-bed5-0343a84bf8a9`  
`d248b24e-7424-4ec1-bc97-74ad3a4687fc`  
`b6885b22-ec96-4dca-9552-53284036ba14`  
`99125ce5-7b46-4ff4-a7a7-41ec953975b4`  
`6396e811-6de9-4ee7-96d8-08f50e893498`

这是完成的候选，不是作者已批准的美术。作者对故事和视觉的最终决定仍高于技术检查与 agent 的视觉复核。未 commit、未 push。
