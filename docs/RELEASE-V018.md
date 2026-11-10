# HUANDENG Editor v0.18.0

本版把设计约定接到实际创作与检查：中文与英文分别使用适合的字号和字重，普通内容页保持统一底色，章节可以直接插入一张仅含标题的开场页。插入保留已有 Section ID、Story 和页面成员关系，并可用同一份 Undo 撤回。

编辑器保持普通、浏览、大纲、章节、备注页和历史六个同级工作区，降低工具栏、卡片和侧栏的视觉重量。设计检查集中显示文字大小、背景、章节开场与素材像素比例；可以选择语言、白底及章节标题页要求，点击结果回到对应页面。检查只读取已保存状态，结果变化后提示刷新。

CLI 新增 `huandeng init <新目录> --title <名称>`，与桌面新建项目共用初始化器。已有目标会拒绝，避免覆盖文档。`quality`、`huandeng_design_audit` 和编辑器设计检查读取同一接口；字体阈值可调整，科研图内标签不会机械套用正文标准。

工作流采用 Audit → Spec → Frame → Implement → Validate → Release。Agent 在扩展整套幻灯片之前先做有明确坐标和字号的代表页；截图来自真实界面，按中文/英文分别采集任务区域，并记录来源与像素尺寸。AGENTS.md 仍是项目唯一自动发现的创作约定。

原生 Agent 实战发现的表格目录文本问题已修复：`media/` 等普通文字不会再被导出器误判为图片文件，实际图片来源仍经过原有文件边界检查。共享指南补充素材历史保留与能力预检；同一项目的渲染和导出按顺序执行。

Editor、原生客户端和账号插件从同一份 Story 与设计资料构建。白名单打包、文件 SHA-256 清单和安装检查用于发现“版本号相同、内容不同”的漂移。账号插件沿用原身份和工作站连接；原生 Codex、Claude Code 与 DeepSeek Harness 继续保留各自的本地入口。

核心 npm 版本与编辑器产品版本分开，变更使用 pending changeset 记录，本次不运行 npm 发布。实际安装、四套介绍文稿和发布状态见 [验收交付](HANDOFF-V018.md)；分发细节见 [工作流发布记录](RELEASE-V018-WORKFLOW.md)。

## 项目介绍与实际交付

本次完成四套独立文稿：ChatGPT 中文、英文主稿各 22 页，DeepSeek Harness 中文与 Claude Code 英文实测各 21 页。主稿统一白底，包含 3 张纯章节标题页、完整与 8 页简短演讲、讲者备注、Story 和逐页命名版本。四稿均提供可移植 Project、PDF 和可编辑 PPTX，入口见[项目介绍集合](../examples/huandeng-introduction/README.md)。

真实 PowerPoint 16.0 已只读打开四个最终 PPTX，并逐页导出检查，共 86 页；四个 PDF 页数匹配，主稿的 44 页 PDF 也完成实际渲染审读。120 张原始 UI 截图按语言与推荐程度整理，37 张作为推荐素材，两份公开证据项目可移植打开。模型实测保留首轮风格，DeepSeek 的资产导入技术续跑单独披露。

清洁源码构建为 `35dfe649d450d22a0e4e3b70661be52c67eb9f7a`；Editor 已安装，Codex/Claude/DeepSeek 入口和账号插件已核对为 0.18.0。当前旧 Editor 会话未被强制关闭；ChatGPT 的另一个 code-plugin picker 项没有被宣称删除。具体证据、原生测试局限与发布哈希见交付记录和[发布清单](evidence/v018/release-manifest.json)。
