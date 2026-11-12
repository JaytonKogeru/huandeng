# HUANDENG 下一阶段升级规格

日期：2026-11-12（Australia/Sydney）。基线：Editor 0.22.2，`e456d6f676007c24d348d924b2500ba7950daeab`。

状态：0.23.0 的实施与验收依据，保留形成规格时的设计语气。安全、性能、发行和用户工作流已经实现，并通过源码、干净正式包、实际安装和原生客户端验收。最终运行时源为 `a27b92083ecedaeaca3c5258102b3fbaeea9de93`；完成项、测量结果及安装/发布记录见 `VALIDATION-V023.md`、`RELEASE-V023.md` 和 `HANDOFF-V023.md`。修复前事实与复现范围见 `AUDIT-NEXT-PHASE-2026-11-12.md`。

## 1. 升级目标与边界

本轮升级解决三件实际问题：打开外来内容时守住本地服务权限；大项目编辑时减少重复工作；让 Windows 发行物有可靠的验证和安装路径。随后改善冲突处理及首次使用流程。

继续采用 React/Electron、PPTD、现有文档 Store 和共享 writer。唯一 Main Slides、Presentation 的 live/pinned 引用、稳定 pageId/occurrenceId、动态 Position、Section 首页面锚点、四层 Story、独立原始素材、命名页版本和点击动画保持兼容。Section 定义与标题独占的分隔页继续是不同对象。

不得修改六套已认可示例或 OneDrive 科研项目来满足测试；不得删除 Git 历史、许可证、归因和现存项目历史；不把取消 CAS、幂等、原子保存、恢复或撤销作为提速方式。普通已授权编辑继续 preview→apply 一次完成。

## 2. 工作包与完成顺序

| 工作包 | 要交付的行为 | 依赖与门槛 |
| --- | --- | --- |
| A1.1 活跃资源隔离 | SVG 能显示，作为文档打开时不能取得编辑权限或写项目 | 已有证据足够进入最小修复；导出出口补齐回归 |
| A1.2 会话引导 | Desktop、浏览器、CLI、MCP 都通过明确能力取得会话 | 按 3.3 的客户端表先做握手兼容测试，再关闭旧引导 |
| A2 Git 调用边界 | 打开项目不能执行仓库自带的 fsmonitor 命令 | 保留正常 checkpoint 的 hooks/签名约束 |
| A3 发布入口与运行时 | 禁止误发上游 npm；升级受支持 Electron | 包名保持兼容；Electron 更新独立验证 |
| B1 重复刷新 | 自身保存不再导致额外全项目刷新；无关文件不触发整库扫描 | 使用本次基准；保留真实外部写入 |
| B2 事务准备与快照 | 复用单事务素材检查、减少 clone/重复计算，随后按变化更新客户端 | 保留写盘前真实校验和事件缺口回退 |
| B3 历史与资源 | 历史列表按需读取；有效缓存避免重复读取大图 | 索引可重建，资源版本必须可靠 |
| C Windows 发行 | 干净来源、Windows 验证、可安装/移除、正确产品信息 | 可先发布已验证的 A1.1+A2 补丁；A1.2 单独通过握手兼容后再交付 |
| D 用户工作流 | 看懂冲突、稳定的窗口布局、明确的 Agent setup 与可选提案 | 复用现有视图、审阅与事务，逐项交付 |
| E 文档与目录 | 标记历史审计范围，控制后续证据目录深度 | 不大规模移动既有素材、示例或历史 |

各工作包按 Audit → Spec/Frame → Implement → Validate → Release 推进。可以独立实现和本地提交；对外发布应在一个有验收记录的版本里集中完成。安全修复不要等待所有 UX 工作完成。

## 3. A1：资源与会话权限

### 3.1 事实与威胁边界

本次在生产 static server 和 Vite 路由上，均复现 data/file SVG 经 asset/asset-preview 作为浏览器文档执行，随后获得测试会话并写入合成项目。直接 `<img>` 显示不执行脚本。现有 loopback、Host、Origin、POST token 检查仍有效，问题在于可执行资源进入了编辑器同源权限域。

### 3.2 第一批最小修复

1. 在统一的资源响应边界，为所有可执行图像/文档出口制定策略；覆盖 asset、asset-preview、导出文件和未来新增出口。保留 `nosniff`，明确 MIME，不把它当作脚本隔离。
2. 对 SVG 资源响应使用经测试的严格 CSP/sandbox；不允许 scripts、同源权限恢复、表单、顶层导航或外部连接。受控实验已验证这一路径能阻止脚本，同时保持简单 SVG 的图像解码。具体 CSP 还需验证真实科研矢量图、内嵌样式、字体、mask/clipPath/filter，不能以一张简单测试图代替完整兼容验收。
3. 资源导航应拒绝或成为无权限文档。可以用 Fetch Metadata 的 document/iframe destination 作为附加控制，但缺失这些头的 CLI 请求仍必须走明确的凭证规则，不能把“没有头”当作可信。
4. 不全面禁止 SVG、不改写原始科学素材；如个别预览必须栅格化，保存独立派生图，原图与导出保真另行验证。

### 3.3 会话接口的闭环改造

`/__pptd/session` 和 `/__pptd/current` 整体改为需要认证的文档端点；统一覆盖 pages、project、history、review、selection、events、activity、素材和导出快照等私有接口。未认证调用既不返回写入 token，也不返回项目路径、页面、Story 或其他文档内容。无凭证 health 只返回 readiness、产品/协议版本和重新引导所需的非敏感错误码；不包含项目身份、内容、路径或能力。产品自带的静态 UI HTML/JS/CSS/字体/logo 可公开加载以完成引导，但不能混入项目资料。现有启动等待、renderer 初始化、CLI/MCP 读取都需逐个迁移。

复用当前本机 discovery/进程启动通道，并按下表实现第一版能力引导。下面的 launch ticket、bootstrap exchange 和能力区分均是拟新增协议，不能当成现版已有 API。

| 客户端 | 首个可信来源 | 首次获取与保存 | 刷新、重连与重启 |
| --- | --- | --- | --- |
| Electron renderer | 当前 Project 的 native service + 受限 preload/IPC | 只向被允许的主 UI frame 提供短期能力；renderer 内存保存 | 页面重载向 native 重新请求；writer epoch 改变重新引导 |
| CLI | 同一用户受保护的本地 discovery 文件 | 校验对应 entry、PID/epoch、协议；读写请求显式携带能力 | 重新读 discovery；旧 epoch 失败，不自动选另一个 Project |
| MCP adapter | CLI 的同一绑定 entry/discovery | 复用普通 Agent 读写能力，不获得 UI 接受收据能力 | 同上，保持原 Project 绑定 |
| 外部浏览器 | 用户本机 `huandeng open` 的可信 launcher | launcher 获取一次性、短有效期 ticket，仅用 URL fragment 交给正确 UI 页面；页面立即清除 fragment，经同源 POST 交换后在该 tab 的 sessionStorage 保存短期浏览器能力 | 同 tab 刷新使用现有能力；失效/服务重启后由本机 open 重新引导；关闭 tab 后不依赖持久凭证 |

正式 session/write token 不进入 URL、日志、素材 URL、复制配置或全局 localStorage。浏览器的一次性 fragment ticket 是受限的启动载体，不是长期 token：绑定 Project、epoch、用途和单次消费；不写日志/命令输出，不通过服务端重定向或查询参数传递；设置 `Referrer-Policy: no-referrer`。无有效 ticket 的 exchange 返回认证失败；不能提供一个任何网页可申请的 ticket mint 端点。可信 launcher 通过受保护的本地能力取得 ticket。HTTP Agent 能力不能伪装成 launcher/UI 能力。浏览器能力清理、过期和错误提示须在隔离 profile 验证。

当前用户的本机进程本就能读取其文件；这一设计限制普通 HTTP/Agent 会话权限，不声称抵御已经控制操作系统用户账户的程序。

**浏览器素材和事件流的认证兼容：** 普通 API 使用 header capability。原生 img/CSS/字体请求不能自动加此 header，因此由已认证的 snapshot/素材解析接口签发短期只读 resource ticket，严格绑定 Project、epoch、单个资源路径及内容 revision、用途/尺寸与 GET 方法；它只能读取指定字节，不可读取任意文件、换资源或升级为写能力。ticket 可在有限有效期内复用以支持重试与缩略图，URL/日志按敏感参数处理并禁止 Referer 外传。所有资源仍执行 A1.1 的 MIME/CSP/导航隔离。不要 fetch 原始活跃 SVG 后创建可被打开为同源文档的 blob URL，否则会丢掉响应 CSP。

events/activity 改用带认证 header 的 fetch streaming 和已有 epoch/sequence 重连语义，不把普通 token 填入 EventSource URL。导出 renderer 获得本次 job 的只读能力及相同资源票据；在生成结束或取消后失效，不能获得通用写能力。原图、缩略图、项目字体、科学绘图和导出资源都进入兼容测试。

保留当前本地连接方式和共享 writer；不增加反向代理、公网端点或云端凭证依赖。旧客户端明确报出需要升级的握手版本，禁止静默降级回旧 token 接口。

### 3.4 A1 验收

- 两种服务器的 data/file × asset/asset-preview 导航及 iframe 回归全部阻止执行、token 获取和写入。
- `/session`、`/current` 无凭证、错误凭证、过期 epoch 的请求不暴露写能力；正确的 Editor、CLI、MCP 流程可用。
- 全新浏览器 profile 通过正常 `huandeng open` 完成首次打开、刷新、关闭重开和服务重启后的重新引导；launch ticket 原子单次消费，顺序/并发重放、跨项目使用及换 epoch 均失败。私有 API 的无凭证访问只允许已列出的 health 字段；静态产品 UI 仍可加载。
- resource ticket 不能换路径、revision、方法、用途或 epoch；过期后可由合法客户端刷新。原生图像/字体加载和认证事件流可用，导出任务结束后其能力失效。
- 异源 Origin、错误 Host、无 token POST 保持拒绝；正确同源用户编辑、撤销、恢复不受影响。
- 校验服务器实际收到的 Sec-Fetch-*，分别覆盖顶层导航、iframe、img、fetch 及无浏览器头的授权 CLI。
- 实际 Electron shell 的导航白名单和新窗口策略只允许需要的 UI 页面；不能仅因 URL 同源就允许任意资源成为主文档。
- 真实科学 SVG、PNG/JPEG、公式、图表和字体在编辑、缩略图、PDF/PPTX 中逐项检查。安全探针只在合成项目与独立浏览器 profile 中运行。

## 4. A2：Git 发现与 checkpoint

统一 Git wrapper 的参数和进程环境。对 discovery/status 路径明确禁用 `core.fsmonitor`；限制不必要的 Git 环境覆盖及可执行配置，审计 diff/textconv/filter 等实际可达调用。以真实调用路径决定控制范围，不机械重写用户全局 Git 配置。

检测 Git 版本；旧 Git 对 `core.fsmonitor=false` 的语义与新版本不同，不能在不支持的版本上声称已经禁用。缺少满足要求的 Git 时，关闭可选 Git checkpoint 集成并说明原因，PPTD 的保存、撤销和命名页版本仍可用。

保留 `gitWorkflowRequirement` 的语义：有签名要求或启用的提交 hook 时，交还用户的常规 Git 流程。不能为“修安全”直接绕过 hook/签名或改变仓库身份。

验收包括：外来仓库 fsmonitor 无害标记不再执行；正常干净仓库 checkpoint 成功；脏仓库不被吸收；签名/hooks 要求继续 deferred；父仓库、普通无 Git 项目和现有 portable ZIP 均正常。HUANDENG portable ZIP 已排除 `.git`，保持这一行为。

## 5. A3：误发布防护与 Electron

先将不用于 npm 发布的产品 workspace 明确设为不可发布，并禁用根脚本中的 `changeset publish` 入口。保留 `@open-slide/core` 等内部解析路径、上游许可证和 changesets；包名迁移另立兼容任务。

Electron 38 已在 2026-03-10 结束支持。实施时锁定受支持稳定线的具体补丁版，在独立变更里验证多 Project、native dialogs、窗口关闭/草稿保护、CLI/MCP、导出和 publisher。

当前 service、publisher、agent-setup 使用 `ELECTRON_RUN_AS_NODE`，不能立即关闭 RunAsNode fuse。utilityProcess/独立 Node、ASAR、integrity、fuses 与代码签名属于后续受测迁移；ASAR 本身不等于安全隔离或字节体积下降。

## 6. B：性能实现原则与实验设计

### 6.1 固定基准

保留本次 8/80 页对照、数百素材、200 条有效历史的合成生成器和原始结果。分别报告普通 UI 输入→可见反馈、提交→落盘、Agent preview→apply、快照大小/解析、文件调用、watcher 和内存。首次进程打开与 warm reopen 分开；未清操作系统缓存时不得标为“冷磁盘”。

每个性能补丁使用相同机器、fixture、操作与试次；浏览器与安全实验串行。新旧运行次序可交错，保留原始样本及 p50/p95；小样本 p95 只用于初步观察。不得引用旧 v0.4 的 5–6 秒作为当前收益，也不得把输入即时反馈与 durable save 时间混为一谈。

### 6.2 自身写盘与外部变更

Store 在事务落盘后提供写入路径、operationId 和确切内容 revision。watcher 收到事件时，用实际路径及最终内容版本识别自身写入；只可抑制与本次已持久化字节一致的事件。不要使用“提交后若干毫秒忽略所有事件”或永久忽略项目目录。

其他路径、内容不符、rename/recreate、未知事件、队列溢出或 writer epoch 改变均保留刷新/全量校验。OneDrive 延迟到达、快速连续写入、相同大小/mtime 的改动、媒体改动和外部原子替换必须纳入回归。

### 6.3 客户端快照

在现有事件 sequence/epoch 上增加可选的变化内容响应。每个增量必须包含 epoch、baseSequence/baseRevision、targetSequence/targetRevision、变化页、显式删除页，以及同一目标版本的 manifest/metadata/页序变化；多页或全局事务作为一个原子补丁应用。正常单页提交不再同时依赖多次完整快照。

按 pageId 补拉也必须指定目标版本；服务器不能提供该版本时，返回更新版本的一致补丁或明确要求全量同步。不得把事务 A 的旧 metadata 与事务 B 的新页数据拼在一起。保留旧客户端/能力协商；base 不匹配、事件缺口、重连、epoch 改变、复杂全局事务均可退回权威快照。故意打乱回执、SSE、按页响应并插入第二次写入后，客户端状态必须等于某一个真实权威快照。

对账以 writer 回执为准；乐观 UI 不是保存完成。保留用户在请求途中继续输入的剩余草稿；响应乱序、请求重试和同一 requestId 的幂等语义不能改变。不得把缺少某页的增量误当作删除该页。

### 6.4 事务准备与读取缓存

本次 assets 检查每个事务执行两次，单次中位数约 93 ms，嵌套在 load/prepare 中。首个事务优化先复用同一事务内经过校验的素材检查结果，再消除全量 `structuredClone` 和重复 revision/验证计算，利用已存在的 page parse cache；以 touched resources 的不可变复制、依赖关系和全局不变量验证替代不必要的重复工作。preview 和 apply 两条路径都计入。代表性深层元素、group children、嵌套样式和共享引用须满足：preview 不改当前文档；后续提交不改已发出的旧 snapshot；history.before/after 的序列化字节不受未来编辑污染；失败或中断的事务不污染当前文档或缓存。

先保留当前写盘前的真实文件校验。进一步减少 `loadDocuments` 的读取之前，必须明确验证哪些全局约束和外部改动仍会被观察到：仅依赖 mtime/size 或 watcher 通知不够。触及资源必须比较真实内容版本；无法证明缓存新鲜、存在全局结构变更或文件映射不确定时回退完整校验。不可为追求 O(1) 读盘而改变现有冲突/恢复契约。

previewHash 继续绑定原事务；不能缓存一次 preview 后跳过 apply 时的 CAS。expected revisions 覆盖事务的读依赖和写集合，不能把“实际需要”简单等同于写入页。首批保持现有依赖/冲突契约；只有建立可验证 read-set 与全局依赖规则后才缩小校验范围。preview 与 apply 之间改变被读取但不被写入的页面/编排/组件时必须拒绝、重算或 rebase；独立无依赖的页面编辑仍可并发。

### 6.5 历史索引与素材缓存

历史先实现稳定排序的摘要索引和分页，完整记录按需读取；记录仍是权威数据，索引可丢弃重建。损坏记录、pending recovery、幂等收据、Undo/Redo 和单页版本预览继续可验证，不能通过忽略坏历史“优化”错误。

资源缓存必须以可靠的内容 revision 绑定原图与派生图。首次或不确定状态仍校验字节；已知不可变内容的条件请求应避免无意义的重复读取/哈希。保持缓存预算、并发槽、队列上限、取消、失败回退及原图来源；不无限增加内存换速度。

### 6.6 B 的验收门槛

优化前后必须运行同一基准。每个补丁证明其减少的调用/字节/重复处理与对应耗时变化；对未改变路径不承诺收益。若整体 wall time 没改善，应解释分段结果并决定是否保留补丁，不能只展示更好看的单个样本。

同时通过：同页冲突拒绝、不同页并发、请求超时重试、重复 requestId、外部写入竞态、多文件中断恢复、writer 锁、Undo/Redo、命名版本恢复、live/pinned Presentation、原始素材及 Story 保留。任何一项回退都不进入发行。

## 7. C：Windows 构建与发行

保留快速 Linux CI，补充 Windows 原生包流程。测试 fixture 与路径全部自包含；不要把 THUG 历史验证脚本中的绝对科研目录照搬到 CI。

最小 Windows 路径：干净 checkout → build/package → 复制到带空格和中文的新目录 → 启动 → 新建/打开 → 编辑保存 → Undo/Redo → 关闭重开 → 一个代表性 PDF/PPTX 导出 → CLI/MCP 握手。另显式运行 desktop/plugin 的 node:test、必要 browser tests。Office 自动化使用独立可用的 Office 环境，不能把托管 runner 没运行的部分标为通过。

正式包从受控 `editor-v*` tag 的干净 checkout 构建，记录 commit、lockfile、工具链和内容清单；dirty build 只作为明确标识的开发包。下一次安全补丁的必需门槛是 Windows 真实验证、干净来源、正确 HUANDENG 产品信息以及 ZIP/checksum。签名通道作为独立交付；未签名的补丁如实标注，不因尚未选定签名服务而延误已验证的安全修复。签名启用时先设置产品名称/版本与 fuses，再签名并生成 ZIP/清单。来源可追溯优先，暂不承诺含签名时间戳的所有产物逐字节重建相同。

安装层保留 portable ZIP，并随包交付可用的当前用户安装/修复/卸载入口，再评估标准 GUI installer。升级/卸载只处理应用拥有的文件和注册项；保留科研工程、素材、命名版本及恢复资料，不强改 Windows UserChoice。安装路径改变后重新验证插件 runtime discovery。

瘦身从 production import graph 开始。Playwright 目前参与导出，不能直接移除。静态服务缺构建产物时清楚报错，避免发行包意外依赖 development fallback。每裁剪一类依赖，就验证科学图表、公式、字体、图片、导出和客户端连接。以本次 595.1506 MiB/26,052 文件作为基线，首个完整可用候选完成后再制定体积预算。

签名供应商、资格与费用在具体选择时再决定；本规格不授权采购或提交凭证。

## 8. D：用户任务与 Frame

### 8.1 术语与偏好归属

| 用户看到的概念 | 英文 / 中文 | 归属与行为 |
| --- | --- | --- |
| 项目 | Project / 项目 | 一个含 `.pptd`、pages、media 的完整文件夹 |
| 唯一主页面集合 | Main Slides / 主幻灯片 | 内容主记录 |
| 演讲序列 | Presentation / 演讲 | live/pinned occurrence，不自动复制主页面 |
| 连续分段 | Section / 章节 | 稳定首页面锚点；Position 随顺序变化 |
| 客户端接入说明 | Agent setup / 助手接入 | 生成步骤/配置；不伪称已连接 |
| 已保存变更审阅 | Review saved changes / 查看已保存修改 | 绑定准确 operationId 的只读证据 |
| 待采纳方案 | Proposal / 待审方案 | 仅在用户选择的提案流程启用 |
| 字体可用性 | Font check / 字体检查 | 当前不提供默认字体设置，名称反映实际功能 |

主题、UI 语言、tab 方向和 snapping 继续全局；同一窗口的面板显隐/宽度/Notes dock 迁移为窗口偏好。缩放、选页和当前视图继续是各 Project 的会话状态；Story、Notes、素材与编排属于项目内容。旧 `projectLayouts` 首次迁移读取当前活动项目作为初值，保留旧值用于回退，不批量改项目文件。

### 8.2 Frame：从 Home 完成第一次工作

Home 保持 Open Project、New Project、Recent Projects 三个主要入口；应用外观放在 Home 和项目中均可达的同一菜单。新建时明确填写 Project name 和 parent folder，并展示最终 `folder/deck.pptd`，取消操作不产生半成品，不覆盖已有目录。

入门例子从一份单独维护的最小教学 fixture 复制到用户所选新目录；不改写六套冻结示例。例子只帮助用户完成打开、编辑、编排、播放、导出，不强迫填写 Story 或连接 Agent。

项目内由外层 tab 承担 Project 身份，当前工作区显示 Main/Presentation、视图和保存状态；去掉重复身份标签之前先确认它们没有承担不同的范围提示。折叠垂直 tab 仍提供完整名称、可识别标志和键盘焦点提示。

### 8.3 Frame：发生冲突时

保留暂停覆盖保存的现有保护。冲突条提供“看差异”“保留我的修改”“采用新版本”。“保留我的修改”先在当前磁盘版本上重建提案，不等于 force overwrite。

差异界面并排呈现本地草稿和新版本的实际页面，附对象/字段变化。能证明独立的字段才提供合并；对象删除、编排变化、共享组件或重叠字段冲突必须显式选择。没有合并的草稿仍能复制/导出，不能随切换 Project 或关闭对话框丢失。

保存合并用最新 revision 和一次正常事务；再次发生冲突时回到差异视图。拒绝或取消不修改文档。“采用新版本”需说明将放弃的草稿范围，并保留可恢复副本。

### 8.4 Frame：可选提案工作流

普通已授权任务仍走 preview→apply→review。用户要求“先给方案”时才记录 pending proposal，显示涉及的 Main 页、live 使用位置、固定版本、字段变化和实际预览。

接受执行完全一致的 proposal；拒绝不写文档。部分接受只能选择独立原子组，先计算依赖闭包并重新 preview，不能任意删掉一个复合事务里的操作。若 Project revision 变化，方案变为 needs-rebase；重新计算后产生新 hash 和待审版本。

第一版交付“可核验的 UI 审阅事实”，不声称已经建立强制约束所有 Agent 写入的审批系统。previewHash 不是批准。桌面通过允许的 UI frame 的专用 IPC，浏览器通过 bootstrap 所得的专用 UI capability，产生绑定 proposalHash、Project、epoch 和一次性 approval nonce 的接受收据；普通 Agent token 不具有签发能力。Agent 自报 actor/approvedBy 不会改变审阅状态。

验收须拒绝普通 Agent token 伪造接受、旧收据重放、替换 hash、跨项目和跨 epoch 使用；approval nonce 原子消费，并发重放不能重复接受。普通已授权编辑接口保持直接可用。以后如需“提案模式必须等人批准”，另加 writer 侧针对该任务/会话的 apply 能力约束，并验证不能走普通写入接口绕开；未实现该约束前不作这项产品承诺。全部实际写入仍复用当前 writer、CAS、operation receipts 和 review。

## 9. 实施与发布记录

每个原子补丁保留：需求/证据、修改范围、测试命令与真实结果、兼容影响和回退方式。core/CLI 源码修改按当前 AGENTS.md 添加简洁 changeset；不得手改版本或借审计删除政策文件。

冻结的真实项目只用于以后获得授权的只读/复制验收；本轮性能及安全测试的合成 fixture 保留以便重跑。公开提交不携带可执行安全探针、会话凭证或个人路径；私有证据留在 `.verification/independent-audit-20261112/`。

发布前完成独立检查：安全负例被阻止、正常用户路径通过、基准可复测、预存用户改动未被包含、release notes/handoff 与实际产物一致。只有实际发布并验证后，才更新“已发布/已安装”的状态。

## 10. 官方依据

- [Electron 支持时间表](https://releases.electronjs.org/schedule)：支持版本决策。
- [Electron 安全指南](https://www.electronjs.org/docs/latest/tutorial/security)：资源隔离、导航与版本维护。
- [Electron fuses](https://www.electronjs.org/docs/latest/tutorial/fuses)：RunAsNode 与现有子进程兼容关系。
- [SVG 处理模式](https://www.w3.org/TR/SVG/conform.html)：文档和图像嵌入方式的不同能力。
- [CSP Level 3](https://www.w3.org/TR/CSP3/)：脚本和 sandbox 策略语义。
- [Git 配置文档](https://git-scm.com/docs/git-config)：core.fsmonitor 及旧版本兼容。
