# HUANDENG Editor

[English](README.md) · 简体中文

**把幻灯片做成可以持续修改、重复使用，并能与 AI 助手共同编辑的项目。**

HUANDENG 是一个本地桌面幻灯片编辑器。你在画布里选对象、改文字、放原图；助手通过同一个文档服务读取和修改同一份项目。每一页都有稳定身份，可以留下讲述意图、查看修改记录、保存命名版本，再被不同演讲重复引用。它适合需要不断更新内容的研究汇报、教学、技术说明和产品演示。

![HUANDENG 0.19 中文工作区：页面列表、画布与右侧属性面板](docs/images/editor-zh-019.png)

当前桌面与 Plugin 版本为 **0.19.0**。Windows 桌面是当前完成交付验证的路径；可编辑示例、发布说明和实际验收记录分别保留在仓库中。

[打开产品介绍示例](examples/huandeng-introduction/README.md) · [桌面启动与打包](packages/desktop/README.md) · [助手接入](plugins/huandeng/README.md) · [0.19 发布说明](docs/RELEASE-V019.md)

## 先做一处修改

1. 打开 HUANDENG，在 Home 选择新建项目，或打开已有的 `.pptd` 文件。也可以选择直接包含一个 `.pptd` 的项目文件夹。
2. 在左侧「页面」选一页；需要空白页时，点页面栏的 **＋「新增页面」**。选中文字工具，在画布点击或拖拽放置文字；已有对象直接点选。
3. 在「素材」里按文件名找到原图并拖到画布。新图片用 **「导入并放置」**；右侧属性调整大小、位置和裁切。
4. 打开右侧 **Story**，记下这页要说明什么、哪些内容需要保留、这次具体改哪里。讲给听众的完整解释写入 **Notes / 备注**。
5. 检查画布，点击 **「保存页面」**，或按 **Ctrl+S**，确认显示「页面已保存」。章节和演讲编排在相应面板点击 **「保存项目」**。
6. 在需要保留的节点，打开当前页历史并记录一个命名版本。之后可以继续编辑当前页，也可以为某场演讲固定使用这个版本。

可以从[中文入门项目](examples/huandeng-introduction/chatgpt-zh/deck.pptd)开始练习。请保留或下载整个项目文件夹：`.pptd` 是入口，页面、素材和命名版本在它旁边。更多入口规则见[项目文件夹](docs/PROJECT-FOLDERS.md)。

## 适合怎样的工作

| 工作 | HUANDENG 中的做法 |
| --- | --- |
| 每周组会或研究进展更新 | 保留原图、Story 和稳定 Slide ID，只修改这次有变化的页面。 |
| 同一批内容面向不同听众 | 从 Main Slides 选页或选章，组织成不同 Presentation；可为每次引用写不同讲稿。 |
| 课程、培训和技术演示 | 用备注组织讲述，用对象点击步骤安排出场，再预演整场顺序。 |
| 与一个或多个 AI 助手合作 | 明确项目和页面，先看修改影响，再通过共享 writer 保存、回读并检查实际画面。 |

这些工作可以在同一套项目结构中组合。例如，一页研究结果留在 Main 中，组会直接引用最新版；已经讲过的短报告则固定到某个命名版本。详见[项目与演讲](docs/PROJECTS.md)。

## 快速开始

### 使用 Windows 桌面包

完整解压桌面产物后运行 **HUANDENG Editor.exe**。安装后的快捷方式也使用 HUANDENG Editor 名称。整个应用目录需要一起保留，不能只复制一个 `.exe`。当前版本的变化见[发布记录](docs/RELEASE-V019.md)，桌面构建方法见[桌面说明](packages/desktop/README.md)。

首次启动在 Home 新建或打开项目；之后可以恢复最近打开的项目标签页。同一项目再次打开会回到已有标签页。新建项目会建立独立文件夹、入口文件、一张空白页和 `AGENTS.md` 创作约定。已有文件夹若包含多个入口，请明确选择其中一个 `.pptd`。[桌面说明](packages/desktop/README.md)

### 从源码启动

推荐使用 **Node.js 22.12 或更新版本**与仓库锁定的 **pnpm 10.17.0**：

```sh
git clone https://github.com/JaytonKogeru/huandeng.git
cd huandeng
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @open-slide/core build
corepack pnpm desktop
```

core build 同时生成编辑器前端。开发时需要前端热更新，可设置 `HUANDENG_DEV_SERVER=1` 再启动。桌面宿主固定使用 Electron 38.7.2；Windows 打包和当前用户快捷方式安装使用仓库脚本：

```powershell
powershell -NoProfile -File scripts/Package-Huandeng.ps1
powershell -NoProfile -File scripts/Install-Huandeng.ps1
```

详细依赖与打包选项见[桌面说明](packages/desktop/README.md)。PNG / PDF 输出需要 Chromium、Chrome 或 Edge；可通过 `HUANDENG_BROWSER` 指定浏览器。Windows 默认可使用 Edge。

## 从一页，组织成一场演讲

**Main Slides 是项目的页面库。** 页面的永久 ID 和界面里的短 Slide ID 用于认出同一页；Position 表示它当前排在哪里。重排页面会改变位置，不会改变页面身份。需要跟同事或助手讨论某页时，可以复制 Slide ID。[位置与身份](docs/POSITION-FIELDS.md)

**Section 组织 Main 的连续内容。** 选定一张 First Slide，章节延伸到下一章节的起点之前；保存的是稳定页面边界。编辑章节后保存项目。浏览、大纲和章节视图帮助检查整体结构，同时保留画布的编辑状态。[章节规则](docs/PROJECTS.md)

**Presentation 为一次具体讲述选内容。** 新建 Presentation，再用「添加页面或章节」挑选来源，调整顺序并保存项目。默认引用跟随 Main 更新；同一页可以出现多次，每次有自己的备注。需要固定旧画面时，为独立页面引用选择一个命名版本。整章引用要逐页设置备注或版本时，先拆为独立页面引用。[项目与演讲指南](docs/PROJECTS.md)

放映与导出使用当前选中的 Main 或 Presentation。**F5** 从头放映，**Shift+F5** 从当前页开始，**Esc** 退出。对象可以按点击步骤出场，预演与放映使用同一播放模型。交付前核对所选集合、实际顺序和导出报告。[动画与放映](docs/ANIMATION.md)

## Editor 的几个设计选择

### 把「这一页为什么存在」留在页面旁边

Story 记录项目、章节、演讲和单页的目的与约束；Notes 记录实际要讲的话。助手读取这些信息时，也会看到邻页、素材和这页被哪些演讲使用。作者无需在每次对话里重新解释全部背景。Story 是可继续工作的上下文，最终画面仍需要实际检查。[Story 约定](docs/STORY.md)

### 保留原材料，也保留改动依据

素材库索引项目中的原图和页面使用位置，支持按原文件名查找、预览与复用。导入保留原始文件字节，相同内容可复用同一份素材。操作记录用于查看具体保存；**命名页面版本**记录明确的里程碑，并把当时引用的本地素材一起归档。命名版本随项目文件夹移动，本机操作和恢复日志留在原安装环境。[素材与科研对象](docs/SCIENTIFIC-OBJECTS.md) · [版本规则](docs/RELEASE-POLICY.md)

### 用不同视图处理不同尺度的工作

普通视图处理对象；浏览和大纲检查页面顺序；章节视图处理内容结构；备注页集中写讲稿；历史视图预览与恢复页面版本。左侧导航、右侧属性、图层、Story 和检查面板围绕当前工作对象组织，面板可以收起、调整宽度或停靠。界面语言可以切换中文、英文，页面正文和备注保持作者原文。[工作区说明](docs/WORKSPACE-UX.md)

### 保存结果可以核对

页面修改与项目编排分别保存。助手的进度报告和文档服务的实际保存回执分开显示；保存后的操作可以查看前后画面及变更对象。检查面板可以测量内容范围、检查本机字体，并标明已经过期的结果。它帮助定位问题，不能代替作者的视觉判断或 PowerPoint 中的交付检查。[原生接入与协作记录](docs/NATIVE-INTEGRATION-0.19.md) · [PowerPoint 兼容范围](docs/POWERPOINT-COMPARISON.md)

## 架构：多个入口，一份文档状态

Electron 提供桌面窗口、文件对话框和项目标签页；React 画布负责可视化编辑。每个打开的项目有一个本机文档服务。GUI、CLI 与 MCP 都向这个服务提交带版本条件的修改，由同一个 writer 保存。

```mermaid
flowchart TB
    E["Editor · Electron / React"] --> W["本机文档服务 · 共享 writer"]
    A["AI 客户端 + HUANDENG Plugin"] --> C["CLI / MCP"]
    C --> W
    W --> P["项目目录 · 页面 / 素材 / Story / 命名版本"]
    W --> J["本机操作记录与恢复日志"]
    W --> X["渲染与导出"]
```

过期的页面版本会产生冲突，客户端需要读取新状态再形成修改。不同页面可以分工处理；同一页及共享的 Story、章节、演讲元数据需要协调。任务标签本身不构成锁，也不会自动安排助手。外部程序绕过服务直接改文件，不在这个协作协议中。[协议规格](docs/SPEC.md) · [实际协作验证](docs/NATIVE-INTEGRATION-0.19.md)

### 项目里有什么

| 路径 | 用途 |
| --- | --- |
| `deck.pptd`（入口文件名可以不同） | 项目入口、Main 页面引用和页序。 |
| `pages/*.page` | 可编辑的逐页内容、对象和备注。 |
| `media/`、`assets/` 及其他被引用的素材路径 | 原图与页面使用的素材。 |
| `.huandeng/project.json` | 稳定身份、Story、Section 与 Presentation 编排。 |
| `.huandeng/checkpoints/`、`media/.huandeng-versions/` | 命名页面版本及对应的历史素材。 |
| `AGENTS.md` | 作者可以编辑的项目创作约定。 |
| `Exports/` | 当前交付文件与导出报告。 |

复制或分享项目时，保持整个目录完整。命名页面版本不要求使用 Git；编辑器代码、项目备份和普通页面自动保存也有各自的历史。[项目目录说明](docs/PROJECT-FOLDERS.md)

## 连接你的 AI 助手

在顶栏打开 **「助手连接」**，选择客户端并生成当前项目的配置。把配置加到对应客户端后，读取项目上下文并核对目标项目。生成配置、客户端成功加载、模型完成任务和成品质量是四个需要分别检查的结果。

所有客户端共用仓库中的 [`huandeng-story` 技能](plugins/huandeng/skills/huandeng-story/SKILL.md)与运行时指南。它要求先读作者素材与现有页面，形成故事和设计方向，预览修改，保存后回读并检查实际渲染。[Plugin 指南](plugins/huandeng/README.md)

| 客户端 | 工程内的接入形式 | 入口 |
| --- | --- | --- |
| Claude Code | 原生 `.claude-plugin/plugin.json`、`.mcp.json` 与共享 `skills/` | [本地 Plugin](plugins/huandeng/README.md#claude-code) |
| DeepSeek Harness | 原生 `huandeng` bundle；适配器、构建脚本和共享内容均在本仓库 | [DSH 原生适配器](plugins/huandeng/adapters/deepseek/README.md) |
| Codex | Portable Plugin、兼容 manifest 或生成的 MCP TOML 配置 | [Codex 接入](plugins/huandeng/README.md#codex) |
| ChatGPT | 通过已有授权工作站连接调用同一 CLI；账户绑定独立于公开本地包 | [工作站接入](plugins/huandeng/README.md#chatgpt-through-the-existing-workstation) |

Claude Code 和 DeepSeek Harness 的包都由 `plugins/huandeng` 内的源码构建。DSH 原生 bundle 使用官方宿主管理安装，并为每个项目维护工具路由；原来的 raw MCP patch 是另一个兼容接入方式。具体客户端版本、安装过程与真实模型任务证据见[0.19 原生集成](docs/NATIVE-INTEGRATION-0.19.md)。

CLI 也能读取已打开的项目，例如：

```sh
node packages/core/huandeng.js --entry examples/huandeng-introduction/chatgpt-zh/deck.pptd inspect
node packages/core/huandeng.js --entry examples/huandeng-introduction/chatgpt-zh/deck.pptd quality --language zh-CN
```

修改事务使用实际读取的页面 ID 和版本，通过 preview / apply 提交；不要把示例 ID 或旧版本直接写进新任务。两个运行时指南 `huandeng://guide/story` 和 `huandeng://guide/operations` 说明完整协议。

## 格式与当前边界

编辑器支持文字、图片、形状、线条、图标、组合、原生表格、图表和 LaTeX 公式。PPTX 对支持的对象写入可编辑结构；不支持的对象回退会列入导出报告。检查报告与实际导出画面后再交付。[科研对象](docs/SCIENTIFIC-OBJECTS.md) · [PowerPoint 差异说明](docs/POWERPOINT-COMPARISON.md)

- PNG、PDF、PPTX 输出静态版式；Editor 内的点击步骤不会自动变成 PowerPoint 动画。
- MP4 是单独的无声定时输出，需要带 libx264 的 FFmpeg；它有明确的动画素材限制。
- 当前没有任意 PPTX 导入与往返、Google Slides 直接编辑、独立双屏演讲者窗口、可继承母版或编辑器插件市场。
- 本机字体和 Office 排版可能影响最终外观。检查面板与导出报告提供线索，真实渲染和目标软件检查负责确认结果。

## 开发与贡献

| 目录 | 内容 |
| --- | --- |
| `packages/core` | PPTD 文档服务、CLI / MCP、React Editor、渲染与导出。 |
| `packages/desktop` | Electron 桌面宿主与项目生命周期。 |
| `plugins/huandeng` | 客户端 manifest、Story 技能、连接脚本和 DeepSeek 原生适配器。 |
| `examples` | 可编辑示例、来源和教程。 |
| `docs` | 产品规则、设计说明、发布记录和验证依据。 |
| `scripts` | 打包、安装与针对具体产品路径的验证工具。 |

常用检查：

```sh
corepack pnpm --filter @open-slide/core typecheck
corepack pnpm exec vitest run --project unit
corepack pnpm check
```

提交问题时说明你想完成的操作、实际发生的结果、版本和最小可复现项目。界面改动请附真实截图；文档或 Plugin 改动请核对运行时里的实际入口。保留无关文件，按改变的行为选择验证范围。版本里程碑与 npm 包版本独立，发布约定见[版本规则](docs/RELEASE-POLICY.md)。

## 来源与许可

HUANDENG 基于 [OpenSlide](https://github.com/open-slide/open-slide) 的 React 编辑基础与代码，保留 MIT 许可和上游作者声明。HUANDENG 是本工程的产品名称，现有 `@open-slide/*` 包名保留为兼容标识。许可见 [LICENSE](LICENSE)，上游原始说明见 [UPSTREAM_README](docs/UPSTREAM_README.md)。

图表使用 Apache ECharts，数学排版使用 KaTeX，图标使用 Font Awesome Free；PPTX 生成使用 PptxGenJS，公式导出使用单独标注的 OpenPPTD 转换模块。发行包保留这些组件的许可和来源说明。[第三方声明](packages/desktop/NOTICE.md)

示例中的研究材料、品牌标记和截图按各自的来源说明使用；软件许可不会自动改变素材的许可。介绍项目的[素材与来源入口](examples/huandeng-introduction/README.md#材料与功能--material-and-product-evidence)保留了这些记录。
