# HUANDENG v0.6 — 编辑工作台与时间线

制定日期：2026-11-08（Australia/Sydney）。依据：历次 SPEC、[v0.5 覆盖审计](AUDIT-V05-COVERAGE.md)、[本轮综合审计](AUDIT-V06.md)和用户最新使用场景。本文定义在现有 React/PPTD 编辑器上的可验收增量。

## 1. 里程碑目标

完成连续创作工作流：键盘选择与编辑 → 查看项目叙事与演讲引用 → 查找/复用素材 → 编辑关键帧并预览/放映 → 检查字体与内容范围 → 通过共用 writer 保存、撤销和外部 Agent 协作。

运行时功能通过实际 Windows 程序验证。正式 v0.5 继续可用，开发与测试使用隔离 worktree/profile/project。日常记录本地保存，达到经过验收的重要里程碑后同步 private origin。

## 2. 键盘与工作区

- 明确画布、图层、缩略图、表单、弹窗和放映各自的键盘范围，尊重事件消费和中文输入法。
- 方向键移动对象 1 单位，Shift 10 单位。文本、数值输入和菜单继续使用本身键盘语义。
- 画布 Tab/Shift+Tab 遍历顶层对象，Enter 进入文字，Esc 返回对象/画布；提供 F6/Shift+F6 工作区切换和快捷键帮助。
- 缩略图使用一个活动 Tab 入口，支持方向键/Home/End；同一 pageId 的不同 occurrence 保持独立定位。
- PageUp/PageDown 等浏览行为在只读或保存中仍可用，写入操作继续受原有保护。
- 补齐对象剪切并核对桌面 Edit 菜单与文本输入的语义。操作结束后的焦点落在有效对象或画布。
- 面板可收起，紧凑窗口给画布合理空间；状态文案区分文档服务连接和外部 Agent 实际活动。

## 3. 同项目组织与 Story

Main、Section、Presentation 继续存储在同一 `.huandeng/project.json` 中。新界面提供衍生演讲总览，以及当前主页面在哪些演讲/位置使用。点击使用关系进入准确的 presentationId/pageId/occurrenceId，另有明确回到主页面的入口。

pageId 是内容身份；occurrenceId 是某次出现身份；position 是当前序位。重复 live 引用同步主页面内容；备注与版本选择属于每次出现。当前 occurrence 的 Story briefing 汇集 Main、所属 Section、Presentation、逐页目的/保留约束、前后页、版本/备注、素材引用和当前选择，帮助 Agent 在编辑前理解叙事。

派生概览和 briefing 为只读视图。原有项目显式保存、页面自动保存与命名版本机制保持各自语义。

## 4. 素材库

索引项目 media/assets 以及当前页面引用的素材，支持搜索、缩略预览、使用关系、跳转引用页和插入复用。区分缺失引用和未被当前主库引用的文件；命名版本归档不能误判为可删除垃圾。

替换图片使用已有导入和元素 patch/CAS 事务，保留原素材和未知数据。扫描有边界且明确报告截断，不启动未请求的删除、移动或全库整理。

## 5. HUANDENG Plugin 通道

本机 Codex/Claude Code 等使用共享 writer 的 stdio MCP/CLI，新增明确的 Story briefing、Presentation 读取和素材列表工具。工具返回稳定 ID、当前 revision、可写状态和上下文；写入继续携带 expected revisions、requestId 与原有事务。

ChatGPT 网页当前可以经用户已有 WALT 通道调用本机 CLI。官方私有 MCP tunnel 或远程 Streamable HTTP 属于独立连接部署方式，需要按实际平台鉴权配置；localhost REST 不等于已部署的云端 MCP。插件指南提供可运行的本机配置与各端差异。

## 6. 时间线数据与持久化

在 `.page` 中新增明确版本的 `timeline`，未知旧 `animations` 字段继续保留。

```ts
interface PageTimeline {
  schemaVersion: 1;
  durationMs: number;
  tracks: Array<{
    id: string;
    targetId: string;
    property: 'x' | 'y' | 'rotation' | 'scaleX' | 'scaleY' | 'opacity';
    keyframes: Array<{
      id: string;
      timeMs: number;
      value: number;
      easing: 'linear' | 'ease-in-out' | 'hold';
    }>;
  }>;
  cues?: Array<{ id: string; timeMs: number; label: string }>;
}
```

x/y 是画布绝对坐标，rotation 是绝对角度，scaleX/scaleY 相对基础尺寸，opacity 为 0–1。相同对象/属性仅有一条轨道，关键帧时间严格递增且处于时长范围，数值必须有限。easing 作用于本帧到下一帧，端点之外保持端点值。组动画应变换成员；父子轨道组合需要明确且经过测试的顺序或明确拒绝。

新增 `page.timeline.set` 事务，使用原页 revision、journal、幂等收据和 Undo/Redo。复制页面或对象需要重新映射动画对象引用；删除对象同步移除相关轨道，撤销恢复完整内容；命名版本保存当时的时间线。

## 7. 时间线编辑与播放

- 多轨列表、目标对象/属性选择、关键帧新增/删除、时间和数值编辑、关键帧拖动与缓动选择。
- 时长、时间标尺、播放头、播放/暂停、拖动定位和回到基础版式。
- cue 编辑与按演讲节奏前进的播放入口；重复引用每次出现独立从起点开始。
- 播放采用纯时间采样，预览不写回基础几何，不产生逐帧事务。正常编辑与静态缩略图显示基础版式。
- 当前静态 PNG/PDF/PPTX 导出明确标注时间线未导出；所选时间帧的图像导出作为可验证扩展。原生 PPTX 动画和视频编码单独验证。
- UI 动效与幻灯内容动画分别处理；工具反馈遵循 reduced-motion，作者主动播放的内容由作者控制。

## 8. 渲染诊断与资源

字体检查依据渲染后的有效字体栈和本机/已加载字体枚举，区分可用、回退、通用字体及无法核实。不能把 FontFaceSet.check 成功当成指定字体存在的证明。检查覆盖继承样式、富文本及公式/表格实际内容；逐字形/Office 字体排版仍保留明确边界。

按明确操作测量当前页文字/公式内容与对象外框，报告超出方向与对象定位；允许作者保留有意越界。

图片资源身份优先使用素材自身 revision，避免纯文字编辑让所有图片变成新 URL。图表 SVG 缓存增加容量边界。定向检查和连续会话观察验证实际效果，分别报告 JS heap、进程工作集与条件。

## 9. Validation

| 范围 | 必须观察的行为 |
| --- | --- |
| 键盘 | 画布/缩略图/侧栏/表单/弹窗范围正确，IME安全，Tab/方向键/F6可用，重复 occurrence 精确导航，真实落盘与Undo |
| 项目/Story | Main可达衍生Presentation、used-by定位准确，四层Story和选中上下文一致，固定版本/草稿保护 |
| 素材 | 搜索预览与引用定位，复用不重复导入，替换经过CAS，缺失/归档/截断区分 |
| Agent | MCP实际初始化/list/call，brief/context/presentation/assets可读，apply沿用原writer，CLI配置可执行 |
| 动画 | 时间采样、组变换、插值/hold、边界拒绝、复制/删除/Undo、重开与命名版本、实际时间线拖动/播放/放映 |
| 渲染诊断 | 存在/不存在字体、富文本继承、文字/公式超出、定位和重新检查；不修改文档 |
| 连续会话 | 大项目增删/切页/播放多轮，资源URL稳定与素材替换更新，内存与DOM增长有记录 |
| 交付 | 类型/格式/必要单元和回归、实际包、自包含/搬迁、安装快捷方式、Release/Handoff、重要里程碑统一同步 |

测试素材为合成项目和用户授权科研项目副本。每轮失败与后续修复分开记录，历史回执保持原样。
