# 原始 SPEC 核心验收复查

本记录针对 `docs/SPEC.md` 第 0–16 节及 T01–T14 的实际源码，补充本轮产品审计。它不以阶段版本号代替完整验收；最初 SPEC 的技术路线继续作为产品主规格。Main Slides / Presentation Slides、分层 Story 和显式命名版本的新增规则见 [PROJECTS.md](PROJECTS.md)、[STORY.md](STORY.md)。

## 本轮找到并处理的核心问题

| 问题 | 对日常工作的影响 | 修复落点与证据 |
| --- | --- | --- |
| 导出原先将同一 `pageId` 的多次出现当成非法重复 | 合法演讲序列无法导出 | `export.ts` 区分 occurrence；导出报告携带 presentation / occurrence / version 身份，`export.test.ts` 验证重复页 |
| Page Story 草稿只保存在会被卸载的属性面板里 | 点选对象、切页或关窗口可能丢失作者更正 | `DesignIntentDraft` 与上层按页缓存；`use-pptd-document.ts` 统一离开保护；`verify-project-v04.mjs` 检查切对象、切页、保存 |
| Chart data 的 TSV 草稿也只属于局部组件 | 未点击应用时切页可能丢数据，导出仍使用旧数据 | `ChartDataDraft`、父级缓存与未应用状态保护；由科研对象验收检查 |
| 命名版本输入框可绕过禁用按钮按 Enter | 固定版本只读视图或重复键盘事件可能触发新记录 | `page-history-dialog.tsx` 的同步互斥、函数级 disabled 检查、输入及关闭控制；保存/恢复期间拦截浏览器和桌面离开 |
| `renderRevision` 原先遗漏页面主题覆盖 | 页面颜色/字体已经变化，旧作者评审仍可能显示 current | `store.ts` 将有效页面主题纳入指纹，`store.test.ts` 增加主题变化与评审过期测试 |
| 技术问题分散在保存、渲染和导出路径，部分 warning 不显示 | 缺失素材、越界和坏裁切不易在编辑时定位 | 新增 `technicalDiagnostics` 与 `TechnicalQaPanel`：旋转外框、零尺寸、无效裁切、已知缺失素材；支持定位对象 |

这些修复的源码存在不等于 Windows / PowerPoint 的实际验收已自动完成。GUI、真实导出与关闭流程的运行结果以本轮验收脚本和证据文件为准。

## T01–T14 的对应证据

| 检查 | 对应实现及回归依据 |
| --- | --- |
| T01 no-op、未知字段、注释、CRLF / BOM | `codec.ts` 的局部源文本更新；`codec.test.ts`、`store.test.ts` |
| T02 指定页与字段 | `store.ts` 的页面写集合；store / checkpoint / project 测试比较原页及兄弟页 bytes |
| T03 插页、重排、改标题身份不变 | `identity.ts`、页面结构操作、`store.test.ts` 与 `page-checkpoints.test.ts` |
| T04 复制身份独立、内部引用重建 | `store.ts` 的复制和分组引用处理；`store.test.ts`、`grouping-store.test.ts`、`science-objects.test.ts` |
| T05 requestId 幂等 | `persistence.ts` 收据、`store.test.ts` 重开后重试、checkpoint 同请求复用测试 |
| T06 page / manifest / metadata CAS | `store.ts` 按操作读写集合检查；store / project 集成测试含缺失前提与过期拒绝 |
| T07 尺寸与缩放坐标 | 编辑画布的逻辑坐标转换、既有 `verify-huandeng.mjs` 拖动检查；Windows 科研 22 项验收已验证组合几何与复制/解组/撤销，最终桌面包结果见 [RELEASE-V04](RELEASE-V04.md) |
| T08 中文 IME 与富文本 | `pptd-document.test.ts` 包含 composition 中计时与显式 flush 禁止提交；文本导出测试检查富文本结构 |
| T09 外部更新与脏草稿 | Document client 的远端更新、并发确认和草稿冲突测试；Project、Story、Chart 增加父级草稿生命周期保护 |
| T10 中断恢复保护第三方内容 | `persistence.ts` journal，`store.test.ts` 覆盖 roll forward、第三种 bytes 冲突和日志 hash 验证 |
| T11 Scoped Undo | `store.test.ts` 的跨页修改、同页 barrier、重做和创建后撤销身份保留 |
| T12 recipe override 与删除槽位 | `recipes.ts`、`recipes.test.ts`、store 的 recipe 原子修改测试 |
| T13 原生对象和可定位回退 | `export.ts` / `export-science.test.ts`，真实 PowerPoint 验收与对象级报告另行记录 |
| T14 预览/导出不改源、TSX 模式 | 导出测试、`verify-project-v04.mjs` 的规范页 hash 比较；原 TSX e2e 套件保持独立，不能用 PPTD 测试替代 |

新项目模型另有 `project-model.test.ts` 与 `presentation-snapshot.test.ts`：旧工程读取、章节成员变化、重复页、两个固定版本与 live 页并存、讲稿隔离、归档资产、缺失引用、重开持久化、CAS，以及删除后恢复同一规范页面。

## 技术 QA 的明确范围

`technicalDiagnostics(page, size)` 是纯检查函数，不改写页面和布局。它报告无效或零尺寸外框、考虑旋转后的越界、非法图片裁切、透明外扩裁切以及已经被资源指纹确认缺失的本地素材。越界使用 warning，因为页面出血可能是有意设计。页面内每个受影响对象均可定位；背景或主题资源保留页面级诊断。

`requestedPageFonts` 只列出页内与页面主题覆盖中请求的字体。系统字体是否安装仍标为“未验证”；`document.fonts.ready` 不能证明某个指定系统字体存在。当前 `renderRevision` 也尚未包含目标机器的实际字体解析结果，因此换机器后仍需核对字体与排版。当前未加入通用 DOM 文字溢出判断，不能把没有几何问题解读为视觉验收通过；导出对象回退已能保留元素框外仍在页面内可见的文字和公式，这不构成自动溢出诊断。

当前 UI 不生成审美分数，不自动“减少 AI 风格”，也不把 Agent 编写的 Story 或反馈伪装为作者批准。作者评审继续绑定渲染版本，服务禁止普通 Agent 写入或清除作者评审字段。

## 可以后续完善的范围

- 系统字体安装与实际 fallback 的可靠检测、文字溢出与特殊脚本排版检查。
- 数十到上百页、复杂图表/媒体工程的性能预算和缩略图按需渲染；当前源码检查不能代替大工程测量。
- PPTD 内的页面/对象评论、完整审稿工作流；当前重点是 Story、版本、编辑与导出。
- 分支叙事、自动推断科研证据链、嵌套多级章节等扩展。当前采用平级 Section 与有序引用，满足一份主资料、多份演讲的核心模型。
- 动画、视频/音频、SmartArt、完整 PPTX 往返等 PowerPoint 功能；边界详见 [POWERPOINT-COMPARISON.md](POWERPOINT-COMPARISON.md)。

以上范围不影响核心 Main Slides / Presentation Slides 的共享、日常编辑、显式页面版本与受保护的保存路径。复杂科研内容是否忠实仍应通过真实页面逐项视觉检查和可编辑 PPTX 打开验收判断。
