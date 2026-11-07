# v0.5 Windows 保存恢复审计

日期：2026-11-07。范围：打包候选 `80a83ee` 的真实 80 页性能验收失败及其阻断修复。

## 实际失败与现场

该候选的前两轮新增/删除完成；第三轮删除返回 `PENDING_RECOVERY`。旧验收脚本随后进入关闭流程，但编辑器保留着未确认交易，关闭前的保存检查拒绝退出，导致报告尚未写出。

通过只读检查原 renderer 的客户端错误对象，获得原 HTTP 错误详情：

```text
EPERM: operation not permitted, rename
.../pages/.001.page.huandeng-40912b5b-6dac-4c76-aa6d-017e4f94d7c3.tmp
-> .../pages/001.page
```

失败交易为 `element.remove`；request ID 为 `dadb4b69-8acb-434a-99dc-9df386120982`，operation ID 为 `87e15677-28d7-4429-b9d6-e15f3e6d4020`。现场页面逐字节等于 journal 的 `before`，没有安装 `after`；journal 已持久化。没有观察到第三态或源文件混写。

这证明失败发生在 Windows 文件替换阶段。未确认哪个进程或文件系统组件持有了阻止替换的句柄，不能仅因当时有 10 ms 落盘轮询就把它认定为根因。

完整项目副本、runtime、服务日志、journal 与客户端错误已另存于验证目录 `performance-v05/failure-packaged-80a83ee/`。原临时项目 `huandeng-editor-benchmark-7WOD70` 也保留，便于使用原路径和原 state directory 验证恢复。仅结束了已经核对归属的验收程序及其候选实例；用户原有桌面实例未受影响。失败候选不能算作通过该项验收。

## 保存与恢复改动

Windows 对 `EPERM`、`EACCES`、`EBUSY` 的原子替换重试由原先总计 150 ms 等待，调整为最多约 2000 ms 的有界窗口。退避为 25、50、100、200 ms，随后单次最多 250 ms，并受剩余总窗口约束。其他 I/O 错误直接返回。不会通过删除目标文件来规避替换失败。

每次替换尝试前，重新读取目标并与该交易记录的 `before` 比较；如果已经是 `after`，视为已安装；如果成为第三态，立即返回 `RECOVERY_REQUIRED`，保留第三态和 pending journal。延长等待没有放宽冲突检查。

新增 `POST /__pptd/recover`，请求体为 `{}`，使用原 session token。该操作在现有单 writer 队列中运行，复用 journal 结构、内容 hash、路径和第三态检查，完成已有交易后重新加载实际文档，返回与 session 相同结构的快照。它不创建一笔新的交易。

客户端有未确认请求时，恢复后继续使用原 request ID 和原操作确认回执，再合并发送后新增的草稿。Undo/Redo 的回执确认也校验已有记录中的 actor、deck 和目标操作，避免根据恢复后的版本重建请求而错误触发 request ID reuse。恢复失败不会丢弃未确认请求或草稿。

即使恢复只清除保护状态、没有改变文档内容，也会发送有新 sequence 的状态事件，让其他订阅者退出保护状态。重复同一错误的刷新不反复发送相同诊断事件，避免 session 刷新与事件通知相互触发。

## 验证与保守边界

本地 focused 验证已通过 7 个文件、52 项测试，core TypeScript 与相关 Biome 检查通过。新增验证覆盖暂时和持续共享错误、重试窗口中的第三态、已安装的 after-state、无关 I/O 错误、部分多文件事务恢复、journal hash 篡改、原请求幂等回执、Undo/Redo 恢复、只读拒绝、恢复 API 认证及无内容变化的状态事件。

本地模拟 Windows 错误的测试验证退避和数据保护逻辑，不能替代真实 Windows 内核句柄测试。真实 FileShare.Read 占用、释放后 UI 恢复、第三态拒绝，以及原失败 journal 在原路径上的恢复结果，须由独立 Windows 验收记录补齐。

长时间文件占用仍可能超出有界窗口；此时保留 journal 并进入可恢复保护状态是预期行为。验收要求是数据和原回执链路保持完整、用户能够在占用解除后安全继续，而不是无限等待或强行覆盖目标。
