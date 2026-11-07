# v0.5 Windows 保存恢复审计

日期：2026-11-07。范围：打包候选 `80a83ee` 的真实 80 页性能验收失败及其阻断修复。**原失败交易已在 Windows 原现场恢复；修复后正式程序包的恢复 6/6 和 80 页 5/20 轮连续操作均已通过。** [发布记录](RELEASE-V05.md) 汇总交付状态，[证据索引](evidence/ui-v05/README.md) 区分各阶段来源。

首批修复源码为 `80a83ee` 加传输包 SHA-256 `5d1b1727ab07389434f048262c2c9afc5a2c32afd2607df63aa02a4514538448`，93 个传输文件已逐一校验，并记录为运行时提交 `bf0aa1f6e87183578f924e86cfb6c53368ff638a`。后续 6 文件修正的传输 SHA-256 为 `086f16abffbf44c40c3e0c3511760d12d0d370e5cfb6ee717f16d68bb034d29a`；该来源与后续正式包分别记录，不改写已失败程序包或第一、二轮候选的记录。

包含上述修正的正式运行时为 `03a96957f854ab593400218102928d1feb3c86d0`，版本 `0.5.0`，于 `2026-11-07T13:26:12.5660629Z` 从干净源码构建。打包及两次自包含/搬迁检查通过；实际 EXE 恢复故障 6/6 及独立 5/20 轮大项目连续操作均已通过，并已安装到既有正式位置。

## 实际失败与现场

该候选的前两轮新增/删除完成；第三轮删除返回 `PENDING_RECOVERY`。旧验收脚本随后进入关闭流程，但编辑器保留着未确认交易，关闭前的保存检查拒绝退出，导致报告尚未写出。

通过只读检查原 renderer 的客户端错误对象，获得原 HTTP 错误详情：

```text
EPERM: operation not permitted, rename
<temporary page file> -> <target page file>
```

失败交易为 `element.remove`；request ID 为 `dadb4b69-8acb-434a-99dc-9df386120982`，operation ID 为 `87e15677-28d7-4429-b9d6-e15f3e6d4020`。现场页面逐字节等于 journal 的 `before`，没有安装 `after`；journal 已持久化。没有观察到第三态或源文件混写。

这证明失败发生在 Windows 文件替换阶段。未确认哪个进程或文件系统组件持有了阻止替换的句柄，不能仅因当时有 10 ms 落盘轮询就把它认定为根因。

完整项目副本、runtime、服务日志、journal 与客户端错误已另存于验证目录 `performance-v05/failure-packaged-80a83ee/`。原临时项目也保留，便于使用原路径和原 state directory 验证恢复。仅结束了已经核对归属的验收程序及其候选实例；用户原有桌面实例未受影响。失败候选不能算作通过该项验收。

`80a83ee` 曾在 12:47:09.8127082 UTC 从干净运行时源码构建；该包的 Desktop 7/7、Editor 8/8 通过属于独立交互结果。随后的 80 页性能流程失败，因此停止安装与里程碑发布。该失败不会被之后成功的运行覆盖。

## 保存与恢复改动

Windows 对 `EPERM`、`EACCES`、`EBUSY` 的原子替换重试由原先总计 150 ms 等待，调整为最多约 2000 ms 的有界窗口。退避为 25、50、100、200 ms，随后单次最多 250 ms，并受剩余总窗口约束。其他 I/O 错误直接返回。不会通过删除目标文件来规避替换失败。

每次替换尝试前，重新读取目标并与该交易记录的 `before` 比较；如果已经是 `after`，视为已安装；如果成为第三态，立即返回 `RECOVERY_REQUIRED`，保留第三态和 pending journal。延长等待没有放宽冲突检查。

新增 `POST /__pptd/recover`，请求体为 `{}`，使用原 session token。该操作在现有单 writer 队列中运行，复用 journal 结构、内容 hash、路径和第三态检查，完成已有交易后重新加载实际文档，返回与 session 相同结构的快照。它不创建一笔新的交易。

客户端有未确认请求时，恢复后继续使用原 request ID 和原操作确认回执，再合并发送后新增的草稿。Undo/Redo 的回执确认也校验已有记录中的 actor、deck 和目标操作，避免根据恢复后的版本重建请求而错误触发 request ID reuse。恢复失败不会丢弃未确认请求或草稿。

编辑器原有的关闭前保存检查会保留未确认请求，但此前界面只建议重新打开项目；重试同一次保存又会被 pending journal 拒绝，用户无法在当前会话中解除保护。现在提供“恢复未完成保存”，将这条链路接通。界面先显示“保存待恢复”，执行时显示“正在恢复保存…”，取得原 receipt 和实际快照后才解除状态。

发送后的键入、临时只读保护期间已有草稿中的输入、恢复进行中的输入都会继续留在本地。恢复期间暂停自动提交，成功后把后续草稿接到真实已确认的页面版本，再继续保存。若恢复期间另一个作者修改了同页，则保留冲突。已取得 receipt、仅重新读取失败的请求不会重复提交。恢复 endpoint 的 4xx 或网络失败也不会被误判为原交易确定失败。

没有自有 pending 的其他会话收到已恢复且可写的干净快照，可以解除恢复状态；仍有自有 pending 的会话必须先确认自己的原 receipt。离开保护保留，第三态没有强制覆盖或自动丢弃入口。用户可“复制待保存页面”，取得原请求和本地页面草稿的独立副本，其中不包含 session token。文件占用和文件/保存记录不一致使用不同说明，详细诊断仍可查看。

即使恢复只清除保护状态、没有改变文档内容，也会发送有新 sequence 的状态事件，让其他订阅者退出保护状态。重复同一错误的刷新不反复发送相同诊断事件，避免 session 刷新与事件通知相互触发。

恢复重新读取文件时，若同时发现不属于该交易的页面、metadata 或 manifest 外部改动，发布 external 事件，Git checkpoint 延后。不能把这些变化一并归入 recovered transaction 的 committed 事件，进而扩大 checkpoint allowlist。后续回归覆盖独立页面和项目元数据的混合变化。

## 验证与保守边界

首批后端 focused 验证通过 7 个文件、52 项测试；客户端定向验证通过 33/33，其中新增 10 项恢复用例。随后该修复来源的 Linux 全量为 **63 个测试文件、796/796 通过**，Windows 为 **63 个文件、795 通过及 1 项 POSIX 专属跳过**；两端 core TypeScript/build 及 Biome 569 个文件通过，见 [修复阶段代码摘要](evidence/ui-v05/code-validation-recovery.json)。后续小修的代码门槛须另行追加，不能覆盖此批来源。

后端验证覆盖暂时和持续共享错误、重试窗口中的第三态、已安装的 after-state、无关 I/O 错误、部分多文件事务恢复、journal hash 篡改、原请求幂等回执、Undo/Redo 恢复、只读拒绝、恢复 API 认证及无内容变化的状态事件。客户端覆盖原请求/回执、后续输入重建基线、结构预览、第三态/无效文档/网络失败、known receipt、外部恢复状态、同页冲突与历史单次迁移。

本地模拟 Windows 错误的测试验证退避和数据保护逻辑，不能替代真实 Windows 内核句柄测试。`scripts/verify-recovery-v05.mjs` 使用自建合成项目及隔离 profile/runtime，[首批开发宿主的 6 项功能检查](evidence/ui-v05/recovery-devhost-first.json)已通过。截图复核进一步发现第三态拒绝原因会被较弱的 watcher pending 诊断覆盖，因此补了诊断优先级保护：保留明确的 `RECOVERY_REQUIRED` 与原错误 details，直到下一次显式恢复或恢复成功。客户端新增连续两次弱诊断刷新回归，定向结果为 34/34。

追加修正的代码门槛为 Linux **63 文件、800/800**，Windows **63 文件、799 通过及 1 项 POSIX 专属跳过**；两端 TypeScript/build，Windows Biome 569 文件及 Linux 修改的 6 文件通过，见 [后续代码摘要](evidence/ui-v05/code-validation-recovery-followup.json)。加强后的 [真实 Windows 开发宿主恢复验收](evidence/ui-v05/recovery-devhost-followup.json)再跑 6/6，主动“检查最新状态”并等实际 session 响应后，第三态中文原因仍正确；四张截图已查看，无 renderer/cleanup error，合成测试环境清理成功。随后 [正式 EXE 恢复验收](evidence/ui-v05/recovery-packaged.json)同样 6/6 通过、进程 exit 0，四张新截图逐张核查，第三态原因主动刷新后仍正确；无 renderer/cleanup error，合成环境已清理。

### 原失败 journal 的 Windows 恢复回执

修复后的编译产物于 **13:14:27.386 UTC** 在原临时项目路径、原 state directory 上完成恢复，没有修改 journal 的 root 或重新构造交易。验证脚本正常退出，结果保存在 `.verification/performance-v05/original-failure-recovery.json`；[安全摘要](evidence/ui-v05/original-failure-recovery.json) 记录其 SHA-256 与证据边界：

- production 静态服务成功打开原 80 页项目，快照恢复为 writable。
- 目标页面逐字节匹配原 journal 的 `after`，pending journal 完成后移除。
- 原 request ID 的三次确认返回同一个原 operation ID，回执完整等于原 journal 的 result。
- 操作历史中该 request 和 operation 都只有一条，未重复执行删除。
- 校验了 82 份 manifest、页面和 metadata 源文件；除该交易目标页面外，其余 81 份 hash 全部不变。
- 原临时项目的恢复后状态继续保留；独立失败现场副本未写入或清理。

这次恢复核查的是 82 份 manifest、页面和 metadata 文件；它与先前完整项目 970 份输入文件检查的范围不同。原始 JSON 可直接核对 receipt 身份、80 页修订、82 份前后摘要、81 份不变及唯一历史记录；原位置复用、三次回执一致和现场副本保全等执行事实由协调负责人单独记录在摘要中。

长时间文件占用仍可能超出有界窗口；此时保留 journal 并进入可恢复保护状态是预期行为。验收要求是数据和原回执链路保持完整、用户能够在占用解除后安全继续，而不是无限等待或强行覆盖目标。

## 正式程序包连续编辑复验

`03a96957` 的正式 EXE 使用同一 80 页材料的独立临时副本，分别完成 5 轮与 20 轮新增/删除，正常关闭。两轮 rendererErrors、transactionFailures 都为空，82 份 manifest/页面/metadata 原文件 hash 不变。5 轮 Delete 视觉中位 27.4 ms、落盘中位 222.5 ms；20 轮的视觉范围 19.2–30.5 ms、落盘范围 178.8–259.5 ms。完整计量与来源见 [正式包性能摘要](evidence/ui-v05/performance-packaged.json)。

原失败 `80a83ee` 现场、恢复原 journal 的回执、开发宿主两轮恢复与正式 EXE 结果均独立保留。20 轮后的进程工作集仍有增长，长期内存稳定性没有被这些短期通过结果代替。
