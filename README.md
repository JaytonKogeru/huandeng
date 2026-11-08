# HUANDENG Editor

让人与 Agent 在同一份幻灯文档上工作。

HUANDENG Editor 基于 OpenSlide 的 React 编辑环境，使用 PPTD 文档后端。页面使用永久 ID，界面以四位随机短码显示身份，当前位置单独显示；已有 S1、S2 等别名继续兼容。内容保存在原来的独立 .page 文件中。标题、位置改变，页面身份不变。HUANDENG Story 记录全项目、章节、演讲的叙事目的，以及逐页证据角色和设计意图。HUANDENG Plugin 提供与可视化编辑器共用的 Agent 接口。

## 当前阶段

当前交付版本为 **[v0.9.0：中英文编辑、智能排列与 Story Plugin](docs/RELEASE-V09.md)**。干净运行时 `17de86d` 已安装到既有正式位置，桌面和开始菜单入口继续使用，里程碑标识为 `editor-v0.9.0`。

本轮可从顶栏、原生菜单或欢迎页切换 English / 简体中文；语言偏好跨项目重开保留，作者正文与草稿保持原文。拖动支持边/中心与等距辅助线、组合排除、Shift 轴锁、Alt 暂停；属性面板补齐选区/整页对齐与水平/垂直均匀分布。

项目面板的“连接 Agent”生成当前项目配置。共用 Story skill 与预览/精确应用协议贯通外部客户端，官方 DeepSeek Harness 已完成真实 Story 制作任务。Codex 配置解析、Claude manifest 校验及 ChatGPT 的已有 DC-WALT 通道分别记录验证层级，不把配置生成当作已连接。

既有点击动画、逐步预演、现场回退、独立页面身份、命名版本、素材库和演讲复用继续保留。接下来优先改善创作空间、锁定/隐藏、精细图层、交互裁剪和段落，再推进独立演讲者工作区、受控媒体、实例视觉变体与原生 PPTX 动画。对照 PowerPoint 的已完成/部分/未完成项见 [综合审计](docs/AUDIT-V09.md)。

Linux **1,006 / 1,006**；Windows **1,005 pass + 1 POSIX-only skip**，88 个测试文件；类型与 Biome 通过。最终 EXE **12 / 12** 聚焦场景、包内 Plugin doctor 和实际安装通过。普通 profile 已重开 80 页项目；旧窗口现有编排草稿先备份并正常保存，后续安装/重开的当前82源文件均保持一致。完整范围和保留的失败回执见 [Validation](docs/VALIDATION-V09.md)。

v0.8 已纠正旧内存数据受到 Network 检查器响应保留影响的解释；本轮没有新增长会话性能结论。PPTX/PDF/PNG 仍输出基础静态画面，原生 PowerPoint 动画尚未实现。版本标识规则与四层 Story 见 [发布规则](docs/RELEASE-POLICY.md)、[Story 设计](docs/STORY.md)。

## 启动桌面编辑器

Windows 双击 **HUANDENG Editor** 快捷方式，或运行 `Start-Huandeng.cmd`。应用使用独立 Electron 窗口；启动时恢复最近项目，首次打开显示新建/打开入口。

通过窗口的“打开项目”选择自己的 `deck.pptd`。“新建项目”创建独立文件夹、manifest 和空白 `.page`。不默认打开仓库示例。已有项目不需要复制进软件目录。

开发启动需要 Node 22.12+ 和 pnpm 10.17.0：

    corepack pnpm install --frozen-lockfile
    corepack pnpm --filter @open-slide/core build
    corepack pnpm desktop

core build 同时生成正式编辑器前端。需要前端源码热更新时，设置 `HUANDENG_DEV_SERVER=1` 再启动桌面或 CLI 开发服务。

Windows 桌面打包与快捷方式：

    powershell -NoProfile -File scripts/Package-Huandeng.ps1
    powershell -NoProfile -File scripts/Install-Huandeng.ps1

完整桌面产物在 `dist/HUANDENG-win32-x64/HUANDENG Editor.exe`。打包时也可用 `-ElectronRuntimePath` 指定已安装的 Electron 38.7.2 运行目录。详见 [桌面说明](packages/desktop/README.md)。

内部 React 画布和本机文档服务继续复用；日常使用不打开浏览器标签。外部 Agent 通过同一服务操作当前项目，编辑器内没有聊天框或模型执行器。

CLI 开发服务仍可单独启动：

    node packages/core/huandeng.js open "D:/MyProject/Slides/deck.pptd" --no-browser

`--read-only` 可只读查看而不初始化身份。PNG/PDF 导出使用安装的 Chromium/Chrome/Edge，或设置 `HUANDENG_BROWSER`。Windows 默认可使用 Edge。

## 文档与历史

- deck.pptd 决定页序。
- pages/*.page 保存原始内容；元素数组决定叠放顺序。
- .huandeng/project.json 保存稳定身份、短码、兼容的 S 编号、Main Story、Sections、Presentation 编排及逐页设计注记。
- .huandeng/checkpoints/ 与 media/.huandeng-versions/ 保存命名页面版本及其素材，随项目目录迁移。
- media/、assets/ 保留素材。
- Exports/ 保存当前交付文件及导出报告。
- 操作历史、恢复日志和写入锁位于本机应用数据目录。它们不复制整套活动 deck。

打开可写文档会初始化缺失的身份文件；不会仅因打开而重写旧页面。普通文本或位置修改只保存目标页面。删除页面保留可恢复文件和短码；复制页面会分配新的身份。

GUI、CLI 和 MCP 使用同一个本地文档服务。请求携带读取时的版本；旧请求会报冲突，不自动覆盖新内容。任意外部程序直接写文件不属于这个协作协议；同一页有未保存草稿时，编辑器会保留草稿并提示冲突。

缩略图右键“查看历史版本”，输入名称并点击“记录页面版本”，才生成正式页面版本。普通拖动、改字仅自动保存工作稿；操作记录在单独标签中。命名版本保存当时的本地图片与有效主题，恢复只影响本页，不覆盖其他页面共享素材；项目整体复制后仍可恢复。

## Main Slides 与多个演讲

每个项目只有一份主幻灯片库（Main Slides）。左侧“项目与故事”可建立章节，并创建多个演讲幻灯片集合（Presentation Slides），按自己的顺序引用整节或单页。同一页可重复使用，每次出现可写不同备注。默认跟随主库更新；选择命名版本后，演讲中的该页固定为只读旧版。

项目概览可以直接进入主库的各场衍生演讲，当前页的使用位置能跳到准确的那一次出现。`pageId`/短码表示页面内容，`occurrenceId` 表示某次引用，当前位置随编排改变。显式单页引用可以分别设置讲稿和固定版本；整章动态引用需要先“拆为独立页面引用”再逐页设置。

在顶部“当前演讲集合”切换主幻灯片或某场演讲。预览、放映与导出使用所选集合。缺少引用或项目编排有未保存草稿时，会阻止不完整交付。编排使用显式“保存项目”；页面内容仍自动保存。详见 [项目与演讲指南](docs/PROJECTS.md)。

## 画布编辑

文字、形状和线条先选择工具，再在画布点击或拖拽放置。点击采用默认尺寸，拖拽决定大小；形状菜单提供现有全部种类。Shift 约束形状比例和线条方向，Esc 取消插入。文字放置后自动进入编辑；V / T / R / L 分别切换选择、文字、矩形、线条，输入文字时不会触发画布快捷键。

缩略图分别显示当前页序和稳定短码。可搜索短码、旧 S 编号或标题，右键“复制页面短码”用于定位与沟通。对象新增和删除的画面反馈与持久化状态分别更新；“已保存”仍以本地文档服务的确认结果为准。

画布下方“吸附”控制智能辅助线并保存偏好。拖动按边、中心和相等空隙定位，Alt 本次暂停、Shift 锁定方向、Esc 取消。旋转对象按可见外框参与排列。右侧属性可选“所选对象 / 幻灯片”作为对齐参照；至少三个根对象时启用水平/垂直均匀分布，一次排列可用一次 Undo 撤回。

画布 Tab / Shift+Tab 遍历顶层对象，方向键移动 1 单位、Shift 10 单位，Enter 编辑文字，Esc 返回或取消当前手势。F6 / Shift+F6 在工作区之间移动，F1 查看帮助；缩略图支持方向键和 Home/End。文字、表格和属性输入继续保留自己的键盘语义。

文件长期被占用而导致保存未完成时，界面保留本地草稿并显示“恢复未完成保存”。解除文件占用后可在当前窗口恢复，原请求确认后继续保存后续输入，再正常关闭或切换项目。如果文件或保存记录与预期不一致，恢复会停止，保留现场；可先“复制待保存页面”并检查恢复详情。该操作不会强行覆盖外部内容。

## 素材、演讲步骤与检查

左侧及工具栏“素材”进入同一素材库，索引项目 media/assets 和当前引用，支持原文件名搜索、预览、使用位置、定位和复用。“从设备导入”与“导入并放置”把选择的图片添加到当前页，拖放和粘贴继续可用。缺图可通过“重新选择这处图片”修复，保留对象位置、裁切和其他属性；原素材与命名版本不被覆盖。“未使用”仅指当前 Main 未引用，不是可安全删除的判断。

选中对象后打开画布下方“动画”，添加效果并用“单击时”“与上一项同时”“上一项之后”组织演讲步骤。多选默认同次播放，时长/延迟用秒，移动为相对距离；“逐步预演”收起作者控件并展示真实开场，返回后恢复输入。新步骤可以明确转换到高级关键帧时间线，旧 v1 文档沿用原编辑方式；两种模式都参与保存、Undo/Redo、复制和命名版本。

F5 从序列开头放映，Shift+F5 从当前页放映。画面点击、Enter、空格和前进键播放下一步，播放中再前进完成本步，本页完成后再换页。后退可回前一步或上一页末态；F 切换全屏，B/句点黑屏暂停，Esc 退出，F1 查看帮助。每页可选淡化换页。备注/下一页仍在同一窗口，独立双屏尚未完成。

PNG/PDF/PPTX 输出基础静态版式，原生 PowerPoint 动画尚未实现。已有 MP4 输出保留，提供 720p/1080p、24/30fps、静页/末态/步骤停留、进度和取消，无音轨和页面转场；需要带 libx264 的 FFmpeg。GIF 等素材在放映中仍自主播放，尚未与步骤时钟统一；视频输出会明确拒绝自主动画素材。操作和边界见 [动画指南](docs/ANIMATION.md)。

右侧技术检查可按需核对本机字体与有效回退，并测量文字、公式、表格的局部内容范围。结果可以定位到对象，文档改变后显示过期状态；不会自动缩字或重排。它不代替 Office 的最终排版验证。

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

在项目面板或原生菜单打开“连接 Agent”，选择 Codex、Claude Code、DeepSeek Harness 或 ChatGPT 工作站通道，复制当前项目配置。正式包携带 Plugin 及运行时，使用安装程序自身 Electron Node 模式。配置生成不覆盖客户端设置，也不表示已经连接。

MCP 现有 **18 个工具、2 个 Story/operations 指南资源**。Agent 先读 selection 与四层 Story briefing，结合邻页、实例备注、固定版本和素材形成计划，再用只读 preview 查看字段/文件/复用影响。按当前任务授权应用相同 payload，可用 previewHash 绑定内容；共享 writer 继续检查 CAS 与幂等请求。保存后回读、渲染并检查实际讲解顺序。hash 不能替代用户授权。

官方 DeepSeek Harness 已在独立合成项目完成读取 → preview → apply → render → 保存重开闭环；Codex 原生配置解析、Claude 原生 manifest 校验分别通过。ChatGPT 通过已有授权 DC-WALT 调用同一 CLI。具体安装方式、客户端边界和示例见 [Plugin 指南](plugins/huandeng/README.md) 与 [真实任务证据](docs/evidence/v09/plugin-acceptance.json)。

## 科学内容和设计

工具栏“数据”可插入合并表格、LaTeX 公式、本地图标，图表子菜单提供 13 类图表；常用图形、组合及图片导入共用页面编辑与撤销。图表支持从 Excel 粘贴 TSV/CSV 数据，并保留尚未应用的数据草稿。PPTX 对支持的表格、公式、6 类基础图表及连续组合写入原生可编辑对象；其他对象的图像回退会列入导出报告。详细操作与兼容范围见 [科研对象指南](docs/SCIENTIFIC-OBJECTS.md) 和 [PowerPoint 差异审计](docs/POWERPOINT-COMPARISON.md)。

开发样例图形用于软件验证，不是研究结果。Agent 不得凭空补数据、改实验标签、替换原图或制造作者批准。先读页面的 designIntent、素材来源及角色，再局部修改。允许有意的不对称、疏密变化和留白。

“快速布局”（原“布局起点”）是可选生成辅助，结果保存为普通 PPTD 对象。手动调整过的几何、裁切或字体成为覆盖项，再次应用时尊重这些覆盖；也可直接解除关联，保留所有对象和当前布局。

## 开发与验证

    corepack pnpm --filter @open-slide/core typecheck
    corepack pnpm exec vitest run --project unit
    corepack pnpm check

完整产品规划见 [Master SPEC](docs/SPEC.md)，当前增量见 [SPEC-V09](docs/SPEC-V09.md)，逐项状态见 [综合审计](docs/AUDIT-V09.md)。历史验收见 [v0.4](docs/RELEASE-V04.md)、[v0.5](docs/RELEASE-V05.md)、[v0.6](docs/RELEASE-V06.md)、[v0.7](docs/RELEASE-V07.md)，[v0.8](docs/RELEASE-V08.md)，本轮见 [v0.9 发布记录](docs/RELEASE-V09.md)。工程接续入口是 [WEBCHAT.md](WEBCHAT.md)。

里程碑运行单元测试、类型和格式检查，并检查实际构建与安装。桌面、科研对象、原生 PowerPoint 和真实科研项目副本的场景按具体变更风险选择，不在每次开发中重复全部压力矩阵。日常小修改只重复能够验证相应风险的检查。

## 来源与许可

基于 [OpenSlide](https://github.com/open-slide/open-slide) commit 327dd09bcd530eb97647fc33fa67e99f8137d860，MIT 许可。保留原作者声明和上游包名作为兼容标识。上游原始说明见 docs/UPSTREAM_README.md。HUANDENG 是本工程的产品命名，不表示上游官方项目或官方 PPTD 标准。
