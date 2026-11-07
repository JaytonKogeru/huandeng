# v0.7 性能实施与隔离验证

日期：2026-11-08（Australia/Sydney）。依据 `AUDIT-V07.md`、`SPEC-V07.md` §4.1。此文报告已实施的 store / history 工作；高清预览见 [素材预览实施记录](V07-ASSET-PREVIEW-IMPLEMENTATION.md)，Windows 结果由负责人单独验收。

## 已实施

- `PageVersionArchive` 的磁盘观察记录格式不变，内存按页存 summary / hashes / size / file location；完整内容只进入 **8 项、4 MiB 估算 UTF-16 字节**上限的 LRU，超大单条不缓存。列表从摘要重建；预览/恢复按需读取选中版本内容。
- 初始化一次读取/解析一个 observation，不再 Promise.all 同时装入全部 source。事务 history 的并发文件读取上限为 8，完整性验证仍执行。
- 只读会话的新观察保存到本机独占临时目录，既不修改项目，也不写永久历史。关闭清理目录。临时目录不可写时返回 `HISTORY_UNAVAILABLE`，不会退回无界内存或丢弃旧历史。对应规则已补充 Spec。
- 索引时检查记录结构，冷内容读取时核对已索引字节 hash；读取途中被替换的旧版本明确报 `RECOVERY_REQUIRED`。旧记录兼容、未知页面字段/原文格式保留。
- 内部 snapshot 复用 revision / metadata 未变的页面及 data。所有公共 snapshot / readPage 返回仍隔离；历史预览不再先复制整套 Documents 的全部页面。
- 写队列只保留前一个任务的完成状态，不保留其返回的整套 snapshot。
- 新增 `getCurrentSnapshot()`：等待前置事务完成后读取当前已提交状态，不扫磁盘。现有 `refreshExternal()` 仍扫磁盘；新增 `refreshExternalState()` 允许 watcher 等同步后不再产生被丢弃的返回快照。
- 新增 `getCheckpointSnapshot(event)`：只返回 checkpoint 消费的版本、文件身份、changed page revisions。`git.ts` 已接受此小投影，Git 回归改为用小投影执行真实提交验证。

接口接线由负责人负责：保存成功后回读 current，初次连接、重连、手动刷新、Agent 默认 session 仍显式扫描。`getCurrentSnapshot` 不替代 CAS；每次写入前仍读取真实文件字节，同长度且恢复 mtime 的修改仍会冲突。下述新流程诊断按此明确分工模拟，不声称 watcher 或所有外部扫描都已消失。

## 检查结果

受影响的 7 个测试文件共 **80 项通过**：page-history、store-performance、store、store-recovery、page-checkpoints、presentation-snapshot、git。新增覆盖：

- 100 条 128 KiB 外部版本，全文缓存有界；重开后完整历史不变；预览与恢复早期第 4 条版本，原始文本一致。
- 超过缓存预算的单条版本仍可读取，返回元数据隔离。
- 冷旧版本文件被改后拒绝返回不同内容；启动遇到坏记录明确失败。
- 只读临时历史旧版本可读取、目录关闭清理；临时磁盘不可写时明确失败。
- current 读取按事务队列顺序且不额外读文件；显式刷新仍发现同长度/恢复 mtime 的外部修改；重试收据不覆盖后来的外部内容。
- checkpoint 投影不包含页面内容，返回对象修改不能污染 store。

完整 core TypeScript 检查通过；本代理修改的 8 个产品/测试文件经过 Biome。未提交 Git、未改原稿、未改依赖。性能数据用隔离 fixture，不用于声称 UI/Windows 或高清素材已达标。

## 前后测量

固定 80 页 × 64 个 text 对象、0 图片、约 1.00 MB snapshot；40 次 notes 修改/还原、序列化回读。Linux Node v24.22.1。每次运行独立 fixture、相同 instrumented page-read counter / onTiming；运行次序独立，不并行争用 CPU。

| 指标 | v0.6 原流程 | v0.7 store + 原流程 | v0.7 store + current / projection 流程 |
| --- | ---: | ---: | ---: |
| 周期 median | 99.51 ms | 85.35 ms | 64.56 ms |
| 周期总计 | 4122 ms | 3516 ms | 2666 ms |
| `.page` 读取 | 6600 | 6600 | 3400 |
| `loadDocuments` 次数 | 80 | 80 | 40 |
| snapshot.clone 次数 | 80 | 80 | 40 |
| snapshot.clone 总计 | 710 ms | 675 ms | 361 ms |
| makeSnapshot 总计 | 435 ms | 90 ms | 90 ms |

阶段有嵌套，不相加。第三列说明内部快照共享本身降低了工作，第四列另减少保存后重复扫描和 checkpoint 全量 clone。**3400 次仍是平均每周期 85 次 page 读**，包含一次 80 页真实扫描及持久化验证；没有用 mtime 缓存跳过写前检查。

新流程第 10/20/30/40 次编辑 post-GC heap 分别为 14.612 / 14.622 / 14.754 / 14.762 MiB；原基线为 17.142 / 17.151 / 17.203 / 17.216 MiB。样本仍有运行时波动，不能解释为精确固定节省值；调用数量和缓存边界比单次 RSS 更直接。

### 100 条大外部版本

新流程完成 40 条内部编辑记录后再写入 100 条约 128 KiB 外部版本。历史列表共 141 条（initial + 40 edits + 100 external）。早期第 4 条版本预览、恢复均通过；80 个初始 observation + 100 个外部 observation 全保留磁盘。

| 外部版本数 | post-GC heap MiB | 热全文数 | 热内容估算字节 |
| --- | ---: | ---: | ---: |
| 20 | 17.002 | 8 | 2,288,800 |
| 40 | 15.722 | 8 | 2,288,800 |
| 60 | 15.754 | 8 | 2,288,800 |
| 80 | 15.780 | 8 | 2,288,800 |
| 100 | 15.804 | 8 | 2,288,800 |

缓存全文不随历史总数增长，摘要索引仍随条数增长，这是保留全部历史的明确数据结构成本。估算 UTF-16 字节是保守缓存预算，不是 V8 的精确 retainedSize。external/ArrayBuffer 没有随外部版本数线性增长；详见完整 JSON。

## 可重跑材料

以下命令在仓库根目录执行，只使用已安装 Vite 所依赖的 esbuild。支持 Windows 路径；Windows 尚待根代理复测。

```sh
node scripts/build-store-diagnostic-v07.mjs
node --expose-gc scripts/diagnose-store-v07.mjs
node --expose-gc scripts/diagnose-store-v07.mjs --legacy-flow
```

- [v0.6 原始收据](../../.verification/v07-performance/store-diagnostic-v06.json)
- [v0.6 原始源码绑定](../../.verification/v07-performance/source-binding-v06.json)
- [v0.7 新流程收据](../../.verification/v07-performance/store-diagnostic-v07-current-flow.json)
- [v0.7 store + 旧调用流程对照](../../.verification/v07-performance/store-diagnostic-v07-legacy-flow.json)
- [当前源码绑定](../../.verification/v07-performance/source-binding.json)
- [诊断入口](../../scripts/diagnose-store-v07.mjs)
- [隔离构建入口](../../scripts/build-store-diagnostic-v07.mjs)

负责人已将诊断脚本从 `.verification` 提升到上述可提交路径；原诊断副本冻结，原始 v0.6 收据仍单独保留。

仍未覆盖：真实 Electron renderer/GPU 高分辨率驻留、Windows filesystem watcher 的额外刷新、HTTP/SSE 往返、千条事务 history 的临时峰值及冷启动。新流程单次隔离服务收益不能直接换算为 UI 延迟。负责人应按同一真实场景复核后再写总 Validation。
