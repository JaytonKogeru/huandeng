# HUANDENG v0.7 性能专项审计

日期：2026-11-08（Australia/Sydney）
范围：长时间编辑的内存、缓存、卡顿、加载，以及前后端资源生命周期。
角色：专项审计建议，交由总负责人复审后纳入正式 Audit / Spec。此轮未修改产品源码。

实施归档说明：以下为实施前审计。后续按正式 Spec 完成的修改和新收据另见 [V07-PERFORMANCE-IMPLEMENTATION.md](V07-PERFORMANCE-IMPLEMENTATION.md)；可重跑诊断入口已扩展为 v0.7 流程，原始审计数据保存在 `store-diagnostic-v06.json` / `source-binding-v06.json`。

## 1. 结论

现有证据不支持把 v0.6 的工作集增长直接命名为“编辑器内存泄漏”。v0.6 的 20 轮插入/删除后，renderer 的 JS heap 在强制 GC 后低于初始已稳定值；DOM 挂载数量稳定。新做的隔离服务端实验也出现了“工作集上涨而 post-GC heap 基本稳定”的情况。当前最明确的问题分成三类：

1. **确定的资源释放缺陷：导出任务保存全量 snapshot、素材 Buffer 和结果 bytes，完成/失败后仍常驻；过期清理只在下次 create 发生。** 这是适合立即修复的持有链，尤其应在增加视频导出之前修复。
2. **确定的分配/重复工作：一次单页编辑经过两轮全量文档读取、多次整套 clone 和 snapshot 构建。** 隔离 80 页实验每次编辑及回读平均触发 165 次 `.page` 读取。普通编辑的存活 heap 没有线性增长，但 CPU、临时分配和后续 GC 压力真实存在。
3. **确定的随历史增长的常驻数据：外部页面版本完整 source 全部装入 `PageVersionArchive.observations`。** 这是当前历史存储策略造成的可达对象增长，应该保留磁盘历史、减少内存驻留，不应删用户历史或误称不可达对象泄漏。

高清图片、翻页、素材库与动画播放仍需要独立的 Windows 正向素材实验。当前 80 页编辑基准首页没有图片，不能替代这部分验收。全文把源代码事实、实测结果与待证假设分开陈述。

## 2. 先学习，再诊断

### 2.1 采用的方法

| 官方资料 | 本项目采用的方法 |
| --- | --- |
| [Chrome：Fix memory problems](https://developer.chrome.com/docs/devtools/memory-problems) | 区分泄漏、内存膨胀和高频 GC。操作与逆操作之后回到相同场景，检查多个时间点的低水位，不只观察 OS 工作集。Detached DOM 必须有实际持有链才能归因。 |
| [Chrome：Record heap snapshots](https://developer.chrome.com/docs/devtools/memory-problems/heap-snapshots) | 对照快照的 constructor 数量/存活字节增量，再沿 Retainers 定位。快照本身会触发 GC；记录条件及快照时间，避免把采样造成的停顿算进正常交互延迟。 |
| [React：useEffect](https://react.dev/reference/react/useEffect) | 逐个核对 Effect 的 setup 与 dependency-change / unmount cleanup，检查 timer、RAF、observer、事件、异步回调。清理函数存在是静态证据，不能替代堆验证。 |
| [React：Profiler](https://react.dev/reference/react/Profiler) | 用 actualDuration / baseDuration 定位重渲染；Profiler 有额外成本，采样运行与正式响应基准分开。 |
| [Electron：process](https://www.electronjs.org/docs/latest/api/process) 与 [MemoryInfo](https://www.electronjs.org/docs/latest/api/structures/memory-info) | 分开记录 main、renderer、GPU、utility 和独立文档服务进程；区分 JS heap、Blink、working set、private bytes，统一 KB/MiB 换算。 |
| [Node：process.memoryUsage](https://nodejs.org/api/process.html#processmemoryusage) | 服务端至少记录 rss、heapTotal、heapUsed、external、arrayBuffers；Buffer 压力可能不体现在 heapUsed。 |
| [Node：Using heap snapshot](https://nodejs.org/learn/diagnostics/memory/using-heap-snapshot) | 堆快照会暂停线程并增加内存需求，只在隔离诊断进程生成。先用轻量计数和采样找到复现，再做快照持有链分析。 |

不能把 Linux allocator 的行为直接套成 Windows 原因。也不能用一次 post-GC 降低证明所有素材、导出、历史、Plugin 场景都不存在泄漏。

### 2.2 基线和授权边界

复核了 `AGENTS.md`、`WEBCHAT.md`、`docs/VALIDATION-V06.md`、`scripts/benchmark-editor-v05.mjs`。已交付 v0.6 的 Linux 工作区增量作为本轮输入保留，没有清理、重置或覆盖。Windows 权威 main 为 `20e9e531a04933b3285bf707e2ff57a57085ecdc`，已安装 runtime 对应 `9c27465aa88b5b2b59288f5b321596ad10fcb92c`；没有操作用户原编辑窗口、科研原稿或 Windows 原项目。

隔离诊断全部位于 `.verification/v07-performance/` 及 `packages/core/.verification/`。原始代码绑定记录见 [source-binding-v06.json](../../.verification/v07-performance/source-binding-v06.json)。本报告没有发布 GitHub、npm 或修改用户文件。

## 3. v0.6 收据说明了什么

来源：[VALIDATION-V06.md](../VALIDATION-V06.md)、[acceptance-summary.json](../evidence/ui-v06/acceptance-summary.json)、现有 benchmark 实现。

| 指标 | v0.6 已有观测 |
| --- | --- |
| 场景 | 80 页副本，首页 4 个对象、0 个 image 元素；20 组插入/删除 |
| 启动 | 5497 ms；新 Electron profile，未清空 OS 文件系统缓存 |
| 删除视觉响应 | median 24.7 ms，max 36.8 ms |
| 持久化 | median 191.25 ms；ack median 476.70 ms |
| 挂载 | DOM 1820；80 个缩略图按钮、7 个缩略图 renderer、8 个页面 renderer，始末一致 |
| JS heap | 已稳定 17.54 MiB → final 31.09 MiB → renderer 强制 GC 后 16.47 MiB |
| Renderer 工作集 | 170.36 → 405.01 → GC 后 322.01 MiB |
| 文档服务工作集 | 211.84 → 290.88 MiB；没有对应的服务端 GC/heap 采样 |
| DOM counters | 显式 GC 后 nodes/listeners 回落；这些 counters 与当前 document.querySelectorAll 的 DOM 挂载数不是同一口径 |

可以下的结论：这一场景没有出现 renderer JS 存活 heap 随 20 轮操作持续积累的证据，缩略图挂载收敛已生效；服务端与 native 图像/GPU 内存尚不能归因。

不可以下的结论：不能说“长期内存已经解决”，也不能说“服务端增加约 79 MiB 因而存在泄漏”。单独素材专项已验证至少 3 张真实图片的 URL 复用，但那是不同验收场景，不能把它并入无图片 soak 的覆盖范围。

现有 benchmark 的限制：

- `HeapProfiler.collectGarbage` 只作用于连接的 renderer，不作用于独立文档服务进程。
- 每 10 轮记录轻量样本，缺少同状态连续 post-GC 比较和 retained graph。
- `--profile-cpu` 的高频采样以及 `Element.setAttribute` 仪表不应与未仪表化延迟混比。
- 它包含文件轮询，适合保存一致性验收；响应时间仍需在相同仪表条件下比较。
- 缺少高分辨率整套翻页、素材滚动、外部批量更新、重复导出、动画播放停止、项目开关的独立场景。

## 4. 新的隔离实验

### 4.1 可复现方法

使用当前实际 `store.ts` 及依赖打包到隔离目录，未改产品模块。Node v24.22.1 / Linux；合成 80 页，每页 64 个 text 对象、0 张图片，JSON snapshot 为 1,004,060 bytes。没有 HTTP、Electron、真实图片或 filesystem watcher。测试通过现有 `onTiming` 及轻量 `.page` 读取计数观测；每个标记样本显式 GC。

在仓库根目录运行，两条命令适用于安装现有依赖的 Linux / Windows Node 环境：

```sh
node .verification/v07-performance/build-diagnostic.mjs
node --expose-gc .verification/v07-performance/store-diagnostic.mjs
```

脚本位置：[build-diagnostic.mjs](../../.verification/v07-performance/build-diagnostic.mjs)、[store-diagnostic.mjs](../../.verification/v07-performance/store-diagnostic.mjs)。原始报告：[store-diagnostic-v06.json](../../.verification/v07-performance/store-diagnostic-v06.json)。每次生成独立时间戳 fixture，不接收真实项目路径。

脚本还模拟了当前 route 的事件监听者获取 snapshot，并在每次 commit 之后 `refreshExternal` + JSON 序列化，接近客户端保存后调用 `/session` 的后端工作量。它不是端到端 UI 基准。

### 4.2 普通编辑：重复工作明确，heap 没有线性积累

40 次 notes 修改/还原，结束时逻辑内容恢复。结果：

| 阶段 | 次数 | 总计 | 单次 median |
| --- | ---: | ---: | ---: |
| 完整 commit + refresh + 序列化周期 | 40 | 4122 ms | 99.51 ms |
| loadDocuments | 80 | 729 ms | 8.83 ms |
| commit.prepare | 40 | 1292 ms | 29.35 ms |
| commit.persist | 40 | 480 ms | 11.36 ms |
| makeSnapshot | 40 | 435 ms | 10.77 ms |
| getSnapshot clone | 80 | 710 ms | 8.54 ms |

上述阶段有嵌套关系，不能把每行相加当作总耗时。`.page` 文件共读取 6600 次，平均每次周期 165 次；其中两轮全量读取覆盖 80 + 80 页，其余来自持久化一致性检查。保存正确性需要的 CAS 读取不能为了优化数字而删除。

| 样本，均显式 GC 后 | heapUsed MiB | RSS MiB | external MiB | ArrayBuffer MiB |
| --- | ---: | ---: | ---: | ---: |
| 打开完成 | 15.395 | 148.691 | 4.125 | 0.265 |
| 第 10 次编辑 | 17.142 | 208.895 | 4.155 | 0.265 |
| 第 20 次编辑 | 17.151 | 219.094 | 4.155 | 0.265 |
| 第 30 次编辑 | 17.203 | 223.719 | 4.155 | 0.265 |
| 第 40 次编辑 | 17.216 | 224.977 | 4.155 | 0.265 |
| 列出历史后 | 15.448 | 225.223 | 4.155 | 0.265 |
| 关闭并释放 store 引用 | 10.030 | 225.223 | 4.155 | 0.265 |

这组结果直接说明 RSS 不能独立诊断 JS 泄漏。也说明优化应优先减少整套复制与重复读取，而非盲目在 UI 添加定时强制 GC。`PptdStore.tail` 会保留最后一个任务的结果，属于至多一个结果的有界持有；这里可能解释部分样本之间的变化，但尚未做 heap Retainers 证明，不能当成已定位原因。

初次 open 为 625 ms，已有 40 条记录后重新 open 为 351 ms；存在热缓存/运行时预热差异，**不据此声称历史使启动更快或更慢**。41 个 page-history summary 的读取为 16.72 ms；还需要更大历史量的冷暖分开比较，才能给启动退化定量结论。

### 4.3 外部版本：完整源文本随版本数常驻

重新打开同一 fixture 后，连续 20 次通过文件写入修改一页，每次 notes 约 128 KiB，并调用 `refreshExternal`。这模拟 Agent / 外部编辑器写入；历史记录增长是预期行为。计数通过诊断脚本读取编译后普通私有字段，仅用于隔离验证。

| 样本 | observations 数 | 常驻 source UTF-8 总量 MiB | post-GC heapUsed MiB |
| --- | ---: | ---: | ---: |
| 重新打开 | 80 | 0.906 | 16.186 |
| 外部写入 5 次 | 85 | 1.588 | 19.303 |
| 外部写入 10 次 | 90 | 2.269 | 20.023 |
| 外部写入 15 次 | 95 | 2.951 | 20.685 |
| 外部写入 20 次 | 100 | 3.633 | 21.380 |
| 关闭并释放 store | — | — | 10.284 |

源代码持有链是 `PptdStore → pageVersions → observations[] → state.source`。这里存在与版本数一起增长的明确常驻数据；磁盘已有同一完整历史，可以改为摘要索引与有限热版本。UTF-8 source 字节计数不是 V8 精确 retainedSize；不能把两者等同，也不能把所有 heap 增量都归给这一条链。

实验前 5 次外部 refresh median 53.00 ms，后 5 次 55.49 ms；20 次规模不足以证明显著 CPU 退化。更大的历史规模仍需验证，但常驻 source 增长不需要猜测。

## 5. 前后端持有链审计

### 5.1 前端：已有的正确约束

检查范围包括 `pptd-document.ts`、`pptd-backend.ts`、`pptd-playback.ts`、`use-pptd-document.ts`、`thumbnail-rail.tsx`、`science-renderer.tsx`、`renderer.tsx`、`authoring-workspace.tsx`、`timeline-panel.tsx` 和编辑器 route。

- Undo / Redo 存的是 operationId 字符串，不是每次编辑一套完整 snapshot。
- `shareSnapshot` 依 revision 复用未变页面 data、metadata 等；draft 投影使用 WeakMap。服务端 JSON 回读及 parse 仍分配完整内容，但已有结构共享避免相同数据长期全部驻留。
- 图表 SVG 缓存已有 32 条 / 8 MiB 字符估算双限额及 LRU；不能再把它列成“无界图表缓存”。
- 缩略图通过 IntersectionObserver 只挂载附近及当前页；observer cleanup 调用 disconnect。80 页 v0.6 收据中的挂载数量与此一致。
- EventSource cleanup 会 close；主要键盘、paste、beforeunload 监听有 remove；播放 RAF 在停止、切页及 unmount 时 cancel。
- AuthoringWorkspace 将预览 timeMs 留在局部；渲染内容有 memo。不能简单主张“动画每帧重渲染整个应用”。

待测的前端问题：

- `PptdBackend.request` 没有 AbortSignal。面板已有 generation / disposed guard 避免旧结果入状态，但关闭后的请求仍会消耗 I/O、JSON parse、服务端工作。应先合并/取消 **只读请求**；写事务不能因用户关面板就丢失结果或重放。
- 缩略图 `visible` Set 可能保留已经移出 pages 的字符串 ID；不等于 renderer/DOM 残留，量级低，优先级低于完整 snapshot 和图片。需要长期增删页场景再决定是否顺手收敛。
- 图表惰性导入后的异步计算即使 unmount 仍可能完成；结果缓存有界，因此更像无用 CPU 工作。需要 profiler 证明高频场景影响。
- 无图片编辑样本不能判断 decoded images、GPU surfaces 或图片原生资源。

### 5.2 服务端：快照与扫描

源代码：`pptd/store.ts`、`vite/routes/pptd.ts`、`pptd/persistence.ts`。

当前 commit 先读整个项目以验证外部变化；`applyOperations` 对整个 Documents structuredClone；`makeSnapshot` 复制全部 active page data；事件 checkpoint 监听又调用 `getSnapshot`。客户端成功保存后 GET `/session`，服务端再 `refreshExternal` 并返回整套快照。新实验验证了这一重复工作。

`loadDocuments` 会复用 source 未变的解析结果，因此不能说“每次都重新解析所有页”；但文件内容仍全读。素材 fingerprint 缓存以 stat signature 命中，只在签名变化时读 bytes/hash；每轮对全部引用仍扫描与 stat。素材 hash cache 内容是路径/signature/hash，**不是高清图片 Buffer**。路径缓存尚未淘汰，属于较小的后续收敛项。

低风险方向是把“当前已提交状态读取”与“显式磁盘刷新”分开，并消除确定的重复调用；进一步增量协议应以 epoch/sequence 和 revision 为基础，保留断线全量恢复。不能直接暴露内部可变 snapshot，也不能仅凭 mtime 跳过 CAS。现有 `store-performance.test.ts` 已要求“同长度、恢复 mtime 的外部变更仍发现”及返回快照不可反向污染内部状态。

### 5.3 历史与初次加载

`Persistence.history()` 每次用 Promise.all 读取并解析整个 history 目录；每个 record 包含 request/result 和 before/after 原文。普通内部 commit 不总是读取全 history；启动、查看历史、发现外部修改时会读取，不能夸大成“每个按键读全部历史”。

`PageVersionArchive.initialize()` 加载全部 observations 完整 state；`observe()` 为比较最新状态会重建该页 versions，`versions()` 多次 clone 历史 state。多页启动时重复处理历史还有放大效应。命名 checkpoint 读取同样是页内全部文件并验证。功能意义需要保留：不可删旧版本来换数字，不可省掉恢复完整性检查。

建议磁盘作为历史权威，内存持摘要、latest revision、按页索引；页面历史内容按需加载且热缓存有边界。先用实际 100/1000 条记录或等字节规模 benchmark 衡量，再决定是否需要独立索引格式。索引损坏必须可重建，不能破坏已存记录。

### 5.4 素材、缩略图和缓存

素材库 UI 已有 200 ms query debounce、100 条分页、旧响应 guard、图片 lazy loading。后端仍在每次请求中遍历页面引用、目录和全体候选文件 stat，最后才过滤/分页；目录扫描有 3000 项、6 层边界，不能称无界遍历。

当前 thumbnail 和素材小图直接使用原始图像 URL；CSS 尺寸不能作为已经降低解码成本的证据。`/__pptd/asset` 每次读取完整文件 Buffer，响应继承 `Cache-Control: no-store`。URL 已带 revision，但服务端 `/asset` 忽略该 revision，只读当前路径。由此可确定尚无专用受控的预览派生物/缓存路径；是否导致用户实际卡顿，需要有图片场景测定。

**不能只把缓存头改成 immutable。** 旧 revision URL 若取到已替换后的当前文件，会把错误内容当旧版本长期缓存。应对内容版本做校验/快照绑定，再用按内容 hash + 输出尺寸 + 格式寻址的预览；原图保持完整用于编辑和导出。派生缓存按字节及数量限制，避免把新的无限缓存引进来。

### 5.5 Watcher、请求和进程关闭

当前 root watcher 180 ms debounce，忽略 Exports 与原子写临时文件，但仍可能因不相关文件、`.git`、检查点目录事件触发整套 refresh。未测到持续反馈循环，不能写成已确认 loop。应先记录触发源和 refresh 批次数，再根据具体目录角色过滤/合并，仍保留页文件/manifest/metadata/media 的外部变更。

服务端 close 有清 timer/heartbeat、移除 watcher listener、unsubscribe、关闭 SSE 和 store；静态服务器 ProjectWatcher 会关闭 FSWatcher。Git checkpoint 基线 Map 主要是路径/哈希元数据，未见 snapshot 常驻；它尚无按关闭清理，但不是当前高清内存优先问题。

SSE broadcast 目前直接 `client.write`，未处理慢消费者 backpressure。对长时间连接的 Plugin / Agent 客户端应制定有界队列或断线后 sequence 重连；现有实验未覆盖，不应把它列作已发生内存故障。

### 5.6 导出资源：确定缺陷

`runtime-export.ts` 的 `ExportManager.jobs` 保存 `FrozenExport`，其中含完整 snapshot、全部素材 Buffer、结果 bytes。create 在 freeze 后放入 jobs；成功后已将产物写入文件，但仍保存上述内存。finally 仅关闭浏览器。失败任务也不移除。15 分钟过期仅在后续 create 的清理循环发生；respond 对过期任务返回 404 却不删除，因此最后一次导出可能一直驻留至服务退出。

这是静态控制流和明确字段持有链确认的缺陷，不声称它造成了 v0.6 的插入/删除内存增长（该 soak 没有导出）。普通导出视图还会一次挂载所有页面并等待所有图片 decode；动态导出应使用固定时间采样与有限在途帧，不能积累整个视频的帧 Buffer。

修复需要保留可靠下载：工作态 snapshot/assets 在完成、失败、取消时释放；完成态保留每任务独立的不可变磁盘产物与摘要，下载从该产物读取。不能在 finally 删除整个 job 破坏刚返回的 download URL，也不能复用会被后续导出覆盖的同名文件作为旧 job 下载。目录过期清理、同一结果重复下载与服务关闭都要验收。

## 6. 建议纳入 Spec 的八项工作

| 优先级 / 项目 | 证据及目标 | 验收要点 |
| --- | --- | --- |
| P0：诊断口径与长会话基准 | 当前 native / service heap 归因缺口 | renderer / service 分开记录；同一逻辑状态至少三个 post-GC epoch；高清素材为非空断言；release 正常延迟与 profile 分开。 |
| P0：导出资源生命周期 | 已确认 jobs 长期持有完整工作资源 | 成功、失败、取消、过期、并发和服务关闭后工作资源为零；产物独立可靠下载；多轮高清导出后 external/ArrayBuffer 不随次数线性累积。视频有限在途帧。 |
| P1：减少重复 whole-deck 工作 | 实测 2 次全量 load / cycle、80 次 clone、40 次 makeSnapshot | 先减少重复刷新/不必要 checkpoint clone；报告调用次数和分配降低。CAS、同长度外部编辑、恢复重试、事件先后与 snapshot mutation isolation 全部保留。 |
| P1：历史内容按需驻留 | 实测 observations 全 source 随外部版本增长 | 保留全部磁盘历史及回滚能力；内存摘要/热版本有界。长期外部更新时存活全文数量不等于版本总数；100/1000 条历史测启动/列表峰值与延迟。 |
| P1：高清预览与素材索引 | 原图预览、重复目录扫描、no-store 路径已确认 | 至少 30 页不同高清图，覆盖同图复用、替换、滚动、选中原图及导出；缓存内容与 revision 一致，有字节边界；搜索分页不重复全量 stat 已知未变项目。 |
| P1：只读请求取消与刷新合并 | generation 只挡结果、不取消工作；watcher 范围较宽 | 关闭面板/快速切换后过时读请求不继续堆积；写事务不丢失；外部变化不会漏报；记录每次编辑/导入引起的 refresh 次数。 |
| P2：动画持续运行与帧负载 | RAF cleanup 静态检查良好；真实持续负载未测 | 预览/停止/切页/关闭时间线循环；RAF 停止后无继续帧；固定帧时间复现；GPU/renderer 内存按图像场景测；长动画不能线性持帧。 |
| P2：长连接与服务关闭 | 现有 close 有清理，SSE backpressure 未定义 | 项目开关 5 轮、慢 SSE 客户端、断线重连；listener/process/watcher 数回到基线；慢消费者队列有边界，重连可用 sequence/full snapshot 恢复。 |

不建议此轮做无证据的大重构、全局强制 GC、删除 Undo 历史或给每处都堆 memo。性能优化应能解释“去掉了哪一份重复工作/哪一个不必要持有”，再用相同 fixture 回归。

## 7. Windows 根代理的精确测量建议

### 7.1 同状态基准

保留现有已安装 EXE 的隔离 profile 与副本启动。记录 EXE/runtime/hash、viewport、DPR、进程 PID、文件系统 cache 是否未清。先预热 5 轮；在内容恢复到同一状态后采样 A。随后 20 轮操作+逆操作，等待保存/事件静止，采样 B；再 20 轮采样 C。A/B/C 各记录一次未 GC 样本与显式 GC 后样本。

renderer 记录 JSHeapUsedSize/Total、DOM 节点/监听器、实际挂载 renderer 数、可见图片数、正向 loaded/naturalWidth、GPU/utility working set。文档服务在隔离诊断入口记录 `process.memoryUsage()`，需要 explicit GC 时仅为该隔离服务启用；现有 renderer CDP 命令不能替代服务端 GC。

如果 B/C 的 post-GC heap 或 external 随操作次数持续增长，再取 A/B/C heap snapshots 找 Retainers；如果只 native/private 增长，应检查图片/GPU/Chromium资源和回收稳定性，不能从 JS 快照硬找结论。记录工具自身开销，生产延迟验收另跑。

### 7.2 分开的可归因场景

1. **普通编辑**：复用 v0.6 80 页插入/删除，作为改造前后对比，不混入大图下载。
2. **高清翻页**：合成至少 30 页不同大图，完整扫页再回同一页，来回 3 轮；先测初次加载，再测暖访问；额外测试同一文件多页复用。
3. **素材库**：打开、搜索、分页、滚动、选中、关闭，循环；记录请求次数、bytes、图像 loaded 与失败，不接受零图片“通过”。
4. **外部历史**：在测试副本通过 Agent/文件写入生成等量实际历史；运行本报告脚本在 Windows 复核；不能用原稿生成压力历史。
5. **导出**：同样输入连续成功、失败、取消/超时；明确每个任务的 snapshot/asset/bytes 是否释放，下载保留策略是否正确。
6. **动画和会话**：播放/暂停/跳页/退出；再开关隔离项目 5 次，核对旧 renderer、service、watcher、SSE 均结束。用户原窗口不纳入自动操作。

每个场景先固定输入与成功标准。不要把场景间新增资产、历史、下载产物的预期增长当作泄漏；也不要让这些持久对象无限常驻内存。对于“已修复泄漏”的结论，需要直接持有计数/retainer 证据及反复操作后收敛，而不只是一张好看的 RSS 截图。

## 8. 本轮交付与剩余边界

完成：官方方法学习、v0.6 收据复核、前后端源码持有链调查、实际 store 的 80 页隔离诊断、40 次内部编辑与 20 次外部版本实验、可在 Windows 重跑的隔离脚本、八项有证据与验收的优先建议。

未完成且不冒充完成：Windows 服务端 retained graph、高分辨率 decoded/GPU 内存归因、长时间动画负载、导出重复/取消实测、大历史规模冷启动测量。本报告不宣告这些场景达标，也不宣告已找到全部长会话问题。正式实施顺序由总负责人结合 UI、功能设计及其余审计裁决。
