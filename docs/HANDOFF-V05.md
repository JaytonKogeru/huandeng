# HUANDENG Editor v0.5 — 工程交接

更新日期：2026-11-07（UTC）。**状态：正式运行时 `03a96957` 已完成验收并安装，常规用户 profile 已打开原 80 页项目供使用。** 产品范围见 [SPEC-V05](SPEC-V05.md)，完整需求覆盖见 [AUDIT-V05-COVERAGE](AUDIT-V05-COVERAGE.md)，本轮证据状态见 [RELEASE-V05](RELEASE-V05.md)。

## 1. 来源与交付状态

- 本轮源基线为 private origin main `8798d8f058dab89a80143e0c813780c8d87a70f9`。
- 首轮 Windows 候选基于该源加传输包 `157272ec0f472923d2f185b19a614f6e15ad48d3d9c9931e575369cddda657ae`（SHA-256），使用 Electron 开发宿主与 production bundle。安全摘要见 [证据索引](evidence/ui-v05/README.md)，后续小 UI 修复与正式包分别记录来源。
- 第二轮传输包 SHA-256 为 `afa888aebf145f5534fef829c3396e6f8b5364d7e4133203bc57f054da1cad6c`。代码门槛与 Desktop / Editor / Project 已在该轮重新通过；Science、背景/PDF、首轮性能和 Office 导出结果仍对应第一轮来源。
- 首个干净打包候选为 `80a83ee78c65b63350675e8be9d78d9372b19d80`，构建时间 12:47:09.8127082 UTC。实际包 Desktop 7/7、Editor 8/8 通过，但随后 80 页连续操作第三轮删除出现 Windows `EPERM` / `PENDING_RECOVERY`，未安装或发布。原错误、journal 和完整现场另行保全，见 [恢复审计](AUDIT-V05-RECOVERY.md)。
- 首批恢复修复传输 SHA-256 为 `5d1b1727ab07389434f048262c2c9afc5a2c32afd2607df63aa02a4514538448`（93 文件校验），对应提交 `bf0aa1f6e87183578f924e86cfb6c53368ff638a`；原失败交易已在 Windows 原路径、原 state 中完成恢复。后续 6 文件修正 SHA-256 为 `086f16abffbf44c40c3e0c3511760d12d0d370e5cfb6ee717f16d68bb034d29a`，补诊断优先级、保守事件分类及持续编辑验收参数，最终运行时提交与新包来源在下文单独记录。
- 上一正式 v0.4 程序来自 `c2fede5f45aa7a41e853304f9907c2d17e6bf8a2`；其安装、标签和完整历史验收继续由 [HANDOFF-V04](HANDOFF-V04.md) 说明。
- 当前正式运行时为 `03a96957f854ab593400218102928d1feb3c86d0`，产品版本 `0.5.0`，构建时间 `2026-11-07T13:26:12.5660629Z`，`sourceDirty=false`。隔离 worktree 的 `Package-Huandeng -Replace` exit 0，两次自包含/搬迁检查通过；实际 EXE 的 Desktop 7/7、Editor 8/8、恢复 6/6 已通过，80 页 5 轮与独立 20 轮连续操作均已通过。正式安装、About、快捷方式和常规 profile 启动也已通过，见后文。
- 发行标识为 `editor-v0.5.0`。程序构建标记继续指向经过验收的运行时 `03a96957`；后续文档和验收工具统计口径提交不改写该标记。远端分支与标签的同步结果由发布步骤独立核对。
- 日常开发与证据在本地保留；完成重要里程碑后统一同步 GitHub。不推 upstream、不发布 npm、不更改仓库可见性。

## 2. 本轮实现分区

| 分区 | 核心入口 | 当前实现 |
| --- | --- | --- |
| 客户端响应 | `packages/core/src/app/lib/pptd-document.ts` 及测试 | 未变页面/元数据/manifest 复用引用；草稿投影缓存；并发刷新合并；安全增删视觉预览；失败/重试/输入竞态保护 |
| 保存恢复 | `pptd/persistence.ts`、`atomic-write.test.ts`、`store-recovery.test.ts`、`app/lib/pptd-backend.ts`、`pptd-document.ts`、`use-pptd-document.ts` | Windows 暂时占用有界重试；原 journal 显式恢复；原 request/receipt 确认与后续草稿重建基线；第三态保留；离开保护和中文恢复入口 |
| 画布工具 | `app/lib/pptd-insertion.ts`、`components/pptd/insertion-layer.tsx`、`shape-insert-menu.tsx`、`editor-canvas.tsx`、`routes/huandeng.tsx` | 点击/拖动放置、形状种类、反向与 Shift 几何、取消、文字自动编辑和快捷键 |
| 页面导航 | `components/pptd/thumbnail-rail.tsx`、`renderer.tsx` | 可见区域及邻近缩略图挂载、稳定引用与 memo、短码优先、兼容搜索、复制短码、当前页滚动跟随 |
| 文档读取 | `packages/core/src/pptd/store.ts`、`store-performance.test.ts` | 有界并发、读取实际内容后复用解析、每轮共享素材指纹去重；保持 CAS/恢复和第三方修改语义 |
| writer 锁诊断与兼容 | `pptd/persistence.ts`、`writer-lock.test.ts`、`project-directory.test-utils.ts` | 继续使用兼容固定端口并在获取失败时拒绝写入；区分 OS 端口占用/不可用，测试目录避开系统不允许绑定的端口，新增跨进程旧 writer 与崩溃释放回归 |
| 正式前端 | `packages/core/scripts/build-editor.mjs`、`app/main-huandeng.tsx`、`app/huandeng.html` | core build 输出 `dist/editor`，专用 HUANDENG 入口；正式包启动、交互与性能已通过，导出回归保留首轮 production bundle 来源 |
| 本地静态服务 | `pptd/static-server.ts`、`static-server.test.ts`、`pptd/http.ts`、`pptd/launch.ts`、`vite/routes/pptd.ts` | 生产资源复用现有文档 API、文件监听和导出接口；开发服务器保留显式切换 |
| 视觉与语言 | `app/styles.css`、`components/brand-mark.tsx`、project / recipe / history / design-intent 面板、`packages/desktop/welcome.*` | 一套深绿品牌、中文术语、工具层级、短促动效、最近项目开始页 |
| 品牌派生 | `scripts/sync-brand-assets.mjs`、`packages/desktop/brand-assets.json` | 桌面 SVG 为单一源，派生应用标识、favicon、PNG/ICO 并校验摘要 |
| 证据工具 | `scripts/verify-editor-v05.mjs`、`verify-recovery-v05.mjs`、`benchmark-editor-v05.mjs`、`benchmark-pptd-v05.mjs` | 独立真实 Electron 交互、Windows 文件锁/第三态恢复、端到端性能、服务性能；分别保存可复核 JSON |

表中 `app/` 前缀相对于 `packages/core/src/`。变更集记录在 `.changeset/huandeng-workspace-polish.md`。

## 3. 客户端保存语义

`state.snapshot` 始终表示已确认快照；`client.page(pageId)` 叠加当前草稿或待确认的增删预览。`saving`、`canRetry` 和错误状态保持可见。只有全为安全 `element.add` / `element.remove` 的事务生成即时预览；其他操作继续等待服务结果。撤销历史和 `lastSaved` 在真实提交与快照读取完成后更新。

确定的事务拒绝会移除预览；超时、连接丢失等未知结果保留同一 requestId 和请求内容。若提交回执已取得、仅后续快照读取失败，重试只重新读取，避免重复提交或撤销。新对象提交途中继续输入的草稿以实际确认的页版本为基础；确认后又发生远端修改时保留冲突，不能把本地输入悄悄覆盖到远端最新版本。

`flushAll` 在结构事务结果未知时阻止不完整的保存/导出完成声明。新增对象确定失败时保留相关文字草稿并标明冲突；删除失败时恢复被删对象，同时保留其他对象已经输入的文字。第二轮相关定向测试为 23/23；首批恢复补修为 33/33，诊断优先级补修后为 34/34。

出现 `PENDING_RECOVERY` / `RECOVERY_REQUIRED` 时，客户端暂停自动提交并保留草稿，提供“恢复未完成保存”。`POST /__pptd/recover` 复用原 token、现有单 writer 队列和 journal 校验，不创建新交易。自有 pending 的客户端先恢复，再用原 requestId 和原内容确认 receipt；拿到 receipt 之前不把恢复后的快照直接接受为草稿基线。随后读取实际快照，保留并提交发送后输入。已取得 receipt 的请求不重复 mutation，Undo/Redo 沿用原历史目标和请求身份。

恢复 endpoint 的任何失败都保留 pending、预览与草稿，包括 4xx；第三态不能落入“确定拒绝原事务”的回滚分支。已有草稿可继续接收本地输入，即使服务因 journal 暂时只读。无自有 pending 的会话可以通过已恢复且可写的快照解除保护；仍有自有 pending 的会话必须确认自己的 receipt。较弱的 generic pending 诊断不能覆盖明确的 `RECOVERY_REQUIRED` 原因与 details。`data-hd-recovery`、`data-hd-recovery-state` 及恢复按钮 aria-label 供真实验收使用。

保存恢复同时看到非本事务页面、metadata 或 manifest 外部更改时，服务发布 external 事件；Git checkpoint 必须延后，不把这些更改归为本次 committed 而扩大 allowlist。恢复只清除保护状态时也更新 sequence 并发事件。详见 [恢复审计](AUDIT-V05-RECOVERY.md)。

## 4. 性能证据与复测

已完成 v0.4 正式程序的真实 Windows 基线，回执 `.verification/performance-v05/before-v04.json`。同机 80 页项目隔离副本、全新进程/profile/runtime、1600×1000 内容区，未清空 OS 文件缓存。首次可编辑 27.319 s；初始 80 个缩略图 renderer、8,962 个 DOM 节点；5 次 Delete 的视觉中位数 2,388.4 ms，文件落盘观测中位数 930.7 ms，服务确认观测中位数 2,982.7 ms。原始文件内容摘要保持不变。

第二次旧版回执 `before-v04-memory.json` 增加文档服务工作集：首次可编辑 24.124 s；启动后空闲 renderer / service 分别为 574,960 / 1,045,804 KiB，5 轮插入/删除后为 1,047,448 / 1,140,108 KiB。这次的 Delete 视觉/落盘/确认中位数分别为 2,393.6 / 921.9 / 2,922.4 ms。

首轮 v0.5 `after-v05-integration.json` 使用 **Electron 开发宿主 + production bundle**：首次可编辑 5,863.94 ms，初始 7 个缩略图 renderer、1,734 个 DOM 节点；Delete 视觉中位数 25.6 ms（20.9–30.6 ms），落盘中位数 225.6 ms（207.7–299.3 ms），确认中位数 528.6 ms。空闲 renderer / service 为 169,620 / 213,444 KiB，5 轮操作后为 306,748 / 216,480 KiB。三次测量的原始文件内容均保持不变。完整软件指标见 [安全摘要](evidence/ui-v05/performance-comparison.json)；此批候选数据不能标为最终安装包结果。

正式运行时 `03a96957` 的实际 EXE 已完成独立 5 轮与 20 轮运行，见 [正式包性能摘要](evidence/ui-v05/performance-packaged.json)。5 轮首次可编辑 5,981.30 ms，Delete 视觉中位 27.4 ms（24.2–34.3）、落盘 222.5 ms（209.0–316.3）、确认 508.5 ms（480.0–794.5）；空闲 renderer/service 为 176,676/215,172 KiB，5 轮后 314,744/217,380 KiB。20 轮首次可编辑 5,942.02 ms，视觉范围 19.2–30.5、落盘 178.8–259.5、确认 452.4–527.5 ms；renderer 169,368→417,656 KiB，service 206,432→271,872 KiB。两轮初末 1,734 DOM、80 导航/7 renderer，82 份原文档文件 hash 不变，rendererErrors/transactionFailures 为空，正常关闭。

20 样本原始脚本 summary 采用上中位值，原回执未改写；安全摘要同时按中间两项平均给出常规中位数 23.05/198.05/470.45 ms。此后验收工具修正中位数算法属于文档/工具提交，不改变已验证的正式运行时或旧 raw。20 轮后的工作集仍增长，后续需要长期会话内存分析，不能宣布泄漏已经消失。

端到端脚本读取实际安装程序，另建项目副本后测试。调用约定为：

```text
HUANDENG_DESKTOP_EXE=<actual executable>
HUANDENG_DESKTOP_APP=<optional Electron app directory>
node scripts/benchmark-editor-v05.mjs <absolute original deck.pptd> after-v05
node scripts/benchmark-editor-v05.mjs <absolute original deck.pptd> after-v05-sustained 20
node scripts/verify-editor-v05.mjs
node scripts/verify-recovery-v05.mjs
```

以上是环境变量名和调用形式，按当前 shell 设置。性能脚本输出 `.verification/performance-v05/<label>.json`；交互脚本输出 `.verification/editor-v05.json`、进程日志、三组截图和失败截图。性能回执可能包含私有项目路径与文件名，只提交去除研究信息的摘要。

交互脚本自行生成三页合成项目和隔离 profile/runtime，旧别名特意与页序不同。它检查工具选择不写文件、拖动中 Esc、正反向椭圆/Shift 圆、反向/约束线条、文字自动聚焦与 Backspace、真实文件 Delete/Undo/Redo、短码/旧 S 搜索和真实剪贴板。截图使用真实 BrowserWindow 内容尺寸；1024×768 审计仅在该隔离实例降低最小窗口限制，并在 JSON 中记录。

视觉反馈与持久化时间分开报告。5 次样本使用中位数和范围，启动注明进程与文件缓存条件；工作集按阶段采样，不能用单个瞬时数字宣称内存泄漏或修复。

性能脚本最后一个可选参数为操作迭代数，范围 1–50，默认 5；正式包按默认 5 轮保持基线可比，再另存 20 轮连续编辑运行。临时副本与未清空 OS 缓存的条件不构成 OneDrive 未驻留文件的冷启动验收。程序包体积另由 [候选体积摘要](evidence/ui-v05/package-footprint-initial-candidate.json) 记录：失败候选为 683,009,664 B（651.37 MiB），旧版无缓存基线 679,320,441 B；这次没有迁移 Electron 或完成依赖瘦身。正式安装目录已完成 [最终体积核查](evidence/ui-v05/package-footprint-final.json)：683,064,563 B（651.42 MiB）、29,113 文件，标记为 `03a96957` 且扫描前后不变；较旧版无缓存基线增加 3,744,122 B（0.55%），无 symlink/扫描错误。

## 5. 当前验收与剩余步骤

本轮各阶段的实际结果如下，正式包与早期来源分别标注：

| 范围 | 结果与证据 |
| --- | --- |
| Linux | [第二轮代码门槛](evidence/ui-v05/code-validation-phase2.json)：61 个测试文件、774/774 通过；Biome 558 个文件；核心 TypeScript 与 build 通过 |
| Windows 代码门槛 | [第二轮](evidence/ui-v05/code-validation-phase2.json)：61 个测试文件、773 通过及 1 项 POSIX 专属跳过；TypeScript/build、Biome 559 个文件通过 |
| 首批恢复修复代码门槛 | [独立摘要](evidence/ui-v05/code-validation-recovery.json)：Linux 63 文件、796/796；Windows 63 文件、795 通过及 1 项 POSIX 跳过；两端 TypeScript/build、Biome 569 文件通过 |
| 后续诊断/事件修正门槛 | [独立摘要](evidence/ui-v05/code-validation-recovery-followup.json)：Linux 63 文件、800/800；Windows 63 文件、799 通过及 1 项 POSIX 跳过；两端 TypeScript/build，Windows Biome 569 文件、Linux 修改 6 文件通过 |
| 正式 `03a96957` EXE | [Desktop 7/7](evidence/ui-v05/desktop-packaged-acceptance.json)、[Editor 8/8](evidence/ui-v05/editor-packaged-acceptance.json)、[恢复 6/6](evidence/ui-v05/recovery-packaged.json)，均 exit 0，无 renderer error；恢复四图核查通过 |
| 正式 80 页性能 | [5 轮可比及独立 20 轮](evidence/ui-v05/performance-packaged.json)均通过；两轮 82 份文档输入 hash 不变，零 renderer/transaction failure，正常关闭 |
| 正式安装与常规启动 | [安装验收](evidence/ui-v05/installation-acceptance.json)：两项快捷方式和图标、正式路径三页合成 smoke、真实 About handler 版本、常规 profile 原 80 页可写/无诊断、82 文档输入不变，原生窗口保留且可响应 |
| 原现场保存恢复 | [原失败恢复](evidence/ui-v05/original-failure-recovery.json)：80 页、原路径和 state、原 request/operation，三次同 receipt、历史一条、其他 81 份文档文件 hash 不变 |
| 真实 Windows 恢复交互 | [加强后的开发宿主 6/6](evidence/ui-v05/recovery-devhost-followup.json)：真实文件占用、解除后原 receipt、继续编辑、第三态拒绝、中文原因经过主动刷新仍正确、正常关闭；无 renderer/cleanup error |
| Windows Desktop | [第二轮 7/7](evidence/ui-v05/desktop-phase2-acceptance.json)；增加开始页近期项目和重新打开 |
| Windows Editor | [第二轮 8/8](evidence/ui-v05/editor-phase2-acceptance.json)；三组尺寸/主题截图及磁盘/剪贴板检查 |
| Windows Project | [第二轮 11/11](evidence/ui-v05/project-phase2-acceptance.json) |
| Windows Science | [22/22](evidence/ui-v05/science-acceptance.json) |
| 当前/固定版本背景与 PDF | [回归通过](evidence/ui-v05/background-export-acceptance.json)：2 个 occurrence、2 张背景栅格、8 张恢复后的前景对象栅格、2 个物理 PDF 页面 |
| 真实 80 页科研副本 | [首轮 7 组](evidence/ui-v05/real-project-acceptance.json)通过、970 个读入原文件的哈希不变；80 页 DOM 核查，单页恢复保留另 79 页 |
| 原生 Office 合成对象 | [首轮核心](evidence/ui-v05/native-office-acceptance.json)：5 页、6 个原生图表、1 个表格、1 个组合；表格/图表编辑后重开，5 个数学对象保留 |
| 真实 80 页 Office | [首轮核心](evidence/ui-v05/real-office-acceptance.json)：80 页全部渲染；78 张 PNG 与已验收基线字节相同，2 张差异页面人工核查通过 |
| 实际 UI 视觉 | [视觉审计](AUDIT-V05-VISUAL.md)：第二轮三张编辑器与首页图核查通过；随后正式 `03a96957` 的三张编辑器图及四张恢复图分别逐张核查通过 |

表中第一、二轮和修复开发宿主界面运行使用 production bundle，不能改写为最终正式包已验收。`80a83ee` 实际包的 Desktop/Editor 结果与随后性能失败另记。第一轮摘要保持原样，第二轮、恢复首批和后续修正各自存档。Editor 的 8 项包括自动化布局边界检查，另有绑定第二轮源码的实际截图人工核查；恢复界面四张截图按其后续来源单独审查。

Windows 首轮的 2 项失败是固定 writer 锁端口的系统 `EACCES`。第二轮只增强生产诊断，固定端口和失败时禁止写入保持兼容；测试 fixture 选择派生端口可用的临时项目目录，并覆盖旧 writer 的跨进程排他与崩溃释放。之后全量通过，唯一跳过是 POSIX 可执行权限特有的 Git hook 测试。

真实 Office 的自动回执仍保留当时的 `visualReview` 待人工字段，另有比较摘要与人工结果：78 张 PNG 完全匹配旧版已验收输出；页 3 原始输入在本轮之前已有矩形，按作者当前内容保留；页 29 只有 6,444 / 1,440,000 像素、最大 RGB 通道差 3 的边缘抗锯齿变化，人工查看原/新图及放大差异确认无布局/内容改变。本轮源输入 970 文件 hash 不变。原生 5 页生成器当时仅补 Windows fileURL 转换，此验证工具改动后来纳入第二轮；其导出核心和前端属于首轮传输包。

当前源码、构建、自包含、实际 EXE 的 7/8/6 组验证、80 页 5/20 轮性能和正式安装均已完成。Release/Handoff 与安全证据随本里程碑集中同步 private origin，发行标识 `editor-v0.5.0`；远端 refs 必须在实际同步后核对，本文不从本地程序通过推断 push 已发生。已有项目、科学对象和 Office 回归保持其实际来源，不声称所有检查都在最终包重新运行。

核心 build 会生成 `dist/editor`。前端源码热更新可用 `HUANDENG_DEV_SERVER=1`；生产包缺少正式前端时应由包检查暴露，不能仅凭开发模式可启动宣称候选包可交付。

## 6. 保留对象与安装约定

THUG 正式仓库为 `D:/_Proj/Huandeng`，正式程序为 `D:/_Proj/Huandeng/dist/HUANDENG-win32-x64/HUANDENG Editor.exe`，现在运行时标记为 `03a96957` / `0.5.0` / `sourceDirty=false`。旧版窗口经 `CloseMainWindow` 正常退出，没有强杀；v0.4 完整目录备份在 `D:/_Proj/Huandeng/.verification/installed-v04-backup-20261107-v05`。

2026-11-07 13:39:50.3573887 UTC 的安装路径核查通过：桌面与开始菜单两项快捷方式的目标、工作目录和图标均指向正式位置，图标 hash 与源码一致。最初 `install-v05.json` 的 `passed=false` 来自验证器把 Windows IconLocation 的 `,0` 索引后缀当作文件路径；程序搬迁与快捷方式实际上已经成功。仅修正验证器后，`install-paths-v05.json` 通过且 exit 0，原误报回执保持原样。

13:39:54.115 UTC 的 `installed-huandeng.json` 在正式路径完成三页合成项目 smoke，static 服务和可见窗口正常，无 renderer error，进程 exit 0。About 的实际原生菜单 handler 触发后捕获到 `HUANDENG Editor 0.5.0` 消息；该证据不是原生对话框截图。

13:43:11 UTC 通过常规用户 profile 重新打开原有 80 页项目，static 文档服务、可写、无诊断，82 份 manifest/页面/metadata 原文件 hash 不变。13:45:22.0675625 UTC 再核实原生窗口存在且可响应。该窗口与文档服务保留供用户使用；安全摘要不记录研究项目标题或路径。上述记录统一见 [安装验收摘要](evidence/ui-v05/installation-acceptance.json)。

原有用户修改的 `tests/fixtures/studio/pages/identities.page` 保留未提交状态，历史 SHA-256 为 `FE378A48E57B63F2B9E7286578F68EEFE856A381422930A6615F920B02622832`。真实科研项目只作为读取和副本来源；测试写入、恢复与导出发生在隔离副本。研究内容、截图、原目录列表及原始性能回执留在忽略目录。

GUI、CLI、MCP 共用同一文档服务。页面 UUID、短码、旧 S 别名、z-order、原始未知字段、命名版本和 Story 保持各自含义。性能优化不能缩减真实文件校验或把未确认写入冒充持久化完成。

## 7. 后续范围

本轮以日常大项目操作体验验收。字体存在/回退与文本/公式溢出是后续优先的科研交付工作；素材修复向导、大库批量编排与双屏演讲随后按需要推进。评论、完整 PPTX 往返、通用 React 科学组件和媒体时间线没有在本版中补齐。详见 [综合审计](AUDIT-V05-COVERAGE.md)，旧文档的延后项不得改写为 v0.5 已完成。
