# HUANDENG v0.9 Validation

日期：2026-11-08。对应 [AUDIT-V09](AUDIT-V09.md)、[SPEC-V09](SPEC-V09.md) 与 [IMPLEMENTATION-V09](IMPLEMENTATION-V09.md)。本轮验证围绕中英文、排列手势、Story 预览/提交和实际客户端，不重复上一版完整压力矩阵。

## 1. 交付身份与结果

最终运行时：`17de86d0b49f23c3c7aafe901f3de748d3bcc7e3`，产品 0.9.0，Electron 38.7.2，构建于 `2026-11-08T02:35:06.3605865Z`，sourceDirty=false。交付文档提交会在此之后推进 Git HEAD，不能把文档 HEAD 当作运行时构建来源。

**本轮已完成可用安装。** 最终 EXE 的 12 / 12 聚焦桌面场景通过；官方 DeepSeek Harness 完成真实 Story 任务。29,201 个安装文件、684,294,324 bytes 与验收包的 SHA-256/大小清单一致。原桌面和开始菜单入口更新为 0.9.0，普通 profile 已正常重开 80 页项目，原件基线、可写服务与响应窗口均通过。

脱敏汇总：[acceptance.json](evidence/v09/acceptance.json)；实际客户端证据：[plugin-acceptance.json](evidence/v09/plugin-acceptance.json)。私有源路径、普通用户项目截图、原文件哈希清单与原始客户端事件仅保留本机。

## 2. 常规代码与构建门槛

| 门槛 | 结果与范围 |
| --- | --- |
| Linux 单元测试 | 88 文件，1,006 / 1,006，通过 |
| Windows 单元测试 | 88 文件，1,005 pass + 1 POSIX-only skip，共 1,006；60.91 秒 |
| 类型与格式 | TypeScript 通过；Biome 检查 698 个文件通过 |
| Plugin 配置测试 | 原生 Node test 3 / 3 通过 |
| 几何/适配重点 | 57 个纯规则测试通过；包括旋转外框、组排除、轴锁、等距、固定 resize 对边与候选预算 |
| 构建与部署 | CLI / 正式 UI 构建通过；hoisted 桌面产物独立依赖、无开发树绝对软链；打包前后 relocation 检查通过 |
| 最后菜单修复 | 全量代码门槛完成后，修复 language radio 默认不关闭菜单；重跑类型、语言聚焦检查、UI 构建及最终 EXE 两套场景 |

全量门槛对应本轮功能代码，最后补丁为菜单点击关闭与对应断言。没有为这两处再次重跑全部科学导出/压力用例。生产前端主包约 1.32 MB，gzip 416.9 KB；这是构建大小，不是启动速度或内存改善的证明。

Windows 初次全量运行有一个新 preview 有界输出用例超过默认 5 秒，另有一个既有 POSIX-only skip；同一用例单跑 3.035 秒通过。该用例执行真实持久化准备，只将测试超时改为 15 秒，再跑全套得到上表结果；所有断言、产品超时和写入保障保持。失败与单跑日志保留，没有以重试抹掉初次失败。

本机主要日志：`.verification/v09-unit-accepted.log`、`v09-typecheck-final.log`、`v09-typecheck-menu.log`、`v09-cli-build-final.log`、`v09-ui-build-menu.log`、`v09-package-final.log`。Linux 的门槛在开发副本完成；后续临时执行环境不可用时，已传输的 Windows 工作树继续作为交付来源。

## 3. 最终 EXE 的实际桌面场景

两套脚本都使用独立 profile/runtime 与合成文稿；最终各 6 / 6 通过，共 **12 / 12**，rendererErrors 为空，各两次 code 0 / signal null 正常退出。两份回执的完整 build identity 与最终候选 marker 一致。

| 场景 | 实际检查 |
| --- | --- |
| 中英切换 | 当前对象选区、页面文字和源文件/版本不变；原生菜单同步；选择语言后菜单确实关闭 |
| 未保存编辑 | Story 的脏输入与活动输入在切换语言后继续存在，没有伪保存 |
| 英文布局 | 素材、帮助、导出可操作；1040 × 680 无页面横向溢出，四个导航标签均在容器内 |
| Agent 入口 | 四个客户端配置绑定当前项目；读取包内 skill；用最终 EXE 自带运行时执行 SDK doctor，服务 0.9.0、18 tools、2 guides、目标可写 |
| 现场放映 | 点击揭示、后退恢复开场；回到编辑器源文档不变 |
| 偏好和重开 | 语言与吸附开关经过正常关闭/重开仍保留；欢迎页与编辑器一致 |
| Shift / 组 | 鼠标按下前按 Shift 仍可拖动；另一轴锁定；组合不对自身子项吸附，一次 Undo 恢复 |
| 等距 / 临时关闭 | 文本出现两个相等间隔；Alt 和永久开关都绕过辅助线 |
| Esc | 拖动中取消恢复原位，源文件字节不变 |
| 缩放阈值 | 100% 与真实 50% 下距离 4 屏幕像素吸附，7 像素不吸附，阈值未因缩放变化 |
| 分布 / 保存 | 不同宽度对象按空隙分布；一次 Undo / Redo，保存与正常重开位置一致 |

回执：

- `.verification/editor-v09/huandeng-editor-v09-i03OYb/acceptance.json`
- `.verification/arrangement-v09/huandeng-arrangement-v09-Lod1dl/result.json`

### 负责人视觉复核及发现的真实问题

已查看实际英文工作区、连接 Agent 弹窗、中文工作区与等距辅助线截图。英文导航最初超出左栏，改为等宽文字标签；Agent 弹窗的默认断点限制让复制按钮接近可视边缘，明确宽高边界后按钮完整可见。语言菜单的 radio 项默认保持菜单打开，正式包检查抓到其遮挡画布，添加 closeOnClick 后最终包通过。

短窗口同时展开属性与动画仍然挤压作者画布；本轮只消除溢出与遮挡，没有宣称完成可调创作工作区。截图见 [英文](evidence/v09/english-workspace.png)、[中文](evidence/v09/chinese-workspace.png)、[等距](evidence/v09/equal-gaps.png)。Agent 配置截图含私人目录，未放入仓库。

早期开发检查在欢迎页导航时等待旧 JS context 返回导致一次失败，改为发出导航后等待新页面；排列首轮用窗口拟合得到 52.5% 而非要求的 50%，改为真实 Zoom out 五次并检查实测比例。均未放宽业务断言。旧候选 fd30e4 的排列通过回执和 language-menu 失败回执继续保留；最终来源只采用上面的 17de86d 两份报告。

## 4. Story Plugin 的真实客户端闭环

官方 `@deepseek-ai/dsh` 0.2.1-rc.2 使用自身 headless profile、隔离 DSH_HOME、生成的 Cordis MCP patch 和本机既有认证，72.40 秒完成真实合成任务，exit 0。没有通过另一个模型替它执行，也没有修改用户客户端配置或注册新的 Vault 项目。

实际调用包括 skill、两个 guide resources、context、Story briefing、page/history、preview、按完全相同 payload 与返回 hash apply、回读和 render。负责人/实现者独立核对：

- 修改目标页标题、讲稿、设计意图及 300 ms 点击淡入；第一张页与四个指定对象保留。
- 原标题几何不变，预览为 4 个字段、2 个文件、1 页；最终只有一条对应历史记录。
- 关闭并重开服务后，页面与 Story 与提交结果一致，诊断为空。
- PNG 实际生成并交付客户端，1920 × 1080 / 43,778 bytes；SHA-256 `91b2e860aef2cdb4718cf945be704e3a5aac9eeba2166da0d48ed182c2aa039c`。负责人另查看了此合成图的布局；这张基础态 PNG 不能证明点击放映，播放检查由上一节覆盖。

preview 无写入、CAS、内容 hash、截断、恢复等保障由同 writer 的聚焦测试验证。真实模型任务本身不会穷举这些边界。hash 是内容绑定，不是作者审批。

Codex 0.153.1 的原生 CLI 解析临时配置并核对程序/参数；Claude Code 2.1.318 的原生 plugin validate exit 0（只有未提供 marketplace icon 的可选警告）。这两项不等于完整模型任务。ChatGPT 继续使用已授权 DC-WALT 的同一 CLI 路径，本轮没有新增账号连接器。

DSH 有一个辅助读取时钟的 shell 请求被其 Windows ACL 拒绝，未放宽权限。其可选 recordedAt 不采作已核验 UTC 事实；指南已要求读取真实时钟或省略。模型的视觉质量陈述也未采作独立验收。

## 5. 安装、普通项目与失败保留

安装目标继续为 `D:/_Proj/Huandeng/dist/HUANDENG-win32-x64`。旧 0.8.0 包保存在 `D:/_Proj/Huandeng/.verification/installed-v08-backup-20261108-v09`，其身份与替换前一致。

首轮 `.verification/install-v09-20261108T023832Z.json` 停在 prepared：旧窗口已有一份未保存的项目编排，正常关闭被编辑器阻止。没有替换旧包或强制终止。负责人查看实际窗口，把旧项目元数据和可见草稿备份到 `.verification/preserved-original-project-draft-v09/`，再通过原窗口的“保存项目”保留现有草稿。仅 `.huandeng/project.json` 的 project 字段更新；manifest 与全部 80 个页面（81 文件）字节不变，没有生成新的科研内容。保存前后副本、界面与独立核对回执均保留。

恢复安装绑定该失败回执，重新核对准备好的包及其清单，以保存后的当前 82 文件状态为基线，然后正常关闭旧窗口。全部 29,201 文件 / 684,294,324 bytes 在安装目标逐项核对；独立依赖/relocation 检查再次通过。桌面与开始菜单两处快捷方式的目标、工作目录与图标核对通过。

使用普通 profile 启动安装后的 EXE，新的本机服务 epoch 与主进程父子关系成立：生产静态前端、desktopProtocol 1、可写、80 页、0 诊断、响应中的原生窗口。保存后的全部 82 个项目源文件在安装/重开后保持一致，窗口保持打开。该检查验证普通入口与项目重开，不冒称重复了所有合成 GUI 场景。

成功回执：`.verification/install-v09-20261108T024834Z.json`；全量包清单：`.verification/install-v09-manifest-20261108T024834Z.json`。先前失败记录和 v0.8 原历史基线都保留；新旧元数据差异来自保留原有草稿，不将其标成安装破坏或无变化。

当前 ordinary profile 的原件仅用于正常打开和保留原有未保存编排，不用于合成测试事务。原截图与项目元数据备份留在本机。canonical 原有修改 `tests/fixtures/studio/pages/identities.page` 保留，SHA-256 `fe378a48e57b63f2b9e7286578f68eefe856a381422930a6615f920b02622832`；不 stage、不 reset、不覆盖。

## 6. 本轮没有覆盖的结论

没有重新运行 v0.8 的 25 轮放映/80 页副本 50 对编辑，以及上一版完整视频/科学对象导出矩阵；因此不把旧性能数据标成本轮新测量。内存诊断继续沿用 v0.8 对 Network 响应保留的纠正，数小时混合高清负载仍需专项。

独立双屏、计时和彩排、受控音视频、演讲实例视觉变体、原生 PPTX timing、Codex/Claude 完整模型任务、完整 Office 往返和高级科学组件未完成。PNG/PDF/PPTX 仍导出基础静态画面并给出对应诊断。

## 7. Git 里程碑

交付仓库明确为 `JaytonKogeru/huandeng`，本轮已核对其为 PRIVATE，origin/main 基线为 `70f655d`。工作分支 `editor/v0.9-daily-editor-plugin`，里程碑标识 `editor-v0.9.0`；仅对该 origin 同步 main、工作分支与 annotated tag。默认 gh repo 选择会指向公开 upstream，因此读取远端信息必须显式指定私有仓库，推送必须显式使用 origin。

安装结果与远端同步分别取证；本轮交付在推送后独立执行 git ls-remote，回执保存在本机 `.verification/v09-remote-delivery.json`。这份文档不包含自己的 Git 提交哈希，运行时来源固定为上文 17de86d。未发布 npm、未推 upstream、未变更仓库可见性、未发送 Issue 评论。
