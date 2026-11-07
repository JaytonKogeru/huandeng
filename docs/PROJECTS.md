# HUANDENG 项目、Main Slides 与 Presentation Slides

一个项目目录只有一份 Main Slides，保存全部规范页面与素材。一个项目可以有多个 Presentation Slides；每个演讲按照自己的顺序引用 Main Slides 中的章节或单页。Main Slides 承担研究记录和素材库的职责，Presentation Slides 面向具体听众组织演讲。

## 对象与所有权

| 对象 | 数量与归属 | 保存内容 |
| --- | --- | --- |
| Project | 一个目录对应一个项目 | 唯一项目 ID、页面身份、编排和 Story |
| Main Slides | 每项目唯一 | `.pptd` manifest 指向的规范 `.page` 页面及顺序 |
| Section / chapter | Main Slides 中的若干平级分组 | 稳定 ID、标题、有序 page IDs、Section Story |
| Presentation Slides | 每项目零到多个 | 稳定 ID、标题、有序引用、Presentation Story、规划备注 |
| Presentation item | 归属于一个 Presentation | 对 Section 或单页的引用；单页可附带固定版本和演讲备注 |
| Page checkpoint | 归属于规范页面 | 作者明确保存的命名版本，用于预览、恢复或固定引用 |

Section 和 chapter 是同一层级的不同称呼，界面没有叠加三套 Part / Section / Chapter 层级。Main Slides 也不是 PowerPoint 的 Slide Master；页面模板、字体主题与素材库属于不同问题。

每张规范页面最多属于一个 Section，也可以暂时不属于任何 Section。Section 的顺序与内部页序由项目编排维护；它们不会改写 Main Slides manifest 的原始顺序。一个 Presentation 可以多次引用同一页面或同一章节，每次出现有独立的 occurrence ID。

## 从完整资料组织一次演讲

1. 打开左侧 **项目**，在概览中点击 **编排演讲**，进入 **项目与故事**。在 **幻灯片集合** 中选择 **主幻灯片（Main Slides）**，填写 **主故事 · 整个项目**。这些文字允许留空。
2. 点击 **新建章节**，修改标题。通过 **为主幻灯片分配章节** 分配页面；通过章节内的上下箭头排序。
3. 点击 **新建演讲**，填写演讲名称与 **演讲故事**。
4. 在 **编排演讲幻灯片** 中依次加入章节或单页。例如加入第 1、3、4、7、8 章，即得到只包含这些部分的演讲。页面较多时，可先按章节名称、页面短码或路径筛选可添加内容。
5. 用条目的上下箭头调整顺序。**实际播放顺序** 展示展开后的页序，包含重复出现的页面。条目较多时，可用 **定位编排条目** 查找短码、路径或章节；按 Enter 或上下匹配按钮逐次定位重复引用，定位不会改变完整顺序。
6. 点击 **保存项目**，再播放或导出。项目编排不依赖手工复制 `.page` 文件。

另一个报告只需再创建一个 Presentation。修改共享的 Main Slide 后，所有 live 引用读取新内容。修改某个 Presentation 的顺序、Story 或演讲专用备注，只影响这个 Presentation。

顶栏选择器用于切换已保存的 Main / Presentation；项目面板的选择器还包括尚未保存的新演讲，并显示「未保存」。新演讲保存前可继续编辑或放弃草稿，不能把它误当成已经可以放映的集合。

### 动态章节与固定页序

Section 条目是动态引用：章节增加、移除或重排页面后，下一次解析该 Presentation 时读取更新后的章节内容。

若一次报告需要固定页序或对某张页写独立讲稿，在对应 Section 条目点击 **拆为独立页面引用**。它会用该章节当前的页面顺序替换这个条目，生成多个单页引用。页面仍来自同一份 Main Slides；之后修改 Section 的组成不会改变这些单页条目。

### Live page 与 named version

默认的 **实时引用 · 跟随主页面更新** 使用当前规范页面。需要保留已经确认的设计时，先在该页的版本历史中显式保存命名版本，再在 Presentation 单页条目的 **页面版本** 选择它。**刷新页面版本** 可读取之后新增的命名版本。

固定页版本与固定页序是两件事。把 Section 转换成单页引用只固定当前页序；选择 named version 才固定该页的内容。Section 本身持续跟随当前章节成员，不能直接绑定某个页面版本。

命名版本通过项目内的 checkpoint 与归档资产保存，跟随项目目录移动。固定版本引用不会还原、改写或复制当前 Main Slide。版本解析会核对页面身份、命名版本身份、资产归档和画布尺寸；不存在、损坏或尺寸不兼容时阻止使用，不会退回当前页替代。

### 演讲专用备注

单页条目的 **本次引用使用独立演讲备注** 默认关闭，沿用页面备注。启用后可以为这一次出现记录不同讲稿，也可以明确留空。取消勾选则重新沿用页面备注。**演讲编排笔记** 是整场报告的准备说明，与逐页讲稿分开保存。

## 保存与冲突

页面内容沿用已有原位保存和冲突保护。项目编排采用显式 **保存项目**：多个字段、章节与演讲变动合成一次 `project.replace` 事务，以最初读取的 metadata revision 作为前提。保存不会重写无关的 `.page` 文件。顶栏页面保存和 Ctrl+S 不会替代这一步。

如果外部 Agent 或另一个窗口先修改项目，旧草稿不会覆盖新数据。界面保留草稿并停用修改和保存控件；先保留需要合并的内容，再通过 **放弃草稿** 读取当前工程继续。切换 Main Slides / Presentation 会保留项目草稿。

只读项目可以浏览 Story 和已保存的演讲结构，不能创建、重排、删除或保存编排。未保存的项目草稿需要先保存或放弃，才能进行依赖项目结构的播放与导出。

## 删除与修复

- 删除 Presentation 只删除它的顺序、Story 和演讲专用备注，所有 Main Slides 保留。
- 从 Presentation 移除条目，只移除这次引用。
- 删除 Section 后，其页面仍在 Main Slides；引用该 Section 的 Presentation 显示缺失章节错误。可以恢复章节，或移除该条目并重新选择章节。
- 删除被引用的 Main Slide 后，相关引用保留并显示缺失页面错误。恢复同一页面身份后，引用自动恢复有效。
- 存在缺失引用的 Presentation 不能跳过这些内容继续播放或导出。其他没有问题的 Presentation 仍可正常使用。

## 页面 ID

界面优先显示稳定的四位短码，例如 `A7F3`，旧的 `S1`、`S2` 等编号保留为兼容别名；缺少短码的旧页面仍可显示旧编号。短码标识同一张页面，页面列表和演讲中的序号表示该次出现的位置，两者不会因为排序而互相替换。项目内引用使用 UUID `pageId`，因此标题、路径、顺序改变不会切断关系，不应为了简化显示批量重建页面身份。

同一页面可在一场演讲里出现多次，各次出现具有独立 `occurrenceId`。相同的实时引用共享视觉内容和动画，可以设置不同演讲备注。如果不同目录页需要高亮不同章节，当前应使用不同的 Main 页面；本版没有隐含的 occurrence 视觉覆盖或一键创建独立变体。

## 数据格式与集成

原有 `.pptd` manifest 和 `.page` 文件继续作为 Main Slides 的数据源。`.huandeng/project.json` 新增可选 `project` 字段：

```json
{
  "schemaVersion": 1,
  "mainStory": { "purpose": "完整研究问题", "audience": "研究团队", "takeaway": "主要证据链" },
  "sections": [
    {
      "id": "results",
      "title": "Results",
      "pageIds": ["existing-page-uuid"],
      "story": { "purpose": "说明主要结果", "audience": "", "takeaway": "" }
    }
  ],
  "presentations": [
    {
      "id": "conference",
      "title": "Conference talk",
      "story": { "purpose": "报告研究结果", "audience": "领域同行", "takeaway": "核心发现" },
      "items": [
        { "id": "results-block", "kind": "section", "sectionId": "results" },
        {
          "id": "closing",
          "kind": "page",
          "pageId": "existing-page-uuid",
          "notes": "结尾再次回到这张图"
        }
      ]
    }
  ]
}
```

示例中的 `existing-page-uuid` 必须替换成当前项目已有的 `pageId`。条目 ID 在同一 Presentation 内唯一；Section ID 和 Presentation ID 分别在各自集合内唯一。单页条目可增加 `versionId` 指定命名版本。旧工程缺少 `project` 字段时按空编排读取，不会在打开时自动创建演讲或改写页面。

外部 Agent 应先读取当前快照，再通过 `POST /__pptd/transactions` 发送 `operations: [{ "op": "project.replace", "project": ... }]`，并携带当前 `expected.metadata`。不得只发局部 project 对象覆盖其他演讲或章节。校验使用 `validateProjectModel`，读取和展开使用 `readProjectModel`、`resolvePresentation`、`assertPresentationReady`；内容快照使用 `presentationSnapshot` 解析当前页和固定版本。

相关实现位于 `packages/core/src/pptd/project-model.ts`、`presentation-snapshot.ts` 和 `packages/core/src/app/components/pptd/project-panel.tsx`，对应测试为 `project-model.test.ts`、`presentation-snapshot.test.ts`。回归覆盖旧工程、章节变化、重复页、固定版本与资产、缺失引用、CAS 冲突、持久化重开，以及删除后恢复同一规范页面。
