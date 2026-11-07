# HUANDING Editor v0.2 — 桌面与单页演进

日期：2026-11-07（Australia/Sydney）。本文件是当前实施合同，优先于 SPEC.md 中 v0.1 的阶段安排。

实施状态：本轮条目已完成。最终 Windows 分发包的六条核心流程通过；详情见 [IMPLEMENTATION-V02.md](IMPLEMENTATION-V02.md)。

## 1. 产品与入口

采用用户最新明确拼写 **HUANDING**。产品称 HUANDING Editor，意图层称 HUANDING Story，外部 Agent 接口称 HUANDING Plugin。已有 Huandeng 目录、`.huandeng` 元数据与旧 CLI/MCP 名称保留兼容，不迁移用户项目。

正常入口是 Electron 独立桌面窗口，复用现有 React 编辑器和本机 DocumentService。外部 Claude Code、Codex、ChatGPT 连接同一 writer。编辑器不加入聊天框、模型选择或 API Key 管理。

- 原生文件选择器打开 `.pptd`；新建项目创建 manifest 与独立空白 `.page`。
- 无参数启动显示最近项目或打开/新建入口，不自动打开三页示例。
- 原生窗口没有浏览器地址栏；提供当前项目/文件的系统文件管理器入口。
- 桌面关闭只清理自己启动的服务；复用已有服务时不擅自关闭它。
- CLI 开发服务仍可运行，浏览器不是产品默认启动方式。

## 2. 文件、图层与布局起点

每页继续独立保存到 `.page`；顺序只存于 `deck.pptd`，稳定 UUID 与四位短码不随页序和标题改变。

项目树展示真实 manifest、pages、media、`.huandeng/project.json`、Exports 及相关文件。页面文件与缩略图互相对应。依赖、缓存和 Git 对象库不作为内容展开。保留现有图层、自由几何和对象编辑。

recipe 的界面名称改为可选的“布局起点”。生成后仍是普通 PPTD 对象，可自由移动、删改、换图；保存与软件升级不会自动重排。已有覆盖标记保护手动调整，用户可解除布局关联而保留对象。

## 3. 单页历史

右键缩略图 → 页面历史 → 选择版本 → 只读预览 → 恢复此版本。

列表最新在前，显示时间、修改者、摘要、版本标识与当前状态。保存初始状态、编辑器/Agent 提交和观察到的外部修改；跨重启保留。复用事务 before/after 数据，不复制整份 deck。

恢复是新事务，以当前 pageRevision 为前提，恢复该页原内容与可恢复的该页意图/组件元数据。保留身份、路径、页序、其他页和无关 metadata。元数据实际变更时检查 metadataRevision。与普通撤销共用事务和保存机制；不执行 Git reset。

历史预览使用当前项目媒体；本轮不归档所有历史二进制。界面明确显示这个边界。已删除页通过原页面恢复入口恢复身份和位置；本机版本记录与 Git checkpoint 是不同用途。

| 接口 | 用途 |
| --- | --- |
| `GET /__pptd/project` | 项目树与页面映射 |
| `GET /__pptd/pages/:pageId/versions` | 单页版本列表 |
| `GET /__pptd/pages/:pageId/versions/:versionId` | 历史页面快照 |
| `POST /__pptd/pages/:pageId/restore` | 恢复指定版本 |
| `POST /__pptd/frame` | 外部 Agent 记录本页工作意图 |

同时提供 `page.version.restore` 事务操作，GUI/CLI/MCP 使用相同语义。

## 4. Agent 维护的 HUANDING Story

用户在外部 Agent 里描述需求。Agent 读当前页与已有 Frame，记录需求摘要与保留约束，再执行修改、检查渲染。Frame 默认只读展示；用户可纠正，日常不要求手动填表。

`designIntent` 保留 `purpose`、`keep`，增加可选 `requestedChange`、`actor`、`recordedAt`、`source`。Agent 的记录表示它对需求的理解，不代表用户批准。既有作者评审记录保持独立。

提供专门 Frame 写入工具，通过 metadata.patch 与 metadataRevision 保存，保留未知字段。既有 apply 仍能直接使用；不假装强制所有文件写入都遵守该工作流。

## 5. 实施边界与验收

| 工作包 | 代码 | 验收 |
| --- | --- | --- |
| 桌面宿主 | packages/desktop、启动/打包脚本 | Windows 原生窗口，打开/新建/最近项目与服务生命周期 |
| 历史服务 | store、persistence、types | 任意旧版预览/恢复、重启保留、其他页不变 |
| 编辑界面 | PPTD components 与 route | 项目树、缩略图右键、历史预览、Frame、可选布局 |
| 接口集成 | HTTP、CLI、MCP | 外部 Agent 记录意图并修改，桌面实时显示 |

对照旧 PPTD Editor 的实际源码查缺，优先完成上述日常工作流。高级表格/图表专用编辑、注册科学组件、动画按后续真实需求推进，不宣称本轮已经完整覆盖。

只新增核心历史行为的少量测试，执行相关类型/格式检查与一次真实桌面编辑流程。继承上游的测试保留，不每次全跑，不为每个按钮或假想安全情景重复写测试。代码与真实验证结果记录在 IMPLEMENTATION-V02.md；未完成项如实写入交接。
