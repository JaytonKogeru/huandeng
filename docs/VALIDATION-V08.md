# HUANDENG v0.8 — 验证报告

日期：2026-11-08（Australia/Sydney）；机器收据使用 UTC。对应 [Audit](AUDIT-V08.md)、[Spec](SPEC-V08.md)、[Implementation](IMPLEMENTATION-V08.md)。

**v0.8.0 干净构建、最终 EXE 131/131、25 轮连续放映、80 页副本 50 对操作和正式安装均已通过；普通窗口已重新打开原项目。** 全部 15 项门槛有来源、结果和收据哈希，见 [验收摘要](evidence/v08/acceptance.json)。

## 1. 来源与验证边界

| 项目 | 来源 |
| --- | --- |
| 开发基线 | `f3e1fa1bda590e6b69d0ef47fabff077bdde0d49` |
| v0.8 运行时代码 | `ecba4cb24d2753841290eb5d29f68b702a4902f6` |
| 产品 / 宿主 | HUANDENG Editor `0.8.0` / Electron `38.7.2` |
| 构建标记 | `sourceDirty: false`；`builtAt: 2026-11-07T23:44:51.5551681Z` |
| 权威工作树 | `<workspace-checkout>`，分支 `editor/v0.8-live-presentation` |
| 构建与打包 | exit 0，自包含与搬迁检查通过 |

Linux 开发副本与 Windows 基线的 1044 个文件逐一核对 SHA-256；运行时代码在 Windows 干净提交后构建。Linux 快照历史不推送到 origin。后续测试和交付文档提交不改变上表的运行时来源。

最终交互测试使用实际 EXE 和包内 CLI，不借用开发应用入口。测试项目、profile、runtime 独立；原科研项目只复制并核对哈希。canonical 仓库中既有的 `tests/fixtures/studio/pages/identities.page` 修改另行保护，不纳入本轮提交。

## 2. 代码门槛

| 检查 | 结果 |
| --- | --- |
| Linux 单元测试 | **955/955，82 个文件** |
| Windows 单元测试 | **954 pass + 1 POSIX-only skip，总计 955，82 个文件** |
| TypeScript | 两平台通过 |
| Biome | 最终运行时范围 **661 个文件通过** |
| Windows clean build / package | exit 0 |

Windows 最初的开发依赖被装成 hoisted，Base UI 与 renderer 解析到了同版本的两个 React 实例，导致 SSR 测试出现 invalid hook call。恢复项目既有的 isolated 开发布局后，原来失败的两个文件 9/9 通过，全量随后通过；源文件、锁文件、配置、mock 和 skip 均未为此修改，1064 个源文件哈希保持一致。打包仍独立使用 hoisted deploy。失败报告、依赖解析对照和恢复回执保留在本机，不能把环境修复描述成产品修复。

新增测试覆盖作者模型、编译与边界、进入初态、强调恢复、累计相对移动、组 opacity、删除后的组内时序重建、复制与目标映射、CAS / Undo / 命名版本、未知 schema、静态/视频解释，以及动画面板草稿保护。

## 3. 最终包交互验收

最终交互汇总为 `.verification/v08-packaged-interaction-gates.json`。已通过前缀的报告以 SHA-256 固定；断点续测从失败组开始，不重复或替换前缀证据。

| 验收组 | 结果 | 主要范围 |
| --- | ---: | --- |
| 现场放映 | **13/13** | 点击、连击、回退、重复引用、固定版本、全屏、黑屏、帮助、会话重置 |
| 步骤创作 | **16/16** | 效果、触发、参数、预演、草稿、转换、Undo、保存重开、窄窗 |
| 键盘与焦点 | **14/14** | 画布/缩略图/输入、快速定位、F5 / Shift+F5 |
| 工作台 UI | **12/12** | 顶栏、工作区、明暗主题、尺寸、reduced-motion |
| 旧时间线 | **16/16** | v1 编辑、预演、放映、草稿与旧数据兼容 |
| 项目与素材 | **11/11** | 编排、重复位置、版本、备注、素材及缺图 |
| 视频 / 静态 / stdio | **16/16** | 保留原有兼容范围 |
| 既有桌面流程 | **7/7** | 打开、编辑、保存、版本 |
| 既有画布编辑 | **8/8** | 基础编辑与持久化 |
| 保存恢复 | **6/6** | 锁定、恢复、外部修改、正常关闭 |
| 高清预览 | **6/6** | 派生图、原图、导出 |
| 无编码器回退 | **6/6** | 原图回退与可用性 |

十二组共 **131/131**，全部 rendererErrors 为空。package smoke 另行通过，确认 0.8.0、static 服务、可写和本机 H.264 能力，正常 0/null 退出。安装路径 smoke、连续放映和 80 页编辑分别报告，不混入以上用例数。旧 desktop/editor 脚本未记录正常退出元组，不事后补造。

### 截图超时及复测纪律

两次完整视频兼容运行均先通过实际 MP4、stdio、不可变下载和 UI 导出等前五组，在第六组注入状态 404 后的截图或成功重试截图超时。两次 rendererErrors 均为空、候选正常 0/null 退出；这仍属于失败运行，不能用已通过的前五组宣称整组通过。

针对性诊断中，当前测试窗口 visible / focused、未最小化，文档 visible、字体 loaded，0.8 秒内 RAF 分别执行 104 / 105 次。相同两处截图分别在 289 / 208 ms 完成；显式前置该测试窗口后为 284 / 205 ms，对应 PNG 哈希完全相同。该实验只证明前台条件下能正确捕获画面，尚未确定先前超时的根因。

复测仅允许在截图前恢复、显示、聚焦当前测试窗口；全部业务断言和截图成功条件保留，不使用备用截图或跳过断言把失败改为通过。失败回执和诊断保留。最终 `verify-video-v08` 全部 **16/16** 通过，两次应用启动均正常 0/null 退出、rendererErrors 为空。新脚本只改截图前置和证据目录，业务条件与 v0.7 一致；这不构成焦点是原超时根因的因果证明。

## 4. 产品与视觉复核

root 亲自复看正式候选截图。1040×680、DPR 1 的逐步预演面板高 103.656 px，画布 **606.833×341.344 px**；首轮曾只有约 268×151，未被接受。预演隐藏作者参数和换页设置，保留 DOM 与草稿，返回恢复选择、展开状态和未确认输入。验收使用真实几何与截图，不以 CSS 类名替代。

基础属性和动画参数在小窗口同时展开时仍然拥挤，[展开创作截图](evidence/v08/builds-authoring-expanded.png) 保留这一事实；[紧凑预演截图](evidence/v08/builds-compact.png) 只证明预演改进。下一阶段应整合为随任务切换的属性面板和可调工作区，不再增加一层常驻工具条。

播放中再前进完成当前步骤，全部步骤完成才换页；跨页后退进入上一页末态，重复 occurrence 从开场开始，固定版本使用该版本。Home / End 可覆盖在途绝对定位；相对导航仍等待当前切页提交，避免旧页面消费输入。F1 在全屏时先退出顶层再开帮助；黑屏暂停并封住时间条播放/seek；重新开始会清理前一次会话状态。停止、换源、退出均取消旧 RAF。

页面淡化只作用显示层；reduced-motion 下省略转场。没有逐帧写回页面或添加保存事务。独立双屏、排练、音视频素材同步不在本轮完成范围。

## 5. 内存重新归因

此前 v0.7 报告记录的 renderer GC 后约 398 MiB 是真实测量，但将其直接解释为日常编辑泄漏缺少对照。本轮先固定同一 v0.7 包、同一 80 页副本、同样 50 对插入/删除、1600×967 / DPR 1，仅改变 raw-CDP 的 Network inspector。

| Renderer working set | Network 关闭 | Network 开启 |
| --- | ---: | ---: |
| 初始稳定 | 152.36 MiB | 155.95 MiB |
| 50 对后 | 328.23 MiB | 470.49 MiB |
| 自然空闲 15 秒 | 223.72 MiB | 370.50 MiB |
| 显式 GC 后 | 219.95 MiB | 371.10 MiB |
| 同进程关闭 Network 并 GC | — | 217.55 MiB |

关闭 Network 后释放 153.54 MiB working set、156.38 MiB private；JS used 仍为 15.05 MiB，DOM / listener 不变。同进程实验支持网络检查器响应保留的归因。第三组每 10 对 GC 的 working set 低水位为 213.05 / 222.66 / 220.76 / 212.96 / 201.18 MiB；9 个 native dump 中 Blink committed 升至 68.625 MiB 后稳定，活对象约 5.87–6.06 MiB。不能把已提交容量与活对象混同，也不能把嵌套 provider 相加当作 OS 占用。

三组均正常 0/null、rendererErrors 为空、原件 82 个文件哈希未变。脱敏数据见 [observer-control.json](evidence/v08/observer-control.json) 和 [native-allocation.json](evidence/v08/native-allocation.json)。这修正测量解释，不是 v0.8 修复了 153 MiB 产品泄漏；产品没有定时 GC、clearCache、删 Undo 或降低原图质量。

### v0.8 最终包连续放映

raw-CDP、不启用 Network 的 **25/25** 轮合成放映通过。三张页面组成 A/B/A/C 四次出现；每轮包含单击/同时/接续、完成当前步、回退、重复引用、备注、黑屏，以及动画未完成时退出；每五轮增加动画中的 Home 跨页。每轮退出后的 presenter root、放映 renderer 和 pending RAF 都为 0，5 个源文件字节始终不变。

自然空闲结束时，观察到的 **1051/1051** 个 WeakRef 对象已全部回收，最后一次显式 GC 后结果相同：25 个 presenter root、50 个 renderer、976 个元素节点。它们证明这些被观察的节点可回收，不能外推为应用中每种对象或 listener 都没有保留。

| v0.8 Renderer | 初始稳定 | 25 轮结束 | 自然空闲 15 秒 | 最后一次显式 GC |
| --- | ---: | ---: | ---: | ---: |
| Working set | 123.97 MiB | 188.71 MiB | 145.94 MiB | 142.93 MiB |
| JS used | 7.91 MiB | 11.13 MiB | 9.84 MiB | 9.41 MiB |

正常退出 0/null，rendererErrors 为空。详见 [presentation-soak.json](evidence/v08/presentation-soak.json)。

### v0.8 最终包 80 页编辑

真实文稿的独立副本 **50/50** 对 GUI 插入/删除通过，视口 1600×967 / DPR 1，不启用 Network、native trace 或循环 GC。原件 82 个文件与本轮既存基线一致；应用正常 0/null 退出，无 renderer 错误。

| v0.8 Renderer | 初始稳定 | 50 对结束 | 自然空闲 15 秒 | 最后一次显式 GC |
| --- | ---: | ---: | ---: | ---: |
| Working set | 147.10 MiB | 330.42 MiB | 223.07 MiB | 222.81 MiB |
| JS used | 16.37 MiB | 47.73 MiB | 15.10 MiB | 15.06 MiB |

挂载 DOM 始终 1774、renderer 7，所编辑画布 4 个对象、无图片。Delete 视觉响应中位 **24.75 ms** / P95 **33.80 ms**；文件持久化观测中位 **208.70 ms** / P95 **317.40 ms**；操作确认观测中位 **430.40 ms** / P95 **508.40 ms**。文件出现与操作确认是两个观测阶段，不等同内部写盘耗时。

这份数据与本轮 v0.7 raw 对照使用相同原件哈希及视口，但仍是各一次有限场景，不做统计性提速结论，更不与旧 Playwright 的不同观测条件混算。详见 [renderer-runtime.json](evidence/v08/renderer-runtime.json)。

更长的混合高清素材会话，以及完整快照反复解析、增量回读与 SSE 慢消费者背压，仍需独立场景；不据上述短场景宣称数小时稳定。

## 6. 安装、数据保护与交付

原件预检发现：更早的 v0.7 packaged 基线与当前原件有一页字节不同，82 个文件的路径集合相同。当前全部 82 个哈希与本轮较早已通过的 `renderer-v08/raw-runtime-50.json` 完全一致；这份收据本来就记录 `passed: true`、`originalUnchanged: true`，运行的是 v0.7 包。本轮连续编辑、摘要和安装采用这份既存基线，保留旧 packaged 收据、raw 收据及首次预检失败，不改造历史记录、不回滚原件，也不推断修改者。后文“原件未变”指相对于本轮已记录的原件版本，不声称与更早的 v0.7 packaged 字节完全相同。

首次安装在替换前因 PowerShell 模块首次加载的 CLIXML 进度混入 JSON 输出而停止；应用包准备副本已校验，正式 target 未替换。修正交付脚本的进度输出，错误仍保持终止；显式绑定这次失败收据、相同路径/构建/manifest 后复用准备副本，继续逐文件重验和原件核对。失败回执保留，不把它改成成功，也不重跑已冻结产品的全部测试来掩盖交付脚本问题。

第二次安装已保留旧包并替换正式目录，随后 Python 在逐文件哈希的读取缓冲区分配处出现 `MemoryError`。只读诊断确认当前解释器为 64 位、主机仍有物理及 commit 余量，不能据此还原失败瞬间原因。哈希改用单个 64 KiB 缓冲区的 `readinto`，六个空文件/边界/多块大小与 SHA-256 直接计算一致；随后以精确失败收据续验已替换目录，仍逐文件匹配原 manifest，保留 portable、安装 smoke、原件校验和普通窗口重开的全部条件。此项是交付工具的资源处理，不列为编辑器内存优化。

正式安装于 **2026-11-08T00:37:26.329963Z** 完成，收据 `passed: true`。位置为 `<editor-checkout>/dist/HUANDENG-win32-x64`。共 **29,160 个文件 / 683,846,687 字节**，正式目录的每个文件 SHA-256 与大小均匹配已验收包；portable 检查通过，旧 v0.7 包保留在 canonical `.verification/installed-v07-backup-20261108-v08`。

桌面和开始菜单两处快捷方式的目标、工作目录与图标均匹配。安装前检查没有尚在运行的 canonical 用户进程，无强制终止。安装后独立三页合成项目通过，About 为 0.8.0、static 服务、可写、本机 PATH FFmpeg/libx264 可用，rendererErrors 为空，正常 0/null 退出。About 验证执行真实菜单 handler，通过临时 showMessageBox stub 捕获参数；不是原生对话框截图。安装包不内置或下载 FFmpeg。

普通 profile 随后重新打开原 80 页项目并留窗：原生窗口响应、安装路径正确，文档服务为该应用的子进程，discovery epoch 为新值，static / writable / 零 diagnostics。82 个原件哈希与本轮基线一致，canonical 既有修改的 fixture 哈希也保持不变。完整原始回执保留本机，脱敏结果在 [acceptance.json](evidence/v08/acceptance.json)。

运行时来源仍为 `ecba4cb`；交付文档和截图条件脚本另作后续提交。版本标识 `editor-v0.8.0`，源码、交付提交与 annotated tag 仅同步私有 origin，远端 refs 需要独立核对；不发 Issue 评论或改变仓库可见性。

## 7. 明确未完成的范围

PNG / PDF / PPTX 仍导出基础静态画面；PowerPoint 原生点击动画未实现。MP4 保留静音定时输出，页面转场明确报告未导出；本轮没有视频功能扩展。GIF 等动态素材自主播放，尚无受步骤控制的音视频时钟。备注/下一页是同窗视图，不是独立双屏。演讲有 occurrence 备注与版本 pin，尚无局部视觉变体。17 个本机 MCP 工具和实际 stdio 可用，不代表 Codex / Claude / ChatGPT 客户端真实工作流已经安装验收。

历史科研文件的 Office 参考仍沿用既有验收，不冒充本轮重测；它也不等于完整 PPTX 导入或往返。科研原件、个人路径、原始性能 trace 和完整哈希清单留本机；共享截图只含合成内容。
