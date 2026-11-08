# v0.9 对齐吸附与排列审计

审计日期：2026-11-08。依据为已交付 v0.8 的同文件工作树；本记录先做研究和只读代码审计，尚未宣称桌面交互验收通过。最终范围由主代理复审后写入统一 Audit / Spec。

后续状态：负责人已通过 [AUDIT-V09](../AUDIT-V09.md) / [SPEC-V09](../SPEC-V09.md) 采纳实施；实现和聚焦规则验证另见 [V09-SNAPPING-IMPLEMENTATION](V09-SNAPPING-IMPLEMENTATION.md)。本审计保留实施前结论。

## 判断

拖动吸附已经存在，而且页边、页面中心、其他对象的边与中心都有实现。用户需要的工作不应写成“新增从未存在的吸附”，而应补齐其可靠性、入口和精确排列链路。

本轮值得优先完成：修复组合自吸附与 Shift 轴锁失效；按旋转后的可见外框对齐；增加明确的吸附开关；补等间距拖动指示；把现成的平均分布算法接入 PPTD；允许多选时明确选择对齐页面或所选对象。缩放吸附可先覆盖不旋转对象和组合，保留旋转对象的既有精确缩放，不凭不正确的导线承诺支持。

## 先学习的产品规则和可复用工程

| 来源 | 学到的规则 / 现成能力 | 对 HUANDENG 的决定 |
| --- | --- | --- |
| Microsoft PowerPoint 官方支持 [P1–P3] | Smart Guides 为边、中心和等距提供临时指示；可以控制网格与辅助线，Windows Alt 可暂时绕过吸附；对齐选区和对齐整页是两个明确目标 | 保持当前 Alt 习惯；补清楚的开关和参考范围；导线只出现于编辑手势，不写入页面 |
| Moveable Snappable 官方 API [O1–O2] | 可直接使用 React 组件，支持 elementGuidelines、水平/垂直阈值、gap、resize、group、旋转；MIT | 有可用轮子，但它同时管理变换控件和事件。当前编辑器已具备受测的 pointer capture、组合变换、单事务保存与 Esc 撤销。为本轮几个几何缺口替换全套手势层增加集成面，不是最省工作；本轮复用现有求解器，将未来全套变换控件升级再作为独立选型 |
| Excalidraw 原始 snapping.ts / 仓库 [O3–O4] | MIT；区分 point 与 gap，阈值除以 zoom；参考几何可按手势缓存，空隙要求两对象在正交方向重叠 | 借鉴行为和生命周期；不复制其依赖 Excalidraw 元素/场景模型的大模块。HUANDENG 用自身 Rect 和 PPTD 模型独立实现有限几何规则 |
| tldraw 官方 snapping 文档 / 许可 [O5–O6] | 明确区分移动、缩放、间距、handle；阈值是屏幕像素；轴锁进入求解器；组与选区需要过滤；SDK 生产使用有单独许可要求 | 用公开行为文档检查完整性，不引入 SDK，不拷贝源码或改变产品授权 |
| PPTist 主仓库 [O7] | 已列出移动/缩放吸附、选区/页面对齐、等距分布；当前主分支标明 AGPL-3.0 | 借鉴功能组织。此次没有复制其源代码，也不将其当前代码当作可无条件嵌入的依赖 |

本地已有 `geometry.ts` 的 `snapMove`、`alignRects`、`distributeRects`、`resizeRect`，以及旧 React 视觉编辑器的一套吸附开关和 Shift 轴锁处理。优先复用这些代码，新增依赖数应为零。

## 当前代码与可复现缺口

| 项目 | 证据 | 状态 / 影响 |
| --- | --- | --- |
| 基础移动吸附 | `app/components/pptd/editor-canvas.tsx` → `snapMove(..., 5 / gesture.scale)`；`app/lib/inspector/geometry.ts` | 已完成最近边 / 中心匹配、确定性同距取舍，页面外框作为参考。Alt 已可暂停。多选使用联合框 |
| 组合自吸附 | `editor-canvas.tsx` 移动分支仅用 `gesture.elements` 的 id 排除 targets；`huandeng.tsx::patchElement` 会同时移动 descendants | 缺陷：选择 group 时其成员仍为目标，而且跟随 draft 移动。只读 Node 调用当前函数，group `[100,100,200,100]` 向右 3 单位，在自身成员作为 targets 时回到 `delta.x=0` |
| Shift 轴锁 | 先将 dx 或 dy 设为 0，然后 `snapMove` 仍修正两个轴 | 缺陷：当前函数以输入 `{x:50,y:0}`、target y=103、阈值5，实际输出 `{x:50,y:3}`。旧 `components/inspector/inspect-overlay.tsx` 已有过滤锁定轴的正确思路，可复用 |
| 旋转后的移动 / 对齐 | `elementRect` 只读取原 bounds；渲染器实际 `rotate(...deg)`；`grouping.ts::elementExtent` 已有旋转 AABB 算法 | 部分：导线贴原矩形而非旋转后外沿。应复用同一公式，不改对象本身的宽高和 rotation，只以可见 AABB 求平移 |
| 缩放吸附 | resize 分支仅调用 `resizeRect` 和旋转坐标换算 | 缺少。需明确只对正在拖动的边、角吸附，反向锚点不动；锁比例选择一个主吸附轴，不能破坏比例 |
| 等距拖动 | `Guide` 仅为 axis / position / start / end；无 gap candidate | 缺少。应支持放在两对象正中、延续已有间距的两个常用动作，并只展示实际命中的指示 |
| 显式吸附开关 | PPTD 没有 snapping 状态或开关；底栏只有 xl 才出现 `Alt 暂停吸附` 提示 | 缺少；功能难发现。建议常用画布工具区一个 Magnet 切换按钮，按下状态可读，偏好持久化；不要新增顶栏一行 |
| 选区 / 整页对齐 | `alignedBounds` 单选自动整页，多选固定联合框；Inspector 六个按钮没有 reference 控件 | 部分。多选无法整页居中，用户必须分别执行；应显式 reference，单选只提供可用整页语义 |
| 平均分布 | `distributeRects` 有变宽对象等间隙测试；仅旧 `use-visual-editor.ts` 使用 | 算法现成，PPTD 入口缺失。最有价值的直接复用点；至少3个根对象启用水平/垂直分布，端点固定 |
| 分组选择 | layer 可同时选 parent 和 descendant；`selectionRootIds` 已存在 | 拖动与批量排列应以根选区执行，避免成员被重复移动；单独从层列表选组内成员仍允许编辑 |
| 锁定 / 隐藏图层 | PPTD 类型保留 unknown fields，但当前 renderer / UI 没有完整的 locked / hidden 行为 | 未实现，不应在新吸附器里擅自解释未知字段；保留未来的对象保护 / 图层可见性功能，而非宣称完成 |
| 对齐导线 | 已按 actualScale 保持1屏幕像素，并在结束/取消清空 | 可保留；补等距端点与数字时保持屏幕尺寸、低遮挡、不接收指针。无须给几何拖动加插值动画 |

相关保存不变量已经存在：`capturePointerGesture` 为 pointerup 收尾，Esc / pointercancel / lost capture / blur 撤销，画布卸载取消；`onPatch(..., false)` 只更新 draft，`onEnd` 统一提交，`onCancel` 恢复完整 group 字段。新吸附必须留在这个路径，不额外创建服务写入。

## 推荐实施接口与顺序

1. 新增 PPTD 专用几何适配文件，提供元素可见 AABB、根选区、排除选区及其 descendants / ancestors 的参考框。在手势开始冻结静止参考几何，避免移动中的自身目标和每次 pointermove 重建全页引用。
2. 扩展纯几何求解器，保留原 `snapMove` 调用兼容。支持 axes 选项、等距候选；边 / 中心与 gap 按最小位移选用，平局优先直接对齐，取舍与 target 数组顺序无关。间距用空隙长度而非中心距离；排除重叠、负间距和正交无关联对象。
3. 移动使用旋转 AABB 的平移求解，最终只给原 bounds 加统一 delta。Shift 锁定轴的 delta 和导线均不得被吸附改变。Alt 或偏好关闭时输出原始移动且无指示。
4. 不旋转对象的 resize：仅拖动边 / 角有候选；保持既有最小尺寸8、对边固定、Shift / group 固定比例。旋转 resize 暂不吸附，原有旋转缩放仍可用。页面和对象参考共用同一缓存。
5. 接入显式 Smart Guides 偏好和等间距指示；接入 reference 选择与两个分布按钮。中英文案交由 i18n 同一目录管理，不硬编码第二套 UI。
6. 复用共享 writer：一次排列命令 / 一次拖动保持一个 undo step；不把辅助线或偏好写入 PPTD，不修改未知对象字段、Story、动画时间线和素材。

若实现阶段等距候选对密集页造成明显计算成本，应限定到页面内可见参考对象并为候选构建设可解释的数量界限；不要在每个 pointermove 运行无限二维全配对。无需为一般50对象页面引入空间索引依赖。

## 足够而聚焦的验收

纯函数新增回归覆盖：组排除（含嵌套与 parent+child）、Shift 两个方向、旋转 AABB、横纵间距两种模式、不相邻 / 重叠 / 越阈值不吸附、锁比例 resize 与最小尺寸、对齐整页 / 选区、不同宽高等间距分布。复用既有 undo / 保存单元测试，无需重跑视频、全媒体和长会话压力矩阵。

本轮桌面场景只需一个隔离合成文稿：文本、两图和组合；在50%及100%缩放拖动，确认导线与实际边重合；Alt、Shift、Esc、resize；整页居中、横纵分布；Undo → 保存 → 重开数值一致；中英文按钮和偏好重开保持。记录最终真实截图与 renderer 错误即可，不需要把每个细微导线画面做成独立完整测试套件。

## 一手来源

- [P1：PowerPoint gridlines / snap to grid](https://support.microsoft.com/en-us/powerpoint/work-with-gridlines-and-use-snap-to-grid-in-powerpoint)
- [P2：Align or arrange objects](https://support.microsoft.com/en-us/office/graphics-visuals/align-or-arrange-objects)
- [P3：Guides for arranging things on a slide](https://support.microsoft.com/en-us/powerpoint/training/guides-for-arranging-things-on-a-slide)
- [O1：Moveable Snappable API](https://daybrush.com/moveable/release/latest/doc/Moveable.Snappable.html)
- [O2：Moveable MIT license](https://github.com/daybrush/moveable/blob/master/LICENSE)
- [O3：Excalidraw snapping.ts](https://github.com/excalidraw/excalidraw/blob/master/packages/excalidraw/snapping.ts)
- [O4：Excalidraw repository and license](https://github.com/excalidraw/excalidraw)
- [O5：tldraw snapping behavior](https://tldraw.dev/sdk-features/snapping)
- [O6：tldraw SDK license](https://tldraw.dev/community/license)
- [O7：PPTist repository and feature list](https://github.com/pipipi-pikachu/PPTist)
