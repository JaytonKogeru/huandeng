# HUANDENG — 科研演示，持续编辑

打开本目录中的 [deck.pptd](deck.pptd)。使用 Editor 0.19 时，也可以直接打开项目文件夹。移动项目时，请携带整个文件夹。

这份介绍回答三个问题：HUANDENG 是什么、怎么使用、它为什么有帮助。作者的组会经历解释设计动机，主体则沿着一次具体的编辑任务展开。

## 项目内容

- Main 和完整介绍包含 **24 页**；简短介绍从同一份页面库中选取 **12 次页面出现**。
- Main 第 **4、13、19** 页为只有章节标题的 Section 页：做好一页、把页面组织成演讲、与人和助手协作。
- 公开 PDB 1BNA 示例保留原始分子图、12 个 C1′–C1′ 测量值、单位和来源。这些数据来自同一结构的不同位置，不是独立实验重复。
- 真正的表格、图表和距离公式展示可编辑的科研内容；普通段落和列表保持为连贯的文本对象。
- 真实中文界面截图展示工作区、Story、素材、操作记录、命名版本、浏览、大纲、章节、创建演讲与交付。
- 保留产品、客户端、依赖项目的图标和致谢页。纸色、鼠尾草绿和砂色服务于内容节奏，没有把纯白背景当作人感标准。

操作顺序从编辑器中的一页开始：留下意图和证据，完成局部修改，确定页面身份，检查历史，把页面选入一次演讲，再让助手接入同一项目。英文版覆盖相同的实质内容和演示。

## 演讲、导出与继续编辑

完整和简短介绍都已保存为项目中的 Presentation。简短介绍里的科学页使用独立 Notes，并固定到一个真实存在的历史命名版本；Main 保留后来的图表标签调整。选页示意中的三张短版缩略图，都是该短版实际选入的 live 页面。

[Exports/deck.pdf](Exports/deck.pdf) 和 [Exports/deck.pptx](Exports/deck.pptx) 是 24 页 Main 导出；[Exports/brief.pdf](Exports/brief.pdf) 和 [Exports/brief.pptx](Exports/brief.pptx) 是 12 页短版。每份文件均有导出报告。[speaker-notes.md](speaker-notes.md) 从实际页面及演讲出现的 Notes 提取。

继续编辑时，回到对应页面或演讲中的这次出现。稳定页面 ID、原素材和有意义的命名阶段均保留。本机操作日志留在原电脑；命名页面版本和它们引用的素材随项目文件夹移动。

## 证据与评审

作者原始口述和本轮产品介绍任务见 [sources/story](sources/story)。坐标、CSV、测量方法和可复现科学脚本见 [sources/science](sources/science)。

本轮记录包括：[产品结构核验](evidence/product-verification.json)、[双语语义主题](evidence/semantic-map.json)、[编排](evidence/composition.json)、[素材来源](evidence/assets.json)、[真实选页示例](evidence/selection-example.json)、[导出哈希](evidence/exports.json)、[PowerPoint 核验](evidence/office-product-verification.json)。原有 story-verification 记录属于上一轮，作为历史保留。

协作示例有真实 ChatGPT 与 DeepSeek 共同编辑的证据：不同页面修改都被保留，同页过期提案被拒绝，重新读取后的视觉交接保留了内容。三个助手的分工图明确标为示意；没有宣称自动章节锁、自动调度或三个原生客户端均已完成并行实测。

独立复核覆盖 24 页 Main、12 个短版出现、中英对应和可编辑对象结构。[当前验证说明](https://github.com/JaytonKogeru/huandeng/blob/editor-v0.19.0/docs/PRODUCT-INTRODUCTION-VALIDATION.md) 将这些检查、原生客户端测试和作者认可分开记录。本稿仍等待作者审阅。

