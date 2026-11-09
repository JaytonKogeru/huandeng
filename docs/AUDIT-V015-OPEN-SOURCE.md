# HUANDENG 与开源幻灯片工具：能力差异和采用建议

日期：2026-11-10（Australia/Sydney）。本轮核对官方仓库、源码、文档及许可证；没有安装这些工具、调用其模型或上传用户项目，也没有做同题美术/速度排名。上游版本记录见[证据汇总](evidence/performance-v015/summary.json)。

## 判断

HUANDENG 值得保留的是：**人在画布上编辑与 Agent 修改共用一份本地文档、一条带版本校验的写入路径，并能审阅真实保存结果和引用影响。** PPTD 的稳定页面身份、Main Position、演讲出现项和固定版本是这套工作方法的重要基础。

“文本文件可编辑”“支持 MCP”“有 AI 插件”“能导出 PPTX”已经不是独有优势。当前 Slidev 也提供 MCP 和 Agent skills；Presenton 的 Web 服务有 MCP；PPTAgent 和 PPT Master 都能由现有编码 Agent 驱动。我们应比较修改安全、意图表达、设计复用和最终画面，而不是入口数量。[Slidev AI 文档](https://sli.dev/guide/work-with-ai)、[Presenton MCP 说明](https://github.com/presenton/presenton#api-and-mcp-authentication)、[PPTAgent](https://github.com/icip-cas/PPTAgent)、[PPT Master](https://github.com/hugohe3/ppt-master)

这六个项目采用 Markdown、HTML、各自 JSON 模型或原生 PPTX 等方式；在所查资料中，没有看到它们把我们的 PPTD 作为互通格式。PPTD 的收益来自操作语义与可恢复性；代价是我们自己承担模型、渲染、导入导出和长期迁移的一致性。

## 对照表

| 项目与定位 | 官方资料可确认的强项 | 对 HUANDENG 的采用建议 | 集成边界 |
|---|---|---|---|
| [PPTist](https://github.com/pipipi-pikachu/PPTist)：浏览器可视化编辑器 | 丰富的对象编辑、上下文菜单、快捷键、主题/样式提取、模板、动画、章节 | 学习选中对象后的上下文操作、样式提取和模板插入；用同一套人工操作验收表检查我们的对齐、分布、分组、文本与图表体验 | Vue 实现；当前许可证为 AGPL-3.0。借鉴交互并独立实现，直接引入源码前单独核对许可与边界。不能依据 README 自报保真率做我们的兼容承诺 |
| [Slidev](https://sli.dev/guide/why)：Markdown/Vue 演示系统 | 内容与主题/布局分离、可分发主题、组件、交互表达、MCP、Agent skills | 把用户认可的参考页整理成可继承的字体/色彩/间距规则和布局角色；让 Agent 选择有语义的版式，而非每次从零写坐标 | MIT。学习主题与布局接口；不要直接把 Vue 运行时搬进 React 编辑器。交互网页能力不等于 Office 原生能力 |
| [Presenton](https://github.com/presenton/presenton)：AI 生成及模板平台 | 自带/自定义模板、从既有设计生成、生成 API、多模型选择、拖动编辑、PPTX 导出 | 建立“参考设计→可复用布局→填充内容→人工/Agent 修订”流程；从模板适用内容和容量约束入手 | Apache-2.0。先做模板/设计资产适配器，不引入第二套权威保存服务。其 README 明确 Electron 版不开放外部 REST/MCP，Web 服务与桌面能力要分开比较 |
| [PPTAgent](https://github.com/icip-cas/PPTAgent/tree/main/skills/pptagent)：Agent 制作与审阅流程 | HTML 源、实际渲染、视觉审阅、可编辑 PPTX、交付检查；源或共享资源变化会使旧审阅失效 | 最值得直接学习的是“审阅绑定到哪个版本”。把我们的修改回执、页面 renderRevision、引用版本和导出验收串成可追踪状态 | MIT；当前 runtime 依赖 Python/Node/LibreOffice 等，官方要求 Linux/WSL 或 macOS。采纳契约和验收方法比整体打包进 Windows Editor 成本更低 |
| [PPT Master](https://github.com/hugohe3/ppt-master)：Agent 原生 PowerPoint 工作流 | 文档声明支持原生形状、数据图表/表格、母版/布局、模板保留和动画/转场 | 用它的原生对象与 SVG/PowerPoint 映射思路审查我们的导出覆盖，优先研究母版和可支持的动画子集 | MIT。上述是官方能力说明，本轮未实测其文件；需用小型 OOXML 样本和 Office 打开结果验证后再采用，不能直接承诺完整兼容 |
| [PptxGenJS](https://github.com/gitbrent/PptxGenJS)：PPTX 生成库 | 形状、文字、图表、表格、母版及占位符等编程接口 | 我们已经使用 4.0.1；先检查已有导出器如何利用母版、占位符和图表语义，而不是重复增加库 | MIT。库能力不等于 PPTD 映射已实现，也不自动提供编辑器、审阅或完整动画兼容 |

许可证核对：[PPTist](https://github.com/pipipi-pikachu/PPTist/blob/master/LICENSE)、[Slidev](https://github.com/slidevjs/slidev/blob/main/LICENSE)、[Presenton](https://github.com/presenton/presenton/blob/main/LICENSE)、[PPTAgent](https://github.com/icip-cas/PPTAgent/blob/main/LICENSE)、[PPT Master](https://github.com/hugohe3/ppt-master/blob/main/LICENSE)、[PptxGenJS](https://github.com/gitbrent/PptxGenJS/blob/master/LICENSE)。这里记录采用时的检查点，不代表已经引入第三方源码。

## 两个容易用旧印象判断错的地方

**Slidev 不只有截图 PPTX。** 当前文档区分普通 `pptx` 图片导出和 CLI 的 `pptx-editable`：后者将浏览器测量结果重建为可编辑对象，不能映射的元素或页面回退成图片，并报告原因。点击步骤可展开为多页，但这不等于保留原生 PowerPoint 动画。我们应学习“可编辑性／视觉保真”的明确模式与逐项降级报告。[官方导出说明](https://sli.dev/guide/exporting)

**不能因为 PPTist 成熟就假定它解决了我们的长稿常驻问题。** 检查到的 `useLoadSlides` 从 50 页开始，每 600 ms 再增加 20 页，最后全部放开；缩略图用 `slidesLoadLimit` 控制加载。这是分批加载，不是完整的离屏卸载方案。我们的性能改造仍应依据自身实测，不能直接移植后就宣称更快。[加载源码](https://github.com/pipipi-pikachu/PPTist/blob/6907580cce33914a4c58be03e13ac0c332d8b5e9/src/hooks/useLoadSlides.ts)、[缩略图源码](https://github.com/pipipi-pikachu/PPTist/blob/6907580cce33914a4c58be03e13ac0c332d8b5e9/src/views/Editor/Thumbnails/index.vue)

## 我们已有的优势与仍然缺少的能力

| 维度 | HUANDENG 已有事实 | 仍需补齐 |
|---|---|---|
| 精确编辑 | 稳定 page/element identity，expected revision、requestId、previewHash，经同一 writer 保存 | 面向语义的批量操作与更轻量上下文读取，减少 Agent 猜字段和反复取全稿 |
| 安全协作 | 实际修改回执、前后审阅、来源角色、撤销/版本与冲突保护 | 审阅完成状态必须绑定页面、素材、字体/主题和导出版本；修改后自动显示待复核 |
| 结构组织 | Main 与演讲引用分离，重复出现和固定版本，章节、大纲、浏览、备注视图 | 让“本节为什么存在、每页承担什么论点”真正影响版式与审阅，而不只是附加故事文本 |
| 美术控制 | 局部布局预览、对象编辑、现有主题与组件机制 | 作者认可的参考库、跨页字体/留白/色彩继承、版式角色与容量约束、图表和图片的语义联系 |
| 交付 | 编辑器内动画与静态 PPTX 导出，有降级诊断基础 | 母版/占位符映射、动画可支持子集、导出后视觉与对象可编辑性验收 |
| 长稿工作 | 左栏预览按可见范围挂载、原有缓存和共享 snapshot | 新章节浏览的常驻预览、图片等待和切页延迟；详见性能审计 |

这是一组已实现能力与待补能力，不是“其他工具都没有”的排他性声明。尚未用同一输入、同一参考页、同一模型预算对所有工具做视觉与编辑保真评测。

## 建议采用顺序

### 第一阶段：先修工作区性能

完成[性能审计](AUDIT-V015-PERFORMANCE.md)中的浏览窗口化、图片优先队列/缓存和分阶段计时。先用现有观察器、renderer、writer 做改造；是否增加虚拟列表库，由章节高度、卡片尺寸和键盘语义的原型结果决定。不要以重写整个编辑器作为性能修复的前提。

### 第二阶段：让参考设计成为可执行的产品能力

借鉴 Slidev 的主题/布局分离和 Presenton 的模板流程，在现有主题、组件及布局预览之上补一层设计约束：

1. 用户选择两三张认可的参考页，记录字体层级、画面密度、色彩角色、页边距和图文关系。
2. 为页面声明目的与布局角色，例如“单图证据”“双图比较”“机制过程”“结论＋证据”；每种角色有可选结构、字量/图量上限和不可变区域。
3. Agent 提交具体布局候选与影响范围；编辑器展示实际渲染，选择后仍走现有 preview/apply。
4. 章节浏览检查前后页节奏和重复版式；越界、拥挤和缺少来源可以自动提示，美术是否合适仍要看图和听用户判断。

这样才能把内容意图与前端表现连接起来；仅加更多主题颜色或提示词不会形成稳定的设计能力。

### 第三阶段：复用 PPTAgent 的审阅失效契约

我们已有真实保存回执，应在其上增加“已审阅的是哪一版”的可见状态。建议至少绑定页面 revision、素材 revision、主题/字体版本、演讲 occurrence/version 及导出参数。修改任一依赖，相关审阅标记过期。提供整套缩略图审阅、单页放大、导出结果复核；不能让 Agent 把未看过的渲染自行标成已通过。[PPTAgent 任务与源契约](https://github.com/icip-cas/PPTAgent/blob/9dacac53ac9ef39346461063df729396551d929e/skills/pptagent/references/task-contract.md)、[交付规则](https://github.com/icip-cas/PPTAgent/tree/9dacac53ac9ef39346461063df729396551d929e/skills/pptagent#delivery-checks)

### 第四阶段：提高原生 PPTX 交付能力

先用已安装 PptxGenJS 的 `defineSlideMaster` 和占位符能力做窄范围原型：一种标题/正文布局、两种语言、页码和页脚。验证 PPTD 继承、画布与导出一致后再扩大。动画另建支持矩阵，将现有出现/淡入等语义逐项映射并在 Office 验证；无法映射时清楚说明静态降级。[母版与占位符文档](https://gitbrent.github.io/PptxGenJS/docs/masters/)

## 后续横向验收设计

使用公开或合成材料，固定同一内容、同一参考风格和同一可用素材。分别评估首次生成与后续局部修改，不把两者混在一起：

- 内容：证据是否完整、引用是否正确、是否新增无依据结论。
- 美术：层级、密度、图文关系、跨页一致性；由不知道生成工具的人按同一量表评分。
- 修改：仅改指定对象后，未指定页面/图形是否保持，是否可恢复，引用是否正确。
- 导出：文字/图表是否真正可编辑、字体/换行是否一致、动画是否保留或明确降级。
- 性能：相同素材和页数下测新进程就绪、切页、当前图加载、输入与保存、长稿浏览后的内存。

在完成这套对照之前，合理路线是保留 HUANDENG 的文档与审阅基础，按上述顺序吸收设计复用和交付验收机制，而不是宣称已经全面领先。
