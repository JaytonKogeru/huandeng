# HUANDENG v0.9 Implementation

日期：2026-11-08（Australia/Sydney）。依据 [AUDIT-V09](AUDIT-V09.md) 与 [SPEC-V09](SPEC-V09.md)；实际验收另记 VALIDATION-V09。

## 中英文编辑器

业务组件、主路由、属性和科学对象、项目/Story、素材、版本、动画、预演、放映、导出、帮助，以及桌面欢迎页/菜单均接入语言层。复用现有格式化工具与 React 外部 store，不增加 i18next 或网络语言包。静态消息直接查询；旧服务已插值诊断只匹配完整已知模板，路径、对象名称和文稿文字不作通用替换。

桌面偏好是权威来源；首次按系统语言选择，之后由顶栏、原生菜单或欢迎页更改。保存成功才广播，失败恢复旧值并报告；随机服务端口不会丢失语言。初始化在 React 首次挂载前完成，共享 ThemeToggle 同步既有 locale store。浏览器模式使用独立 localStorage。

切换语言不更换组件身份、不翻译已有标题/正文/Story/步骤名、不创建文稿事务。占位文字、新章节/演讲名称与 Cue 按创建时语言生成，之后作为作者内容保留。没有自定义名称的动画步骤在显示时生成本地化回退标签。

首轮实际截图发现英文侧栏导航按钮超出边界，负责人改为等宽文字标签；顶栏和导航继续保持单行。

## 智能辅助线与排列

复用现有 pointer capture、取消、草稿、组变换与事务路径，新增纯几何规则和 PPTD 适配层，不替换完整交互框架。

- 手势开始冻结参考框，移动根选区，排除其成员和相关祖先，修复组合对自身吸附。
- Shift 先按住再拖动时保留选区；只有单击才取消选中。吸附不修改锁定的另一轴。
- 对齐、移动及分布使用旋转后的可见外框，保持真实尺寸和角度。
- 等空隙包括两个邻居之间及延续既有间隔，显示端点和距离。阈值为 5 个屏幕像素，随缩放换算。
- 未旋转 resize 保持固定对边、最小尺寸和比例约束；旋转 resize 保留原行为，不显示错误辅助线。
- 属性面板提供选区/幻灯片参照、六向对齐及横纵均匀分布；至少三个根对象才启用分布。
- 组合排列先计算全部变换，再统一更新草稿和提交，保留一次操作一次 Undo；Esc 恢复原草稿，Alt 临时关闭吸附。
- 画布吸附开关作为桌面偏好保存，不写 PPTD。

间距候选每轴最多进行 100,000 次候选/遮挡检查；达到预算仍保留完整边/中心参考，不限制文稿对象数量。此边界不代表数小时性能结论。详见[专项实现](notes/V09-SNAPPING-IMPLEMENTATION.md)。

## Story Plugin 与修改预览

提取既有 writer 的准备阶段作为共同实现。preview 在持久化、external observation、历史/receipt/checkpoint 和 commit event 之前返回 baseline、具体字段/文件/页面变化、复用关系、诊断及截断信息；新页预览身份只是临时值。apply 可携带相同 payload 的 previewHash，之后仍执行原 CAS、幂等、恢复及 Undo。旧接口保留，hash 绑定内容而非审批。

新增 `huandeng_preview`、CLI `preview`、`/proposals/preview` 和 `/proposals/apply`。MCP 提供 18 工具、Story/operations 两个 resources 与 server instructions。共用 `huandeng-story` skill 贯通受众/意图/证据、保留约束、页面与点击讲解计划、精确预览、按授权应用及读取/渲染检查，继续使用现有四层 Story 和 occurrence。

插件含 Codex/Claude/portable manifests、DeepSeek 官方 Cordis patch、配置生成器、SDK doctor 与合成示例，随桌面包携带。项目面板和原生菜单打开“连接 Agent”，为当前项目生成可复制配置。配置绑定当前安装 core，不受旧 `HUANDENG_CLI` 环境值影响；使用安装程序自身 Electron Node 模式，无需另装 Node。生成器不覆盖客户端设置，界面明确区分配置生成与实际连接。

首轮小窗口截图显示默认弹窗断点限制宽度，复制按钮落在初始可视边缘；负责人调整明确的桌面弹窗宽度和高度边界。真实官方 DeepSeek Harness 已完成合成 Story 任务并独立核对保存重开；Codex 原生配置解析、Claude 原生 plugin validate 分别报告验证层级。ChatGPT 使用已授权 DC-WALT 调用相同 CLI，不冒称新增账号连接器。详见[专项交接](notes/V09-PLUGIN-IMPLEMENTATION.md)。

## 后续顺序

先改善创作空间及必要对象操作：可调工作区、锁定/隐藏、精细图层、交互裁剪及文字段落；随后推进独立演讲者工作区、计时和彩排，再做受控媒体和演讲实例视觉变体。原生 PPTX 动画另设 Office 放映验收。标尺/手工参考线、评论、科学组件注册、高级统计及完整 PPTX 往返仍未完成。

本轮没有扩展视频路线，也没有根据旧内存差值宣称修复产品泄漏。验证聚焦新功能和共享 writer 的具体风险，未重复上一版长会话/视频全矩阵。
