# 为什么做幻灯：讲稿

从当前项目的实际 Notes 整理；修改请回到对应页面。

## 完整介绍

### 1. 我为什么开始做幻灯 · TTHC

我想先讲讲，为什么会开始做幻灯。起点是开组会时很具体的困扰：我想让AI帮我做slides，但我仍然希望听众能听到我的判断。还有一个麻烦是改两页也会留下整套新副本。后来我开始把人的故事、页面的身份和可以持续编辑的材料放到同一个项目里。这就是HUANDENG的来由。

### 2. 我仍然想让 Agent 帮我做 slides · 59RT

我并不想回到所有东西都手动做的状态。Slides本身就是文件和数据。既然Agent可以读写代码，也可以理解对象、材料和顺序，我认为让它掌握slides制作是一条自然的发展方向。这是我自己的判断。问题是：我希望它接管重复劳动的时候，我的讲述也能留下来。

Account source: sources/story/USER-STORY.zh-CN.md. The explanation is based on the founder’s personal experience and design judgment.

### 3. 在组会上，大家一眼就认出来了 · MF4X

在组会和别人的presentation里，我注意到导师和很多人能一眼识别AI做的slides。不同工具的风格确实不同，但我常常觉得它们太想把所有方面都交代完了。后来我发现，自己的介绍稿也会这样：看起来有内容，却不知道真正要讲什么。右边是我之前这套介绍里的真实页面。这些页面让我开始重新检查自己的讲述。

Account source: sources/story/USER-STORY.zh-CN.md. The explanation is based on the founder’s personal experience and design judgment.

### 4. 五十页里改两页，为什么又多一套？ · MSVB

第二个问题很实际。假设我已经有五十页，只想修改其中两页，有的Agent为了保留原稿，会再给我一整套新文件。改动次数一多，目录里就堆满带日期、final和new的副本。我想到Git这样的版本管理工具：能不能把修改和历史落到这一页上，而不是靠不断复制整个演讲来保存过去？

Account source: sources/story/USER-STORY.zh-CN.md. The explanation is based on the founder’s personal experience and design judgment.

### 5. 截图能看效果，修改还需要结构 · 6G4G

第三个问题是修改怎样落得准确。截图很有用，我仍然需要看版面、看图和文字是否合适。但截图本身不能告诉Agent这个对象的身份、它的数值和哪些页面在引用它。我希望同时保留画面和结构：看得见效果，也能准确地选中和修改对象。这样可以检查数值和边界，但人的视觉判断依然不可少。

Account source: sources/story/USER-STORY.zh-CN.md. The explanation is based on the founder’s personal experience and design judgment.

### 6. 所以，我想先把故事讲出来 · YCXA

我的理解是，AI味不只来自颜色和模板，也来自没有重点、没有取舍，却努力覆盖一切。这是我从自己的经历里形成的判断。所以我更愿意先把故事讲出来，想到哪里说到哪里，再让AI整理其中的逻辑。就像这次，我先讲为什么做HUANDENG。这样讲稿和slides长在同一条思路上，我不用在最后再去适应一套AI替我安排的逻辑。

Account source: sources/story/USER-STORY.zh-CN.md. The explanation is based on the founder’s personal experience and design judgment.

### 7. 我把这些已有的思路接在一起 · TZXM

接下来我开始找技术上可以借用的思路。我在Kimi Slides生态中接触到PPTD，用更直接的页面文件表达slides；OpenSlide则已经把React页面、画布和编辑交互连了起来。HUANDENG的代码基于OpenSlide，结合PPTD文档模型和Electron桌面端。这些已有工作提供了我可以组合的基础。OpenPPTD实际贡献的是公式转换模块。

Sources and precise attribution: sources/story/FACTS.md ; https://open-slide.dev/docs ; https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document .

### 8. 一页的身份 · CR5K

这些困扰让我想把页面作为持续修改的单位。接下来先说清楚项目如何组织、怎样认出同一页，以及如何回到它的历史。

### 9. PPTX 里面，本来就有页面 · 3UZE

这里要先澄清一个容易误会的地方。PPTX内部本来就分页面、素材和备注，它是一个Open XML包。我的选择不是给PowerPoint发明页面结构，而是把日常工作的入口变成一个可访问的目录，用deck.pptd组织页面和素材。两种格式的模型不同，不能直接把PPTX改后缀当成PPTD。图中只选了与这个解释有关的真实路径类型。

Sources and precise attribution: sources/story/FACTS.md ; https://open-slide.dev/docs ; https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document .

### 10. 打开一个目录，继续同一份工作 · 4YZD

在HUANDENG里，打开deck.pptd就进入这个项目，但它不是一个孤立文件。页面在pages里，图片在media里，Story、编排和历史在.huandeng里。AGENTS.md留下给Agent的项目约定。Files视图把这些内容直接展示出来，有点像IDE中的项目树。移动作品时要带上整个目录，这样下一次编辑还有原始材料和历史。

### 11. 先说清楚，我们改的是哪一页 · 93SF

把一页作为修改单位，还有一个前提：我们得知道说的是哪一页。第四页在重排之后可能已经不是第四页，所以Position只是当前顺序。我用一个稳定的四位Slide ID指向它。右边的表格取自本项目两个真实演讲的顺序，同一页的位置会变，身份不变。这样我与Agent说到这页时，不需要反复猜我们指的是哪个版本的第四页。

### 12. 把历史留在这一页 · E9RN

有了稳定身份，历史才能跟着这一页走。选中页面后可以看它的操作记录，知道哪些字段改过；也可以在有意义的阶段保存一个命名版本，回来预览或恢复。这里展示的是本项目真正保存过的单页版本。这回应了前面改两页却复制整套文件的问题：继续在同一个项目里工作，把这页的历史留在这页。

### 13. 让故事留在编辑里 · FE8A

页面身份和历史明确了修改的边界。我还希望把人的判断留下来，所以接下来进入编辑器，看看Story和素材怎样把意图与证据带到下一次编辑。

### 14. 人和 Agent，都回到这个编辑器 · ZYZB

有了文档和历史，还需要一个人愿意使用的工作区。HUANDENG Editor保留画布编辑，左边是项目、页面、素材和文件，右边可以看对象属性、图层和Story。Agent的修改也会回到同一份画面里。我希望人在这里接着改，不必为了让AI参与而放弃直接选择对象、排列图层和调整版面。

### 15. 把“为什么这样讲”留给下一次编辑 · HWB6

Story是我把人的讲述留下来的位置。项目层记录这场介绍为什么存在；每一页记录它要推进哪一步，以及下一次修改必须保留什么。这里的科学例页需要保留结构、十二个数值和来源。Story给Agent一个理解这页的依据，也给下一次接手的我留下判断。它是上下文，不是保证AI永远听话的开关。

### 16. 素材库承接上一轮的工作 · MPTA

素材库对我尤其重要。科学slides会反复用到同一张结构图、另一视角、原始数据和出处。如果素材只是在对话里临时生成或散落在别处，下一次修改就很容易失去依据。在这里它们属于项目，可以继续选用。右侧是同一份1BNA坐标的另一个视角。素材不是为了把页面填满，它承接了上一轮工作的证据。

Source: https://www.rcsb.org/structure/1BNA ; https://doi.org/10.1073/pnas.78.4.2179 . Source coordinates, calculation and all twelve values: sources/science/.

### 17. 同一结构里的局部差异 · 7EKH

现在用一个公开科学例页看这套工作方式。左边是1BNA DNA结构，右边是同一组坐标计算的十二个配对位置C1′距离。位置7对应A7和B18。这个例子不是我项目的研究结果，也不是十二次独立实验；它只是让我们清楚地看到图像、数值、单位和说明如何一起保留。接下来我会改它的文字，让科学材料保持不动。

Source: https://www.rcsb.org/structure/1BNA ; https://doi.org/10.1073/pnas.78.4.2179 . Source coordinates, calculation and all twelve values: sources/science/.

### 18. 表格和公式，也能接着改 · HUA9

原图之外，我也希望表和公式能继续编辑。这里的表是真正的表格对象，不是一组对齐的文本框；公式仍然作为公式保留。这一点对人接手很重要：后来要改一列或修正一个数值，不需要逐个搬动假单元格。显示的五个位置来自前页的同一份数据，完整十二个值和计算脚本都留在项目里。

Source: https://www.rcsb.org/structure/1BNA ; https://doi.org/10.1073/pnas.78.4.2179 . Source coordinates, calculation and all twelve values: sources/science/.

### 19. 这次只把说明讲清楚 · JNZV

实际请求可以很小：把这一页的标题和解释讲得更清楚，保留原始图、十二个数值、坐标轴和来源。这里展示的是这次操作实际保存的修改前后。Agent通过当前版本读取、预览、保存修改，我再看结果。请求的范围与最终改动能够对应起来，才有可能放心地继续编辑同一份作品。

### 20. 退后一步，检查整场讲述 · SE68

页内编辑之外，我还需要退后一步看整场报告。Browse让我看到每个章节的真实页面，Outline帮助我检查标题和叙事顺序，Sections让我调整分组。它们不是三个独立副本，而是同一套页面的不同观察方式。我会在这里检查：这一章是否回答了前面提出的问题，还是只是又添了几个功能。

### 21. 把这些约定带给不同的 Agent · W7WP

这套工作流并不要求只用一种模型。Plugin把制作约定和项目上下文交给Agent，Connector把请求送到选定项目的共享写入服务；我在Editor中的操作也作用于同一份文件。本次介绍本身就让ChatGPT、Claude Code和DeepSeek Harness各自尝试。这里的重点是它们能够在同一套文件和操作规则中工作，审美仍然要分别看结果。

### 22. 回到下一次组会 · 36EQ

这些操作最终要回到讲述现场。下一次组会可能有不同的时间和听众，我需要从这份材料中选择页面、准备讲稿，并带上合适的版本。

### 23. 下一次组会，挑我需要讲的页面 · U5QA

回到开组会这件事，我不一定每次都讲同样的内容。Main Slides保存完整的页面材料；一次简短介绍可以挑其中一部分，并换一个顺序。这里的缩略图就是本项目真实的完整稿和简短稿。改动一个live页面时，它的引用继续指向这一页。我不需要维护两套越来越不一致的副本。

### 24. 同一张页，换一种讲法 · EJBQ

同一张页对不同听众也可能有不同讲法。页面的Notes保存一般的解释；Presentation中的一次引用可以有自己的讲稿。我可以在组会上解释测量方法，在项目介绍里用它说明为什么要保留证据。图像还是那张图，但这次演讲的目的和话语不同。这样讲稿也能跟着真实故事一起组织。

### 25. Live 与 Pinned · 2856

有时我希望演讲继续跟随主稿改动，有时我需要留住已经确认的画面。Live引用读取当前页；Pinned引用选择一个保存过的命名版本。右边保留的是之前措辞修改完成时的状态，左边则包括后来对图表标注的调整。它们共享页面身份，但选取的内容版本不同。这和演讲中的先后位置是两件事。

### 26. 最后，从这份项目去演讲和交付 · NJM7

准备好之后，可以直接放映，也可以导出给别人继续使用的PPTX和方便阅读的PDF。这里是当前项目的真实导出入口。现场逐步展开属于播放逻辑，静态文件承载最终页面。对我来说，交付也应该沿用这一份项目，而不是为了导出又创建一个不知道以后要改哪份的源稿。

### 27. 下一次，我先讲我的故事 · E2RU

我做HUANDENG，是希望下一次准备组会时，先把我真正想讲的事情讲出来，再让Agent帮我整理、制作和修改。素材、页面身份和历史留在项目里，我可以回到同一份工作继续做。这份介绍本身也是从我的口述重新整理出来的。最终我想留下的，是人的判断能够跟着作品走。

## 简短介绍

### 1. 我为什么开始做幻灯 · TTHC

我想先讲讲，为什么会开始做幻灯。起点是开组会时很具体的困扰：我想让AI帮我做slides，但我仍然希望听众能听到我的判断。还有一个麻烦是改两页也会留下整套新副本。后来我开始把人的故事、页面的身份和可以持续编辑的材料放到同一个项目里。这就是HUANDENG的来由。

### 2. 在组会上，大家一眼就认出来了 · MF4X

在组会和别人的presentation里，我注意到导师和很多人能一眼识别AI做的slides。不同工具的风格确实不同，但我常常觉得它们太想把所有方面都交代完了。后来我发现，自己的介绍稿也会这样：看起来有内容，却不知道真正要讲什么。右边是我之前这套介绍里的真实页面。这些页面让我开始重新检查自己的讲述。

Account source: sources/story/USER-STORY.zh-CN.md. The explanation is based on the founder’s personal experience and design judgment.

### 3. 五十页里改两页，为什么又多一套？ · MSVB

第二个问题很实际。假设我已经有五十页，只想修改其中两页，有的Agent为了保留原稿，会再给我一整套新文件。改动次数一多，目录里就堆满带日期、final和new的副本。我想到Git这样的版本管理工具：能不能把修改和历史落到这一页上，而不是靠不断复制整个演讲来保存过去？

Account source: sources/story/USER-STORY.zh-CN.md. The explanation is based on the founder’s personal experience and design judgment.

### 4. 所以，我想先把故事讲出来 · YCXA

我的理解是，AI味不只来自颜色和模板，也来自没有重点、没有取舍，却努力覆盖一切。这是我从自己的经历里形成的判断。所以我更愿意先把故事讲出来，想到哪里说到哪里，再让AI整理其中的逻辑。就像这次，我先讲为什么做HUANDENG。这样讲稿和slides长在同一条思路上，我不用在最后再去适应一套AI替我安排的逻辑。

Account source: sources/story/USER-STORY.zh-CN.md. The explanation is based on the founder’s personal experience and design judgment.

### 5. PPTX 里面，本来就有页面 · 3UZE

这里要先澄清一个容易误会的地方。PPTX内部本来就分页面、素材和备注，它是一个Open XML包。我的选择不是给PowerPoint发明页面结构，而是把日常工作的入口变成一个可访问的目录，用deck.pptd组织页面和素材。两种格式的模型不同，不能直接把PPTX改后缀当成PPTD。图中只选了与这个解释有关的真实路径类型。

Sources and precise attribution: sources/story/FACTS.md ; https://open-slide.dev/docs ; https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document .

### 6. 先说清楚，我们改的是哪一页 · 93SF

把一页作为修改单位，还有一个前提：我们得知道说的是哪一页。第四页在重排之后可能已经不是第四页，所以Position只是当前顺序。我用一个稳定的四位Slide ID指向它。右边的表格取自本项目两个真实演讲的顺序，同一页的位置会变，身份不变。这样我与Agent说到这页时，不需要反复猜我们指的是哪个版本的第四页。

### 7. 把历史留在这一页 · E9RN

有了稳定身份，历史才能跟着这一页走。选中页面后可以看它的操作记录，知道哪些字段改过；也可以在有意义的阶段保存一个命名版本，回来预览或恢复。这里展示的是本项目真正保存过的单页版本。这回应了前面改两页却复制整套文件的问题：继续在同一个项目里工作，把这页的历史留在这页。

### 8. 把“为什么这样讲”留给下一次编辑 · HWB6

Story是我把人的讲述留下来的位置。项目层记录这场介绍为什么存在；每一页记录它要推进哪一步，以及下一次修改必须保留什么。这里的科学例页需要保留结构、十二个数值和来源。Story给Agent一个理解这页的依据，也给下一次接手的我留下判断。它是上下文，不是保证AI永远听话的开关。

### 9. 素材库承接上一轮的工作 · MPTA

素材库对我尤其重要。科学slides会反复用到同一张结构图、另一视角、原始数据和出处。如果素材只是在对话里临时生成或散落在别处，下一次修改就很容易失去依据。在这里它们属于项目，可以继续选用。右侧是同一份1BNA坐标的另一个视角。素材不是为了把页面填满，它承接了上一轮工作的证据。

Source: https://www.rcsb.org/structure/1BNA ; https://doi.org/10.1073/pnas.78.4.2179 . Source coordinates, calculation and all twelve values: sources/science/.

### 10. 同一结构里的局部差异 · 7EKH

这是一张公开的DNA结构例页。图和十二个数值来自同一份坐标。当我只想改讲法时，图、数值和来源应该一起保留下来。这也是我希望不同Agent遵守的工作约定。

### 11. 把这些约定带给不同的 Agent · W7WP

这套工作流并不要求只用一种模型。Plugin把制作约定和项目上下文交给Agent，Connector把请求送到选定项目的共享写入服务；我在Editor中的操作也作用于同一份文件。本次介绍本身就让ChatGPT、Claude Code和DeepSeek Harness各自尝试。这里的重点是它们能够在同一套文件和操作规则中工作，审美仍然要分别看结果。

### 12. 下一次组会，挑我需要讲的页面 · U5QA

回到开组会这件事，我不一定每次都讲同样的内容。Main Slides保存完整的页面材料；一次简短介绍可以挑其中一部分，并换一个顺序。这里的缩略图就是本项目真实的完整稿和简短稿。改动一个live页面时，它的引用继续指向这一页。我不需要维护两套越来越不一致的副本。

### 13. 下一次，我先讲我的故事 · E2RU

我做HUANDENG，是希望下一次准备组会时，先把我真正想讲的事情讲出来，再让Agent帮我整理、制作和修改。素材、页面身份和历史留在项目里，我可以回到同一份工作继续做。这份介绍本身也是从我的口述重新整理出来的。最终我想留下的，是人的判断能够跟着作品走。
