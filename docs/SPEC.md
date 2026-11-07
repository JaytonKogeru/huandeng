# HUANDENG Editor — OpenSlide × PPTD 实施规格

**日期：2026-11-07（Australia/Sydney）**  
**角色：Master Product Specification。** 本文保存整个产品的架构、文件格式、编辑、安全、Story、导出与验收要求。

**阶段交付：[SPEC-V02.md](SPEC-V02.md)、[SPEC-V03.md](SPEC-V03.md)、[SPEC-V04.md](SPEC-V04.md)。** 阶段规格只细化对应升级，不替代完整产品规划。逐项核对见 [AUDIT-V04.md](AUDIT-V04.md)，实际发布结果见对应 RELEASE/HANDOFF。

**当前产品名称：HUANDENG Editor / HUANDENG Story / HUANDENG Plugin。**

v0.2 交付独立桌面窗口、项目文件树、单页版本浏览与恢复，以及外部 Agent 维护的意图面板。编辑器内不加入 AI 聊天框；布局起点是可选的生成辅助。沿用已有 Huandeng 路径及协议标识以保持兼容。实际验证结果见 IMPLEMENTATION-V02.md。

## 0. 立项决议

以 **OpenSlide（open-slide.dev / open-slide/open-slide）为编辑器基础**，开发支持现有 PPTD 的 Huandeng Editor。

- **PPTD**：唯一持久化主文档，保留 deck.pptd、独立 .page 和原媒体。
- **React / OpenSlide**：主要渲染与交互前端，复用画布、Inspector、文字编辑、缩略图、演示及导出基础。
- **Huandeng Story**：科学叙事、证据、作者设计意图和评审。
- **DocumentService**：GUI、CLI、MCP 共用的本地写入服务。
- **Slidit**：保留已有原生代码；本轮不同时建设第二套 GPUI 前端。
- 不开展候选产品 benchmark，直接实现已选路线，功能检查随实施任务完成。

本 SPEC 取代上一轮研究报告中“多项目对照后再定路线”的推进建议。

### 目标体验

用户打开长期维护的 deck，告诉 Agent：

> 修改 K7M2 的图注，保留两张图的位置；在它后面增加两页，再把 K7M2 移到 Q9R4 后面。

系统通过稳定身份局部修改，编辑器及时显示结果，保存回同一个项目，记录修改历史；重排后仍可用 K7M2 指代该页。导出更新当前交付文件，不产生另一套活动主 deck。

**第一项工程交付必须贯通：打开 PPTD → 选中 elementId → 拖动或改字 → 保存原 .page → Agent 与 GUI 读到同一状态。**解析器和只读预览不单独作为终点。

## 1. 基础、范围与复用

### 1.1 固定基线

- 仓库：https://github.com/open-slide/open-slide
- 起点 commit：**327dd09bcd530eb97647fc33fa67e99f8137d860**
- 对应已审阅 core 版本：**2.3.1**；许可证：MIT。
- 保留上游 monorepo、依赖锁文件与工具链，首轮不顺手升级所有依赖。
- 代码目录固定为 **D:/_Proj/Huandeng**；当前独立 HUANDENG 仓库与 origin/upstream 发布规则见 [README](../README.md)。
- 科研 deck 留在其原项目目录。编辑器可打开指定 PPTD，不要求复制进 OpenSlide 示例工程。

OpenSlide 已有编辑与源码写回；本项目新增 PPTD backend，把 PPTD 模式的修改落到对象和页面文件。[R1][R2]

### 1.2 其他项目的借鉴范围

| 来源 | 借鉴内容 | 本项目落点 |
| --- | --- | --- |
| OpenSlide | 编辑、演示与导出 | 唯一编辑器代码基础 |
| PPTist | 自由几何、对象属性、图层操作 | PPTD 属性映射，不引入另一套画布 |
| OpenSlides Studio | 显式 ID、统一操作、可编辑边界 | DOM 身份绑定、组件编辑范围 |
| Slidev | 本地工具与原文件协作 | CLI/MCP 共用服务 |
| OPF | 版本前提、补丁、反向修改、明确冲突 | typed commands、CAS 与 Undo；不采用整套 OPF 内容格式 |
| Penpot / Figma | 稳定对象、选中上下文与组件覆盖 | 对象身份、选择与人工意图 |
| Canva | 明确的编辑批次 | 一次动作对应事务和撤销单元 |

这些是设计借鉴，首版不把所有产品变成运行依赖。

### 1.3 v0.1 必须交付

- 现有 PPTD 读取、未知数据保留、原位保存。
- 稳定 deck/page ID、四位短码、既有 elementId。
- 文本、图片、基本形状和线条的自由编辑。
- 拖动、尺寸、旋转、图层、多选移动、对齐、基础富文本与裁切。
- 页面新增、复制、移动、移除、恢复和备注。
- GUI、CLI、MCP 的共同写入口、按页版本保护和幂等请求。
- 保存恢复、Undo/Redo、实时更新、外部文件观察。
- 演示视图、PDF、基础可编辑 PPTX 与回退说明。
- 少量设计注记、科学来源保留，以及三个固定槽位 recipe。
- 本地操作历史；独立、显式的 Git checkpoint。

后续版本按实际需求增加更完整的表格/图表、注册 React 科学组件与动画。首版不做任意 TSX 与 PPTD 双向转换、CRDT、全功能 PPTX 往返或两套前端同步开发。

## 2. 权威文件与永久身份

### 2.1 文件职责

| 路径 | 职责 |
| --- | --- |
| deck.pptd | 现有全局字段与 pages 顺序 |
| pages/*.page | 页面对象、几何、文字、备注等原内容 |
| media/、assets/ | 现有原始素材 |
| Story/ | 沿用现有科学叙事管理 |
| .huandeng/project.json | 身份、注记、角色、组件绑定；v0.4 增加 Main Story、Sections 与 Presentation 引用 |
| .huandeng/checkpoints/ | 用户明确记录的命名页面版本；随项目目录携带 |
| media/.huandeng-versions/ | 命名版本引用的原始素材，按内容散列去重 |
| Exports/ | 当前交付文件与导出说明 |
| 本机应用数据目录 Huandeng/<deckId>/ | writer 锁、恢复日志、操作历史、缓存与发现信息 |

锁、缓存和日志放在本机应用数据目录，避免同步到 OneDrive。它们不构成另一份当前文档。

**Main Slides 页面顺序仅来自 deck.pptd 的 pages 数组。元素叠放顺序仅来自 .page 的 elements 数组。**不复制第二套 Main order 或 zIndex。[R3] v0.4 的 Section 与 Presentation 保存用途不同的稳定页面引用序列；它们不复制或改写规范页面内容。

### 2.2 元数据格式

原 Page schema 没有永久 pageId，首版通过 sidecar 扩展，不向所有旧页面注入新必需字段。

```json
{
  "schemaVersion": 1,
  "deckId": "92ed841d-6ec6-4afc-ad41-fb2c1c31796b",
  "entry": "deck.pptd",
  "designPolicy": "huandeng-human-scientific-v1",
  "slides": {
    "7f08ca5e-041d-4c43-88ef-88783fa76ab8": {
      "shortCode": "K7M2",
      "path": "pages/005.page",
      "state": "active",
      "designIntent": {
        "purpose": "比较两组证据",
        "keep": ["保留原图比例", "保留左密右疏的构图"]
      },
      "elementRoles": {
        "figure-main": "evidence",
        "caption-main": "caption"
      },
      "components": {},
      "lastAuthorReview": null
    }
  }
}
```

示例 UUID 不代表真实项目身份。非组件对象的普通内容修改只写对应 .page；身份、注记或组件绑定变化才写 sidecar。修改 recipe 管理的字段、删除槽位对象以及 recipe apply/reset，同时更新页面与组件元数据，必须是一笔事务和一个撤销单元。作者评审绑定特定 renderRevision，过期状态由版本比较得出，不在每次改字时重写 metadata。

### 2.3 身份规则

- 内部 deckId/pageId 使用 UUID；完整地址是 deckId + pageId。
- shortCode 默认四位，使用不易混淆的字符，库内不区分大小写查重；兼容已有四至六位代码。
- v0.4 增加稳定的 S1、S2 等用户别名；重排不改号，删除后不复用。它与当前位置的显示页码分开，不替换既有 UUID 和短码。
- 保留原 elementId；元素地址包含 pageId。
- 移动、改标题、修改内容均不改变身份或文件名。
- 旧文件 005.page 不因插页而重新编号；新页可用 pages/K7M2.page。
- 复制页面生成新的 pageId、短码和子元素 ID，重建内部绑定，复用媒体。
- Main manifest 不重复引用同一 .page 路径；需要独立内容时使用复制操作。v0.4 的 Presentation 通过 pageId 引用共享页面，允许重复出现，不复制规范页面。
- 移除页面从 pages 去掉引用，metadata 标记 tombstone，保留源文件支持恢复；短码不复用。
- 外部改名使用显式 relink 命令重建绑定，不按标题或相似内容猜身份。
- React key、草稿、深链接、评论和当前选中页使用持久 ID，页码仅用于显示。

首次建立可写管理会话时只创建身份索引，不批量重存或重命名旧页面。只读打开、预览和 inspect 不落盘索引；尚未初始化的只读项目明确标记身份未持久化，不发布虚假的永久短码。只读目录可预览，但不能显示保存成功。

## 3. Codec、坐标与 React 渲染

### 3.1 有限、可靠的 YAML 修改

使用 **yaml@2 的 Document/CST 能力**建立 codec，保留原 bytes、节点和源范围。[R12] 该库提供基础能力，局部保真由本项目实现保证：

1. 按 elementId 定位节点，再修改指定字段。
2. no-op 不落盘；未修改文件 byte-identical。
3. 目标范围外保留未知字段、注释、顺序、CRLF/BOM。
4. 新增/删除只重写必要集合，不顺带格式化整套 deck。
5. 不从只读渲染模型反向 dump 整份 YAML。
6. 未识别元素按 opaque 数据保留；渲染缺口不造成保存丢失。
7. 无法可靠修改的别名、merge key 或特殊 tag 返回 UNSUPPORTED_SOURCE_EDIT，不隐式展开。
8. 候选 bytes 重新解析并检查预期变更范围，才进入保存。
9. 源范围按解析器的字符串索引单位处理，不把 UTF-16 索引误作 UTF-8 字节偏移；显式保留 UTF-8 BOM 与换行形式。

### 3.2 使用实际字段

| 行为 | 原格式字段 |
| --- | --- |
| 对象身份 | elementId |
| 类型 | elementType |
| 位置和尺寸 | bounds: [x, y, width, height] |
| 旋转 | 对相应元素类型适用的 rotation |
| 文字 | content.text |
| 样式 | content 字段及主题引用 |
| 备注 | notes |
| 图层 | elements 数组顺序 |

图片裁切、形状路径、富文本与样式优先级按实际 PPTD profile 解释，不能用一个看起来相似的 CSS 属性代替格式语义。[R3]

### 3.3 坐标契约

- PPTD 保留自己的逻辑尺寸；参考 profile 默认演示尺寸为 960×540，并约定逻辑 px 对应导出的 pt。[R3]
- OpenSlide 原生画布为 1920×1080。[R1] 新增 CanvasMetrics，使 PPTD 模式按源尺寸工作；不通过修改全局常量让既有 TSX 页一起变尺寸。
- 屏幕缩放只影响显示；手势经逆变换得到源坐标。
- 不按缩放倍率反复舍入，不因浏览器窗口大小改 bounds。
- 原生 PPTX 导出遵守该 profile 单位，例如 pt/72 转英寸；不能把所有值套成浏览器 96 dpi。
- 保留原字体、上下标和行距；缺失字体给出诊断，不偷偷改写字段。
- 打开、选择、缩放、预览或导出均不触发自动重排和源文件保存。

### 3.4 DOM 身份

每个 PPTD 元素的外框渲染 data-hd-page、data-hd-element。span、SVG path 等内部点击向上解析到最近的元素外框。

```tsx
<ElementFrame
  data-hd-page={pageId}
  data-hd-element={element.elementId}
  bounds={element.bounds}
>
  {renderPptdContent(element)}
</ElementFrame>
```

这是拟实现的接口。React key 只服务组件复用，不能替代持久 ID。

可以通过虚拟模块或组件工厂把 PPTD 页接进现有播放器，但不生成供用户独立编辑的第二套 TSX 主源。

## 4. OpenSlide 后端接入

### 4.1 一个窄接口

```ts
interface DocumentBackend {
  kind: "tsx" | "pptd";
  getSnapshot(): Promise<DeckSnapshot>;
  readPage(pageId: string): Promise<PageSnapshot>;
  resolveSelection(target: Element): ElementRef | null;
  commit(request: TransactionRequest): Promise<TransactionResult>;
  undo(operationId: string): Promise<TransactionResult>;
  redo(operationId: string): Promise<TransactionResult>;
  subscribe(listener: (event: DocumentEvent) => void): () => void;
}
```

这是新增接口，不是宣称上游已有此插件机制。

TsxBackend 包装原路径；PptdBackend 调用同一 DocumentService。Inspector 的交互、属性面板和拖动辅助尽量保留，源码定位、写回和历史经 backend 分流。

**PPTD 对象不能伪装为共享 renderer.tsx 的某一行 JSX。**那会让一次编辑误改所有由它渲染的页面。

### 4.2 操作过程

1. 选中得到 pageId + elementId。
2. 面板读取对象属性和继承样式。
3. 手势过程中更新本地 preview。
4. pointerup 提交一次 bounds 修改。
5. 文字草稿以 pageRevision 为基线；中文 composition 期间不提交。
6. 服务确认后更新 committed snapshot 和历史。
7. 失败保留草稿，不能提前显示“已保存”。

默认拖动结束即保存；文字在 compositionend 后、空闲约 700 ms 或失焦时提交；Ctrl-S 立即 flush。

保存确认必须对应发出的那个 snapshot，不能清空请求发出后用户继续输入的新文字。

PPTD 模式同时分流所有会写 TSX/CSS 的快捷键、设计面板和源文件入口。首版未实现的全局设计编辑显示为不可用；不能让通用按钮绕过 backend 去改共享样式。

### 4.3 页面与 UI

- Page[] 和 notes[] 可作为播放器的内存投影；权威仍在 PPTD。
- 上游路由中的 slideId 指 deck 标识，适配边界命名为 deckSlug；本项目 pageId 才是单页永久身份，两者不得混用。
- 当前页面以 pageId 保存；重排后保持对象和视图。
- 备注写回该页 notes，不按旧页码更新数组。
- 缩略图以 pageId 缓存、renderRevision 失效。
- 侧栏显示“页码 · 短码 · 标题预览”，可复制短码。
- 评论绑定 pageId/elementId；PPTD 模式不插入 TSX 注释。
- 源信息区显示 .page 路径与对象 ID，不要求用户理解共享 React renderer。

### 4.4 上游接入落点

已审阅的基线代码与其直接引用确认了以下模块；修改方式属于本项目计划。

| 位置（相对 packages/core/src） | 改造 |
| --- | --- |
| app/routes/slide.tsx | backend 选择、页面、备注、选择与导出编排 |
| app/lib/sdk.ts | 保留 TSX 类型，加入独立 PPTD descriptor |
| app/lib/use-slide-module.ts | 新 loader 包装或 PPTD 装载分支 |
| app/components/inspector/inspector-provider.tsx | 选择身份与能力按 backend 分流 |
| app/components/inspector/inline-text-editor.tsx | content.text 草稿、输入与冲突 |
| app/components/inspector/inspect-overlay.tsx | 复用交互，采用 CanvasMetrics |
| app/components/inspector/save-bar.tsx | PPTD 保存状态和 flush |
| app/components/history-provider.tsx | PPTD 操作历史，不重放 JSX edits |
| app/lib/inspector/fiber.ts | 将依赖 data-slide-loc 的定位分流为 PPTD 的 pageId/elementId |
| app/lib/inspector/use-visual-editor.ts | 复用手势和 DOM 预览，将最终 CSS 操作转换为 bounds 等 PPTD 语义 |
| app/lib/inspector/use-editor.ts | PPTD 模式提交到 backend，避免进入 Babel 源码改写 |
| app/lib/inspector/use-notes.ts | 备注按 pageId 写入，再投影为播放器所需数组 |
| app/components/slide-canvas.tsx、app/lib/pptx/render.ts | 消除 PPTD 路径中的固定 1920×1080 假设；统一屏幕与导出尺寸 |
| vite/api-plugin.ts、vite/routes/context.ts | 注册本地 PPTD service、API 和项目会话 |
| vite/open-slide-plugin.ts | 装载 PPTD 快照与数据变更，保留代码 HMR |
| vite/routes/edit.ts | 保留 TSX 路径；PPTD 禁止落入源码 patch |
| app/lib/export-pptx.ts | 复用导出编排，接入尺寸和对象映射 |

通过类型约束和统一入口找出漏接路径，避免在各按钮中复制另一套保存逻辑。

上游 Inspector 的缓存与选择依赖 JSX 行列，现有 HistoryProvider 主要保存同步草稿闭包且按 pageIndex 导航。未提交手势可以沿用本地草稿撤销；已提交修改必须使用 backend 的逆命令、操作记录与版本检查，不能把现有草稿栈当成文档历史。

## 5. 唯一本地服务与 Agent 接口

### 5.1 运行方式

复用 OpenSlide 的 Node/Vite 本地进程承载 DocumentService。同一规范化项目路径只有一个 writer；其他浏览器、CLI、MCP 连接既有服务。

- writer 使用随进程释放的本机排他锁，PID/端口/nonce 用于发现；不能只因心跳过期就抢占仍活着的服务。
- 锁和本地状态放应用数据目录，不进入同步项目。
- Windows 路径规范化处理大小写、realpath 和 junction，防止同一项目被当成两个路径。
- 页面 API 只访问已打开项目范围，媒体路径不可跨出根目录。
- 默认监听回环地址，验证会话和请求来源。
- 静态 HTML 是展示产物，不包含写文件接口。
- 网页 ChatGPT 沿用现有 DC-WALT 通道调用本地 CLI；不另建公共服务或网络隧道。

### 5.2 新增 HTTP 契约

| 接口 | 用途 |
| --- | --- |
| GET /__pptd/session | 身份、尺寸、顺序、能力与版本 |
| GET /__pptd/pages/:pageId | 页面、元素、意图与 revision |
| POST /__pptd/transactions | 唯一内容写入口 |
| GET /__pptd/events | 提交后的 SSE 事件 |
| POST /__pptd/render | 指定版本的预览、对象框和诊断 |
| POST /__pptd/export | 固定快照的交付文件 |
| GET /__pptd/history | 操作历史 |

### 5.3 CLI/MCP

以下是实施时确定的 CLI 拼写；运行方式和实际验证见 README.md、IMPLEMENTATION.md：

```text
huandeng open <absolute-path-to-deck.pptd>
huandeng --entry <path> inspect K7M2
huandeng --entry <path> apply <transaction.json>
huandeng --entry <path> render K7M2
huandeng --entry <path> export pptx
huandeng --entry <path> checkpoint <message>
```

MCP 首版只包装 deck_context、slide_read、selection_read、transaction_apply、slide_render、history_read、history_revert、deck_export。stdio MCP 不另外直写文件，它连接/启动同一个 writer。

模型不参与文档语义。Agent 只需读取工具返回的对象与版本，并提交明确操作。

## 6. 命令、revision 与幂等

### 6.1 操作集

| 操作 | 语义 |
| --- | --- |
| element.add / patch / remove | 新增、修改指定字段、移除对象 |
| element.reorder | 通过 ID 调整叠放顺序 |
| page.notes.set | 修改该页备注 |
| page.add / duplicate | 新建独立页、复制并重建身份 |
| page.move | 通过 pageId 和相邻 pageId 调整顺序 |
| page.remove / restore | 移出/恢复演示顺序 |
| metadata.patch | 修改允许的注记、角色和组件绑定 |
| recipe.apply / reset | 显式更新参数布局或重置覆盖 |
| history.revert | 基于当前版本执行逆修改 |

patch 只改显式字段，未提供的内容保持。elementId 不允许通过 patch 改写；类型转换使用明确操作。新增/删除要验证内部引用。首版不提供默认的“重生成整套 deck 后覆盖”路径。

### 6.2 请求示例

```json
{
  "requestId": "97ec5ba2-3a68-428d-9590-542952062606",
  "deckId": "92ed841d-6ec6-4afc-ad41-fb2c1c31796b",
  "actor": "chatgpt-session-a",
  "expected": {
    "pages": {
      "7f08ca5e-041d-4c43-88ef-88783fa76ab8": "sha256:<page-bytes-hash>"
    }
  },
  "operations": [
    {
      "op": "element.patch",
      "pageId": "7f08ca5e-041d-4c43-88ef-88783fa76ab8",
      "elementId": "caption-main",
      "set": { "content.text": "更新后的图注" }
    }
  ]
}
```

ID 和 hash 是示例。服务根据 operations 推导必要读写集合；缺失前提不能静默跳过。

- 非组件对象的普通单页修改：目标 pageRevision。
- recipe 管理字段、槽位删除和 apply/reset：同时要求 pageRevision 与 metadataRevision，内容与覆盖标记共同提交。
- 页序变化：manifestRevision。
- 身份或注记变化：metadataRevision。
- 新增、复制、移除：涉及的页面、manifest 和 metadata 前提。
- 依赖全局尺寸/主题的布局：额外携带相关 manifest 前提。

不同页面不因一个全局内容计数器互相阻塞。

### 6.3 revision

- pageRevision = SHA-256(.page 原始 bytes)。
- manifestRevision = SHA-256(.pptd 原始 bytes)。
- metadataRevision = SHA-256(project.json bytes)。
- renderRevision = 页面、相关主题/媒体、渲染器版本及字体解析结果的输入指纹。

hash 不写回正文，不代替永久 ID。外部修改注释也使旧 pageRevision 过期，这是首版清楚且保守的契约。

### 6.4 请求结果

同 requestId、同 payload 重试返回原结果，不重复插入页面；同 ID 换 payload 返回 REQUEST_ID_REUSE。提交收据持久化，服务恢复后仍可识别已完成请求。

成功结果包括 operationId、newRevisions、changedPages、changedElements、skippedOverrides、diagnostics。新增页面返回正式 ID 和短码。

错误至少包含 REVISION_CONFLICT、TARGET_NOT_FOUND、AMBIGUOUS_ID、INVALID_DOCUMENT、UNSUPPORTED_SOURCE_EDIT、SAVE_FAILED、PENDING_RECOVERY、RECOVERY_REQUIRED、UNDO_CONFLICT。冲突返回当前版本和重新读取入口，不提供绕过 CAS 的通用 force=true。

## 7. 保存、恢复、Undo 与 Git

### 7.1 事务流水线

全部写入进入单一短队列：

1. 查幂等收据。
2. 重读相关原文件，校验所有必要 hash。
3. 在内存应用整批操作，验证结构、ID、资源引用。
4. 生成目标文件的新 bytes 和逆修改。
5. 写入并 flush 恢复 journal，记录 writeSet、before/after hash 与恢复所需数据。
6. 在目标同卷准备完整临时文件，再逐一替换。
7. 验证目标 after hash，持久化历史和提交收据。
8. 切换服务快照并广播成功。

单文件可以原子替换；多文件使用 journal 恢复，不能声称逐次 rename 等于文件系统级多文件原子事务。服务在完成前只暴露上一份完整快照，完成后一次切换。

新增页安装顺序为新页面/资源、metadata、manifest。移除只做解除引用和 tombstone，首版不在普通删除过程中永久清理原文件。

### 7.2 恢复规则

- 已有 committed 收据：不重复应用，清理恢复材料并重新扫描实际状态。
- durable journal 已接受但未 committed，所有目标均是记录的 before 或 after：确定性 roll forward。
- 任一目标既非 before 也非 after：保留现场，进入 RECOVERY_REQUIRED，不覆盖第三方内容。
- 无 journal 的随机临时文件不作为恢复依据。
- 恢复完成前不开启新写入。

一旦 durable journal 接受了事务，后续 I/O 异常可能需要继续恢复；不能错误地报告“完全未改”。UI 保留草稿并显示待恢复状态。

Windows 替换遇到占用可有限重试；不得 unlink 原文件后再尝试 rename。错误后核查实际 hash，不假定异常表示原文件未变。首版提供本地进程崩溃恢复，不宣称同步盘、网络盘和突然断电条件下均达到数据库级持久性。

### 7.3 操作历史与 Undo

本地 append-only history 记录 operationId、actor、摘要、read/write set、before/after revision 和正/逆修改；只记录目标内容，不为每次编辑复制整套 deck 与媒体。

- 一次拖动、文字提交或 Agent 批次是一个 Undo 单元。
- Undo 是新的 CAS 命令，目标版本必须与该操作允许撤销的状态匹配。
- 同页有其他客户端的新修改时建立 undo barrier，不自动重排逆补丁。
- 其他页变更不阻塞本页撤销。
- 组件几何和 override 标记一起撤销。
- 结构操作检查整个 writeSet。
- 恢复旧版本也基于当前 revision 形成新操作，不执行整库 reset。
- 历史末尾的未完整记录可识别隔离；中间损坏不能静默截掉后续历史。

### 7.4 Git checkpoint

普通保存和历史不依赖 Git。v0.4 的命名页面版本也不使用 Git：用户或明确授权的 Agent 主动记录页面、有效主题与本地素材，归档随项目携带；具体记录和恢复规则见 [SPEC-V04 §3](SPEC-V04.md#3-页面身份与页面版本)。下列 Git checkpoint 是另一种工程里程碑操作，只在明确调用时执行：

1. 记录编辑批次开始时的 HEAD 与 clean baseline。
2. 有既有 dirty/staged 内容则 defer，不妨碍编辑保存。
3. 事务累积精确路径 allowlist。
4. checkpoint 前重查 HEAD、index 和外部变化；出现不属于本批次的修改则 defer。
5. 仅提交 allowlist 中的权威文件与明确新增素材。
6. 不提交运行日志、缓存和预览生成物，不使用 add -A、stash、reset、整库 checkout。
7. 不自动 push；Git 失败不回滚已保存的文档。

首版不实现专用 refs、多索引快照或分支合并 UI。

## 8. 实时更新与外部编辑

### 8.1 内容事件

代码仍使用上游 HMR；PPTD 内容通过 SSE 更新 store，不强制浏览器整页刷新。

事件包含 epoch、sequence、operationId、originClientId、changedPages 的 before/after revision，以及 manifest/metadata 是否变化。

- 只在持久化提交后发布。
- watcher 回声按实际 hash 去重。
- sequence 缺口或 epoch 变化时重新取快照。
- 刷新只涉及目标页面与缩略图。
- 保持仍存在的 pageId/elementId 选择、当前缩放和演示位置。

### 8.2 客户端状态

每页区分 committed snapshot、draft + baseRevision、in-flight snapshot、latest remote snapshot。

| 情况 | 行为 |
| --- | --- |
| 本页 clean，收到新版本 | 自动更新 |
| 本页 dirty，收到新版本 | 保留草稿，暂停旧基线 autosave，显示冲突 |
| 其他页变化 | 更新其他页，不碰当前输入 |
| 本次保存确认 | 只确认发出的快照，后续新输入仍是草稿 |
| 断线重连 | 重取状态并保留未提交草稿 |
| 外部 YAML 暂时非法 | 保留最后有效预览并标记过期，不回写旧内容 |

### 8.3 外部直接写文件

复用 Vite watcher 观察页面、manifest、metadata 和资源；短暂合并连续事件，读取成功后采用。保存前重读不因 watcher 存在而省略。

外部改名/缺失资源明确诊断。用户可显式 relink；不能靠标题和相似内容猜身份。

强版本保护覆盖经唯一 writer 的修改。绕过服务的任意同时直写只提供监听、重读与冲突发现，不承诺文件系统并不存在的“按内容 hash 条件替换任意写者”原语。Agent 标准写法是 CLI/MCP。

OneDrive 保持日常文件同步职责；首版不把多机器同时打开同一目录当成分布式协作引擎。

## 9. 参数组件与人工调整

### 9.1 三个固定槽位 recipe

首版只做：

- 原图 + 图注 + 自由注释；
- 两张证据图 + 各自图注；
- 原图 + 局部放大 + 指引线。

创建后均为普通 PPTD 对象，可自由修改。metadata 保存配方版本、参数、槽位绑定和覆盖标记：

```json
{
  "recipe": "figure-with-caption",
  "recipeVersion": 1,
  "params": { "captionGap": 20 },
  "slots": {
    "figure": "figure-main",
    "caption": "caption-main"
  },
  "overrides": { "figure": ["geometry"] }
}
```

实际文字、样式和几何仍只存在 .page。overrides 表示字段归属，不复制另一份实际值。

### 9.2 更新行为

- slots 使用稳定 elementId，不使用当前 child index。
- 用户或 Agent 直接改图形时，同样标记相应 recipe override。
- geometry 以位置、尺寸、旋转为一组；裁切、字体另分组。
- 参数应用只改仍由 recipe 管理的字段，返回跳过的覆盖。
- 一次排版更新不顺便修改科学图和原文。
- 删除槽位对象后记 null，刷新配方不让它复活。
- recipeVersion 固定；软件升级不自动重排页面。
- reset 是明确且可撤销的操作。
- override 只阻止配方覆盖，不阻止用户继续直接编辑。
- 若 recipe 废弃，既有普通对象仍可显示、编辑和导出。

### 9.3 后续的 React 科学组件

注册组件有具体类型、props schema、数据引用和固定版本。画布编辑外框，专用面板编辑参数。优先用标准 image 对象保存静态回退，sidecar 记录组件绑定，使旧 PPTD 仍可显示。

参数修改通过命令同步生成回退产物；预览不自动写回。任意内部 DOM 不自动成为普通可编辑对象，展开能力必须由组件显式实现。

这条扩展保留 React 的科学可视化生态，不要求首版完成任意网页到 PPTD 的反向转换。

## 10. Huandeng Story 与科学设计

沿用原有科学叙事、图板来源、作者陈述与 Agent 推断区分、设计政策及 revision 对应的作者反馈。不合并各 Agent 的原始 Story 历史，不绕过现有正式主 deck 的保护。

每页只保留少量有用信息：

- purpose：科学问题；
- keep：需要保留的构图理由；
- elementRoles：evidence、annotation、caption、title 等；
- 原资产与来源引用；
- 对应 renderRevision 的作者原话与评审。

这些进入 slide_read。默认政策继续采用真实图板优先、按任务变化的密度、短词组/短问题标题、保留比例与图例、必要时有意非对称。编辑器不自动等宽化所有对象。

技术 QA 报告缺图、越界、裁切异常、字体缺失。设计建议应说明对象和内容上的理由；不建立“越凌乱越有人味”的总分。Agent 不能给自己授予作者批准。

## 11. 导出

### 11.1 固定快照与当前交付文件

导出读取完整的已提交快照，记录 deckId 和源版本。默认更新项目已有 Exports 目标，例如 DNA-TT.pptx，不强制每次新建日期目录。

PDF/页面图复用 React 和浏览器渲染。PPTX 复用上游导出编排，增加 PPTD 对象与单位映射。显示用的 DOM 不成为另一个保存源。

### 11.2 编辑性与回退

| 内容 | v0.1 行为 |
| --- | --- |
| 普通文本、基本形状、线条 | 原生可编辑对象 |
| 原始科学图、图片 | 图片对象，保留资产、裁切与几何 |
| 图上独立箭头、标签、说明 | 独立原生对象 |
| 公式与特殊局部内容 | 保留源，按支持情况以 SVG/图片回退 |
| 表格与图表 | 已实现子集原生导出，其余按对象回退 |
| 没有可靠呈现或回退的对象 | 明确定位并阻止宣称完整导出 |

优先对象/对象组回退；整页图片是用户显式选择的展示导出，不作为默认可编辑 PPTX。

每次输出附简短说明：pageId、shortCode、elementId、native/image、回退原因、字体/资源诊断。PPTX 回导不是首版主工作流。

## 12. 新增工程模块

沿用上游 monorepo，在一个本地应用内增加以下模块；不拆成多个独立服务。

| 相对 packages/core/src 的新增位置 | 内容 |
| --- | --- |
| pptd/types.ts | 快照、身份、命令、结果、事件 |
| pptd/codec.ts | YAML 读取与局部 source patch |
| pptd/identity.ts | sidecar、短码、复制与 tombstone |
| pptd/store.ts | 命令、revision、幂等与快照 |
| pptd/persistence.ts | 原位替换、journal、恢复与历史 |
| pptd/recipes.ts | 固定槽位组件及覆盖 |
| vite/routes/pptd.ts | API、资源与 SSE |
| app/lib/document-backend.ts | browser backend 契约 |
| app/lib/pptd-backend.ts | 请求、草稿、选择与事件 |
| app/components/pptd/ | Renderer、CanvasMetrics、元素能力 |
| pptd/cli.ts | JSON CLI |
| pptd/mcp.ts | 同一服务的 MCP 包装 |
| pptd/export.ts | PPTD 对象映射、固定快照与回退说明 |
| 对应 tests/fixtures | 关键数据与使用链路检查 |

名称可随上游风格小幅调整，职责和权威边界保持不变。

## 13. 施工顺序

### M1：第一条可写编辑链路

**依赖：无。**

- 固定上游提交，保留锁文件与许可证，建立 huandeng/pptd 开发分支。
- 建立包含文字、图片、形状的最小 PPTD fixture。
- 实现 codec、身份索引、单页 snapshot 和 element.patch。
- 实现最小 PptdBackend/Renderer，接通 Inspector 选择、拖动和文字提交。
- 写回原 .page，并返回真实新 hash。

**完成行为：**对象可由 ID 定位；拖动/改字改到正确字段；重开仍保留；未改文件 bytes 不变；旧 revision 被拒绝；TSX 示例仍可用。

M1 不是只读 PoC。完成后继续扩展同一条代码路线，不回到候选比较。

### M2：完成日常页面编辑

**依赖：M1。**

- 接入 CanvasMetrics、缩放坐标、中文输入和基础富文本。
- 图片替换/裁切、旋转、多选移动、对齐与图层。
- 页面新增、复制、移动、移除、恢复；备注按身份保存。
- 完成自动保存与明确保存状态。
- 使用用户提到的核酸学习 PPTD 补齐实际出现的普通元素。

实际示例路径由实施时的项目登记定位；不把未知路径编造成真实输入，也不把“18 页”作为硬编码约束。私有科学材料不提交到公开上游。

M1–M2 的写入检查使用专用 fixture；真实材料可只读检查，按需要制作验证 fixture。正式主 deck 的可写接入在 M3 保存保护完成且符合该项目既有授权规则后启用。这是施工数据的边界，正式产品仍按本 SPEC 原位保存。

### M3：可靠保存、实时更新与 Agent

**依赖：M1；交互部分依赖 M2。**

- 单 writer、requestId 幂等、page/manifest/metadata CAS。
- journal、故障恢复、scoped Undo/Redo。
- watcher、SSE、草稿冲突、断线重连。
- CLI/MCP 共用服务；选择上下文包含 ID、版本、对象和设计意图。

**完成行为：**

- 两个 Agent 修改不同页、且不共同修改 manifest/metadata 时分别成功；涉及同一份结构或绑定元数据时按其版本检查处理；
- 同页旧版本的后续写入被拒绝；
- 新增页重试不重复；
- GUI 看见 Agent 修改，Agent 读到 GUI 修改；
- 中断保存能恢复一致状态；
- 外部修改不被旧草稿自动覆盖。

### M4：演示、导出与历史

**依赖：M2、M3。**

- 播放器、备注、演讲者视图接入稳定页面身份。
- PDF、基础原生 PPTX 和回退说明。
- 页面变更摘要、恢复、短码检索与显示。
- 显式 Git checkpoint。
- Windows 上完成实际打开、编辑、保存、重开和导出链路。

**完成行为：**真实图保留；普通文本/注释可编辑；回退可定位；更新已有交付目标；恢复不动无关页面；不新增另一套主 deck。

### M5：科研 recipe 与 Huandeng Story 接续

**依赖：M2、M3；导出检查依赖 M4。**

- 三个固定槽位 recipe。
- override、删除不复活和显式 reset。
- purpose/keep/elementRoles 上下文。
- 来源和真实作者评审接续。
- 给不同 Agent 的简明编辑指引：读版本、按 ID、局部改、检查渲染。

**完成行为：**人工挪过的图经过参数更新仍保持；删掉的图注不复活；改文字不改图形几何；作者确认不沿用到新渲染；软件升级不自动重排旧页。

**M1–M5 构成 v0.1。**注册 React 科学组件、更完整图表和动画作为后续增量加入。

## 14. 关键检查

以下用于确认实现正确，不设置候选排名或审美分数。

| 编号 | 检查 |
| --- | --- |
| T01 | no-op 不改 bytes；未知字段、注释、CRLF/BOM 保留 |
| T02 | patch 只改指定页与字段 |
| T03 | 插页、移位、改标题后身份不变 |
| T04 | 复制页身份独立、引用正确、媒体复用 |
| T05 | 同 requestId 不重复执行 |
| T06 | 过期 page/manifest/metadata 前提被拒绝 |
| T07 | 不同页面尺寸和缩放下坐标正确 |
| T08 | 中文 IME 与富文本不写入半成品 |
| T09 | 外部修改刷新，脏草稿保留并呈现冲突 |
| T10 | 保存中断恢复不覆盖第三方新内容 |
| T11 | Undo 作用范围正确，遇同页新修改有边界 |
| T12 | recipe 保留覆盖，已删槽位不复活 |
| T13 | 原生导出与回退说明符合真实对象 |
| T14 | 预览/导出不改主源，原 TSX 模式保持可用 |

使用上游已有测试工具；针对 CAS、恢复与中文输入增加必要测试。E2E 集中于编辑闭环、实时更新和导出，不为每个按钮重复写镜像测试。

性能实现优先只更新受影响页面和缩略图；媒体按内容复用；普通修改不等待整套 deck 全部渲染。编辑提交后无需用户手工刷新。

## 15. 交给实施 Agent 的启动说明

### 15.1 建立工程

下列命令仅用于代码目录尚不存在的情况；存在时先读取其 AGENTS.md、Git 状态和既有修改，再接续：

```powershell
git clone https://github.com/open-slide/open-slide.git D:/_Proj/Huandeng
git -C D:/_Proj/Huandeng switch -c huandeng/pptd 327dd09bcd530eb97647fc33fa67e99f8137d860
Set-Location D:/_Proj/Huandeng
pnpm install --frozen-lockfile
pnpm dev
```

依赖安装遵守上游 packageManager 和 Node 版本要求；新增 yaml 等依赖时正常更新锁文件，不绕过安装错误。

### 15.2 按顺序执行

1. 阅读本 SPEC、工程 AGENTS.md 与既有 Huandeng Story 约束。
2. 建立固定基线，将本 SPEC 存为项目 docs/SPEC.md。
3. 先完成 M1 的实际写回链路。
4. 继续 M2–M5，每次记录已实现行为和实际验证。
5. 上游耦合通过 backend 接缝处理，保留通用 UI 和交互。
6. 不把原位保存实现为自动复制 deck。
7. 科研正式主文档沿用其既有授权与作者评审；fixture 不冒充正式批准。
8. 阶段完成后继续下一阶段，不重新询问已经定下来的架构选择。
9. 必要的小型技术取舍由实施者决定，不以此重开产品选型。
10. 不擅自创建公共发布或推送私有科研内容。

主要工程量集中在 Inspector 后端接缝、PPTD codec、可靠保存和导出映射。进度按 M1–M5 的完整行为衡量，不用“解析器已写”或“画面能显示”替代可用编辑器。

## 16. 资料与交付状态

本文件保留已批准的工程路线、接口和实施合同。历史 v0.1 实现记录见 IMPLEMENTATION.md；当前 v0.4 的实现对应见 [AUDIT-V04](AUDIT-V04.md)，实际验收、安装与发布状态见 [RELEASE-V04](RELEASE-V04.md) 和 [HANDOFF-V04](HANDOFF-V04.md)。计划要求与实际通过证据分别记录。科研正式源文件未迁移。

### 主要资料

- [R1] OpenSlide 页面模块与画布  
  https://open-slide.dev/docs/reference/slide-meta
- [R2] OpenSlide Inspector  
  https://open-slide.dev/docs/core-feature/inspector
- [R3] 社区 PPTD 参考规范  
  https://github.com/Amonginin/open-kimi-ppt-skill/blob/main/skills/open-kimi-ppt/reference/pptd.md  
  用于格式兼容，不引入其逆向前端，也不采信概括性的无损往返宣传。
- [R4] 固定基线源码  
  https://github.com/open-slide/open-slide/tree/327dd09bcd530eb97647fc33fa67e99f8137d860
- [R5] OpenSlide 导出实现  
  https://github.com/open-slide/open-slide/blob/327dd09bcd530eb97647fc33fa67e99f8137d860/packages/core/src/app/lib/export-pptx.ts
- [R6] OpenSlides Studio 操作模型  
  https://openslides.dev/studio/llms.txt  
  https://openslides.dev/studio/llms/ops.md
- [R7] OPF 补丁与版本前提  
  https://www.openpresentation.org/docs/reference/patch-diff-merge-format
- [R8] PPTist 对象 schema  
  https://github.com/pipipi-pikachu/PPTist/blob/master/doc/AI_PPT_SCHEMA.md
- [R9] Slidev MCP  
  https://sli.dev/features/mcp
- [R10] Penpot / Figma Agent 编辑  
  https://help.penpot.app/mcp/  
  https://developers.figma.com/docs/figma-mcp-server/write-to-canvas/
- [R11] Canva 页面操作  
  https://www.canva.dev/docs/apps/mcp/tools/merge-designs/
- [R12] yaml@2 Document/CST API  
  https://eemeli.org/yaml/#documents
- [R13] 项目约束  
  Huandeng Story skill；已有 07-HUMAN-SLIDES.md 与 Slidit README；用户本轮给出的融合方案和实施范围。

