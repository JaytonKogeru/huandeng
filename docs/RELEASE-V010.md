# HUANDENG Editor v0.10 — 完整创作与 Presentation 工作流

日期：2026-11-08。产品版本：0.10.0。

这轮接续因对话长度中断的工作，围绕打开编辑器、创建 Project、组织 Main Slides 与 Section、编排 Presentation、编辑、放映、保存和交付完成收尾。两个独立 UX 审计从同一套任务出发，再合并实现并接受实际 Windows 编辑器验收。

过程文档：[Audit](AUDIT-V010.md) · [Spec](SPEC-V010.md) · [Implementation](IMPLEMENTATION-V010.md) · [Validation](VALIDATION-V010.md) · [Handoff](HANDOFF-V010.md)。完整操作说明见 [WORKFLOW-V010](WORKFLOW-V010.md)。

## 本轮改动

| 使用任务 | v0.10 行为 |
| --- | --- |
| 打开应用 | 新用户默认 English；中文可选，核心产品术语保持英文；使用用户提供的“幻”标志 |
| 识别 Main Slide | 显示内容标题、缩略图、Position 与 Slide ID，支持搜索及鼠标悬停/键盘聚焦预览 |
| 建立 Presentation | 明确添加 Slide 或 Section、重复引用、调整顺序、删除引用与 Save Project；可选 Story 信息折叠 |
| 组织 Section | 用 Start Position / End Position 设定连续范围，展示成员，在缩略图中显示分段 |
| 保存编排 | 保存当前 collection 后保持当前 Slide 和 occurrence，避免跳回第一页 |
| 找到操作 | 文档与交付放在主标题栏，对象插入放在画布工具栏，布局与帮助放进 Workspace settings，状态栏保留身份、缩放与 Fit |
| 调整工作区 | 左右侧栏在自身边缘收起、展开和调整宽度；Notes 可拖动调整大小，在底部或右侧停靠 |
| 快速编辑对象 | 右键菜单提供文字加粗、斜体、下划线、字号、颜色及四种图层移动；菜单、快捷键与 Inspector 使用相同行为和 Undo |
| 使用 Inspector | 分为 Properties、Layers、Story、Checks；切换保留未保存的 Story 与图表草稿 |
| 使用 Assets | 默认只列可放置的图片；JSON、Python 等支持文件保留在 Files / All files；继续支持图片复用、导入和拖放 |
| 理解技术检查 | Checks 说明检查边界、素材、字体及文字布局，不把技术检查当作内容科学性审查 |
| 接入外部 Agent | 入口改为 Agent setup，明确生成配置与下一步；现有共享 CLI/MCP/HTTP 写入路径继续保留 |

布局偏好在正常关闭时保存，包含刚调整后立即关闭的情况。输入框保留正常的文字编辑快捷键；批量格式修改和图层操作各有独立的单步 Undo。

## Project 的使用顺序

1. 从 Welcome 选择 **New Project** 或 **Open Project**。
2. 在 **Pages / Main Slides** 添加和编辑可复用的 Slide；使用 **Save slides** 或 Ctrl+S 保存页面编辑。
3. 在 **Project → Main Slides** 创建 Section，选起止 Position，点击 **Set range**，再 **Save Project**。
4. 创建 **New Presentation**，点击 **Add slides or Sections**，按缩略图、标题或预览选择来源。重复点击可形成不同的 appearance。
5. 调整 Presentation 顺序、按需编辑 Story 与 occurrence notes，然后 **Save Project**。
6. 从顶部 collection 选择器打开保存后的 Presentation；使用 **Present**、F5 或 Shift+F5 放映，Escape 返回。
7. 在 **Export** 中确认当前 Presentation 的名称和页数，再输出所需格式。

Slide 编辑和 Project 编排有各自的保存入口。空 Presentation 可以保存并继续编排；放映或导出需要至少一张有效 Slide。未保存的编排保留在面板中，明确提示下一步。

## Position 与 Slide ID

**Position** 是当前 collection 中的位置，**Slide ID** 是稳定的可读身份，内部 `pageId` UUID 继续识别原始页面。Presentation 中同一 Slide 的不同出现还有各自的 `occurrenceId`。

Section 的操作界面按连续 Position 范围选择，保存时记录边界 Slide 的稳定身份。前面插入一页会改变显示位置，但不会错指另一张边界页；在范围内部插入的新页会包含进该 Section。旧式离散成员列表保留原样，直到用户明确选择 Set range。缺失、反向或重叠的边界会产生可见诊断。

## Agent setup 的含义

点击 **Agent setup** 会展示或生成当前 Project 的客户端配置/CLI 参数。它不会自动连接客户端，也不会替用户修改客户端设置。选择 ChatGPT 时，继续通过已有的 DC-WALT 通道调用本机 CLI；这一轮没有增加反向代理、公网隧道或新的公共监听端口。

现有 GUI、CLI、MCP 仍共享文档写入器。素材库和其他扩展可以沿已有接口接入；[EXTENSIONS](EXTENSIONS.md) 明确区分已存在的接口与未来 provider 约定。

## Drug Design 交付示例

打开 `examples/drug-design-v010/deck.pptd`。它包含 10 张原生可编辑 Main Slides、3 个连续 Section，以及共用这些页面的完整 Presentation 和 5 页 briefing。文字、表格、形状和连线均可继续编辑，来源保存在每页 Notes 与 SOURCES.md 中。

主题从“什么才算有效候选物”出发，覆盖设计目标、小分子、protein binder、antibody、工具职责、证据链和候选物选择。图中展示方法与判断关系，不把预测分数画成实验结果。

完整示例见 [README](../examples/drug-design-v010/README.md)，研究与来源见 [内容审查](research/DRUG-DESIGN-V010.md)。正式包导出的 PDF 和合成项目截图收录在 [验收证据](evidence/v010/acceptance.json)。

## 交付边界

本轮完成上述创作与使用流程。独立 audience/presenter 双窗口、完整 PPTX 导入往返、原生 PowerPoint 动画映射、任意 occurrence 视觉覆盖和插件市场仍是单独能力。PNG/PDF/PPTX 输出基础静态画面，交互式点击动画在 HUANDENG 放映中播放；没有新增长时间高清负载性能结论。

## 实际安装与版本交付

正式包来自干净源码 `54513193b5e8004d51815265b75d99e6425cfba1`，构建于 `2026-11-08T06:50:30.6528822Z`。Windows 源码检查及 32 组正式包 UI 验收通过，完整结果见 [Validation](VALIDATION-V010.md)。

已安装至 `D:/_Proj/Huandeng/dist/HUANDENG-win32-x64`，桌面和开始菜单入口均已核对。29,214 个安装文件与验收包逐文件一致，旧版 v0.9 已保留。原有 80 页 Project 正常重新打开，82 个受保护文件及已有用户修改保持不变。日常界面已设为 English。版本标记为 `editor-v0.10.0`；接受的运行包与后续交付文档提交分开记录。
