# HUANDENG v0.7 — 交接与下一阶段

日期：2026-11-08（Australia/Sydney）。先读 [Audit](AUDIT-V07.md)、[Spec](SPEC-V07.md)、[Implementation](IMPLEMENTATION-V07.md) 和 [Validation](VALIDATION-V07.md)。历史需求继续追溯原始 SPEC、v0.2–v0.6 和 AUDIT-V05-COVERAGE，不把本轮未选事项当作从需求中消失。

## 当前交付

- Windows canonical：`<editor-checkout>`；工作树：`<workspace-checkout>`；分支 `editor/v0.7-workspace-video`。
- 已安装运行时：`ba18ac0d95502361fb8a423a732c808218374915`；0.7.0；`sourceDirty=false`；构建 `2026-11-07T21:34:36.5584922Z`。
- 安装：canonical 的 `dist/HUANDENG-win32-x64`。29,153 个文件 / 683,653,487 bytes 与最终包一致。旧 v0.6 包在 `.verification/installed-v06-backup-20261108-v07`；旧用户窗口正常 CloseMainWindow 退出，无强制终止。
- 普通用户 profile 已重新打开原 80 页项目，可写、无诊断、窗口响应、视频编码器可用。82 份源文件 hash 不变。保留该窗口，不用它作测试写入。
- 最终 EXE 十套 102 项；Linux 918、Windows 917 + 1 POSIX skip；TypeScript/Biome、clean build/package、正式 smoke 通过。原始详细证据留在 Windows .verification；合成截图和无科研路径的摘要在 [evidence/v07](evidence/v07/README.md)。
- Linux `local/v07-from-v06` 是传输工作副本，**不要推送其历史**。构建来源以安装 marker 为准，不以之后的文档提交替代。

## 负责人接受的产品决定

三个专项先读一手资料，再审计；负责人复核并写统一 Audit/Spec，之后才分模块实施。Taste-Skill 只借鉴一致性、实图复核和短反馈，不把公司网站风格直接套进高密度编辑器。

顶栏保持一条横向层级；素材是统一入口，快速设备导入仍可直达。页面自动保存与项目/Story/图表/时间线的独立草稿明确区分。动画预览释放基础属性栏，回到编辑恢复原选择与面板偏好。

Main、Sections、Presentations 仍处于同一项目，pageId 表示内容，occurrenceId 表示一次出现，position 表示当前序位；重复页可以 live 引用、独立备注或固定命名版本。可编辑视觉变体尚未成为原子操作，不用版本固定冒充它。

MP4 是确定时间导出：只挂载当前 occurrence，明确 seek，等待资源，PNG pipe 背压编码。当前没有音轨、页面转场或自主媒体时钟。静态格式不改含义，仍输出基础版式和明确报告。

## 不可破坏的约束

1. **保存与原稿：** 保持单 writer、CAS 真字节、幂等 requestId、原 journal/receipt 恢复、第三态拒绝、外部变化时 checkpoint defer；不能用 mtime/TTL 代替写入校验。原稿只读或复制后测试。
2. **草稿：** page/Story/project/chart/timeline 的失败稿和未确认输入不得因切页、未来 schema、外部删除、响应丢失而静默清除；timeline identity 包含 occurrence/version。
3. **键盘：** 固定 canvas tabIndex=0；快速导航读最新同步 URL，焦点意图绑定目标 page/occurrence；Esc 优先取消手势，原生输入和 IME 作用域保留。
4. **时间线：** 纯采样不逐帧重写基础几何；磁盘整数 ms、UI 秒；一次完成手势一次事务；复制 remap、删除 prune、Undo/命名版本完整。
5. **素材：** revision 是真实 SHA-256；hint 不能冒充内容身份；返回内容或304前核对；网格/缩略图可降采样，画布/详情/输出保留原图。
6. **资源：** 缓存先成功删除再扣预算；无法清理保留所有权与有限重试；任务结束先释放快照/Buffer；不因报告最终更新或清理失败推翻已发布的主成品。
7. **发布：** 主成品 rename 才是提交点；此前取消保留旧成品，此后返回真实完成状态。完成任务使用独立不可变下载，不能指向可被下一次导出覆盖的公共文件。
8. **视觉：** reduced-motion 需同时覆盖工作台与 Portal；独立 translate/scale 用可保留的 reset，检查编译后 CSS，避免再次被优化成仅 transform；Dialog 居中不能一并清除。

## 性能结论与下一次审计入口

50 轮真实项目副本中，当前挂载 DOM 始末均 1777，文档服务工作集约 212–223 MiB；renderer working set 到 497.30 MiB，GC 后 397.83 MiB，JS 回到 17.01 MiB。说明有大量可回收对象，但 **renderer 驻留增长仍然存在**。不要把有界缓存和正常退出当成数小时无泄漏证据。

历史热缓存稳定 8 条 / 2,288,800 估算 UTF-16 bytes、冷版本可恢复；高清场景的派生表示共 797,062 bytes，对照原图 119,177,776 bytes。高清三轮后 GPU/Tab 最后间隔趋缓；当前编辑基准 Tab 后期仍增长，这两个结论属于不同场景，不得混写。

内部 store-flow 工作量减少已经验证。端到端 persistence 与 ack 不同方向变化，近邻旧/新包对照及其原始阶段定义保存在 Validation；下轮记录事务接收/排队/开始、180ms watcher刷新、页面安装与收尾的阶段时间，先验证连续操作的队列相位；不能猜测成缓存或磁盘根因，也不能调整测试等待后替代真实连续操作结果。

| 优先级 | 工作 | 完成门槛 |
| --- | --- | --- |
| P0 | 长会话 renderer 和保存前半段归因 | 成熟状态的重复 heap/native/GPU 样本，实际 retainer 路径或分配归因；连续工作与闲置/重开/导出；确认 CSS/响应解析/图片和队列各阶段，保留失败恢复与原稿保护 |
| P1 | 动画制作与工作空间 | 画布姿态设关键帧、成组复制/偏移、清楚的 cue 到视频节奏；可调时间轴高度、收拢说明、实际125/150%DPI；一次手势一次事务及失败稿保护 |
| P1 | 真实演讲编排 | 目录页不同高亮可明确派生变体并原子更新引用；长大纲定位、批量编排、live/pinned影响范围、计时彩排 |
| P1 | 实际 Agent 客户端入口 | 包内 launcher 可见配置、在实际 Codex/Claude 中安装并完成真实文稿任务；私有ChatGPT通道单独验收授权、撤销与生命周期 |
| P2 | 动态交付扩展 | 更长成片和更多科学内容的媒体探针、音轨/媒体统一时钟、转场；编码器分发许可与跨机可用性；原生PPTX动画另立兼容项 |

表格、图表、公式、任意 React 组件、评论、PPTX 导入/往返、双屏和云协作仍按历史覆盖矩阵逐项推进。科研参考文件的真实 PowerPoint 参考保持 v0.6 证据来源，本轮不虚报全量 Office 复验。

## 工程接续

新增导出模块位于 `packages/core/src/pptd/{video-plan,video-encoder,export-environment,export-workspace}.ts`，接线在 runtime-export、vite/routes/pptd、huandeng-export 和 export-dialog。历史/存储优化在 page-history/store/persistence，HD 在 asset-preview 与共享素材读取。MCP 总计17工具，包内 stdio已验证，实际用户客户端安装仍未完成。

使用已提交脚本 verify-keyboard-v07、verify-ui-v07、verify-animation-v07、verify-video-v07、verify-hd-assets-v07、verify-installed-v07；项目/桌面/编辑/恢复旧脚本保留原文件名。build-store-diagnostic-v07、diagnose-store-v07 和 benchmark-editor-v07 为性能复现入口。Windows和Linux源码、开发宿主、最终EXE、正式安装的结果分别记账。

保护 canonical 中既有 `tests/fixtures/studio/pages/identities.page`，SHA256 `fe378a48e57b63f2b9e7286578f68eefe856a381422930a6615f920b02622832`；不要整体 add、reset 或覆盖。源码日常本地维护，验收里程碑后统一同步 private origin 与 annotated tag `editor-v0.7.0`。不推 upstream，不发 npm，不公开本地服务，不代发 Issue 评论。最终远端 refs 要独立核对。
