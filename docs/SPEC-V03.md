# HUANDENG v0.3 — 统一命名与科研对象兼容

> 历史规格：下文状态保留 v0.3 开发时点。后续安装、发布及对象能力以 [v0.4 发布记录](RELEASE-V04.md) 为准；当前产品覆盖与本轮工作见 [综合审计](AUDIT-V05-COVERAGE.md) 和 [v0.5 范围](SPEC-V05.md)。

日期：2026-11-07。基线：`aba68ccdf1b497c415b99b1832e7b37c27457d2e`。

**状态：候选版已在 THUG 实现并通过源码与 Windows 桌面验收；正式安装和 GitHub 里程碑发布按交接执行。**

## 产品约定

正式名称统一为 **HUANDENG Editor / HUANDENG Story / HUANDENG Plugin**。幻灯的拼音为 Huandeng；此前 Huanding 是语音输入错误。可见标题、帮助、CLI 主名、MCP tools/list、桌面包、启动脚本及快捷方式均使用 HUANDENG。

继续使用 Electron + React，不重选底层，不内嵌 AI 聊天框。PPTD 是唯一文档源；页面独立 `.page`、UUID/短码、图层、项目树、单页历史和自由排版保持现有行为。Story 仍由外部 Agent 记录。

## A. 命名修正

1. 原地将 GitHub `JaytonKogeru/huanding` 改名为 `JaytonKogeru/huandeng`，保留仓库 ID、提交历史、私有性；不创建第二仓库。
2. 修正桌面包名为 `@huandeng/desktop`，程序为 `HUANDENG Editor.exe`，构建目录为 `dist/HUANDENG-win32-x64`。旧拼写的脚本改为 DENG，合并已经存在的正确拼写入口，避免自调用和重复 JSON 键。
3. 主服务模块为 `pptd/story.ts`，主函数/类型为 `recordStory` / `StoryRecordRequest`；主 HTTP 路由 `/__pptd/story`，CLI 子命令 `story`，MCP 工具 `huandeng_story_record`。
4. `tools/list` 只报告正确拼写。旧 `huanding_*`、`huandeng_frame_record` 仅作为输入兼容别名；旧 `/frame` 路由和 `frame` CLI 别名仍调用相同逻辑，不复制一份状态。
5. 不更改 `.huandeng/project.json` 或 `designIntent` 数据结构，不批量迁移用户文稿。框架中的 `requestAnimationFrame`、`mainFrame`、几何 frame 不属于产品名称，不做替换。
6. 更换 Electron app name 后，只在新偏好文件不存在时复制旧 `preferences.json`；不移动用户项目，不覆盖新偏好。页面历史的 Huandeng runtime 目录继续使用。
7. 安装新快捷方式后，仅移除明确指向本工程旧二进制的错误拼写快捷方式。不强制退出正在编辑的应用，不更改旧 PPTD Editor 的默认文件关联。
8. 历史验收截图、旧 Git 提交及旧标签保持原样；不伪造历史证据中的名称。

## B. 表格兼容（先做）

采用旧 PPTD 格式：`elementType: table`、`rows`、`columnWidths`、`rowHeights`、`rowSpan/colSpan`。合并覆盖位置不占 rows 数组项。必须先还原网格，再绘制/编辑，不可直接把源数组索引当视觉列号。

本补丁已提供纯数据模块 `table-grid.ts`：还原网格、单元格源索引、合并范围、比例列宽、最小行高；不改动文档。**已接入 React renderer 和 Inspector，合并表格及单元格持久化已通过 Windows 实测。**

接续实现：
- 在 `app/components/pptd/renderer.tsx` 添加 TableContent 分支；读取真实主题 tableStyles，支持单元格文字、基础样式、合并、比例列宽和最小行高。长内容允许撑高，不能静默剪去文本。
- 在 Inspector 提供单元格内容修改；用 sourceIndex 修改原来的压缩行，保留未知字段、几何和所有 elementId。
- 表格整体沿用现有移动、缩放、旋转、图层和历史流程。
- 不支持的表格样式明确报告；不为通过检查偷偷把表格替换成图片。

## C. 公式兼容（随后做）

公式首先按旧文本格式处理，不先引入一套不兼容的新元素结构。保留原始 `content.text` 和 LaTeX 源码。

本补丁已提供 `math-fragments.ts`，识别 `\(...\)`、`\[...\]`、`$$...$$`，保留完整 raw 源文；单个美元符号不是公式。**已接入 KaTeX/MathML 渲染，并通过行内、块级公式与原始 LaTeX 保留测试。**

接续实现：
- 在已净化的富文本的文字节点内分段；不能对整个 HTML 使用会破坏标签的正则替换。
- 采用 KaTeX `renderToString` 的 `output: mathml` 模式；使用浏览器 MathML 显示，或依据实测选择 HTML 模式。版本需在实际环境核验并锁定。
- 公式错误显示源码和诊断，不显示空白，也不把错误默认为导出成功。
- 双击编辑保留 LaTeX 源，而非把渲染后的 MathML 写回。表格单元格复用同一文本渲染逻辑。
- PNG/PDF 必须验证实际渲染。PPTX 只有在已实现 OMML 时才标记原生可编辑公式；图片回退必须明确记录。

## 验收与推送

命名验收：打开新 EXE、最近项目仍在、MCP 只列 DENG/Story、新旧调用写同一份元数据。

功能验收：一页含合并表格、行内公式和块级公式；修改单元格/LaTeX、保存、关闭重开、单页历史恢复；另一页及稳定 ID 不变。最后核对导出与原始文稿哈希。

只做相关模型测试、类型检查和一条真实桌面流程，不建跨产品 benchmark。完成可用里程碑后再本地提交、推送 origin 并建新的版本标签；不得向 upstream 推送、改写旧标签或自动 npm 发布。代码与候选桌面验收已通过；正式发布仍以安装、远端 SHA 和 CI 验证为最终门槛。

## 参考

旧实现：`<legacy-editor-checkout>/apps/pptd-desktop/vendor/open-pptd/packages/model/{table,latex}.js`，以及 `packages/renderer/{table,text}.js`。旧项目只读。

KaTeX API：<https://katex.org/docs/options.html>。GitHub rename：<https://cli.github.com/manual/gh_repo_rename>。
