# 原生科学 PPTX：PowerPoint 验收证据

日期：2026-11-07。验收环境：THUG，Microsoft PowerPoint 16.0。

- [实际通过验收的 PPTX](native-export-acceptance.pptx)
- [Office 自动化验收 JSON](office-acceptance.json)
- [视觉检查记录](visual-inspection.json)
- [长短标题的原始像素与 OOXML 定位复核](title-layout-check.json)

PPTX SHA-256：`8de5a51e947ab1446a47c126b8f44d0c716830f98d37f2b7e00827e6e8ef36b0`。

源为合成验收数据。生成脚本是 `scripts/generate-native-pptx-acceptance.mjs`，Office 验证脚本是 `scripts/verify-native-pptx-office.ps1`。PPTX ZIP 元数据可能使重新生成的文件哈希不同；此处保留的是实际经过无修复打开、对象修改、保存重开和逐页图像检查的文件。

| 页 | 验收对象 | 实际 PowerPoint 输出 |
| --- | --- | --- |
| 1 | 正文内公式、积分、分式、根式、矩阵、均值上划线、合并单元格、表格内公式 | [slide-1.png](slide-1.png) |
| 2 | 原生柱图与柱线组合，真实零值和负值 | [slide-2.png](slide-2.png) |
| 3 | 原生散点和气泡图，数值 X 坐标，零面积气泡 | [slide-3.png](slide-3.png) |
| 4 | 原生饼图和面积图、图例、数据标签 | [slide-4.png](slide-4.png) |
| 5 | 7 种 DrawingML 预设形状，其中 3 个保留原生组 | [slide-5.png](slide-5.png) |

PNG 来自原始样稿，在脚本修改数据之前导出。所有 PNG 的 SHA-256 与 `office-acceptance.json` 一致。原生对象修改保存在单独 roundtrip 文件；源样稿哈希保持不变。

额外检查了长标题是否上移：五张原始 PNG 均为 1280×720，标题有色文字的顶部都在 y=33；对应 OOXML 均为 y=24 pt、top anchor、noAutofit。长标题和短标题没有实际位置差异。

实际发现并修复的缺陷包括：图表工作簿零值变空白、文本分类被写进数值缓存、组合图系列使用不合法的数据标签位置、高公式被固定行距覆盖、KaTeX 均值上划线的 Office 重音表示不兼容。修复后最终 Office 检查退出码为 0，且逐页图像检查通过。

范围：原生科学对象及该固定样稿的可编辑性、数据和视觉完整性。图表在 PowerPoint 中由其自身引擎布局，因此不承诺与 ECharts 逐像素相同；高级 7 种图表仍按对象图片导出并明确报告。该样稿不替代完整科研项目、桌面交互、章节编排和页面版本流程的验收记录。
