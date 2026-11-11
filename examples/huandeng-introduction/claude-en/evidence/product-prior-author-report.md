# Native author report — preceding completed submission

Coordinator note: the visible native response is retained with local repository/install paths replaced by logical names. Exact original SHA-256: 52cffe4ea8c2b27a4a5f35569bb568759333499ccef04880c74c2b251621af06. Statements by the author are distinct from independent verification. No raw prompt or hidden reasoning is included.

---

**英文版入口：** `project:claude-en\deck.pptd`
目录：`project:claude-en\`

协调说明里指出的两处事实错误都核实属实，已经改好。PDF 和 PPTX 已重新导出。这次是维护，不是重做，结构和美术没动。

## 改了什么
1. **QK69 与 AVNM 记录的 Story 对不上。**
   - QK69 表格声称引用的是 1BNA 页实际记录的 Story，但"This change"一栏还写着旧的"First authoring for the English introduction"。
   - AVNM 那边记录的 requestedChange，又是一句整套演讲的笼统话。
   - 现在两边改成同一句真实的页面级修改，也就是这一轮你要求的那处："Move the y-axis title clear of the tick labels; values, axis range and citation unchanged."
   - AVNM 只改了 Story 元数据，页面内容没动。你调过的表格高度 75.567 还在。
2. **V2SV 里 Occurrence 的说法不对。**
   - 我查了 `packages/core/src/pptd/project-model.ts`：occurrenceId 是 `presentationId:itemId:pageId` 拼出来的，调整 Presentation 的顺序不会改变它，只有位置会变。
   - 原来写的是"That Presentation is rearranged"，现在改成"Not when reordered; only its place moves"。
   - 第一次改的句子太长，表格压到了页脚，所以又缩短了一次。
- 你改过的 7NHP 没有碰。两页都渲染检查过。

**写入回执：**
- T5 `2128cbf9-7a0b-4146-b708-7ad28f11bd4b`
- T6 `64645adb-e17e-464d-bad8-24a65ab1c440`

**导出：** 先 PDF 后 PPTX。
- `…\claude-en\Exports\deck.pdf`：25 页，没有任何警告；我在导出文件里确认了两处新文字都在。
- `…\claude-en\Exports\deck.pptx`：仍是之前那两条提示，一是图表在 PowerPoint 里由 PowerPoint 自己排坐标轴，二是字体没有嵌入。

以上都只是我自己的检查，不代表你已认可。

## 你消息里其他事项
下面这些我都没做：中文版、其他模型的版本、DSH/CC 插件升级、文件夹规范、多 agent 协作的功能设计。这次任务只授权改英文版，这些归协调者或各自的会话处理。我也没有修改或测试插件代码。DSH 插件我只看了一眼 `installed-native-HUANDENG-bundle\package.json`，没细看。

下面是我这一轮亲自碰到的情况，可以作为你判断插件和 AGENTS.md 有没有设计缺陷的依据：
- **页面背景有一个坑。** 用 `themeOverride.background` 设的背景，单页渲染能看到，但 PDF 导出不认，导致 BW88 在 PDF 里成了白页，白字标题完全看不见。transaction 也没有设置页面背景的操作，只能垫一个整页矩形绕过去。建议在插件或写入层修掉，或者至少在说明里写明。
- **导出结果太大。** export 每次返回 7–9 万字符，超过工具输出上限，只能另存成文件再解析。
- **版本只能逐页记录。** 想给整套记一个里程碑，要调 25 次。
- **会话断开不能自动恢复。** 编辑器重启后，已连接的 MCP 进程一直报 `SESSION_TOKEN_REQUIRED`，没法自己恢复，要靠协调者重新连。
- **多 agent 协作目前能做到的程度。** 每次写入都会先检查对应页面的版本有没有变：
  - 不同 agent 改不同页面，可以同时进行；
  - 改同一页，或者改共享的 Story/Section 元数据，后提交的一方会被拒绝，需要重读最新状态再提交；
  - 我这次就是在你同时改着 AVNM 和 7NHP 的情况下，避开这两页完成写入的；
  - 系统并不知道哪个助手在改哪个 Section，也没有锁或分工调度。"人和多个 agent 同时开工"能讲，但要按这个真实边界讲。