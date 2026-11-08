# HUANDENG v0.9 交接

日期：2026-11-08。依据 [AUDIT-V09](AUDIT-V09.md)、[SPEC-V09](SPEC-V09.md) 与 [IMPLEMENTATION-V09](IMPLEMENTATION-V09.md)。本轮补齐中英文编辑、智能排列和 Story Plugin；现场点击动画继续沿用 v0.8 的产品方向。后续仍按 Audit → Spec → Implementation → Validation 推进，主要精力放在功能与实际工作流，验证按变更风险安排。

## 1. 来源和交付状态

工作树为 `D:/_Proj/Huandeng-v09-20261108`，canonical 为 `D:/_Proj/Huandeng`。Windows 工作树是本轮提交与打包来源；此前 Linux 副本只用于开发与传输，不推其快照历史。编辑器版本 0.9.0 与上游 core 的 npm 包版本是两套标识。

最终干净运行时为 `17de86d0b49f23c3c7aafe901f3de748d3bcc7e3`，Electron 38.7.2，sourceDirty=false，构建时间 `2026-11-08T02:35:06.3605865Z`。最终包 UI/Agent/现场放映 **6/6**、排列 **6/6** 通过；两套报告均无 renderer 错误，各有两次 code 0 / signal null 正常退出。负责人已复审英文与 Agent 截图。

最终包原始回执位于工作树的 `.verification/editor-v09/huandeng-editor-v09-i03OYb/acceptance.json` 与 `.verification/arrangement-v09/huandeng-arrangement-v09-Lod1dl/result.json`。此前 `fd30e4fd` / `JtTkQK` 为前轮候选证据，不能与最终包身份混写。

**实际安装已完成。** 29,201 文件 / 684,294,324 bytes 与验收包一致；正式位置仍是 `D:/_Proj/Huandeng/dist/HUANDENG-win32-x64`，两处快捷方式已核对，旧 v0.8 包保存在 canonical `.verification/installed-v08-backup-20261108-v09`。普通 profile 已重开 80 页项目，生产静态前端、可写、0 诊断、响应窗口与新服务父子关系通过，窗口保持打开。

首次安装因旧窗口已有未保存项目编排而停在替换前。负责人备份原元数据与草稿画面，经正常“保存项目”保留原有编排；仅项目元数据更新，manifest/全部80页保持字节不变。随后以当前82文件为基线安装/重开，全部一致。成功回执 `.verification/install-v09-20261108T024834Z.json`，失败与保存备份保留。详见 [VALIDATION-V09](VALIDATION-V09.md)。

私有 origin 为 `JaytonKogeru/huandeng`，里程碑分支 `editor/v0.9-daily-editor-plugin` 与 annotated tag `editor-v0.9.0`。安装不代替远端证明；推送后独立核对 main/分支/tag，回执为 `.verification/v09-remote-delivery.json`。默认 gh repo 可选到 upstream，须显式指定私有仓库。

## 2. 已完成的工作与不能破坏的约束

### 中英文编辑器

HUANDENG 提供 `en` / `zh-CN`，覆盖业务面板、属性、Story、素材、项目、历史、动画、预演、放映、导出、帮助及桌面菜单/欢迎页。复用现有语言格式化与 React store，不新增网络语言包。桌面 `preferences.uiLocale` 为权威来源，保存成功后广播；随机文档服务端口变化不会丢失语言。浏览器模式单独保存偏好。

切换界面语言不更换组件身份、不提交文稿事务、不清空脏输入/选区/Undo。已有标题、正文、Story、路径、备注、作者命名步骤及诊断 code 保持原值；占位内容只在创建时按当前语言生成。新增界面消息须同时补中英文和 aria，未知外部错误保留原细节，不用全局文字替换翻译用户内容。

英文侧栏导航已改为等宽标签；连接 Agent 弹窗已针对小窗口调整宽高边界。后续仍需以真实英文短窗口检查完整任务，不能靠缩小字号补偿空间不足。

### 智能辅助线与排列

复用已有 pointer capture、组变换、草稿和 writer，没有添加手势框架依赖。手势开始冻结参考框，按根选区移动，排除选中对象的全部后代和相关祖先；旋转对象使用可见 AABB 计算位移，保留真实 bounds 尺寸和角度。

吸附阈值为 **5 个屏幕像素**。Shift 在鼠标按下前已按住时仍能拖动，锁定轴不会再被吸附修改；Shift 无移动单击保留取消选中的行为。Alt 临时绕过全部吸附。边/中心之外支持两对象之间等空隙及延续已有间隔，数字和端点保持屏幕尺寸。每轴最多 100,000 次间距候选/遮挡检查，达到预算后仍保留完整边/中心参考。

未旋转 resize 吸附活动边或角，保持固定对边、最小尺寸 8 和比例约束；旋转 resize 维持旧行为。属性面板提供选区/幻灯片参照、六向对齐和横纵均匀分布，分布要求至少三个根对象，并保持两端对象、均匀分配空隙。统一应用全部几何变化后才结束 interaction；一次手势/排列对应一次事务和 Undo，Esc 恢复全部原草稿。开关是应用偏好，不进入 PPTD。

聚焦纯规则组已有 57 个测试。打包版实际验收覆盖 Shift、组、文本等距、Alt/开关、Esc、图片 100%/50% 阈值、分布/Undo/Redo/重开。首轮 `uHaHs7` 的失败是脚本用窄窗口求 50% 时实际只到 52.5%；修复脚本后由真实 Zoom out 连点五次达到 50%，未放宽吸附目标或容差。保留失败归档，不把脚本修复描述成产品吸附缺陷修复。

### Story Plugin 与共享 writer

新增 `huandeng_preview`、CLI `preview` 和 proposal HTTP 路由。预览与提交共用准备/校验实现，在文件持久化、外部版本观察、history/receipt/checkpoint 和提交事件之前返回具体差异。它不消费 operationId；新页身份为临时值，后续操作须使用 apply 返回的最终 ID。

`previewHash` 绑定完整 transaction，不能替代授权；apply 仍走原 CAS、幂等 requestId、恢复和 Undo。payload 改动或期间发生编辑必须重新形成预览。保留旧 hashless CLI/MCP apply 兼容。差异数量和长字段有明确截断；结构预览不等于渲染前后对比。

MCP 现提供 18 个工具与两个只读 guide resources。共用 `huandeng-story` skill 贯通受众/问题/证据、保留约束、页面与点击讲解计划、预览、按授权应用和读取/渲染检查，继续使用 Main/Section/Presentation/Page 四层 Story。不要另建叙事库、模型执行器或编辑器聊天窗。

Plugin 随桌面包携带；项目面板与原生菜单的“连接 Agent”生成当前项目配置，使用安装包自身 Electron Node 模式，不要求另装 Node。它不覆盖客户端设置，也不把“已生成配置”显示成“已连接”。

客户端验证层级要分别表述：

| 客户端 | 本轮已有证据 | 后续边界 |
| --- | --- | --- |
| 官方 DeepSeek Harness | 原生 headless 客户端完成合成 Story 任务；读 guides/上下文、preview、同 hash apply、回读/render，独立保存重开核验 | 渲染图片已交付客户端；模型的视觉质量判断不能代替人的截图/播放检查 |
| Codex | 原生 CLI 解析临时 stdio 配置并核对参数 | 尚未完成同等实际模型任务；没有写入用户配置 |
| Claude Code | 原生 `plugin validate` 通过 | 尚未完成同等实际模型任务；没有市场发布 |
| ChatGPT | 继续通过已授权 DC-WALT 工作站通道调用相同 CLI | 未新增账号级连接器或私有 MCP 隧道 |

实际 DeepSeek 命令是 `dsh --profile headless --patch <path> --json -`，不是把 profile 写成位置参数。使用官方 Cordis patch 格式；不同客户端配置不能互换。专项证据与限制见 [Plugin implementation](notes/V09-PLUGIN-IMPLEMENTATION.md) 和 `docs/evidence/v09/plugin-acceptance.json`。

## 3. 关键实现入口

下表路径相对仓库根目录。

| 范围 | 入口 |
| --- | --- |
| 主工作区与集成 | `packages/core/src/app/routes/huandeng.tsx`；`app/components/pptd/inspector.tsx` |
| 语言与偏好 | `packages/core/src/app/lib/huandeng-locale.ts`、`pptd-preferences.ts`；`packages/core/src/locale/huandeng*-messages.ts` |
| 几何与手势 | `packages/core/src/app/lib/inspector/geometry.ts`、`app/lib/pptd-geometry.ts`；`app/components/pptd/editor-canvas.tsx`、`arrangement-controls.tsx`、`snapping-toggle.tsx` |
| 预览与协议 | `packages/core/src/pptd/proposal.ts`、`store.ts`、`agent-guide.ts`、`mcp.ts`；`packages/core/src/vite/routes/pptd.ts` |
| 桌面入口 | `packages/desktop/main.cjs`、`preload.cjs`、`locale.cjs`、`agent-setup.cjs`、`welcome.js` |
| Plugin | `plugins/huandeng/skills/huandeng-story/SKILL.md`、`scripts/configure.mjs`、`doctor.mjs`、`runtime.mjs` 与各客户端 manifests |
| 本轮实际桌面脚本 | `scripts/verify-editor-v09.mjs`、`verify-arrangement-v09.mjs` |
| 打包和安装 | `scripts/Package-Huandeng.ps1`、`Install-Huandeng.ps1`；运行前从最终 Validation 读取来源、目标与原件基线 |

表中 `app/...` 简写均位于 `packages/core/src/` 下；Plugin 的脚本简写位于 `plugins/huandeng/scripts/` 下。新消息沿用现有 catalog/API，几何沿用统一 PPTD 适配，不在路由重写一套规则。

## 4. 可复现开发命令

在 Windows 工作树、已有开发依赖的 PowerShell 中执行。以下是后续按风险选用的命令，不要求每个小改动重跑全部组合。

```powershell
Set-Location 'D:/_Proj/Huandeng-v09-20261108'
& .\node_modules\.bin\vitest.cmd run --project unit packages/core/src/app/lib/inspector/geometry.test.ts packages/core/src/app/lib/pptd-geometry.test.ts
node --test plugins/huandeng/scripts/configure.test.mjs
corepack pnpm --filter @open-slide/core typecheck
corepack pnpm check
corepack pnpm --filter @open-slide/core build
```

正式候选的聚焦桌面检查使用独立 profile/runtime 和全部合成文稿：

```powershell
$env:HUANDENG_DESKTOP_EXE = 'D:/_Proj/Huandeng-v09-20261108/dist/HUANDENG-win32-x64/HUANDENG Editor.exe'
node scripts/verify-editor-v09.mjs
node scripts/verify-arrangement-v09.mjs
```

开发包另支持 `HUANDENG_DESKTOP_APP`；检查正式安装包时不要残留该变量。排列脚本每次保留独立 `.verification/arrangement-v09/<run>/result.json` 与截图，通过真实 UI 操作，再对照服务与磁盘。50% 场景在 100% 大窗口通过真实缩小按钮设置，避免响应式侧栏影响拟合比例。测试保持正常退出，不能碰普通用户窗口。

Plugin 的指南、配置和连接诊断入口：

```powershell
node packages/core/huandeng.js guide story
node packages/core/huandeng.js guide operations
node plugins/huandeng/scripts/configure.mjs --client deepseek --entry 'D:/Path/To/CopiedProject/deck.pptd'
node plugins/huandeng/scripts/doctor.mjs --entry 'D:/Path/To/CopiedProject/deck.pptd'
```

将示例路径替换为已打开的测试副本；隔离服务有独立 runtime 目录时显式加 `--runtime-dir`。Doctor 验证协议、工具和项目身份，不代表客户端模型完成了任务。真实任务使用复制的 `plugins/huandeng/examples/`、独立 DSH_HOME 与明确配置 overlay；认证留在工作站，禁止把值写入证据。

开发依赖保留既有 isolated 布局，独立打包使用 hoisted；不要为双 React 实例的环境问题改业务逻辑或跳过测试。core API 修改遵守 changeset 规则，不执行 npm 发布。

## 5. 下一轮产品顺序

| 顺序 | 目标 | 应先写清的行为与适量验收 |
| --- | --- | --- |
| 1 | 创作空间与日常对象操作 | 可调工作区、单一情境属性面板，减少属性与动画同时展开的拥挤；补图层锁定/隐藏、逐层排序、交互裁剪、必要段落排版。明确编辑隐藏与放映隐藏的语义，锁定须贯穿选择/鼠标/键盘/Agent；裁剪保留原素材，Esc/Undo 一致。中英文小窗口完成一页真实科研图文排版作为验收 |
| 2 | 独立演讲者工作区 | 观众/演讲者窗口共享一个播放状态，备注、下一页/下一步骤、计时和彩排可用；覆盖单屏退路、失焦、关窗/断屏、快速前后退和重复 occurrence，避免演讲者备注出现在观众屏 |
| 3 | 受控媒体与步骤编排 | 音频/视频作为演讲元素，由 click/with/after 与播放状态控制；明确暂停、黑屏、后退、重入、缺资源和资源释放。继续围绕现场讲解，不沿通用视频剪辑路线扩展 |
| 4 | 演讲实例视觉变体 | 保持 pageId 与 occurrenceId 各自稳定，明确跟随 Main、局部视觉变体与命名版本固定的差别；先设计来源变更传播、恢复、素材复用、Story 和版本行为，再实施数据模型 |
| 5 | 原生 PPTX 动画子集 | 审计 OOXML 与现有库后选少量效果/触发映射，导出说明准确列出回退；必须在真实 PowerPoint 放映中检查点击顺序、进入/退出和移动，静态图或 MP4 不能替代这项验收 |

交付时在旧 v0.8 窗口保存既有项目编排后，观察到当前页从序列中部回到首页；尚未在 v0.9 单独复现。下一轮应先复核，并把保存编排后保留当前页身份纳入交互条件。

必要排版优先于继续堆积额外面板。Main Slides 不是 PowerPoint Slide Master；occurrence 的局部备注/版本 pin 已有，任意视觉 override 尚未完成。标尺/手工参考线、评论、科学组件注册、高级统计图、母版/继承、完整 PPTX 导入往返、批量编排和文件默认关联继续留在 backlog，不因本轮完成而消失。

长会话和高清混合素材可并行专项处理，但沿用 v0.8 对 Network 检查器响应保留的纠正：旧约 398 MiB 观察不能直接当产品泄漏。自然空闲与 GC 诊断分开报告；先定位真实保留路径，再设计增量回读或 SSE 背压，不以定时 GC、清缓存、减少原图或削弱 CAS/fsync/恢复来“优化”。本轮没有新增长时间内存结论。

## 6. 文稿、版本与发布纪律

PPTD、独立 .page、原素材和稳定页面身份继续为权威；GUI/CLI/MCP 共享 writer、CAS、requestId 与恢复。保留未知字段，不在保存时重排作者版式或切成另一套 TSX 来源。v0.8 的 BuildTimeline 只保存 effects 并纯编译为播放轨道；不要双存可编辑时间线。PNG/PDF/PPTX 仍是基础静态画面并带诊断，MP4 是保留的兼容能力。

科研原件不用于测试写入。用户授权的实际 PPTX、PPTD 可在明确副本上做下一轮任务验证。canonical 内已有作者修改，尤其 `tests/fixtures/studio/pages/identities.page`，不得 broad stage/reset/clean 或覆盖。安装时从本轮负责人锁定的源文件基线核对前后哈希，保留旧包与失败回执；不得用较早代基线替代或改写旧记录。

自动保存/Undo、命名页面版本、编辑器 Git 提交是三种不同历史。日常开发和记录留在本地；完成重要版本、Release/Handoff 和聚焦验收后，才对私有 origin 做一次里程碑同步并独立验证远端提交/tag。不得推 upstream、执行继承的 npm 发布、改变仓库可见性、公开本机服务或擅自发 Issue 评论/消息。构建通过、安装成功、远端已同步分别取证，不能互相代替。
