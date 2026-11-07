# HUANDING 与现有 PPTD Editor 的实际差异

核对日期：2026-11-07（Australia/Sydney）。对照的是 THUG 上现有源码，不是网上产品测评。

旧项目：`D:/_Proj/FreestyleScientificSlides/apps/pptd-desktop`，桌面包 0.2.1，内置 open-pptd 2.0.2，Electron 38.7.2。该项目有用户未提交修改，本轮只读检查。

## 核对结果

| 工作流 | 旧 PPTD Editor 的实际实现 | HUANDING v0.2 的处理 |
| --- | --- | --- |
| 桌面入口 | Electron 独立窗口，原生打开项目 | 补齐 Electron 原生窗口、新建/打开/最近项目；外部 Agent 共用内部服务 |
| 页面源文件 | manifest + pages + media，直接读写项目 | 继续原位保存 `.page`；不生成另一套 TSX 权威文件 |
| 文件可见性 | 能打开文件夹；原生包装层传输完整文件列表 | 增加编辑器内实际项目树，页面与文件双向定位，原生显示文件位置 |
| 历史 | 模型 Undo/Redo；本机外部修改观察 | 保留撤销，另加单页时间线、历史预览和任意旧版恢复 |
| 外部修改 | 每 3.5 秒检查已加载文件，提示用户 Reload；有脏稿时不丢弃 | 文件监听、共享事务和版本检查，clean 页实时更新，dirty 页保留草稿 |
| Agent | 通过既有 FSS 工作流与文件交接 | 独立 CLI/MCP，先记录 HUANDING Frame，再局部修改同一文档 |
| 键盘操作 | Tab 对象循环、1/10 单位移动、页面导航、Ctrl+M/D、F5 等 | 保留/补齐日常对象和页面快捷键；文字输入不被画布快捷键抢占 |
| 缩略图布局 | 可切换左侧/底部，带本机偏好 | 当前固定左侧；右键页面历史。底部切换尚未迁移 |
| 文本/图片/基本形状/线条 | 专用对象渲染及属性 | 已有自由编辑，继续保留图层、对齐、旋转、裁切和中文输入 |
| 图表、表格、分组、图标、公式 | 有 chart/table/group/icon 类型模块及 LaTeX/MathML 模型处理 | 尚未达到旧引擎覆盖；部分元素显示未支持占位，原数据保留。不能宣称复杂旧课件已完全视觉兼容 |
| 导出 | open-pptd writer；原生桌面导出入口 | 已有 PPTX/PDF/PNG 导出及对象回退报告；高级对象覆盖仍取决于渲染器 |
| `.pptd` 文件关联 | THUG 已指向安装的 DNATT Editor | 不更改用户既有默认关联；HUANDING 使用独立快捷方式和“打开项目” |

## 实施判断

当前缺口分为两类。v0.2 完成日常工作流中缺少的桌面、文件树、单页历史和 Agent 意图记录。旧引擎更广的科学对象渲染属于下一项明确的兼容工作，需要按真实课件对象类型补适配，不应把“数据没有丢失”写成“显示已经完整”。

布局起点生成的都是普通对象。解除关联后不改变对象内容与几何；既有布局组件不会成为必须选择的模板。人工设计的疏密、留白、不对称和局部强调由原页面和 Frame 的保留约束共同表达。

## 可复核的源码入口

旧源码：`package.json`、`main.cjs`、`preload.cjs`、`desktop-workflow.mjs`、`README.md`；`vendor/open-pptd/editor/types/{chart,table,group,icon,text}.js`；`vendor/open-pptd/packages/model/{latex,mathml2omml,table}.js`；既有 `docs/PPTD_EDITOR_UX_ACCEPTANCE.md`。

HUANDING：`packages/desktop/`；`packages/core/src/app/components/pptd/`；`packages/core/src/pptd/{store,page-history,frame}.ts`；`packages/core/src/vite/routes/pptd.ts`。本轮实际执行结果见 IMPLEMENTATION-V02.md。
