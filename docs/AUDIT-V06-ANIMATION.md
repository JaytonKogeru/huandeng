# HUANDENG 动画与时间线审计

日期：2026-11-08（Australia/Sydney）。基线：v0.5，运行时 `03a96957`、文档里程碑 `ef80f5b`。下文区分现状、调查与下一阶段设计；实现结果由后续验收记录确认。

## 产品判断

采用 PPTD 原生声明式时间线，以现有 React 对象渲染器按指定时间采样。完整链路应覆盖选择对象、建立属性轨道、添加/移动/删除关键帧、调整数值与缓动、拖动播放头、播放、保存重开、撤销和实际放映。只有 CSS 入场效果或只读播放器不足以满足用户的编辑目标。

## 当前实现

| 层次 | v0.5 实际情况 | 依据 |
| --- | --- | --- |
| 界面动效 | 已有按钮/菜单反馈，不等于页面内容动画 | `packages/core/src/app/styles.css` |
| PPTD 模型 | bounds、rotation、opacity 为静态属性，无受支持的关键帧 schema | `packages/core/src/pptd/types.ts`、`codec.ts` |
| 旧动画字段 | 未知字段保留；页复制扫描 page/element.animations 中的部分目标引用并重映射 | `packages/core/src/pptd/store.ts` 的 `referencePaths` |
| 渲染与放映 | PPTD renderer 没有时间参数，放映仅切页与备注 | `components/pptd/renderer.tsx`、`routes/huandeng.tsx` |
| 导出 | page.animations 非空会报告 ANIMATIONS_NOT_EXPORTED，输出静态内容 | `packages/core/src/pptd/export.ts` |
| 上游 TSX | 有 SlideTransitionLayer/morph，未接入 HUANDENG PPTD | `app/lib/transition.ts`、`app/components/slide-transition-layer.tsx` |
| 图表 | ECharts 显式关闭自身动画 | `packages/core/src/pptd/chart-options.ts` |

结论：PPTD 内容动画尚未实现。旧未知 `animations` 必须保留，新 schema 独立标识版本，不能自动误解释或覆盖旧数据。

## 开源方案调查

以下仅使用官方仓库、文档和标准。维护情况为调查时公开状态。

| 方案 | 实际能力、许可及维护 | 对 HUANDENG 的判断 |
| --- | --- | --- |
| Motion Canvas | TypeScript generator 与自有二维场景；实时预览、time events、beginSlide 等待 Space；图片序列/FFmpeg exporter。MIT。官方 release 页展示稳定 3.17.2（2024-12-14）及 3.18.0-alpha.0 | 借鉴叙事 cue 和确定帧输出。TSX 并非现有 React DOM 对象模型，直接替换需重建科研对象渲染；release 间隔本身不能证明停止维护 |
| Theatre.js | 多轨关键帧、数值、缓动/曲线、循环；可驱动 React/HTML/SVG 和任意 JS 数值。core 为 Apache-2.0，Studio 为 AGPL-3.0；官方说明 1.0 暂在私有仓库开发 | 关键帧交互值得参考。嵌入 Studio 需处理许可、独立 project/localStorage 状态和 Undo 与 PPTD writer 的衔接 |
| Remotion | React 按帧渲染、插值、Player、视频。当前 Studio 有交互属性/关键帧显示；Starter 提供轨道/画布/素材组件。专门许可，Starter 另需购买和许可 | 官方 Starter 缺失清单仍列 keyframing/animation、transitions、auto-save；不能当现成开放许可动画编辑器。借鉴纯时间采样 |
| Slidev | Markdown/Vue、click step、motion、过渡和网页放映。MIT；官方文档当前 v53.1.0 | 借鉴点击叙事和逐 step 导出。Vue/Markdown 不适合替换当前自由画布；静态 PPTX 不保留原生动画 |
| reveal.js | fragment、跨页 Auto-Animate、备注与播放 API；6.0 有官方 React wrapper。MIT；release 页展示 6.0.2 | React 集成真实存在；值得借鉴放映与对象匹配，但不提供自由画布的关键帧编辑 |
| Motion / Web Animations | Motion 为 React/JS 动画库，核心 MIT；浏览器动画 API 支持时间、暂停、seek、速度 | 可作为后续执行层；本轮有限数值属性采用纯采样，暂不新增运行时依赖 |

官方依据：

- Motion Canvas：[介绍](https://motion-canvas.io/docs/)、[time events](https://motion-canvas.io/docs/time-events/)、[Presentation](https://motion-canvas.io/docs/presentation/)、[渲染](https://motion-canvas.io/docs/rendering/)、[仓库/MIT](https://github.com/motion-canvas/motion-canvas)、[releases](https://github.com/motion-canvas/motion-canvas/releases)。
- Theatre.js：[关键帧](https://www.theatrejs.com/docs/latest/manual/sequences)、[项目状态](https://www.theatrejs.com/docs/latest/manual/projects)、[仓库/许可](https://github.com/theatre-js/theatre)。
- Remotion：[动画采样](https://www.remotion.dev/docs/animating-properties)、[Starter](https://www.remotion.dev/docs/editor-starter)、[缺失功能](https://www.remotion.dev/docs/editor-starter/features-not-included)、[许可](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)。
- Slidev：[动画](https://sli.dev/guide/animations)、[导出](https://sli.dev/guide/exporting)、[仓库/许可](https://github.com/slidevjs/slidev)。
- reveal.js：[Auto-Animate](https://revealjs.com/auto-animate/)、[官方 React](https://revealjs.com/react/)、[仓库/许可](https://github.com/hakimel/reveal.js)、[releases](https://github.com/hakimel/reveal.js/releases)。
- Motion：[时间值](https://motion.dev/docs/react-use-time)、[核心许可](https://github.com/motiondivision/motion/blob/main/LICENSE.md)；W3C：[Web Animations](https://www.w3.org/TR/web-animations-1/)。

## 数据与编辑契约

`.page` 内增加独立 `timeline:{schemaVersion:1,durationMs,tracks,cues?}`。每条轨道含稳定 `id`、`targetId`、`property`、`keyframes`；关键帧含稳定 `id`、`timeMs`、`value`、`easing`。cue 含 `id`、`timeMs`、`label`。播放头、选中轨道和面板状态不写入页面。原 `animations` 不迁移。

属性为 x/y（叠加祖先组动画之前的画布绝对坐标）、rotation（绝对角度）、scaleX/scaleY（相对基础尺寸倍率）、opacity（绝对 0–1）。旋转保留多圈含义。easing 作用于该帧到下一帧，提供 linear、ease-in-out、hold；其中平滑曲线明确使用 `u²(3−2u)`，不依赖浏览器对 CSS easing 的解释。帧前/帧后保持端值。同 target/property 唯一，时间严格递增，同轨不可重时；有限数值、目标、比例、时长和数量都有验证边界。未知 schema 保留并报告，不变成空数据后覆盖。

普通画布/缩略图使用基础版式；显式 previewTimeMs 才采样，退出恢复基础版式。作者清楚区分布局与关键帧。播放和 scrub 不写文件、不生成 Undo；关键帧拖动结束提交一次动作，Esc 取消；数值、增删、时长变化进入原事务历史。

动画属于稳定 pageId；重复出现的播放状态由 occurrenceId 区分，进入新 occurrence 重置。固定版本引用读取归档时间线。后续每次出现可保存播放范围/cue 选择；正文、高亮布局或运动路径不同则建立明确页面变体，避免每个引用复制完整关键帧。页间 morph 另需显式对象关联，不按标题或位置猜测科研素材对应关系。

## 实现接口与风险

| 部件 | 落点 |
| --- | --- |
| 模型/采样 | 浏览器与 Node 共用纯模块；基础页、时间线、毫秒时间决定输出，原数据不变 |
| Renderer | 可选时间参数，复用现有科研对象；仅当前页采样，不按帧刷新整份快照 |
| 时间线 | 对象/属性轨道、刻度、播放头、关键帧；增删/拖动/数值/缓动/播放暂停/起点/时长/cue，键盘焦点清楚 |
| 事务 | page.timeline.set；null 删除；page revision、现有 writer/journal/inverse；不另建保存源 |
| 复制/删除 | 页复制重映射 targetId；对象删除同步清理轨道或拒绝悬空引用 |
| 组合 | 当前为平面 children 与烘焙几何，组运动必须传播到成员；每个对象先在原页面坐标内采样，再叠加祖先组的动画增量，子透明度乘祖先动画透明度；轨道数组顺序不影响结果 |
| 版本 | `.page` 随 checkpoint 归档，固定 Presentation 引用还原旧时间线 |
| Agent | inspect 返回同 schema；apply 走同事务；指定时间取图帮助调整节奏，无任意 JS 执行 |
| 生命周期 | 切页/occurrence、面板关闭、卸载清理 RAF；缩略图不自动播放 |

W3C 时间模型和 Remotion 官方建议支持按给定时间确定画面。自由运行 CSS transition 难以保证任意 seek 和逐帧导出一致；纯采样是针对本项目有限属性的实现判断。[W3C](https://www.w3.org/TR/web-animations-1/) [Remotion](https://www.remotion.dev/docs/animating-properties)

演讲 cue 应在指定时间暂停，下一次推进到下一 cue，最后换页；倒退恢复上一 cue 的确定状态。减少动态效果可直接显示 cue 结果而保留叙事顺序。Space/方向键只作用于相应播放上下文，不抢文本和普通画布编辑。

## 导出边界

| 输出 | 策略 |
| --- | --- |
| PNG/PDF | 明确基础版式或指定时间，等待字体/图片/图表就绪；不截取后台偶然播放状态 |
| PPTX | 首版静态导出并报告展平；指定时间可先采样冻结快照，再走原生/回退链路 |
| 图片序列/视频 | 冻结页/素材后逐帧采样，独立任务支持进度、取消和清理；编码器与音频同步另行实施 |
| 原生 PowerPoint 动画 | 逐步映射显隐、移动、旋转、缩放及触发关系；生成 timing tree，并在真实 Office 放映验证 |

PowerPoint 格式支持 p:timing、p:animMotion，原生导出是工程工作；XML 存在或文件能打开不足以证明播放等价。[Timing](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.presentation.timing?view=openxml-3.0.1) [AnimateMotion](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.presentation.animatemotion?view=openxml-3.0.1)

Slidev 逐 click 静态导出可以作为分享层参考，与原生动画保留区分。[Slidev 导出](https://sli.dev/guide/exporting)

## 验收与后续

1. 起/中/终点、hold、平滑、多圈旋转、反向 seek、一致性与原页不变；父组/子对象混合顺序确定。
2. 文字/原图/形状多轨增删拖动、数值/时长/曲线、保存重开、Undo/Redo。
3. 重复 occurrence 独立播放、页复制目标重映射、固定版本、删除轨道完整性。
4. 非法时间、NaN、未知版本、孤儿目标和重复轨道可理解；外部更改与发送后输入保留，CAS 不变。
5. 时间线焦点的播放/逐帧有效，文本/数值/IME 不触发全局快捷键，Esc 取消拖动。
6. 80 页仅当前页播放，scrub 无 mutation，停止/切页清理；记录多对象动画帧耗时。
7. 静态输出与指定时间可复核，报告展平且原稿不变；视频/原生动画各自独立验收。
8. DNA TT PPTD 使用副本抽取图片/公式/组合页；m6A PPTX 先查原生动画和对象结构作行为对照。对照不等于完整 PPTX 导入已实现。

v0.6 目标为可保存关键帧、可操作多轨时间线、采样/放映、Undo、复制/版本与静态导出边界。后续依真实场景扩展自动关键帧、路径/曲线、演讲专属播放参数、音视频轨/波形、确定帧视频和原生 PPTX 动画。静态编辑继续保持直接稳定。

## 实现检查记录（2026-11-08）

`animation-model.ts` 提供严格验证、轨道插值和纯时间仿射采样。`renderer.tsx` 只在有限数值的显式预览时间下编译时间线，编译缓存依赖页面内容与预览开关；逐帧只采样，普通画布和缩略图不编译。对象内容保持基础尺寸，外层矩阵负责整体运动，避免动画缩放重新排版文字或图表。旧组合的烘焙几何仍保持原样，组动画增量传递到成员。

`timeline-panel.tsx` 实现属性轨道、增删关键帧、拖动、时间/数值、三种缓动、时长、播放头、播放/暂停和演讲步骤。位置和角度直接编辑；缩放与透明度以百分比显示。每次完整编辑动作通过原页面 revision 提交。输入错误保留原始文字并保持未保存状态；复制草稿包含来源身份、原 revision、时间线和未确认输入，不包含其它页面。失去保存回执后，只有新 revision 的已保存时间线与本地草稿完全一致、且没有未确认输入或拖动，才确认该草稿已保存，不另交事务。外部出现未知版本时保留当前编辑器实例和草稿。

Linux 上模型与 Renderer 集成共 14 项单测、核心 TypeScript 和这组文件的 Biome 已通过。覆盖组/子混合轨道、嵌套组、旋转与非等比缩放、零缩放、透明度、端点/hold、重复时间、无效数值、未来版本静态读取、预览和基准渲染分离、素材 revision 以及键盘名称。Linux 浏览器启动被 Unix socket 环境权限拒绝，因此没有将本地浏览器检查写为通过。

### Windows 源码候选：15/15 通过

`scripts/verify-animation-v06.mjs` 已在 THUG 的独立 Electron 源码候选运行，使用合成项目和独立 profile/runtime。报告时间为 `2026-11-07T16:40:03.860Z`，源报告文件为 `.verification/animation-v06.json`。本轮结果属于源码候选，尚不是最终发行包或安装目录的验收。

| 证据 | 结果 |
| --- | --- |
| 实际操作检查 | 15/15 通过 |
| Renderer 错误 | 0 |
| 进程正常关闭 | 两次均为 exit code 0、signal null，含关闭后重开 |
| GUI 变更请求 | 记录 33 次，包含重试、撤销和重做；不等于 33 个独立提交 |
| 丢失保存回执 | 服务已写入后丢弃响应，原 request 重试成功；同一 request 的历史只有一条 |
| 未涉及的页面 | 两个合成兄弟页字节保持不变 |
| 视觉检查 | 时间线、放映与 1024×768 深色/减少动态效果截图已检查；结构清楚，无整页横向溢出 |

覆盖默认插入对象后立即建轨、多属性关键帧 CRUD、时间/数值/三种缓动、播放与 scrub 不改基础版式、一次拖动的一次事务及 Undo/Redo、Esc 取消、cue 编辑、保存后重开、固定版本只读预览、cue 前进/后退和重复 occurrence 从零播放。未来 schema 静态可读；编辑期间出现未来 schema 或来源页面被移除时，原草稿和未确认输入仍能复制，只有明确还原才清除。

首轮在第一个用例失败，失败收据和截图保存在 `.verification/v06-animation-round1`。文件实际已写入，但全局保存状态把动画预览期间的禁编状态标成“只读模式”，导致等待“已保存”超时。修复将项目只读与动画预览分开判定；验收仍保留真实文件与保存确认检查，没有放宽通过条件。首轮失败不计为通过。

下一门槛是在干净源码提交后构建最终发行包，并使用该包独立重跑。源码候选的通过记录不能替代最终包验收。
