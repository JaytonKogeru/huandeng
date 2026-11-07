# v0.5 候选验收证据

本目录保存可提交的安全摘要；原始运行 JSON、日志、研究项目副本及截图继续留在本地 `.verification`。摘要排除科研路径、标题、原文件列表、逐文件 hash、文档内容和截图，只保留软件行为、计数、计时、来源标识及原回执 SHA-256。

## 首轮候选来源

- 源基线：`8798d8f058dab89a80143e0c813780c8d87a70f9`。
- 候选传输包 SHA-256：`157272ec0f472923d2f185b19a614f6e15ad48d3d9c9931e575369cddda657ae`。
- 界面运行环境：Windows Electron 开发宿主，加载编译后的 production bundle；不是最终打包或安装回执。
- 背景导出脚本通过候选本地文档服务及浏览器导出渲染器运行，使用同一 production bundle。
- v0.4 性能基线使用正式已安装 EXE，运行时源码为 `c2fede5f45aa7a41e853304f9907c2d17e6bf8a2`。

传输摘要标识本次测试代码包，不等于 Git 提交。第二轮 UI 修复、writer 诊断修正与正式打包分别注明实际来源；不将这批 8 / 11 / 22 项检查重命名为最终程序包检查。验证脚本会复用本地输出路径；同名路径当前可能指向后续运行，准确批次以阶段、传输摘要与 `rawReceipt.sha256` 为准。

## 首轮已归档摘要

| 文件 | 结果 | 证据边界 |
| --- | --- | --- |
| [editor-acceptance.json](editor-acceptance.json) | 8/8，无 renderer error；1600×1000、1024×768、深色模式的实际窗口布局记录 | 独立三页合成项目；记录自动化布局/交互结果，截图不在此目录 |
| [project-acceptance.json](project-acceptance.json) | 11/11，无 renderer error | 合成项目中的章节、演讲、固定/重复引用、备注、历史和草稿保护 |
| [science-acceptance.json](science-acceptance.json) | 22/22，无 renderer error | 合成科学对象、数据编辑、素材导入及实际导出 |
| [background-export-acceptance.json](background-export-acceptance.json) | 2 个 occurrence、2 张背景栅格、8 张恢复后的前景栅格、2 个物理 PDF 页面 | 当前与固定版本、素材/主题归档、透明前景与可见溢出回归 |
| [performance-comparison.json](performance-comparison.json) | 两次正式 v0.4 与首轮 v0.5 候选的 80 页测量 | 同机、同材料隔离副本、未清空 OS 文件缓存；5 次操作样本，最终实际包复测待完成 |
| [real-project-acceptance.json](real-project-acceptance.json) | 80 页、1,452 个内容对象；7 组通过，970 个读入原文件 hash 不变，79 个兄弟页在恢复时不变 | 原 PDF/PPTX 导出、逐页 DOM 核查、单页记录与恢复；真实研究文件及图像不在此目录 |
| [native-office-acceptance.json](native-office-acceptance.json) | 5 页、6 个图表、1 个表格、1 个组合；表格/图表编辑后重开，5 个数学对象保留 | 实际 PowerPoint，禁用修复；生成器当时增加 Windows fileURL 适配，导出核心/前端属于首轮 |
| [real-office-acceptance.json](real-office-acceptance.json) | 80 页实际 Office 渲染，78 张 PNG 与已验收旧版字节相同，另外 2 页人工核查通过 | 页 3 原输入在本轮前已有矩形；页 29 仅边缘抗锯齿微小变化；原自动回执待人工字段与后续人工结论分开记录 |

`project-v04`、`science-v04` 是继续使用的验证脚本/输出目录名称。本目录相应摘要来自这轮 v0.5 候选运行，不是将旧 v0.4 回执重新命名。

## 第二轮来源与摘要

第二轮传输包 SHA-256 为 `afa888aebf145f5534fef829c3396e6f8b5364d7e4133203bc57f054da1cad6c`。界面仍在 Windows Electron 开发宿主上使用 production bundle；此轮修正后重新运行的结果独立存档，首轮结果没有被覆盖或更名。

| 文件 | 结果 | 证据边界 |
| --- | --- | --- |
| [code-validation-phase2.json](code-validation-phase2.json) | Linux 61 files / 774 pass；Windows 61 files / 773 pass + 1 POSIX skip；两端 TypeScript/build，Biome 558 / 559 files 通过 | Windows 单元 JSON 摘要直接提取；其余命令结果由本轮执行负责人提供，来源类型在 JSON 中明确 |
| [desktop-phase2-acceptance.json](desktop-phase2-acceptance.json) | 7/7，无 renderer error | 新增首页近期项目显示与重新打开；原有外部 MCP、历史、文件树、重启和新建/打开继续通过 |
| [editor-phase2-acceptance.json](editor-phase2-acceptance.json) | 重跑 8/8，无 renderer error | 三组窗口/主题布局、插入/编辑、撤销/重做、短码/剪贴板 |
| [project-phase2-acceptance.json](project-phase2-acceptance.json) | 重跑 11/11，无 renderer error | 第二轮项目 UI 修正后的同组编排与草稿/版本/导出回归 |

Windows 首轮 2 项失败来自绑定既有 writer 固定锁端口时的系统 `EACCES`。第二轮保留兼容固定锁和拒绝第二 writer 的行为，增强 OS 错误诊断；测试 fixture 选择派生端口可用的临时目录，新增旧 writer 跨进程排他和崩溃后释放检查。第二轮全量通过；首轮失败计数和原因仍保留在代码摘要中。

第二轮三个编辑器截图及首页截图已由视觉审计逐张核查，无阻断问题，详见 [视觉审计](../../AUDIT-V05-VISUAL.md)。该结论绑定第二轮候选源码，不声明已安装最终包。

## 正式包仍待验证

正式运行时提交、程序包来源标记、自包含/搬迁、实际 EXE、安装、快捷方式与最终包性能需要各自的实际回执。当前目录记录已完成的代码与候选验收，不声明这些交付步骤已完成。
