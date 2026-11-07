# v0.6 基础键盘与编辑器交互审计

审计日期：2026-11-08（Australia/Sydney）。基线：`editor-v0.5.0`（发行提交 `ef80f5b`，已安装运行时 `03a96957`）。本次逐项核对源码，并重新查看 v0.5 正式 EXE 的浅色、深色、紧凑窗口截图；未操作用户当前窗口或科研原稿。本文的缺口是源码审计结论，后续实际交互结果另行记录。

## 结论

**基础键盘功能已经部分实现，但尚未形成一致的编辑器操作模型。** 方向键已有 1/10 单位移动，常见对象操作也有快捷键。主要欠缺是焦点归属、明确的 Tab 对象遍历、缩略图键盘导航、输入后焦点恢复，以及帮助入口。

最直接的三个问题是：从图层面板选中对象后，方向键和 Delete 被按钮焦点挡住；Tab 会进入缩放手柄和组合子对象等额外停靠点；固定版本或保存中的 PageUp/PageDown 浏览被写入禁用条件一起挡住。它们属于日常编辑缺口，应优先修复。

## 1. 历史要求与实际来源

[旧编辑器对照](LEGACY-COMPARISON.md)列出 Tab 对象循环、1/10 单位移动和常用页面快捷键；[v0.2 实施记录](IMPLEMENTATION-V02.md)要求补齐页面操作与画布焦点；[v0.5 规格](SPEC-V05.md)新增放置工具、V/T/R/L 和文字输入保护。本轮一起核对这些阶段的要求。

| 入口 | 核对内容 |
| --- | --- |
| [huandeng.tsx](../packages/core/src/app/routes/huandeng.tsx) | 全局 keydown、paste、选择、页面/演讲导航、保存状态和作用域 |
| [editor-canvas.tsx](../packages/core/src/app/components/pptd/editor-canvas.tsx) | 对象 focus、手势、手柄、文字编辑和 IME |
| [renderer.tsx](../packages/core/src/app/components/pptd/renderer.tsx) | tabIndex、ARIA 名称、Enter、组合子对象 |
| [thumbnail-rail.tsx](../packages/core/src/app/components/pptd/thumbnail-rail.tsx) | 搜索、可见预览、occurrence 身份、导航和右键菜单 |
| [inspector.tsx](../packages/core/src/app/components/pptd/inspector.tsx)、[property-fields.tsx](../packages/core/src/app/components/pptd/property-fields.tsx) | 图层选择、数字/文本属性提交和取消 |
| [science-inspector.tsx](../packages/core/src/app/components/pptd/science-inspector.tsx) | 表格、图表、公式输入与画布键盘隔离 |
| [keys.ts](../packages/core/src/app/lib/keys.ts)、[pptd-document.ts](../packages/core/src/app/lib/pptd-document.ts) | 输入目标、草稿、交互锁、700 ms 自动保存与发送后输入 |
| [desktop/main.cjs](../packages/desktop/main.cjs) | 原生菜单文本角色与窗口快捷键 |
| [verify-editor-v05.mjs](../scripts/verify-editor-v05.mjs) | 已有真实程序覆盖与缺少的键盘场景 |

## 2. 当前完成度

| 操作 | 状态 | 实际行为与缺口 |
| --- | --- | --- |
| 方向键移动对象 | 部分完成 | 1 单位、Shift 10；组合经过已有 transform。按钮焦点及 `busy` 会阻断操作 |
| Tab / Shift+Tab | 部分完成 | 仅依赖 DOM 顺序与 onFocus 选择；组合子对象、8 个缩放手柄和旋转按钮都在 Tab 序列，缺少明确对象循环 |
| Enter 编辑文字 | 已有 | 对象 frame Enter 调用文字编辑处理；普通形状无文字输入语义 |
| Esc / Ctrl+Enter 结束输入 | 部分完成 | 内容读回并 flush，但没有明确把 focus 交回原对象 |
| Esc 取消工具/手势 | 已有 | 插入取消、移动/缩放/旋转还原有实现与 v0.5 验收 |
| Ctrl+A / Shift 多选 | 已有核心 | Ctrl+A 选择顶层对象，Shift 点击增减选区；图层能选择组合子对象，需要清楚的层级约定 |
| Ctrl+C / Ctrl+V | 部分完成 | 同项目对象与图片粘贴已有；固定版本复制被写入禁用挡住，paste 没有排除所有控件区域 |
| Ctrl+X | 未实现对象剪切 | 前端无对象 cut；桌面 `role: cut` 是 Chromium 文本动作 |
| Ctrl+D | 已有 | 根据缩略图焦点或对象选择复制页面/对象；演讲集合切去编排面板 |
| Ctrl+G / Ctrl+Shift+G | 已有 | 组合/取消组合共用现有事务，需补异步焦点回落 |
| Delete / Backspace | 部分完成 | 画布对象与 Main 缩略图删除已有，文字受保护；图层按钮保有 focus 时删除被阻断 |
| Ctrl+Z / Ctrl+Y / Ctrl+Shift+Z | 已有核心 | 文档撤销/重做与输入框原生行为分开，v0.5 已验证真实文件结果 |
| 缩略图 ↑↓ / Home / End | 未实现 | 无导航 handler 或 roving tabIndex；80 页有 80 个按钮停靠点 |
| PageUp / PageDown | 部分完成 | 当前演讲顺序与 occurrenceId 已支持；button、只读、固定版本或 busy 提前返回 |
| F5 / Shift+F5 与放映方向键 | 已有核心 | 从头/当前位置与上下页已有；无 Home/End，进入放映没有明确 focus 到演示区域 |
| F6 / Shift+F6 | 未实现 | 各面板缺少统一键盘入口与切换 |
| 属性表单 | 已有核心 | 原生方向键和 Tab，数字 Enter 提交/Esc 恢复；局部 stopPropagation 需要与 Ctrl+S/F6 整合 |
| 表格单元格导航 | 部分完成 | 当前通过行列 select 和 StringField 编辑；画布没有电子表格式单元格导航 |
| 中文 IME | 已有核心 | 全局与 inline 有 composition 保护；NumberField/StringField 的退出规则需要统一核对 |
| 帮助与焦点提示 | 未完成 | 少数 title 和 Shift/Alt 提示已有；没有完整帮助或一致的区域提示 |

## 3. 优先缺口

### K01：图层选择与画布键盘脱节

图层按钮只调用 `onSelect`，focus 留在按钮。全局 handler 在对象 Delete、方向键和 Ctrl+A 前因 `closest('button, select, [role="dialog"]')` 返回。需要明确图层的对象选择区域，选择后回到对象或提供同义操作；不能简单放开所有按钮的方向键，否则菜单和表单会被抢键。

### K02：Tab 停靠点不符合对象层级

Renderer 每个 frame 都是 `tabIndex=0`，缩放/旋转也是 button；组合子对象 focus 又映射回 group，造成多个相同视觉选中停靠点。画布遍历应以顶层对象为准，手柄退出普通 Tab 序列，几何调整继续由可访问属性字段提供。

### K03：导航与写入条件混在一起

`readonly || busy` 早于 PageUp/PageDown 和 Ctrl+C。导航与复制应先处理，真正写入再查权限/恢复状态。方向键草稿应读取 client 的最新页面，确保保存中继续输入和连续按键不会被旧 render 坐标覆盖。

### K04：已处理事件与原生控件边界

全局 handler 没有先检查 `event.defaultPrevented`；输入识别主要是 input、textarea、contenteditable，缺少 listbox、combobox、toolbar 等明确作用域。需要以区域为单位处理，保留原生控件、菜单和弹窗自身导航。

### K05：操作完成后焦点无稳定目标

文字结束、删除当前对象、页面导航和远程删除都会卸载 focus 节点。应恢复到仍存在的对象、相邻对象或画布入口，避免下一个按键落到 body 或错误区域。

### K06：行为难以发现

加入可点击的键盘帮助，以及当前模式的简短底栏提示。帮助与 handler 共用命令定义，说明应随实现更新。画布 Tab 循环要配套清楚的退出方法。

## 4. v0.6 操作约定建议

| 区域/状态 | 建议操作 |
| --- | --- |
| 画布对象 | 方向键 1 单位，Shift 10；Tab/Shift+Tab 遍历顶层对象；Enter 编辑文字；Esc 清除选择或取消工具 |
| 文字输入 | 原生光标、选择、复制、粘贴、撤销和换行；Esc/Ctrl+Enter 结束输入并回到对象；IME 候选确认优先 |
| 缩略图 | 一个 Tab 入口；↑↓、Home/End 导航过滤结果，以 occurrenceId 区分重复引用；Enter 返回画布，Tab 离开区域 |
| 图层 | 方向键浏览，Enter 进入对象；Delete 与可见选择一致；组合成员的层级可理解 |
| 属性表单 | 原生输入和 Tab；Enter 提交、Esc 取消当前字段；方向键改数值，不移画布对象 |
| 页面浏览 | PageUp/PageDown 使用当前集合顺序；只读、固定版本和普通保存中仍可浏览，保留草稿 |
| 区域切换 | F6/Shift+F6 往返实际可见的导航、画布、属性、备注区域；弹窗关闭后回到先前有效 focus |
| 弹窗/菜单 | UI 组件负责自身导航，画布忽略已消费事件；Esc 只退出当前弹层 |
| 放映 | 方向键、空格、PageUp/PageDown、Home/End；Esc 返回编辑。后续动画的下一步语义由动画规格统一接入 |

画布 Tab 循环必须配套可发现的退出方式，例如可见的 F6 提示和 Esc 回到画布入口后正常 Tab 离开。文本、属性、表格输入不进入画布 Tab 逻辑。

对象剪切采用“复制成功后再删除”，保留 group children 与 Undo；剪贴板失败时原对象不变。Native Edit 菜单需派发同一语义命令，或准确限定为文本操作。方向键连续输入应进入最新草稿并形成可预测的撤销边界，持久化继续走现有 client。

## 5. UI 与视觉复审

已查看 [浅色](evidence/ui-v05/editor-light.png)、[紧凑窗口](evidence/ui-v05/editor-compact.png)、[深色](evidence/ui-v05/editor-dark.png)三张正式 EXE 截图。品牌、选中色和工具密度已统一，后续应改善工作空间与反馈。

| 观察 | 影响 | 建议 |
| --- | --- | --- |
| 1024 px 窗口两侧栏占约一半宽，画布约 449 px 宽 | 内容识别和对齐费力 | 提供侧栏收起/恢复，记住选择并重新计算适合窗口缩放 |
| 备注默认展开，空 Story 与技术检查占右栏较高位置 | 对象属性/图层要额外滚动 | 空 Story 用紧凑摘要，帮助按需呈现，保留展开入口 |
| 多处状态/说明 10–11 px | 小屏阅读负担较大 | 常用信息保持清楚字阶，小字留给次要标识与路径 |
| 状态显示“Agent 接口已连接” | state.connected 仅证明编辑器和文档服务连接，不证明外部 AI 会话连接 | 改成文档服务状态；Plugin 使用实际可观测会话数据 |
| selected 与 keyboard focus 没有统一区别 | 用户难以判断按键作用在哪 | 明确区域与对象 focus-visible，保持其和选区可区分 |
| 演讲集合在标题下的小型 select | 可用，但不易理解主库派生多个演讲 | 与项目/Story 审计整合集合切换和当前上下文，继续共用项目模型 |
| 按键提示零散 | 新功能难发现 | 简洁帮助弹层，按画布、页面、文本、全局分组；底栏只显示当前相关动作 |

布局验证覆盖浅/深色、1024/1280/1600 宽度和 Windows 常用缩放。目标包括画布可读、关键操作可达、focus 可见和不误触，不能只检查横向溢出。

## 6. 实施建议

先完成键盘状态和焦点，再整合工作区折叠/帮助与项目导航。将按键意图、对象遍历和 occurrence 导航提取为可测试 helper；route 调用现有 client，各区域负责 focus，不继续向无区域约定的全局 handler 堆分支。

涉及 route、canvas、renderer、rail、inspector、property fields 与小型帮助组件。对象可读名称宜提取为无 UI 依赖 helper，避免 renderer 反向依赖 inspector。动画时间线通过独立区域接入，文本与属性输入仍优先。

画布内表格编辑、组合内部编辑、全局命令面板和触控手势可作为后续独立增量；本轮如未实现，应保持明确边界。

## 7. Validation

使用合成项目和独立桌面 profile/runtime；真实项目只用副本并保留输入 hash。v0.5 脚本已覆盖删除、撤销/重做、文字 Backspace 和 Ctrl+Enter，本轮需新增完整键盘/焦点矩阵。

| 场景 | 验收观察 |
| --- | --- |
| K-V01：四向/Shift 移动四种对象 | 实际位移精确 1/10，文件和 Undo 正确 |
| K-V02：组合和多选 | 子对象同向移动，不重复移动成员或破坏 bounds |
| K-V03：长按及保存中继续输入 | 位移等于有效按键总量，发送后草稿保留，撤销边界合理 |
| K-V04：Tab / Shift+Tab | 顶层对象顺序明确；组合只停一次，不进无键盘行为的手柄；读出可理解名称 |
| K-V05：离开画布 | 只用键盘可到其他区域，退出提示可见，无焦点陷阱 |
| K-V06：图层选择后的操作 | 方向键、Delete、Enter 与可见选择一致，不误删页面 |
| K-V07：文字进入/退出 | Enter、Esc、Ctrl+Enter 与 focus 返回正确，随后方向键仍能操作对象 |
| K-V08：IME 和富文本 | 候选确认不退出/误执行画布命令；Tab、Backspace、Enter 正常 |
| K-V09：表单、表格、公式、图表 | 箭头、Tab、全选、撤销、删除仅作用于当前字段，提交取消准确 |
| K-V10：删除 focus 对象 | 相邻对象或画布入口接住 focus，下一次操作可预测 |
| K-V11：搜索后的缩略图导航 | 只遍历过滤结果；scroll 跟随；清空查询后身份稳定 |
| K-V12：同页重复 occurrence | 按 occurrenceId 定位，前后导航不跳回第一次出现 |
| K-V13：固定版本/保存中浏览 | 页面导航与只读复制可用，写入仍受权限约束 |
| K-V14：剪贴板/重复/组合 | 身份重映射和素材引用正确；复制失败不剪切；Undo 恢复 |
| K-V15：菜单/弹窗/下拉 | 已消费的按键不泄漏到画布，关闭后恢复 focus |
| K-V16：放映 | F5/Shift+F5 起点正确，focus 进入放映，Home/End 和退出有效 |
| K-V17：外部 Agent 删除对象/页面 | focus 选择有效回退；原草稿按冲突规则保留 |
| K-V18：帮助和界面 | 说明与已验收行为一致；浅深色和小窗口中 focus、状态可读 |

纯函数测试覆盖作用域、修饰键、顶层对象循环、occurrence 索引；真实 Electron 覆盖焦点、浏览器默认动作、输入与落盘结果。截图核查层级与提示，不能替代操作断言。随后运行受影响 client/grouping 回归、类型与格式检查。

## 8. 官方设计参考

- [Microsoft：PowerPoint 创建与编辑快捷键](https://support.microsoft.com/en-us/accessibility/powerpoint/use-keyboard-shortcuts-to-create-powerpoint-presentations)：对象 Tab/Shift+Tab、Enter/Esc 和 F6 面板切换提供成熟桌面约定。
- [W3C APG：Keyboard Interface](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)：区分 focus 与 selection，管理复合控件的 Tab 入口及内部导航。
- [W3C APG：Toolbar](https://www.w3.org/WAI/ARIA/apg/patterns/toolbar/)：工具栏可用一个 Tab 入口和方向键内部导航，保留文本控件自身语义。
- [W3C WCAG：No Keyboard Trap](https://www.w3.org/WAI/WCAG22/Understanding/no-keyboard-trap.html)：画布内部使用 Tab 时须提供键盘退出方法；特殊退出组合要告知用户。

官方资料于审计日查阅，用于建立本轮操作约定；完整屏幕阅读器兼容仍需独立验收。

## 9. 本轮实现与当前验证进度

上述第 2 节保留 v0.5 审计基线。v0.6 已完成本轮分工的实现：

- `pptd-keyboard.ts` 集中管理作用域、按键意图、顶层对象与组合删除顺序；画布、图层、缩略图、输入、菜单/弹窗及时间轴分开处理。
- 画布 Tab/Shift+Tab 遍历顶层对象，几何手柄退出 Tab 序列，Esc 后正常 Tab 可离开；文字结束、对象删除和跨页保持可用焦点。焦点名称使用对象内容/类型。
- 缩略图和图层用单一 Tab 入口，↑↓/Home/End 导航；缩略图用 occurrenceId 区分重复页面，Enter 返回画布。图层点击后可以立即在画布移动对象。
- 页面浏览、只读复制和全选先于写入门控；方向键每次从 client 最新草稿计算坐标，保存中继续输入不因旧 React render 丢步。组合根选择避免成员重复位移。
- 对象剪切先确认复制成功，再提交带页面 revision 的删除；Electron 原生“编辑”菜单通过固定命令集合调用前端，输入框仍执行 Chromium 原生编辑。
- F1 帮助、F6 可见面板切换、两侧栏收起/展开，以及“文档服务已连接”准确文案已接入。属性字段统一 IME guard；Ctrl+S 可以先提交当前字段再保存。

在 route/desktop 交接时，core TypeScript 通过，11 个本轮修改文件 Biome 通过，desktop main/preload 的 Node 语法检查通过。新增 `pptd-keyboard.test.ts` 初版 16 项测试通过；加入放映输入控件的退出规则及时间线历史命令后为 **18 项通过**，与 6 项 grouping-store 回归合计 **24/24 通过**。它们覆盖输入与区域边界、修饰键、组合层级、删除顺序和 occurrence 循环。后续总集成可能继续修改 route/renderer；这些检查不替代最终集成门禁。

[verify-keyboard-v06.mjs](../scripts/verify-keyboard-v06.mjs) 初版使用独立合成项目、profile 和 runtime，覆盖 12 组真实 Electron 操作：对象 Tab、连续移动与撤销、组合、原生剪切/粘贴、图层、IME、属性/表格、帮助/折叠、缩略图、重复引用与演示、固定版本只读导航、外部删除后的焦点。

**Windows 首轮实际结果：12/12 通过，渲染错误 0，正常退出 code 0、signal null。** 运行时间为 `2026-11-07T16:08:04.611Z`，Electron `38.7.2`。证据记录在 `D:\_Proj\Huandeng-v06-20261108\.verification\keyboard-v06.json`，同目录保留截图和进程日志；最终截图已复核。此轮对应首次 69 文件同步后的源码候选，**不是最终安装包验收**，不据此宣称后续改动或最终发布包已通过。

随后对动画整合做只读焦点复核，发现放映中的新 range 控件未进入原有 button-only Tab 循环，且 range 的输入作用域会吞掉 Esc。独立 keyboard helper 已修复：Tab/F6 包含可见启用的原生控件，放映态 Esc 能退出，range 的方向键/Home/End 保留原生行为。另允许时间线非输入区域派发文档 Undo/Redo；字段原生历史仍独立，实际写入门控由 route 检查只读页面、未保存动画草稿和事务占用。TimelinePanel 自行处理预览 Esc，优先取消拖动/当前字段，再回到基础版式而不丢弃草稿。

脚本新增时间线组，核对 F6 进入时间线、预览不改基础坐标、已保存关键帧从时间线按钮 Ctrl+Z/Ctrl+Shift+Z 撤销重做、Esc 返回编辑，以及放映 range 的 Tab/End/Esc。后续又加入真实对象移动/缩放的 Esc 取消组，最终脚本共 14 组。

**Windows 修订候选实际结果：14/14 通过，`rendererErrors: []`，正常退出 code 0、signal null。** 记录时间为 `2026-11-07T16:35:01.308Z`，收据为 `D:\_Proj\Huandeng-v06-20261108\.verification\keyboard-v06.json`。本轮包含稳定画布 Tab 入口、根 Enter、时间线历史命令与预览退出、放映 range，以及实际鼠标移动/缩放取消后的坐标、原文件字节、历史和事务检查；没有用早先 12 组结果代替新增场景。本轮仍为隔离 worktree 的**源码候选验收，不能代替最终安装包验收**。

本轮仍不承诺画布表格内的电子表格式导航、组内钻取模式、完整屏幕阅读器兼容，以及任意输入法/系统快捷键组合。它们需要独立交互设计与实际平台验收。

## 10. 删除性能定位与键盘入口修订

同机对照出现明确的前端回退信号：v0.5 包 20 轮的 visual Delete 中位数为 23.75 ms，v0.6 源码候选 50 轮为 62.6 ms；对应持久化约 200.55 / 204.05 ms。两者使用 1600×1000 窗口、同一页四个对象、80 页项目和七个缩略图，当前画布无图片。此处记录候选阶段诊断，不当作最终安装包成绩。

随后对真实 Electron 的 `Element.setAttribute` 插桩，观察到 Delete commit 将**聚焦的画布容器 `tabindex` 从 `-1` 改为 `0`**，单次耗时 **44.2–46.2 ms**，解释了此次差额的主要部分。先前仅凭函数复杂度审计不能排除这种浏览器同步开销；实际 profile 将问题定位到了具体 DOM 属性更新。

修订方案是固定画布根 `tabIndex=0`、对象 frame `tabIndex=-1`。画布保有一个稳定的原生 Tab 入口，内部 Tab/Shift+Tab 按顶层对象顺序调用程序焦点；Esc 返回画布根后，下一次 Tab 使用浏览器原生顺序离开。图层跳转和文字结束仍可以聚焦 `tabIndex=-1` 的对象。F6 或原生 Tab 进入画布后会落在画布根，因此根 Enter 也需要在单选可编辑文字时进入编辑，不能只依赖 frame 上的 Enter handler。

验收脚本同步断言稳定的根入口与零个原生对象 Tab 停靠点，并核对“已有文字选择 → 聚焦画布根 → Enter 编辑 → Esc 返回对象”。修订后的同机源码候选完成 20 轮，visual Delete 中位数为 **25.4 ms**；与上述 v0.5 包的 23.75 ms 相近，已消除本轮候选中 44–46 ms 的主要同步开销。固定键盘入口与根 Enter 也通过后续完整 14 组验收。此处仍为源码候选成绩，正式包需保留独立复测。

同次事件顺序复核发现，画布本地 Esc 的 `stopPropagation` 会挡住 `capturePointerGesture` 注册在 window bubble 的取消处理。修复使活动 gesture 的 Esc 优先直接调用取消回调，恢复原坐标并保留选择，再由下一次 Esc 清选区。独立 harness 因此增加真实手势组：实际鼠标移动对象及拖动尺寸手柄，确认预览已改变后按 Esc，再 mouseUp；核对坐标恢复、选择保留、700 ms 自动保存窗口后没有新事务、历史条数不变、源文件字节不变。**该新增组已在 `2026-11-07T16:35:01.308Z` 的 14/14 Windows 收据中通过。**

## 11. 快速页面导航的时序修复

固定 Tab 入口后的候选通过 20 轮性能复测，但接着执行的键盘脚本在缩略图导航组失败：快速 ↑↓/End/Home 导航后，Home → Enter → PageDown 应从第一页前进到第二页，实际停在第三页。此前的缩略图及画布 focus 断言均通过，渲染错误为零。失败收据保留在 `D:\_Proj\Huandeng-v06-20261108\.verification\v06-pre-navigation-fix`，没有在测试中加延时掩盖。

源码核对确认实际入口使用 `BrowserRouter`。当前锁定的 React Router 7.18.4 在 `history.replaceState` 同步更新 URL 后，通过 `React.startTransition` 更新路由渲染；`useSearchParams` 回调中的参数也来自上次渲染的闭包，不能当作 React state 的排队更新。因此缩略图已聚焦新位置时，route 闭包的 `pageIndex` 仍可能是前一位置。

`stepPage` 现从同步的 `window.location.search` 读取最新请求身份，有 `occurrenceId` 时按引用查找，否则用 `pageId` 在当前集合中求索引，再前进/后退。URL 的 presentation 与已加载集合不一致时停止本次步进，避免把旧集合位置带到新演讲；已提交页面索引仅作为未匹配请求的回退。该修复保留同页多次出现的引用身份，并让快速导航跟随最新请求，而不等待前一帧渲染。

快速 Home → Enter → PageDown 原场景和重复 occurrence 导航已在上述 14/14 Windows 源码候选中通过。最终包应运行同一脚本，保留快速按键顺序与文件结果断言。

收据后的源码复核还将 `selectPage` 改为从最新 URL 构造下一查询，避免重复操作带回闭包中的旧集合参数。这项补强属于后续候选，应随最终集成重新验证，不能追溯计入前述 14/14 收据。
