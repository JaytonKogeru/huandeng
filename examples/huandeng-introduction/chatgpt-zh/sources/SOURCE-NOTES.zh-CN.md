# 中文介绍的来源与材料说明

这份说明随可编辑项目一起保留，用于区分故事来源、实际证据、代码归属与设计参考。它不代表最终幻灯片或导出文件已经验收通过。

## 原始故事与补充组织

未改写的[作者口述故事](story/USER-STORY.zh-CN.md)是叙事来源。页面中的归纳、转折以及 Editor 教学的安排，是在原故事基础上的编辑组织，不能冒充作者逐字说过的话。

原故事把组会中被认出的 AI 风格、保留作者判断的愿望、五十页只改两页的问题、页面身份与历史、原始素材及持续与 agent 合作连在一起。“五十页／两页”是作者举出的修改情境，不是计时实验或性能测量。[产品事实说明](story/FACTS.md)单独记录技术事实和归属边界。

项目的创作约定在 [AGENTS.md](../AGENTS.md)。中文版按自己的叙事组织页面，不要求与英文版一页对一页翻译。它保留原来的多 agent 创作沿革；本轮由根作者亲自修订，调查支持不代表每页均由子 agent 制作。

## 代码、思路与致谢

[完整致谢与设计参考](ACKNOWLEDGMENTS.md)保留原介绍中的十五项明确来源，以及完整三十三项历史研究参考。每项说明具体贡献；整份清单不是统一的运行依赖表，也不是供各作者共用的素材库。

OpenSlide 是 Editor 的代码基础。作者通过 Kimi 生态接触到的 PPTD 思路属于格式与工作流启发。OpenPPTD 提供三个公式转换模块，PptxGenJS 用于生成 PowerPoint。OpenSlides Studio（openslides.dev）是另一个项目，提供操作和身份设计参考；OPF 为版本前提与事务设计提供参考。

Apache ECharts、KaTeX、Font Awesome 分别有自己的运行职责。下述科学图由 Python、NumPy 与 Matplotlib 生成，不是 ECharts 截图，也不是用幻灯片线条拼出的数据曲线。保留的许可声明见[桌面第三方说明](../notices/desktop-NOTICE.md)、[OpenPPTD 声明](../notices/open-pptd-NOTICE.md)与[项目许可](../LICENSE)。

## 本轮独立取得的公开科学案例

当前来源目录为 [independent-20261111](independent-20261111/)。[采集记录](independent-20261111/ACQUISITION.json)记载：ChatGPT 作者从 [RCSB PDB 1BNA](https://www.rcsb.org/structure/1BNA)重新下载公开坐标，并在自己制作的中英文两版内复用。这不是从 Claude Code 或 DeepSeek 的素材库复制的输入。

| 本地文件 | 作用 |
| --- | --- |
| [1BNA.pdb](independent-20261111/1BNA.pdb) | RCSB 的沉积坐标；采集记录保留原下载网址与文件哈希。 |
| [paired-c1-distances.csv](independent-20261111/paired-c1-distances.csv) | 十二组 C1′–C1′ 欧氏距离：A 链残基 1–12 对应反平行 B 链残基 24–13，单位为埃。 |
| [generate_science.py](independent-20261111/generate_science.py) | 使用 NumPy 计算、Matplotlib 作图；执行时会重新下载公开来源并写入派生文件。 |
| [c1-distances-zh.svg](independent-20261111/c1-distances-zh.svg)及 [PNG](independent-20261111/c1-distances-zh.png) | 从上述十二个数值生成的中文科学图。 |
| [1bna-projected-bonds.svg](independent-20261111/1bna-projected-bonds.svg)及 [PNG](independent-20261111/1bna-projected-bonds.png) | 坐标的主轴投影，显示同链距离连线及配对 C1′ 位置之间的连线。 |

这些测量来自一个静态晶体结构。十二个位置不是十二次重复实验，图中没有估计重复测量的不确定性，C1′ 距离也不是氢键长度。结构示意中的距离连线不表示化学键级。保留这些说明，是为了让图能被准确解释和复现。

文献：Drew 等（1981），*PNAS* 78，2179–2183，[doi:10.1073/pnas.78.4.2179](https://doi.org/10.1073/pnas.78.4.2179)；结构为 [PDB 1BNA](https://www.rcsb.org/structure/1BNA)。这个案例用于说明原始数据和派生证据如何留在可继续编辑的项目中，DNA 分析并非本介绍的主线。

## 本轮证据与保留历史

原有 `science/`、`brand/`、`reference/` 目录与历史记录继续保留。文件存在不等于它已满足本轮的独立采集要求；本轮科学来源以上述独立记录为准。历史保留材料也不是不同作者继续互用图片的素材池。

[图像来源记录](visual-provenance.json) 对应当前保存的 Main 与短演讲实际解析后使用的图片，记录页面、对象中的使用位置及获取或派生信息。没有进入这些序列的历史保留图片，不被列为本轮使用证据。

本轮界面讲解使用作者在实际项目中自行取得的截图。截图记录具体 Editor 状态，概念图解释关系，两者应明确区分。既有 0.19 Editor 实拍与 0.20 候选版 Rules 实拍各自保留真实运行版本，不能因为候选版更新，就给旧界面图片改标新版本。

私有科研项目只用于理解设计，没有授权其科学图件或私有文件成为公开素材。继续编辑或分享时，请保留完整项目文件夹，使原始数据、备注、许可声明和有意义的页面历史一起存在。
