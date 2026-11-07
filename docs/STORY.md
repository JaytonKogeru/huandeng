# HUANDENG Story

HUANDENG Story 记录项目、章节、演讲和单页的叙事目的。作者可以说明研究问题、目标听众、希望留下的结论，以及每页需要保留的设计判断。用户可以在编辑器中维护，外部 ChatGPT、Claude Code、Codex 等 Agent 也可以通过事务接口协助整理。不要求先填完 Story 才能编辑或演讲。

## 四个层级

| 层级 | 所属对象 | 记录什么 | 复用方式 |
| --- | --- | --- | --- |
| Main Story | 项目唯一的 Main Slides | 完整研究记录的大问题、使用者、主要结论 | 全项目共用 |
| Section Story | Main Slides 的某个 Section / chapter | 这一组证据回答的局部问题 | 被多个 Presentation 引用 |
| Presentation Story | 某个 Presentation Slides 序列 | 这次演讲的目的、听众、核心 takeaway | 每个演讲独立 |
| Page Story | 规范页面的 `designIntent` | 逐页目的、修改要求、必须保留的判断 | 跟随规范页面及其命名版本 |

前三层共用三个轻量字段：`purpose`、`audience`、`takeaway`，均允许为空。逐页 Story 保持原有 `purpose` / `keep` 与来源记录，以兼容旧工程。

## 在编辑器中使用

打开 **Project & Story**，在 **Slide collection** 选择 **Main Slides**，编辑 **Main Story**；创建 Section 后，展开 **Section Story**，记录这一章节的目的。把页面分配给 Section，并用上下箭头调整章节内部顺序。

新建或选择 Presentation 后，在 **Presentation Story** 记录当前演讲的目的与听众，再通过 **Build the presentation** 添加章节或单页。一个报告可以使用 Section 1、3、4、7、8，另一个报告可以只使用 Section 3、7；它们引用相同的规范页面，不产生独立副本。

这些项目层面的编辑需要点击 **Save project**。存在未保存的项目草稿时，先保存或 **Discard draft**，再播放或导出。外部修改产生冲突时，编辑器保留本地草稿并停止覆盖保存；先保留需要合并的内容，再放弃草稿并加载当前项目。

逐页 **HUANDENG Story** 面板仍用于页面本身的意图。演讲专用备注放在 Presentation 的单页条目中：启用 **Presentation-specific speaker notes** 后，备注只作用于当前演讲中的这一次出现。重复引用同一页时，可以为每次出现写不同备注。

## 数据与 Agent 接口

项目层数据位于 `.huandeng/project.json` 的可选 `project` 字段，类型与校验在 `packages/core/src/pptd/project-model.ts`：

- `readProjectModel` 兼容没有编排数据的旧工程。
- `validateProjectModel` 校验 Section、Presentation、条目 ID 和 Story 字段。
- `project.replace` 事务使用 `expected.metadata` 做比较并交换保护。发送前读取当前快照，在完整 `project` 值上修改，保留其他 Story、Section 和 Presentation。
- `resolvePresentation` 展开章节和页面引用，保留重复页的不同出现位置。
- `assertPresentationReady` 对缺失页面、缺失章节和空演讲给出错误，供播放及导出入口使用。

Story 是作者意图和编辑上下文，不会自动授予作者审核通过状态。Agent 填写的内容不能替代人工审核；页面已有的 revision-bound author review 机制继续独立工作。

逐页 Story 的规范入口继续是 `huandeng story`、`POST /__pptd/story`、`huandeng_story_record`，源码为 `pptd/story.ts`。项目层编排使用通用事务入口 `POST /__pptd/transactions`，不改变逐页接口的语义。

既有 `designIntent` 数据继续使用，避免改名破坏旧文档和页面历史。旧 frame 命令/路由和旧拼写工具调用是兼容入口，MCP tools/list 和界面只展示新名。浏览器的 animation frame、mainFrame、几何 frame 不是本系统名称，不改。

当前实现是项目、章节、演讲、单页的分层意图与序列编排；不包含叙事事件图、条件跳转、自动推断科研结论或自动作者批准。完整工程模型、引用和固定版本规则见 [PROJECTS.md](PROJECTS.md)。
