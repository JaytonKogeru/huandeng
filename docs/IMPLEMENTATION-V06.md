# HUANDENG v0.6 — 实现交接

日期：2026-11-08（Australia/Sydney）。对应 [综合审计](AUDIT-V06.md) 与 [SPEC](SPEC-V06.md)。本文记录已落源码的关键决定、兼容性与验收入口，不将写好测试等同于实际通过。最终候选、实测数字与交付结果由集中 Validation 记录确认。

## 1. 实现范围与共用约束

| 范围 | 主要实现 | 状态边界 |
| --- | --- | --- |
| 键盘与焦点 | 分区命令、画布对象 Tab、箭头移动、图层/缩略图导航、F6、帮助与放映控制 | 新候选真实 Electron 14/14 通过；尚非最终安装包验收 |
| 动画 | schema、轨道/关键帧/步骤、局部预览、放映、CAS 保存、撤销与引用完整性 | 已集成；独立 Electron 脚本待最终实际结果 |
| 项目与 Story | 同项目演讲概览、使用关系、精确 occurrence 导航、目标 briefing | 模型/协议通过；候选项目与素材专项 11/11 通过 |
| 素材 | 搜索/预览/usage、复用、缺图修复、单资源 revision | 真机已验证含图页面 URL 稳定、同路径换图更新及冲突重试 |
| 排版检查 | 本机字体与 fallback、继承样式、实际溢出、定位与结果过期 | 真机已验证 queryLocalFonts、继承字体回退和溢出检查过期 |
| Agent 通道 | MCP/CLI 新只读接口、Plugin launcher 与客户端配置 | 本地真实 stdio 链通过；未宣称私有网页连接或平台发布完成 |

文档服务仍是唯一 writer。GUI、CLI 和 MCP 共用修订检查、事务、保存队列、历史和命名版本；没有另建项目副本或第二套保存格式。项目编排 schema 保持兼容，动画以页面可选 `timeline` 扩展。

## 2. 键盘、焦点与编辑性能

[pptd-keyboard.ts](../packages/core/src/app/lib/pptd-keyboard.ts) 将画布、缩略图、图层、输入、普通控件、对话框和时间线分开解析。输入框保留本身的文字/方向键行为，IME composing 与 keyCode 229 不触发编辑命令；菜单和对话框也不落入全局编辑逻辑。

画布保持一个固定 `tabIndex={0}` 原生入口；对象选择与对象焦点不要求反复改动整页的 Tab 属性。进入画布后，Tab / Shift+Tab 循环顶层对象，组合按整体参与；Enter 编辑文本。Esc 清空选择后允许下一次 Tab 离开，F6 / Shift+F6 在实际可见工作区间切换。

箭头微移使用文档坐标，Shift 加大步长；选择、复制、删除、组合、页面操作由分区命令路由。缩略图使用 occurrence 作为焦点和导航身份；图层聚焦不误触画布微移。放映模式先处理演讲步骤，再处理换页，避免编辑快捷键穿透。

此前候选的动态 `tabIndex` 路径使真实 Delete 反馈出现约 44–46ms 的回退。改为固定画布入口后，Windows 20 轮实际编辑/保存复测通过，Delete 中位数恢复至约 25.4ms；新候选键盘 14 项实际复核也已通过。详细基线、持久化耗时、内存与原稿 hash 记录留给 Validation，不将一次 GC 结果当作无泄漏结论。

画布、对象、缩略图与图层补齐可见焦点反馈和明确 accessible name。帮助面板集中展示当前可用操作。界面调整围绕现有编辑区、项目区和时间线组织，没有为装饰动画引入全局逐帧状态。

## 3. 动画模型、预览与保存

[animation-model.ts](../packages/core/src/pptd/animation-model.ts) 提供 schema 校验、采样和组合变换；页面时间线使用稳定轨道、关键帧与目标 `elementId`。属性覆盖 x/y、旋转、水平/垂直缩放、不透明度，缓动为 linear / ease-in-out / hold，另有带名称的演讲步骤。

校验拒绝孤儿目标、非有限数值、重复对象/属性轨道、无效组合关系与非递增时间。时间为整数毫秒，最长 600000ms；未知旧 `animations` 原样保留，未知未来 timeline 不被当作空白覆盖。模型与使用限制见 [ANIMATION](ANIMATION.md)。

`page.timeline.set` 进入既有页面事务，使用 expected page revision 和 requestId。删除对象同时清理其轨道；撤销一并恢复。页面/对象复制重新映射目标和轨道身份，位置关键帧跟随复制偏移。带自身动画的组合取消组合前需要先处理该轨道，避免静默丢失运动。

[timeline-panel.tsx](../packages/core/src/app/components/pptd/timeline-panel.tsx) 管理轨道、关键帧拖动、数值输入、步骤与播放头。完成一次拖动提交一次事务；Esc 取消当前拖动。字段草稿、保存中与已提交修订分别跟踪，冲突保留草稿并提供复制出口，不用旧 revision 覆盖远端结果。

[authoring-workspace.tsx](../packages/core/src/app/components/pptd/authoring-workspace.tsx) 将预览状态限制在画布与时间线子树。播放时钟使用局部 `requestAnimationFrame`；逐帧采样只改变渲染，不写基础几何或保存历史，也不把时钟推到整个应用 route。

未保存时间线阻止普通切页、切换演讲及关闭面板。跨范围审阅发现只比较 pageId 会漏掉同页的 occurrence/version 变化，主集成已改为完整 `pageId + occurrenceId + versionId` 保持 dirty 草稿引用；同一身份的数据刷新仍可显示修订冲突。

[pptd-playback.ts](../packages/core/src/app/lib/pptd-playback.ts) 在每次 occurrence 或版本变化时重置播放。前进先到下一步骤，播放中再次前进到当前步骤终点，最终帧后再换页；后退按步骤反向移动。固定版本使用已归档时间线。

PNG/PDF/PPTX 当前输出基础版式，三个格式共用报告中的 `renderState: 'base'`；检测到时间线时均记录 `TIMELINE_STATIC_EXPORT`，明确动画留在 PPTD。原生 PowerPoint 动画、运动曲线路径、自动打关键帧、音视频轨和逐帧视频编码未计入本轮完成项。

## 4. Main、Presentation、重复页面与 Story

[project-insights.ts](../packages/core/src/pptd/project-insights.ts) 从 snapshot 和现有项目解析器生成概览、页面 usage 与 briefing。Main 页面仍只有一份，Section 和 Presentation 引用其身份；概览卡片直接进入同项目演讲，当前页 usage 展示实际出现位置、固定版本与问题。

相同目录页可以多次引用同一个 `pageId`；每次引用用 `occurrenceId` 区分，`position` 是可变顺序。短码优先显示，旧 S 标签仍可解析。“实际播放顺序”按钮现在传递完整 presentation/page/occurrence；“打开主页面”仍是明确的 Main 入口。未保存编排草稿不提供可能指向虚构 occurrence 的跳转。

引用备注独立于共享页面内容。不同章节高亮等视觉差异仍需明确的独立页面或固定版本，本轮没有引入任意单次视觉覆盖。usage 是即时派生结果，不增加会与项目编排漂移的索引文件。

`readStoryBriefing(snapshot, options, readVersion)` 先解析目标。演讲内同页重复而没有 occurrence 时返回 `AMBIGUOUS_ID` 与候选。固定版本只读取所选 pin，经共用校验确认版本身份、归档素材与画布尺寸；其他损坏引用不会阻断有效目标。

briefing 返回 Main/Section/Presentation/Page Story、备注、前后页、使用关系、素材和修订。归档页面意图与当前 Main revision 分开标明。`sequence.entries` 最多 500 项，显式返回 total/truncated；目标与相邻页仍精确，完整序列由 Presentation 接口提供。

## 5. 素材索引、复用与图片身份

[asset-library.ts](../packages/core/src/pptd/asset-library.ts) 提供只读 `readAssetLibrary(root, snapshot, options, limits)`；查询支持原文件名/路径/页面身份、used/unused/missing、当前页与分页，默认 100 项、最多 200 项。索引包括当前 Main 对象、页面、有效主题及 manifest 的资源引用。

扫描限制条目和深度、跳过符号链接、不读取项目外路径；缺失/非法引用仍可诊断，返回 truncated、统计与 warnings。`unused` 只表示当前 Main 未引用，不代表命名版本或历史不需要它。本轮没有全局素材删除/重命名操作。

native image 使用顶层 `src` / `sourceName`。每个 usage 带 page revision、具体元素和字段。复用直接插入已有路径与真实尺寸，不复制或重编码字节。缺图修复调用既有导入，再对所选对象 CAS patch 这两个字段，保留 bounds、crop、fit、旋转、透明度与其他内容。

每项素材的 `previewRevision` 优先取 snapshot 素材 revision；未引用文件使用 `stat:mtimeMs:size`，明确只是变化标记，不冒称内容 hash。UI 缩略图与详情 URL 仅随本素材标记变化，详情尺寸也绑定该 revision；文本保存和全局 snapshot sequence 不导致全部图片重新解码。

素材库仍随快照刷新 usage 和可用状态，但读取错误与操作错误分离。并发替换失败时保留 CAS 错误，不因索引刷新而消失；新读取提供最新 page revision，用户重试不会覆盖其他来源的修改。

画布 [revisionedAssetUrl](../packages/core/src/app/lib/pptd-asset-revision.ts) 同样使用已知单资源 revision；旧快照缺少该映射时才退回 renderRevision。科学图 SVG 缓存改为有条目/字符串字节上限的 LRU（默认 32 项、8MiB），避免无界保留历史渲染字符串。

## 6. 本机字体与排版检查

[pptd-render-check.ts](../packages/core/src/app/lib/pptd-render-check.ts) 从实际渲染 DOM 读取 computed font stack，覆盖主题继承；按钮手势内先请求 `queryLocalFonts`，再等待字体加载。Electron 权限限定在当前编辑服务主窗口/主 frame，不向任意外部来源开放。

已获得本机字体清单时才作可验证的 fallback 判断，另计已加载 web font 和可解析本地别名。权限拒绝或能力不支持时保留明确状态，不能用 `document.fonts.check` 的成功或伪造字体列表冒充本机字体存在。

文字实际范围与对象框尺寸比较，生成可定位的 `QA_TEXT_OVERFLOW`；字体回退生成 `QA_FONT_FALLBACK`。技术检查绑定实际页面对象，单纯选择不失效，内容变化后显示需重新检查；切页不套用上一页结果。测量不回写文档。

## 7. Agent 与 Plugin 通道

现有 HTTP 新增只读 `/story-briefing`、`/assets`，backend 提供同名语义方法。MCP 保留原工具与兼容别名，新增 `huandeng_story_briefing`、`huandeng_presentation_read`、`huandeng_assets_list`，server 版本 0.6.0，共 15 个工具；新增接口带只读注解。

CLI 增加 `brief`、`assets`，render 可指定 presentation/occurrence。写入继续走 `HuandengClient` 的项目发现、身份核对和同一 writer。Story 是来自既有模型的目标上下文，不另存一份 Agent 摘要作为事实源。

[Plugin](../plugins/huandeng/README.md) 提供 Claude Code manifest / `.mcp.json`、Codex stdio 配置示例与共用 launcher。要求绝对 `HUANDENG_ENTRY`，可配置 CLI/URL；路径作为独立进程参数，诊断走 stderr，stdio 留给协议。没有创建公网服务、凭据、私有 Tunnel、ChatGPT 账号连接或平台发布记录。

实际隔离集成已运行：含空格项目路径、真实 SDK StdioClientTransport、launcher、当前 CLI bundle 与静态文档服务。9 组通过，覆盖工具发现、共享 writer 事务、重复引用歧义、精确备注、演讲、素材用途、CLI 读取、原字节保持与干净 stderr。回执在 core 下 `.verification/project-agent-runtime/report.json`；该协议检查不代替最新 UI 预览验收。

## 8. 验证入口与当前证据

| 入口 | 证明内容 | 当前记录 |
| --- | --- | --- |
| 项目/素材/MCP/固定版本四组单测 | 单目标 pin、歧义、索引边界、资源 token、真实 SDK transport | 23/23 通过 |
| Core TypeScript 与 owned Biome | 类型及本分工代码/配置检查 | exit 0；18 个 owned 文件通过 |
| `verify-keyboard-v06.mjs` | 实际 Electron 焦点、编辑键、输入隔离、保存 | 新候选 14/14 通过 |
| `verify-animation-v06.mjs` | 实际关键帧、预览、播放、保存与草稿 | 脚本已交接，实际结果待记录 |
| `verify-project-assets-v06.mjs` | 下述 11 组项目、素材与技术检查 | Windows 候选 11/11 通过，rendererErrors 为空，正常退出 |
| 大项目真实性能复测 | 操作反馈、保存、内存、原输入 hash | 固定焦点后 20 轮通过；详细数字集中记录 |

项目/素材脚本创建独立 fixture、profile、runtime，需要 `HUANDENG_DESKTOP_EXE`，可选 `HUANDENG_DESKTOP_APP`、`HUANDENG_CLI`。只操作合成项目与专属进程，写入根 `.verification/project-assets-v06.json`、三个截图和进程日志。

其 11 组包括：同项目卡片；精确重复 occurrence/独立讲稿；原名搜索/usage；复用无新字节；含至少 3 张已解码图片的同页文字保存后 URL 全等；同路径真实字节改变后相关画布/库预览更新且控制图片不变；缺图修复保留对象；选择文件期间外部写入导致 409，保留错误并正确重试；CLI 只读；继承字体回退；溢出定位及检查过期。

该专项真机回执时间为 `2026-11-07T16:35:38.145Z`，11/11 通过，`rendererErrors: []`，`normalExit: {code: 0, signal: null}`。实际包含至少 3 张已解码图片，并完成真实换图、409 后保留错误及正确重试、queryLocalFonts 和 DOM 排版检查。该结果对应当前 Windows 候选，尚不代表最终安装包验收。

此前大项目首张页无图片，空数组 URL 比较不能证明画布图片复用；本次专项已补齐正向数量、实际解码与真实换图证据。模型单测、协议链路、候选 Electron 和最终打包结果分别记账；发布前仍需完成剩余动画验证及安装检查。

## 9. 保留的后续范围

单次引用视觉覆盖、全局资源迁移、便捷 MCP 素材导入、实际客户端安装与私有 ChatGPT 连接，以及动画高级轨道/视频输出仍是后续独立工作。本轮完成项按模型、协议及实际 UI 证据分别确认；候选验证通过不自动等同于最终打包与安装完成。
