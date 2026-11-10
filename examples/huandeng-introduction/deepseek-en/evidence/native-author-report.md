# Native visible response excerpt

The text below preserves the native author's own wording. Unrelated machine/coordination sections and internal path prefixes are omitted. This author handoff predates the independent content and Office checks; see native-trial.json, qa.json and content-review.json for those results.

做完了。这一版按你口述的“为什么做”重新搭了一版 **18 页英文版**（`deepseek-en`）。目录当时只剩一张空白页，所以我从结构开始重做，没有覆盖旧素材；真实 UI 截图、1BNA 图、品牌图都保留复用。

### 这版的故事线

**第一幕 · 为什么会有这个工具（1–8）**
- 组会里，导师和在场的人一眼就能看出 AI 做的 slides
- 不是风格问题，是“没有重点”：每个点都有页、每个页都有标题、每个标题都有三条 bullet，却没有一条被允许成为重点
- 所以把顺序倒过来：人先讲，模型整理，再做页
- 讲话本身就是稿子；如果先做 deck，人就会去解释 AI 的顺序
- 改两页，却多出一个 deck 副本；版本管理应该以 page 为单位
- 只能靠整页截图审计，不可 diff、不可定位、不可测试
- 于是把 page 变成文件：PPTD + open-slide/React，装进 Electron
- 一个 title-only 的深色停顿页：**The editor**

**第二幕 · 做出来的东西（10–18）**
真实编辑器 → Story 留在页边 → Position 与 Slide ID → 每页历史 → 精确 diff → 素材库与 1BNA 真实图 → 一份 Main、多种 Presentation → PDF/PPTX/MP4 → 收在“**A deck should sound like the person who made it.**”

### 视觉与编辑上的决定
- 深色封面、章节页、结尾，配暖纸色内容页；Georgia 标题、Segoe UI 正文、Consolas 标注；UI 截图装在细框里，当作版面证据，不当装饰。
- **没有用文本框拼表格。** 段落和列表都在单个文本框里；文件树、副本列表也是单文本框；没有任何“单元格式”排列。这条我按你上次的批评专门落实了。
- 1BNA 页保留真实图、坐标轴、单位、citation，并写明“one structure, not independent replicates”，不把它说成 HUANDENG 的测量结果。
- 每页都有 Speaker Notes，按你的口述写，不是后期补的演讲稿。
- 没有参考 Claude 或 ChatGPT 的版式；这版是独立做的。

### 交付
- `Exports\deck.pdf`
- `Exports\deck.pptx`（导出报告：文字/形状为原生可编辑对象，图片为原始素材；字体未嵌入，PowerPoint 可能轻微 reflow，这是唯一材质限制）
- 18 页渲染我逐页看过；PDF/PPTX 导出成功，但我没有在 PowerPoint 里实际打开复核。
- 命名版本 **“Story-driven cut”** 记在封面和结尾页。
- 设计审计 3 条提示：p4 的 26px 三行、p9 的 64px 章节页是故意的；第一节没有独立 title-only 章节页，是我只放了一个停顿页，避免空页太多。


