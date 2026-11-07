# v0.5 验收证据

本目录保存可提交的安全摘要；原始运行 JSON、日志、研究项目副本及研究截图继续留在本地 `.verification`。摘要排除科研路径、标题、原文件列表、逐文件 hash 和文档内容，只保留软件行为、计数、计时、来源标识及原回执 SHA-256。正式包三张合成项目界面截图单独列于下方，已核查没有研究内容、绝对用户路径或 PNG metadata。

当前交付为已验收并安装的 `03a96957` / `0.5.0`。正式结果见 [发布记录](../../RELEASE-V05.md)，本索引按发生阶段保留来源；下面的早期失败、待验收字段和候选结果不覆盖最终独立回执。

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
| [performance-comparison.json](performance-comparison.json) | 两次正式 v0.4 与首轮 v0.5 候选的 80 页测量 | 同机、同材料隔离副本、未清空 OS 文件缓存；5 次操作样本；该阶段待正式包的原状态保留，后续正式结果另存 |
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

## 首个程序包的失败与恢复

干净候选 `80a83ee78c65b63350675e8be9d78d9372b19d80` 于 12:47:09.8127082 UTC 构建。Desktop 7/7、Editor 8/8 通过之后，80 页性能验收的第三轮删除遇到 Windows `EPERM` 原子替换失败和 `PENDING_RECOVERY`；该性能运行未通过，程序未安装或发布。其原始 journal 和完整失败现场保留，不能用后续成功回执覆盖这一事实。

首批恢复源码传输 SHA-256 为 `5d1b1727ab07389434f048262c2c9afc5a2c32afd2607df63aa02a4514538448`，93 个文件核对一致，对应 `bf0aa1f6e87183578f924e86cfb6c53368ff638a`。后续 6 文件修正传输 SHA-256 为 `086f16abffbf44c40c3e0c3511760d12d0d370e5cfb6ee717f16d68bb034d29a`，补第三态诊断优先级、恢复时外部变更分类与持续操作验收。

| 文件 | 结果 | 证据边界 |
| --- | --- | --- |
| [package-footprint-initial-candidate.json](package-footprint-initial-candidate.json) | 683,009,664 B，29,111 文件；只读统计完成且构建标记不变 | 失败候选 `80a83ee` 的软件包表观大小，不是修复后最终包或 NTFS 分配大小；没有科研文件 |
| [original-failure-recovery.json](original-failure-recovery.json) | 原路径与原 state 中完成原交易；80 页、原 request/operation、三次同 receipt、单条历史、另外 81 份文档文件不变 | 首批修复后的 production 服务；与完整科研输入 970 文件的先前检查范围分别说明，不代表正式包性能通过 |
| [code-validation-recovery.json](code-validation-recovery.json) | 首批恢复修复 Linux 63 files / 796 pass；Windows 63 files / 795 pass + 1 POSIX skip；两端 TypeScript/build、Biome 569 files 通过 | 绑定首批修复，不覆盖第二轮 774 项来源；客户端当批 33/33 |
| [recovery-devhost-first.json](recovery-devhost-first.json) | 真实 Windows 文件共享故障的功能检查 6/6 | 开发宿主 + production bundle；截图发现具体第三态原因会被 generic pending 覆盖，视觉缺口原样记下 |
| [recovery-devhost-followup.json](recovery-devhost-followup.json) | 加强后的同组 6/6；第三态中文原因经过主动刷新仍保留，四张截图核查通过 | 追加 6 文件修正；隔离合成项目、无 renderer/cleanup error，测试结束清理成功；尚非正式 EXE |
| [code-validation-recovery-followup.json](code-validation-recovery-followup.json) | Linux 63 files / 800 pass；Windows 63 files / 799 pass + 1 POSIX skip；两端 TypeScript/build；Windows Biome 569 files、Linux 修改 6 files 通过；客户端 34/34 | 明确 `RECOVERY_REQUIRED` 不被弱诊断覆盖；恢复中的外部变更保持 external，Git checkpoint 延后 |

恢复行为、失败发现与修正原因见 [保存恢复审计](../../AUDIT-V05-RECOVERY.md)。原始 receipt 的 SHA-256 用于定位批次；软件包摘要只包含软件依赖名称和聚合大小，不含研究路径或输入清单。

## 正式程序包与安装

正式运行时为 `03a96957f854ab593400218102928d1feb3c86d0`，版本 `0.5.0`，构建时间 `2026-11-07T13:26:12.5660629Z`，`sourceDirty=false`。打包 exit 0，两次自包含/搬迁检查通过。它包含后续恢复修正，不能与失败的 `80a83ee` 程序包混用。

| 文件 | 结果 | 证据边界 |
| --- | --- | --- |
| [recovery-packaged.json](recovery-packaged.json) | 真实 EXE 6/6，进程 exit 0；第三态原因主动刷新后正确，四张新截图核查通过，无 renderer/cleanup error | 当前正式包的隔离合成文件锁测试；build marker 和退出记录有独立 SHA-256，性能与安装分别记录 |
| [desktop-packaged-acceptance.json](desktop-packaged-acceptance.json) | 真实 EXE 7/7，exit 0，无 renderer error | 外部 MCP、Story、页面历史、文件树、重启、新建/打开和近期项目，实际运行时为 `03a96957` |
| [editor-packaged-acceptance.json](editor-packaged-acceptance.json) | 真实 EXE 8/8，exit 0，无 renderer error；三种尺寸/主题布局检查通过 | 放置、取消、文字编辑、磁盘撤销/重做、短码/剪贴板；与先前开发宿主结果分开记录 |
| [package-footprint-final.json](package-footprint-final.json) | 正式安装目录 683,064,563 B、29,113 文件，无 symlink/扫描错误，构建标记不变 | `03a96957` 运行时；较旧版无缓存基线增加约 0.55%，没有缩包声明；安装交互另验 |
| [installation-acceptance.json](installation-acceptance.json) | 正式路径安装、两个快捷方式、图标、三页 smoke、About handler 版本、常规 profile 原 80 页可写/无诊断、原生窗口可响应 | 旧窗口正常退出且保留 v0.4 备份；原 IconLocation 验证误报与修正回执分开，82 份文档源文件不变，窗口保留供用户使用 |
| [performance-packaged.json](performance-packaged.json) | 正式 EXE 5 轮与独立 20 轮均通过；两轮 82 份原文档输入不变，无 renderer/transaction failure | 包含原 script/EXE/receipt hash、两次旧版基线、原 summary 与常规中位数口径，保留 20 轮后的内存增长边界 |

正式包实际合成界面：[浅色 1600×1000](editor-light.png)、[紧凑 1024×768](editor-compact.png)、[深色 1600×1000](editor-dark.png)。三张都对应 `03a96957` 的 13:28:41.119 UTC 编辑器回执并经过逐张人工核查，hash/尺寸记录在编辑器摘要的独立 visualReview 中；原自动回执未改写。

## 交付状态与证据边界

实际 EXE 的桌面、编辑器、恢复、5 轮可比性能、独立 20 轮连续操作、最终包体积和正式安装已分别归档。常规 profile 原项目窗口已打开供用户使用；发行标识为 `editor-v0.5.0`，远端同步由发布步骤独立核对，不能从本地验收推断 push 已发生。未清空 OS 文件缓存的本机副本测量不等于 OneDrive 未驻留文件的冷启动验收，20 轮工作集增长也没有被写成长期内存问题已消失。
