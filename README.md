# HUANDING Editor

让人与 Agent 在同一份幻灯文档上工作。

HUANDING Editor 基于 OpenSlide 的 React 编辑环境，新增 PPTD 文档后端。页面用永久 ID 和四位短码定位；内容保存在原来的独立 .page 文件中。标题、位置改变，页面身份不变。HUANDING Story 记录叙事目的、证据角色和作者希望保留的设计。HUANDING Plugin 提供与可视化编辑器共用的 Agent 接口。

## GitHub 版本管理

编辑器源代码在 HUANDING 自己的 Git 仓库中维护；平时本地提交，完成并验收一个重要版本后再统一推送到 origin，不会每次小改都上传。OpenSlide 原始仓库保留为 upstream，不向其推送。本机页面右键历史与 Git 代码版本是两套不同机制。

参阅 [版本发布规则](docs/RELEASE-POLICY.md) 和 [Story 设计](docs/STORY.md)。
## 启动桌面编辑器

Windows 双击 **HUANDING Editor** 快捷方式，或运行 `Start-Huanding.cmd`（旧 `Start-Huandeng.cmd` 保留兼容）。应用使用独立 Electron 窗口；启动时恢复最近项目，首次打开显示新建/打开入口。

通过窗口的“打开项目”选择自己的 `deck.pptd`。“新建项目”创建独立文件夹、manifest 和空白 `.page`。不默认打开仓库示例。已有项目不需要复制进软件目录。

开发启动需要 Node 22.12+ 和 pnpm 10.17.0：

    corepack pnpm install --frozen-lockfile
    corepack pnpm --filter @open-slide/core build
    corepack pnpm desktop

Windows 桌面打包与快捷方式：

    powershell -NoProfile -File scripts/Package-Huanding.ps1
    powershell -NoProfile -File scripts/Install-Huanding.ps1

完整桌面产物在 `dist/HUANDING-win32-x64/HUANDING Editor.exe`。打包时也可用 `-ElectronRuntimePath` 指定已安装的 Electron 38.7.2 运行目录。详见 [桌面说明](packages/desktop/README.md)。

内部 React 画布和本机文档服务继续复用；日常使用不打开浏览器标签。外部 Agent 通过同一服务操作当前项目，编辑器内没有聊天框或模型执行器。

CLI 开发服务仍可单独启动：

    node packages/core/huanding.js open "D:/MyProject/Slides/deck.pptd" --no-browser

`--read-only` 可只读查看而不初始化身份。PNG/PDF 导出使用安装的 Chromium/Chrome/Edge，或设置 `HUANDENG_BROWSER`。Windows 默认可使用 Edge。

## 文档与历史

- deck.pptd 决定页序。
- pages/*.page 保存原始内容；元素数组决定叠放顺序。
- .huandeng/project.json 保存稳定身份、短码及设计注记。
- media/、assets/ 保留素材。
- Exports/ 保存当前交付文件及导出报告。
- 操作历史、恢复日志和写入锁位于本机应用数据目录。它们不复制整套活动 deck。

打开可写文档会初始化缺失的身份文件；不会仅因打开而重写旧页面。普通文本或位置修改只保存目标页面。删除页面保留可恢复文件和短码；复制页面会分配新的身份。

GUI、CLI 和 MCP 使用同一个本地文档服务。请求携带读取时的版本；旧请求会报冲突，不自动覆盖新内容。任意外部程序直接写文件不属于这个协作协议；同一页有未保存草稿时，编辑器会保留草稿并提示冲突。

缩略图右键“查看历史版本”可浏览该页的演进、预览旧版并恢复为新的当前版本。页序、短码和其他页保留。历史跨应用重启保留在本机；历史预览引用当前媒体。项目文件标签展示实际 `.pptd`、`.page`、media 和元数据，可直接定位对应页面及系统文件。

## Agent 使用

先打开桌面项目，再连接当前文档。Agent 先记录 Frame 中的需求理解与保留约束，随后执行内容修改；用户无需在编辑器里手填意图：

    node packages/core/huanding.js --entry tests/fixtures/studio/deck.pptd inspect
    node packages/core/huanding.js --entry tests/fixtures/studio/deck.pptd inspect K7M2
    node packages/core/huanding.js --entry tests/fixtures/studio/deck.pptd frame Q9R4 intent.json
    node packages/core/huanding.js --entry tests/fixtures/studio/deck.pptd apply transaction.json
    node packages/core/huanding.js --entry tests/fixtures/studio/deck.pptd render K7M2
    node packages/core/huanding.js --entry tests/fixtures/studio/deck.pptd history Q9R4
    node packages/core/huanding.js --entry tests/fixtures/studio/deck.pptd export pptx

事务 JSON 使用 inspect 实际返回的 deckId、pageId 和版本。请求结构见 docs/SPEC.md。一个请求 ID 只对应一次确定的修改，重试时保持请求 ID 和全部内容相同。版本冲突后重新读取和检查差异。页序或身份/组件元数据变化也必须提供相应 manifest/metadata 版本。

MCP 配置见 plugins/huandeng/mcp.example.json。网页 ChatGPT 可通过已有 DC-WALT 调用同一 CLI；无需启动另一个模型或公开本地服务。

## 科学内容和设计

开发样例图形用于软件验证，不是研究结果。Agent 不得凭空补数据、改实验标签、替换原图或制造作者批准。先读页面的 designIntent、素材来源及角色，再局部修改。允许有意的不对称、疏密变化和留白。

“布局起点”是可选生成辅助，结果保存为普通 PPTD 对象。手动调整过的几何、裁切或字体成为覆盖项，再次应用时尊重这些覆盖；也可直接解除关联，保留所有对象和当前布局。

## 开发与验证

    corepack pnpm --filter @open-slide/core typecheck
    corepack pnpm exec vitest run --project unit packages/core/src/pptd/store.test.ts packages/core/src/pptd/page-history.test.ts
    corepack pnpm check

v0.2 实际验证见 [实施记录](docs/IMPLEMENTATION-V02.md)，当前合同见 [SPEC-V02](docs/SPEC-V02.md)，旧编辑器的真实功能差异见 [核对记录](docs/LEGACY-COMPARISON.md)。工程接续入口是 WEBCHAT.md。

保持少量核心验证：页面保存与历史恢复、桌面新建/打开、外部 Agent 更新和重启。上游继承的测试不按每次改动全部运行。

## 来源与许可

基于 [OpenSlide](https://github.com/open-slide/open-slide) commit 327dd09bcd530eb97647fc33fa67e99f8137d860，MIT 许可。保留原作者声明和上游包名作为兼容标识。上游原始说明见 docs/UPSTREAM_README.md。HUANDING 是本工程的产品命名，不表示上游官方项目或官方 PPTD 标准。
