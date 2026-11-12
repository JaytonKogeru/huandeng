# 保存的演讲备注：claude-zh

从实际保存的 Main 和 Editor 正式解析的演讲生成。命名版本与单次引用备注由 Editor 解析；以下备注不作改写。

## Main

页数：27.

### 1. 让幻灯片从 你的故事开始

Slide ID: SAHG / Main position: 1

今天想讲为什么我要做幻灯，而不是把功能列一遍。它开始于组会：大家一眼就能看出哪些 slides 是 AI 做的；还有 agent 为了改两页，复制出好几份文件。幻灯是一个桌面编辑器：你和 AI agent 从你想讲的故事出发，围绕同一份项目，一页一页地做演示。右边的分子是后面要用的实例：PDB 1BNA 的 DNA 十二聚体。

### 2. 我为什么做幻灯

Slide ID: ZX58 / Main position: 2

第一部分，先讲为什么。有四个原因，都来自真实的组会，以及我真的用 AI 做 slides 时遇到的事。

### 3. 导师一眼就能看出是 AI 做的 slides

Slide ID: FNHB / Main position: 3

事情是从组会开始的。我在组会上看到越来越多用 AI 做的 slides，我也觉得这是趋势：slides 本身就是数据，是一种文件格式，agent 迟早要学会做它。但我的导师，还有屋里大多数人，一眼就能看出哪份是 AI 做的。每个工具风格不同，PowerPoint、Google Slides、ChatGPT、Kimi，可看起来都还是 AI。我在小红书上看到一个说法很认同：AI 味来自没有重点、面面俱到、没有故事、追求完整和免责。这是我个人的观察和判断，不是研究结论。连这份介绍也掉进过这个坑。右边是 Claude Code 前一天做的上一版，看着不错；我当时的评价是：美术效果很好，但没有重点，因为没有故事。这就是这个项目要解决的问题。

### 4. 改两页，不该多出三份文件

Slide ID: KS6E / Main position: 4

第二个问题出现在我让 agent 改稿的时候。比如五十页的 slides，我只想改两页。很多 agent 很谨慎：不直接替换文件，而是保留原稿、另存一份新的。再微调一下，又是一份。一个下午过去，文件夹里全是几乎一样的稿子，历史散落在文件名里。这让我想到 Git：版本管理之所以好用，是因为修改单位小，而且每次修改都有记录。所以在幻灯里，页面就是修改单位：一次修改只改写一个页面文件，并记进这一页的历史；命名版本用来标记里程碑。左边的文件名和右边的修改都是示意，不是真实目录。

### 5. 只靠截图，agent 的修改又慢又难核对

Slide ID: 2723 / Main position: 5

第三个问题，是我让 AI 改 Google Slides 或 PowerPoint 的时候遇到的。为了检查自己的结果，agent 常常要把整页渲染成图片，看一遍，再从像素里推断该改哪个数值、哪个位置。图片当然也能测量和比较；但在这个循环里，每一次精确修改都得先从图里还原出来，很慢。所以我想要一种格式，让 agent 除了看图，也能把这一页当成数据来读。右边是本项目里 1BNA 那一页的真实片段：数据图是一个对象，有边界和来源文件名；图本身是 Matplotlib 从项目里的 CSV 画出来的，数据和脚本都在 sources 目录里。要改一个数值，agent 改 CSV、重跑脚本、只替换这一张图，不碰别的，写入器能准确显示改了什么。我仍然会看渲染图来判断构图和可读性；它是审阅界面，不是可编辑的模型本身。

### 6. 先讲故事，再做页面

Slide ID: GZBW / Main position: 6

这是我最在意的一点。如果 AI 先做 slides，你再照着它写讲稿，最后就是跟着 AI 的逻辑走，在我看来那份逻辑常常是没有灵魂的。如果你先把故事讲出来，像跟同事解释一样，想到哪说到哪，agent 可以先把它整理好，再在上面做页面，你自己的话也就成了演讲备注。即兴讲话本身也有结构。保住它，稿子更容易留住你自己的判断和观点，你也不用事后编讲稿。但它本身并不能消除 AI 味：渲染出来的页面我仍然要自己看。这份介绍就是例子：我先讲了为什么做幻灯，agent 没有照着复述，而是按照介绍产品的需要重新组织，补上了我没讲到的产品细节。

### 7. 我做了什么

Slide ID: 6KNX / Main position: 7

第二部分。这四个问题最后变成一个工具：一个编辑器加一个插件。下面讲它从哪里来、长什么样。

### 8. PPTD 加 React，做成一个桌面编辑器

Slide ID: 2UCC / Main position: 8

那我做了什么？在看大家怎么教 agent 做 slides 的时候，我在 Kimi Slides 的生态里接触到 PPTD 的思路：一份 slides 是一个由页面文件组成的目录，而不是一个打包好的文件。然后我找到了 OpenSlide，一个开源编辑器，每一页都是一个 React 组件。我觉得这两个想法可以合在一起：PPTD 做文档，React 做界面。幻灯就是这个组合，做成了一个 Electron 桌面应用。大部分编辑行为来自 OpenSlide；章节、视图和备注借鉴 PowerPoint 和 WPS，图层面板借鉴 Photoshop。编辑器旁边是一个插件，让你已经在用的 AI 客户端能在同一个编辑器里工作。编辑器加插件，就是幻灯的工作流。说清楚致谢：OpenPPTD 是另一个项目，我们只复用了它的公式转换代码；幻灯和 Kimi 没有任何隶属关系。

### 9. 把 PPTX 解压：它本来就是按页存的

Slide ID: 3DUH / Main position: 9

用一张图讲格式。把一个 PowerPoint 文件解压，会发现它本来就是按页组织的：presentation.xml，然后 slide1.xml、slide2.xml，媒体、备注和图表也都是单独的部分。左栏来自这份稿子自己导出的 PPTX。PPTD 用的是同一个思路，只是把这些部分留成一个打开的工作目录：deck.pptd 管页序，每页一个 .page 文件，一个 media 素材目录，还有一个 .huandeng 目录放页面短码、故事、章节、演讲和历史。所以 agent 可以只打开一个页面文件，没有什么逼它重写整份稿子。需要发给别人时，幻灯仍然可以导出 PPTX。从 0.19 开始，可以打开 .pptd 文件，也可以直接打开项目文件夹，只要文件夹里正好有一个 .pptd。搬动项目时要带上整个文件夹，而不只是 deck.pptd。这份介绍本身就是这样一个目录。

### 10. 幻灯 Editor

Slide ID: SSFR / Main position: 10

这就是编辑器本身，打开的就是这份介绍本身，选中的是 1BNA 那一页。1，侧栏有四个页签：项目、页面、素材、文件；文件页像 VS Code 显示代码仓库一样显示项目目录。素材是一个真正的素材库：项目里的每张图、它的原始尺寸、在哪些页面用到。2，画布上方的视图：普通、浏览、大纲、章节、备注页和历史。3，画布编辑原生对象，包括表格和图表。4，属性面板：属性、布局、借鉴 Photoshop 的图层面板、这一页的故事，以及检查。5，助手连接用来接入你已经在用的 AI 客户端；动态里能看到它主动上报的工作和实际保存的修改，两者分开显示。6，导出和放映。编辑器里没有内置聊天框。

### 11. 故事先行：一页从头到尾

Slide ID: MC4X / Main position: 11

第三部分。现在跟着一张真实的科研页走一遍：它展示什么，背后的故事是什么，修改怎么提出，又怎么检查。

### 12. 1BNA：十二个碱基对的 C1′–C1′ 距离

Slide ID: BRHY / Main position: 12

这就是这份介绍关心的那种页面：一个真实的结果。结构是 PDB 1BNA，Dickerson–Drew DNA 十二聚体，按沉积坐标绘制；链 A 绿色，链 B 赭色。对十二个碱基对，我们测了配对 C1′ 原子之间的距离。右边的图不是在幻灯里画的，而是用 Python 的 Matplotlib 读取 CSV 里的十二个数值画出来的，和结构图一样，脚本就放在项目里，随时可以重跑。纵轴有标签和单位，故意不从零开始，这样几何上的变化才看得出来；横轴同时标出位置和碱基对。要改一个值或一个标签，改的是 CSV 或脚本，重新出图，再替换这一张图，而不是在幻灯里描线。注意它说的是什么：这是同一个晶体结构里的十二个位置，不是重复实验，没有误差棒。最短在第 7 对，中间 AATT 区的一个 T–A；最长在第 12 对，末端的 G–C。方法：链 A 残基 1–12 依次对应链 B 残基 24–13，计算 C1′ 原子间欧氏距离。数据见 sources/science/paired-c1-distances.csv，绘图脚本见 sources/science/slide-figure/plot.py。来源：RCSB PDB 1BNA，https://www.rcsb.org/structure/1BNA；Drew HR 等，PNAS 78 (1981) 2179–2183，https://doi.org/10.1073/pnas.78.4.2179。

### 13. 故事告诉 agent 什么最重要

Slide ID: 3D9R / Main position: 13

这是幻灯里最直接来自“故事先行”的部分。每一页都带一段简短的故事：它为了什么，什么必须保留，这次要改什么。可以把它看成我和 agent 之间的对齐工具。右边是这份介绍里 1BNA 那一页实际记录的故事：数值保持不变，保留有标签的坐标轴和单位，保留引用，不作重复实验或趋势的说法。agent 被要求整理这一页时，会先读这些。整个项目、每个章节、每场演讲也都有自己的故事。agent 写下的故事是它的理解，不等于我认可。

### 14. 大纲视图：把整份稿子当故事读

Slide ID: A9FE / Main position: 14

打磨任何一页之前，我会先把整份稿子当故事读一遍。大纲视图按章节列出每一页的标题、故事摘要和页面短码，我能看出论证是否成立。浏览视图用缩略图显示同样的页面，看密度和节奏。章节把讲述分成几部分，每章从一个稳定的首页开始，到下一章为止。

### 15. 一次修改：前后对照

Slide ID: GBXR / Main position: 15

这是一次真实的修改，就发生在这份介绍的 1BNA 那一页上。把图换成 Matplotlib 画的以后，原来的标题“以数据保存”已经不准确了，所以这一页的故事写下了这次修改：标题改为说清测得的是什么，图、数据和引用不变。左边是修改前，右边是修改后，绿框是编辑器自己在审阅里标出的改动对象。下面的表格列出了到底改了什么：标题和页面故事；结构图、数据图、数据、引用和版式都没动。这次修改先作为一个事务提出、预览，然后通过共享写入器写入，所以它被记录下来，下一页就能回看。

### 16. 每一次保存的修改都能回看

Slide ID: 3442 / Main position: 16

修改保存以后，任何人都能打开它的记录。1，回执写明是哪次操作、在哪个项目、什么时候。2，修改前和修改后显示真实的页面，改动的对象被框出来。3，已保存的修改列出写入的每个对象和字段，这里是标题和导语的文字。4，面板还显示这一页的故事和使用范围：这里 BRHY 在两场演讲里都是实时引用，没有固定版本引用。这个对话框是只读的。想要回到旧版本，要在历史里恢复一个命名版本，而且只影响这一页。人和 agent 的修改走同一个写入器，所以审阅方式也一样。

### 17. 以“页”为单位修改

Slide ID: 85Z6 / Main position: 17

第四部分。回到 Git 的想法：如果页面是修改单位，每一页就需要一个不会变的名字，以及它自己的历史。

### 18. 说“BRHY”，别说“第 12 页”

Slide ID: ZWM9 / Main position: 18

以前跟 agent 说我的 slides，我会说：改第四页。可如果顺序和上一版不一样，第四页就是另一页了。所以幻灯把两件事分开。位置只是这一页现在排在哪。页面短码是一个四位的字母数字编码，永远属于这一页。左边是同一页 1BNA 的两个状态栏：在主幻灯片里它排第 12，在组会简版里排第 5，页面短码一直是 BRHY。现在我可以说：改 BRHY 上的图，agent 就知道是哪一页，下周也一样。页面历史也是挂在这个短码上的。

### 19. 每一页都有自己的历史

Slide ID: DY5H / Main position: 19

这是我认为最重要的功能。历史按页保存，而不是整份稿子一起存。在页面面板里右键一页，选“查看历史版本”。已记录版本是我自己命名的里程碑，比如这里 BRHY 的三个版本，最早的两个还在用幻灯里画的原生图表。操作记录列出这一页每一次保存的修改，每条都能审阅。恢复一个版本只改这一页；其他页面、以及用到它们的演讲都保持原样。这就是开头那一文件夹副本的替代品。

### 20. 一份主幻灯片，两场演讲

Slide ID: D26F / Main position: 20

一个幻灯项目有一份主幻灯片。一场演讲是指向它的一串有序引用。左边是编辑器里的项目概览，有主幻灯片和这两场演讲。右边就是这份稿子本身。你现在看的完整介绍有二十七页。组会简版用其中九页、按自己的顺序：几个原因、1BNA 那一页和它的故事、页面历史、agent，以及怎么开始。这些缩略图都是从本项目渲染出来的。两场演讲都不持有副本，所以我在主幻灯片里修好 1BNA 的图，两场都会显示修好的版本。组会简版有四页用了本场专用的简短备注，这些备注属于那一次出现，而不属于这一页。如果某场演讲需要冻结，比如已经提交的版本，可以在那里把某一页固定到一个命名版本。图片则在素材库里：它和页面库是两回事，哪页用了哪张图都查得到。

### 21. 和 agent 一起工作

Slide ID: XVAD / Main position: 21

第五部分。最后讲 agent 怎么接进来、几个 agent 怎么一起干活、稿子怎么交付、幻灯站在哪些项目上，以及怎么开始。

### 22. agent 和你用同一个写入口

Slide ID: FK8W / Main position: 22

你继续用自己已经在用的 AI 客户端。Codex 和 Claude Code 在本地通过 MCP 加载幻灯插件；DeepSeek Harness 用的是原生插件包；ChatGPT 通过现有的 DC-WALT 工作站连接接入。不管哪个客户端，每一次写入都经过编辑器窗口也在用的那个共享写入器。它确认 agent 读到的是当前版本，只写入预览过的那份修改，并返回回执。所以 agent 不能悄悄覆盖我一分钟前改过的东西。这份中文版就是 Claude Code 沿着这条路径写进来的。

### 23. 几个 agent 可以同时改同一个项目

Slide ID: 7K3P / Main position: 23

既然所有客户端都走同一个写入器，人和多个 agent 就可以同时开工。比如 ChatGPT 起草内容，Claude Code 再做整体视觉整理；或者一个 agent 负责一章。写入器的规则很简单：改不同页面的提议都能保存；同一页哪怕改的是不同对象，后到的那一次会被拒绝，要重新读取再提议；故事、章节这些项目信息共用一个版本号，也可能冲突。交接的时候，写清楚是哪次操作、哪一页、哪个版本，下一位先读保存后的结果再动手。0.19 做过一次真实测试：DeepSeek Harness 的原生会话和 ChatGPT 共用一个三页的测试项目，各改各的页面都保留了，过期的同页写入被拒绝，之后的风格交接保留了另一方的内容。要说清楚：现在没有章节锁、没有自动排班，也没有在线状态显示。分工靠人事先约定。

### 24. 检查、放映和导出

Slide ID: J28N / Main position: 24

交付之前，先跑一遍设计检查。它读整份稿子并报告观察：超出你设定范围的字号、意料之外的背景、没有标题页的章节、显示尺寸下像素不够的图片。它是只读的，最后还是要你自己看。放映可以按 F5 从头开始，或按 Shift+F5 从当前页开始，全屏，支持点击动画。导出用的是开始导出那一刻已保存的稿子。项目文件夹本身才是可编辑的源。PPTX 尽量保留原生对象，合作者可以在 PowerPoint 里继续改文字、表格和基础图表，动画会变成静态。PDF 用来分享，MP4 按时间播放点击动画。这份稿子就是这样导出 PDF 和 PPTX 的。

### 25. 站在开源项目上，也说清还没做到的

Slide ID: YS6V / Main position: 25

幻灯不是从零开始的。编辑器基于 OpenSlide，MIT 许可。公式转换复用了 OpenPPTD 仓库的代码；这里的 GitHub 标志指的是那个仓库，不是 OpenPPTD 的标志。PowerPoint 导出用的是 PptxGenJS。右边是幻灯还没做到的事，都列在项目 README 里：导入任意 PPTX 并往返、直接编辑 Google Slides、第二屏的独立演讲者窗口、可继承母版、导出文件中的原生 PowerPoint 动画，以及插件市场。如果你需要其中某一项，那正是最需要贡献的地方。

引用网址（名称链接到仓库或官网）：
HUANDENG: https://github.com/JaytonKogeru/huandeng
OpenSlide: https://github.com/open-slide/open-slide
OpenPPTD: https://github.com/Shingwha/open-pptd
PptxGenJS: https://github.com/gitbrent/PptxGenJS
PowerPoint: https://www.microsoft.com/microsoft-365/powerpoint
WPS: https://www.wps.com/
Kimi / Moonshot AI: https://www.kimi.com/
open-kimi-ppt-skill: https://github.com/Amonginin/open-kimi-ppt-skill
PPTist: https://github.com/pipipi-pikachu/PPTist
VS Code: https://github.com/microsoft/vscode
Slidev: https://github.com/slidevjs/slidev
Presenton: https://github.com/presenton/presenton
PPTAgent: https://github.com/icip-cas/PPTAgent
PPTMaster: https://github.com/hugohe3/ppt-master
OpenSlides Studio: https://gitlab.com/open-slides/openslides
OPF: https://github.com/OpenPresentation/opf
Apache ECharts: https://github.com/apache/echarts
KaTeX: https://github.com/KaTeX/KaTeX
Font Awesome: https://github.com/FortAwesome/Font-Awesome
OpenSlides Studio website: https://openslides.dev/
OPF website: https://www.openpresentation.org/

### 26. 致谢

Slide ID: MK7X / Main position: 26

最后谢谢这些项目。真正在代码里的只有三个：OpenSlide 是编辑器的基础，OpenPPTD 提供了公式转换，PptxGenJS 负责写出 PPTX。想法上，我是在 Kimi 的生态里接触到 PPTD 的，open-kimi-ppt-skill 这个社区项目整理过它的格式。设计上参考了 PowerPoint 和 WPS 的章节与备注、VS Code 的侧栏和面板、OpenSlides Studio 的显式 ID，以及 OPF 的版本前提和冲突处理。右下是我研究过的同类项目：PPTist、Slidev、Presenton、PPTAgent 和 PPT Master。它们都不代表为幻灯背书；完整清单在仓库的 ACKNOWLEDGMENTS 文档里。

引用网址（名称链接到仓库或官网）：
HUANDENG: https://github.com/JaytonKogeru/huandeng
OpenSlide: https://github.com/open-slide/open-slide
OpenPPTD: https://github.com/Shingwha/open-pptd
PptxGenJS: https://github.com/gitbrent/PptxGenJS
PowerPoint: https://www.microsoft.com/microsoft-365/powerpoint
WPS: https://www.wps.com/
Kimi / Moonshot AI: https://www.kimi.com/
open-kimi-ppt-skill: https://github.com/Amonginin/open-kimi-ppt-skill
PPTist: https://github.com/pipipi-pikachu/PPTist
VS Code: https://github.com/microsoft/vscode
Slidev: https://github.com/slidevjs/slidev
Presenton: https://github.com/presenton/presenton
PPTAgent: https://github.com/icip-cas/PPTAgent
PPTMaster: https://github.com/hugohe3/ppt-master
OpenSlides Studio: https://gitlab.com/open-slides/openslides
OPF: https://github.com/OpenPresentation/opf
Apache ECharts: https://github.com/apache/echarts
KaTeX: https://github.com/KaTeX/KaTeX
Font Awesome: https://github.com/FortAwesome/Font-Awesome
OpenSlides Studio website: https://openslides.dev/
OPF website: https://www.openpresentation.org/

### 27. 从你的故事开始

Slide ID: BDTW / Main position: 27

想试试的话，打开编辑器新建一个项目，或者打开已有的 .pptd 文件，也可以直接打开项目文件夹。在助手连接里接上你已经在用的 AI 客户端。然后照我做这份介绍的方法来：先把你的故事讲给 agent，大声讲、想到哪说到哪，让它先整理故事，再做页面。之后一次只请它改一处：看预览，写入，再回看审阅。右边是代码和构建命令，最下面是仓库地址。谢谢大家。

## 幻灯介绍（完整版，约 25 分钟）

页数：27.

这个演讲解析后的页面顺序与备注，与上面的 Main 完全相同。

## 组会简版（约 8 分钟）

页数：9.

### 1. 让幻灯片从 你的故事开始

Slide ID: SAHG / Main position: 1

组会简版，大约八分钟。我跳过产品导览，只讲故事：为什么做它、一张真实的页面、一次修改怎么完成。

### 2. 导师一眼就能看出是 AI 做的 slides

Slide ID: FNHB / Main position: 3

简短地说：大家都见过一眼就像 AI 做的 slides。我认为这种感觉来自没有重点、没有故事。连这份介绍的上一版也有这个问题。

### 3. 改两页，不该多出三份文件

Slide ID: KS6E / Main position: 4

第二个问题出现在我让 agent 改稿的时候。比如五十页的 slides，我只想改两页。很多 agent 很谨慎：不直接替换文件，而是保留原稿、另存一份新的。再微调一下，又是一份。一个下午过去，文件夹里全是几乎一样的稿子，历史散落在文件名里。这让我想到 Git：版本管理之所以好用，是因为修改单位小，而且每次修改都有记录。所以在幻灯里，页面就是修改单位：一次修改只改写一个页面文件，并记进这一页的历史；命名版本用来标记里程碑。左边的文件名和右边的修改都是示意，不是真实目录。

### 4. 先讲故事，再做页面

Slide ID: GZBW / Main position: 6

这是我最在意的一点。如果 AI 先做 slides，你再照着它写讲稿，最后就是跟着 AI 的逻辑走，在我看来那份逻辑常常是没有灵魂的。如果你先把故事讲出来，像跟同事解释一样，想到哪说到哪，agent 可以先把它整理好，再在上面做页面，你自己的话也就成了演讲备注。即兴讲话本身也有结构。保住它，稿子更容易留住你自己的判断和观点，你也不用事后编讲稿。但它本身并不能消除 AI 味：渲染出来的页面我仍然要自己看。这份介绍就是例子：我先讲了为什么做幻灯，agent 没有照着复述，而是按照介绍产品的需要重新组织，补上了我没讲到的产品细节。

### 5. 1BNA：十二个碱基对的 C1′–C1′ 距离

Slide ID: BRHY / Main position: 12

简短地说：这是一个真实的结果，图由脚本从 CSV 画出。要改一个值或一个标签，agent 改数据、重跑脚本、换上新图，而不是在幻灯里描线。

### 6. 故事告诉 agent 什么最重要

Slide ID: 3D9R / Main position: 13

这是幻灯里最直接来自“故事先行”的部分。每一页都带一段简短的故事：它为了什么，什么必须保留，这次要改什么。可以把它看成我和 agent 之间的对齐工具。右边是这份介绍里 1BNA 那一页实际记录的故事：数值保持不变，保留有标签的坐标轴和单位，保留引用，不作重复实验或趋势的说法。agent 被要求整理这一页时，会先读这些。整个项目、每个章节、每场演讲也都有自己的故事。agent 写下的故事是它的理解，不等于我认可。

### 7. 每一页都有自己的历史

Slide ID: DY5H / Main position: 19

这是我认为最重要的功能。历史按页保存，而不是整份稿子一起存。在页面面板里右键一页，选“查看历史版本”。已记录版本是我自己命名的里程碑，比如这里 BRHY 的三个版本，最早的两个还在用幻灯里画的原生图表。操作记录列出这一页每一次保存的修改，每条都能审阅。恢复一个版本只改这一页；其他页面、以及用到它们的演讲都保持原样。这就是开头那一文件夹副本的替代品。

### 8. agent 和你用同一个写入口

Slide ID: FK8W / Main position: 22

你继续用自己已经在用的 AI 客户端。Codex 和 Claude Code 在本地通过 MCP 加载幻灯插件；DeepSeek Harness 用的是原生插件包；ChatGPT 通过现有的 DC-WALT 工作站连接接入。不管哪个客户端，每一次写入都经过编辑器窗口也在用的那个共享写入器。它确认 agent 读到的是当前版本，只写入预览过的那份修改，并返回回执。所以 agent 不能悄悄覆盖我一分钟前改过的东西。这份中文版就是 Claude Code 沿着这条路径写进来的。

### 9. 从你的故事开始

Slide ID: BDTW / Main position: 27

简短地说：下次组会的稿子可以试试。先把故事讲给 agent，再一次只改一处。
