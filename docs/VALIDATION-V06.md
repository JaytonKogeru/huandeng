# HUANDENG v0.6 — 验证报告

日期：2026-11-08（Australia/Sydney）。收据时间均使用 UTC。对应 [SPEC](SPEC-V06.md)、[Implementation](IMPLEMENTATION-V06.md) 和 [综合审计](AUDIT-V06.md)。

**当前结论：v0.6.0 clean build/package、最终 EXE 六套共 61 项、80 页项目 20 轮性能及正式安装均通过。原 80 页项目已在普通用户窗口重新打开，原文件未变。** 历史源码候选、最终包与安装目录分别记录；发行标识为 `editor-v0.6.0`，远端 refs 由发布步骤独立核对。

## 1. 候选来源与隔离范围

- 已发布 v0.5 基线为 `ef80f5bcb8b89361c7d2335d5c8cc7831ef15715`，本轮开始时使用的运行时为 `03a96957f854ab593400218102928d1feb3c86d0`。
- Linux 初始传输的全部 943 个仓库文件逐一核对 SHA-256，与该基线一致；本地 `2cec4bfccfa96493006bb1268f23f8802b1ca845` 只是建立差异的快照，不作为可推送历史。
- Windows 候选位于 `D:\_Proj\Huandeng-v06-20261108`，分支为 `editor/v0.6-authoring-motion`，使用隔离 worktree、profile 和 runtime。
- 早期真实界面验收使用 Electron `38.7.2` 开发宿主与构建后的静态前端；第 3.2 节另使用最终打包 EXE，不能将两者的结果混记。
- 最终 runtime 源码提交为 `9c27465aa88b5b2b59288f5b321596ad10fcb92c`；构建标记为 `productVersion: 0.6.0`、`sourceDirty: false`、`builtAt: 2026-11-07T16:47:49.8347220Z`，build/package 均退出 0。
- 源码候选证据归档于 `.verification/v06-source-candidate`；最终包六套汇总为 `.verification/v06-packaged-gates.json`。安装与后续文档提交应保留上述 runtime 来源身份。
- 合成项目允许修改；既有科研文件 仅使用隔离副本。原稿、用户正式窗口及原有未提交修改不作为测试写入目标。

## 2. 静态、模型与协议门禁

| 检查 | 已观察结果 | 能证明的范围 |
| --- | --- | --- |
| Linux 集成单测 | **870/870，75 个测试文件通过** | 当前 Linux 集成源码的模型、存储及相关回归 |
| Linux TypeScript | 通过 | 当前集成源码类型检查 |
| Linux Biome | **615 个文件检查通过** | 当前检查范围的格式与静态规则 |
| 键盘 helper 与 grouping-store | 24/24 通过，其中键盘 18 项 | 输入作用域、组合层级、删除顺序与循环逻辑；包含于后续集成门禁，不额外累加 |
| 真实 MCP/CLI/launcher 链路 | 9 组通过 | 含空格路径、SDK stdio、共享 writer、歧义及精确引用、素材、原字节与干净 stderr |
| Windows 早期 full gate | 862 项通过 | 早期传输来源的阶段收据；**不能作为最终增量同步后的全量门禁** |
| Windows 最终源码单测 | **869 pass + 1 POSIX-only skip，总计 870，75 个文件** | 最终 runtime 源码；跳过项未计为通过 |
| Windows 最终 TypeScript / Biome | 均通过；Biome 615 个文件 | 最终 Windows 源码检查，不借用 Linux 结果 |

协议回执为 `packages/core/.verification/project-agent-runtime/report.json`。通过本地 stdio 链路不等于已经安装到用户的实际 Codex/Claude 客户端，也不等于建立 ChatGPT 私有连接。

## 3. 真实 Windows 专项收据

以下相对路径均基于 Windows worktree 根目录。每组脚本自行创建独立合成项目，不把前一组留下的项目状态作为成功条件。

### 3.1 历史源码候选

下表收据及相关证据已归档到 `.verification/v06-source-candidate`，不再将原路径中的最终包报告误认作此轮候选。

| 脚本 / 收据 | UTC 时间 | 结果 | 进程与错误 |
| --- | --- | --- | --- |
| `verify-keyboard-v06.mjs` / `keyboard-v06.json` | `2026-11-07T16:35:01.308Z` | **14/14** | `rendererErrors: []`；正常退出 0 / null |
| `verify-project-assets-v06.mjs` / `project-assets-v06.json` | `2026-11-07T16:35:38.145Z` | **11/11** | `rendererErrors: []`；正常退出 0 / null |
| `verify-animation-v06.mjs` / `animation-v06.json` | `2026-11-07T16:40:03.860Z` | **15/15** | `rendererErrors: []`；关闭重开产生的两次退出均为 0 / null |

键盘首轮 `2026-11-07T16:08:04.611Z` 的 12/12 是早期 69 文件同步候选，不替代上表新增的时间线与真实手势检查。历史失败与后续成功分别保留。

### 3.2 最终打包 EXE

| 验收 / 当前收据 | UTC 时间 | 结果 | 退出证据 |
| --- | --- | --- | --- |
| 键盘 / `.verification/keyboard-v06.json` | `2026-11-07T16:49:16.438Z` | **14/14** | 正常退出 0 / null |
| 项目与素材 / `.verification/project-assets-v06.json` | `2026-11-07T16:49:53.399Z` | **11/11** | 正常退出 0 / null |
| 动画 / `.verification/animation-v06.json` | `2026-11-07T16:50:44.189Z` | **15/15** | 两次正常退出均为 0 / null |
| 既有桌面流程 / `.verification/desktop-v04.json` | `2026-11-07T16:51:26.332Z` | **7/7** | 旧报告没有 normalExit 字段，不补造 |
| 既有编辑器 / `.verification/editor-v05.json` | `2026-11-07T16:51:40.397Z` | **8/8** | 旧报告没有 normalExit 字段，不补造 |
| 保存恢复 / `.verification/recovery-v05.json` | `2026-11-07T16:51:56.309Z` | **6/6** | 最后一项明确检查正常关闭 |

六套共 **61/61**，均为 `rendererErrors: []`。旧脚本保留 v0.4/v0.5 文件名，但这次执行目标是上述 v0.6.0 最终 EXE；结果版本以来源和运行目标判断。

## 4. 键盘、焦点与手势

- 核对固定画布 Tab 入口、顶层对象 Tab/Shift+Tab、组合单次停靠、根 Enter 编辑、Esc 返回对象及离开画布。
- 连续方向键按最新草稿移动，Shift 加大步长；组合、多选、图层、原生 Edit 剪切/复制/粘贴与撤销重做有真实文件断言。
- 文字、属性和表格输入保留原生键盘行为；模拟 IME 事件检查不误触编辑命令，不据此宣称所有真实输入法均已验收。
- F1、可见区域 F6、侧栏收起、缩略图 ↑↓/Home/End/Enter、快速 Home → Enter → PageDown、重复 occurrence、只读导航及外部删除焦点回退通过。
- 实际移动和缩放预览后按 Esc，再 mouseUp：坐标恢复、选择保留；越过自动保存窗口后没有新事务，历史与原文件字节不变。
- 时间线按钮上的文档 Undo/Redo、Esc 退出预览，以及放映 range 的 Tab/End/Esc 通过。完整边界见 [键盘审计](AUDIT-V06-KEYBOARD-UX.md)。

## 5. 项目、素材与排版检查

- 同一 Main 的两场派生演讲可直接进入；总览与编排准确跳到重复 occurrence，每次引用的独立讲稿可持久化。
- 素材原名搜索、usage 定位、复用已有路径且不复制新字节、缺图修复保留原对象属性通过。
- **至少 3 张已实际解码图片**的页面在文字保存后保留全部图片 URL；同路径 SVG 真实换字节及尺寸后，相关画布和库预览更新，控制图片不变。
- 文件选择期间发生外部写入时返回 409，错误保留；重新读取后可正确重试，没有用旧 revision 覆盖外部结果。
- CLI 只读、本机 `queryLocalFonts`、继承字体回退、实际文字溢出定位与检查结果过期通过；权限不支持时仍需明确报告未验证。

## 6. 动画编辑与放映

- 15 组覆盖默认插入后建轨、多对象关键帧、精确时间/数值/easing、轨道及关键帧增删、演讲步骤，以及基础几何保持不变。
- 逐帧预览与播放不提交基础内容；关键帧拖动只形成一次事务，Undo/Redo 完整，Esc 取消拖动。重复时间及缩短时长保留未确认输入并支持复制。
- 模拟已提交但响应丢失后，使用原 request 恢复并确认对应草稿；正常关闭再打开保留时间线与步骤。
- 1024×768、深色和 reduced-motion 环境中时间线可达且可收回；未来 schema 静态可读而不可误覆盖，固定版本预览使用归档时间线。
- 放映前进/后退按 cue，重复 occurrence 重置；编辑中收到未来 schema 或源页面移除时，旧草稿与未确认输入保留到明确处置。
- 源码候选动画收据记录 **33 次 mutation**；两个兄弟页面与测试前字节相同，并记录 SHA-256。最终包重新通过同一 15 组；这里不把候选 mutation 数移作最终收据字段。

## 7. 同机性能对照

脚本为 [benchmark-editor-v05.mjs](../scripts/benchmark-editor-v05.mjs)。各轮均为同机、1600×1000、既有科研项目的 80 页副本、当前页四个对象与七个缩略图渲染器，当前画布无图片；下表区分已发布 v0.5、v0.6 开发宿主与最终包。

| 测量对象 | 循环数 | 启动记录（秒） | visual Delete 中位数（ms） | 持久化观测中位数（ms） |
| --- | ---: | ---: | ---: | ---: |
| v0.6 初始开发候选 | 50 | 7.341 | 62.6 | 204.05 |
| 同机 v0.5 包对照 | 20 | 6.213 | 23.75 | 200.55 |
| 固定 Tab 入口后的 v0.6 候选 | 20 | 6.063 | **25.4** | 204.5 |
| v0.6.0 最终打包 EXE | 20 | **5.4972755** | **24.7** | **191.2501** |

启动列是各轮启动观测，不是多次冷启动的中位数。visual Delete 与持久化分别反映界面反馈和脚本观测到的文件结果，不能互相替代；完整字段及采样见原始 JSON。

最终包启动观测为 **5497.2755 ms**；Delete 最小/中位/最大为 **21.2 / 24.7 / 36.8 ms**；持久化为 **179.6001 / 191.2501 / 219.9001 ms**；ack 观测中位数为 **476.7001 ms**。动态 `tabindex` 的主要回退在最终包复测中也已消除，Delete 接近 v0.5 同机对照。

最终包 DOM 节点 **1820** 且循环前后稳定；80 个缩略图按钮、7 个缩略图 renderer、合计 8 个页面 renderer。20 轮没有 renderer、transaction 或 close 错误，原项目 **82 个文件 hash 全部不变**。

前 50 轮及最终包性能报告中的画布图片数均为 **0**，其空数组 URL 比较不能证明图片复用。第 5 节含至少 3 张解码图片的专项已在最终包复验，补足了正向证据；它也不等于完成大量高清图长会话压力测试。

## 8. 20 轮内存记录

| 来源 / 指标（MiB） | 开始 | 20 轮后 | 显式 GC 后 |
| --- | ---: | ---: | ---: |
| 修订源码候选 / Renderer JS 已用堆 | 17.26 | 25.24 | 16.51 |
| 修订源码候选 / Renderer working set | 171.33 | 409.57 | 320.85 |
| 修订源码候选 / 文档服务 working set | 207.59 | 262.8 | 无对应 GC 结论 |
| 最终包 / Renderer JS 已用堆 | 17.5377 | 31.0874 | 16.4735 |
| 最终包 / Renderer working set | 170.3594 | 405.0117 | 322.0078 |
| 最终包 / 文档服务 working set | 211.8398 | 290.8828 | 无对应 GC 结论 |

两次短会话的 JS 堆在显式 GC 后回落，增长中有可回收对象；最终包 renderer working set 仍高于开始值，文档服务也有增长。堆、进程驻留内存和服务进程必须分别观察，**一次 GC 不证明无泄漏**。20 轮结果已完成，更长真实使用仍需保留内存采样。

## 9. 本轮失败、定位与修复

| 实际失败 | 证据与根因 | 修复及复核 |
| --- | --- | --- |
| Delete 界面反馈从约 24 ms 回退到约 63 ms | `Element.setAttribute` 插桩定位聚焦画布 `tabindex -1→0` 单次耗时 **44.2–46.2 ms** | 根固定为 0、frame 固定为 -1，程序管理对象焦点；修订候选 25.4 ms、最终包 24.7 ms，键盘 14 组通过 |
| 快速 Home → Enter → PageDown 到错页 | BrowserRouter transition 未提交，focus 已变化而闭包 `pageIndex` 仍旧 | 从同步 URL 的 page/occurrence 推进，并保护集合身份；原快速序列通过，不在测试中加延时 |
| 预览状态误显示为文档只读 | 基础编辑暂停使用的 `readonly` 混入保存状态，已保存动画不能准确显示状态 | 保存状态按真实 `pageReadonly` 判断，预览仍暂停基础写入；动画 15 组完成保存、预览与返回编辑 |

导航失败收据保留于 `.verification/v06-pre-navigation-fix`。`selectPage` 从最新 URL 构造查询的补强发生在源码候选键盘收据之后，现已包含在最终 EXE 的 14 组重验中。

事件顺序复核还修正了画布 Esc 阻止 window bubble 手势取消的问题；活动手势优先直接取消，并由第 4 节真实 move/resize 断言证明没有产生误提交。

## 10. 真实项目与原稿保护

- **科研参考文件：57 页 PPTX**。隔离副本在真实 PowerPoint 中只读打开，无修复导出全部页面；原文件 SHA-256 不变。视觉审计查看第 1–8、25–32 页接触表。
- 科研参考文件用于理解科研作者的画面结构与真实 Office 兼容，不能把该结果宣称为 HUANDENG 已实现 PPTX 导入。
- **既有科研项目：80 页 PPTD**。性能和回归操作在副本执行；最终包 20 轮前后核对的原项目 82 个文件 hash 均不变。
- 科研原图、接触表及原稿路径只保留于本地证据，不作为公开仓库的产品示例或截图附件。

## 11. 证据入口与剩余范围

具体步骤、输出 schema 和隔离环境变量见 [键盘脚本](../scripts/verify-keyboard-v06.mjs)、[项目与素材脚本](../scripts/verify-project-assets-v06.mjs)、[动画脚本](../scripts/verify-animation-v06.mjs)。Windows 收据、截图与日志以第 1、3 节来源为准；原始文件不可用时不得仅凭汇总替代新的运行。

本轮没有验收任意输入法及完整屏幕阅读器、电子表格式画布单元格导航、任意 occurrence 视觉覆盖、视频编码或原生 PowerPoint 动画。PNG/PDF/PPTX 仍输出基础版式并报告 `TIMELINE_STATIC_EXPORT`，不能把编辑器播放成功等同于动态导出成功。

## 12. 正式打包、安装与里程碑同步

| 最终门禁 | 当前状态 | 证据与来源 |
| --- | --- | --- |
| 最终源码冻结与 clean build/package | **通过** | runtime `9c27465`，0.6.0，sourceDirty=false，构建时间见第 1 节；build/package exit 0 |
| 最终包专项与已有回归 | **通过** | 六套 61 项、20 轮性能与内存、82 个原文件 hash；退出字段按第 3.2 节分别记账 |
| 正式安装及用户入口 | **通过** | 原路径安装、两个快捷方式/图标、About 0.6.0、三页合成项目正常退出、普通用户原 80 页项目可写且源文件未变 |
| 重要里程碑发行身份 | `editor-v0.6.0` | 真实 Windows 历史上的源码与交付文档，annotated tag；remote refs 在推送后独立核对，不推送 Linux 传输快照历史 |

正式安装目录为 `D:\\_Proj\\Huandeng\\dist\\HUANDENG-win32-x64`。准备目录的 **29,141 个文件 / 683,432,467 bytes** 逐一核对 SHA-256 和大小，与最终验收包一致；再次通过自包含检查。旧 v0.5 窗口通过 CloseMainWindow 正常退出，服务进程随之结束，未强制关闭；旧包保留于 `.verification/installed-v05-backup-20261108-v06`。

桌面和开始菜单快捷方式的目标、工作目录和 icon 均核对，icon 字节与源码一致。正式路径 [安装验证脚本](../scripts/verify-installed-huandeng.mjs) 于 `2026-11-07T17:03:47.985Z` 通过：独立三页合成项目、static 服务、可写、无 renderer errors，正常退出 0 / null。实际 About 菜单 handler 在临时 `showMessageBox` stub 下返回 `HUANDENG Editor 0.6.0`；没有声称拍摄原生 About 对话框。

随后普通用户 profile 于 `2026-11-07T17:05:30.861970+00:00` 重新打开原 80 页项目：窗口可响应，static 服务可写，diagnostics 为空，82 份文档源文件与测试前相同，窗口保留。原仓库未提交的 `identities.page` 也保持原 SHA-256，未纳入提交。

原始收据为 `.verification/v06-prepared-install.json`、`v06-install-replacement.json`、`v06-shortcuts.json`、`installed-v06.json` 和 `v06-user-reopen.json`。可提交的摘要剔除科研内容和原路径，连同实际合成截图保存在 [ui-v06](evidence/ui-v06/README.md)。
