# Native author report — Chinese product revision

Coordinator note: this is the visible native final response with local repository paths replaced by logical names. Original visible-response SHA-256: 03a83392d5bbdfddaa2c117dcf7dfbbc2e09a9edd530bf295f82748aa0136393. The author did not perform the later coordinator Office review or 12-page brief export. Its Main-order/metadata claim remains a recorded content error. The original wording below is testimony, not a verified specification.

---

**直接打开：**  
`project:deepseek-zh\deck.pptd`  
目录：`project:deepseek-zh\`

## 这一版做了什么

已从“18 页故事版”改成 **22 页产品版**。故事只保留为问题入口，主体改成产品是什么、怎么用、为什么这样设计：

- 封面之后先讲 **一个项目、一个写入器**：Editor、项目目录、插件/连接器、外部助手的关系。
- 组会故事压到 3 页：导师一眼看出 AI 幻灯片、AI 质感来自没有取舍、改两页却多三份副本。
- 然后进入编辑器：真实工作区、Slide ID、逐页历史、文件夹入口、结构化页面、1BNA 证据、素材库、Story、一次修改、Main/Presentation 复用、多助手边界、交付、致谢和第一步。
- **XZJN 的假表格已清掉**：原来三组“标题/说明/横线”文本框，已合并成一个 rich-text 列表。
- **恢复致谢/图标**：OpenSlide、OpenPPTD/GitHub、PptxGenJS、HUANDENG 实际标识，并保留商标归属和 Kimi 免责声明。
- **PPTX 页面身份的错误说法已修正**：PPTX 有 slide parts 和标识符；HUANDENG 是把工作目录和页面服务显式化。
- **0.19 文件夹入口**已写进页内：可打开文件夹或 `deck.pptd`；一个目录只解析一个入口；`.huandeng` 后缀可选，不是必需，也没有系统级双击关联。
- **多助手**单独成页：不同页面可并行；同一页即使改不同对象也会 revision 冲突；Story/章节/顺序共用 metadata revision；没有自动章节锁、排班或在线状态。

完整版 22 页，短版 12 页；两个 title-only Section：`从组会说起`、`编辑器`。

## 交付文件

- `Exports\deck.pdf` — 22 页，PDF report `complete: true`，无诊断。
- `Exports\deck.pptx` — 22 页，PPTX report `complete: true`，仅 `FONT_FILES_NOT_EMBEDDED` advisory。
- 导出对应 manifest `sha256:eda1ef98...`、metadata `sha256:7977f54f...`。
- `SEMANTIC-CORRESPONDENCE.zh-CN.md` — 中英语义对应、实际纠正与有意的地方化差异。
- `README.md` — 页面结构、导出、检查、限制和主要回执。

## 实际检查

- 22 页逐页 render 复核；design audit **22 页 0 findings**（`maxTitle=34`、`maxBody=22`）。
- 最终 project Story、两个 Section、完整版 22 页 / 短版 12 页均已重新写入。
- 普通散文/列表不再拆成重复“标签/说明”文本框；真实二维关系才用原生表格。
- 没有查看或仿制 Claude 的美术；英文对照只读了当前 DeepSeek EN 及其语义 JSON。
- 没有修改英文项目、插件代码、AGENTS、权限或其他 edition。

## 关于你问的插件 / 协作

- 这轮实际使用的是 0.19.0 官方 headless bundle；技能、`AGENTS.md`、preview/apply 链路都读到了。插件能提供工具和 guidance，但**不能保证模型一定遵守**；上一版“太 story”和 XZJN 碎片，本质是作者执行问题，不是 writer 缺少 CAS。
- 当前连接/Activity 是**声明和已保存回执**，不是实时在线状态、章节锁或调度器。
- 多助手“分章节/分页面同时改”可行；**同页与共享元数据会冲突**。这不是我替产品补的承诺，第 19 页已按实际边界写清。
- 文件夹/.pptd 双入口在 0.19 已可用；`.huandeng` 只是可选目录名。DSH/CC 插件本身的升级不在这次 deck 任务内，应该是另一个明确 scope 的代码任务。

## 仍未完成

- 本轮没有做 Office 级 PDF/PPTX 视觉检查；请直接打开文件确认 PowerPoint 原生换行。此前 18 页版的 Office 检查不适用于这版。
- 中文版没有单独做 MP4 页和独立 Views 页；浏览/大纲/历史被并入工作区与身份页。
- Claude 中英文不一致不在这个 `deepseek-zh` 任务范围内；这次只保证与当前 DeepSeek EN 的 substantive claims 对应。
- 没有 commit、push，也没有作者审美批准。

主要操作回执：`7598fb22`（产品定义）、`c41d2696`（工作区）、`39bb0759`（页面数据）、`54f68d72`（多助手）、`bc1ad366`（致谢）、`b928a40d`（第一步）、`10221b55`（项目 Story）、`701e58e6` + 7 个删除回执（XZJN）、`19dfc843`/`25458e8e`/`d1261f6e`/`2378ad47`（修改、Story、客户端、科学页）。完整列表在 `README.md`。