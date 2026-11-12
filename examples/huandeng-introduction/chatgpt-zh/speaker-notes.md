# 演讲备注

从当前主幻灯片和短演讲的实际解析结果导出。命名版本和本次出现备注由编辑器解析。

## Main

### 1. 从我的组会开始

Slide ID: TTHC / Main position: 1

幻灯从真实的组会经历开始：让agent帮忙，同时保留自己讲什么、用什么证据以及下一次改哪里这些判断。继续工作需要整个项目文件夹；deck.pptd是入口。

HUANDENG source: https://github.com/JaytonKogeru/huandeng

### 2. 为什么还要做幻灯

Slide ID: YAQR / Main position: 2

在这里停顿，进入故事的下一段。章节页严格只有标题。

### 3. 人能认出 AI，却看不到我的选择

Slide ID: J2BE / Main position: 3

这是作者的组会观察，不是关于所有AI演讲的普遍实验结论。他仍然愿意让agent做slides，因为页面也是结构化数据。问题在于生成器容易面面俱到，而作者想讲的那个理由没有成为主线。左边的页型是为说明这一问题而画的概念示意，不是任何另一位作者的作品。

### 4. 五十页，只改其中两页

Slide ID: MSVB / Main position: 4

五十页改两页来自作者的原始例子。左侧两处修改始终带相同A/B标记；文件却变成三套。右侧把版本留在同两页下面，说明页级身份与历史为什么有用。这是关系示意，实际Editor历史稍后展示。

### 5. 先把我想讲的讲出来

Slide ID: 955N / Main position: 5

作者先自由讲述，agent再组织关系、补足必要的解释，不能倒过来让人迁就已经生成的页面。左边保留的是原始连续口述摘录；右边是本次组织出的叙事与实物页面，二者身份不同。

### 6. 让下一次修改留在同一份工作里

Slide ID: 6G4G / Main position: 6

完整项目目录是继续工作的载体。用deck.pptd打开，页面、原始素材、科学数据与脚本、Story和历史仍在项目里。导出的文件服务于交付，不应成为下一轮继续工作的唯一来源。实际Files视图展示本项目独立取得的资料。

### 7. 把故事留在工作里

Slide ID: CR5K / Main position: 7

在这里停顿，进入故事的下一段。章节页严格只有标题。

### 8. 把讲这一页的理由留在旁边

Slide ID: HWB6 / Main position: 8

Story不是又一份演讲稿。Project和Section记录整体目的与听众，这一页记录具体要说什么、哪些证据必须保留、这次改哪里。图中的实际页任务仅改标题，保留专业图、数值、单位与引用。左边给出完整Editor位置，右边读清本页Story。

### 9. 规则也应该看得见

Slide ID: GQRA / Main position: 9

Editor 0.20.0把项目根目录AGENTS.md原文直接放在Project tab。打开文件可读全文；外部修改后点击刷新项目规则，侧栏和已打开全文一起更新。截图来自root独立捕获的0.20隔离示例，规则是本次真实的原文，不是另一个摘要。可见性便于检查，并不保证模型自动遵守。

### 10. PPTX 展开后，本来就有这些部分

Slide ID: 9RZG / Main position: 10

PowerPoint的PPTX是包含XML页面、媒体和备注的ZIP包。HUANDENG使用目录式工作项目：入口组织页，页文件保存对象和备注，媒体保留原图，再把Story、稳定身份和历史放到项目里。不是把pptx改一个扩展名。Files让这些部分在Editor里可见。

### 11. 我们把哪些东西接在一起

Slide ID: TZXM / Main position: 11

OpenSlide提供React编辑器基础，Electron承载桌面应用，PPTD目录是持续工作项目。Editor和agent通过同一writer提交带修订前提的操作；plugin提供创作规则和使用方法，不是另一个文档数据库。Story、原图与逐页历史都跟着项目走。这里是架构关系示意，不宣称自动调度或锁。

### 12. 打开项目，先认清工作现场

Slide ID: ZYZB / Main position: 12

左边选项目、页、素材和文件；上方切换工作视图；中间画布直接编辑；右边Inspector跟随当前对象。先建立这张完整的空间地图，再讲局部操作。本页截图是root独立在自己的项目中捕获。

### 13. 素材保留原件，页面使用实例

Slide ID: MPTA / Main position: 13

原图是一份真实坐标投影。右侧两幅是这份原图在页面中的不同裁切实例，并没有另造结构或覆盖原图。原始素材仍可从左侧Assets找到。原图的投影和配色保持一致，裁切区域有对应标记。本页展示图像实例，不做额外的科学推断。

### 14. 先说清楚，这一次只改哪里

Slide ID: 7EKH / Main position: 14

回到开始的问题：不是让agent再做整套文件，而是在一页里保留要讲什么、哪些证据不能丢、已经改过什么，以及当前演讲怎样使用它。这个实物例子只改标题，原图和数据保持不变。将完整目录交给下一位作者，才能继续使用这些关系。

### 15. 看见对象，再改它

Slide ID: HUA9 / Main position: 15

先在画布或Layers中选中标题。实际截图保留了被选中的标题和右边Properties里的Text content，两个位置属于同一个对象。修改文字后保存页面。这个示例真实事务只改标题，保留图、数据、单位和来源，下一页可在Review中核对。

### 16. 数据图来自专业工具，源文件留在项目里

Slide ID: 2MC2 / Main position: 16

这一页的主图由root独立获取RCSB 1BNA坐标并用Matplotlib生成。图、CSV与脚本是实际存在的项目文件。右边完整Editor中的Files位置与其放大目录对应。界面来自制作中的真实工作阶段，科学原页已保存在同一页的命名版本；短演讲固定引用这个版本。不是手工在slides拼出测量曲线。

### 17. 只改这一页

Slide ID: FE8A / Main position: 17

在这里停顿，进入故事的下一段。章节页严格只有标题。

### 18. 这次保存，具体改了什么

Slide ID: JNZV / Main position: 18

从顶部Activity进入真实操作记录，再选择Review changes。这次真实事务只改了title对象的content.text。保存变化窗口把实际页面、对象变化和该页Story放在一起。这里是只读查看；恢复到某个命名版本要进入History单独执行。

### 19. 位置会变，这一页不会丢

Slide ID: EJBQ / Main position: 19

这是同一页真实移动前后的Editor状态，不是换一个标签的示意。移动只改变Main位置，Slide ID不变。随后已把页面恢复到完整叙事中的原位置。通过页短码可以再次找到它，History仍属于这页。

### 20. 回到上一版，仍是同一页

Slide ID: U5QA / Main position: 20

命名页版本是一个明确的里程碑，与自动操作记录和Git历史不同。实际History中保留了本案例改标题前后的版本。恢复会修改当前页面，因此这里演示的是查看，不执行恢复。

### 21. 退远一点，看整段故事

Slide ID: 93SF / Main position: 21

选择短演讲，然后打开Browse，退远一点看真实页面顺序。标题独占章节页负责停顿，证据页推进叙事。需要调整时双击回到该页；Outline帮助读讲述逻辑，Sections帮助组织段落。这是当前短演讲的实际界面，不是手工伪造的缩略图。

### 22. 为口头讲述准备大纲与备注

Slide ID: SE68 / Main position: 22

本次短演讲给Story页写了更短的出现备注，Main页保留完整解释。同一页因此能服务不同的口头讲述，不需要复制整页。实际备注视图把页面与讲稿放在一起。

### 23. 带到下一次组会

Slide ID: 36EQ / Main position: 23

在这里停顿，进入故事的下一段。章节页严格只有标题。

### 24. 用同一批页面，组织两场演讲

Slide ID: 2856 / Main position: 24

Main保留页面库，Presentation按需要引用这些页。一场完整介绍，一场更短的组会，不必复制整套页面。截图中的演讲和顺序是真实项目数据；缩略图由自己的已完成页面渲染。要固定内容时可用命名版本，要改变口头讲法时写本次出现备注。

### 25. 引用当前页，或留住一个版本

Slide ID: 4YZD / Main position: 25

Main页的live引用会跟随当前内容；固定到已记录命名版本的引用保持该版本。短演讲里的科学页实际固定在“保留来源的科学图”版本，而Story页有本次出现备注。选择取决于这次演讲是否还要继续跟进修改。

### 26. 先试讲，再交付

Slide ID: YCXA / Main position: 26

顶部Present菜单可以从当前页或开头放映。Export先确认要交付的是Main还是某场Presentation，以及对应格式。继续编辑需要完整项目文件夹；PDF/PPTX是面向听众或其他软件的输出，不能代替项目里的全部工作上下文。

### 27. Agent 的完成报告，应该连着真实工作

Slide ID: NJM7 / Main position: 27

真实Activity中，这一条agent完成报告引用了本项目的实际保存操作。报告本身只是声明，Review changes打开实际收据，才能看到发生了什么。Plugin给出创作方法；连接器接入同一个writer。客户端连接方法保留在项目说明中，此页不使用缺少桌面bridge的浏览器Agent setup作为成功演示。

### 28. 把来源说清楚

Slide ID: T86S / Main position: 28

在这里停顿，进入故事的下一段。章节页严格只有标题。

### 29. 开源基础与致谢

Slide ID: W7WP / Main position: 29

正式致谢恢复原作品明确列出的十五项来源。代码复用、运行依赖、交互借鉴与调研参考是不同关系，不能混称。完整三十三项历史参考与对应说明在docs/ACKNOWLEDGMENTS.md；链接亦保留在项目sources中。OpenSlides Studio是openslides.dev，与OpenSlide编辑器上游不同。

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

OpenPPTD 行使用 GitHub 仓库标记，并非其专属 logo。
React: https://github.com/react/react
Electron: https://github.com/electron/electron

### 30. 工具与设计参考

Slide ID: E9RN / Main position: 30

正式致谢恢复原作品明确列出的十五项来源。代码复用、运行依赖、交互借鉴与调研参考是不同关系，不能混称。完整三十三项历史参考与对应说明在docs/ACKNOWLEDGMENTS.md；链接亦保留在项目sources中。OpenSlides Studio是openslides.dev，与OpenSlide编辑器上游不同。

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

### 31. 下一次，从自己的故事开始

Slide ID: E2RU / Main position: 31

幻灯从真实的组会经历开始：让agent帮忙，同时保留自己讲什么、用什么证据以及下一次改哪里这些判断。继续工作需要整个项目文件夹；deck.pptd是入口。

## Short Presentation

### 1. 从我的组会开始

Slide ID: TTHC / Main position: 1

幻灯从真实的组会经历开始：让agent帮忙，同时保留自己讲什么、用什么证据以及下一次改哪里这些判断。继续工作需要整个项目文件夹；deck.pptd是入口。

HUANDENG source: https://github.com/JaytonKogeru/huandeng

### 2. 为什么还要做幻灯

Slide ID: YAQR / Main position: 2

在这里停顿，进入故事的下一段。章节页严格只有标题。

### 3. 人能认出 AI，却看不到我的选择

Slide ID: J2BE / Main position: 3

这是作者的组会观察，不是关于所有AI演讲的普遍实验结论。他仍然愿意让agent做slides，因为页面也是结构化数据。问题在于生成器容易面面俱到，而作者想讲的那个理由没有成为主线。左边的页型是为说明这一问题而画的概念示意，不是任何另一位作者的作品。

### 4. 五十页，只改其中两页

Slide ID: MSVB / Main position: 4

五十页改两页来自作者的原始例子。左侧两处修改始终带相同A/B标记；文件却变成三套。右侧把版本留在同两页下面，说明页级身份与历史为什么有用。这是关系示意，实际Editor历史稍后展示。

### 5. 先把我想讲的讲出来

Slide ID: 955N / Main position: 5

作者先自由讲述，agent再组织关系、补足必要的解释，不能倒过来让人迁就已经生成的页面。左边保留的是原始连续口述摘录；右边是本次组织出的叙事与实物页面，二者身份不同。

### 6. 把故事留在工作里

Slide ID: CR5K / Main position: 7

在这里停顿，进入故事的下一段。章节页严格只有标题。

### 7. 把讲这一页的理由留在旁边

Slide ID: HWB6 / Main position: 8

这次短讲只强调作者的目的与一条需要保留的内容。详细操作留给完整介绍。

### 8. PPTX 展开后，本来就有这些部分

Slide ID: 9RZG / Main position: 10

PowerPoint的PPTX是包含XML页面、媒体和备注的ZIP包。HUANDENG使用目录式工作项目：入口组织页，页文件保存对象和备注，媒体保留原图，再把Story、稳定身份和历史放到项目里。不是把pptx改一个扩展名。Files让这些部分在Editor里可见。

### 9. 打开项目，先认清工作现场

Slide ID: ZYZB / Main position: 12

左边选项目、页、素材和文件；上方切换工作视图；中间画布直接编辑；右边Inspector跟随当前对象。先建立这张完整的空间地图，再讲局部操作。本页截图是root独立在自己的项目中捕获。

### 10. 素材保留原件，页面使用实例

Slide ID: MPTA / Main position: 13

原图是一份真实坐标投影。右侧两幅是这份原图在页面中的不同裁切实例，并没有另造结构或覆盖原图。原始素材仍可从左侧Assets找到。原图的投影和配色保持一致，裁切区域有对应标记。本页展示图像实例，不做额外的科学推断。

### 11. 让原图继续连着它的来源

Slide ID: 2MC2 / Main position: 16 / Named version: checkpoint:949d9a5826a51fa2bedb955c79625f96

这是幻灯工作流里的一个科学案例，不是把DNA变成介绍主线。由root从RCSB独立取得1BNA原始坐标，用NumPy计算反向配对C1原子距离，再由Matplotlib出图。单个晶体结构没有重复测量误差条。结构图来自真实坐标投影，连接线采用距离判据，不主张化学键级。修改本页时保留数据、单位、原图与来源。原图在素材中，CSV和脚本在文件中。来源：https://www.rcsb.org/structure/1BNA；Drew等，PNAS 78，2179–2183，1981。

### 12. 只改这一页

Slide ID: FE8A / Main position: 17

在这里停顿，进入故事的下一段。章节页严格只有标题。

### 13. 这次保存，具体改了什么

Slide ID: JNZV / Main position: 18

从顶部Activity进入真实操作记录，再选择Review changes。这次真实事务只改了title对象的content.text。保存变化窗口把实际页面、对象变化和该页Story放在一起。这里是只读查看；恢复到某个命名版本要进入History单独执行。

### 14. 回到上一版，仍是同一页

Slide ID: U5QA / Main position: 20

命名页版本是一个明确的里程碑，与自动操作记录和Git历史不同。实际History中保留了本案例改标题前后的版本。恢复会修改当前页面，因此这里演示的是查看，不执行恢复。

### 15. 带到下一次组会

Slide ID: 36EQ / Main position: 23

在这里停顿，进入故事的下一段。章节页严格只有标题。

### 16. 用同一批页面，组织两场演讲

Slide ID: 2856 / Main position: 24

Main保留页面库，Presentation按需要引用这些页。一场完整介绍，一场更短的组会，不必复制整套页面。截图中的演讲和顺序是真实项目数据；缩略图由自己的已完成页面渲染。要固定内容时可用命名版本，要改变口头讲法时写本次出现备注。

### 17. Agent 的完成报告，应该连着真实工作

Slide ID: NJM7 / Main position: 27

真实Activity中，这一条agent完成报告引用了本项目的实际保存操作。报告本身只是声明，Review changes打开实际收据，才能看到发生了什么。Plugin给出创作方法；连接器接入同一个writer。客户端连接方法保留在项目说明中，此页不使用缺少桌面bridge的浏览器Agent setup作为成功演示。

### 18. 把来源说清楚

Slide ID: T86S / Main position: 28

在这里停顿，进入故事的下一段。章节页严格只有标题。

### 19. 开源基础与致谢

Slide ID: W7WP / Main position: 29

正式致谢恢复原作品明确列出的十五项来源。代码复用、运行依赖、交互借鉴与调研参考是不同关系，不能混称。完整三十三项历史参考与对应说明在docs/ACKNOWLEDGMENTS.md；链接亦保留在项目sources中。OpenSlides Studio是openslides.dev，与OpenSlide编辑器上游不同。

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

OpenPPTD 行使用 GitHub 仓库标记，并非其专属 logo。
React: https://github.com/react/react
Electron: https://github.com/electron/electron

### 20. 工具与设计参考

Slide ID: E9RN / Main position: 30

正式致谢恢复原作品明确列出的十五项来源。代码复用、运行依赖、交互借鉴与调研参考是不同关系，不能混称。完整三十三项历史参考与对应说明在docs/ACKNOWLEDGMENTS.md；链接亦保留在项目sources中。OpenSlides Studio是openslides.dev，与OpenSlide编辑器上游不同。

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

### 21. 下一次，从自己的故事开始

Slide ID: E2RU / Main position: 31

幻灯从真实的组会经历开始：让agent帮忙，同时保留自己讲什么、用什么证据以及下一次改哪里这些判断。继续工作需要整个项目文件夹；deck.pptd是入口。
