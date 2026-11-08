/** UI translations for locale-neutral service diagnostics; paths and IDs stay literal. */
export const systemChinese = {
  'Choose a PNG, JPEG, SVG, GIF or WebP image smaller than 32 MiB.':
    '请选择小于 32 MiB 的 PNG、JPEG、SVG、GIF 或 WebP 图片。',
  'An imported image must be smaller than 32 MiB.': '导入的图片必须小于 32 MiB。',
  'This file is not a supported image.': '不支持此图片文件格式。',
  'An imported image with this hash has changed on disk.':
    '具有此内容指纹的已导入图片在磁盘上发生了变化。',
  'Asset search must contain at most 256 characters.': '素材搜索内容不能超过 256 个字符。',
  'Unknown asset filter.': '未知的素材筛选条件。',
  'Asset offset must be nonnegative and limit must be between 1 and 200.':
    '素材分页起点不能为负数，每页数量必须为 1–200。',
  'Asset pageId must be a stable page UUID.': '素材的 pageId 必须使用页面的永久 UUID。',
  'Symbolic links are not indexed.': '素材索引不包含符号链接。',
  'This asset is unavailable.': '此素材不可用。',
  'Asset revision must be its complete content SHA-256.': '素材版本必须使用完整的内容 SHA-256。',
  'Asset preview service is closed.': '素材预览服务已关闭。',
  PREVIEW_TIMEOUT: '预览超时',
  'Preview encoder failed ({value0}): {value1}': '预览编码失败（{value0}）：{value1}',
  'Preview exceeds output budget.': '预览超出输出大小限制。',
  'Preview dimensions are invalid.': '预览尺寸无效。',
  'Preview exceeds the disk cache budget.': '预览超出磁盘缓存限制。',
  'Temporary preview files are still busy.': '临时预览文件仍被占用。',
  'Asset path is required.': '请提供素材路径。',
  'Preview size must be 320 or 640.': '预览尺寸必须为 320 或 640。',
  'This asset file is missing.': '此素材文件缺失。',
  'The asset changed; refresh its content version.': '素材已改变，请刷新素材版本。',
  'Asset response timed out.': '素材读取超时。',
  '{value0} must contain a number.': '{value0} 必须填写数字。',
  'Hierarchy names must be unique and values non-negative.': '层级名称不能重复，数值不能为负数。',
  'Hierarchy parent {value0} is missing.': '层级的父项 {value0} 缺失。',
  'Hierarchy data contains a cycle.': '层级数据存在循环引用。',
  'Hierarchy nesting is limited to 40 levels.': '层级嵌套不能超过 40 层。',
  'Sankey links need distinct named nodes and non-negative values.':
    '桑基图连接需要名称不同的节点，流量不能为负数。',
  'Sankey flow must not contain cycles.': '桑基图流向不能构成循环。',
  'Bubble sizes must be non-negative numbers.': '气泡大小必须为非负数。',
  'Pie values must be non-negative.': '饼图数值不能为负数。',
  'Candlestick high/low must enclose open and close.':
    '蜡烛图的最高价和最低价必须包含开盘价和收盘价。',
  'Huandeng connects only to a local loopback editor.': 'HUANDENG 只连接本机回环地址上的编辑器。',
  'Pass --entry path/to/deck.pptd or --url http://127.0.0.1:4850.':
    '请传入 --entry path/to/deck.pptd 或 --url http://127.0.0.1:4850。',
  'No active Huandeng session for this deck. Run huandeng open <deck.pptd> first.':
    '此文稿尚无打开的 HUANDENG 会话，请先运行 huandeng open <deck.pptd>。',
  'The active session belongs to a different document.': '当前会话属于另一个文稿。',
  'The PPTD manifest must contain relative page paths.': 'PPTD 清单必须使用页面的相对路径。',
  'The manifest references a page more than once.': '清单重复引用了同一页面。',
  'Manifest size needs two positive finite numbers.': '清单中的画布尺寸需要两个有限正数。',
  'Each element needs an elementId and elementType.': '每个对象都需要 elementId 和 elementType。',
  'Invalid bounds on {value0}.': '{value0} 的位置或尺寸无效。',
  'Invalid rotation on {value0}.': '{value0} 的旋转角度无效。',
  'A PPTD page needs an elements array.': 'PPTD 页面需要 elements 数组。',
  'Duplicate elementId {value0}.': '对象 ID {value0} 重复。',
  'Page notes must be text.': '演讲备注必须是文字。',
  'Unsafe or empty field path: {value0}': '字段路径不安全或为空：{value0}',
  'Unsafe field: {value0}': '字段不安全：{value0}',
  'Commands must contain finite JSON values.': '命令必须包含有限的 JSON 数值。',
  'Aliases, anchors, merge keys and explicit tags require manual source editing.':
    '包含别名、锚点、合并键或显式标签的内容需要手动编辑源文件。',
  'YAML merge keys require manual source editing.': 'YAML 合并键需要手动编辑源文件。',
  'Cannot replace the root document.': '不能替换整个根文档。',
  'Cannot descend into {value0}.': '无法进入字段 {value0}。',
  'Array patches must target an existing item.': '数组修改必须指向已有条目。',
  'Only mapping fields can be removed.': '只能移除映射字段。',
  'Missing YAML source range.': '缺少 YAML 源码范围。',
  'Missing YAML mapping source range.': '缺少 YAML 映射的源码范围。',
  'Unexpected flow mapping boundary.': '内联映射边界与预期不符。',
  'Missing mapping indentation.': '缺少映射缩进。',
  'Expected a YAML mapping.': '此处需要 YAML 映射。',
  'Cannot isolate this YAML field.': '无法单独定位此 YAML 字段。',
  'Cannot remove this inline YAML field safely.': '无法安全地移除此内联 YAML 字段。',
  'Cannot create array items with a field patch.': '字段修改不能创建数组条目。',
  'Cannot isolate the parent YAML mapping.': '无法单独定位父级 YAML 映射。',
  'The source edit would change unrelated values.': '这次源文件编辑会改变无关的值。',
  'A field patch cannot contain overlapping set/unset paths.': '字段修改的设置与移除路径不能重叠。',
  'Missing YAML sequence tokens.': '缺少 YAML 序列标记。',
  'Cannot isolate a sequence item.': '无法单独定位序列条目。',
  'Nested inline sequence edits are not supported.': '暂不支持嵌套内联序列的编辑。',
  'Expected a sequence at {value0}.': '{value0} 应为序列。',
  'Invalid sequence index.': '序列索引无效。',
  'A structural edit of this commented flow sequence cannot preserve all comments.':
    '对此带注释的内联序列进行结构编辑，无法保留全部注释。',
  'The sequence edit would change unrelated values.': '这次序列编辑会改变无关的值。',
  'Element identity and type cannot be patched.': '不能通过字段修改更改对象 ID 或类型。',
  'Element {value0} does not exist.': '对象 {value0} 不存在。',
  'The chart writer did not produce one editable workbook.':
    '图表导出未生成单个可编辑的数据工作簿。',
  'The chart workbook is missing numeric cell {value0}.': '图表工作簿缺少数值单元格 {value0}。',
  'The chart writer produced an unsafe package relationship.': '图表导出生成了不安全的文件包关联。',
  'The native chart package is incomplete.': '原生图表文件包不完整。',
  'The chart dependency {value0} is missing.': '图表依赖 {value0} 缺失。',
  'The chart part {value0} would replace an existing object.': '图表部件 {value0} 会替换已有对象。',
  'The chart dependency {value0} has no content type.': '图表依赖 {value0} 缺少内容类型。',
  'Editable charts must embed their data.': '可编辑图表必须嵌入数据。',
  'The native chart writer returned an unexpected payload.':
    '原生图表导出返回的数据格式与预期不符。',
  'Unsupported embedded asset.': '不支持此嵌入素材。',
  'Assets must be local project files.': '素材必须是项目内的本地文件。',
  'Only files in media/ or assets/ are served.': '只提供 media/ 或 assets/ 中的文件。',
  'Asset resolves outside the project.': '素材实际位置位于项目之外。',
  'Asset is not a file or exceeds 64 MiB.': '素材不是普通文件，或超过 64 MiB。',
  'Asset size changed while it was being read.': '读取过程中素材大小发生了变化。',
  'Element {value0} belongs to more than one group.': '对象 {value0} 属于多个组合。',
  'Invalid native slide tree.': '原生幻灯片对象树无效。',
  'Unbalanced native slide tree.': '原生幻灯片对象树结构不完整。',
  'Native grouping would change the stacking order of {value0}.':
    '原生组合会改变 {value0} 的图层顺序。',
  'Native group {value0} has invalid bounds.': '原生组合 {value0} 的位置或尺寸无效。',
  'The formula converter returned an invalid root.': '公式转换返回了无效的根节点。',
  'The native text writer did not produce a table cell body.': '原生文字导出未生成表格单元格正文。',
  'Export working snapshot was released.': '导出用的工作快照已释放。',
  'Export produced no artifact.': '导出未生成文件。',
  'Page dimensions must be finite positive point values.': '页面尺寸必须为有限正数，单位为磅。',
  'There are no active pages to export.': '没有可导出的页面。',
  'Object identities must be present and unique within the page.':
    '页面内每个对象都必须有唯一 ID。',
  'The upstream PPTX dimension contract changed.': '上游 PPTX 尺寸接口发生了变化。',
  'The native object ID was not assigned.': '未分配原生对象 ID。',
  'No verified object renderer was supplied.': '未提供经过验证的对象渲染器。',
  'A rotated fallback must include its measured logical bounds.':
    '旋转对象的回退图像必须包含测量后的逻辑边界。',
  'PowerPoint references the original font names; font availability and native text reflow can differ from the browser.':
    'PowerPoint 使用原始字体名称；本机字体与原生文字换行可能与浏览器不同。',
  'Invalid print surface.': '打印画面无效。',
  'The renderer did not return a PDF document.': '渲染器未返回 PDF 文档。',
  'No repository baseline.': '没有仓库基线。',
  'A committed raw SHA256 revision is required.': '需要已提交版本的原始 SHA256。',
  'Recorded checkpoint path is outside the work tree.': '已记录的版本路径位于工作目录之外。',
  'The committed event and snapshot do not identify the same document version.':
    '已提交的事件与快照不属于同一文稿版本。',
  'File deletion requires an explicit Git review.': '删除文件需要明确的 Git 审核。',
  'No committed path is available for page {value0}.': '页面 {value0} 没有可用的已提交路径。',
  'Page {value0} does not match the committed revision.': '页面 {value0} 与已提交版本不匹配。',
  'Metadata deletion requires an explicit Git review.': '删除元数据需要明确的 Git 审核。',
  'Only this session’s newly persisted identity sidecar can be recorded as initialization.':
    '只能将本次会话新写入的身份文件记录为初始化。',
  'Checkpoint targets must be regular files inside the project.':
    '版本记录对象必须是项目内的普通文件。',
  'Checkpoint targets must remain ordinary Git blobs.': '版本记录对象必须保持为普通 Git 文件对象。',
  'Group {value0} must reference child element IDs.': '组合 {value0} 必须引用子对象 ID。',
  'Group cycle at {value0}.': '组合 {value0} 存在循环引用。',
  'Group references missing element {value0}.': '组合引用了缺失对象 {value0}。',
  'Group nesting is limited to 40 levels.': '组合嵌套不能超过 40 层。',
  'Group references contain a cycle.': '组合引用存在循环。',
  'A group needs members.': '组合需要包含成员。',
  'The new group ID already exists.': '新组合的 ID 已存在。',
  'Select at least two objects to group.': '请选择至少两个对象进行组合。',
  'Ungroup the existing parent before regrouping individual members.':
    '请先解散现有的父级组合，再重新组合其中的对象。',
  'Group bounds are missing.': '组合缺少位置与尺寸。',
  'Group dimensions must be positive.': '组合尺寸必须为正数。',
  'Group rotation must be finite.': '组合旋转角度必须为有限数值。',
  'Keep the aspect ratio when resizing a group containing rotated members.':
    '缩放含有旋转对象的组合时，请保持纵横比。',
  'Duplicate objects need distinct new IDs.': '复制的对象需要各自不同的新 ID。',
  'Unknown icon style: {value0}. Use fas:, far: or fab:.':
    '未知的图标样式：{value0}。请使用 fas:、far: 或 fab:。',
  'Icon {value0} is not in the bundled Font Awesome Free library.':
    '内置 Font Awesome Free 图标库中没有 {value0}。',
  'Invalid project path: {value0}': '项目路径无效：{value0}',
  'Project path escapes its root: {value0}': '项目路径超出了根目录：{value0}',
  'Expected a file path.': '此处需要文件路径。',
  'No free four-character page code could be allocated.': '无法分配可用的四位页面短码。',
  'A page identity already uses {value0}.': '已有页面身份使用 {value0}。',
  'Invalid Huandeng metadata: {value0}': 'HUANDENG 元数据无效：{value0}',
  'Invalid Huandeng project metadata.': 'HUANDENG 项目元数据无效。',
  'Invalid page identity {value0}.': '页面身份 {value0} 无效。',
  'Page paths and codes must be unique, including removed pages.':
    '页面路径和短码不能重复，包括已移除的页面。',
  'Readable slide labels must be unique stable S numbers.':
    '可读页面编号必须是唯一且稳定的 S 编号。',
  'A page theme override must be an object.': '页面主题覆盖必须是对象。',
  'Readable slide labels must not collide with existing short codes.':
    '可读页面编号不能与已有短码冲突。',
  'Ambiguous page code {value0}.': '页面短码 {value0} 有多个匹配。',
  'Page {value0} does not exist.': '页面 {value0} 不存在。',
  'Invalid page checkpoint ID.': '页面版本 ID 无效。',
  'Invalid saved page checkpoint.': '已保存的页面版本无效。',
  'Saved page checkpoint failed its integrity check.': '已保存的页面版本未通过完整性校验。',
  'Page checkpoint not found.': '未找到页面版本。',
  'Page checkpoint identity does not match its filename.': '页面版本 ID 与文件名不匹配。',
  'Saved checkpoint contains an invalid asset reference.': '已保存的版本包含无效的素材引用。',
  'Saved checkpoint asset is missing or changed: {value0}':
    '已保存版本的素材缺失或已改变：{value0}',
  'This project is read-only.': '当前项目为只读。',
  'Use a new request ID for a different checkpoint.': '记录其他版本时请使用新的请求 ID。',
  'Import externally linked media into the project before recording a portable page version.':
    '请先把外部链接素材导入项目，再记录可移植的页面版本。',
  'Cannot record a version with a missing asset: {value0}': '素材缺失，无法记录版本：{value0}',
  'A checkpoint asset must be a file smaller than 64 MiB.':
    '版本归档素材必须是小于 64 MiB 的文件。',
  'Asset changed while recording this page version: {value0}':
    '记录页面版本时素材发生了变化：{value0}',
  'An archived asset failed its integrity check.': '归档素材未通过完整性校验。',
  'A recorded page observation is invalid.': '已记录的页面状态无效。',
  'Duplicate page version {value0}.': '页面版本 {value0} 重复。',
  'The recorded page version changed on disk.': '已记录的页面版本在磁盘上发生了变化。',
  'Cannot read page version {value0}: {value1}': '无法读取页面版本 {value0}：{value1}',
  'Cannot index recorded page version {value0}: {value1}':
    '无法索引已记录的页面版本 {value0}：{value1}',
  "Cannot preserve this read-only session's page history: {value0}":
    '无法保留本次只读会话的页面历史：{value0}',
  'Unknown page version {value0}.': '未知的页面版本 {value0}。',
  'A history or journal record has an invalid structure.': '历史或事务日志记录的结构无效。',
  'A history or journal record failed its integrity check.': '历史或事务日志记录未通过完整性校验。',
  'A history or journal file entry is invalid.': '历史或事务日志中的文件条目无效。',
  'Recovery content does not match its recorded hash: {value0}':
    '恢复内容与记录的哈希不匹配：{value0}',
  'File is not valid UTF-8: {value0}': '文件不是有效的 UTF-8：{value0}',
  'A symlink or junction escapes the project: {value0}': '符号链接或目录联接指向项目外部：{value0}',
  'Cannot resolve project path: {value0}': '无法解析项目路径：{value0}',
  'File changed while waiting to complete the save: {value0}':
    '等待保存完成时文件发生了变化：{value0}',
  'The persisted request receipt is corrupt.': '已保存的请求回执损坏。',
  'The persisted request receipt is invalid.': '已保存的请求回执无效。',
  'This requestId was already used with another payload.': '此 requestId 已用于另一份请求内容。',
  'The completed receipt disappeared.': '已完成的请求回执丢失。',
  'The receipt does not match its saved operation.': '回执与已保存的操作不匹配。',
  'Unknown operation {value0}.': '未知操作 {value0}。',
  'Corrupt history record {value0}.': '历史记录 {value0} 损坏。',
  'Corrupt history file {value0}; subsequent history has been preserved.':
    '历史文件 {value0} 损坏；后续历史已保留。',
  'History conflicts with the pending journal.': '历史与待完成的事务日志冲突。',
  'File changed outside the pending transaction: {value0}':
    '文件在待完成事务之外发生了变化：{value0}',
  'Could not verify saved file {value0}.': '无法验证已保存的文件 {value0}。',
  'File changed before the transaction could be acknowledged: {value0}':
    '确认事务之前文件发生了变化：{value0}',
  'The recovery journal is not valid JSON.': '恢复日志不是有效的 JSON。',
  'The recovery journal does not match this project.': '恢复日志与此项目不匹配。',
  'The receipt conflicts with the pending save.': '回执与待完成的保存冲突。',
  "Recovery would overwrite another writer's change: {value0}":
    '恢复会覆盖其他写入者的修改：{value0}',
  'The pending save could not finish. Release any file lock, then recover the pending save.':
    '待完成的保存未能结束。请释放文件占用，再恢复此次保存。',
  'A previous transaction needs recovery before editing can continue.':
    '需要先恢复上一次事务，才能继续编辑。',
  'File changed before save: {value0}': '保存之前文件发生了变化：{value0}',
  'The transaction was journaled but could not finish. Recover the pending save to continue.':
    '事务已写入日志，但未能完成。请恢复待完成的保存后继续。',
  'Presentations can pin named page versions only.': '演讲只能固定已命名的页面版本。',
  'The pinned page version does not match this reference or has no archived assets.':
    '固定的页面版本与引用不匹配，或缺少归档素材。',
  'A pinned page has a different canvas size. Choose a compatible version.':
    '固定页面的画布尺寸不同，请选择尺寸兼容的版本。',
  'Main Slide {value0} is missing.': '主页面 {value0} 缺失。',
  'This page label identifies more than one page. Use its UUID.':
    '此页面编号对应多个页面，请使用 UUID。',
  'Main Slide {value0} is unavailable.': '主页面 {value0} 不可用。',
  '{value0} must be a nonempty string of at most 512 characters.':
    '{value0} 必须是非空文字，且不超过 512 个字符。',
  'The occurrence does not belong to the requested page and presentation.':
    '此演讲实例不属于指定的页面和演讲。',
  'This page appears more than once. Supply occurrenceId to read its position, notes and pinned version.':
    '此页面出现了多次，请提供 occurrenceId 以读取对应位置、备注和固定版本。',
  'This page is not part of the requested presentation.': '此页面不在指定的演讲中。',
  'Read this pinned occurrence through presentationSnapshot before building its Story briefing.':
    '请先通过 presentationSnapshot 读取此固定版本实例，再生成 Story 简报。',
  '{value0} must be an object.': '{value0} 必须是对象。',
  '{value0} must be {value1} string of at most {value2} characters.':
    '{value0} 必须是{value1}文字，且不超过 {value2} 个字符。',
  '{value0} contains unsupported ID characters.': '{value0} 包含不支持的 ID 字符。',
  '{value0} must be an array of at most {value1} items.':
    '{value0} 必须是数组，且不超过 {value1} 项。',
  '{value0} duplicates ID {value1}.': '{value0} 的 ID {value1} 重复。',
  'Unsupported project schemaVersion. Expected 1.': '不支持此项目格式版本，schemaVersion 应为 1。',
  '{value0}.kind must be section or page.': '{value0}.kind 必须是 section 或 page。',
  'Main Slide {value0} is unavailable. Restore it before adding it to a section or presentation.':
    '主页面 {value0} 不可用。请先恢复页面，再加入章节或演讲。',
  'Section {value0} does not exist. Choose a section from Main Slides.':
    '章节 {value0} 不存在，请从主幻灯片中选择章节。',
  'Presentation {value0} does not exist. Select Main Slides or another presentation.':
    '演讲 {value0} 不存在，请选择主幻灯片或其他演讲。',
  '{value0} refers to unavailable Main Slide {value1}. Restore the slide or remove its reference.':
    '{value0} 引用了不可用的主页面 {value1}。请恢复页面或移除引用。',
  '{value0} refers to missing section {value1}. Restore the section or remove its reference.':
    '{value0} 引用了缺失章节 {value1}。请恢复章节或移除引用。',
  '{value0} has no slides. Add a section or Main Slide before presenting or exporting.':
    '{value0} 没有页面。请先添加章节或主页面，再放映或导出。',
  '{value0} must be a non-empty string.': '{value0} 必须是非空文字。',
  '{value0}.{value1} must be a string.': '{value0}.{value1} 必须是文字。',
  'Recipe action must be create, apply or reset.': '快速布局操作必须是 create、apply 或 reset。',
  'This recipe request belongs to another deck.': '此快速布局请求属于另一份文稿。',
  'Cannot resolve page {value0}.': '无法定位页面 {value0}。',
  'Recipe instanceId must contain 1–80 letters, digits, underscores or hyphens.':
    '快速布局 instanceId 必须由 1–80 个字母、数字、下划线或连字符组成。',
  'This deck is not currently writable.': '此文稿当前不可写。',
  'Recipe commands require page, manifest and metadata revisions.':
    '快速布局命令需要页面、清单与元数据版本。',
  'Recipe commands require the canonical page revision, manifest revision and metadata revision.':
    '快速布局命令需要当前页面、清单与元数据的规范版本。',
  'The page, layout dimensions or recipe metadata changed; refresh before retrying.':
    '页面、布局尺寸或快速布局元数据已改变，请刷新后重试。',
  'Create cannot reset another recipe.': '创建操作不能重置其他快速布局。',
  'Unknown recipe {value0}.': '未知快速布局 {value0}。',
  'That recipe instance already exists; use apply to update its layout.':
    '此快速布局实例已存在，请使用 apply 更新布局。',
  'Layout updates cannot replace recipe identity, scientific text or original assets.':
    '布局更新不能替换快速布局 ID、科研文字或原始素材。',
  'Recipe instance {value0} does not exist.': '快速布局实例 {value0} 不存在。',
  'Apply preserves manual overrides; use the explicit reset action to reset them.':
    '应用布局会保留手动调整；需要重置时，请使用明确的重置操作。',
  'Unknown reset field {value0}.': '未知的重置字段 {value0}。',
  'Reset slots must be a list of slot names.': '重置目标必须是位置名称列表。',
  'Reset only accepts geometry, crop, font and appearance groups.':
    '只允许重置位置尺寸、裁切、字体和外观。',
  'Page to render was not found.': '未找到需要渲染的页面。',
  'Resolve document diagnostics before exporting.': '请先处理文稿诊断问题，再导出。',
  'The renderer reported export problems.': '渲染器报告了导出问题。',
  'Asset was not part of this export snapshot: {value0}': '此素材不在导出快照中：{value0}',
  'No reliable renderer for this page background.': '此页面背景没有可靠的渲染方式。',
  'The browser returned an invalid background PNG.': '浏览器返回的背景 PNG 无效。',
  'No reliable renderer for this object.': '此对象没有可靠的渲染方式。',
  'The rendered object has no measurable bounds.': '渲染后的对象无法测量边界。',
  'The object has no export page.': '此对象没有对应的导出页面。',
  'Cannot measure rendered pixels.': '无法测量渲染像素。',
  'Cannot crop rendered pixels.': '无法裁切渲染像素。',
  'The browser returned an invalid PNG.': '浏览器返回的 PNG 无效。',
  'The object lost its export page.': '此对象的导出页面已丢失。',
  'Some objects have no reliable PDF representation.': '部分对象无法可靠地输出为 PDF。',
  'Export did not produce a file.': '导出未生成文件。',
  'Chart columns must be unique non-empty names (at most 100 columns).':
    '图表列名不能为空或重复，最多支持 100 列。',
  'Chart data requires rows (at most 10,000 rows).': '图表需要行数据，最多支持 10,000 行。',
  'Chart row {value0} must contain {value1} cells.':
    '图表第 {value0} 行必须包含 {value1} 个单元格。',
  'Chart row {value0} contains an invalid value.': '图表第 {value0} 行包含无效值。',
  'Secondary chart axes are not supported yet. Use a separate chart for each scale.':
    '暂不支持图表次坐标轴，请为不同刻度分别绘制图表。',
  'The {value0} axis scale is not supported yet; it must not be replaced by a linear scale.':
    '暂不支持 {value0} 坐标轴刻度，不能用线性刻度替代。',
  'Chart axis limits must be finite numbers with minimum smaller than maximum.':
    '坐标轴范围必须为有限数值，且最小值小于最大值。',
  'A chart supports at most 50 series.': '每张图表最多支持 50 个数据系列。',
  'Unsupported chart type: {value0}.': '不支持此图表类型：{value0}。',
  'Filtered scatter/bubble data is not supported yet. Filter the source table explicitly before drawing this chart.':
    '暂不支持散点图或气泡图的数据筛选配置，请先筛选源数据表再绘图。',
  'Series {value0}: channel {value1} references a missing column.':
    '系列 {value0}：通道 {value1} 引用了缺失的数据列。',
  'Series {value0}, row {value1}, {value2} must contain a number. Use an empty cell for a missing measurement.':
    '系列 {value0} 第 {value1} 行的 {value2} 必须为数字；缺失测量值请使用空单元格。',
  'This chart family requires a single series. Bar, line and area series may be combined.':
    '此图表类型只支持单个系列。柱状图、折线图与面积图可以混合多个系列。',
  'All radar series must reference the same category column.':
    '所有雷达图系列必须引用同一个类别列。',
  'Unexpected text after a quoted cell.': '带引号的单元格之后有多余文字。',
  'The last quoted cell is not closed.': '最后一个带引号的单元格缺少结束引号。',
  'The editor server has no TCP address.': '编辑器服务没有 TCP 地址。',
  'The asset is not a regular file.': '素材不是普通文件。',
  'Cannot read asset {value0}: {value1}': '无法读取素材 {value0}：{value1}',
  'Insertion anchor {value0} does not exist.': '插入位置 {value0} 不存在。',
  'This project needs a writable recovery session.': '此项目需要在可写会话中恢复。',
  'The sidecar belongs to another PPTD entry.': '身份元数据文件属于另一个 PPTD 项目。',
  'The manifest repeats a normalized page path.': '清单中存在规范化后重复的页面路径。',
  'Page {value0} has no stable identity; use page.add or relink.':
    '页面 {value0} 没有永久 ID，请使用 page.add 或重新关联。',
  'Removed page {value0} is still referenced by the manifest.': '清单仍引用了已移除页面 {value0}。',
  'Missing page {value0}; use an explicit relink after an external rename.':
    '页面 {value0} 缺失；如果文件在外部重命名，请明确重新关联。',
  'Multiple identities resolve to the same physical page file.': '多个页面身份指向同一个实际文件。',
  'Page {value0} is missing.': '页面 {value0} 缺失。',
  'A request ID and a short version name are required.': '请提供请求 ID 和简短的版本名称。',
  'Recover the pending save before recording a page version.':
    '请先恢复待完成的保存，再记录页面版本。',
  'This request ID belongs to a different checkpoint.': '此请求 ID 属于另一个版本记录。',
  'The page or Story changed. Refresh before recording a version.':
    '页面或 Story 已改变，请刷新后再记录版本。',
  'A pending transaction must recover before external changes are published.':
    '需要先恢复待完成事务，再发布外部文件变更。',
  'This project is not open for writing.': '此项目未以可写模式打开。',
  'This request ID belongs to another operation.': '此请求 ID 属于另一个操作。',
  'This project is closed.': '此项目已关闭。',
  'This transaction has already been applied.': '此事务已应用。',
  'Recover the pending transaction before previewing.': '请先恢复待完成事务，再预览。',
  'The request belongs to another deck.': '此请求属于另一份文稿。',
  'A previous transaction needs recovery before new writes.':
    '需要先恢复上一次事务，再写入新的修改。',
  'Missing {value0} revision{value1}.': '缺少 {value0} 版本{value1}。',
  'Stale {value0} revision{value1}.': '{value0} 版本已过期{value1}。',
  'Missing page {value0}.': '页面 {value0} 缺失。',
  'Restore this page before editing it.': '请先恢复此页面，再进行编辑。',
  'Unindexed page {value0}.': '页面 {value0} 尚未建立索引。',
  'Could not allocate an unused page filename.': '无法分配未使用的页面文件名。',
  'A transaction may contain at most 1000 operations.': '一次事务最多包含 1000 个操作。',
  'A history revert must be submitted on its own.': '恢复历史操作必须单独提交。',
  'Unknown element {value0}.': '未知对象 {value0}。',
  'This element is referenced elsewhere in the page.': '页面中的其他内容仍引用了此对象。',
  'Element {value0} already exists.': '对象 {value0} 已存在。',
  'Layer order must contain every element exactly once.':
    '图层顺序必须包含全部对象，且每个对象只能出现一次。',
  'Another page uses {value0}.': '另一页面已使用 {value0}。',
  'Relink requires the new page file hash.': '重新关联需要新页面文件的哈希。',
  'Author review records are read-only through the shared transaction API.':
    '作者评审记录在共享事务 API 中为只读。',
  'Metadata field {value0} is not editable.': '元数据字段 {value0} 不可编辑。',
  'Unknown recipe instance {value0}.': '未知快速布局实例 {value0}。',
  'This version uses a different slide size. Restore the matching project dimensions before applying it.':
    '此版本的页面尺寸不同，请先恢复匹配的项目尺寸再应用。',
  'The history operation belongs to another deck.': '此历史操作属于另一份文稿。',
  'A no-op transaction has no inverse.': '没有实际修改的事务没有可撤销操作。',
  'The target was changed after this operation: {value0}': '此操作之后目标已被修改：{value0}',
  'Unsupported operation {value0}.': '不支持此操作：{value0}。',
  'A recipe binding requires slots and overrides.': '快速布局关联需要位置和覆盖设置。',
  'A recipe slot references missing element {value0}.': '快速布局位置引用了缺失对象 {value0}。',
  'The page order references an inactive or unindexed file: {value0}':
    '页序引用了已移除或未索引的文件：{value0}',
  'The transaction would reference a missing page: {value0}': '此事务会引用缺失页面：{value0}',
  '{value0} is required.': '请提供 {value0}。',
  'expectedMetadataRevision is required.': '请提供 expectedMetadataRevision。',
  'recordedAt must be an ISO timestamp.': 'recordedAt 必须使用 ISO 时间格式。',
  'purpose must be text.': 'purpose 必须是文字。',
  'keep must be an array of text.': 'keep 必须是文字数组。',
  'Tables must contain 1–200 rows and 1–50 columns.': '表格必须包含 1–200 行、1–50 列。',
  'Table edit would overlap or extend a merged cell.': '这次表格编辑会重叠或超出已有的合并单元格。',
  'Choose an existing table position.': '请选择已有的表格位置。',
  'The last {value0} cannot be removed.': '不能移除最后一{value0}。',
  'The table cell no longer exists.': '此表格单元格已不存在。',
  'The table cell owner is missing.': '表格单元格的所属记录缺失。',
  'Use merge or split to edit table spans.': '请使用合并或拆分来调整单元格跨度。',
  'Choose a rectangle inside the table.': '请在表格内选择矩形区域。',
  'Select at least two cells to merge.': '请至少选择两个单元格进行合并。',
  'The selection crosses an existing merged cell. Include the whole cell or split it first.':
    '选区跨越了已有的合并单元格，请包含整个单元格，或先拆分。',
  'This cell is not merged.': '此单元格尚未合并。',
  'Table spans must be positive integers.': '单元格跨度必须为正整数。',
  'A table requires a rows array.': '表格需要 rows 数组。',
  'Table column count must be a positive integer.': '表格列数必须为正整数。',
  'Table row {value0} is not an array.': '表格第 {value0} 行不是数组。',
  'Table cell at row {value0}, column {value1} extends outside its grid.':
    '第 {value0} 行、第 {value1} 列的单元格超出了表格边界。',
  'Overlapping table merges at row {value0}, column {value1}.':
    '第 {value0} 行、第 {value1} 列的合并单元格重叠。',
  '{value0} must contain {value1} positive ratios.': '{value0} 必须包含 {value1} 个正比例值。',
  '{value0} must sum to 1.': '{value0} 的总和必须为 1。',
  'Unknown table text or table style: {value0}.': '未知的表格文字或样式：{value0}。',
  'A table border array requires two or four sides.': '表格边框数组需要包含两条或四条边。',
} as const;
