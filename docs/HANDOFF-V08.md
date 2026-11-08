# HUANDENG v0.8 交接

本轮方向：点击驱动的现场放映。用户已澄清动画重点是对象进入、强调、移动、退出及换页，MP4 保留兼容。继续遵守 Audit → Spec → Implementation → Validation，不按视频剪辑路线扩展产品。

## 当前来源与验收

基线 `f3e1fa1bda590e6b69d0ef47fabff077bdde0d49`，运行时 `ecba4cb24d2753841290eb5d29f68b702a4902f6`，0.8.0、Electron 38.7.2、sourceDirty=false，构建时间 `2026-11-07T23:44:51.5551681Z`。Windows worktree 为 `D:/_Proj/Huandeng-v08-20261108`，分支 `editor/v0.8-live-presentation`。Linux 只是同文件开发/传输副本，不推其快照历史。

代码门槛：Linux 955/955，Windows 954 pass + 1 POSIX-only skip，共 82 个文件；TypeScript、Biome 661 文件通过。打包、自包含与搬迁检查通过。最终 EXE 131/131、package smoke、25 轮放映、80 页副本 50 对编辑和安装验收通过。29,160 个文件 / 683,846,687 字节已逐一核验；00:37:26Z 完成安装，普通窗口恢复原 80 页项目，82 源文件与本轮 raw 基线一致。旧 v0.7 包保留，未强制终止用户进程。详细失败归档、恢复及最终回执见 [VALIDATION-V08](VALIDATION-V08.md)。

## 模型与实现约束

`BuildTimeline` schema 2 只保存 effects，纯编译为旧 v1 轨道。不要同时存储两份可编辑动画。支持 appear / fade-in / fade-out / disappear / pulse / move，click / with-previous / after-previous。位置为相对基础几何的累计位移；强调恢复原比例，淡入遵守基础 opacity；组沿既有变换继承。

删除和筛选复制按 `resolveBuildTiming` 重建原组局部 start/end，保留原等待、并发和顺序。删除组首时首剩余项提升 click；空组删除，删尾允许缩短组末。不能简单过滤后让 with/after 指向新前项。桥接 delay 允许 600000 ms，但整页仍最多十分钟；效果 duration 除瞬时外最多 60000 ms，pulse 至少 2 ms。混合非空 v1/v2 粘贴拒绝整次，不偷偷丢弃动画。

`readPageAnimation` / `validatePageAnimation` / `resolvePageAnimation` 处理 union；`readTimeline` 只供旧 v1 高级编辑。旧数据不自动反解。显式转换到自由时间线是一次 CAS，可 Undo。未知未来 schema 必须保留且禁止覆盖。

`page.timeline.set` / `page.transition.set` 使用共用 writer、CAS、requestId、journal 和 Undo。页面 transition 独立为 none / fade；只影响显示，不逐帧写布局，复制与命名版本携带。静态/视频输出有明确未导出提示，不宣称 PowerPoint 原生转场。

## 创作与播放约束

BuildPanel 是新页默认入口，旧 v1 保留高级时间线。预演隐藏作者参数及换页设置但保持挂载，返回恢复选择、输入和展开状态。外部 schema 改变不得卸载脏草稿；只读、版本固定、删除来源和冲突都保持明确处理。

预演/放映共用 `usePresentationPlayback`：下一次点击运行下一组，播放中再次前进完成当前组，末组后换页。后退到前停点，跨页回上一页末态。重复 occurrence 开场，pin 使用版本。identity 包含 page/occurrence/version，换源、暂停和卸载取消 RAF，目标页首帧不能闪旧状态。

相对导航使用同步 pending 门闩，Home / End 绝对定位可替换在途目标。F5 / Shift+F5 携明确目标，session restartKey 重置而不 remount 全屏容器。黑屏清同步状态、暂停并禁止 seek/play，恢复不偷吃一步。F1 先退出全屏再打开 body Portal。按钮/输入保持原生键盘语义，按键 repeat 不消费新步骤。

正式候选 1040×680 预演画布 606.833×341.344 px；基础属性与动画参数同时展开仍拥挤。后续整合单一情境属性面板，不再叠加常驻工具条。[真实截图](evidence/v08/builds-compact.png) 与 [展开状态](evidence/v08/builds-authoring-expanded.png) 分别记录。

## 性能判断必须沿用新证据

旧 v0.7 的 Playwright GC 后约 398 MiB 不可再直接称日常编辑泄漏。raw-CDP 同条件 Network 开/关对照，开启组 GC 后 371.10 MiB，关闭同进程 Network 并再次 GC 后为 217.55；不启用组 GC 后为 219.95。JS used 和 DOM/listener 不变，支持检查器响应保留解释。native 分解与每十轮 GC 低水位未显示该短场景持续上升。

不要把上述差值描述成 v0.8 产品优化；没有新增定时 GC / clearCache / 删历史，也没降原图。更长的混合高清素材会话仍未验收。普通保存后的完整 `/current` 反复读取/解析有优化价值，先做分段观测再设计 epoch/sequence/revision 增量回读。SSE 慢消费者背压另建压力场景，不能削弱 CAS、fsync 或恢复语义。

最终连续放映与 80 页数据以 Validation / evidence 记录为准。raw harness 禁用 Network；强制 GC 只用于最后一次诊断，不作为产品策略或日常稳定性证明。

## 下一轮按使用闭环组织

| 顺序 | 工作 | 进入实施前的判断与验收 |
| --- | --- | --- |
| 1 | 演讲者工作区与实际现场流程 | 独立观众/演讲者窗口、备注/下一步、计时与彩排，明确单屏退路、窗口断开、焦点和快捷键；用真实演讲集合验证 |
| 2 | 动画创作效率与受控媒体 | 先整合属性面板；再设计视频/音频元素的步骤触发、暂停/回退/重入、资源释放与缺资源处理；不要扩展成通用剪辑器 |
| 3 | 演讲实例视觉变体 | 固定 pageId 与 occurrenceId；区分跟随主库、局部变体、固定版本，解释变更传播、恢复及共享素材 |
| 4 | 可带走的原生 PPTX 动画子集 | 先审计 OOXML 映射和库能力，支持少量可验证效果/触发，真实 Office 放映验收；不把静态导出包装成动画保真 |
| 5 | 真实 Agent 客户端任务 | 从现有四层 Story、步骤标签、邻页、备注、素材及 selection 生成可审阅编排，通过共用事务应用；完成一个具体客户端端到端验收 |
| 并行 | 长会话 / 高清混合负载 | 排除检查器响应保留，分别报告自然空闲与 GC，追踪真实保留路径；增量回读和背压各自独立规格 |

独立双屏、受控音视频、视觉变体、原生 PPTX 动画和实际客户端安装目前都未完成。评论、科学组件注册、高级统计图、批量编排、默认文件关联和完整 PPTX 往返继续保留在历史需求清单，不能因本轮成功从 backlog 消失。

## 工程接续与用户数据

正式 canonical 仓库 `D:/_Proj/Huandeng`。既有修改 `tests/fixtures/studio/pages/identities.page` 的 SHA-256 为 `fe378a48e57b63f2b9e7286578f68eefe856a381422930a6615f920b02622832`，不得 stage、reset 或覆盖。科研原件不运行测试写入。普通用户窗口安装后留给用户；测试另建 profile/runtime 和副本。

本轮原件基线是 Windows v0.8 worktree 的 `.verification/renderer-v08/raw-runtime-50.json`（既存 v0.7 包对照，passed/originalUnchanged 均 true）；当前 82 文件与它一致。更早 v0.7 packaged 基线有一页不同，首次预检已拦截并留档，不改旧收据或原件。安装应显式 `--source-baseline` 指向本轮 raw 基线，详见 Validation。不可省略前后哈希校验或把新旧两代基线描述成完全相同。

新脚本：`verify-live-v08`、`verify-builds-v08`、`verify-keyboard-v08`、`verify-animation-legacy-v08`、`verify-video-v08`、`verify-installed-v08`、`soak-presentation-v08`、`diagnose-renderer-v08`。视频 v08 仅增加当前测试窗口截图前置与条件记录，保留旧全部业务断言；两次旧截图失败应保留，不宣称根因已被证明。Windows 开发依赖使用 isolated，独立部署使用 hoisted；不要为 invalid-hook 环境问题改业务测试。

用户已授权开发、测试、安装和重要私有 origin 里程碑；平时本地记录。验收后再同步源码与 annotated tag。不得发 Issue 评论/消息、npm 发布、upstream 推送、公开本机服务或改变仓库可见性。具体安装和远端收据须独立核对，构建、安装与推送不是同一件事。
