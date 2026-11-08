# HUANDENG v0.9 Spec — 中英文、智能排列、Story Plugin

日期：2026-11-08（Australia/Sydney）。依据AUDIT-V09，负责人复审后批准实施。结果另记Implementation/Validation。

## 1. 中英文编辑器

- 支持en/zh-CN。桌面preferences.uiLocale为权威，首次系统zh*→zh-CN、其他en；浏览器独立偏好。窄preload接口同步菜单/欢迎页/React。初始化后首次挂载。
- 切换不改组件key、页面身份、输入草稿、选区、Undo，不重开服务/写文稿。用户标题、正文、Story、备注、步骤名、路径、字段和error code不翻译。占位内容只按创建时语言生成。
- 共享typed catalog、命名插值、locale日期/数量。完整覆盖主面板、动画、Story、素材、项目、历史、检查、导出、帮助、默认系统标签和aria。未知外部错误保留细节。
- 语言入口English/简体中文，现有按钮样式，不叠顶栏。英文1040×680核心按钮不重叠/页面不横向溢出。

## 2. 智能辅助线与排列

- 默认开启、画布工具区明确开关、偏好不入PPTD；Alt临时绕过。
- 手势开始冻结参考框；根选区执行；排除后代/相关祖先。旋转以可见AABB求平移，不改变真实尺寸/角度。
- 阈值5屏幕像素，随scale换算；Shift另一轴delta与导线均不受吸附改变。
- 边/中心加两对象之间等空隙、延续已有空隙；候选不重叠且正交有关联；择最近位移，平局边/中心优先，次序稳定。间距端点/数值保持屏幕尺寸。
- 未旋转resize只吸附拖动边/角，对边固定、最小尺寸8、锁比例成立。旋转resize保持原行为，不显示错误导线。
- 六向对齐明确“所选对象/幻灯片”；单选以幻灯片。横纵分布至少3根对象、端点保持、空隙均匀，复用distributeRects。
- 一次手势/排列一次提交和Undo，Esc取消恢复；辅助线只在手势中，不动动画/素材/未知字段。

## 3. HUANDENG Plugin

- 共用Story skill：意图/受众/证据→上下文与保留约束→页面/点击讲解计划→精确修改预览→按已有授权apply→读取/渲染检查→重要阶段版本。复用四层Story/occurrence，不生成平行叙事库。
- MCP instructions/resources与operation参考；Claude/Codex/DSH适配同一stdio服务。DSH用实际官方CLI、隔离配置补丁，不新建执行器/Vault注册。ChatGPT通过既有DC-WALT CLI，不公开服务。
- 新huandeng_preview/CLI preview读当前文件，复用原规划校验，任何persistence/history/checkpoint之前返回request hash、baseline、页/对象/字段/元数据/manifest变化、创建数量及诊断。无opId、无保存成功假象；新页最终身份以apply为准。预览大小限制和截断明确。
- huandeng_apply/CLI可附previewHash，要求transaction一致；原writer重查CAS、幂等、恢复，拒绝篡改和陈旧preconditions。旧接口兼容；hash不是审批。先做对话审阅，本轮不建GUI审批队列。
- 提供配置生成/诊断与合成Story任务。真实DSH至少brief、preview、apply、独立核查结果。各客户端分别标配置验证/实际连接/完整任务，不能混称。
- Plugin随桌面包携带；项目面板及原生菜单提供“连接 Agent”，为当前项目生成可复制配置。使用安装包自身的Electron Node模式，不要求用户另装Node。只读配置生成，不覆盖客户端设置、不把生成配置显示为已连接。

## 4. 分工

- i18n agent：语言基础、业务组件、desktop；不改huandeng.tsx/editor-canvas.tsx。Inspector可改，root后接排列组件。
- snapping agent：geometry与测试、PPTD适配、editor-canvas、独立排列/吸附组件；约定翻译API，不改路由/Inspector。
- plugin agent：plugins/huandeng、后端preview/原writer窄扩展、MCP/client/CLI/HTTP/types与相关测试；不改前端/desktop。
- root：总审计/规格、huandeng.tsx翻译和集成、复审实现、定向桌面/客户端验收、打包安装/重要私有里程碑。

## 5. 聚焦验收

1. 新规则单测：字典/占位符/偏好/内容边界；组/轴锁/AABB/gap/resize/分布；preview无写/hash/CAS/兼容/幂等。一次常规unit/typecheck/Biome/build。
2. 隔离桌面项目：切语言保草稿/选区；英文小窗口；主面板可达；50%/100%拖动、Alt/Shift/Esc、组/旋转/resize、对齐/分布、Undo、保存重开。点击动画回退短回归，不写科研原件。
3. 真实DSH合成任务，独立核查预览无写和apply结果；标准MCP/skill/config覆盖其他适配，不冒称完整客户端任务。
4. 0.9.0正式桌面包，正常关闭/安装/恢复入口，保留旧包与用户未提交源；Release/Handoff后一次重要private-origin同步。不得npm/upstream/Issue评论/公开服务。

主要精力用于功能；验证按具体风险，失败定位后只补必要检查。已有长会话和视频全矩阵不作为无关重复门槛。
