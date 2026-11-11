# Native author report — final factual continuation

Coordinator note: the visible native response is retained with local repository/install paths replaced by logical names. Exact original SHA-256: 6c56e200882e18c122161307a2ea1bd1dfaa2c8268ae1b735ffd5c1983ec6742. Statements by the author are distinct from independent verification. No raw prompt or hidden reasoning is included.

---

**英文版入口：** `project:claude-en\deck.pptd`
目录：`project:claude-en\`

英文版已对齐 0.19 的实际功能，也和中文版对上了。这次改动都放在一个写入里（`aa9f81e7-bb9b-4027-bdcd-9c99317e0324`），只动了 5 页的文字、讲稿备注和 Story，外加一处 Section Story。页数、顺序、版式和美术都没变。

## 改了什么
| 页 | 改动 |
|---|---|
| QMYQ 封面 | 版本改为 "HUANDENG 0.19.0" |
| SMGE 结尾 | 第 1 步改为可以打开 .pptd 文件，也可以打开它所在的文件夹。版本说明改为 0.19.0，并加上"移动或分享时要带上整个项目文件夹"。讲稿备注写全了打开规则：文件夹里必须正好有一个 .pptd，没有或有多个时，编辑器会说明情况并让你选具体文件。 |
| AUBX agent 与写入器 | 底部两段改成：不同页面的修改都能保存；基于旧版本的同页写入会被拒绝，需要重新读取、重新预览；活动报告只是客户端的声明，写入回执才是保存记录；没有章节锁、自动排班或在线状态。讲稿备注补齐了中文版 7K3P 讲到的事实，详见下面"中英对应"。 |
| GDDR 截图页 | 原标题 "Most tools give an agent only a screenshot" 改为 "Screenshots alone made agent edits slow to check"。截图其实可以测量，所以去掉了"截图没法测量"这种绝对说法；保留了你在截图流程里碰到的困难，并说明直接读对象的数值和位置，精确检查和修改更直接。讲稿备注和 Story 同步修改。 |
| C45U 故事优先 | 原句 "so they stop looking like AI" 改为：幻灯片保留你的观点，但能抓出看起来泛泛的地方的，仍然是看渲染出来的页面。讲稿备注和 Story 同步修改。 |
| sec-why 的 Section Story | 去掉 "screenshots cannot be measured"。项目元数据里只改了这一句。 |

## 保留未动
- **AVNM 和 7NHP**：页面文件逐字节没变（哈希 `21f2134a…`、`7f8a7b22…`），你调过的表格高度 75.567 也还在。
- **DKSN、SY94 的截图说明**：仍写 "HUANDENG Editor 0.18"，因为那两张截图确实是在 0.18 下截的，属于有日期的历史记录。全文里只剩这两处 0.18。
- **上一轮的两处修正**：QK69 引用的 Story 和 V2SV 对 Occurrence 的说明都还在。
- **组会版的专用讲稿备注**：没有和新事实冲突的说法，所以没改。
- **其他**：图表的 PowerPoint 排版限制、第 24 页（致谢）、科学数据都没碰。

## 检查与导出
- **渲染**：改动的 5 页都看过渲染图，没有溢出或遮挡。
- **导出**：先导完整版，再导组会版：

| 文件 | 页数 | 说明 |
|---|---|---|
| `Exports\deck.pdf` | 25 | 无任何警告 |
| `Exports\deck.pptx` | 25 | |
| `Exports\Lab-meeting version (about 8 minutes)-pres-lab.pdf` | 9 | |
| `Exports\Lab-meeting version (about 8 minutes)-pres-lab.pptx` | 9 | |

- **内容核对**：在导出的 PDF 文本里确认了新文字都在。
- **已知限制**：两个 PPTX 仍有之前那两条提示：图表在 PowerPoint 里由 PowerPoint 自己排坐标轴；字体没有嵌入。
- **里程碑**：这次没有新建命名里程碑，之前的 "Story-driven edition" 仍可用。

以上只是技术上完成，不代表你已认可。

## 中英对应
- **版本号**：两边现在都写 0.19.0。
- **打开规则**：两边一致。英文版写在 SMGE（画面上的第 1 步和讲稿备注），因为 7NHP 是你改过的页，不能动。
- **协作事实**：英文版写在 AUBX 的画面和讲稿备注里，中文版对应 7K3P，覆盖的事实相同，只是版式不同：
  - 写入器一次保存一个改动；
  - 改不同页面都能保存；
  - 基于旧版本的同页写入会被拒绝；
  - Story、Section、Presentation 这些项目信息共用一个版本号，也可能冲突；
  - 交接时写清操作、页面和版本，下一位先读保存后的结果再改；
  - DSH 和 ChatGPT 共用三页测试项目的真实测试；
  - 这次测试没有 Claude 原生会话参与，也不是"同时直接写文件"；
  - 没有章节锁、自动排班或在线状态。
- **中文版**：我只读了中文版作参照，没有修改。