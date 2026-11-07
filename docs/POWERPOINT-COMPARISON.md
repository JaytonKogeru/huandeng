# HUANDENG 与 PowerPoint：产品审计和核心验收

审计日期：2026-11-07。审计起点：HUANDENG `64c9e7b`（v0.3 之后的 main）；本文件同时记录本轮科学对象与原生导出的补齐范围。PowerPoint 对照对象为 **Microsoft 365 Windows 桌面版**，不把网页版的限制套到桌面版。

## 1. 总体判断与规格层级

HUANDENG 已有值得保留的编辑器基础：独立页面文件、稳定身份、事务保存、revision 冲突检查、外部文件更新、撤销、Electron 桌面入口和对象级导出。主要缺口集中在科研对象的完整编辑链路、项目级叙事组织、可携带的显式页面版本，以及真实 PowerPoint 打开后的编辑性和视觉检查。无需重建另一套底层编辑器。

[SPEC.md](SPEC.md) 继续作为完整产品规格；[SPEC-V02.md](SPEC-V02.md) 和 [SPEC-V03.md](SPEC-V03.md) 是阶段交付规格。最初 SPEC §1.3、§11、§13 明确允许高级对象按对象回退，并未承诺全功能 PPTX 往返、任意 TSX 双向转换、分布式 CRDT 或完整动画引擎。完整的科研静态编辑产品应完成下文的编辑、保存、版本、演讲编排和交付闭环；不能以 PowerPoint 全功能克隆作为没有终点的验收定义。

需要纠正两处容易误导产品规划的比较：

- PowerPoint 已有 Sections、Custom Shows 和重排后不变的 `SlideID`。HUANDENG 的优势应体现为项目目录、外部可编辑的页面源、可引用的友好短码、页级检查点及明确的科研叙事模型，而不是宣称 PowerPoint 没有这些基础概念。[M2][M3][M4]
- 最初 SPEC §10 要求缺图、越界、裁切、字体等技术 QA，强调作者的设计理由、真实图板和来源，并明确不建立“越凌乱越有人味”的总分。主观的“去 AI 风格自动评分”不是原规格欠交的硬门槛。应验收是否保留人工构图、是否解释建议、是否将作者反馈绑定到具体 `renderRevision`。

## 2. 功能差异矩阵

“本轮”表示当前工作树的实现范围；产品最终通过与否仍应与桌面验收记录对应，不能只根据模块存在判断。

| 能力 | PowerPoint 桌面版 | HUANDENG 审计起点 | 本轮核心交付与明确边界 |
| --- | --- | --- | --- |
| 本地文稿、页面编辑 | 成熟的本地文稿与对象编辑 [M1] | 已有自由画布、文本/图片/基础形状、图层、稳定页面身份 | 保留 PPTD 唯一源；修改原项目；新增科学对象也必须走同一命令与保存链路 |
| 页面身份 | `SlideID` 不随插页和重排变化 [M4] | UUID + 四位字母数字短码；与显示页码分离 | 内部身份保持兼容，界面以标题和当前位置为主，短码用于稳定引用；不迁移既有 ID |
| 章节组织 | Sections 可命名、折叠和重排 [M2] | 没有独立项目章节模型 | Main Slides 唯一；章节引用稳定 pageId，章节故事与逐页设计意图分开 |
| 一稿多场演讲 | Custom Shows 可选择和重排同一文稿的页面 [M3] | 只有单一主页面序列 | 同一项目中保存多个 Presentation；引用章节或页面，支持单页固定命名版本；不复制成多个活动主工程 |
| 叙事与证据 | 备注与章节可承载作者组织 [M1][M2] | Story 主要是逐页目的、保留约束、来源、评审 | 项目 Main Story、Section Story、Presentation Story 和逐页意图分层；叙事数据不替代科学对象源 |
| 自动保存与历史 | Office 文件版本历史依赖 OneDrive/SharePoint 的文件级版本 [M5] | 自动保存和运行时操作历史；未形成携带资产的页级里程碑 | 自动保存、Undo 和“记录页面版本”分开；显式命名检查点保存页面源、资产内容和有效主题；项目搬家后仍可恢复 |
| 并发编辑 | 云端共同编辑、评论及活动提示 [M1][M6] | 本地服务/SSE、外部文件更新、revision 冲突保护 | 继续保护旧草稿不覆盖新内容；不把 OneDrive 文件同步宣称为跨机器分布式协作 |
| 表格 | 原生表格与单元格编辑 [M1] | 合并表格能渲染和改文字，结构编辑及原生导出不足 | 表格网格、增删行列、合并拆分、样式；PPTX 原生 `a:tbl`，保留合并、字体、边框、填充与实测行高 |
| 公式 | 原生 Office 公式编辑 [M7] | LaTeX/MathML 显示，PPTX 主要依靠图像回退 | KaTeX 保留 LaTeX 原文；LaTeX→MathML→OMML 输出可编辑公式；原始 MathML 等未覆盖内容按对象回退，不把源码文字当作成功呈现 |
| 图表 | 原生图表、编辑数据，支持误差棒等科学细节 [M1][M8] | 没有完整 chart 编辑/渲染链路 | ECharts 渲染 13 种图表族；常规 6 族和可支持组合输出原生图表及完整嵌入 XLSX；高级图表按对象回退 |
| 科学统计图细节 | 自定义正负误差量、散点横纵误差棒 [M8] | 缺少专门模型和面板 | 误差棒、趋势线、复杂统计拟合与更完整坐标轴设置仍未覆盖；可保留外部科学软件图作为图片，不宣称已成为统计绘图软件 |
| 分组 | 组内对象可共同变换 [M9] | group 模型未贯通编辑器 | 支持引用式组、嵌套、移动/缩放/旋转与解组；PPTX 对连续堆叠成员保留真正 `p:grpSp`。若成员与组外对象交错，保留独立可编辑成员，避免改动遮挡关系 |
| 形状和图标 | 形状、图标、SmartArt 等对象生态 [M1][M9] | 常见形状少；icon 缺少实际呈现 | 21 种形状可编辑并原生导出；Font Awesome Free 图标可直接选择。图标 PPTX 暂按对象图片导出；未实现 SmartArt 语义编辑 |
| 主题和母版 | Slide Master 管理布局与通用样式 [M10] | 主题数据与可选布局起点 | 保留主题与可解除关联的普通对象；没有完整母版/占位符编辑器。Main Slides 是内容总库，绝不能称为 PowerPoint 的 Slide Master |
| 演讲与备注 | 双屏 Presenter View、备注、自定义放映 [M1][M3] | 全屏与页内备注视图；尚非独立双屏工作流 | Presentation 的顺序、固定版本和备注须与实际放映一致；完整双屏控制、计时排练、录制需另行验收，不能以备注浮层代替 |
| 导出 | PPTX、PDF、图像、视频等 [M11] | PNG/PDF 与基础原生 PPTX；复杂内容编辑性不足 | 原生科学对象扩展；PDF/PNG 使用同一渲染器；输出必须有逐对象真实模式和诊断。导出不改主源、不产生第二个活动 Main |
| 动画与音视频 | 动画、转场、录制和媒体控制 [M1][M11] | PPTD 导出主要为静态；动画不完整 | 静态科研交付是当前核心；动画源保留并报告静态导出。没有实现完整媒体制作/动画时间线 |
| 可访问性 | Accessibility Checker、阅读顺序与替代文本等 [M12] | 没有对应完整检查体系 | 后续独立改进项；不能将普通技术 QA 描述为完整无障碍验收 |
| PowerPoint 往返 | 原生 PPTX 是自身文档格式 [M11] | PPTD→PPTX 交付，未承诺完整回导 | 保持单向高质量交付；不宣称能无损导入/改写任意复杂 PPTX |

## 3. Main Slides 与多 Presentation 的设计判断

用户提出的模型合理：一个项目只有一份持续积累的 Main Slides，多个 Presentation 共享它的页面、资产和版本。其使用场景包括短报告、完整组会、答辩和备用数据，避免为每次报告复制目录。

建议及本轮模型约束：

1. **Main Story 描述全项目问题、证据脉络与核心结论。** Section 用于 Main 的内容归属；页面可以暂时不属于章节，但不同时归属两个主章节。
2. **Section 统一承载 part/chapter 的组织含义。** 首版不同时引入三个相互竞争的层级。显示标题可以叫“第一章”“方法”或“Part II”，数据结构仍用一个 Section。
3. **Presentation 是有序引用清单。** 它可以由 Section 1、3、4、7、8 组成，也可以插入单独页面。选择一个章节代表跟随该章节的当前内容；需要锁定交付时，用显式页面引用和命名版本冻结。
4. **Presentation Story 描述受众、讲述目标和本场结论。** 它可以复用多个 Section Story。逐页设计意图继续记录科学问题、来源、对象角色、保留约束和作者反馈；这些层级的职责不同。
5. **编辑共享页面必须明确影响范围。** Main 中的同一 pageId 修改后，所有跟随当前版本的 Presentation 都更新；固定检查点的引用保持不变。重复出现同一页面时，出现位置需要独立 occurrenceId，不能冒充新 pageId。
6. **断裂引用必须可见。** 删除页面、章节或遗失检查点时报告具体引用，不悄悄跳过、重指向相邻页或导出少页的成功文件。

PowerPoint 的 Custom Shows 证明“一份内容、多条演讲路线”是成熟交互模型；项目级 Story、页级冻结版本和外部 Agent 可读源，是 HUANDENG 在这个模型上的具体扩展。[M3]

## 4. 页面版本：分离三种时间尺度

| 层级 | 触发 | 用途 | 是否作为用户看到的正式版本 |
| --- | --- | --- | --- |
| 自动保存、事务日志 | 每次已提交操作 | 防丢失、崩溃恢复、冲突保护 | 否 |
| Undo/Redo | 用户撤销/重做 | 连续编辑中的短期修正；尊重外部修改屏障 | 否 |
| 页面检查点 | 用户或被授权 Agent 显式“记录版本”，附可读名称 | 完成一个阶段后回看、恢复或固定到某场 Presentation | 是 |

命名版本需要包含页面源、有效主题、被引用资产的内容快照和身份信息。只保存 YAML 但继续指向会被覆盖的 `media/figure.png`，不构成可靠的科研页面版本。资产按内容散列去重；恢复页面采用归档资产路径，不覆盖其他页面共享的现用资源。恢复本身仍需走同一事务与冲突校验，并保留恢复前的可撤销状态。

**页级版本不应依赖用户安装或操作 Git。** 项目中的检查点归档可直接随目录复制。Git 可以作为开发者/高级用户的整项目快照与备份，但不适合作为唯一面向普通用户的页面版本界面：它还涉及资产、多个页面、分支和未提交状态。最初 SPEC §7.4 的 Git checkpoint 继续作为独立能力，不与自动保存混为一谈。

四位短码原本是**字母数字友好别名**，不是只有四位十进制数字的数据库主键。继续保留 UUID/pageId 和已分配短码；以页面标题与显示位置降低界面负担，比迁移全部 ID 更稳妥。恢复、插页和重排都不能重新分配身份。

## 5. PPTX 编辑性契约

| 模式 | 当前对象/条件 | 交付保证 |
| --- | --- | --- |
| 原生 | 常规文字、21 种形状、线 | PowerPoint 对象可继续编辑；引用字体，字体文件不嵌入 |
| 原始图片对象 | 支持的 PNG/GIF/JPEG 与裁剪几何，JPEG 不含非默认 EXIF 方向 | 原始资产字节保持不变，PowerPoint 中仍是可调整的图片对象；报告为 `image` + `ORIGINAL_ASSET`，不等于渲染回退 |
| 原生表格 | 有效网格、合并、支持的边框/实色填充；无整体旋转、翻转或阴影 | `a:tbl` 保留单元格文本、合并与样式；真实 DOM 行高可传给导出器 |
| 原生公式 | 可被 KaTeX 解析并由复用转换器支持的 LaTeX | `a14:m` + OMML，Cambria Math；旧 Office 的兼容副本保留 LaTeX 文本，不改变 PPTD 原文 |
| 原生图表 | bar、line、area、pie/环形、scatter、bubble；兼容的分类坐标、堆叠与组合配置 | `c:chart` + 完整 XLSX、关系与 Content Types；零和负值保持真实数值，数据仍可在 PowerPoint 编辑 |
| 原生分组 | 成员在绘制顺序中连续，可嵌套 | `p:grpSp`；不二次应用已经写入成员坐标的组变换 |
| 对象级图像回退 | 雷达、热图、蜡烛、瀑布、树图、旭日、桑基；缺值/坐标配置超出原生映射的图表；特殊表格、图标、原始 MathML、复杂文字、EXIF 旋转/镜像 JPEG 等 | 由实际渲染器输出该对象，报告明确 `image` 和回退原因；源数据继续在 PPTD 编辑，EXIF 方向不被错误裁剪 |
| 独立原生成员 | 成员与组外对象交错的组 | 保留原堆叠关系和各对象编辑性；报告没有保留 PPTX 分组，不制造视觉变化 |
| 阻止完整导出 | 缺资产、无效公式、错误表格网格/科学数据、无可靠回退 | 提供 pageId/shortCode/elementId 与错误；不能用空白、源码字符串或未知占位符冒充成功 |

PowerPoint 和 ECharts 使用不同的图表布局引擎，原生图表的标题、坐标标签、图例与绘图区可能重新布局。报告中保留 `NATIVE_CHART_LAYOUT`。数据精度与可编辑性由包结构及 PowerPoint 实测验证，不能据此承诺逐像素一致。PDF/PNG 是锁定外观的交付格式。

## 6. 复用与实现依据

- **ECharts 6.1.0**：图表画布和 SVG 渲染；共享 `science-model.ts` 保持数据解释一致。[L1]
- **Font Awesome Free 7.3.1**：图标库；保持现有 `fas/far/fab:name` 引用格式。[L2]
- **KaTeX 0.19.1**：公式显示和受约束的 MathML 生成；关闭 `trust`、限制宏展开，解析错误显式报告。[L3]
- **OpenPPTD 2.0.2 的 MIT MathML→OMML 转换模块**：沿用旧编辑器已经使用的实现，固定来源 commit；来源与许可说明保留在 `packages/core/src/pptd/vendor/open-pptd/NOTICE.md`。[L4]
- **PptxGenJS 4.0.1**：只用于生成原生图表与嵌入工作簿，导入其完整依赖关系；保持既有 PPTD 文字/图片/形状导出器。适配器补正了该版本部分图表工作簿将数值 `0` 写为空单元格的问题；分类轴缓存保持文本类型，组合图按各系列类型设置合法的数据标签位置。这些实际 Office 打开时发现的问题均有回归测试。[L5]

相关源码：`export.ts`、`export-table.ts`、`export-math.ts`、`export-chart.ts`、`export-groups.ts`、`table-style.ts`、`science-model.ts`。主要回归覆盖科学数据的零/负值、缺值回退、多个图表关系隔离、合并表格、公式结构、嵌套组/交错组和主题冻结，避免只测试按钮存在。

## 7. 验收顺序与可复现证据

继续原规格 M1–M5 的依赖顺序：先保证可写源和安全保存，再扩展对象编辑，接着验证版本、演讲序列和交付，最后确认 Story 与人工设计保留约束。验收用专用合成项目；正式科研项目的验收应使用授权副本，不能为了通过截图改写主材料。

| 优先级 | 必须观察到的完成行为 |
| --- | --- |
| P0 数据安全 | 编辑、保存、关闭重开后内容相同；源 ID 不变；外部更新不被陈旧草稿覆盖；导出前后主源哈希不变 |
| P0 科学编辑 | 图表数据修改、合并表格与公式修改真正显示；分组变换不重复或遗漏成员；图标可用；错误输入有明确诊断 |
| P0 版本闭环 | 多次小改不自动生成大量正式版本；显式记录、重启、预览和恢复可用；替换同名图片后仍可恢复旧图且不影响别页 |
| P0 项目编排 | 一个 Main、多个 Presentation；章节和页引用能重排；当前/固定版本行为正确；放映与导出顺序、页数一致 |
| P0 Office 交付 | PowerPoint 打开无修复提示；表格/图表/公式是真对象；图表工作簿仍有数值 0；保存再开后对象仍在；所有页检查实际渲染 |
| P1 科研细节 | 补齐有明确材料驱动的误差棒、坐标轴、复杂文字、原始 MathML原生映射、更多图表可编辑性；完整双屏演讲体验 |
| P2 扩展产品 | 母版编辑、完整 PPTX 往返、媒体/动画引擎、SmartArt、分布式协作、VBA/OLE、完整无障碍检查体系 |

可复现原生对象样稿：

```sh
node scripts/generate-native-pptx-acceptance.mjs
pnpm exec vitest run packages/core/src/pptd/export.test.ts packages/core/src/pptd/export-science.test.ts
```

生成器默认写入 `.verification/native-v04/`，同时保存 PPTX、源快照、导出报告和 SHA-256 摘要；可通过第一个参数指定其他目录。样稿共 5 页，覆盖 6 个原生图表对象、1 个合并表格、多个公式、1 个原生组及 7 种形状。源数据是明确标注的合成验收数据。

Windows 上安装 PowerPoint 后运行：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/verify-native-pptx-office.ps1
```

脚本用 `Open2007(..., OpenAndRepair=false)` 打开原始样稿和保存后的副本；必须显式传入这个参数，因为 Office API 的默认值为允许修复。[M13] 它检查 `HasTable` / `HasChart` / `GroupItems`、激活各嵌入工作簿读取真实零值、实际修改表格和图表数据、保存重开验证、逐页导出 PNG，并确认原始源文件哈希未变。它只关闭自己打开的文稿。

**本轮原生科学对象验收已在 PowerPoint 16.0 通过。** [验收 JSON](evidence/native-v04/office-acceptance.json) 记录了 5 页、6 个原生图表、1 个 4×3 合并表格、1 个包含 3 个成员的原生组；每个图表工作簿的 `B2` 数值均为 `0`。修改后的表格文字和图表数值在保存重开后仍在，5 个 OMML 公式保留，原始文件未改写。已逐一查看实际 PowerPoint 导出的 5 张 PNG；高公式的段间重叠和均值上划线兼容问题在视觉检查中发现并修复。

实际验收样稿、5 张 PNG 与视觉检查说明保存于 [native-v04 证据目录](evidence/native-v04/README.md)。包结构测试和该固定样稿的 Office 通过，证明此处列明的原生映射与保存闭环；其他科研材料仍按完整产品验收清单逐页检查。此样稿不含动画、音视频或复杂母版，不为这些能力作通过声明。

## 资料

### Microsoft 官方资料

- [M1：不同平台的 PowerPoint 功能](https://support.microsoft.com/en-us/powerpoint/compare-powerpoint-features-on-different-platforms)
- [M2：组织章节](https://support.microsoft.com/en-au/powerpoint/training/organize-your-powerpoint-slides-into-sections)
- [M3：创建和演示 Custom Show](https://support.microsoft.com/en-us/powerpoint/create-and-present-a-custom-show)
- [M4：Slide.SlideID](https://learn.microsoft.com/en-us/office/vba/api/powerpoint.slide.slideid)
- [M5：Office 文件版本历史](https://support.microsoft.com/en-us/office/collab-files/view-previous-versions-of-office-files)
- [M6：共同编辑 PowerPoint](https://support.microsoft.com/en-au/powerpoint/work-together-on-powerpoint-presentations)
- [M7：键盘操作 Office 公式](https://support.microsoft.com/en-us/accessibility/office-accessibility/use-keyboard-to-work-with-equations)
- [M8：图表误差棒](https://support.microsoft.com/en-gb/office/add-change-or-remove-error-bars-in-a-chart)
- [M9：对象分组与解组](https://support.microsoft.com/en-us/office/graphics-visuals/group-or-ungroup-shapes-pictures-or-other-objects)
- [M10：Slide Master](https://support.microsoft.com/en-au/powerpoint/training/what-is-a-slide-master-in-powerpoint)
- [M11：演示文稿导出](https://support.microsoft.com/en-us/powerpoint/export-a-presentation)
- [M12：PowerPoint 无障碍](https://support.microsoft.com/en-us/accessibility/powerpoint/make-your-powerpoint-presentations-accessible-to-people-with-disabilities)
- [M13：Presentations.Open2007 与 OpenAndRepair](https://learn.microsoft.com/en-us/office/vba/api/powerpoint.presentations.open2007)

### 复用库的一手资料

- [L1：ECharts 服务端渲染](https://echarts.apache.org/handbook/en/how-to/cross-platform/server/)
- [L2：Font Awesome SVG JavaScript API](https://docs.fontawesome.com/apis/javascript/methods)
- [L3：KaTeX 渲染选项](https://katex.org/docs/options)
- [L4：OpenPPTD 固定来源](https://github.com/Shingwha/open-pptd/tree/5f027fc986f35924ea17da6b486ab5ea44ad7475)
- [L5：PptxGenJS 原生图表](https://gitbrent.github.io/PptxGenJS/docs/api-charts) 与 [4.0.1 包](https://www.npmjs.com/package/pptxgenjs/v/4.0.1)
