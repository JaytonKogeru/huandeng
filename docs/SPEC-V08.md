# HUANDENG v0.8 — 点击驱动的现场放映

2026-11-08（Australia/Sydney），依据 [AUDIT-V08](AUDIT-V08.md)，先规格后实施。目标：选对象→加效果→编排点击→预演→放映回退换页→保存重开。MP4保留兼容；双屏、音视频元素时钟、运动路径、PPTX原生动画、视觉变体及Agent客户端另立里程碑。

## 1. 唯一作者数据

保留 PageTimeline(v1)；新增 PageAnimation=PageTimeline|BuildTimeline。BuildTimeline={schemaVersion:2,effects:BuildEffect[]}。BuildEffect包含id,targetId,kind,trigger,durationMs,delayMs及可选label,dx,dy。kind为appear/fade-in/fade-out/disappear/pulse/move；trigger为click/with-previous/after-previous。只存effects，纯编译v1，不持久化两套可编辑数据。

移动相对当前基础几何并累计前移；淡入终态取基础opacity。首个可见性动作是进入时初态隐藏，其余保持基础画面。最多256效果，首项click；瞬时动作duration0，pulse为2..60000ms，其余1..60000ms，delay0..600000，总长≤600000ms。单轨1024帧、总帧50000、轨道4096，覆盖256个强调动作。同对象同属性重叠拒绝；父子组沿既有继承。有限数值、ID、目标、组均校验。

readPageAnimation/validatePageAnimation处理union；resolvePageAnimation返回作者数据、派生v1、AnimationStep{id,label,index,startMs,endMs,effectIds,instant}。readTimeline仅供v1高级编辑；compileTimeline、放映、视频计划用resolver。未知版本保留且禁止覆盖。

## 2. 点击与保存语义

click新组；with相对前项开始、after相对前项结束，各加delay。组末为最晚结束，下一组从此起，无空尾。未来动作保持前态不提前插值。瞬时动作可内部1ms，纯瞬时组直接seek末态。

前进播放下一组，播放中前进完成当前组，全部完成再换页。后退到组起点/前停点，起点再退回上一页末态。重复occurrence从初态，pin播其版本。连击不误跨页，首帧不闪旧态。空v2或空轨无Cue不耗空点击，其他v1沿Cue。

page.timeline.set接受union并保留CAS/requestId/journal/Undo。页面/对象复制重映射，删除prune。v2到空/v2、v1到空/v1保留语义；混合非空模型整次拒绝并提示显式转换。删除对象/效果或筛选复制按原click组局部start/end重建保留项：不改变它们原来的组内播放时间、顺序和并发。删组首click提升首保留项，delay保留原局部start；中间依赖被删除时重算相对新前项的trigger/delay，不能提前或产生原本不存在的重叠。不合并组，空组删除，删尾允许缩短组末；重排组感知。桥接等待可超过60秒，因此delay允许至600000ms，仍受整页600000ms总长约束。静态导出基础画面，MP4用派生轨道/steps。

## 3. 作者界面

新页默认演讲步骤，已有v1保留高级时间线。显示对象、效果、组、触发；支持添加/重排/删除/参数。多选默认同次点击同时执行。首次淡入不需手填opacity。预演复用usePresentationPlayback，不逐帧保存；返回编辑为基础画面。

保留page/occurrence/version草稿、输入/拖动及冲突复制/重试/还原，外部schema变化不能卸载脏面板。显式转换自由时间线，解释改用关键帧，单CAS写v1且Undo可回v2；不反解。空页可直接选自由时间线。面板有界/列表滚动，窄窗仍完整fit，沿v07视觉及reduced-motion。

v2逐步预演切换为紧凑播放工作区：隐藏添加对象/效果行和作者参数，改为横向可滚动的开场/点击步骤导航、当前/下一步提示与前后控制。预演中不展示高级转换或作者面板展开动作；返回编辑恢复原选中效果、参数输入与展开状态。换页编辑区随预演隐藏，相关字段保持挂载，未确认输入、错误和草稿不得因预演而丢失。正常无错误的1040×680窗口中，预演画布完整fit后的实际高度至少260px；以真实DOM尺寸与截图验收，不能仅凭class或隐藏控件数量判断。

## 4. 现场控制与转场

画面左键、Enter/Space/右/下/PageDown前进，左/上/PageUp回退；表单/按钮保持语义。简洁观众模式，步骤状态、可展开时间控制、全屏、黑屏暂停；黑屏后前进先恢复不偷推进，退出还原焦点。备注/下一页仍同窗，不称双屏；动态图片仍自主播放。

独立.page.transition={schemaVersion:1,kind:'none'|'fade',durationMs}，page.transition.set保存。none0ms/fade1..5000ms，默认无，目标页控制进入效果。只改显示，不写布局，不阻止连击；v1/v2/无动画都可配，复制及版本携带，不冒充PPTX原生转场。

## 5. 性能与验收

v07 raw-CDP Network开/关同条件对照：working/private、JS used/total、DOM/listeners、idle/GC和必要memory-infra。先归因再修，分清调试器和产品保留；不定时GC、不清用户缓存、不减弱保存。保留历史连续操作基准。

测试：编译/边界/重叠/组/基础几何；初态/中间/完成/回退/连击/跨页/重复/pin；冲突/未来schema；复制/删除/Undo/版本/重开；静态/MP4兼容；实际Windows EXE界面/键盘/全屏/黑屏/转场、窄窗/reduced-motion、80页副本及原件hash不变。相关测试/tsc/Biome后完整里程碑门槛、干净打包、真实包验收、安装验证、私有GitHub里程碑同步，日常本地。

## 6. 分工

模型专项负责schema2/编译/steps/transition/store/复制/删除/导出和测试；UI专项负责BuildPanel/AnimationPanel/高级兼容及保护；root复审、放映hook/view/键盘/route、集成与交付；性能专项隔离诊断。契约变更先改Spec再实现。
