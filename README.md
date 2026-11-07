# HUANDENG Editor

让人与 Agent 在同一份幻灯文档上工作。

HUANDENG Editor 基于 OpenSlide 的 React 编辑环境，使用 PPTD 文档后端。页面使用永久 ID，界面以四位随机短码显示身份，当前位置单独显示；已有 S1、S2 等别名继续兼容。内容保存在原来的独立 .page 文件中。标题、位置改变，页面身份不变。HUANDENG Story 记录全项目、章节、演讲的叙事目的，以及逐页证据角色和设计意图。HUANDENG Plugin 提供与可视化编辑器共用的 Agent 接口。

## 当前阶段

当前交付版本为 **[v0.5.0：日常编辑体验](docs/RELEASE-V05.md)**，运行时 `03a96957` 已安装到既有正式位置，桌面与开始菜单快捷方式已核对。常规用户 profile 已打开原 80 页项目，窗口可响应、项目可写、无诊断，82 份文档源文件 hash 不变；发行标识为 `editor-v0.5.0`。

本轮改善大项目响应、画布放置、页面身份、中文界面与异常保存恢复。正式程序包的 80 页项目首次可编辑约 **5.98 秒**，Delete 视觉中位 **27.4 ms**、落盘中位 **222.5 ms**；独立 20 轮连续操作通过。源码门槛为 Linux 800 项、Windows 799 项及 1 项 POSIX 专属跳过，实际 EXE 桌面 7/7、编辑器 8/8、恢复 6/6，正式路径安装和 About 版本检查均通过。测量使用本机隔离副本且未清空 OS 缓存，长期内存增长与字体/溢出诊断仍有明确的后续范围。本文说明对应当前源码。

[综合产品审计](docs/AUDIT-V05-COVERAGE.md) 合并初始 SPEC 与 v0.2–v0.4 的需求、实现和历史回执；[视觉与交互审计](docs/AUDIT-V05-VISUAL.md) 记录美术及界面判断；[保存恢复审计](docs/AUDIT-V05-RECOVERY.md) 保留失败发现、修复与验证来源；[v0.5 范围](docs/SPEC-V05.md) 定义本轮交付；[交接记录](docs/HANDOFF-V05.md) 保存当前完成度和下一步。

## GitHub 版本管理

编辑器源代码在 HUANDENG 自己的 Git 仓库中维护；平时本地提交，完成并验收一个重要版本后再统一推送到 origin，不会每次小改都上传。OpenSlide 原始仓库保留为 upstream，不向其推送。自动保存与撤销、用户命名的页面版本、Git 工程里程碑各自承担不同职责；记录或恢复页面版本不需要 Git。

参阅 [版本发布规则](docs/RELEASE-POLICY.md) 和 [Story 设计](docs/STORY.md)。

## 启动桌面编辑器

Windows 双击 **HUANDENG Editor** 快捷方式，或运行 `Start-Huandeng.cmd`。应用使用独立 Electron 窗口；启动时恢复最近项目，首次打开显示新建/打开入口。

通过窗口的“打开项目”选择自己的 `deck.pptd`。“新建项目”创建独立文件夹、manifest 和空白 `.page`。不默认打开仓库示例。已有项目不需要复制进软件目录。

开发启动需要 Node 22.12+ 和 pnpm 10.17.0：

    corepack pnpm install --frozen-lockfile
    corepack pnpm --filter @open-slide/core build
    corepack pnpm desktop

v0.5 的 core build 同时生成正式编辑器前端。需要前端源码热更新时，设置 `HUANDENG_DEV_SERVER=1` 再启动桌面或 CLI 开发服务。

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

在顶部“当前演讲集合”切换主幻灯片或某场演讲。预览、放映与导出使用所选集合。缺少引用或项目编排有未保存草稿时，会阻止不完整交付。编排使用显式“保存项目”；页面内容仍自动保存。详见 [项目与演讲指南](docs/PROJECTS.md)。

## 画布编辑

文字、形状和线条先选择工具，再在画布点击或拖拽放置。点击采用默认尺寸，拖拽决定大小；形状菜单提供现有全部种类。Shift 约束形状比例和线条方向，Esc 取消插入。文字放置后自动进入编辑；V / T / R / L 分别切换选择、文字、矩形、线条，输入文字时不会触发画布快捷键。

缩略图分别显示当前页序和稳定短码。可搜索短码、旧 S 编号或标题，右键“复制页面短码”用于定位与沟通。对象新增和删除的画面反馈与持久化状态分别更新；“已保存”仍以本地文档服务的确认结果为准。

文件长期被占用而导致保存未完成时，界面保留本地草稿并显示“恢复未完成保存”。解除文件占用后可在当前窗口恢复，原请求确认后继续保存后续输入，再正常关闭或切换项目。如果文件或保存记录与预期不一致，恢复会停止，保留现场；可先“复制待保存页面”并检查恢复详情。该操作不会强行覆盖外部内容。

## Agent 使用

先打开桌面项目，再连接当前文档。Agent 先记录 Story 中的需求理解与保留约束，随后执行内容修改；用户无需在编辑器里手填意图：

    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd inspect
    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd inspect K7M2
    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd story Q9R4 intent.json
    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd apply transaction.json
    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd render K7M2
    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd history Q9R4
    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd export pptx

事务 JSON 使用 inspect 实际返回的 deckId、pageId 和版本。请求结构见 docs/SPEC.md。一个请求 ID 只对应一次确定的修改，重试时保持请求 ID 和全部内容相同。版本冲突后重新读取和检查差异。页序或身份/组件元数据变化也必须提供相应 manifest/metadata 版本。

MCP 配置见 plugins/huandeng/mcp.example.json。网页 ChatGPT 可通过已有 DC-WALT 调用同一 CLI；无需启动另一个模型或公开本地服务。

## 科学内容和设计

工具栏“数据”可插入合并表格、LaTeX 公式、本地图标，图表子菜单提供 13 类图表；常用图形、组合及图片导入共用页面编辑与撤销。图表支持从 Excel 粘贴 TSV/CSV 数据，并保留尚未应用的数据草稿。PPTX 对支持的表格、公式、6 类基础图表及连续组合写入原生可编辑对象；其他对象的图像回退会列入导出报告。详细操作与兼容范围见 [科研对象指南](docs/SCIENTIFIC-OBJECTS.md) 和 [PowerPoint 差异审计](docs/POWERPOINT-COMPARISON.md)。

开发样例图形用于软件验证，不是研究结果。Agent 不得凭空补数据、改实验标签、替换原图或制造作者批准。先读页面的 designIntent、素材来源及角色，再局部修改。允许有意的不对称、疏密变化和留白。

“快速布局”（原“布局起点”）是可选生成辅助，结果保存为普通 PPTD 对象。手动调整过的几何、裁切或字体成为覆盖项，再次应用时尊重这些覆盖；也可直接解除关联，保留所有对象和当前布局。

## 开发与验证

    corepack pnpm --filter @open-slide/core typecheck
    corepack pnpm exec vitest run --project unit
    corepack pnpm check

完整产品规划见 [Master SPEC](docs/SPEC.md)，当前增量见 [SPEC-V05](docs/SPEC-V05.md)，逐项状态见 [综合审计](docs/AUDIT-V05-COVERAGE.md)。已完成的历史验收见 [v0.4 发布记录](docs/RELEASE-V04.md)，本轮正式验收见 [v0.5 发布记录](docs/RELEASE-V05.md)。工程接续入口是 [WEBCHAT.md](WEBCHAT.md)。

里程碑发布运行完整单元测试、类型和格式检查，并以实际桌面、项目编排、科研对象、原生 PowerPoint 及真实科研项目副本验收补足自动化覆盖。日常小修改只重复能够验证相应风险的检查。

## 来源与许可

基于 [OpenSlide](https://github.com/open-slide/open-slide) commit 327dd09bcd530eb97647fc33fa67e99f8137d860，MIT 许可。保留原作者声明和上游包名作为兼容标识。上游原始说明见 docs/UPSTREAM_README.md。HUANDENG 是本工程的产品命名，不表示上游官方项目或官方 PPTD 标准。
