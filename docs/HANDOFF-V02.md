# HUANDENG v0.2 工程接续

## 当前目标

SPEC-V02.md 的本轮条目已完成：桌面应用、项目文件树、单页版本浏览/恢复、外部 Agent 维护 Story，以及可选布局起点。最终 Windows EXE 的六条核心流程已通过。本轮没有尚未实现的合同条目；以下是旧编辑器兼容方面的后续工作。

代码在 `<editor-checkout>`，分支 `huandeng/pptd`。桌面应用为 `dist/HUANDENG-win32-x64/HUANDENG Editor.exe`，默认入口 `Start-Huandeng.cmd`。产品显示 HUANDENG；兼容路径 `.huandeng` 与旧命令不迁移。

## 下轮从哪里继续

本轮产品需求完成后，优先补旧 PPTD 科学对象的视觉兼容。阅读 LEGACY-COMPARISON.md，从真实课件中出现的表格和公式开始，借鉴旧 open-pptd 的模型/渲染实现；随后再考虑图表、分组和图标。先用临时副本验证，源数据保留不等于显示一致。

其他后续选择是历史媒体快照、跨机器/Git 历史浏览、底部缩略图模式。这些均未纳入 v0.2 交付合同，不需要先做产品 benchmark。

## 已经接通的代码

- `pptd/store.ts` 与 `page-history.ts`：持久化版本、旧 journal 迁移、外部观察和单页恢复。
- `pptd/story.ts`、`mcp.ts`、`cli.ts`：外部 Agent 先记录意图，再提交事务。
- `app/components/pptd/page-history-dialog.tsx` 与 `project-tree.tsx`：历史预览、恢复和文件定位。
- `packages/desktop/`：Electron 原生窗口、文件对话框、项目切换和服务生命周期。
- `vite/routes/pptd.ts` 与 `api-plugin.ts`：HTTP/SSE，共享 writer，异步关闭。清理表按 `server.middlewares` 索引，因为 Vite configureServer 使用 Proxy。

## 构建注意事项

Windows 的默认 pnpm isolated 部署生成绝对 Junction，移动目录后会失效。使用已经修复的 Package-Huandeng.ps1：临时工作区 + 冻结锁文件 + hoisted 正常部署；不要改回 `hoisted --legacy`，它会重新解析依赖范围。

验证脚本会在移动前后检查打包目录和启动包内 CLI。真实桌面验证为 `scripts/verify-huandeng-desktop.mjs`，设置 `HUANDENG_DESKTOP_EXE` 后运行。脚本创建临时项目、独立偏好和服务状态，不使用正式研究文稿。

测试维持精简：本轮四个历史核心用例和一个六流程原生脚本。保存/版本逻辑改动才运行相关 store 测试；小 UI 调整做实际操作和类型检查即可。不要为了数量重复建设测试。

## 用户已有工作

THUG 中 `tests/fixtures/studio/pages/identities.page` 是用户已修改的文件，继续保留为用户改动；不要重置或混入软件提交。旧 FreestyleScientificSlides 和 Slidit 保留原状。正式科研文稿位于原研究项目中，未迁移到开发示例。

现有 `.pptd` 文件关联仍指向旧编辑器，HUANDENG 提供自己的桌面和开始菜单入口。远程仓库尚未设置用户的发布目标；upstream 只用于上游来源，不能当作本工程的推送目标。
