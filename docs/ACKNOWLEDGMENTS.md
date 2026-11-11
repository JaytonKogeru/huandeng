# Acknowledgments and design references / 致谢与设计参考

HUANDENG brings together existing code, document ideas and editing practices. This page explains those relationships. The first fifteen entries restore the named credits in the original introduction; the complete inventory retains thirty-three projects and standards studied during development.

幻灯把已有代码、文档思路和编辑实践接在一起。本页说明各自的贡献与借鉴关系。前十五项是原介绍中专门致谢的来源；完整清单保留开发过程中研究过的三十三项项目与规范。

Code reuse, runtime dependencies and design references have different meanings. The project records linked below describe what HUANDENG learned or adopted. A reference is not a claim that the other project's code is bundled, that every studied feature is implemented, or that its authors endorse HUANDENG.

代码复用、运行依赖与设计参考分别列明。下方项目记录说明实际借鉴或采用的内容；列为参考不代表打包了对方代码、已经实现研究过的所有功能，或获得其作者背书。

## Introduction credits / 原介绍中的致谢

| Source / 来源 | Contribution or reference / 贡献与参考关系 | HUANDENG record / 工程记录 |
| --- | --- | --- |
| [OpenSlide](https://github.com/open-slide/open-slide) | React editor foundation, including the canvas, Inspector and presentation/export infrastructure. React 编辑基础，包括画布、Inspector、演示与导出基础设施。 | [Specification](SPEC.md), [upstream README](UPSTREAM_README.md), [license](../LICENSE) |
| [OpenPPTD](https://github.com/Shingwha/open-pptd) | Three MathML-to-OMML conversion modules reused for formula export. 复用三个公式转换模块，用于公式导出；并非整个 Editor 或文档模型的来源。 | [Vendored-code notice](../packages/core/src/pptd/vendor/open-pptd/NOTICE.md) |
| [PptxGenJS](https://github.com/gitbrent/PptxGenJS) | PowerPoint generation library; also studied for chart, master and placeholder semantics. 实际 PPTX 导出库，也用于研究图表、母版和占位符语义。 | [Export research](AUDIT-V015-OPEN-SOURCE.md), [chart exporter](../packages/core/src/pptd/export-chart.ts) |
| [Microsoft PowerPoint](https://www.microsoft.com/microsoft-365/powerpoint) | Sections, Notes, task views and presentation interaction. 章节、备注、任务视图与放映交互。 | [Workspace research](AUDIT-V010-A.md) |
| [WPS Slides](https://help.wps.com/c/wps-slides-editing-collaboration/2087353558488408066-guide-to-adding-or-deleting-sections-in-wps-slides-collaboration-mode?entry=category) | Section actions in the toolbar and thumbnail context menu. 章节操作的工具栏与缩略图上下文入口。 | [Workspace research](AUDIT-V010-A.md) |
| [Kimi / Moonshot AI](https://www.kimi.com/academy/slides-intro) | Slide authoring and continued human/agent revision; the founder encountered the PPTD approach through this ecosystem. 演示制作与人工、Agent 继续修订的工作流，也是作者接触 PPTD 思路的来源。 | [Founder account](../examples/huandeng-introduction/story/USER-STORY.zh-CN.md), [workflow research](AUDIT-V010-A.md) |
| [PPTist](https://github.com/pipipi-pikachu/PPTist) | Object context menus, shortcuts, style extraction and thumbnail loading. 对象上下文菜单、快捷键、样式提取与缩略图加载。 | [Open-source research](AUDIT-V015-OPEN-SOURCE.md) |
| [Slidev](https://github.com/slidevjs/slidev) | Themes and layouts, collaboration through source files, CLI/MCP and export paths. 主题与布局分离、原文件协作、CLI/MCP 与导出路径。 | [Open-source research](AUDIT-V015-OPEN-SOURCE.md) |
| [Presenton](https://github.com/presenton/presenton) | Reference designs, templates and human/agent revision around authored content. 参考设计、模板、内容填充与人工、Agent 修订流程。 | [Open-source research](AUDIT-V015-OPEN-SOURCE.md) |
| [PPTAgent](https://github.com/icip-cas/PPTAgent) | Rendered visual review and the need to revisit a review when its source changes. 真实渲染、视觉审阅及源版本变化后重新审阅。 | [Open-source research](AUDIT-V015-OPEN-SOURCE.md) |
| [PPT Master](https://github.com/hugohe3/ppt-master) | Native OOXML, SVG mapping and coverage of master/animation export. 原生 OOXML、SVG 映射及母版、动画导出覆盖研究。 | [Open-source research](AUDIT-V015-OPEN-SOURCE.md) |
| [open-kimi-ppt-skill](https://github.com/Amonginin/open-kimi-ppt-skill) | Community PPTD format reference used when studying document compatibility. 社区 PPTD 格式与文档兼容参考。 | [Specification](SPEC.md) |
| [OpenSlides Studio](https://openslides.dev/) | Explicit IDs, unified operations and editable boundaries informed object identity and component scope. 显式 ID、统一操作与可编辑边界，为对象身份和组件范围提供参考。 | [Specification](SPEC.md) |
| [OPF / OpenPresentation](https://www.openpresentation.org/) ([source](https://github.com/OpenPresentation/opf)) | Revision preconditions, patches, inverse changes and conflicts informed typed commands, compare-and-swap and Undo. 版本前提、补丁、反向修改和冲突，为命令、版本检查与撤销设计提供参考。 | [Specification](SPEC.md) |
| [VS Code](https://github.com/microsoft/vscode) | Document tabs, sidebar navigation and activity panels that preserve working state. 中央文档标签、侧栏导航、独立活动面板与切换时的状态保留。 | [Workspace design](WORKSPACE-UX.md) |

**OpenSlide and OpenSlides Studio are separate projects.** The former is HUANDENG's code foundation; the latter is a reference for operation and identity design. OpenSlides Studio is linked to its own site, openslides.dev. The similarly named meeting-management project at GitLab is not this reference.

**OpenSlide 与 OpenSlides Studio 是不同项目。** 前者是代码基础，后者是操作与身份设计参考。这里的 OpenSlides Studio 指 openslides.dev，不是 GitLab 上同名的会议管理工具。

The original [OpenSlide license](../LICENSE) and [third-party notices](../packages/desktop/NOTICE.md) remain authoritative for attribution and redistribution. OpenPPTD's specific reused files are documented in their own notice. The [checked product facts](../examples/huandeng-introduction/story/FACTS.md) distinguish PPTD inspiration, existing PPTX parts and the implemented HUANDENG project format.

原始 OpenSlide 许可与第三方声明记录代码归属和再分发要求；OpenPPTD 复用范围另有具体声明。产品事实说明区分 PPTD 的启发、PPTX 已有的组成部分与 HUANDENG 实际实现的项目格式。

## Further research references / 其他研究参考

These eighteen entries complete the original research inventory. They informed particular design questions; the linked records retain the adoption decisions and limits.

以下十八项补齐原始研究清单。它们分别帮助分析具体设计问题，是否采用及采用范围以对应工程记录为准。

| Source / 来源 | Research relationship / 研究关系 | HUANDENG record / 工程记录 |
| --- | --- | --- |
| [reveal.js](https://github.com/hakimel/reveal.js) | Fragments, cross-slide matching, Notes and playback APIs. 分步出场、跨页对象匹配、备注与播放 API。 | [Animation audit](AUDIT-V06-ANIMATION.md) |
| [Excalidraw](https://github.com/excalidraw/excalidraw) | Point/gap snapping, zoom-aware thresholds and per-gesture geometry caching. 点与间距吸附、缩放阈值换算、手势级几何缓存。 | [Snapping audit](notes/V09-SNAPPING-AUDIT.md) |
| [tldraw](https://github.com/tldraw/tldraw) | Snapping, unified actions and the distinction between an asset record and its uses. 吸附、统一动作，以及素材记录与页面使用对象的区别。 | [Snapping audit](notes/V09-SNAPPING-AUDIT.md), [workflow research](research/V07-WORKFLOW-REVIEW.md) |
| [Penpot](https://github.com/penpot/penpot) | Object identity, selection context and asset-library versus image-insertion tasks. 对象身份、选中上下文、素材库与插入图片的任务分工。 | [Workflow research](research/V07-WORKFLOW-REVIEW.md) |
| [Figma](https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/) | Stable objects, selection context and component overrides. 稳定对象、选择上下文与组件覆盖。 | [Specification](SPEC.md) |
| [Canva](https://www.canva.dev/docs/apps/mcp/tools/merge-designs/) | Explicit editing batches, transactions and undo units. 明确编辑批次、事务与撤销单元。 | [Specification](SPEC.md) |
| [Google Slides API](https://developers.google.com/workspace/slides/api/guides/overview) | Comparison with structured APIs for transactions, references and review context. 结构化 API、事务、引用和可审阅上下文的比较。 | [Product audit](AUDIT-V015.md) |
| [Moveable](https://github.com/daybrush/moveable) | Snappable API evaluation; HUANDENG retained its tested gesture layer. 评估吸附 API，保留自身受测的手势层，未引入该库。 | [Snapping audit](notes/V09-SNAPPING-AUDIT.md) |
| [Motion Canvas](https://github.com/motion-canvas/motion-canvas) | Narrative cues and deterministic frame output. 叙事 cue 与确定帧输出。 | [Animation audit](AUDIT-V06-ANIMATION.md) |
| [Theatre.js](https://github.com/theatre-js/theatre) | Keyframes, curves, numeric interaction and state/Undo boundaries. 多轨关键帧、曲线、数值交互与状态、撤销边界。 | [Animation audit](AUDIT-V06-ANIMATION.md) |
| [Remotion](https://github.com/remotion-dev/remotion) | Time-based sampling and deterministic rendering. 按时间采样与确定帧渲染。 | [Animation audit](AUDIT-V06-ANIMATION.md) |
| [Motion](https://github.com/motiondivision/motion) | Evaluated as an animation execution layer; that study did not add it as a runtime dependency. 动画执行层选型研究，当时未新增为运行依赖。 | [Animation audit](AUDIT-V06-ANIMATION.md) |
| [Adobe Photoshop](https://helpx.adobe.com/photoshop/desktop/get-started/learn-the-basics/workspace-overview.html) | Document, property and tool-context layers. 文档、属性与工具上下文的层次。 | [Workspace design](WORKSPACE-UX.md) |
| [Blender](https://docs.blender.org/manual/en/latest/interface/window_system/workspaces.html) | Task-oriented workspaces and Link/Append/Reuse Data distinctions. 任务决定面板空间，Link、Append、Reuse Data 帮助区分共享引用和副本。 | [Workspace design](WORKSPACE-UX.md), [workflow research](research/V07-WORKFLOW-REVIEW.md) |
| [Kdenlive](https://docs.kdenlive.org/en/exporting/render.html) | Output location, range, settings, duration and job feedback as one rendering task. 输出位置、范围、设置、时长与作业反馈构成完整渲染任务。 | [Workflow research](research/V07-WORKFLOW-REVIEW.md) |
| [Carbon Design System](https://carbondesignsystem.com/) | Global shell versus local content and tool-oriented text hierarchy. 全局外壳与局部内容分层、工具任务的文字层级。 | [UI research](research/V07-UI-REVIEW.md) |
| [Material adaptive layout](https://developer.android.com/develop/ui/compose/layouts/adaptive/use-window-size-classes) | Using available window width and height to determine workspace layout. 依据实际可用窗口宽高调整工作台布局。 | [UI research](research/V07-UI-REVIEW.md) |
| [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/) | Toolbar keyboard navigation and its boundaries with canvas/text input. 工具组键盘导航，以及与画布、文字输入的按键边界。 | [UI research](research/V07-UI-REVIEW.md) |

## Runtime libraries and example assets / 运行依赖与示例素材

The research inventory above is not a dependency inventory. The implementation also uses [React](https://react.dev/), [Electron](https://www.electronjs.org/), [Apache ECharts](https://echarts.apache.org/), [KaTeX](https://katex.org/) and [Font Awesome Free](https://fontawesome.com/license/free), alongside PptxGenJS and other package dependencies. See the [desktop notices](../packages/desktop/NOTICE.md), package manifests and the notices shipped with each distribution for their terms.

研究参考清单与运行依赖清单不同。实际实现还使用 React、Electron、Apache ECharts、KaTeX、Font Awesome Free，以及 PptxGenJS 和其他包依赖；许可证以桌面声明、包清单及发行物附带的声明为准。

Scientific figures, photographs, brand marks and UI captures retain their own attribution and license terms. Each editable example keeps its own sources and asset provenance. A software license does not change the rights in an imported image. Public examples must not incorporate private research artwork simply because it was consulted as a design reference.

科学图、照片、品牌标记和界面截图保留各自的来源与许可。每份可编辑示例保存独立的素材来源记录；软件许可不改变导入图片的权利，也不能把仅作设计参考的私有科研素材带进公开示例。

[Editable examples and their sources / 可编辑示例及来源](../examples/huandeng-introduction/README.md)
