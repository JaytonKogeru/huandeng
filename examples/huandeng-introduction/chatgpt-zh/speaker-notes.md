# Speaker notes — chatgpt-zh

These Notes are extracted verbatim from the final saved Main pages and resolved Brief occurrences. The order, pinned versions, and occurrence overrides below match the final exports.

## Main Slides

### 1. HUANDENG · 从一页，做到一场演讲 — TTHC

Main position: 1 · Notes source: `main-page`.

<!-- notes:main-1 -->
HUANDENG 是一个可视化幻灯片编辑器，也是一套把人和 AI 助手连到同一份项目的工作流。我们从打开一个项目开始，实际看页面在哪里、Story 怎么写、素材如何放进去、修改如何保存；随后再把页面组织成一场可以放映和交付的演讲。中间这张图就来自正在运行的 0.19 编辑器，画布上是本介绍的工作流关系图。
<!-- /notes:main-1 -->

### 2. 把下一次修改，留在同一页 — MSVB

Main position: 2 · Notes source: `main-page`.

<!-- notes:main-2 -->
这个项目的起点是我的组会准备。我希望 AI 帮忙制作，也希望页面能表达我的判断；当五十页里只改两页时，下一次还应该找得到那两页的意图、原图和修改。HUANDENG 因而把 Story、页面身份和页面历史留在同一个项目。右图是这份介绍中 6G4G 的真实操作记录及当前页面预览，展示刚才这次制作留下的记录；它不是一个宣称只改了两句的实验。随后会具体演示怎么检查一次小修改。
<!-- /notes:main-2 -->

### 3. 人和助手，接着改同一份项目 — 6G4G

Main position: 3 · Notes source: `main-page`.

<!-- notes:main-3 -->
先把三个角色分清。HUANDENG Editor 是我们打开、选择、编辑和放映页面的桌面工作区。Plugin 给助手提供制作与协作约定，Connector 将它连接到明确选定的项目。两边的修改通过同一个共享写入服务，落到同一份项目中。deck.pptd 是入口，页面和素材都在项目目录。接下来实际打开这个入口。第三方标记来源见 sources/brand/manifest.json。
<!-- /notes:main-3 -->

### 4. 从 deck.pptd 打开这份项目 — CR5K

Main position: 4 · Notes source: `main-page`.

<!-- notes:main-4 -->
先找到示例项目文件夹，打开里面的 deck.pptd。它是项目入口，完整内容仍在同一个目录：页面在 pages，图片在 media，Story、编排和命名页面版本在 .huandeng。进入编辑器后，在左侧页面列表选择一页即可继续做。要从空白页开始，点页面栏的 ＋「新增页面」。截图左侧是这个项目真实的文件树局部，右侧是打开后的编辑工作区。若要在另一台电脑继续，带走整个项目目录。也可以选择只含一个直接 .pptd 文件的文件夹；多个入口时要明确选择。
<!-- /notes:main-4 -->

### 5. 先选页，再在画布里选对象 — ZYZB

Main position: 5 · Notes source: `main-page`.

<!-- notes:main-5 -->
从左侧页面缩略图选择要处理的页面，这里选中的是 6G4G。在画布上点标题，选框出现，说明现在选中的是这个文字对象；右侧属性随选择切换，可以看到文字、字号、坐标等。图层页能从对象列表定位，Story 留这一页的目的。先分清页面选择和对象选择，后面的局部改动才有明确对象。截图是正在运行的 0.19 编辑器真实选中状态。
<!-- /notes:main-5 -->

### 6. 把这页要讲什么，留在 Story — HWB6

Main position: 6 · Notes source: `main-page`.

<!-- notes:main-6 -->
选择页面后，打开右侧 Story。这里的目的告诉下一位作者这页帮助听众理解什么；保留项说明哪些标记、数据或关系不能随意改；这次修改说明当前的具体任务。点右上角铅笔填写并保存。左边是真实的 6G4G Story，目的、保留项和修改方向都对应上一页概念关系图。Story 给后续编辑提供上下文，我们仍然要检查最后的实际画面。
<!-- /notes:main-6 -->

### 7. 从素材库，把原图放到页面里 — MPTA

Main position: 7 · Notes source: `main-page`.

<!-- notes:main-7 -->
左侧切到素材。在搜索框输入名称，找到项目里已经保存的原图；这里以 HUANDENG 标记为例。同一份标记已经被多个页面使用，卡片会显示使用情况。把它拖到画布，就能继续调整大小和位置。新图片则通过导入并放置进入项目。右边是真实画布中被选中的同一标记，保留了原始图形。素材库解决的是找回与复用原材料，Main Slides 里的整张页面复用将在后面介绍。
<!-- /notes:main-7 -->

### 8. 检查画布，然后保存页面 — 7EKH

Main position: 8 · Notes source: `main-page`.

<!-- notes:main-8 -->
第一张页完成后，先看真实画布：标题是不是讲清了这页的意思，图片是否完整，重要内容有没有被挡住。然后点击顶部保存页面，或者按 Ctrl+S，确认状态显示页面已保存。图中放大的是实际保存控件和真实保存状态。页面修改和项目编排有各自的保存入口；章节、演讲顺序等项目草稿，需要在对应面板保存项目。下一步，我们就在这份项目里做一次更小、更精确的改动。
<!-- /notes:main-8 -->

### 9. 点中对象，再改它的属性 — HUA9

Main position: 9 · Notes source: `main-page`.

<!-- notes:main-9 -->
先看画布上的选框，确认自己选中了标题。右侧属性面板随这个对象切换：文本内容、字体、字号和行距都在这里。也可以双击画布文字直接编辑。这张图显示的就是前后对比教程页，左侧选中的标题与右侧文本内容完全对应。完成修改后保存页面，再检查实际画面。
<!-- /notes:main-9 -->

### 10. 只改两句，保留其他内容 — JNZV

Main position: 10 · Notes source: `main-page`.

<!-- notes:main-10 -->
这次只收紧标题和引导句。修改前，两句话较长；修改后，直接说“把修改意图留清楚”“让下一次修改有据可循”。请看同一尺度下的前后图，其他内容没有跟着重做。实际操作时，选中对应文字，在画布或属性面板中修改，然后点击保存页面。下一页会从图层列表选对象，解决多个对象重叠时点不准的问题。
<!-- /notes:main-10 -->

### 11. 重叠时，从图层找到对象 — 93SF

Main position: 11 · Notes source: `main-page`.

<!-- notes:main-11 -->
当文字、图片和形状重叠时，可以直接从图层列表点选。左图选中“只改两句，保留其他内容”这个标题，右图放大同一面板的层级操作。Forward 和 Backward 各移动一层，To front 和 To back 移到最前或最后。列表上方的对象先显示；按住 Shift 可以多选。这里只调整所需对象的层级，再保存页面。
<!-- /notes:main-11 -->

### 12. 裁切显示范围，保留原图 — E9RN

Main position: 12 · Notes source: `main-page`.

<!-- notes:main-12 -->
截图或图像太大时，先决定这一页需要读到哪里。左上是原图，左下是这张教程页实际选中的裁切显示范围，保留了标题与引导句。右侧是同一图片的实际裁切参数，单位是原图的百分比。修改这些参数会改变页面中的显示范围，原始图片仍然保留；完整显示适配保持原图比例。把焦点放大，比把整张窗口缩成小图更容易读。
<!-- /notes:main-12 -->

### 13. 保存后，核对这一次修改 — FE8A

Main position: 13 · Notes source: `main-page`.

<!-- notes:main-13 -->
保存以后，进入历史的操作记录，打开这次修改。左图是实际的修改查看器，能切换修改前与修改后；右图把已保存的修改放大，标题 title 和引导句 lead 各有一条内容变化。选择记录会在画布中定位对象。这里核对的是“说要改什么”和“实际改了什么”是否一致。看完字段变化，再看完整画面是否读得清楚。
<!-- /notes:main-13 -->

### 14. 把怎么讲，写进备注页 — SE68

Main position: 14 · Notes source: `main-page`.

<!-- notes:main-14 -->
这一页显示刚才文字对比页的真实备注。备注补充了操作细节、比较的重点和下一页的过渡，听众看到的页面仍保留图像与关键结论。点击顶部备注页，可以在同一工作区继续写这张 Main Slide 的讲稿；写完保存页面。等到编排具体演讲时，还可以给某一次出现单独准备讲法，后面会继续说明。
<!-- /notes:main-14 -->

### 15. 为这一页，留一个命名版本 — U5QA

Main position: 15 · Notes source: `main-page`.

<!-- notes:main-15 -->
当这一页走到一个值得保留的阶段，例如修改文字之前或组会定稿，就到历史视图为它记录一个版本名。图中“修改文字之前”和“文案已收紧”是公开教程实际保存的两个版本。点选版本会打开只读预览；确认以后可以把该版本恢复为当前页，恢复影响的是这一页。命名版本也能给后面的演讲引用提供一个明确的固定画面。
<!-- /notes:main-15 -->

### 16. 重排以后，仍然认得这一页 — EJBQ

Main position: 16 · Notes source: `main-page`.

<!-- notes:main-16 -->
这里是公开示例页面 HFDV 的真实重排结果。它原来位于第2页，移动后在第4页；四字符 Slide ID 仍然是 HFDV。位置回答“这场编排里排第几”，Slide ID 帮我们确认“还是哪一张页”。查历史、继续修改或者在另一个演讲中引用时，认准这一页即可。接下来就从这套 Main 页面中选择材料，组织一场具体的演讲。
<!-- /notes:main-16 -->

### 17. 选页，组成这次演讲 — 2856

Main position: 17 · Notes source: `main-page`.

<!-- notes:main-17 -->
这一步把已经做好的页面组织成一次具体演讲。左侧进入项目，点击“编排演讲”；在下拉框里选择已有演讲，或点击“新建演讲”。打开“添加幻灯片或章节”，可以按标题、页面短码或位置搜索，点击加号加入。顺序通过条目上的上下箭头调整，最后点击“保存项目”。图中搜索ZYZB后，页面和所在章节同时可选；需要单页时点“主幻灯片”区域的条目。这里保存的是本次演讲的引用顺序，Main仍是持续维护的原页。下一步为同一页准备这次听众需要的讲法。
<!-- /notes:main-17 -->

### 18. 同一页，写这次的讲法 — 4YZD

Main position: 18 · Notes source: `main-page`.

<!-- notes:main-18 -->
同一张页面可以向不同听众讲不同的重点。打开编排条目的“备注与版本”，勾选“本次引用使用独立演讲备注”，在下面写这一次要讲的话，再保存项目。右侧是真实“备注页”中同一处引用的讲稿；它与左侧输入的内容对应。此时改的是本次演讲中的这一次出现，Main Notes仍能保留通用说明。排练前先确认当前选中的是目标演讲，再进入备注页。接下来选择的是画面版本：继续跟随Main，还是保留一个已经定稿的阶段。
<!-- /notes:main-18 -->

### 19. 要更新，还是要定稿 — 36EQ

Main position: 19 · Notes source: `main-page`.

<!-- notes:main-19 -->
要决定一场演讲是否跟随主稿更新，就在条目的“备注与版本”里选择“页面版本”。左图显示实时引用，后面继续改Main时，这处引用会跟着变。右图选择的是已存在的命名版本，因此可以保留已经排练过的画面。命名版本先在该页的历史工作区记录，随后在这里刷新并选择。两个截图取自实际演讲条目的版本控件，比较的是两种选项，不是两套复制文件。选定后保存项目。接下来在目标演讲中从当前页开始排练，核对顺序、讲稿和点击节奏。
<!-- /notes:main-19 -->

### 20. 从当前页排练一次 — W7WP

Main position: 20 · Notes source: `main-page`.

<!-- notes:main-20 -->
先在项目中选中要讲的那场Presentation，再选起始页。放映菜单给出两个明确入口：F5从头开始，Shift+F5从当前页开始。右图来自实际放映界面。排练时核对页面顺序、可读性，以及这一场演讲的备注；有逐次揭示效果的页面，要逐次点击确认每一步。按Esc返回编辑。这里展示的是现场播放路径，静态PNG、PDF和PPTX不会携带这些交互点击。完成排练之后，再选择合适的交付格式和范围。
<!-- /notes:main-20 -->

### 21. 选好格式，也选对范围 — YCXA

Main position: 21 · Notes source: `main-page`.

<!-- notes:main-21 -->
点击导出，先选格式，再检查范围。图中选择PowerPoint，并把范围设为“第一次修改 · 简短演讲”，因此输出的是这一场演讲的页面顺序，而不是整套Main。需要阅读审阅可以导出PDF；需要用常规演示软件继续使用可选PPTX。若接收者要在HUANDENG里继续修改，交付的是完整项目文件夹：deck.pptd是入口，pages和media保存页面与素材，.huandeng保存Story、编排和命名版本。把AGENTS.md、sources和notices一并保留。命名版本随项目携带，机器本地操作日志仍属于原电脑。导出后回到同一份源项目继续维护。下一步把助手接入同一份工作。
<!-- /notes:main-21 -->

### 22. 把助手接到这份项目 — NJM7

Main position: 22 · Notes source: `main-page`.

<!-- notes:main-22 -->
编辑器顶部的“助手连接”会打开当前项目的助手设置。先选择Claude Code、DeepSeek Harness、Codex或ChatGPT，再按该客户端的安装与配置说明接入。Claude Code和DeepSeek使用各自的原生插件；ChatGPT通过已有的工作站连接调用这个项目。图中只展示真实客户端选择区域，配置本身并不等于连接已经成功。接入后的第一项任务应是读取项目与当前选中页，并用返回的项目名和Slide ID核对目标。确认后再提出一次具体修改。切换可见Editor标签不会自动改变一个已绑定助手的项目。接下来给协作者一个明确、可检查的分工。
<!-- /notes:main-22 -->

### 23. 按页分工，接着同一份改 — TZXM

Main position: 23 · Notes source: `main-page`.

<!-- notes:main-23 -->
让多个助手合作时，先按稳定的Slide ID分配页面，再说清每页的目标和不能改的证据。图中2856与4YZD就是这份教程中的编排和备注页；给不同页面分工，可以减少同时改同一页的冲突。交接给下一个助手时，提供页ID、具体任务、保护范围，以及已经保存的操作。保存后，选中目标页，进入“历史→操作记录”，找到刚才的保存。右侧是真实的本轮第17页保存记录，操作摘要、时间、作者和短回执号都在一起；完整操作ID是a368d2ea-b979-4be3-bac1-fea93b3774a0。通过对应回执查看Before/After，再回到当前页检查。若同页或共享编排发生冲突，重新读当前结果再调整提案。这一页展示任务分配与检查方法，不代表系统自动安排了团队。
<!-- /notes:main-23 -->

### 24. 打开示例，完成你的第一次修改 — E2RU

Main position: 24 · Notes source: `main-page`.

<!-- notes:main-24 -->
这份演示就是一个可以继续编辑的HUANDENG项目。打开chatgpt-zh目录中的deck.pptd，选一张有明确对象的页面，读Story，用Slide ID提出一次小修改。先保留原图、数据、单位和出处，再调整解释或布局；保存后回看前后和页面历史。完成后仍留下完整项目，下一次就在这里继续。HUANDENG以OpenSlide为代码基础；OpenPPTD贡献MathML到OMML公式转换模块；PptxGenJS负责PPTX生成。PPTD思路受到Kimi Slides生态启发。图表、公式和图标分别使用Apache ECharts、KaTeX与Font Awesome Free。GitHub图标在这里指OpenPPTD仓库，并非该项目的产品Logo。公开DNA素材来源为RCSB PDB 1BNA、Drew等PNAS 1981研究，完整许可证与来源保留在sources和notices中。Sources: https://github.com/open-slide/open-slide ; https://github.com/gitbrent/PptxGenJS ; packages/core/src/pptd/vendor/open-pptd/NOTICE.md ; https://www.rcsb.org/structure/1BNA ; https://doi.org/10.1073/pnas.78.4.2179 .
<!-- /notes:main-24 -->

## Brief — 第一次修改 · 简短演讲

Presentation ID: `introduction-short`.

### 1. HUANDENG · 从一页，做到一场演讲 — TTHC

Main position: 1 · Notes source: `main-page`.

Occurrence: `introduction-short:brief-0:7995de62-e81e-46db-b250-cabc66a99b28`.

<!-- notes:brief-1 -->
HUANDENG 是一个可视化幻灯片编辑器，也是一套把人和 AI 助手连到同一份项目的工作流。我们从打开一个项目开始，实际看页面在哪里、Story 怎么写、素材如何放进去、修改如何保存；随后再把页面组织成一场可以放映和交付的演讲。中间这张图就来自正在运行的 0.19 编辑器，画布上是本介绍的工作流关系图。
<!-- /notes:brief-1 -->

### 2. 人和助手，接着改同一份项目 — 6G4G

Main position: 3 · Notes source: `main-page`.

Occurrence: `introduction-short:introduction-short-product-22:1f6289fd-1d4c-4a03-a74d-4bc4955de868`.

<!-- notes:brief-2 -->
先把三个角色分清。HUANDENG Editor 是我们打开、选择、编辑和放映页面的桌面工作区。Plugin 给助手提供制作与协作约定，Connector 将它连接到明确选定的项目。两边的修改通过同一个共享写入服务，落到同一份项目中。deck.pptd 是入口，页面和素材都在项目目录。接下来实际打开这个入口。第三方标记来源见 sources/brand/manifest.json。
<!-- /notes:brief-2 -->

### 3. 先选页，再在画布里选对象 — ZYZB

Main position: 5 · Notes source: `occurrence-override`.

Occurrence: `introduction-short:introduction-short-product-5:3483b895-bc52-43b6-a7c4-001a0d1e4526`.

<!-- notes:brief-3 -->
这场简短演讲先用 ZYZB 解释页面栏、画布与检查器。请观众指出当前选择的页面和对象，然后进入 Story 写下一次修改的目的。备注属于本场演讲的这次引用，主幻灯片继续共用。
<!-- /notes:brief-3 -->

### 4. 把这页要讲什么，留在 Story — HWB6

Main position: 6 · Notes source: `main-page`.

Occurrence: `introduction-short:introduction-short-tutorial-3:05cd8517-c8ac-4e12-b2d0-40c438b91042`.

<!-- notes:brief-4 -->
选择页面后，打开右侧 Story。这里的目的告诉下一位作者这页帮助听众理解什么；保留项说明哪些标记、数据或关系不能随意改；这次修改说明当前的具体任务。点右上角铅笔填写并保存。左边是真实的 6G4G Story，目的、保留项和修改方向都对应上一页概念关系图。Story 给后续编辑提供上下文，我们仍然要检查最后的实际画面。
<!-- /notes:brief-4 -->

### 5. 检查画布，然后保存页面 — 7EKH

Main position: 8 · Notes source: `pinned-page`.

Occurrence: `introduction-short:brief-2:c1fcdc66-1c25-45a6-9b98-83d16f063c3e`.

Pinned version: `checkpoint:d4c0badba7d36d6e248cd1c378e41a4f`.

<!-- notes:brief-5 -->
第一张页完成后，先看真实画布：标题是不是讲清了这页的意思，图片是否完整，重要内容有没有被挡住。然后点击顶部保存页面，或者按 Ctrl+S，确认状态显示页面已保存。图中放大的是实际保存控件和真实保存状态。页面修改和项目编排有各自的保存入口；章节、演讲顺序等项目草稿，需要在对应面板保存项目。下一步，我们就在这份项目里做一次更小、更精确的改动。
<!-- /notes:brief-5 -->

### 6. 只改两句，保留其他内容 — JNZV

Main position: 10 · Notes source: `main-page`.

Occurrence: `introduction-short:introduction-short-product-4:7b69742f-16b5-4b80-acf0-1d23966aae96`.

<!-- notes:brief-6 -->
这次只收紧标题和引导句。修改前，两句话较长；修改后，直接说“把修改意图留清楚”“让下一次修改有据可循”。请看同一尺度下的前后图，其他内容没有跟着重做。实际操作时，选中对应文字，在画布或属性面板中修改，然后点击保存页面。下一页会从图层列表选对象，解决多个对象重叠时点不准的问题。
<!-- /notes:brief-6 -->

### 7. 保存后，核对这一次修改 — FE8A

Main position: 13 · Notes source: `main-page`.

Occurrence: `introduction-short:introduction-short-tutorial-6:def43d68-1767-45f5-800a-17d648750b7e`.

<!-- notes:brief-7 -->
保存以后，进入历史的操作记录，打开这次修改。左图是实际的修改查看器，能切换修改前与修改后；右图把已保存的修改放大，标题 title 和引导句 lead 各有一条内容变化。选择记录会在画布中定位对象。这里核对的是“说要改什么”和“实际改了什么”是否一致。看完字段变化，再看完整画面是否读得清楚。
<!-- /notes:brief-7 -->

### 8. 选页，组成这次演讲 — 2856

Main position: 17 · Notes source: `main-page`.

Occurrence: `introduction-short:introduction-short-tutorial-7:baca190c-e87b-415f-9c30-7c04e3fabe17`.

<!-- notes:brief-8 -->
这一步把已经做好的页面组织成一次具体演讲。左侧进入项目，点击“编排演讲”；在下拉框里选择已有演讲，或点击“新建演讲”。打开“添加幻灯片或章节”，可以按标题、页面短码或位置搜索，点击加号加入。顺序通过条目上的上下箭头调整，最后点击“保存项目”。图中搜索ZYZB后，页面和所在章节同时可选；需要单页时点“主幻灯片”区域的条目。这里保存的是本次演讲的引用顺序，Main仍是持续维护的原页。下一步为同一页准备这次听众需要的讲法。
<!-- /notes:brief-8 -->

### 9. 同一页，写这次的讲法 — 4YZD

Main position: 18 · Notes source: `main-page`.

Occurrence: `introduction-short:introduction-short-tutorial-8:503c86ce-673c-4229-9251-22114e5f5da9`.

<!-- notes:brief-9 -->
同一张页面可以向不同听众讲不同的重点。打开编排条目的“备注与版本”，勾选“本次引用使用独立演讲备注”，在下面写这一次要讲的话，再保存项目。右侧是真实“备注页”中同一处引用的讲稿；它与左侧输入的内容对应。此时改的是本次演讲中的这一次出现，Main Notes仍能保留通用说明。排练前先确认当前选中的是目标演讲，再进入备注页。接下来选择的是画面版本：继续跟随Main，还是保留一个已经定稿的阶段。
<!-- /notes:brief-9 -->

### 10. 要更新，还是要定稿 — 36EQ

Main position: 19 · Notes source: `main-page`.

Occurrence: `introduction-short:introduction-short-tutorial-9:d64aef1b-eb88-4b05-a620-ae60a0e833de`.

<!-- notes:brief-10 -->
要决定一场演讲是否跟随主稿更新，就在条目的“备注与版本”里选择“页面版本”。左图显示实时引用，后面继续改Main时，这处引用会跟着变。右图选择的是已存在的命名版本，因此可以保留已经排练过的画面。命名版本先在该页的历史工作区记录，随后在这里刷新并选择。两个截图取自实际演讲条目的版本控件，比较的是两种选项，不是两套复制文件。选定后保存项目。接下来在目标演讲中从当前页开始排练，核对顺序、讲稿和点击节奏。
<!-- /notes:brief-10 -->

### 11. 选好格式，也选对范围 — YCXA

Main position: 21 · Notes source: `main-page`.

Occurrence: `introduction-short:introduction-short-story-23:c91c3fe3-836f-492f-882d-905bd4d08a9b`.

<!-- notes:brief-11 -->
点击导出，先选格式，再检查范围。图中选择PowerPoint，并把范围设为“第一次修改 · 简短演讲”，因此输出的是这一场演讲的页面顺序，而不是整套Main。需要阅读审阅可以导出PDF；需要用常规演示软件继续使用可选PPTX。若接收者要在HUANDENG里继续修改，交付的是完整项目文件夹：deck.pptd是入口，pages和media保存页面与素材，.huandeng保存Story、编排和命名版本。把AGENTS.md、sources和notices一并保留。命名版本随项目携带，机器本地操作日志仍属于原电脑。导出后回到同一份源项目继续维护。下一步把助手接入同一份工作。
<!-- /notes:brief-11 -->

### 12. 打开示例，完成你的第一次修改 — E2RU

Main position: 24 · Notes source: `main-page`.

Occurrence: `introduction-short:brief-6:8a9bcdf1-fcb2-4214-9743-86c110c954ca`.

<!-- notes:brief-12 -->
这份演示就是一个可以继续编辑的HUANDENG项目。打开chatgpt-zh目录中的deck.pptd，选一张有明确对象的页面，读Story，用Slide ID提出一次小修改。先保留原图、数据、单位和出处，再调整解释或布局；保存后回看前后和页面历史。完成后仍留下完整项目，下一次就在这里继续。HUANDENG以OpenSlide为代码基础；OpenPPTD贡献MathML到OMML公式转换模块；PptxGenJS负责PPTX生成。PPTD思路受到Kimi Slides生态启发。图表、公式和图标分别使用Apache ECharts、KaTeX与Font Awesome Free。GitHub图标在这里指OpenPPTD仓库，并非该项目的产品Logo。公开DNA素材来源为RCSB PDB 1BNA、Drew等PNAS 1981研究，完整许可证与来源保留在sources和notices中。Sources: https://github.com/open-slide/open-slide ; https://github.com/gitbrent/PptxGenJS ; packages/core/src/pptd/vendor/open-pptd/NOTICE.md ; https://www.rcsb.org/structure/1BNA ; https://doi.org/10.1073/pnas.78.4.2179 .
<!-- /notes:brief-12 -->
