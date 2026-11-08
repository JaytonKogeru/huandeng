# v0.9 中英文界面专项审计

日期：2026-11-08（Australia/Sydney）。状态：供负责人复核，未批准实施；本文件没有把建议计为已交付。

## 结论

HUANDENG v0.8 没有可用的中英文切换入口。OpenSlide 基础已经有完整的 typed locale store、字典、`format` / `plural` 和语言切换控件，应该复用这些设计与工具，不引入另一套大型 i18n runtime。真正工作量是把 HUANDENG 的产品界面、非 React 提示和 Electron 桌面入口接齐，并让切换不改变文档、选择、动画草稿和当前工作区。

## 先学习及取舍

1. [React useSyncExternalStore](https://react.dev/reference/react/useSyncExternalStore)：订阅外部偏好时，snapshot 必须稳定；只有语言真正变化才通知订阅者。UI 切换是 React 更新，不通过改根节点 key 重新挂载。
2. [react-i18next useTranslation](https://react.i18next.com/latest/usetranslation-hook)、[i18next configuration](https://www.i18next.com/overview/configuration-options)、[interpolation](https://www.i18next.com/translation-function/interpolation)、[plurals](https://www.i18next.com/translation-function/plurals)：资源、回退、插值、复数和语言事件应集中处理。这里只需要离线简中与英文，不需要 HTTP 资源后端或语言切换时 Suspense。现有 typed dictionary/format 已覆盖基本需求；保留扩展接口，避免为 2 种语言新增重复依赖。
3. [Electron app locale](https://www.electronjs.org/docs/latest/api/app#appgetlocale) 与 [context isolation](https://www.electronjs.org/docs/latest/tutorial/context-isolation)：主进程提供持久化语言偏好，preload 只暴露 `getLocale/setLocale/onLocaleChanged` 这类固定接口，继续采用现有 main-frame 检查；不暴露通用 IPC。
4. 阅读 `docs/research/V07-UI-REVIEW.md` 的 Taste-Skill、Carbon、WAI 复核记录。沿用当前中性色、细线和短反馈，语言入口用现成菜单；这轮不以国际化为由换肤或叠加顶栏。英文长度要用真实小窗口检查，不能靠缩小字体掩盖。

## 已核对的代码事实

| 范围 | 证据 | 判断 |
| --- | --- | --- |
| 上游语言基础 | `src/app/lib/locale-store.ts`、`use-locale.ts`、`src/locale/{types,format,en,zh-cn}.ts` | 有 5 个上游语言、localStorage 和 useSyncExternalStore。HUANDENG 产品只承诺 en / zh-CN；不能展示未经翻译的其余语言 |
| 静态构建 | `packages/core/scripts/build-editor.mjs` | 已注入 `virtual:open-slide/config`，默认 zhCN。可复用，无需创建第二个配置系统 |
| HUANDENG entry | `main-huandeng.tsx`、`routes/huandeng.tsx`、`huandeng.html` | 入口和业务文案硬编码中文；ThemeToggle 已间接使用旧 locale，业务编辑器未接线 |
| 中文覆盖量 | 对生产 TS/TSX 的 CJK 行计数 | 33 个 app 文件共 967 行含中文；不是独立 message 数。PPTD 共享模型 13 个文件共 123 行；桌面 5 文件共 73 行。总计 51 个文件 1,163 行，含示例/用户新建内容等需区别处理的字符串 |
| 最大界面 | `huandeng.tsx` 152 行；`project-panel` 86；`build-panel` 84；`timeline-panel` 75；`inspector` 73；`science-inspector` 49；`page-history` 50 | 只翻译主工具栏会留下多数实际操作未完成 |
| 桌面偏好 | `packages/desktop/project.cjs` 的 read/writePreferences，`main.cjs` 的 context/menu/registerIpc | 当前无 locale。编辑服务 URL 可变，web localStorage 不能作为跨项目和重开的唯一持久源 |
| 开始页与菜单 | `welcome.{html,js}`、`main.cjs` | 打开、新建、最近项目、日期、About、错误对话框均为中文；都应一起切换 |
| 非 React 文案 | `pptd-keyboard.ts`、`pptd-element-label.ts`、`pptd-insertion.ts`、`pptd-document.ts`、`pptd-backend.ts` | 包含静态帮助数组、对象类型默认名、初始文字及保存/冲突错误。常量在模块加载时翻译会变成切换后的旧文本 |
| 字段状态 | `property-fields.tsx`，inspector 的 `key={label}`，Build/Timeline 的本地 draft | 字段本身依赖 value，语言变化不应作为 reset 条件；映射数组用稳定字段 ID 或原 message key 作 key，不能用翻译结果 |
| 动态显示 | `page-history` / `project-panel` / `design-intent-panel` 的 toLocaleString；welcome 固定 zh-CN | 需按界面 locale 格式化显示时间，持久 ISO 时间不变；数值编辑继续用现有文档单位/小数解析 |
| 后端提示 | `PptdClientError`、PPTD diagnostic code + message、导出 warnings | UI 应本地化已知应用提示，保留错误 code 和原始外部细节；不把 path、元素名字或任意文件内容送进替换器 |

## 推荐实现规格

### 1. 字典和订阅

新增 HUANDENG 专用 typed en / zh-CN message catalog，覆盖全部 PPTD 用户界面。可复用现有 `format` 与 `plural`，提取/复用已有 store 的订阅逻辑；HUANDENG 独立的两个语言选项与偏好 key 不改变 OpenSlide 的五语言公开 API。若继续直接使用旧 store，单元测试须有明确 virtual config 适配，不把浏览器 store 引入纯文档服务。

允许采用有类型的源文案 key，避免 1,000 处无意义命名迁移；动态内容用命名占位符而不是拼接已翻译句子。React 显示使用 `useHuandengLocale()`，纯函数接收 locale 或在显示边界调用纯 translator。不要扫描/修改 DOM textContent，不给整个 editor 加 `key={locale}`，不对文档 JSON 做全局字符串替换。

对只包含 en / zh-CN 的复数，使用 one/other（中文两种相同）或明确的 `count` 模板。`Intl.DateTimeFormat` 与 `Intl.NumberFormat` 只负责显示，不改 .page 里的数字、坐标和 ISO 时间。`document.documentElement.lang` 跟随偏好。

### 2. 持久化与启动

桌面以 `preferences.uiLocale` 为权威。`getLocale` 返回已保存 en/zh-CN；首次根据 app.getLocale 归一化（zh* → zh-CN，其余 → en）。浏览器模式使用 `huandeng:ui-locale` + navigator.languages，保留已有有效偏好；没有可探测语言的测试/离线环境可采用既有中文默认。

React 初始挂载前完成本地 locale 初始化，避免每次打开先显示中文再闪成英文。改变语言只更新偏好与订阅；native menu 重新 build，开始页用相同 locale；项目服务与文稿不重启、不重新请求打开。IPC 仍校验当前 main frame，仅接受 en 或 zh-CN。保存失败应留下明确提示，不能将未保存偏好说成重开可保留。

语言入口放在现有顶栏设置动作附近，菜单两个选项固定显示 `English` / `简体中文` 并标识当前值。桌面 View / Language 子菜单也可切换，欢迎页提供相同入口；普通 select/menu 原生键盘语义不变。

### 3. 内容边界

翻译：工具栏、导航/集合的系统名称、属性、素材状态、Story/项目编排、版本历史、键盘帮助、动画效果/触发/预演、导出、检查、保存与冲突行动、无文稿页面、欢迎页、桌面菜单和应用自身错误。

不翻译：用户项目/页面/Section/Presentation 标题、正文、Story 记录、备注、步骤自定义名称、素材名与路径、用户定义对象名、错误 code、schema/operation ID、CLI/MCP wire 字段。语言切换本身不得产生 writer transaction 或更改任何 .pptd/.page。

新插入的“输入文字”等占位内容可以按创建时语言生成，一旦创建即视为用户文稿内容；以后切换不追改它。生成的步骤默认名优先作为显示回退，不写回文档。

共享模型中的 shape/chart 中文名称可在 UI 显示边界按枚举映射。后端 diagnostic 使用已知 code 对应译文和原始结构化参数；不能仅以 broad regex 把任意服务输出“翻译”后丢掉技术细节。短期可维护精确已知消息适配，未知错误保留原文并加当前语言的应用前缀。

### 4. 稳定性与视觉

保持现有 component identity、pageId/occurrenceId/versionId、控件 key、选区和本地草稿。语言变化不得触发自动恢复、保存或重开。所有标签/placeholder/title/aria-label 同步，提示内容在显示时取当前语言，避免模块常量与已缓存 useMemo 停留旧语言。

英文下检查 1040×680 的工具栏、属性两列、BuildPanel、ProjectPanel 和 ExportDialog：允许合理换行/截断和明确 tooltip，但核心动作不重叠、页面无横向溢出。语言本身不应让工具栏再增加一行。

## 建议独占分工

- i18n agent：HUANDENG catalog/store/hooks、Language menu、PPTD 组件和相关纯显示 helpers、desktop locale/preferences/welcome/menu、语言专项测试。
- root：`routes/huandeng.tsx` 的其他业务改动与集成，帮助分摊此大文件的文字接入，避免与新吸附/Plugin 入口同时覆盖。
- snapping agent：保持 editor-canvas 行为实现权；i18n 提供 t/locale 接口和所需 labels，再协作接入其 11 行文案，不直接争抢文件。
- plugin agent：不得因工具语言同步改写 document data 或 MCP field IDs；新产品 UI message 使用同一 catalog。

## 聚焦验收

1. catalog 中英文键/占位符匹配、插值不会解释 HTML、数字/日期 locale 正确；错误/缺失 key 有可追踪行为。
2. 运行中的中文 → English → 中文，覆盖 header、menu、inspector、assets、Story、animation、export、help。检查 `html.lang`、可访问名称、完整英文界面无遗留系统中文（用户文稿可含中文）。
3. 同一页保留 selection、未保存 Story/图表/步骤草稿和激活字段；切换前后文稿 bytes/revision 不变，无写请求。用合成内容，不操作科研原件。
4. 桌面改变 locale 后正常重开、切换项目、回到欢迎页均保持；菜单与 renderer 一致。另测 browser localStorage 模式与非法旧偏好回退。
5. 英文小窗口与中文已有尺寸各取一张真实截图，检查输入与按钮可见。只运行相关基础/组件测试与一次代码门槛，不复制上一版 15 组无关长跑。

## 本次证据限制

这是代码与一手资料审计，尚未运行新语言版本、桌面菜单或截图；所有行为规格都尚待负责人批准。没有修改产品代码、用户数据或 Windows 安装。

## 批准后的实施记录（v0.9）

负责人按 `SPEC-V09.md` 批准实施后，本分支已完成语言通道与编辑器接入。以下是实施事实，不改变上面的初始审计结论。

- `locale/huandeng.ts` 合并 Editor、Route、Arrangement 与 Service 诊断词表。React 接入使用 `lib/huandeng-locale.ts` 的 `useHuandengLocale()`；非 React 的显示 helper 使用 `uiText()`。独立 locale store 使用 React 原生 `useSyncExternalStore`，每种语言提供稳定的 `t/date/number/setLocale` 对象，没有增加 i18next 依赖。
- Editor catalog 含 901 条既有中文来源文案；独立 system catalog 为 349 条既有英文服务诊断提供中文显示译文。另补英语来源的图表系列、通道、图标风格等界面文字，Route 与 Arrangement 由对应负责人维护词表。
- 工具栏、属性、图层、素材库、文件树、页面历史、Story、主库/演讲编排、步骤编辑、时间线、演讲放映、导出、技术检查、键盘帮助的可见文字与可访问名称已接入显示边界。共享 ThemeToggle 使用既有 OpenSlide locale store，由入口同步。
- 已保存的自定义对象名、标题、步骤名、备注、数据列名和路径保持原值。新建的占位正文、章节标题、演讲标题与 Cue 标签按创建时语言产生；此后作为文稿内容保留。没有持久化自定义标签的默认步骤名，由 `pptd-animation-label.ts` 按当前 UI 语言显示。旧 Cue 里已保存的默认中文标签也保留，不猜测它是否由用户修改。
- 语言偏好首先使用桌面主进程的 `preferences.json`；浏览器独立模式使用 `huandeng:ui-locale`。没有偏好时跟随系统/浏览器：中文使用简体中文，其他语言使用 English。`html.lang` 同步更新，首次渲染等待桌面语言读取完成。
- 桌面菜单、欢迎页与原生应用提示已双语化。主进程先确认偏好写入成功，再更新菜单、窗口标题并通知 renderer；写入失败保留旧语言。相同偏好文件同时保留 snapping、最近项目与窗口设置。窄 IPC 接口继续使用已有 main-frame 验证。
- 语言入口采用标准 radio menu，两个选项保留原生语言名称 English / 简体中文。切换不改变 React tree key，也不调用文稿写入接口。
- 对既有服务已经插值的错误，只识别完整的已知消息模板。匹配器按固定文本从左到右消耗输入，限制消息长度与嵌套深度，不对外部错误运行通配正则回溯。只有明确列出的系统标签参数递归本地化；用户名称、路径、ID 与其他参数原样保留。未知库/操作系统错误保留原始技术信息。
- 数值通过 `Intl.NumberFormat`，日期通过当前 locale 格式化；少量完整计数句提供明确的英文单数形式。文稿与协议中的数字保持原值，输入解析不随界面语言改变。

### 本分工的聚焦验证

语言词表占位符一致性、字面 UI key 覆盖、完整动态错误/嵌套错误转换、单复数、日期格式、浏览器偏好保存失败、桌面偏好来源与单次订阅、用户标签不翻译、页面字节不变与无写入、桌面偏好 round-trip 合计 10 项新增测试；既有动画入口 5 项一并通过。

命令：

```sh
node node_modules/vitest/vitest.mjs run --project unit packages/core/src/locale/huandeng.test.ts packages/core/src/app/lib/huandeng-locale.test.tsx packages/desktop/locale.test.ts packages/core/src/app/components/pptd/animation-panel.test.tsx
node packages/core/node_modules/typescript/bin/tsc -p packages/core/tsconfig.json --noEmit
```

本分工修改的 44 个文件通过 Biome。真实 Windows 中英文小窗口、选择/脏草稿连续性、native menu / welcome / reopen 与 Agent 入口由负责人在最终集成版本上复核；本记录不把服务端渲染测试称为真实桌面验收。
