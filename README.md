# HUANDENG Editor

让人与 Agent 在同一份幻灯文档上工作。

HUANDENG Editor 基于 OpenSlide 的 React 编辑环境，使用 PPTD 文档后端。页面使用永久 ID，界面显示稳定的 Slide ID 与独立的 Position；已有 S1、S2 等别名继续兼容。内容保存在原来的独立 .page 文件中。标题、位置改变，页面身份不变。HUANDENG Story 记录全项目、章节、演讲的叙事目的，以及逐页证据角色和设计意图。HUANDENG Plugin 提供与可视化编辑器共用的 Agent 接口。

## 当前阶段

**Editor / AI plugin 0.19.0 已完成安装与交付验证**；core npm 包仍为 2.3.1。本轮把介绍稿的任务重新明确为：让读者理解 HUANDENG 是什么、怎么用、为什么这些设计有帮助。作者的经历用于判断重点和解释设计，页面按实际工作组织。当前要求见 [产品介绍 Spec](docs/PRODUCT-INTRODUCTION-SPEC.md)，逐项结果见 [验证记录](docs/PRODUCT-INTRODUCTION-VALIDATION.md)。

0.19.0 增加项目目录入口、现有项目的文件夹图标设置，并把助手配置、客户端报告和真实保存记录讲清楚。项目在后台恢复或打开时，晚到的加载结果会尊重用户后来的标签页或 Home 选择。DeepSeek 使用正式原生 bundle，Claude Code、Codex 与 ChatGPT 共享当前作者指南。GUI、CLI 和 MCP 继续共用文档服务。工作流为 Audit → Spec → Frame → Implement → Validate → Release。

## 项目介绍 / Introduction

These introductions explain the tool through actual work: edit a scientific page, preserve its evidence, review a change, reuse pages for another audience, and work with an assistant. The founder's account explains why these choices matter. The original account is retained separately from the presentation's authored sequence.

| 版本 / Edition | 可编辑项目 / Project | Main | 简短演讲 / Brief | 状态 |
| --- | --- | ---: | ---: | --- |
| ChatGPT 中文 | [chatgpt-zh](examples/huandeng-introduction/chatgpt-zh) | 24 | 12 | 已完成内容、视觉与 PowerPoint 检查；待作者评审 |
| ChatGPT English | [chatgpt-en](examples/huandeng-introduction/chatgpt-en) | 24 | 12 | Content, visual and PowerPoint checks complete; owner review pending |
| Claude Code 中文 | [claude-zh](examples/huandeng-introduction/claude-zh) | 26 | 9 | 稿件、对应修正与导出完成；原生日志追加被拒已记录 |
| Claude Code English | [claude-en](examples/huandeng-introduction/claude-en) | 25 | 9 | Preferred design preserved; factual/function alignment complete; retained Office chart-label issue |
| DeepSeek Harness 中文 | [deepseek-zh](examples/huandeng-introduction/deepseek-zh) | 22 | 12 | 原生完成；保留 4 类内容或语义对应问题 |
| DeepSeek Harness English | [deepseek-en](examples/huandeng-introduction/deepseek-en) | 22 | — | Native completion; current factual/Notes findings retained in its README |

[0.19 发布与产物](docs/RELEASE-V019.md) · [六稿入口、预览与下载](examples/huandeng-introduction/README.md) · [作者故事原文](examples/huandeng-introduction/story/USER-STORY.zh-CN.md) · [当前实测与交付边界](docs/PRODUCT-INTRODUCTION-VALIDATION.md) · [原生插件](docs/NATIVE-INTEGRATION-0.19.md)

Git 目录维护可编辑源与证据。完整项目 ZIP 包含当前 Exports；在 GitHub 上查看 PDF/PPTX，请使用上方“六稿入口、预览与下载”的发布附件链接。

作者最认可 Claude English 的介绍方式。本轮保留它的有效设计，把其余版本的功能覆盖和可操作性单独验收。ChatGPT 两稿已完成 48 张 Main 页面及短版特殊引用的实际 PowerPoint 检查；原生作者的完成状态、事实问题和中英对应单独记录。作者认可、技术完成与独立审读是不同结果。

![Claude English introduction: the owner's preferred presentation of the Editor and workflow](examples/huandeng-introduction/previews/claude-en-overview.png)

## 编辑与交付

桌面顶部以标签页保持多个 Project，Home 随时返回最近项目；切换保留各自的草稿。固定“幻灯片”文档提供 **普通 / 浏览 / 大纲 / 章节 / 备注页 / 历史** 入口，只切换中间工作区。浏览与大纲分别提供缩略图网格和页面摘要列表；章节在中央编辑共享结构草稿并预览成员；备注页提供页面预览和宽讲稿区；历史按当前页记录、预览和恢复版本。切换主视图保留左侧导航的标签、宽度与展开状态。资料文件在独立文档标签中只读显示；Ctrl+W 只关闭活动文件，不关闭幻灯片或项目。

中文与英文分别翻译系统控件和原生菜单，作者的标题、内容与备注保持原文。助手连接位于顶栏，邻近动态；配置、客户端报告与真实保存回执分别展示。放映菜单明确“从头放映 / 从当前页放映”，对应 F5 / Shift+F5。动画仍使用既有对象效果、点击步骤和页面转场，预演与实际放映共享播放模型。

既有可视化布局、Agent 修改审阅和引用范围继续连接：匹配标题样式时检查完整目标页预览，再应用同一组修改；通过真实回执查看前后画面与变更对象。检查面板区分匹配、过期和缺少审阅证据，也说明未保存画面不在已保存证据范围内。页脚可显式绑定 Main Position，重排无需逐页改写；页面身份保持稳定。完整界面和操作见 [v0.17 walkthrough](docs/UI-WALKTHROUGH-V017.md)，升级依据见[性能审计](docs/AUDIT-V015-PERFORMANCE.md)与[开源工具对比](docs/AUDIT-V015-OPEN-SOURCE.md)。

章节浏览按视口释放复杂页面渲染器，当前画布的原图请求优先处理；连续更新读取已提交状态，减少重复扫描。v0.16 的测量和快速滚动限制见当版验证记录；本版中央工作区升级后，不把旧布局的渲染器数量当作新布局的测量结果。

PPTX 先生成在 Project 的 Exports/，检查后更新固定共享副本；保存触发与静默定时兜底共用发布锁。Windows 文档关联与桌面快捷方式使用 HUANDENG 名称。OneDrive 共享输出使用普通文件镜像，见 [PPTX publishing](docs/PPTX-PUBLISHING.md)。本地写入完成和云端同步状态是两种不同证据。

本地适配器查找 Editor 并核对明确选择的 Project；ChatGPT 私人包沿用已有授权工作站连接。账户插件更新、本机安装、连接检查与真实模型任务分别验收，详见本版交付记录。设计指南要求先参考作者认可的页面、保留证据图、明确版式选择，再检查真实渲染与保存回执；结构化接口本身不代表美术质量优于其他工具。

入门见 [Workspace UX](docs/WORKSPACE-UX.md)、[v0.17 操作流程](docs/UI-WALKTHROUGH-V017.md) 与[完整工作流](docs/WORKFLOW-V010.md)。私人 Project 内容、图片、标识、路径、截图及详细收据不进入工具仓库或插件包。仓库保持 private；旧提交中的历史标识/路径痕迹需在公开前另行清理，本轮不改写历史。

.pptd 是项目的启动与页序清单；完整编辑源是它所在的目录。PPTX 对支持的文本、图片、形状、线条、表格、图表、公式和组合保留原生对象，逐对象回退列入导出报告；动画仍为静态。任意 PPTX 导入/往返、Google Slides 直接编辑、独立演讲者窗口、可继承母版与编辑器插件市场仍未实现。版本规则见[发布规则](docs/RELEASE-POLICY.md)。

## 启动桌面编辑器

Windows 双击 **HUANDENG Editor** 快捷方式，或运行 `Start-Huandeng.cmd`。应用使用独立 Electron 窗口；启动时恢复最近打开的 Project 标签页，Home 始终提供最近项目、新建与打开入口。

通过 Home 或 File 的打开入口选择 `.pptd`，也可以用“打开项目文件夹”选择包含它的目录。目录的直接子级必须恰有一个 `.pptd`；零个或多个都会明确报错，不猜选入口。已打开的同一项目会回到原标签页。“新建项目”创建独立文件夹、manifest 和空白 `.page`。文件夹可以有 `.huandeng` 等可读后缀；它仍是普通目录，资源管理器双击仍打开文件夹。现有项目可从左上角的应用菜单进入 File / 文件，显式设置产品图标；已有自定义图标会保留。见 [项目文件夹](docs/PROJECT-FOLDERS.md)。

开发启动需要 Node 22.12+ 和 pnpm 10.17.0：

    corepack pnpm install --frozen-lockfile
    corepack pnpm --filter @open-slide/core build
    corepack pnpm desktop

core build 同时生成正式编辑器前端。需要前端源码热更新时，设置 `HUANDENG_DEV_SERVER=1` 再启动桌面或 CLI 开发服务。

Windows 桌面打包与快捷方式：

    powershell -NoProfile -File scripts/Package-Huandeng.ps1
    powershell -NoProfile -File scripts/Install-Huandeng.ps1

完整桌面产物在 `dist/HUANDENG-win32-x64/HUANDENG Editor.exe`。打包时也可用 `-ElectronRuntimePath` 指定已安装的 Electron 38.7.2 运行目录。详见 [桌面说明](packages/desktop/README.md)。

升级后正常关闭旧 Editor，再打开新版本并刷新现有 Agent 连接。如果曾注册运行时位置，也需更新这个回退指针；安装快捷方式不会自动更新它：

    node plugins/huandeng/scripts/register-runtime.mjs --install-dir "D:/_Proj/Huandeng/dist/HUANDENG-win32-x64"

命令中的目录换成实际新安装目录。已运行的新 Editor 优先参与发现；没有 GUI 时，旧的注册指针仍可能指向保留的旧版。手工固定了旧 executable/CLI 路径的客户端配置也应重新生成。见 [0.19 原生集成](docs/NATIVE-INTEGRATION-0.19.md)。

内部 React 画布和本机文档服务继续复用；日常使用不打开浏览器标签。外部 Agent 通过同一服务操作当前项目，编辑器内没有聊天框或模型执行器。

CLI 可以安全新建项目，再打开共享服务；新建命令拒绝覆盖已有目录：

    node packages/core/huandeng.js init "D:/MyProject/Slides" --title "My Slides"
    node packages/core/huandeng.js open "D:/MyProject/Slides" --no-browser

对已保存项目运行只读设计检查：

    node packages/core/huandeng.js --entry "D:/MyProject/Slides/deck.pptd" quality

`--read-only` 可只读查看而不初始化身份。PNG/PDF 导出使用安装的 Chromium/Chrome/Edge，或设置 `HUANDENG_BROWSER`。Windows 默认可使用 Edge。

## 文档与历史

- deck.pptd 决定页序。
- pages/*.page 保存原始内容；元素数组决定叠放顺序。
- .huandeng/project.json 保存稳定身份、Slide ID、兼容的 S 编号、Main Story、Sections、Presentation 编排及逐页设计注记。
- .huandeng/checkpoints/ 与 media/.huandeng-versions/ 保存命名页面版本及其素材，随项目目录迁移。
- media/、assets/ 保留素材。
- Exports/ 保存当前交付文件及导出报告。
- 操作历史、恢复日志和写入锁位于本机应用数据目录。它们不复制整套活动 deck。

打开可写文档会初始化缺失的身份文件；不会仅因打开而重写旧页面。文字或对象位置修改只保存目标页面。删除页面保留可恢复文件和 Slide ID；复制页面会分配新的身份。

GUI、CLI 和 MCP 使用同一个本地文档服务。请求携带读取时的版本；旧请求会报冲突，不自动覆盖新内容。任意外部程序直接写文件不属于这个协作协议；同一页有未保存草稿时，编辑器会保留草稿并提示冲突。

缩略图右键“查看历史版本”，输入名称并点击“记录页面版本”，才生成正式页面版本。普通拖动、改字仅自动保存工作稿；操作记录在单独标签中。命名版本保存当时的本地图片与有效主题，恢复只影响本页，不覆盖其他页面共享素材；项目整体复制后仍可恢复。

页码可在 Inspector 中明确选择 **Use Slide Position**，保存为 `main-position` 字段，显示当前 Main 顺序（包括隐藏页）。之后插入、删除和重排不会为了页码逐页改写内容或产生页面版本；普通数字文本仍保留作者原意。操作记录与命名版本单独保存当时的 Position 上下文，Notes、Story 和正文的真实变化继续可查。见 [Position fields](docs/POSITION-FIELDS.md)。

## Main Slides、Section 与 Presentation

每个 Project 有一份 Main Slides 库。在 Pages 的 Section 管理入口创建 Section，选择 First Slide，再 Save Project；正常编辑只使用 First Slide 到下一个 Section 的边界。边界保存稳定 Slide ID，成员按当前 Main 页序延伸到下一 Section 前，最后一段延伸到末页；首个 Section 前的 Slides 保持独立。可将覆盖首张 Main Slide 的开篇 Section 明确标为 Front matter，显示 Section 00；普通 Section 从 01 编号，Section ID 独立保持稳定。Pages 的箭头折叠成员并保留所点标题的位置，页间右键可插入 Slide 或 Create Section here。旧式固定范围和成员列表保留，只有明确操作才转换；缺失首页可从 Review Sections 修复。创建 Presentation 后用 Add slides or Sections 按缩略图、标题和悬停/聚焦预览选择来源。每个 Presentation 按自己的顺序引用整个 Section 或单页；同一页可重复使用，每次可写不同备注。默认跟随 Main 更新，命名版本可固定为只读旧版。

项目概览可以直接进入主库的各场衍生演讲，当前页的使用位置能跳到准确的那一次出现。`pageId`/Slide ID表示页面内容，`occurrenceId` 表示某次引用，当前位置随编排改变。显式单页引用可以分别设置讲稿和固定版本；整章动态引用需要先“拆为独立页面引用”再逐页设置。

在顶部 collection 选择器切换 Main Slides 或 Presentation。预览、放映与导出使用所选集合。缺少引用或项目编排有未保存草稿时，会阻止不完整交付。编排使用显式 Save Project；保存同一 collection 保留当前 Slide 和 occurrence。页面内容继续自动保存，Save slides / Ctrl+S 可主动保存页面编辑。详见 [项目与演讲指南](docs/PROJECTS.md)。

## 画布编辑

文字、形状和线条先选择工具，再在画布点击或拖拽放置。点击采用默认尺寸，拖拽决定大小；形状菜单提供现有全部种类。Shift 约束形状比例和线条方向，Esc 取消插入。文字放置后自动进入编辑；V / T / R / L 分别切换选择、文字、矩形、线条，输入文字时不会触发画布快捷键。

缩略图分别显示 Position 和稳定 Slide ID。可搜索 Slide ID、旧 S 编号或标题，右键 Copy Slide ID 用于定位与沟通。对象新增和删除的画面反馈与持久化状态分别更新；“已保存”仍以本地文档服务的确认结果为准。

Pages 的 **Outline** 按 Section 展示 Slide 标题及 Story/正文摘要，与 Thumbnails 共用选中项、页序、折叠与搜索。它用于浏览结构；完整正文与 Story 仍在对应的编辑入口修改。

Workspace settings 中的 Snap 控制智能辅助线并保存偏好。拖动按边、中心和相等空隙定位，Alt 本次暂停、Shift 锁定方向、Esc 取消。旋转对象按可见外框参与排列。右侧属性可选“所选对象 / 幻灯片”作为对齐参照；至少三个根对象时启用水平/垂直均匀分布，一次排列可用一次 Undo 撤回。

画布 Tab / Shift+Tab 遍历顶层对象，方向键移动 1 单位、Shift 10 单位，Enter 编辑文字，Esc 返回或取消当前手势。F6 / Shift+F6 在工作区之间移动，F1 查看帮助；缩略图支持方向键和 Home/End。文字、表格和属性输入继续保留自己的键盘语义。

Inspector 的 Quick Layout 可明确选择 Reference Slide 与标题，检查 Captured reference style 后应用到当前独立标题；保留目标文字、语义强调和其他对象，支持一次 Undo。参考页变化后使用 Refresh reference style 重新捕获。字体预设保留自定义输入；Workspace settings → Fonts 显示样例，Check local fonts 只在点击后检查，无法取得许可时显示 unverified。

文字编辑时选中词句，右键 Text color / Highlight 只改变该范围；Ctrl+滚轮在画布内缩放，普通与 Shift 滚轮继续滚动。对象右键提供 B/I/U、字号、颜色、Bring forward / Send backward / Bring to front / Send to back 等常用操作，并与快捷键和 Undo 共用实现。完整属性在 Inspector 的 Properties；Layers、Story、Checks 分页展示并保留输入草稿。Notes 从工具栏打开，可拖动边缘改变大小并在底部/右侧停靠；左右侧栏在各自边缘收起、展开和调整宽度。

文件长期被占用而导致保存未完成时，界面保留本地草稿并显示“恢复未完成保存”。解除文件占用后可在当前窗口恢复，原请求确认后继续保存后续输入，再正常关闭或切换项目。如果文件或保存记录与预期不一致，恢复会停止，保留现场；可先“复制待保存页面”并检查恢复详情。该操作不会强行覆盖外部内容。

## 素材、演讲步骤与检查

左侧 Assets 是统一素材库，索引 Project media/assets 和当前引用，支持原文件名搜索、预览、使用位置、定位和复用。默认只显示可放置的图片，JSON/Python 等支持文件保留在 Files / All files。Files 中的图片和支持的文本在中央文档标签页只读预览，Slides 标签保留原画布，Inspector 与 Notes 草稿也保留；Markdown、JSON、命令文件按源文本显示，不执行。画布 Image 工具提供直接导入入口。“从设备导入”与“导入并放置”把选择的图片添加到当前页，拖放和粘贴继续可用。缺图可通过“重新选择这处图片”修复，保留对象位置、裁切和其他属性；原素材与命名版本不被覆盖。“未使用”仅指当前 Main 未引用，不是可安全删除的判断。

选中对象后打开画布工具栏的 Animation，添加效果并用“单击时”“与上一项同时”“上一项之后”组织演讲步骤。多选默认同次播放，时长/延迟用秒，移动为相对距离；“逐步预演”收起作者控件并展示真实开场，返回后恢复输入。新步骤可以明确转换到高级关键帧时间线，旧 v1 文档沿用原编辑方式；两种模式都参与保存、Undo/Redo、复制和命名版本。

桌面版 Present / F5 直接进入原生全屏；F5 从序列开头放映，Shift+F5 从当前页放映。底部控制栏默认隐藏，接近底边或键盘聚焦时显示，离开后收起。画面点击、Enter、空格和前进键播放下一步，播放中再前进完成本步，本页完成后再换页。后退可回前一步或上一页末态；F 切换全屏，B/句点黑屏暂停，Esc 退出，F1 查看帮助。每页可选淡化换页。备注/下一页仍在同一窗口，独立双屏尚未完成。

PNG/PDF/PPTX 输出基础静态版式，原生 PowerPoint 动画尚未实现。已有 MP4 输出保留，提供 720p/1080p、24/30fps、静页/末态/步骤停留、进度和取消，无音轨和页面转场；需要带 libx264 的 FFmpeg。GIF 等素材在放映中仍自主播放，尚未与步骤时钟统一；视频输出会明确拒绝自主动画素材。操作和边界见 [动画指南](docs/ANIMATION.md)。

Inspector 的 Checks 可按需核对本机字体与有效回退，并测量文字、公式、表格的局部内容范围。结果可以定位到对象，文档改变后显示过期状态；不会自动缩字或重排。它不代替 Office 的最终排版验证。

## Agent 使用

先打开桌面项目，再连接当前文档。Agent 先记录 Story 中的需求理解与保留约束，随后执行内容修改；用户无需在编辑器里手填意图：

    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd inspect
    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd inspect K7M2
    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd story Q9R4 intent.json
    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd preview transaction.json
    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd apply transaction.json
    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd render K7M2
    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd history Q9R4
    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd export pptx

事务 JSON 使用 inspect 实际返回的 deckId、pageId 和版本。请求结构见 docs/SPEC.md。一个请求 ID 只对应一次确定的修改，重试时保持请求 ID 和全部内容相同。版本冲突后重新读取和检查差异。页序或身份/组件元数据变化也必须提供相应 manifest/metadata 版本。

在顶栏“助手连接”或原生菜单打开连接面板，选择 Codex、Claude Code、DeepSeek Harness 或 ChatGPT 工作站通道，复制当前项目配置。正式包携带 Plugin 及运行时，使用安装程序自身 Electron Node 模式。配置生成不覆盖客户端设置，也不表示已经连接。

打开顶部 **Activity** 可查看当前 Project 的任务阶段与实际写入记录。不同对话必须明确绑定各自的 PPTD；切换可见标签页不会改变已经绑定的 Agent 目标。Activity 展示客户端明确上报的状态，不会自动读取全部聊天或显示模型内部推理。

MCP 现有 **22 个工具、2 个 Story/operations 指南资源**。Activity read/report 允许客户端按明确 Project、session 和 task 上报进展；writer 保存记录与客户端报告分开标识。Agent 先读 selection 与四层 Story briefing，结合邻页、实例备注、固定版本和素材形成计划，再用只读 preview 查看字段/文件/复用影响。按当前任务授权应用相同 payload，可用 previewHash 绑定内容；共享 writer 继续检查 CAS 与幂等请求。保存后回读、渲染并检查实际讲解顺序。hash 不能替代用户授权。

0.19 的正式 DeepSeek bundle 已在官方 Desktop 与 headless 路径加载；Claude Code / Codex 的默认安装与共同 24 文件包核对一致。ChatGPT 通过已有授权 DC-WALT 调用同一 CLI。本轮真实 DSH 与 ChatGPT 在同一项目完成不同页编辑、同页过期请求拒绝及重新读取后的视觉交接。分别安排 section 不会产生隔离锁，共用 Story、章节或演讲结构仍需协调。配置、模型任务完成和页面质量分别验收，见 [原生集成与实测](docs/NATIVE-INTEGRATION-0.19.md)及 [Plugin 指南](plugins/huandeng/README.md)。

## 科学内容和设计

工具栏“数据”可插入合并表格、LaTeX 公式、本地图标，图表子菜单提供 13 类图表；常用图形、组合及图片导入共用页面编辑与撤销。图表支持从 Excel 粘贴 TSV/CSV 数据，并保留尚未应用的数据草稿。PPTX 对支持的表格、公式、6 类基础图表及连续组合写入原生可编辑对象；其他对象的图像回退会列入导出报告。详细操作与兼容范围见 [科研对象指南](docs/SCIENTIFIC-OBJECTS.md) 和 [PowerPoint 差异审计](docs/POWERPOINT-COMPARISON.md)。

开发样例图形用于软件验证，不是研究结果。Agent 不得凭空补数据、改实验标签、替换原图或制造作者批准。先读页面的 designIntent、素材来源及角色，再局部修改。允许有意的不对称、疏密变化和留白。

“快速布局”（原“布局起点”）是可选生成辅助，结果保存为普通 PPTD 对象。手动调整过的几何、裁切或字体成为覆盖项，再次应用时尊重这些覆盖；也可直接解除关联，保留所有对象和当前布局。

## 开发与验证

    corepack pnpm --filter @open-slide/core typecheck
    corepack pnpm exec vitest run --project unit
    corepack pnpm check

完整产品规划见 [Master SPEC](docs/SPEC.md)，编辑器增量见 [SPEC-V018](docs/SPEC-V018.md)。当前介绍稿、目录入口与原生插件约定见 [产品 Spec](docs/PRODUCT-INTRODUCTION-SPEC.md)，实际结果见 [产品验证](docs/PRODUCT-INTRODUCTION-VALIDATION.md)、[Editor 验证](docs/EDITOR-0.19-VALIDATION.md)、[原生集成](docs/NATIVE-INTEGRATION-0.19.md)与 [0.19 发布记录](docs/RELEASE-V019.md)。历史验收见 [v0.4](docs/RELEASE-V04.md)、[v0.5](docs/RELEASE-V05.md)、[v0.6](docs/RELEASE-V06.md)、[v0.7](docs/RELEASE-V07.md)、[v0.8](docs/RELEASE-V08.md)、[v0.9](docs/RELEASE-V09.md)、[v0.10](docs/RELEASE-V010.md)、[v0.11](docs/RELEASE-V011.md)、[v0.12](docs/RELEASE-V012.md)、[v0.12.1](docs/RELEASE-V0121.md)、[v0.13](docs/RELEASE-V013.md)及 [Editor 0.18.0 历史发布](docs/RELEASE-V018.md)。工程接续入口是 [WEBCHAT.md](WEBCHAT.md)和[0.19 交接](docs/HANDOFF-V019.md)。

里程碑运行单元测试、类型和格式检查，并检查实际构建与安装。桌面、科研对象、原生 PowerPoint 和真实科研项目副本的场景按具体变更风险选择，不在每次开发中重复全部压力矩阵。日常小修改只重复能够验证相应风险的检查。

## 来源与许可

基于 [OpenSlide](https://github.com/open-slide/open-slide) commit 327dd09bcd530eb97647fc33fa67e99f8137d860，MIT 许可。保留原作者声明和上游包名作为兼容标识。上游原始说明见 docs/UPSTREAM_README.md。HUANDENG 是本工程的产品命名，不表示上游官方项目或官方 PPTD 标准。
