# HUANDENG v0.6 — 交接与下一阶段

日期：2026-11-08（Australia/Sydney）。本轮目标与依据见 [综合审计](AUDIT-V06.md)、[SPEC](SPEC-V06.md)、[实现](IMPLEMENTATION-V06.md) 和 [验证报告](VALIDATION-V06.md)。

## 当前来源

实际 Windows 仓库为 `D:\_Proj\Huandeng`，本轮隔离开发位置为 `D:\_Proj\Huandeng-v06-20261108`，分支 `editor/v0.6-authoring-motion`。运行时源码提交为 `9c27465aa88b5b2b59288f5b321596ad10fcb92c`，产品版本 `0.6.0`，构建时间 `2026-11-07T16:47:49.8347220Z`，`sourceDirty=false`。

独立包已通过自包含/搬迁、六套实际 EXE 验收共 61 项、80 页副本 20 轮性能及正式安装验收。安装位置为 `D:\\_Proj\\Huandeng\\dist\\HUANDENG-win32-x64`，旧 v0.5 保留于 `.verification/installed-v05-backup-20261108-v06`。旧窗口正常退出，没有强制关闭。桌面与开始菜单快捷方式、工作目录、图标和 About 版本均核对通过。

普通用户 profile 已重新打开原 80 页项目，窗口可响应，项目可写、无诊断，82 份文档源文件 hash 与测试前相同；窗口留给用户继续使用。Linux 的 `2cec4bfc` 只用于核对与传输差异，不能推送其历史。后续文档提交晚于运行时提交，构建 marker 才是已安装程序的来源。实际结果见 [发布记录](RELEASE-V06.md)、[验证报告](VALIDATION-V06.md) 和 [安全证据](evidence/ui-v06/README.md)。

## 本轮产品决定

1. **一个项目，一份主页面库。** Main、Sections 和衍生 Presentations 保存在同一项目。概览与使用位置直接互通，不要求复制两套 PPTD。
2. **内容、出现和顺序分开。** `pageId`/短码代表页面内容；`occurrenceId` 代表某次引用；position 是当前序位。同一目录页可多次 live 引用。显式单页引用支持独立讲稿和固定版本；整章动态引用需先拆为独立页面引用再逐页设置。不同高亮或内容应使用明确页面变体，暂不增加隐式视觉覆盖。
3. **自由编辑优先。** 固定键盘入口、区域范围、原生输入保护和准确反馈构成工作台。默认保持中性界面与原作品排版，快速布局仍是可选起点。
4. **动画属于 PPTD 文档。** 版本化 timeline 由同一 writer 保存，关键帧、cue、Undo/Redo、命名版本和原请求恢复共用已有机制。播放只采样，基础版式不逐帧改写。
5. **素材按资源变化。** 图片自身 revision 决定 URL；文字保存不重新标记所有图片。库预览、使用关系、复用和缺图修复由编辑器管理，原素材与命名版本资源保留。
6. **Agent 先读叙事上下文。** 先调用 selection read，再按页面与 occurrence 读取含 Main/Section/Presentation/Page、邻页、引用和版本的 briefing。CLI/MCP 使用同一服务；本机 launcher 已验证，具体 Codex/Claude 客户端安装与私有 ChatGPT 连接分别验收。

## 必须保留的实现约束

- `page.timeline.set` 使用 page revision、journal 和幂等 requestId；未知 timeline schema 原样保留。复制 remap 目标，删除清理轨道，撤销完整恢复。
- 动画草稿按完整 page/occurrence/version 身份保留。未确认输入、外部新版本、未来 schema 或源页被删除均不能静默清除草稿。
- timeline 回执恢复只确认同一请求。只有草稿与已持久化 timeline 深度一致且没有字段/拖动未确认，才清除 dirty。
- 画布根保持固定 `tabIndex=0`，对象通过程序焦点循环。动态修改已聚焦容器的 tabindex 曾产生单次 44–46 ms 开销，不重新引入。
- 快速翻页按同步 URL 中的最新请求身份计算。BrowserRouter 的渲染 transition 可能落后于焦点与 URL，不在验收中插入延时掩盖。
- 手势 Esc 优先取消移动/缩放/旋转；输入法、输入控件、弹窗和时间线有各自语义。
- 保存状态使用真实 pageReadonly，不能把动画预览时暂停基础编辑显示成文档只读。
- 素材替换使用读取时的 page revision，冲突保留并重新读取。字体检查依据真实枚举/加载状态，无法核实就明确报告；不自动缩字或重排。
- 继续保留 v0.5 的 Windows 原子替换有界重试、原 journal/receipt 恢复、后续草稿重放、第三态拒绝与外部变更导致 Git checkpoint defer。

## 现有边界

本轮已具备可编辑多轨关键帧和 cue 放映；高级曲线编辑器、运动路径、关键帧多选、自动打关键帧、音视频同步和视频编码尚未实现。PNG/PDF/PPTX 输出基础版式，报告包含 `renderState: 'base'` 和时间线静态导出说明；不把它称为原生 PowerPoint 动画导出。

字体检查覆盖字体族可用性与有效回退，文本/公式检查覆盖可测局部布局。它不是逐字形覆盖率、字体版本一致性或 Office 最终排版认证。m6A 的真实 PowerPoint 查看用于研究及兼容参考，不代表支持 PPTX 完整导入。

工作集仍随连续操作增长；显式 GC 后 JS heap 回落不证明长会话无泄漏。没有完成公网/跨机共同编辑、任意 React 科学组件注册、PPTD 评论系统、独立双屏排练或完整 PPTX 往返。详见历史 [覆盖审计](AUDIT-V05-COVERAGE.md)。

## 下一阶段排序

| 优先级 | 工作 | 验收标准 |
| --- | --- | --- |
| P0 | 长会话与大量高清素材的性能 | 相同材料连续编辑、切页、动画播放；区分 JS heap、DOM、图像解码/GPU、service；定位持有链后再优化，并保留原稿摘要与保存恢复回归 |
| P1 | 动态讲述的高频创作操作 | 关键帧多选/复制/对齐、清楚的时间单位与对象标签、运动路径及曲线编辑；一次手势一次事务，seek/重开/Undo 一致 |
| P1 | 动态交付和媒体时钟 | 先建立指定时间帧渲染与确定性图像序列；再验证视频编码与 GIF/音视频同步。原生 PPTX 动画应作为独立兼容项目 |
| P1 | 大项目编排与重复页面变体 | 演讲搜索、批量编排、清楚的 live/pinned 影响范围；有真实目录高亮需求时设计显式 occurrence 参数或派生变体，避免全量复制和暗中覆盖 |
| P1 | 用户实际 Agent 客户端接入 | 在具体 Codex/Claude 客户端安装与完成真实任务；ChatGPT 私有连接明确项目授权、鉴权、撤销和会话生命周期，不暴露通用本地文件写入 |
| P2 | 科研交付细节和工作台可读性 | 更丰富字体环境证据、精确公式/表格边界、高 DPI 与工作台字号/密度偏好；只在实际场景需要时补图表设置 |

下一阶段继续按 Audit → Spec → Implementation → Validation。优先处理可测的操作阻碍和数据边界；评论、PPTX 导入、云协作等各自成项，不用扩功能清单替代稳定交付。

## 开发与数据保护

科研原稿不作测试目标。m6A / DNA TTT 只读或在隔离副本验证；原 80 页项目与用户普通窗口独立于测试 profile。`tests/fixtures/studio/pages/identities.page` 是既有未提交用户修改，完整保留，未纳入本轮提交。不要 reset、清理或整体暂存原工作区。

日常改动和记录留在本地，重要里程碑验收后再统一推送 private origin。不要推 OpenSlide upstream、执行 npm 发布、公开本地服务或更改仓库可见性。发行标识为 `editor-v0.6.0`，实际远端 refs 以最终发布核对为准。
