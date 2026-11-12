# HUANDENG 下一阶段独立审计

日期：2026-11-12（Australia/Sydney）。源码基线：Editor **0.22.2**，`main` / `e456d6f676007c24d348d924b2500ba7950daeab`。

本报告记录 0.22.2 的独立审计基线：隔离安全复现、80 页性能基准、实际发行物检查和升级规格。其“确认”结论描述修复前状态。后续 0.23.0 已按该规格实施并完成源码与候选包验收；当前交付状态以 `RELEASE-V023.md` 和 `VALIDATION-V023.md` 为准，不能把本报告当作新版仍有同一问题的证据。

## 1. 决策结论

**先修两个已实验证实的安全边界，再处理已经量化的重复工作。保留现有 PPTD、共享 writer 和编辑器框架。**

1. **SEC-1 已确认：** SVG 经本地资源接口作为编辑器同源文档执行后，可以取得测试会话并保存未经用户授权的修改。生产静态服务和 Vite 各四个完整案例均复现。正常 `<img>` 展示不执行脚本；定向隔离可以保留科学 SVG。
2. **SEC-2 已确认：** 打开携带命令式 Git fsmonitor 配置的工程，会在自动登记 checkpoint 时执行该命令。无害标记实验已验证。自带 portable ZIP 排除 `.git`，不能把该 ZIP 描述成已证实传播此配置的渠道。
3. **性能瓶颈已定位：** 80 页单页提交中位数 358 ms，其中加载约 143 ms、准备约 172 ms、持久化约 24 ms。自身保存后还会追加一次完整 80 页刷新。优先消除重复检查、资源检查和刷新，保存保护继续保留。
4. **旧版 5–6 秒删除延迟未在本负载复现：** 当前 80 页合成工程的键盘删除到 DOM 移除中位数 87 ms；文件持久化观察中位数 391 ms。不能沿用 v0.4 数字评价 v0.22.2。
5. **发行工程需要补课：** 595.15 MiB / 26,052 文件、未签名、Windows CI 缺失、安装脚本未随包分发、Electron 38 已结束支持。现有校验和有效，抽查代码与当前源码一致；没有证据证明发错代码。

## 2. 范围、证据与保留状态

- 通过独立工作站连接核实 Windows 验证环境，读取当前源码及仓库/插件规范；通过原审计所在工作站自身连接读取 CC 原审计。
- 输入：`docs/audit-seeds/HUANDENG_NEXT_PHASE_AUDIT_SEED_2026-11-12.md`、AHE 的 368 行静态 CC 审计、当前源码、`docs/UX-AUDIT-2026-11-12.md`、本机 0.22.2 发行目录及三个 release ZIP。
- 安全与性能使用当前源码在独立目录打包执行，项目、runtime、浏览器 profile 和输出均隔离；安全实验与性能计时串行。主审另外直接阅读关键源文件、检查实验脚本与原始结果，并运行安全保存基线测试。
- 原工作树有四个已修改的示例/fixture 文件，另有既有未跟踪资料；本轮开始记录其哈希与 diff。产品源码初始无修改。本轮保护这些改动，不把它们纳入审计文档提交。
- `.verification/independent-audit-20261112/` 保存原始证据和实验脚本。安全载荷不进入公开文档或 GitHub；输出不包含有效 session token。
- 判断仅使用：**确认、部分确认、不成立/已修复、待实验**。“确认”说明具体事实成立，不代表该风险已经修复。

### 证据索引

以下路径相对于仓库私有验证目录 `.verification/independent-audit-20261112/`：

| 证据 | 文件 |
| --- | --- |
| 完整安全审计、实际源码打包与无害复现 | `security/SECURITY_AUDIT_2026-11-12.md`、`security/build.mjs`、`security/proof.mjs` |
| 最终安全结果 | `security/run-Jb0zK9/result.json`；同内容的 `security/result.json` |
| 性能完整报告与汇总 | `performance/PERFORMANCE_AUDIT.md`、`performance/summary.json` |
| 后端原始样本 | `performance/runs/2026-11-12T05-21-52.159Z/backend.json` |
| 浏览器、HTTP、真实 watcher 样本 | `performance/browser-2026-11-12T05-24-00.119Z/browser.json` |
| 真实 Normal 视图 | 上述 browser 目录的 `normal-view.png` |
| 性能复现脚本 | `performance/build.mjs`、`backend-benchmark.mjs`、`browser-benchmark.mjs`、`summarize.mjs` |
| 发行检查 | `release/release-audit.md`、`artifact-inventory.json`、`release-zip-check.json`、`signature.json`、`source-lines.json` |
| 状态保护与测试 | `root/baseline.json`、`root/final.json`、`root/preservation-check.json`、`root/safety-baseline-summary.json`、`root/safety-baseline-vitest.json` |

## 3. 安全审计

### SEC-1 — SVG 同源执行与会话凭证

**判断：确认。优先级：P0，先进入最小修复。**

**源码证据：** `export-environment.ts:31–38` 的 `readProjectAsset` 接受 data SVG；`asset-preview.ts:347–371,519–594` 保留 SVG MIME 并直接响应；`vite/routes/pptd.ts:212–249` 允许没有 Origin 的本地 GET，`/session` 与 `/current` 都返回 token；`static-server.ts:30–39,136–148` 的生产入口确有 loopback/Origin 检查。缺陷不是“生产服务毫无限制”，而是可执行资源拥有了编辑器同源权限。

**影响：** data SVG 可作为资源请求参数输入，无需预先导入文件或打开恶意 PPTD。攻击仍需让浏览器访问一个运行中的服务地址。脚本先读当前 revision 再提交即可通过 CAS；CAS 负责冲突保护，不能替代授权。实际证明的是当前合成项目的写权限，未证明 SVG 直接获得 Node/系统命令执行权。

**复现实验：** Node 22.21.0、Edge 156.0.4314.58；受控 `localhost` 来源访问另一端口的 `127.0.0.1`。每个案例均验证脚本标记、token 存在布尔值、事务 HTTP 200，以及 `.page` 实际字节变化和预期备注。

| 入口作为文档导航 | production static | Vite |
| --- | --- | --- |
| data SVG → asset | 执行 / 取得凭证 / 持久化 | 同样成功 |
| 文件 SVG → asset | 执行 / 取得凭证 / 持久化 | 同样成功 |
| data SVG → asset-preview | 执行 / 取得凭证 / 持久化 | 同样成功 |
| 文件 SVG → asset-preview | 执行 / 取得凭证 / 持久化 | 同样成功 |

跨源 iframe 也成功。普通 img 解码成功，脚本不执行、项目字节不变。错误 Host、带跨源 Origin 的 session 请求和无 token POST 都返回 403。SVG 的项目文件预览是 text，`project-file-preview/image` 拒绝 SVG；这两个入口不能归类为已确认注入。

服务器实际收到的关键头如下；采样来自 `IncomingMessage.headers`，不是会省略安全字段的客户端便捷 API：

| 请求 | Origin | Sec-Fetch-Site / Mode / Dest |
| --- | --- | --- |
| 外源点击 SVG | 无 | cross-site / navigate / document |
| 外源 SVG iframe | 无 | cross-site / navigate / iframe |
| 外源 SVG img | 无 | cross-site / no-cors / image |
| SVG 执行后的 session fetch | 无 | same-origin / cors / empty |
| SVG 执行后的 POST | 目标服务 Origin | same-origin / cors / empty |

**修复选项：** 先在所有活跃资源出口统一强制 CSP/sandbox 和导航策略，保留科学 SVG；再用可信 native/launcher/discovery 完成 session/current 及私有 API 的能力引导，兼容普通浏览器、CLI、MCP、图片和事件流。规格将这两步分开，避免一次握手大迁移延误资源隔离补丁。

**缓解对照：** 只在测试服务器增加响应隔离后，两个模式的 SVG 导航脚本都被阻止，同图仍能作为 img 解码为 120×40。生产文件未改。这验证了方向，不替代真实科学图和导出的兼容验收。

**风险与验收：** 覆盖 script、事件属性、foreignObject、资源导航、过期能力和普通编辑/导出；禁止简单取消 SVG。`/exports/:id/asset` 有相同内联 MIME 的源码依据（`export-workspace.ts:282–285`），本轮未通过完整导出任务复现，记为部分确认。Electron 主窗口同源导航范围偏宽属于源码确认，完整 shell 攻击路径未执行；公共网站到 loopback 的 LNA 行为仍待实验。

### SEC-2 — Git 配置触发命令

**判断：确认。优先级：P0/P1，随首批安全补丁处理。**

**证据：** `git.ts:51–57` 的 wrapper 使用 execFile，未约束 Git 命令配置；`registerCheckpointRoot:93–141` 自动 status/diff；`vite/routes/pptd.ts:62` 在打开 Store 前调用。`gitWorkflowRequirement:293–324` 已尊重签名/hooks，但发生在后续 checkpoint，不覆盖最初的 status。

**影响与实验：** 合成仓库有正常初始 HEAD，fsmonitor 指向只写无害标记的脚本。实际 registerCheckpointRoot 产生标记；加入明确禁 fsmonitor 的对照后不产生。前提是用户打开带不可信本地 Git 配置的目录/外部压缩包。portable archive 的 `.git` 排除已有源码与实际 capture 证据，不把普通页面或 HUANDENG 自带 ZIP 当成这个前提。

**修复选项：** 自动 Git 调用统一禁用命令式 fsmonitor，净化相关进程环境并检查其他可达命令扩展；支持版本明确化。`hash-object --path`、`git add` 后续也可能使用 filter，单个参数不代表覆盖所有 Git 扩展。需要外部程序的 checkpoint 可延期交给正常 Git 流程，PPTD 保存和页版本照常工作。

**风险与验收：** 保留现有签名/hooks 要求、脏仓库/HEAD/已暂存变化保护；不改用户全局 Git 配置。Git ≤2.35.1 对 false 的解释不同，版本检查与无害阴性实验必须存在。正常无危险配置仓库可 checkpoint；带危险配置的自动发现不执行标记。

### SEC-3 — Electron 生命周期

**判断：确认。优先级：P1。** `packages/desktop/package.json:47` 和实际 EXE 均为 Electron 38.7.2。官方时间表给出的 38 结束支持日期是 **2026-03-10**；本日受支持稳定主线为 43、44、45。没有仅凭 EOL 推断某个具体 CVE 已可利用。

修复是独立升级到实施时锁定的受支持补丁，验收多项目、native dialogs、退出/草稿保护、CLI/MCP 和导出。现有 `service.cjs:113–117`、`publisher.cjs:316,714`、`agent-setup.cjs:31` 使用 RunAsNode，不能在未迁移这些路径前关闭该 fuse。ASAR、integrity 与签名分开验收。

## 4. 性能基准与判断

### 4.1 方法

THUG 为 Ryzen 7 8845H / 16 逻辑核心 / 约 31.3 GiB RAM，开始约 4.85 GiB 可用；用户原应用继续运行。测试为当前源码的独立 bundle、当前构建前端和独立 headless Edge，浏览器部分使用真实 static server 与 Windows fs.watch。

80 页 × 每页 64 对象（60 文本、4 图），401 个合成 SVG 文件；80 页引用 324 个素材。8 页对照相同对象密度、引用 36 个素材。因此它是不同规模的综合项目负载，不是仅改变页数而固定全部其他引用数量的单变量实验。200 条历史由正常事务生成。

新 Store 打开是在同一 Node 进程、新 stateDir、刚写出的 fixture 上测量；不是 OS 冷缓存或完整 Electron 冷启动。计数探针与计时分开；createHash 数量不是散列字节数。DOM 移除、两帧与文件确认分别报告；文件以 10 ms 轮询观察。内存含日志和 GC 波动，不足以证明泄漏。

### 4.2 核心实测

| 操作 | 中位数 | P95 | 样本数 |
| --- | ---: | ---: | ---: |
| 8 页单页 notes 提交 | 109.26 ms | 284.33 ms | 20 |
| 80 页单页 notes 提交 | **358.08 ms** | 440.02 ms | 20 |
| 80 页无变化刷新 | **169.38 ms** | 257.15 ms | 10 |
| 80 页 Agent preview | 310.63 ms | 401.53 ms | 10 |
| 80 页 Agent apply | 334.84 ms | 365.02 ms | 10 |
| 80 页 preview→apply 总计 | **652.73 ms** | 729.01 ms | 10 |
| 80 页键盘删除→DOM 对象移除 | **87.35 ms** | 93.00 ms | 10 |
| 同操作→移除后再等两帧 | 158.80 ms | 271.00 ms | 10 |
| 同操作→观察到文件持久化 | **391.25 ms** | 447.40 ms | 10 |
| 200 条历史列表 | 143.62 ms | 197.49 ms | 10 |
| 200 条记录的单页历史 | 163.02 ms | 179.11 ms | 5 |
| 4 MiB 原图的条件 304 请求 | 9.61 ms | 11.51 ms | 20 |

小样本 P95 是本轮经验分位数。Agent 数字为直接后端耗时，不含模型思考与 DC-WALT 网络传输。本轮是升级前基线，没有实施后的“提升百分比”。

80 页单页提交的内部阶段中位数：loadDocuments **143.05 ms**、prepareTransaction **171.94 ms**、持久化 **24.29 ms**、内部快照更新 **6.64 ms**。每事务 assets 阶段执行两次，单次中位数 **93.44 ms**；它嵌套在前两个阶段中，不能再次相加。

### 4.3 问题登记

**PERF-1 / 确认：全项目准备。** 证据：`store.ts:474–583 loadDocuments`、`1429–1510 commitNow`、`1513–2205 prepareTransaction`、`865–910 replaceDocuments`。单页提交产生 **85 次 .page 读取、652 次 stat、814 次 realpath、1,145 次 createHash**。80 次页面读来自整库扫描，另外 5 次是目标页保存边界检查。已有页面解析/素材哈希缓存有效，不能说每次重解析所有页或重读全部素材字节。影响是项目规模放大每次小编辑与 Agent preview/apply。先复用单事务素材检查与不可变结果，再减少 clone/重复校验；风险是遗漏读依赖、外部变化或污染旧快照。验收同负载分段数据、深层对象不变性、读写依赖 CAS 和恢复；首批不为减少读取而放宽写入前真实检查。

**PERF-2 / 确认：自己写盘又触发刷新。** 证据：`vite/routes/pptd.ts:142–168 watch`、`static-server.ts:10–20 ProjectWatcher`、`store.ts:922–948`。三个真实提交都从 85 次页面读取增至 **165 次**；多出的 80 次刷新分别耗时 **158.72 / 196.59 / 164.18 ms**。新增未引用文本文件也引发 80 页读取、147.78 ms 刷新。真实外部修改对照被检测并保留。修复使用路径/最终字节版本归因和依赖分类；不能固定忽略 180 ms 或关闭 watcher。验收自身写入不再重复整扫，真实外部写入/原子替换/OneDrive 风格延迟仍可见。

**PERF-3 / 确认：提交后整份快照。** 证据：`pptd-document.ts:733–758 submitPending`、`vite/routes/pptd.ts:240–249 /current`。实际 HTTP 每份 `/current` 约 **1,213,563 bytes**；10 次 API 插入加 10 次 UI 删除出现 20 份响应。`/current` 返回内存快照，不能误说它每次重新扫描磁盘。浏览器 Response.json 中位数 9.35 ms 含余下接收/解析；Node 纯 JSON.parse 单独测得 9.36 ms。修复需要版本一致的原子增量，保留事件缺口/epoch/旧客户端的完整快照回退；验收乱序回执、并发新写入与草稿继续输入，防止拼接不同版本状态。

**PERF-4 / 确认：历史全读。** 证据：`persistence.ts:428–461 history`，`store.ts:1040` 及页历史路径。21 条列表 12.49 ms；200 条 143.62 ms，一次精确读取 200 JSON、调用 1,200 次 createHash。修复为可重建摘要/页索引与分页；原记录和恢复校验保留。风险是陈旧索引掩盖坏记录。验收正常列表按需读取、索引损坏可重建、Undo/Redo/页历史/幂等不变；不外推上万条的绝对延迟。

**PERF-5 / 确认：304 前读原图。** 证据：`asset-preview.ts:519–606 respond`，读图/哈希发生在 ETag 比较前。4,194,429-byte 原图初次后，20 个 304 和一次探针令 sourceReads 从 1 增至 22。修复采用有界且可靠失效的内容版本缓存；风险是错误 304 或缓存无界。验收相同版本条件请求避免读完整字节，外部原子替换/相同大小时间戳变化保持正确，路径边界/并发预算/取消不退化。

**PERF-6 / 部分确认：缩略图。** 实际为 **80 行、6 个 thumbnail renderer**、64 个画布对象。按视口挂载已工作，“80 页同时完整渲染”不成立；行级全虚拟化尚未完成。更长列表的滚动帧证据出来前，优先级低于已量化的提交/刷新。

**PERF-7 / 待实验：** 完整 Electron 冷启动、高分辨率照片滚动、长时间稳态内存/关闭后的保留对象。当前 CPU/内存足迹不能确认泄漏；这些问题保留为定向实验，不据此提出框架重写。

## 5. 发行与仓库

### 5.1 实际产物

| 项目 | 实测 |
| --- | --- |
| Editor ZIP | `dist/releases/editor-v0.22.2/HUANDENG-Editor-0.22.2-win32-x64.zip` |
| 压缩大小 | 223,450,537 bytes（约 213.10 MiB） |
| 展开大小 / 文件 | **624,060,587 bytes / 26,052**（595.1506 MiB） |
| node_modules | 283,291,816 bytes（270.1681 MiB） |
| EXE | 210,144,256 bytes；Authenticode **NotSigned** |
| EXE 显示信息 | Version 38.7.2 / Company GitHub, Inc. / Description Electron |
| Build marker | product 0.22.2；source `96b354f…`；sourceDirty=true |
| 三个 release ZIP 校验和 | **全部匹配现有 SHA256SUMS.txt** |

`96b354f…` 至当前 HEAD 的 packages/scripts/plugins/.github 无代码差异；抽查桌面文件、核心模块和 `dist/huandeng/bin.js` 与当前字节一致。因此构建标记属于来源记录问题，不能写成发行代码已经漂移。未逐文件证明所有产物都能位级重建。

**REL-1 / 确认：Windows CI 缺口。** `.github/workflows/ci.yml:10–24` 只跑 Ubuntu 的检查、typecheck、unit、core build；25 个 E2E spec、9 个 browser test 和 desktop/plugin node:test 不在该 collector。影响是 Windows 路径、IPC、安装/导出和插件问题可绕过 CI。修复增加自包含的 Windows 产品流程；风险是托管机无 Office，须分开标记测试车道。验收干净包迁移路径、新建/编辑/撤销/重开/导出/握手及失败证据。缺少 CI 不等于历史上从没人工跑过测试。

**REL-2 / 确认：来源、产品信息、签名。** `scripts/Package-Huandeng.ps1:37–76` 记录 dirty 状态但不阻止正式构建，主程序主要被重命名。修复从干净受控 tag 构建、生成来源清单、正确产品信息；签名单独建立。不将尚未决定费用/资格的签名服务作为紧急安全修复的隐含阻塞。验收来源与 tag 一致、校验清单有效；启用签名通道时再验签名，未签名就明确标识。已有 SHA256SUMS 不能替代发布者签名，但不能说校验和不存在。

**REL-3 / 部分确认：安装体验。** `Install-Huandeng.ps1:14–36,50–60` 已有 HKCU `.pptd` 注册和快捷方式，保留 Windows UserChoice。实际 ZIP 不包含该脚本、没有卸载入口。缺的是随包可用的安装/修复/卸载路径，不是完全没有文件关联。先随包交付当前用户流程，再评估 GUI installer；验收安装/迁移/升级/卸载保留全部用户工程，插件发现和系统既有选择不回退。

**REL-4 / 确认（裁剪判断部分确认）：体积。** `core/package.json:90–117` 与 deploy 路径带入较宽依赖。Playwright 在 `export-environment.ts:4` 用于导出；Vite 还参与 development fallback。先按实际 production import graph 拆分，再裁剪；不能直接删除所有看起来像开发依赖。验收科学图表/公式/字体、Office 导出、插件及迁移运行完整后比较体积。CC 的“<250 MB/<2000 文件”没有实测支撑，不作为硬验收。

**ARCH-1 / 确认：误发布入口。** 根 `package.json:26` 调 changeset publish；core/CLI 包仍为可公开发布的 `@open-slide/*`，根 private 不传播到子包。风险是将来具备相应权限的维护操作误入发布，不是声称现有凭证已经能发上游包。先设包级不可发布并禁用产品发布捷径；验收 build/deploy/发现兼容。不立即改包名或删除 changesets/许可证。

**REPO-1 / 部分确认：示例体积与深路径。** HEAD 的 examples 有 2,617 文件、310,661,163 bytes、433 checkpoints；最长相对路径 160、THUG 完整路径 178 字符。深目录可能踩 Windows 限制，不是所有 Windows clone 都失败。重复内容额外占工作树约 132.24 MiB，Git 相同 blob 已复用，不能等同重复 clone 流量。当前不删六套示例、不改历史；下一轮用明确路径验收与更浅的新证据目录解决后续增长。

## 6. UX 与 Agent 工作流

本部分直接读了当前 UI/协议/偏好源码，并检查 80 页合成工程的实际 Normal 截图；未冒充新用户现场可用性实验。

| ID / 判断 | 当前事实与证据 | 下一步、风险与验收 |
| --- | --- | --- |
| UX-1 / 部分确认 | `proposal.ts:42–50` 的 hash 绑定事务；`operation-review-dialog.tsx:19,106–119` 有已保存变更审阅；`pptd-document.ts:733–870` 维护 Undo/Redo。缺少可选 pending→accept/reject 工作流，不能说完全没有审阅 | 复用现有 preview、receipt、review。普通授权直达；选择提案时记录 UI 接受事实。部分接受按原子依赖组重做 preview；不能让 actor 字段伪造人类批准 |
| UX-2 / 部分确认 | `route-messages.ts:4` 是 Connect an Agent，`workflow-messages.ts:10,137` 是 Agent setup/助手连接；`locale/huandeng.ts:194–212` 后者覆盖前者。实际截图显示 Agent setup，并非随机出现两个词 | 合并同一概念字典，统一 Agent setup/助手接入；已有对话框正确说明配置不会自动连接，保留。验收中英文各入口及键盘/读屏名称 |
| UX-3 / 确认 | `huandeng.tsx:2860–2884` 提供复制草稿、放弃采用磁盘版本；没有面向普通用户的并排合并；`pptd-document.ts:412–420` 会保留冲突草稿并停止覆盖 | 看差异 / 保留我的修改 / 采用新版本。保留必须 rebase+新 CAS，不能 force overwrite；再次冲突/取消/切换项目不丢草稿 |
| UX-4 / 确认 | `desktop/main.cjs:245–260 layoutWriter` 按 entryKey 记 projectLayouts；主题已是全局，不能再当未修 bug | 同窗口面板布局共享，保留每 Project 缩放/选页；旧布局可回退迁移。双项目切换、重启、写失败回滚验证 |
| UX-5 / 确认 | `main.cjs:570–580 newProject` 用 save-file picker 创建项目文件夹；`welcome.html:37–43` 只有语言入口，没统一外观入口；实际包缺入门实例 | 明确 Project name + parent folder + 最终目录预览，统一外观入口；独立教学 fixture，不改冻结示例。取消、重复路径、无 Agent 的完整任务路径验收 |
| UX-6 / 部分确认 | `workspace-settings.tsx:82` 的 Fonts 实为预览/可用性检查。Normal 截图可见多级工具条，但控件数本身不是失败证据；基础文字/形状/线条已有先选工具后画布放置 | 改称 Font check，任务分组逐项验证。标题/工具栏收敛要保留 Project、Main/Presentation、保存状态等不同范围；不删除已有效功能来减少控件 |

规格已给出首次打开、冲突差异、可选提案三条具体 Frame，以及项目/窗口/会话偏好的归属。任何未来“用户接受”记录必须来自可核验 UI 路径；本轮没有虚构作者验收。

## 7. 验证结果与本轮边界

| 验证 | 结果 | 代表的事实 |
| --- | --- | --- |
| 安全实际源码 bundle + browser proof | 最终进程 exit 0；八个导航案例及控制成立 | 证明漏洞与定向缓解方向，不代表产品已修复 |
| 后端性能基准 | exit 0；保留原始样本、CPU/内存与语义检查 | 当前负载的可重复基线 |
| static + Edge + Windows watcher | exit 0；无 pageerror | 重复刷新、HTTP、DOM 更新的实际观察 |
| 幂等与外部写入对照 | 通过 | 重复 requestId 不重复执行；过期 CAS 拒绝并保留外部内容 |
| 六个核心测试文件 | **112/112 通过，0 失败，0 跳过** | Store、recovery、writer lock、proposal、page checkpoints、客户端草稿基线 |
| 三个本地发行 ZIP 校验 | 全部匹配 | 实际归档与已有 checksum 一致 |
| Biome 仓库检查 | exit 0；检查 1,607 个文件，22 条 info，无自动修复 | 满足本地提交前的样式检查 |

测试命令使用已安装的 `node_modules/vitest/vitest.mjs`，没有为审计安装工具。六个文件为 `store.test.ts`、`store-recovery.test.ts`、`writer-lock.test.ts`、`proposal.test.ts`、`page-checkpoints.test.ts`、`app/lib/pptd-document.test.ts`。本轮没有重跑全部历史测试，也没有为未改产品代码做无界回归。

安全最后一次运行于 16:25:05–16:25:24 AEDT；相关测试 HTTP、Vite、浏览器和 Store 已关闭。主审测试同样取得最终退出码。原始失败 harness 尝试属于测试装配问题，已修正并在接受测量前重跑，不计入性能样本；没有把未完成操作写为成功。

本地文档提交因 Git 未配置 `user.name` / `user.email` 而失败，HEAD 仍为 `e456d6f`。三份新文档以未提交文件保留；仅撤销了本轮三份文档的暂存，原有改动和暂存状态保持不变。最终逐文件哈希、原有 diff 和源码状态对照见 `root/preservation-check.json`；没有修改 Git 作者配置。

未完成且不冒认的工作：产品安全修复、性能优化后的对照、完整 Electron 冷启动、高清素材/长时间泄漏试验、正式安装与签名、新版 GitHub Release。它们在规格中有明确工作包；本轮交付的成果是已验证审计和实施规格。

## 8. 对旧报告的关键修正

- 120 ms `/session` 轮询只在桌面服务启动等待时发生，成功握手即返回（`service.cjs:135–154`），不是长期后台轮询。
- 当前存在解析、素材 hash、缩略图缓存/按视口挂载；应优化剩余重复工作，不能从“没有缓存”起步。
- `/current` 是内存快照；重复 HTTP 全量传输与 watcher 重扫是不同路径。
- 文件关联、操作审阅、Undo/Redo、校验和、手工 Windows 验证已存在；逐条描述剩余缺口。
- Playwright 属当前导出运行时路径；RunAsNode 属当前服务/客户端启动路径，直接删除会损坏产品。
- dirty build marker 不是代码漂移证据；示例重复字节不是重复 Git blob 流量。
- 不以源文件行数、任意包体积目标或“AI 味道”评分发动大重构；保持 Story、素材、版本与用户亲自验收的设计。

## 9. 下一步入口

按 `SPEC-NEXT-PHASE-2026-11-12.md` 先执行 A1.1+A2；普通包的 npm 误发布防护可作为独立小补丁。A1.2 的握手迁移和 Electron 支持升级单独验证。性能按自身事件归因 → 单事务素材检查/准备 → 一致增量快照 → 历史/ETag 缓存实施，每一步对照本轮基线。

安全复现脚本保留在私有 `.verification`，普通实施者先读报告和规格再按需重跑；不要公开载荷。后续阶段不把本报告的“确认”改写为“修复完成”，只有真实产品补丁和对应验收才更新状态。

## 10. 外部一手依据

- [Electron 版本支持时间表](https://releases.electronjs.org/schedule)，2026-11-12 查阅。
- [Electron 安全指南](https://www.electronjs.org/docs/latest/tutorial/security)。
- [Electron fuses / RunAsNode](https://www.electronjs.org/docs/latest/tutorial/fuses)。
- [SVG 2 处理模式](https://www.w3.org/TR/SVG/conform.html)，文档与 img/iframe 的能力区别。
- [CSP Level 3](https://www.w3.org/TR/CSP3/)，资源脚本与 sandbox 规则。
- [Git core.fsmonitor 配置](https://git-scm.com/docs/git-config)，命令式 hook 及旧版本差异。

外部规范解释机制；具体项目结论来自本次源码和实验，详细行号与原始结果见证据索引。
