# Native author report — current product revision

Coordinator packaging note: this is the visible final response; local repository paths are replaced by logical names. The original visible response is retained in the internal trial record with SHA-256 213cf2761e20d951233dfae7d09348d5ee60d68e670408e8c1a8b88d0bc928c2. Its claim that the installed DSH bundle was a 0.1.0 prototype is incorrect: this English run used the officially installed 0.19.0 candidate. See product-trial.json and product-review.json. The author wording below is otherwise retained and is not a verified product specification.

---

先给你文件：

**`project:deepseek-en\deck.pptd`**

所在文件夹：**`project:deepseek-en`**

---

## 这一版改成了什么

这一版保留了被认可的英文字体方向（Georgia、Segoe UI、Consolas、暖纸色和朱砂色），但不再把“story”做成“看图复述故事”。这版的骨架是产品介绍：

封面 → 它是什么 → 为什么注意到这个问题 → 项目/文件夹模型 → 复制问题 → 页面即数据 → 我真正做出来的东西 → 编辑器 → 工作区 → 真实科学页 → Story → 一次受控修改 → Slide ID → 历史 → Views → 复用 → 素材 → 多助手 → 交付 → 致谢 → 开始 → 收束。

共 **22 页 Main Slides**，没有为了凑数新增 Presentation。结构参考 Claude English，但美术和页面组织是独立做的，没有复制它的画面。

具体落地了这些：

- 封面恢复 HUANDENG 实物纸盘标记和 1BNA 结构图。
- p2 用“一个项目、一个 writer、任意助手”解释 Editor / 项目 / 插件 / connector 的关系。
- p4 用**原生表格**对比 PPTX 与 PPTD，并保留“移动项目必须移动整个文件夹”这个关键事实。
- p6 用三张 deck 副本卡片和一张页面历史卡片，讲清“复制文件”和“页面身份”的区别。
- p7 不是只放截图，而是页面像素截图 vs 真实 `.page` 代码，讲“页面即数据”。
- p8 讲 PPTD / OpenSlide / 熟悉编辑器 / HUANDENG 编辑器 / 插件的关系。
- p10 是真正的科学页：12 个 C1′–C1′ 距离、1BNA 结构、单位和引用，并明确“这是一个结构，不是独立重复实验”。
- p11 的 Story 表现在明确标注：截图是公开示例，表格引用的是本 deck 的 1BNA 页面。
- p14 用真实 before/after 截图和原生 diff 表讲“一次修改到底改了什么”。
- p15 是不对称素材接触表，保留原始图表、结构、UI 和标记。
- p17 用导出对话框和原生输出表讲 PDF/PPTX 交付。
- p18 Agents 页已恢复 Claude Code、ChatGPT、DeepSeek 的客户端标记，并用原生表格写清“不同页可并行、同页会冲突、Story/Sections/order 共享 revision、Activity 不是在线状态”。
- p20 Credits 恢复了 OpenSlide、OpenPPTD/GitHub、PptxGenJS 的标记和许可说明，并列出当前 **NOT YET** 的能力，避免把未完成说成已完成。
- p21 Start 给出一个具体的第一步：打开项目、连接助手、先讲 story、再做一个页面修改并 review。
- p22 收束到“A deck you can keep working on.”，不再是泛泛的 launch 口号。

原生表格只用在真正有行列关系的地方；普通叙述保持在一个富文本对象里，没有再用文本框伪装表格。

---

## 插件评估

### DSH 的 `huandeng` 插件

现在能连、能读项目、能写页面，但这个已安装版本本质上还是 **0.1.0 原型**，而工具面已经是 0.19 的能力。它的问题不是“能不能用”，而是“在多项目、多客户端时会不稳定”：

- 一次性 discovery，项目变化后不会持续刷新；
- server 名称依赖发现数量，项目一多容易歧义；
- `includeDefaultRoots: true`，会扩大误连范围；
- 没有完整 config schema，错误只能在运行时暴露。

**建议：直接升级到上游 0.19 的 adapter，不要手改 profile 下的 `node_modules`。** 上游已经用 `ProjectRoutes`、5 秒刷新、稳定 digest 名称和 schema 校验，这些正是现在缺的。

### Claude Code 插件

0.19.0 是当前版本，但 `.mcp.json` 里**没有显式 `HUANDENG_ENTRY`**，而是用 `node scripts/launch-mcp.mjs` 自动发现。一个项目时没问题；多个项目同时打开时，auto-discovery 会产生歧义。另外它依赖系统 Node。

**建议：为每个项目生成显式 entry，或提供 per-project config；不要只靠自动发现。** 这样“Claude Code 改 Section 1、ChatGPT 改 Section 2、DeepSeek 改 Section 3”才有稳定的连接基础。

### AGENTS 是否被遵守

这版遵守了大部分：产品覆盖、真实截图、原始科学图、原生表格、来源致谢、没有编造 benchmark，都已经落地。但有两个真实缺口：

1. **旧页面的 `designIntent` 还没有全部重写。** 我重写了 p2、p4、p10 的页面 Story；其余旧页面的正文已经换了，但 `designIntent` 里仍可能留着上一版“story 叙事”的措辞。这是明确的 Story 债，不是页面内容债。
2. **`design_audit` 仍然检测不到“文本框伪装表格”。** 这次靠人工约束避免了，但工具没有结构性 lint。规则写了不等于执行了；旧版本就是例子——AGENTS 里写了“不要假表格”，输出里仍然出现。

所以我的判断是：**新 AGENTS 的方向是对的，但不能把“写了规则”当成“保证执行”。** 应该把 AGENTS 拆成两部分：

- **must-pass checklist**：产品功能覆盖、真实资产、原生表格、来源、Story/Section 对应；
- **design guidance**：字体、构图、节奏、留白。

再补一个结构化 lint：检测同排/同列文本框伪装单元格、重复分隔线、没有真实行列关系的“表格”。否则 `design_audit` 永远只能看字号和背景，看不到最伤可编辑性的问题。

---

## Claude 中英文为什么差这么多

按当前项目计数，Claude EN 是 **25 Main / 2 Presentations**，Claude ZH 是 **20 Main / 1 Presentation**。差异不是翻译造成的，是**两个版本各自独立创作，没有强制的语义映射**。

EN 多出来的不是“英文更长”，而是一些完整功能块：更多产品步骤、更多复用/交付说明、额外的 Presentation。反过来，ZH 少掉的也不一定是中文不需要，而是作者没有被迫逐项对照。

这次的新 brief 已经要求做“语义对应报告”，但**报告本身不会自动修复旧项目**。真正要补的是：

- 一份双语 semantic map：每个实质 claim、演示、用户步骤、限制、credits 一条 ID；
- 一张 coverage checklist：EN 有的功能，ZH 是“有 / 有意省略 / 缺失”；
- 把“缺失功能”和“本地化选择”分开。缺功能不是翻译选择。

这次我没有改 `claude-zh`，只把它当语义对照；所以这个差异仍然存在，不能被这次 deepseek-en 的修改掩盖。

---

## 文件夹约定

**一个项目 = 一个文件夹 + 一个 canonical `deck.pptd`**，这个约定是对的。一个文件夹里放多个 `.pptd` 会让“打开文件夹”变成猜谜。

建议：

- 打开文件夹时查找**唯一** `deck.pptd`；
- 0 个：提示“这里不是 HUANDENG 项目”；
- 多个：列出让用户选，不要静默取第一个；
- 文件夹后缀优先 `.huandeng` 或 `.slides`，不建议 `.pptd` 后缀，除非先测过 Windows shell 的文件关联行为；
- 自定义文件夹图标继续用 `desktop.ini` + `.huandeng/project.ico`，不要为图标改项目结构。

---

## 多 agent 并发：哪些是真的

真的：

- **不同页面可以并行。** 两个 agent 各自只声明自己触碰的页面，revision 不冲突时都能保存。
- **内容 → 视觉的交接可以做。** ChatGPT 先写内容并保存 operation，Claude Code 读同一个 revision，再 preview/apply/render。这是串行交接，不是实时协同。

不是真的：

- **同一页面不能并行。** 即使两个 agent 改的是不同对象，也会在同一 page revision 上冲突。
- **Story / Sections / order 不能并行。** 它们共享一个 metadata revision，谁先写谁赢，另一个要重读。
- **没有自动 section lock、scheduler、online presence。** Activity 面板只是“声明的阶段 + 保存回执”，不是实时在线状态，也不是锁。
- **没有“三个 Section 同时改”的开箱即用能力。** 只有在页面级、事先划清范围、每个 agent 只碰自己页面的前提下才成立。

所以“人类 + 多 agent 协作”可以作为卖点，但必须说清楚是**页面级并行 + revision 检查 + 串行交接**，不是“多人实时共编”。

---

## 交付文件

已按最终 22 页重新导出：

- PDF：`project:deepseek-en\Exports\deck.pdf`
- PPTX：`project:deepseek-en\Exports\deck.pptx`

PPTX 有一个真实警告：**字体没有嵌入**，PowerPoint 里引用的是 Georgia、Segoe UI、Consolas 的字体名；没有这些字体的机器上，原生换行可能和浏览器渲染不同。这是导出格式的限制，不是页面内容错误。

另外，PDF/PPTX 是当前稿，不等于 owner approval；我只做了渲染检查和顺序检查。页面级 `designIntent` 的旧措辞仍是下一轮要清的 Story 债，我没有把它伪装成“全部完成”。