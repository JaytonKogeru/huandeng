# HUANDENG Editor v0.5 — 候选工程交接

更新日期：2026-11-07（UTC）。**状态：本地实现与集成验收中，未在本文确认正式安装或发布。** 产品范围见 [SPEC-V05](SPEC-V05.md)，完整需求覆盖见 [AUDIT-V05-COVERAGE](AUDIT-V05-COVERAGE.md)，本轮证据状态见 [RELEASE-V05](RELEASE-V05.md)。

## 1. 来源与交付状态

- 本轮源基线为 private origin main `8798d8f058dab89a80143e0c813780c8d87a70f9`。
- 上一正式 v0.4 程序来自 `c2fede5f45aa7a41e853304f9907c2d17e6bf8a2`；其安装、标签和完整历史验收继续由 [HANDOFF-V04](HANDOFF-V04.md) 说明。
- v0.5 最终运行时提交、构建时间、`huandeng-build.json`、程序包校验、安装时间和里程碑标签须在本轮真实验收后补齐。目前不把工作区快照或阶段性检查写成正式发行回执。
- 日常开发与证据在本地保留；完成重要里程碑后统一同步 GitHub。不推 upstream、不发布 npm、不更改仓库可见性。

## 2. 本轮实现分区

| 分区 | 核心入口 | 当前实现 |
| --- | --- | --- |
| 客户端响应 | `packages/core/src/app/lib/pptd-document.ts` 及测试 | 未变页面/元数据/manifest 复用引用；草稿投影缓存；并发刷新合并；安全增删视觉预览；失败/重试/输入竞态保护 |
| 画布工具 | `app/lib/pptd-insertion.ts`、`components/pptd/insertion-layer.tsx`、`shape-insert-menu.tsx`、`editor-canvas.tsx`、`routes/huandeng.tsx` | 点击/拖动放置、形状种类、反向与 Shift 几何、取消、文字自动编辑和快捷键 |
| 页面导航 | `components/pptd/thumbnail-rail.tsx`、`renderer.tsx` | 可见区域及邻近缩略图挂载、稳定引用与 memo、短码优先、兼容搜索、复制短码、当前页滚动跟随 |
| 文档读取 | `packages/core/src/pptd/store.ts`、`store-performance.test.ts` | 有界并发、读取实际内容后复用解析、每轮共享素材指纹去重；保持 CAS/恢复和第三方修改语义 |
| 正式前端 | `packages/core/scripts/build-editor.mjs`、`app/main-huandeng.tsx`、`app/huandeng.html` | core build 输出 `dist/editor`，专用 HUANDENG 入口；当前需要继续验证完整实际桌面链路 |
| 本地静态服务 | `pptd/static-server.ts`、`static-server.test.ts`、`pptd/http.ts`、`pptd/launch.ts`、`vite/routes/pptd.ts` | 生产资源复用现有文档 API、文件监听和导出接口；开发服务器保留显式切换 |
| 视觉与语言 | `app/styles.css`、`components/brand-mark.tsx`、project / recipe / history / design-intent 面板、`packages/desktop/welcome.*` | 一套深绿品牌、中文术语、工具层级、短促动效、最近项目开始页 |
| 品牌派生 | `scripts/sync-brand-assets.mjs`、`packages/desktop/brand-assets.json` | 桌面 SVG 为单一源，派生应用标识、favicon、PNG/ICO 并校验摘要 |
| 证据工具 | `scripts/verify-editor-v05.mjs`、`benchmark-editor-v05.mjs`、`benchmark-pptd-v05.mjs` | 独立真实 Electron 交互、端到端性能、服务性能；分别保存可复核 JSON |

表中 `app/` 前缀相对于 `packages/core/src/`。变更集记录在 `.changeset/huandeng-workspace-polish.md`，最终审查时补齐覆盖的运行时变化。

## 3. 客户端保存语义

`state.snapshot` 始终表示已确认快照；`client.page(pageId)` 叠加当前草稿或待确认的增删预览。`saving`、`canRetry` 和错误状态保持可见。只有全为安全 `element.add` / `element.remove` 的事务生成即时预览；其他操作继续等待服务结果。撤销历史和 `lastSaved` 在真实提交与快照读取完成后更新。

确定的事务拒绝会移除预览；超时、连接丢失等未知结果保留同一 requestId 和请求内容。若提交回执已取得、仅后续快照读取失败，重试只重新读取，避免重复提交或撤销。新对象提交途中继续输入的草稿以实际确认的页版本为基础；确认后又发生远端修改时保留冲突，不能把本地输入悄悄覆盖到远端最新版本。

`flushAll` 在结构事务结果未知时阻止不完整的保存/导出完成声明。新增对象确定失败时保留相关文字草稿并标明冲突；删除失败时恢复被删对象，同时保留其他对象已经输入的文字。相关定向测试当前为 23/23。

## 4. 性能证据与复测

已完成 v0.4 正式程序的真实 Windows 基线，回执 `.verification/performance-v05/before-v04.json`。同机 80 页项目隔离副本、全新进程/profile/runtime、1600×1000 内容区，未清空 OS 文件缓存。首次可编辑 27.319 s；初始 80 个缩略图 renderer、8,962 个 DOM 节点；5 次 Delete 的视觉中位数 2,388.4 ms，文件落盘观测中位数 930.7 ms，服务确认观测中位数 2,982.7 ms。原始文件内容摘要保持不变。

端到端脚本读取实际安装程序，另建项目副本后测试。调用约定为：

```text
HUANDENG_DESKTOP_EXE=<actual executable>
HUANDENG_DESKTOP_APP=<optional Electron app directory>
node scripts/benchmark-editor-v05.mjs <absolute original deck.pptd> after-v05
node scripts/verify-editor-v05.mjs
```

以上是环境变量名和调用形式，按当前 shell 设置。性能脚本输出 `.verification/performance-v05/<label>.json`；交互脚本输出 `.verification/editor-v05.json`、进程日志、三组截图和失败截图。性能回执可能包含私有项目路径与文件名，只提交去除研究信息的摘要。

交互脚本自行生成三页合成项目和隔离 profile/runtime，旧别名特意与页序不同。它检查工具选择不写文件、拖动中 Esc、正反向椭圆/Shift 圆、反向/约束线条、文字自动聚焦与 Backspace、真实文件 Delete/Undo/Redo、短码/旧 S 搜索和真实剪贴板。截图使用真实 BrowserWindow 内容尺寸；1024×768 审计仅在该隔离实例降低最小窗口限制，并在 JSON 中记录。

视觉反馈与持久化时间分开报告。5 次样本使用中位数和范围，启动注明进程与文件缓存条件；工作集按阶段采样，不能用单个瞬时数字宣称内存泄漏或修复。

## 5. 仍需完成的验收顺序

1. 完成正式静态前端/服务集成，运行最终类型、Biome、单元测试及生产 build。已有 745 项通过的阶段性全量运行不替代最终冻结检查。
2. 在 THUG 的隔离候选目录运行新交互脚本；查看 1600×1000、1024×768、深色模式和开始页。动作成功与截图外观分别判断。
3. 使用同一 80 页材料完成 v0.5 性能对比，记录首可编辑、缩略图、DOM、视觉/保存和内存阶段值。
4. 运行相关桌面、项目、科学对象与导出回归。重点检查静态服务下的命名版本、固定/重复引用、外部更新、冻结导出和访问边界；旧 Vite 路径仍可开发使用。
5. 冻结本地源码，更新产品 release 元数据，构建自包含正式包，运行实际 EXE、迁移验证和既有路径安装。记录 About、构建标记、快捷方式及程序实际来源。
6. 补齐本文与 RELEASE-V05 的真实源码/测试/构建/安装信息，再统一同步 private origin 与预定 `editor-v0.5.0` 标签。保留各次失败及后续通过回执的真实来源。

核心 build 会生成 `dist/editor`。前端源码热更新可用 `HUANDENG_DEV_SERVER=1`；生产包缺少正式前端时应由包检查暴露，不能仅凭开发模式可启动宣称候选包可交付。

## 6. 保留对象与安装约定

THUG 正式仓库为 `D:/_Proj/Huandeng`，既有正式程序为 `D:/_Proj/Huandeng/dist/HUANDENG-win32-x64/HUANDENG Editor.exe`。候选构建与测试使用隔离目录；正式替换时保留上一版本备份，应用正在编辑时不强行覆盖。

原有用户修改的 `tests/fixtures/studio/pages/identities.page` 保留未提交状态，历史 SHA-256 为 `FE378A48E57B63F2B9E7286578F68EEFE856A381422930A6615F920B02622832`。真实科研项目只作为读取和副本来源；测试写入、恢复与导出发生在隔离副本。研究内容、截图、原目录列表及原始性能回执留在忽略目录。

GUI、CLI、MCP 共用同一文档服务。页面 UUID、短码、旧 S 别名、z-order、原始未知字段、命名版本和 Story 保持各自含义。性能优化不能缩减真实文件校验或把未确认写入冒充持久化完成。

## 7. 后续范围

本轮以日常大项目操作体验验收。字体存在/回退与文本/公式溢出是后续优先的科研交付工作；素材修复向导、大库批量编排与双屏演讲随后按需要推进。评论、完整 PPTX 往返、通用 React 科学组件和媒体时间线没有在本候选中补齐。详见 [综合审计](AUDIT-V05-COVERAGE.md)，旧文档的延后项不得改写为 v0.5 已完成。
