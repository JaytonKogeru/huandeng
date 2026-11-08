# HUANDENG v0.9 审计：通用编辑与 Story Plugin

日期：2026-11-08（Australia/Sydney）。基线 `70f655d905379037a3cec4223e4da5c79c1ef175`，运行时 0.8.0 / `ecba4cb24d2753841290eb5d29f68b702a4902f6`。Windows 干净 worktree `D:/_Proj/Huandeng-v09-20261108` 与开发副本 1,074 个源文件 SHA-256 一致。本文记录实施前判断；完成情况另记 Implementation / Validation。

## 1. 产品判断

本轮用户要求中英文切换、日常对齐吸附、对照 PowerPoint 的必要功能，以及正式推进 HUANDENG Plugin，建议先用真实 DeepSeek Harness 客户端。既有现场演讲动画路线继续保留。主要精力放在 Audit / Spec / Implementation，验证按改动风险安排，不重复上一版全套压力矩阵。

目标：**完整切换语言、可靠排列对象，并让外部 Agent 按 Story 工作流预览和实施修改。** 三者依赖现有组件与单一 writer，不需要更换桌面技术栈或新建模型执行器。双屏演讲、受控媒体、视觉变体、原生 PPTX 动画依然重要，安排在这些编辑基础之后。

复核原始 SPEC、v0.2–v0.8 Spec/Handoff、v0.5 覆盖审计、v0.6 键盘/Agent 审计、v0.7 前后端/视觉研究、v0.8 动画及内存结论、当前代码和 GitHub Issue #6（本轮重新读取，仍开放）。Issue 的 5–6 秒和瞬时内存是历史反馈，不能当作 v0.8 新测量；其中中文优先的旧决定已被本轮中英可切换要求更新。

## 2. PowerPoint 必要功能对照

比较 Microsoft 365 Windows 桌面版，不以网页版限制代替桌面能力，也不以克隆全部 PowerPoint 作为无终点验收。

| 工作流 | v0.8 实际状态 | 判断 |
| --- | --- | --- |
| 打开、新建、保存、Undo/Redo、恢复 | 桌面入口、共享事务、外部修改保护、命名版本已交付 | 保持；语言/辅助线不能产生文稿写入 |
| 键盘、框选、拖动、缩放、旋转 | Tab、方向键、F6、原生输入保护、组变换已有 | 修轴锁和组合吸附的实际缺陷 |
| 对象边/中心吸附 | 页面/对象参考、5屏幕像素阈值、Alt已有 | 补可靠性、入口、旋转外框与等距 |
| 多对象对齐/分布 | 六向对齐已有；多选仅选区；分布算法未接UI | 本轮补整页/选区参考与横纵均匀分布 |
| 网格、手工参考线、标尺 | 无完整作者工作流 | 后续排版工具，先完善智能辅助线 |
| 剪贴板、分组、图层 | 对象复制/粘贴、图片导入、组及置顶/置底已有 | 锁定/隐藏及精细层次操作仍缺，不把unknown fields当实现 |
| 文字、图片、形状 | 日常格式、crop数值、21形状与图标已有 | 富段落、交互裁剪继续补；非完整Office等价 |
| 表格、公式、图表 | 结构/合并、LaTeX、13图表族及有限原生PPTX已有 | 高级统计/科学组件注册仍缺；保留原图工作流 |
| 中文/英文界面 | 业务与桌面硬编码中文，仅有上游语言基础 | 本轮P0，覆盖完整界面与桌面，不只顶栏 |
| Main/Section/Presentation | 单库、多引用序列、重复occurrence、备注/版本固定已有 | 视觉变体仍缺；Main Slides不是Slide Master |
| 对象动画和点击编排 | 六效果、三触发、逐步预演、现场回退已有 | 保持；复杂路径和受控音视频仍缺 |
| 演讲者视图 | 同窗备注/下一页、全屏/黑屏 | 独立双屏、计时、排练仍下一里程碑 |
| PPTX/PDF/PNG | 有限科学原生对象/复杂回退，静态基础画面 | 原生动画须单独Office放映验收；不扩视频路线 |
| 主题、母版、导入往返 | 页级主题/普通布局起点已有 | 母版、布局继承、完整PPTX往返未完成 |
| 评论、协作、无障碍 | 本机事务协作、Story、键盘已有 | 评论、云协作、完整读屏/替代文字检查未完成 |
| AI制作通道 | 17本机MCP工具、CLI、Story briefing、配置例子 | 缺可发现工作流、只读预览和真实客户端任务；本轮补 |

一手依据：[智能辅助线/间隔](https://support.microsoft.com/en-us/powerpoint/training/guides-for-arranging-things-on-a-slide)、[对齐选区/整页](https://support.microsoft.com/en-us/office/graphics-visuals/align-or-arrange-objects)、[Alt与网格](https://support.microsoft.com/en-us/powerpoint/work-with-gridlines-and-use-snap-to-grid-in-powerpoint)、[选择窗格](https://support.microsoft.com/en-us/powerpoint/use-the-selection-pane-to-manage-objects-in-documents)、[Presenter View](https://support.microsoft.com/en-us/powerpoint/training/start-the-presentation-and-see-your-notes-in-presenter-view)。早期科学对象对照见 POWERPOINT-COMPARISON，其中“本轮”不表示今天的基线。

## 3. 三项专项意见的负责人复审

### 语言与界面

接受[语言审计](notes/V09-I18N-AUDIT.md)：复用 typed catalog/format/useSyncExternalStore，接齐业务与桌面；桌面偏好不能仅放随机服务端口的localStorage。切换只更新界面，不remount、不改选区/脏草稿、不翻译文稿。新占位文字按创建时语言生成，之后视为用户内容。上游五语言API保持，HUANDENG只展示完整覆盖的两种。

不采用DOM文本替换/文稿全局替换；不引入重复i18next。英文看真实小窗口，不靠缩小字体掩盖拥挤。

### 排列与吸附

接受[排列审计](notes/V09-SNAPPING-AUDIT.md)并核对源码：Shift先锁轴而snapMove再次改两轴；组只排自身、不排成员；旋转使用原bounds；distributeRects未接PPTD。这些优先于重换手势库。

Moveable有MIT Snappable轮子，但现有pointer capture、组变换、取消与单事务提交已有积累；整体替换成本高。采用本仓几何，独立实现有限gap行为；Excalidraw/tldraw/PPTist仅研究公开行为，不复制其他许可代码。缩放吸附只承诺未旋转对象。冻结参考、根选区、屏幕阈值、Alt/Shift/Esc是接受条件。

### Plugin与后端

接受[Plugin审计](notes/V09-PLUGIN-AUDIT.md)：现有Story和单writer为共同核心，不新建叙事库/模型聊天窗。真实DSH已定位官方`@deepseek-ai/dsh`，不是旧CLI；用独立配置合成任务，不经Vault把测试伪装用户原话。

新增只读proposal preview，复用操作规划/校验，在持久化之前返回变化。apply可绑定完全相同transaction hash，原writer重查CAS；hash不代表人工批准，旧apply兼容。预览新页身份只作临时计算，最终ID取提交结果。先在Agent对话审阅，本轮不建GUI审批队列。Claude/Codex/DSH各有适配；ChatGPT复用已授权DC-WALT调用同一CLI，直接云端私有MCP接入单独说明。

## 4. 前后端与性能

前端优先硬编码文案、排列控制缺口和作者空间密度；本轮前两项直接修，保持单行顶栏并补英文弹性。后端优先可解释修改规划：同一operation校验返回source/metadata/引用影响，Agent不靠盲写确认。语言不进入文档协议，preview不绕过writer或修改恢复语义。

v0.8已纠正Network inspector对旧内存数据的影响，本轮不再把差值说成产品泄漏。数小时混合高清负载、增量回读、SSE背压仍待专项；没有新回归证据不重做25/50轮诊断，不加GC/清缓存/降原图。

## 5. 本轮顺序与停止标准

P0：完整中英；拖动轴锁/组合/旋转、对齐/分布；保存撤销可靠。
P1：Story Plugin可发现工作流、预览/精确应用、一个真实DSH客户端闭环。其他客户端分别报告配置/连接/任务验证层级。

验证采用新增纯规则测试、一次常规代码门槛、实际桌面新功能组合场景、真实客户端任务；仅为具体失败扩大范围。完成可用安装与里程碑文档后交付，未完成扩展继续保留。
