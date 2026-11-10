# HUANDENG：科研演示的编辑工作流

ChatGPT 重做的中文项目介绍。打开本目录的 `deck.pptd`，继续编辑同一份作品；移动时保留整个文件夹。

- Main 与“完整介绍”：19 页。
- “简短介绍”：7 页，改变讲述顺序，并固定科学示例的命名版本。
- 三张纯标题 Section：Main 第 3、7、12 页。
- 原始 HUANDENG 标识、真实客户端图标、暖纸色 / 灰绿 / 沙色背景按内容角色使用。
- 公开 PDB 1BNA 的结构、12 个距离、表格与公式组成同一个科学案例。
- 中文 UI 与中文内容的真实截图，原生 DPR3 采集。

当前素材索引见 `evidence/assets.json`；科学原始坐标、CSV、方法和复现脚本在 `sources/science/`。原图和过去导入的素材保留，避免破坏页面历史。

`evidence/wording-edit.json` 与 `wording-edit-values.json` 记录精确操作：当时只改标题与说明。随后单独调整过坐标轴，并去掉仅用于高亮点的辅助曲线，以保留 PowerPoint 原生图表；原始 12 个数值未变。简稿仍固定到早期措辞修改后的版本。

当前 PDF 与 PPTX 位于 `Exports/`，也随 plugin-v0.18.2 的介绍稿交付发布。PPTX 保留支持的原生文本、图表、表格和公式；功能图标作为图片交付。现场点击效果与静态导出分开。

上一轮视觉稿被作者拒收。本轮经过 Agent 视觉复核与文件验证，供作者评审，不声称已经获作者认可。完整比较和限制见上级目录 README 与 docs/INTRODUCTION-DELIVERY.md。
