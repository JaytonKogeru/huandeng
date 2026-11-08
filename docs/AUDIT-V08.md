# HUANDENG v0.8 审计：从时间线到实际演讲

日期：2026-11-08（Australia/Sydney）。基线为已交付源码 `f3e1fa1bda590e6b69d0ef47fabff077bdde0d49`，安装运行时 `ba18ac0d95502361fb8a423a732c808218374915`，0.7.0、sourceDirty=false。1044 个文件 SHA-256 清单在 Windows 干净 worktree 与本轮开发副本间一致。前四节记录实施前状态，实现与验收另记。

## 1. 产品与历史需求复核

用户明确动画首先服务现场讲解：按点击出现、强调、移动、退出对象，以及换页和素材播放组织。v0.7 视频输出保留，继续扩展视频编码、音轨和剪辑不占本轮主线优先级。

核对原始 SPEC §13 M4、v0.5 覆盖审计、v0.6 动画方案、v0.7 Spec/Validation/Handoff 与代码，主要缺口是动画创作及现场放映未形成直接、连贯的工作流。关键帧、纯采样渲染、Cue、共享保存事务可复用。

| 领域 | v0.7 实际状态 | 本轮判断 |
| --- | --- | --- |
| PPTD、永久 ID、writer、Undo、版本、恢复 | 已交付，有历史真实桌面验收 | 保留数据保障，动画走同一事务 |
| Main / Section / Presentation / Story | 多演讲、重复 occurrence、固定版本、备注已成立 | 动画跟随准确身份；视觉变体仍缺 |
| 基础键盘编辑 | Tab、方向键、文字、工作区切换已验收 | 补放映 Enter、画面点击与回退 |
| 动画渲染 | v1 六类轨道、关键帧、Cue、组继承、复制/删除/撤销 | 保留为底层采样器 |
| 动画创作 | 手建属性轨道、起终值、绝对时间 Cue | 缺对象效果、点击顺序及同时/接续 |
| 放映 | 按 Cue 播放，再次前进到段尾，后退前 Cue | 画面不响应点击；跨页后退回零；常驻时间条；备注不等于双屏 |
| 导出 | PNG/PDF/PPTX 静态基础；MP4 确定时间输出 | 保留兼容，不扩展视频路线 |
| 高清素材 | 原图保留、派生预览、有界缓存已实现 | 回归，不降科研原图质量换性能 |
| 音视频素材 | renderer 无 video/audio 语义；动态图片自主运行 | 媒体受步骤控制尚未完成，需独立生命周期设计 |
| Agent | 本机共享接口、实际 stdio 已验证 | 客户端接入及可审阅编排任务仍待交付 |
| 历史扩展 | 评论、React 科学组件、完整 PPTX 往返、母版/SmartArt、云协作未完成 | 不与现场演讲堆入本版 |

Issue #6 已重新读取。身份、插入、缩略图、品牌多数问题已有后续交付，资源增长仍未闭合。最初 5–6 秒及瞬时内存不是当前基准。本轮不修改 Issue，不用功能通过代替性能证据。

## 2. 专项研究与 root 复核

三个专项先研究再审计：动画语义、创作/放映 UX、资源诊断。root 对照源码筛选。Microsoft 将 On Click / With Previous / After Previous 与 Duration / Delay 分开；reveal.js fragments 也将推进分组与效果分开。借鉴演讲语义，不引入整套外部播放器。

- [Microsoft：Animate text or objects](https://support.microsoft.com/en-us/powerpoint/training/animate-text-or-objects)
- [Microsoft：Animation timing](https://support.microsoft.com/en-us/powerpoint/set-the-start-time-and-speed-of-an-animation-effect)
- [reveal.js：Fragments](https://revealjs.com/fragments/)
- [reveal.js：Speaker View](https://revealjs.com/speaker-view/)

接受：默认对象效果列表，点击步骤决定节奏，关键帧为高级能力；预演和放映共用语义；播放中再推进完成当前步骤，全部步骤完成才换页；回上一页展示末态。

拒绝的捷径：持久化两套可编辑 Build 和生成轨道；自动反解旧轨道；定时 GC、清用户缓存或削弱冲突检查掩盖资源问题；一轮承诺双屏、媒体时钟、原生 PPTX 动画和视频编辑。

## 3. 代码位置与直接缺口

- `pptd/animation-model.ts`：编译/插值/组继承可复用，缺效果/触发作者模型。
- `app/lib/pptd-playback.ts`：已有 Cue 推进；identity effect 后重置需覆盖换页首帧和连续输入。
- `app/components/pptd/presentation-view.tsx`：画面无点击推进，常驻时间条，备注同窗，缺本模块全屏及转场。
- `app/components/pptd/timeline-panel.tsx`：预览跑完整时长，放映停 Cue；淡入手工 opacity。草稿保护须保留。
- `app/routes/huandeng.tsx`：同步 URL 导航已修 router 延迟丢步；新增控制不能破坏；放映前仍提交草稿。
- `app/lib/pptd-keyboard.ts`：方向键/空格/PageUp/PageDown 已有，缺 Enter。
- `pptd/timeline-operations.ts` 与 store：作者模型须覆盖复制、组、删除、Undo、版本、重复/固定引用，不能只在 UI 拼数据。

## 4. 性能诊断边界

v0.7 50 对插入/删除：renderer working set 约 159→497 MiB，显式 GC 后约 398；JS used 13.70→56.47→17.01 MiB；挂载 DOM 1777 稳定。驻留增长明确，尚不能单凭它确定 JS 泄漏。

现有测试经 Playwright 附加，网络调试可能保留每次完整快照响应。这是待验证假设。先以相同副本/操作/节奏，对照 raw CDP 不启用 Network 与明确启用 Network，采 working/private、JS used/total、DOM/listeners、空闲及 GC。科学原件只复制校验，用户窗口不参与。

v0.7 文件可见时间比 v0.6 慢而最终确认更快，watcher/FIFO 相位仍未归因。改服务队列前须取得接收、入队、运行、写入、watcher、committed-read 分段证据，不根据内存现象顺便重构事务。

## 5. 本轮排序

P0：对象效果→点击编排→点击预演→现场放映→回退/重复/固定版本→保存恢复的完整链路。

并行 P0：资源归因；查到产品保留路径再修并复测；若证明调试器保留响应，修正基准并分别报告真实趋势。

P1：简洁观众画面、步骤状态、全屏、黑屏暂停、可选淡化换页、紧凑窗口面板。

后续：双屏/排练、受控音视频、演讲实例变体、原生 PPTX 动画、真实 Agent 客户端编排，均不计本轮完成。

## 6. 实测后复核：内存重新归因

相同raw-CDP驱动、已安装v0.7(ba18ac0)、80页副本、50对GUI插入/删除，只改变Network inspector。实际视口1600×967/DPR1，两组一致；与旧Playwright1600×1000不混算延迟。

| Renderer working set | 不启用Network | 启用Network |
| --- | ---: | ---: |
| 初始稳定 | 152.36 MiB | 155.95 MiB |
| 50对后 | 328.23 MiB | 470.49 MiB |
| 自然空闲15秒 | 223.72 MiB | 370.50 MiB |
| 显式GC后 | 219.95 MiB | 371.10 MiB |
| 同进程关闭Network并GC | — | 217.55 MiB |

关闭Network释放153.54 MiB working set、156.38 MiB private，JS used仍15.05 MiB，DOM/listener不变，回到无Network组水平。同进程实验确认检查器保留响应的影响。此前GC后约398 MiB不能继续直接作为日常编辑泄漏证据。

第三组50对每10对GC，低水位213.05/222.66/220.76/212.96/201.18 MiB，private135.20/144.70/141.72/134.22/133.39。9次memory-infra dump显示Blink主堆committed从10.75升到68.625 MiB后稳定，活对象约5.87–6.06 MiB；web_cache2.958 MiB。须区分已提交容量、池/碎片与活对象；嵌套provider不能相加当OS占用。该场景低水位稳定，不等于数小时混合素材验证。

三组均0/null正常关闭、无renderer错误，原件82文件SHA不变。[配对数据](evidence/v08/observer-control.json)与[native分解](evidence/v08/native-allocation.json)已脱敏；科研路径及原始trace留本机。

仍有可改进工作：每次普通保存后的/current返回完整80页，该fixture初始约686KB，未变页虽不重渲染，读取/解析仍重复分配；未来可用epoch/sequence/revision做增量回读。SSE慢消费者背压需独立压力场景。两者都不是本次检查器差值的已证根因。本轮不顺便重构事务，不加定时GC/clearCache，不删Undo，不降原图质量。

## 7. 发布候选的产品复核

root复看正式候选的真实截图，接受逐步预演的空间改版：1040×680窗口的画布从首版约268×151提升至606.833×341.344，作者参数和换页设置在预演中隐藏，返回时保留选择、展开和未确认输入。基础属性与动画参数同时展开时，窄窗口仍拥挤；这属于后续创作效率问题，不用预演尺寸证明整个作者界面都已最优。下一轮应考虑随任务切换的单一属性面板和可调工作区，保留用户手动展开偏好。

本版补齐了点击步骤的创作、预演和现场播放。步骤标签目前可写讲解目的，但逐步讲稿、独立演讲者视图、素材播放控制、演讲实例视觉变体以及真实Agent编排仍未闭合。四层Story不应再另建平行文档；后续应让Agent读取现有目的、证据角色、步骤标签和occurrence备注，提出可审阅的演讲编排，再经同一事务应用。

旧时间线、静态输出、MP4与本机stdio仅做兼容回归，本轮没有扩展视频编辑路线。更长的混合高清素材会话仍需用排除Network响应保留的驱动验证；科学原件继续只复制和核哈希，不用真实文稿承受测试写入。
