# HUANDENG Editor v0.2 — 实施记录

日期：2026-11-07（Australia/Sydney）。当前合同：[SPEC-V02.md](SPEC-V02.md)。状态：v0.2 本轮合同已完成，最终 Windows 分发包验证通过。

## 已实现

### 桌面入口

Electron 独立窗口，原生菜单、打开/新建、最近项目和系统文件定位。首开显示开始页，之后恢复最近项目；不自动打开开发示例。窗口内部复用 React 画布和本机文档服务，外部 Claude Code/Codex/ChatGPT 共用当前 writer。编辑器没有 AI 聊天框。

桌面离开页面前等待未提交编辑保存，关闭自己启动的文档服务并释放 writer。独立 CLI 已启动的兼容服务只被连接，不因桌面退出而被终止。

名称统一为 HUANDENG Editor、HUANDENG Story、HUANDENG Plugin。保留已有 Huandeng 目录、`.huandeng` 元数据、旧 CLI/MCP 调用别名。

### 页面与项目

每页仍是独立 `.page`，`deck.pptd` 仅管理页序。页面 UUID、四位短码与页序无关。项目树展示实际 manifest、页面、素材、元数据和导出文件；点击 `.page` 选中相应页面，缩略图右键也可定位文件。

保留图层、自由对象编辑和现有保存流程。补齐常用页面快捷键、演示快捷键和画布焦点。“布局起点”默认折叠，只是可选辅助；结果是普通对象，可解除布局关联而保留全部元素。

### 单页历史

右键缩略图“查看历史版本”，可浏览初始状态、编辑、外部文件更新和恢复记录。选中版本进行只读预览，点击“将此版本恢复为当前页”。

恢复是一笔新事务，保持页面身份、路径、位置、其他页和无关元数据；恢复目标页原始内容及该页 Story/角色/组件元数据。历史复用已有事务 before/after，新增初始和外部观察记录不复制整份活动 deck。时间线跨重启保留。

### Agent 维护的 Story

Story 默认展示 Agent 记录的意图、保留事项、本次修改、来源、作者和时间。用户可点击铅笔纠正，正常使用不需要手填。

新增 `huandeng_story_record` 与 CLI `frame`；MCP 指令要求 Agent 先记录对用户需求的理解，再按稳定 ID 和当前 revision 修改。记录不会伪装成用户批准。新增项目树查询、历史快照与指定版本恢复接口；旧工具名仍可调用。

## 验证

| 检查 | 已观察结果 |
| --- | --- |
| 新增单页历史用例 | 4/4 通过，包含重启、旧 journal、逐页恢复、外部文件变化及真实 Story 写入 |
| 既有 store 加新历史用例 | 24/24 通过 |
| 核心 TypeScript | 通过 |
| 核心构建 | Linux 与 Windows 均通过 |
| Biome | 通过；保留上游模板中既有的五个符号链接警告 |
| 原生桌面工作流 | Windows 最终 `HUANDENG Editor.exe` 上 6/6 通过，渲染异常为 0 |
| 最终分发目录 | 移动前后均通过包内 CLI 启动和依赖检查；2,077 个目录，无 Junction/外部链接 |

六条桌面流程覆盖：原生窗口和品牌、真实 stdio MCP 的 Story 与页面修改、缩略图右键预览和恢复、项目树定位、关闭/重启及历史持久化、原生 New/Open IPC 与实际新文件。文件选择阶段仅将操作系统对话框返回值指向临时路径，其余应用、保存、服务和 UI 均实际执行。

最终包验证时间为 2026-11-07 15:39（Australia/Sydney），Electron 38.7.2。记录见 [桌面验收 JSON](evidence/desktop-v02.json)、[历史用例 JSON](evidence/page-history-v02.json)、[历史界面](evidence/desktop-v02-history.jpg) 和 [编辑界面](evidence/desktop-v02-editor.jpg)。桌面及开始菜单快捷方式已经安装。

实机检查曾发现旧打包方式使用绝对 Junction，移动目录后失效；已改为冻结锁文件的 hoisted 部署并在最终 EXE 上重新完成六条流程。关闭服务的 Vite Proxy 入口也已修正，重启验收检查了服务退出及 discovery 清理。

没有新增 UI 单元测试矩阵。本轮新增四个核心用例和一个六流程桌面脚本。上轮 47 个文件/607 项是整个仓库数字，其中 40 个文件/523 项继承自上游，上一轮 HUANDENG 新增 7 个文件/84 项。

## 真实边界

- 历史预览引用当前项目媒体；本轮没有归档每张历史图片的二进制。
- 页面时间线来自本机文档历史，不从任意 Git 分支重建。显式 Git checkpoint 保留。
- 旧 open-pptd 对图表、表格、分组、图标及公式的覆盖更广。HUANDENG 对部分高级对象仍显示未支持占位并保留源数据，不能宣称复杂旧课件已完全视觉兼容。详见 [旧编辑器核对](LEGACY-COMPARISON.md)。
- 缩略图当前使用左侧栏；旧编辑器的左侧/底部切换尚未迁移。
- 本轮安装目标为 THUG。未修改 AHE，也未更改现有 `.pptd` 默认文件关联。

## 用户文件

THUG 上用户已修改的 `tests/fixtures/studio/pages/identities.page`（B6XA）未被覆盖；同步前后 SHA-256：

`FE378A48E57B63F2B9E7286578F68EEFE856A381422930A6615F920B02622832`

历史与桌面验收均使用系统临时目录中的独立副本。旧 FreestyleScientificSlides 项目仅做源码读取；正式科研 deck 未写入。

## 工程入口

源代码：`<editor-checkout>`。桌面产物：`dist/HUANDENG-win32-x64/HUANDENG Editor.exe`。启动：`Start-Huandeng.cmd`。安装快捷方式：`scripts/Install-Huandeng.ps1`。

未发布 npm、GitHub release 或公共服务。本地源码继续保留 OpenSlide MIT 声明。
