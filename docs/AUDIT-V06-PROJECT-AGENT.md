# HUANDENG v0.6 — 项目复用、素材与 Agent 通道审计

审计日期：2026-11-08（Australia/Sydney）。代码与文档基线为已交付的 `editor-v0.5.0` / `ef80f5b`；程序运行时来源为 `03a96957`。本文综合最初 SPEC 与 v0.2–v0.5 中仍有效的产品决定，以及本轮用户提出的重复目录页、衍生演讲、素材库和 Plugin 场景。下文将现状、缺口和建议实现分开；实现与实际验收另由 v0.6 记录确认。

本轮源码与接口的完成状态、协议实测和候选 UI 验收见 [实现交接](IMPLEMENTATION-V06.md)。本文主体保留开发前基线判断，避免将后续实现倒写成原有能力；第 9 节追加本轮实际验证结果。

## 1. 结论与开发优先级

**Main Slides 与 Presentation Slides 已经共用同一份项目和规范页面。下一步应把这种关系直接呈现在编辑器中，并让每次引用、素材用途和 Story 上下文能被人和 Agent 准确定位。** 现有模型能够支持同一目录页在多个位置重复出现，无需另建一套 PPTD 保存格式。

| 优先级 | 发现 | 建议落实 |
| --- | --- | --- |
| P0 | 编排面板“实际播放顺序”的按钮只传 `pageId`，父组件调用 `selectMainPage`，会退出演讲；同页的第几次出现丢失 | 精确传递 `presentationId`、`pageId`、`occurrenceId`；与“打开主页面”区分 |
| P1 | Main 中只有集合下拉，缺少衍生演讲概览、页数、Story 摘要、缺失引用和当前页使用关系 | 项目概览与“本页用于哪些演讲”；直接进入相应出现位置 |
| P1 | 素材已导入和归档，但操作入口基本是文件树、路径输入、导入对话框 | 可搜索、预览、复用和定位引用的素材库；缺失素材可从使用位置修复 |
| P1 | Story 数据分散在项目、章节、演讲和页面；MCP 可读原始数据，但缺少面向当前任务的组合上下文 | 只读 Story briefing：来源层级、当前引用、前后页、保留约束和素材用途 |
| P1 | 本机 MCP 能运行，但 Plugin 目录主要是 README 与固定路径配置示例 | 同一工具契约、不同客户端配置；补安装诊断与端到端验收；私有网页通道单独验证 |
| P2 | 相同目录页每次高亮不同章节，需要不同视觉内容 | 本轮明确“共享原页／固定版本／独立副本”的选择；单次视觉覆盖作为后续模型扩展 |

来源：[项目指南](PROJECTS.md)、[Story 指南](STORY.md)、[v0.4 SPEC](SPEC-V04.md)、[v0.5 综合审计](AUDIT-V05-COVERAGE.md)，以及下文各项对应源码。

## 2. Main、Section 与 Presentation 的实际模型

### 2.1 已完成的关系

一个项目的 `deck.pptd` 与独立 `.page` 文件构成唯一 Main Slides。`.huandeng/project.json` 的 `project` 字段保存 Main Story、平级 Sections 和多个 Presentations。Presentation 的 `items` 引用章节或 `pageId`，自身不保存第二份页面正文。

Section 保存自己的有序 `pageIds`；每页最多属于一个 Section，也可不归类。Section 页序与 Main manifest 页序彼此独立。Presentation 可以多次引用同一 Section 或同一页；章节引用动态展开，转换为单页引用后固定组成。单页引用可指定命名版本与独立演讲备注。

这些能力在 [project-model.ts](../packages/core/src/pptd/project-model.ts)、[presentation-snapshot.ts](../packages/core/src/pptd/presentation-snapshot.ts) 中实现；已有[模型测试](../packages/core/src/pptd/project-model.test.ts)、[版本解析测试](../packages/core/src/pptd/presentation-snapshot.test.ts)及 [11 项实际项目回归](evidence/ui-v05/project-phase2-acceptance.json)。该回归保持其 v0.5 第二轮候选来源，不代表本轮重新执行。

### 2.2 用户现在不容易看到的部分

顶部“当前演讲集合”已经可以在 Main 和演讲间切换。左栏“项目与故事”也提供创建、编排和保存。缺少的是项目关系的总览：打开 Main 后，看不到所有衍生演讲的用途、页数、当前状态，也不知道正在修改的一页会影响哪些演讲。

更具体的交互问题位于 [project-panel.tsx](../packages/core/src/app/components/pptd/project-panel.tsx)：实际播放顺序已按 `occurrenceId` 作 React key，却在点击时仅调用 `onSelectPage(pageId)`；[huandeng.tsx](../packages/core/src/app/routes/huandeng.tsx) 将该回调接到 `selectMainPage`。这条路径跳回 Main，不能打开所点的固定版本或第二次出现。缩略图自身已有 occurrence 导航，因此应复用现有路由能力。

### 2.3 建议的浏览方式

项目概览显示唯一 Main、章节和衍生演讲。演讲项展示名称、展开页数、目的或听众摘要、固定版本数及引用问题。点击直接切换当前集合；无须打开另一份文件。

当前页显示“在这些演讲中使用”，逐项包含演讲名、实际位置、跟随主页面或固定版本，以及进入该次引用的按钮。动态章节中的使用也必须计入。使用关系由当前 `project` 解析产生，随章节变动更新，不维护另一份索引源。

演讲中的 live 页仍修改共享 Main 内容，界面应明确提示其复用关系。固定版本保持只读，提供返回当前主页面的动作。项目编排草稿继续显式保存，并保留现有冲突保护和播放/导出前检查。

## 3. 同一目录页出现多次：身份与内容

### 3.1 三种概念应明确分开

| 概念 | 作用 | 重排后的行为 |
| --- | --- | --- |
| `pageId` / Slide ID | 规范页面的永久身份；四位随机短码是便于交流的别名 | 不变 |
| `occurrenceId` | 这份演讲中某一次引用的身份 | 同一引用移动位置时不变 |
| position / 当前页序 | 对展开后的当前集合从 1 开始计数 | 随插入、删除、章节变化或重排重新计算 |

例如同一短码 `K7M2` 的目录页出现在某演讲第 3、16、32、56 页，四次都使用同一 `pageId`，但四个引用有不同 `occurrenceId`。位置不应成为另一个永久身份，也不能用位置作为修改页面的目标。用户举的 `S18A` 是场景示例；当前系统生成四位随机短码，兼容既有 `S1` 等历史别名，细节见 [identity.ts](../packages/core/src/pptd/identity.ts)。

当前解析器以 Presentation ID、条目 ID 和 Page ID 组成 occurrence；单页条目的独立 ID 保证同页多次引用可区分。演讲快照、预览、导出和人类选择数据已经携带 occurrence 与固定版本。新的 UI 与 Agent 上下文应保留这些信息，遇到同一演讲中的多次出现时不能悄悄选择第一处。

### 3.2 何时复用同一页

| 需求 | 合适的表达 | 当前支持 |
| --- | --- | --- |
| 完全相同的目录内容反复提醒听众 | 同一 live 页的多个引用 | 已支持 |
| 同一画面，每次讲述不同内容 | 同一页的多个引用，分别填写演讲备注 | 已支持单页条目；章节引用可先拆为单页 |
| 不同位置使用已确认的不同版本 | 各引用固定不同命名版本 | 已支持，固定页只读且素材归档 |
| 每次目录高亮不同章节，并需独立编辑 | 当前用独立副本，或明确选择不同命名版本 | 复制会产生新 pageId；没有单次视觉覆盖层 |

因此，保留同一 Slide ID 重复引用是合适的。需要额外设计的是“相同基础画面、不同出现状态”。直接编辑共享页面的高亮会影响所有 live 引用；把这类状态默默混进页面正文会破坏复用语义。

后续若增加 occurrence 局部视觉状态，应限定为明确的覆盖范围，并保证预览、动画、导出和 Agent 读取使用同一解析结果。它不宜在没有版本与导出规则时扩展成任意字段覆盖。现有命名版本可用于冻结交付，独立副本可用于持续分化。

## 4. 素材库实际完成度

### 4.1 已管理的部分

| 能力 | 实际实现 |
| --- | --- |
| 文件、拖入与剪贴板图片导入 | [asset-import.ts](../packages/core/src/pptd/asset-import.ts) 校验图片，保留输入字节，以内容散列存入 `media/imported/`，相同内容复用路径 |
| 页面图片引用 | 页面保存相对 `src`；导入对象保留 `sourceName`，调整显示尺寸而不改原图 |
| 原素材目录 | [project-tree.ts](../packages/core/src/pptd/project-tree.ts) 将 `media/`、`assets/` 标为素材；[文件树 UI](../packages/core/src/app/components/pptd/project-tree.tsx) 可定位到文件管理器 |
| 外部素材变更 | [store.ts](../packages/core/src/pptd/store.ts) 维护页面资源指纹，素材更新参与 `renderRevision` |
| 缺图检查 | [technical-diagnostics.ts](../packages/core/src/pptd/technical-diagnostics.ts) 定位缺失的对象、页面或主题素材 |
| 命名版本素材 | [page-checkpoints.ts](../packages/core/src/pptd/page-checkpoints.ts) 将版本所需资源归档在项目内；固定版本与搬迁有既有回归 |
| 资源读取 | [runtime-export.ts](../packages/core/src/pptd/runtime-export.ts) 提供项目内资源读取，编辑器与导出复用原素材 |

### 4.2 尚未形成的用户工作流

当前没有图片网格与可检索资源目录，没有从素材找到所有使用页面的入口，也没有从某张已有素材直接再插入一页的完整入口。属性面板可手工改图片路径，技术检查能指出缺失，却没有“选素材—检查替换范围—修复引用”的连续流程。

文件树读取最多 3,000 条、递归最多 6 层，并返回 `truncated`。现有 UI 没有显示截断状态，大素材目录会让用户误以为所有文件都已列出。它还展示版本归档等工程文件，不应直接充当作者日常使用的图片库。

### 4.3 建议本轮素材库范围

建立只读、可再生的素材目录视图，来源仍为 `media/`、`assets/` 与页面引用。默认隐藏内部版本归档，将其保留在文件树和历史版本工作流中。素材项包含相对路径、可读名称、类型、大小、存在状态、预览，以及当前 Main 的使用位置；搜索名称/路径并按可用、缺失、当前主库未引用筛选。

“当前主库未引用”仅描述当前查询范围，不能据此推断文件可以安全删除。命名版本、外部科研记录和其他资料仍可能有用途。本轮素材浏览与复用不附带自动清理。

复用已有图片通过原有 `element.add` 引用同一路径；选择图片替换当前对象时，通过 `element.patch` 只更新 `src` 等明确字段，保持作者的位置和裁切选择，并使用现有页面 revision。替换多个页面或共享主题资源需明确列出受影响对象和范围，再以同一事务机制处理。当前对象的修复可先独立交付。

扫描必须限制目录范围、显示截断/分页状态、跳过越界链接，并避免把全部图片字节一次性载入前端。命名版本的归档资源继续归属 checkpoint，不由当前素材替换动作改写。

## 5. Story 怎样服务叙事打磨

### 5.1 现状

Main、Section 和 Presentation 的 Story 都采用 `purpose`、`audience`、`takeaway` 三个可留空字段。Page Story 位于 `designIntent`，包含页面目的、保留约束、请求摘要、Agent 身份、时间和来源。对象角色保存在 `elementRoles`。`recordStory` 通过共享 writer 的 metadata 事务记录，作者评审字段不开放给普通 Agent 写入。[Story 模型](STORY.md)、[story.ts](../packages/core/src/pptd/story.ts)、[store.ts](../packages/core/src/pptd/store.ts)

`huandeng_context` 已返回项目 Story 和逐页意图；`huandeng_selection_read` 可返回当前 presentation/occurrence/version；CLI 已有 `story-project` 与 `presentation`。缺口主要是这些信息尚未组合成一个紧凑、目标明确的工作上下文。现有 `huandeng_story_record` 聚焦单页，不能单独代表整场演讲的论证和节奏。

### 5.2 Story briefing 的建议契约

只读 briefing 接收 `pageId`、可选 `presentationId` 与 `occurrenceId`，返回当前修订信息与以下关系：

- Main Story：这份研究资料库要回答的大问题。
- 该页所属 Section Story：局部证据的作用。
- 所选 Presentation Story：本次听众、目的和希望留下的认识。
- 当前 occurrence：实际位置、版本、独立备注、前后页，以及同一页的其他使用位置。
- Page Story 与对象角色：要完成的任务、保留的布局判断和原图用途。
- 相关资源与技术诊断：素材来自哪里、哪些引用缺失、固定版本是否可用。

这是对现有数据的组合读取，不新增一套可漂移的 Story 副本。同页在一场演讲中重复出现而未给 occurrence 时，应返回所有候选或要求明确目标，不能把第一处当作用户意图。固定版本须使用其归档页面意图和素材；当前主页面的 Story 可作为单独标注的对照。

### 5.3 Agent 的叙事工作流

先读取当前演讲与 briefing，明确听众、要回答的问题、证据主次和保留约束；再给出具体到页或 occurrence 的调整。组成变化走项目编排事务，逐页内容变化走页面事务，讲稿变化归属本次引用。完成后读取最新结果、检查相关页及相邻页渲染，再记录实际完成和仍缺的信息。

基础字段可以保持轻量。Agent 可在演讲编排笔记中写出“问题—证据—结论”的提纲、尚缺的证据和衔接判断；正式提出新事实仍需要用户或来源支持。标题采用短词组或短问题，结论写在内容中；原图比例、标签、图例和作者指定构图继续随任务保留。Story 用于减少反复解释，不要求用户每次手填表单。

目前没有自动推断证据链、时间预算、逐引用叙事角色或任意叙事图。若后续引入这些字段，应扩展明确的 schema 与验证，不能依赖 `project.replace` 保存未知字段，因为当前校验器会规范化为已知字段。

## 6. HUANDENG Plugin：现有通道与目标架构

### 6.1 当前仓库已经具备的部分

[mcp.ts](../packages/core/src/pptd/mcp.ts) 已提供 12 个工具，覆盖 context、page read、selection、文件树、Story、事务、渲染、历史、命名版本、恢复、撤销和导出。[client.ts](../packages/core/src/pptd/client.ts) 根据指定项目发现正在运行的本机服务，验证实际项目，获取当前 session token；MCP 通过 stdio 运行，写入复用同一个文档服务。编辑器通过事件与快照接收变化。

因此，协议核心已有可用基础。缺少的是目标明确的 Project/Presentation/Story/素材读取工具、可安装包装、客户端配置与诊断，以及网页端的专用连接验收。现有 MCP 的 `huandeng_apply` 可以提交 `project.replace`；CLI 的项目模型读取能力目前没有对应的清楚 MCP 工具入口。

`plugins/huandeng` 当前只有 [README](../plugins/huandeng/README.md) 与 [stdio 示例](../plugins/huandeng/mcp.example.json)，尚不是已经安装和发布的跨客户端 Plugin。示例使用固定开发路径。README 工具列表漏了 `huandeng_version_record`，历史素材说明没有区分命名版本与操作历史；MCP server 版本仍为 `0.4.0`，应明确 Plugin 自身版本策略或随这次接口变化更新。

### 6.2 同一核心，按客户端接入

| 使用环境 | 建议通道 | 本轮适配边界 |
| --- | --- | --- |
| 本机 Codex / 支持本地 MCP 的桌面客户端 | stdio MCP → `HuandengClient` → 当前项目 writer | 复用已有桥接，提供可配置路径与自检；官方支持 stdio 和 Streamable HTTP [R1] |
| 本机 Claude Code | stdio MCP；由 Plugin 的 `.mcp.json` 或 manifest 包装 | 官方支持插件携带 MCP 配置；复用同一工具集合 [R2][R3] |
| 当前 ChatGPT 网页工作流 | 现有授权工作站连接调用同一 CLI / MCP | 保持当前实际可用路径；测试不能改成直接绕过 writer 写 `.page` |
| 独立的私有 ChatGPT Plugin | MCP 经受支持的私有 Secure MCP Tunnel，或经过认证的远程 Streamable HTTP 适配 | 官方私有 Tunnel 可从工作站向外建立连接；需验证实际账号、组织、工作区、发现和工具调用 [R4] |
| 面向其他用户分发的公开 Plugin | 独立打包、认证、安装、升级与平台提交 | 与个人私有通道分开验收；当前官方对公开服务器与 desktop-only 提交有各自要求 [R5][R6] |

推荐保留一个 HUANDENG 工具实现与数据契约，客户端只负责配置和传输。浏览器不能直接连接用户机器的 `localhost`；本地 REST API 的 session token 也不是网页 Plugin 的用户认证。新增远程适配必须先绑定目标项目与访问权限，再转交已有 writer；无需把底层编辑服务公开为通用文件操作接口。

这是一项产品架构建议，不意味着上述私有 Tunnel 或公开 Plugin 已配置。官方页面核对日期为本审计日期；实际安装以目标客户端与账号的真实验收为准。

### 6.3 建议的增量接口

| 层 | 建议新增或补齐 | 复用方式 |
| --- | --- | --- |
| 纯派生模型 | 项目总览、当前页 usage、Story briefing | 从 `DeckSnapshot` 与 `readProjectModel/resolvePresentation` 读取；保持持久化 schemaVersion 1 |
| 资源索引 | 项目素材目录、引用定位、扫描状态 | 从允许目录与快照读取，返回相对路径；不改文件 |
| HTTP | 只读 `/story-briefing`、`/assets` | 与已有 `/project-model`、`/presentations/:id` 共用服务 |
| MCP | `huandeng_story_briefing`、`huandeng_presentation_read`、`huandeng_assets_list` | 目标明确、只读；保留现有 context/apply/Story 工具兼容 |
| CLI | `brief`、`assets`，补 render 的 presentation/occurrence 选择 | 使用同一 HTTP 契约，便于当前 DC-WALT 通道调用 |
| GUI | 项目概览、本页使用关系、素材库、精确引用跳转 | 同一组派生函数；页面和项目修改仍由既有事务完成 |

可在后续增加更细的项目编排操作，以减少 Agent 为小修改提交完整 `project` 的负担；本轮先保留现有 CAS 语义和完整读取再修改的流程。新增工具输入必须能说明当前对象是主页面、live 引用还是固定版本，结果返回实际修订和诊断。

## 7. 验证场景

| 场景 | 需要证明的结果 |
| --- | --- |
| 一份 Main 衍生两场演讲 | 概览显示两场用途与页数，切换不创建第二份 `.pptd` 或 `.page` |
| 目录页重复四次 | pageId/短码相同，occurrence 不同；位置变化后仍定位正确，备注互不串用 |
| 相同页包含 live 与两个固定版本 | 点击编排顺序进入所选 occurrence，读取正确内容；主页面快捷入口仍可用 |
| 动态章节变更 | 演讲展开页数、usage 与 briefing 同步更新，Main 页序不受影响 |
| 删除或恢复引用目标 | 概览显示问题，受影响的播放/导出阻止；恢复同一身份后关系恢复 |
| 项目草稿与外部更新 | 导航保留草稿，旧 revision 不覆盖外部编排，其他演讲保持原样 |
| 搜索与复用素材 | 找到已有图片、看到使用页面、再次插入不重编码/复制原图，取消不改文档 |
| 缺失图片替换 | 定位准确对象，替换只影响选定范围；原布局与其他页面保持，撤销可恢复 |
| 资源目录截断或越界链接 | 返回并显示明确扫描状态，不伪装完整目录，不读取项目外文件 |
| Story briefing | 四层来源清楚，重复 occurrence 无歧义，固定版本与当前页意图不混用 |
| MCP / CLI 共享服务 | 两个客户端读取同一项目；有条件写入实时出现在编辑器；旧 revision 拒绝 |
| Plugin 配置可携带 | 用配置的路径启动，项目不存在/未打开时给可操作错误；初始化、tools/list、代表性读写与渲染实际通过 |
| 科研样本 | DNA TT 的 PPTD 副本验证大库关系与原图；m6A PPTX 用于观察实际材料结构和动画需求，不把尚未实现的完整 PPTX 导入计作通过 |

## 8. 文档修正清单

[PROJECTS.md](PROJECTS.md) 仍称 S 标签为主要可见身份、短码为兼容别名，与 v0.5 代码相反；它和 [STORY.md](STORY.md) 的操作指南仍引用英文旧标签。Plugin README 的版本与历史资产说明也需要同步。更新应保留历史事实，现行指南直接说明用户当前看到的行为。

## 9. v0.6 候选验证追加记录

Windows 隔离候选的 [项目与素材验收脚本](../scripts/verify-project-assets-v06.mjs) 已实际运行，回执时间为 `2026-11-07T16:35:38.145Z`，**11/11 通过**，`rendererErrors: []`，正常退出 `code: 0 / signal: null`。测试使用独立合成项目、profile 和 runtime，结果属于当前候选，尚不是最终安装包验收。

已证实的 UI 与持久化行为包括同一 Main 的两场衍生演讲、总览和编排面板精确跳转重复 occurrence、各次引用的独立讲稿、素材原名搜索与使用对象定位、复用已有图片而不复制新字节。含至少 3 张已解码图片的页面在文字保存后保持所有图片 URL；同路径 SVG 的真实字节与尺寸改变后，仅相关画布图片和素材库预览更新，控制图片保持不变。

缺图修复保留边界、裁剪、旋转、透明度及其他对象；文件选择期间发生外部写入时，旧修订事务被 409 / `REVISION_CONFLICT` 拒绝，界面保留错误，以最新修订重试后成功且保留外部修改。实际 CLI briefing/assets 读取与编辑器一致，读取不改文档。

同一专项还通过真实 `queryLocalFonts` 检测继承主题中的缺失字体及 fallback，验证实际文字溢出可定位、修改后检查过期、切页不沿用旧结果。此前无图片大项目页面的空数组比较不作为图片证据，本次已补齐正向解码与换图验证。

本分工 focused 测试为 23/23，实际本地 stdio/MCP/CLI 集成为 9 组通过。新候选键盘验收另有 14/14 通过；动画实际验收与最终打包结果仍由集中 Validation 记录确认。PNG/PDF/PPTX 现在统一在导出报告标明 `renderState: 'base'`，遇到时间线时记录 `TIMELINE_STATIC_EXPORT`，不宣称静态输出携带原生动画。

## 官方协议来源

- [R1 — OpenAI / Codex MCP 连接与配置](https://learn.chatgpt.com/docs/extend/mcp?surface=cli)：本地客户端的 stdio、Streamable HTTP 与配置范围。
- [R2 — Claude Code MCP](https://code.claude.com/docs/en/mcp)：stdio/HTTP、插件提供的 MCP 服务及客户端行为。
- [R3 — Claude Code Plugin manifest](https://code.claude.com/docs/en/plugins-reference)：`.claude-plugin/plugin.json`、`.mcp.json`、相对组件路径与 Plugin 包装。
- [R4 — OpenAI Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels)：私有 MCP 的出站连接、ChatGPT 连接与实际验收。
- [R5 — OpenAI Build an MCP server](https://developers.openai.com/plugins/build/mcp-server)：工具契约、Streamable HTTP 与公开 Plugin 服务部署。
- [R6 — OpenAI Desktop-only Plugins](https://developers.openai.com/plugins/deploy/desktop-only)：本地执行 Plugin 的分发范围与当前提交条件。
- [R7 — MCP TypeScript SDK server transports](https://ts.sdk.modelcontextprotocol.io/server)：stdio 与 Streamable HTTP 的角色；旧 HTTP+SSE 保留兼容。
