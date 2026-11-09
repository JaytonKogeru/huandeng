# HUANDENG v0.15 规格：工作区视图与语言一致性

## 界面结构

顶层：项目标题 / 当前主序列或演讲 → 助手连接、动态 → 保存状态/历史 → 导出、放映、设置。

固定文档行：**幻灯片**（不可关闭） + 用户打开的文件（可关闭）。幻灯片内部有 **编辑 / 章节浏览 / 备注页** 三种视图。左侧缩略图/大纲仍用于快速定位；中央浏览适合检查整套结构和画面；右侧属性只在编辑时出现。切视图保留当前页面/演讲出现项和所有草稿。

```text
HUANDENG  项目 · 主幻灯片       助手  动态  保存状态  导出  放映⌄  设置
项目 页面 素材 文件 | 幻灯片（固定）  文件.md ×
缩略图 / 大纲     | 编辑  章节浏览  备注页
                 | [编辑] 对象工具 — 画布 — 属性/布局/图层/故事/检查
                 | [浏览] 搜索/缩略图大小 — 章节标题、页数、网格 — 选择/重排
                 | [备注] 页面预览 — 讲稿编辑 — 上一页/下一页
```

## 全局约束

- UI locale values remain `zh-CN` and `en`; translate UI-owned text only. Keep authored slide text, titles, notes, paths, IDs and figure pixels verbatim.
- Slides is a permanent document; Ctrl+W closes only an active file preview. Explicit Project/window close remains available and uses existing draft guards.
- Use the existing shared writer and revision checks. Do not introduce an independent page, notes, order or review store.
- Keep pageId, mainPosition, occurrenceId and versionId distinct. Repeated and pinned presentation occurrences must keep their identity and read-only semantics.
- Use existing dependencies. Preserve unrelated work and private project content outside Git.
- Use `corepack pnpm`; add a core changeset; editor/plugin versions are independent of core package versions.

## 语言

移除将中文强制英文化的 productVocabulary。系统界面在中文模式呈现中文，在英文模式呈现英文，包括空状态、提示、属性标签、布局、动画、备注、助手、原生菜单。HUANDENG 品牌、ID、API 等技术缩写可保留；中文“助手连接”不必保留 Agent setup。英文或中文作者内容不随 UI 切换翻译。

主术语：项目 / Project；幻灯片 / Slides；页面标识 / Slide ID；位置 / Position；章节 / Section；演讲 / Presentation；故事 / Story；备注 / Notes；属性 / Properties；图层 / Layers；检查 / Checks。可按语境使用“页面”，但不要混成“Slide列表”。

## 章节浏览

使用真实页面渲染与主题、素材，不用假缩略图。主序列按有效的连续章节分组；未分组页面明确显示，章节标题与缩略图分开，不假定首张是封面。支持章节折叠、按标题/故事/标识/章节搜索、缩略图大小调节、选中页与双击/回车返回编辑。显示主位置与稳定标识但层级不同。

页面标题优先采用显式标题或标题角色；导入页面没有角色时依据实际文字层级与位置识别标题，不把页脚位置字段或底部引用当作标题。搜索必须包含既有页面故事，不能只在占位提示里承诺。此识别只用于导航，不改作者内容。

主序列支持经现有 writer 的排序与章节管理入口；搜索时不提供含糊的拖放排序。演讲视图使用实际出现项顺序，重复页面各自可选；固定版本只读，不能错误拖动主序列。章节编辑入口打开现有组织对话框。空集合、无结果、未分组、非连续章节、隐藏页、长标题、图片缺失必须可用。

## 备注页

中央显示可读的页面预览与宽讲稿区，提供上一页/下一页。主序列备注共享现有 page draft 与自动保存，不发生相互覆盖。演讲备注保留出现项语义，使用现有编辑入口，固定版本仍只读。长备注可滚动，中文输入法与切页不得丢失文本。编辑视图的小备注面板保留为快速入口；两者不同时占满工作区。

## 导航与放映

助手连接移到应用顶栏，原生菜单打开同一个对话框。动态继续展示实际报告和回执；配置完成不等于实际连接成功。

放映菜单明确：从头放映 F5；从当前页放映 Shift+F5。使用既有播放序列与隐藏页规则。非播放状态 Ctrl+W 关闭文件并返回幻灯片；在幻灯片中只保留当前文档，绝不关闭项目。文件草稿与项目显式关闭保护保持有效。

## 动画

保留单一对象工具栏动画入口。打开后明确“对象效果 / 点击步骤 / 页面转场”，说明对象先选中、效果可预览、保存后进入放映。高级关键帧入口保留；不创建第二套动画模型。效果与转场草稿继续阻止冲突导航/放映；预览不改基础位置。明确静态导出不保留交互动画。

## 私有项目处理

footer-correction deck：检查底部右侧标识对象，匹配稳定短码后转换 `content.field: main-position`，兼容文字使用当前位置；不调整字号、图形或正文。不把封面无页码当作错误强加页码。

section-divider deck：逐章查看起始页，已有封面保留，只有分组却无封面的章节按既有风格补标题页。使用现有章节标题和可核查说明，不增加实验结论；保留证据页与既有 ID。新封面进入章节并更新稳定起始锚点。前言/封面区域不机械补封面。

## 验收

单元验证覆盖本地化、键盘、分组/排序边界、出现项身份、备注保存。原生 Electron 验证中英文与深浅色、窄窗口、三视图切换、文件关闭、实际 Ctrl+W 菜单、从头/当前放映、点击动画、草稿保护。对私有项目验证位置字段、章节封面和实际渲染。打包后运行真实安装布局冒烟；保留恢复路径，不宣称未验证的客户端已连接。
