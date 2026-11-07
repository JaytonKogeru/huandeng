# Huandeng Editor · 幻灯编辑器

让人与 Agent 在同一份幻灯文档上工作。

Huandeng Editor 基于 OpenSlide 的 React 编辑环境，新增 PPTD 文档后端。页面用永久 ID 和四位短码定位；内容保存在原来的独立 .page 文件中。标题、位置改变，页面身份不变。Huandeng Frame 记录叙事目的、证据角色和作者希望保留的设计。Huandeng Plugin 提供与可视化编辑器共用的 Agent 接口。

## 启动

需要 Node 22.12+ 和 pnpm 10.17.0。固定上游和依赖版本记录在 docs/SPEC.md 及锁文件。

    corepack pnpm install --frozen-lockfile
    corepack pnpm --filter @open-slide/core build
    corepack pnpm huandeng open tests/fixtures/studio/deck.pptd

Windows 可以运行 Start-Huandeng.cmd。首次使用打开仓库内的开发样例。要打开自己的文件：

    node packages/core/huandeng.js open "D:/MyProject/Slides/deck.pptd"

只读查看不会初始化身份或写入文档：

    node packages/core/huandeng.js open "D:/MyProject/Slides/deck.pptd" --read-only

默认地址为 http://127.0.0.1:4850/huandeng。服务只监听本机。PNG/PDF 导出需要 Chromium、Chrome 或 Edge；Windows 优先使用已安装的 Edge，Linux 使用 /usr/bin/chromium，也可设 HUANDENG_BROWSER。

## 文档与历史

- deck.pptd 决定页序。
- pages/*.page 保存原始内容；元素数组决定叠放顺序。
- .huandeng/project.json 保存稳定身份、短码及设计注记。
- media/、assets/ 保留素材。
- Exports/ 保存当前交付文件及导出报告。
- 操作历史、恢复日志和写入锁位于本机应用数据目录。它们不复制整套活动 deck。

打开可写文档会初始化缺失的身份文件；不会仅因打开而重写旧页面。普通文本或位置修改只保存目标页面。删除页面保留可恢复文件和短码；复制页面会分配新的身份。

GUI、CLI 和 MCP 使用同一个本地文档服务。请求携带读取时的版本；旧请求会报冲突，不自动覆盖新内容。任意外部程序直接写文件不属于这个协作协议；同一页有未保存草稿时，编辑器会保留草稿并提示冲突。

## Agent 使用

先打开编辑器，再连接当前文档：

    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd inspect
    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd inspect K7M2
    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd apply transaction.json
    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd render K7M2
    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd history
    node packages/core/huandeng.js --entry tests/fixtures/studio/deck.pptd export pptx

事务 JSON 使用 inspect 实际返回的 deckId、pageId 和版本。请求结构见 docs/SPEC.md。一个请求 ID 只对应一次确定的修改，重试时保持请求 ID 和全部内容相同。版本冲突后重新读取和检查差异。页序或身份/组件元数据变化也必须提供相应 manifest/metadata 版本。

MCP 配置见 plugins/huandeng/mcp.example.json。网页 ChatGPT 可通过已有 DC-WALT 调用同一 CLI；无需启动另一个模型或公开本地服务。

## 科学内容和设计

开发样例图形用于软件验证，不是研究结果。Agent 不得凭空补数据、改实验标签、替换原图或制造作者批准。先读页面的 designIntent、素材来源及角色，再局部修改。允许有意的不对称、疏密变化和留白。

三个固定槽位 recipe 用普通 PPTD 对象保存结果。手动调整过的几何、裁切或字体成为覆盖项，再次应用 recipe 尊重这些覆盖。删掉的槽位不会悄悄复活。

## 开发与验证

    corepack pnpm --filter @open-slide/core typecheck
    corepack pnpm exec vitest run --project unit packages/core/src/pptd
    corepack pnpm check

实际验证和未实现边界见 docs/IMPLEMENTATION.md。实施合同见 docs/SPEC.md，工程接续入口是 WEBCHAT.md。

## 来源与许可

基于 [OpenSlide](https://github.com/open-slide/open-slide) commit 327dd09bcd530eb97647fc33fa67e99f8137d860，MIT 许可。保留原作者声明和上游包名作为兼容标识。上游原始说明见 docs/UPSTREAM_README.md。Huandeng 是本工程的产品命名，不表示上游官方项目或官方 PPTD 标准。
