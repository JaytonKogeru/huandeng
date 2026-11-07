# HUANDENG Editor — 对照最初 SPEC 的逐项审计

基线：私有仓库 `JaytonKogeru/huandeng` 的 `64c9e7b`，THUG 实际 v0.3 安装包及原始完整 `docs/SPEC.md`。本文件区分已有基础、本轮补齐与明确后续；运行结果集中记录于 [RELEASE-V04](RELEASE-V04.md)。

## 审计结论

保留既有 OpenSlide/React/Electron + PPTD 架构。原位保存、唯一 writer、CAS、幂等、操作日志、Undo/Redo、外部文件监听和 Agent 接口已经有实现与回归。v0.3 主要缺口是科学对象从插入到编辑再到原生导出的完整链路、项目级叙事组织，以及真正可携带且不泛滥的页面版本。

“v0.3 未正式安装”不准确：THUG 已有 HUANDENG Editor.exe，桌面/开始菜单均指向正确路径。原始 SPEC 是 Master Product Specification；v0.2、v0.3 只描述阶段变更。原 SPEC 明确不要求主观去 AI 风格评分，也没有承诺完整 PowerPoint 克隆。

## 逐章对应

| SPEC 章节 | 基线情况 | 本轮处理与验收入口 |
| --- | --- | --- |
| §0 立项决议 | 选定架构已实现，可写链路贯通 | 所有新增对象/编排继续经同一服务与PPTD源 |
| §1 基础、范围、复用 | OpenSlide分支、MIT、monorepo、锁文件具备 | 复用KaTeX/ECharts/FA/PptxGenJS；保留许可；不升级无关工具链 |
| §2 权威文件与永久身份 | 独立.page、UUID、短码、tombstone | 稳定S别名；Main唯一、Presentation只存引用；旧ID不迁移 |
| §3 Codec/坐标/渲染 | 无损patch、缩放/IME/普通对象具备；科学对象不足 | 科学渲染/属性、嵌套组、素材导入；codec/store回归 |
| §4 OpenSlide接入 | PPTD独立route和服务、原TSX模式保留 | 不增加第二个保存源；完整core build与继承测试 |
| §5 唯一服务/Agent | CLI/MCP/GUI共用writer、loopback认证 | 项目模型、Presentation解析、命名版本记录；上下文含S编号/project |
| §6 revision/幂等 | page/manifest/metadata CAS、requestId具备 | 项目编排、版本记录/恢复遵循相同边界；旧请求拒绝 |
| §7 保存/恢复/Undo/Git | 安全保存与日志具备；页历史依赖本机、媒体未固定 | 自动保存/Undo/命名版本分离；素材归档随项目携带；Git独立 |
| §8 实时更新 | 外部文件刷新、SSE、脏草稿保护具备 | 编排草稿CAS；科学数据编辑不覆盖外部更新 |
| §9 recipe/人工调整 | 三个布局起点、override/reset具备 | 保留人工几何和删除状态；任意注册组件仍为后续 |
| §10 Story/科学设计 | 逐页目的/保留约束/来源/角色/评审 | Main/Section/Presentation Story；草稿保护；评审绑定实际渲染revision |
| §11 导出 | PNG/PDF与基础原生PPTX；科学保真不足 | 原生表格/OMML/基础图表/连续组；冻结素材与重复引用；实际Office验收 |
| §12 工程模块 | 核心模块已存在 | 增量project-model、presentation-snapshot、page-checkpoints、科学渲染/导出 |
| §13 施工顺序 | M1–M5基础已交付 | 保存/身份→科学编辑→Story/版本→导出→桌面包；不重写架构 |
| §14 关键检查 | 大部分有既有回归 | 下表逐项对应并加入Windows/PowerPoint证据 |
| §15 实施说明 | 部分文档阶段状态脱节 | 更新README/WEBCHAT/交付说明，指向Master与v0.4 |
| §16 来源与状态 | 上游和旧编辑器记录保留 | PowerPoint官方资料、第三方许可、可复现验收脚本 |

## 原始关键验收对应

| 检查 | 证据及重点 |
| --- | --- |
| T01 无损no-op/未知字段/注释/BOM/CRLF | codec/store回归；checkpoint创建不改source |
| T02 局部写入 | store/science/checkpoint测试与其他页hash |
| T03 身份稳定 | identity回归；S别名重排/删除/恢复；引用pageId |
| T04 复制与引用 | 页面/对象复制重映射嵌套组，媒体共享 |
| T05 幂等 | transaction/checkpoint重试；改变内容重用ID拒绝 |
| T06 版本前提 | page/metadata/manifest CAS；编排与恢复冲突 |
| T07 坐标/缩放 | 画布测试、组变换集成、Windows实际操作 |
| T08 中文/富文本 | 既有IME/client测试与桌面中文编辑 |
| T09 外部更新/草稿冲突 | document-client/store/watcher；桌面Agent更新 |
| T10 保存中断 | 既有persistence故障恢复；保护第三方改动 |
| T11 scoped Undo | journal回归；组删除/解组/复制撤销 |
| T12 recipe人工覆盖 | recipe/component回归；不替换其数据模型 |
| T13 原生/回退诚实 | export回归、逐对象报告、PowerPoint打开/截图 |
| T14 预览导出不改源/TSX | projection副本测试、源hash、core测试/build |

## 核心与后续差异

本阶段验收闭环：打开/新建项目→积累Main→组织Sections→复用多个Presentation→编辑科学对象→保存→记录页面版本→安全恢复→放映与导出。

PowerPoint在高级统计图、母版/SmartArt/OLE、动画音视频、双屏排练、无障碍、云端共同编辑和PPTX往返上更广。HUANDENG的价值是页面源与项目目录清楚、Agent共用事务、科学意图可追溯、同一素材库组织多场演讲，以及独立命名页面版本。详见 [PowerPoint矩阵](POWERPOINT-COMPARISON.md)。
