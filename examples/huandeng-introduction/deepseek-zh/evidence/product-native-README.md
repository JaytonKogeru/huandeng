# HUANDENG · DeepSeek Harness · 中文产品版

本版把“故事”缩成问题入口，把产品与职能放到主体：项目是目录，页面是修改单位，Story 保留人的目的，素材保留证据，多助手共享同一个写入器。

[PPTD 项目](deck.pptd) · [PDF](Exports/deck.pdf) · [PowerPoint](Exports/deck.pptx) · [中英语义对应](SEMANTIC-CORRESPONDENCE.zh-CN.md)

**Main Slides: 22.** 完整介绍: 22; 短版 · 约十分钟: 12.

## 这一版的顺序

1. 封面：一份可以继续修改的幻灯片。
2. **一个项目，一个写入器**：Editor、项目目录、插件/连接器和外部助手的关系。
3. **从组会说起**：导师一眼认出 AI 幻灯片。
4. **AI 质感**：不是丑，是没有取舍。
5. **副本问题**：改两页却多出三份副本。
6. **编辑器**：进入工具本身。
7. **一个工作文档**：真实中文工作区。
8. **位置会变，身份不变**：Slide ID 与 Position。
9. **这一页改过什么**：操作审阅和命名版本。
10. **文件夹就是项目**：打开文件夹或 `deck.pptd`；可选 `.huandeng` 后缀；整个目录一起移动。
11. **页面不是一张截图**：对象、边界、revision 与截图审阅的关系。
12. **一页能承载真实证据**：1BNA 结构、曲线、原生表格、数值与来源。
13. **素材不是插图**：素材库、原始文件与来源。
14. **Story 告诉助手该保留什么**：目的、保留项与修改范围。
15. **一次修改，只动这一页**：真实修改前后与字段差异。
16. **一份内容，多次出场**：Main Slides 与 Presentation。
17. **AI 在同一页上改**：读取 Story/revision、预览、应用、回读。
18. **几个助手，一个写入器**：不同页面可并行；同页和共享元数据会冲突；没有自动锁/排班/在线状态。
19. **它可以交出去，也还没做完**：PPTX/PDF/PPTD 与当前边界。
20. **站在开放工作上**：OpenSlide、OpenPPTD、PptxGenJS、HUANDENG 标识与归属。
21. **从这份项目开始**：打开、连接、试改、交付。

两个 title-only Section：`从组会说起`、`编辑器`。短版复用同一批 Main Slides，不复制页面。

## 本版修正

- **XZJN 的普通散文碎片已清除**：原三组“标题/说明/横线”文本框已删除，合并成一个 rich-text 列表；截图与页面身份保留。
- **PPTX 不缺少页面结构**：第 10 页只说 PPTX 是开放包；HUANDENG 把工作目录和页面服务显式化，不再声称 PowerPoint 没有页面身份。
- **0.19 文件夹入口**：文件夹或 `deck.pptd` 都能打开；一个目录只解析一个入口；`.huandeng` 后缀可选但不是必需；没有系统级双击关联。
- **多助手边界**：不同页面能并行；同页编辑冲突即使改不同对象；Story、章节、顺序共用 metadata revision；活动面板不是在线状态、章节锁或 scheduler。
- **科学限定**：1BNA 的 12 个 C1′–C1′ 距离是同一结构中的 12 个位置，不是独立重复实验、不是氢键长度、不是产品性能。
- **来源恢复**：OpenSlide 是代码基础；OpenPPTD 只贡献公式转换模块；PptxGenJS 生成 PPTX；HUANDENG 不是上游官方项目，Kimi 不构成隶属或背书。

## 导出与检查

- `Exports/deck.pdf` — 22 页，PDF report `complete: true`，无诊断。
- `Exports/deck.pptx` — 22 页，PPTX report `complete: true`，仅 `FONT_FILES_NOT_EMBEDDED` advisory。
- 导出对应 manifest `sha256:eda1ef98c23aad9e04891d9314a9f8349c46710d8633a8c0c92429fdca6cd62a`，metadata `sha256:7977f54ff28cd8c30237fb63bc198c57e0dd81239f6e9b680448d5a7e7a2ff76`。
- 最终 design audit：22 页，0 findings（`maxTitle=34`、`maxBody=22`）。
- 全部页面均逐页 render 复核；最终 22 页顺序通过 project Story 和 presentation 解析。
- 0.18 截图只用于 0.18 中文公开界面，封面/产品版本写 0.19；没有把 0.18 截图声称为 0.19 界面。

## 未完成与限制

- 本轮没有做 Office 级 PDF/PPTX 视觉检查；此前 18 页版 README 中的 Office 检查不适用于这版 22 页导出。
- PPTX 字体未嵌入；PowerPoint 的原生换行可能和浏览器不同。
- 中文版没有单独展示 MP4 导出与完整 Views 页；浏览/大纲/章节/备注/历史被并入真实工作区与身份页。MP4 仍是产品能力，但未被本介绍当成主交付。
- 客户端活动/报告是声明与已保存回执，不是实时在线状态；没有自动章节锁、排班或 scheduler。
- 这是一份完成的候选，不是作者已批准的美术。未 commit、未 push。

## 主要 operation receipts

`7598fb22-d0c2-48a2-9522-5da6baa76ef3`  
`6a0accda-0c14-4d45-9bc4-79a46b9d08f8`  
`c41d2696-3fbe-4315-a818-83257baa7b71`  
`39bb0759-a0b9-43f1-8a2b-7b08683263a5`  
`54f68d72-b60e-484c-a0d2-99011485583b`  
`bc1ad366-94bf-4cf3-b55c-3a82847e5b2b`  
`b928a40d-37fa-48fb-85ff-ad19314f92b1`  
`10221b55-6c95-40c2-84f1-76e57d1a8ef7`  
`701e58e6-6077-4b66-9967-8107c1c240e4`  
`09da2be7-2006-4d20-8af7-c6fae622ed7a`  
`c019afc1-d361-4ced-b6b3-7319b79db03b`  
`1e63a39f-0bb5-4aa1-8fe9-7f118ac70bdb`  
`59a41964-bfcb-452c-94a8-ab352f64e493`  
`8acaeafd-d7cc-4384-8833-034288b671cd`  
`35802ed2-acb6-4127-9120-a58a81711e7c`  
`c65a4fb6-e15d-4844-ae8d-834fd2f0b1e3`  
`19dfc843-677a-4510-8933-433fbe8bc7a3`  
`25458e8e-5954-4a0f-acb4-cdaba2441c69`  
`a8f09aa2-dbaf-4df8-908b-80d196866edc`  
`4b85bdbd-86d9-470b-91e3-8102f8cbbb18`  
`2378ad47-ebf0-419a-b74d-f837f05a503c`  
`d1261f6e-3e85-4d79-a637-ebb51d2d22a4`  

更细的 Story/Notes 和命名版本见 `deck.pptd` 所在项目与 `.huandeng/` 历史。
