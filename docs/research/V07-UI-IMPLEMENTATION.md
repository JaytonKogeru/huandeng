# v0.7 工作台实施交接

日期：2026-11-07 UTC。实施依据 [总 Audit](../AUDIT-V07.md) 与 [Spec](../SPEC-V07.md)。本文件记录 UI 子代理的改动与检查，最终集成和桌面验收以主代理的 Validation 为准。

## 改动

- 标题栏采用 56px 横向结构：产品标识、项目名、当前集合、历史动作、页面保存、导出与演示。长名称保留完整 title；正常服务连接信息不再占一行，重连仍可见。
- 保存按钮明确为「保存页面」，状态与操作相邻。恢复、冲突和错误优先显示；辅助草稿单独列出真实类别，提供项目、Story、图表／Story 管理及动画草稿的入口。
- 原图片工具定位素材面板并聚焦搜索，旁边保留直接从设备导入。隐藏 file input 沿用原有 `importImages`；删除默认手输素材路径的对话框及仅供该入口使用的旧 `addElement`。
- 预览时临时隐藏基础属性栏，保持组件挂载与 `inspectorCollapsed` 偏好；保留所选对象标识和返回基础编辑的操作。移除 AuthoringWorkspace 中重复且不可操作的预览浮层。
- 左侧导航在同一窗口内保持稳定宽度：默认 288px，1280px 及以下为 256px，1100px 及以下为 240px；紧凑窗口基础属性区为 256px。手动面板开关继续有效。
- 工作台 xs 按钮与基础属性字段为 12px，状态／元数据约 11px。沿用配色、字体及按钮／弹层反馈，集合选择器有即时焦点与 reduced-motion 分支。
- ProjectOverview 的 `onEditProject` 接到功能代理提供的 `data-hd-project-editor`。导航与草稿定位要聚焦实际控件，避免普通 section 获得焦点后触发画布方向键。

## 文件与协作边界

UI 实施文件：

- `packages/core/src/app/routes/huandeng.tsx`
- `packages/core/src/app/styles.css`
- `packages/core/src/app/components/pptd/authoring-workspace.tsx`：仅删除重复预览提示，功能代理明确交接此处。
- `.changeset/huandeng-workbench-context.md`

主代理接回 route 后负责 ExportDialog 接线及集成修正。UI 子代理不实现导出后台／编码器，不修改 PPTD 模型、文档事务或科研原稿，也不提交 Git。

新增定位点：`data-hd-document-title`、`data-hd-export`、`data-hd-open-assets`、`data-hd-import-images`、`data-hd-preview-context`、`data-hd-pending-drafts` 和根节点 `data-hd-preview-active`。原有焦点、保存／恢复、画布和冲突标识保留。

可访问名称调整：保存→保存页面；添加图片→打开素材库；快捷导入按钮为「从设备导入并放置图片」，隐藏文件 input 为「从设备导入图片」；独立格式按钮统一为「导出」。旧测试应走实际新流程，不恢复已移除的路径输入。

## 已执行的代码检查

| 检查 | 结果 |
| --- | --- |
| Core `tsc --noEmit` | UI 交接前通过；集成后由主代理重新运行 |
| 三个改动源码文件的 Biome | 通过，仅格式化拥有的文件 |
| `git diff --check` | 通过 |
| 既有 keyboard / document / insertion / renderer-animation 单元测试 | 4 个文件，67 项通过 |
| Production editor build | UI 交接前通过；之后构建权交还主代理 |
| `scripts/verify-ui-v07.mjs` 的 Node 语法、Biome 与空白检查 | 通过，尚不代表脚本中的客户端检查已经执行 |

普通 pnpm 命令在环境中触发自动 install，并因无 TTY 的模块清理提示退出。未清理或重装依赖；代码门禁通过已安装的 `node_modules/.bin` 工具直接执行。

## 实际客户端验收脚本

新增 `scripts/verify-ui-v07.mjs`，默认输出 `.verification/v07-ui/report.json` 与原始 PNG。脚本创建独立合成项目、独立宿主 profile 与 runtime，不使用用户项目。支持 `HUANDENG_DESKTOP_EXE` / `HUANDENG_DESKTOP_APP`；无 EXE 时才使用 fork CLI 与显式 loopback 端口。

初版 11 项检查覆盖三种窗口尺寸的长中英项目／演讲名、控件边界与焦点顺序，素材浏览和真实文件选择器，导入比例及撤销，项目概览进入编排，预览释放右栏、恢复选区与保持手动面板偏好，深色／reduced-motion，以及 MP4 弹层的范围、时间和可达性。报告记录实际 bounding boxes、DPR、构建摘要、截图摘要、渲染错误及关闭状态。后续根据真实截图复核增加完整页面可见范围断言及第 12 项 Portal 动效检查，见下文。

主代理已确认 Linux Chromium 受宿主 socket 权限限制，要求不重试。因此 UI 子代理没有启动 Linux 浏览器，也没有把脚本编写或语法检查算作视觉验收通过。Windows 隔离 Electron 由主代理运行，真实报告与截图由主代理和 UI 子代理分别复审。单一窗口中的 DPR 记录不等于 Windows 100%／125%／150% 多档 DPI 验收。

### 首次 Windows harness 修正

首次 Windows 启动在画布出现前超时，0 项 UI 检查完成。原因是本脚本错误地把中文显示标题写入 metadata 的 `slides[].label`；`identity.ts:147` 起仅允许唯一稳定的 S 数字标签。它不是此次产品布局的失败证据。

已改为 S1／S2／S3，长名称仍放在文稿 title、演讲 title 与页面正文。脚本现在启动客户端前执行真实 `huandeng check`，要求三页且 `diagnostics=[]`；启动失败会保存页面实际文本及去除 sessionToken 的 session 响应。新增 `--preflight` 可只验证合成项目。

已实际运行 `node scripts/verify-ui-v07.mjs --preflight`：exit 0，`identityPersisted=true`，`diagnostics=[]`，`browserStarted=false`。这项结果仅证明修正后的 fixture 通过 CLI 检查；客户端结果以下述 Windows 重跑为准。

### Windows 候选版第二次运行与独立截图复核

2026-11-07T20:56:01.313Z 的实际报告记录：隔离 Electron 38.7.2／Chrome 140.0.7339.249，11/11 检查通过，7 张 PNG，`rendererErrors=[]`，正常退出 `code=0, signal=null`。原始证据在 `D:/_Proj/Huandeng-v07-20261108/.verification/v07-ui/report.json`，运行日志为 `v07-windows-ui-candidate-r2.log`。所有截图 DPR=1，PNG 像素尺寸与对应 CSS viewport 一致。

UI 子代理通过 THUG 的只读文件工具逐张查看了七张原图；没有操纵用户的现有窗口。几何结论来自报告，视觉判断来自原始 PNG，两者分开记录：

| 状态 | 可测几何结果 | 像素复核结论 |
| --- | --- | --- |
| 1600×1000 基础工作台 | 顶栏 56px；项目名约 649px；集合 240px；中区 1024px | 项目名与集合横向并列，保存与交付动作分组可辨；没有原先三行标题堆叠 |
| 1280×800 基础工作台 | 顶栏仍 56px；项目名约 471px；集合约 202px；中区 736px | 长名称按预期截断，工具和保存动作仍完整可见 |
| 1040×680 基础工作台 | 顶栏仍 56px；项目名约 311px；集合约 140px；中区 544px | 标题与集合紧凑但无控件碰撞；演讲引用提示换为两行，未遮住画布 |
| 1040×680 素材 | 导航 240px，未横向溢出；真实搜索／复用／导入流程通过 | 素材缩略图、详情、导入并放置与复用当前页形成一致入口；详情较长时使用垂直滚动 |
| 1280×800 动画预览 | 中区由 736px 增至 1024px；基础属性隐藏 | 预览上下文与返回操作清楚，页面完整显示，时间轴可达 |
| 1040×680 深色动画预览 | 中区增至 800px；实际页面高度约 256px | **发现页面底部被时间轴区域裁掉，旧 11 项检查没有覆盖页面垂直完整性，不能因 11/11 就判定该状态合格** |
| 1040×680 MP4 弹层 | 弹层约 572×483px，中心与窗口一致，无横向溢出 | 格式、范围、输出参数及预计时长层级清楚；截图拍摄时编码器检查仍在进行，不能据此声称视频已导出 |

美术判断：现有表面、边界、图标和品牌色一致，视觉更接近日常创作工作台；这批截图没有发现需要另起一套营销式视觉体系的理由。后续可以进一步收拢右侧技术说明、提供可调节的时间轴高度，但这些是空间分配改进，不是本轮已验证通过的功能。

### 截图发现的紧凑预览修补

根因是 `authoring-workspace.tsx` 的滚动视口在 1040×680＋时间轴状态只有约 231px 高，扣除上下 64px padding 后可用内容约 167px；`editor-canvas.tsx` 却指定 `h-full min-h-64`，将传给 `SlideCanvas` 的测量高度抬到 256px。`SlideCanvas` 的 ResizeObserver 和双轴 fit 计算没有遗漏高度，但收到的容器尺寸已经超过真实可见区，因此得到约 47.4% 的错误适配比例。

主代理独立确认截图后实施最小修补：画布根 `min-h-64` 改 `min-h-0`，滚动视口新增 `data-hd-canvas-viewport`。共用 `SlideCanvas`、手动 scale 和页面内容没有改变。

脚本在三个基础窗口、1280 预览／返回基础编辑、1040 深色预览／返回基础编辑共七个状态，实际点击「适合窗口」，比较 `[data-pptd-page]` 的四边与滚动视口的 client 可见边界。报告同时记录 viewport／slide 边界、内容可用高度、画布高度及滚动量。失败时仍保留这些数据，便于区分视觉裁切与素材自身画面。

### Portal 的 reduced-motion 修补与新增验收

源码复核发现，ExportDialog 通过 Portal 放在 `body` 下，不属于 `.hd-editor` 后代。旧 reduced-motion 规则因此漏掉 DialogContent／overlay 和其中按钮：弹层仍有 200ms 缩放，按钮仍可能在按压时向下平移 1px。

经主代理认可，只扩展工作台存在时的 reduced-motion CSS：弹层／遮罩使用不超过 80ms 的 opacity 过渡；弹层保留居中的 translate，只清除 scale；出现可见键盘焦点时过渡归零；弹层内按钮取消 translate／scale／transform 和过渡。正常动态效果分支保持原样。

新增第 12 项检查会读取真实 Portal 的计算样式，验证 opacity-only、焦点下 0ms、居中 translate 与边界；通过真实 `mouse.down()` 使关闭按钮进入 `:active`，核对零位移并检查关闭后的焦点返回；再切回普通 motion，确认 scale 过渡和至少 100ms 时长仍存在。检查在截图冻结动画之前读取样式，不以动画结束后的静态 `scale:none` 冒充 reduced-motion 验证。

这一版脚本预期 12 项／8 张图，SHA256 为 `0d8222724e7f76414888e763a26634761ffcf8fa4494f5d77ff4384c259d1f88`。Node 语法、Biome 和空白检查已通过；**上述最后两项修补仍等待主代理统一构建后的 Windows 实跑，本文件不把尚未执行的断言记为通过。**
