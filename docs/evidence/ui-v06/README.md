# v0.6 验收证据

本目录对应正式运行时 `9c27465aa88b5b2b59288f5b321596ad10fcb92c` / `0.6.0`。构建时间为 `2026-11-07T16:47:49.8347220Z`，`sourceDirty=false`。完整产品结论见 [发布记录](../../RELEASE-V06.md) 和 [验证报告](../../VALIDATION-V06.md)。

[acceptance-summary.json](acceptance-summary.json) 从 Windows 原始收据按字段白名单生成，保留原收据文件名与 SHA-256。它包括六套最终 EXE 共 61 项检查、源码和打包门禁、80 页副本 20 轮性能与内存、正式安装、快捷方式、About handler 和普通用户项目重开结果。Linux 单测来源单独注明，没有把 Windows 的 1 项 POSIX skip 算作通过。

摘要排除科研内容、原文件路径/清单/逐文件摘要、用户 profile 路径、服务地址和进程 ID。原始 JSON、日志、失败现场及科研材料只保留本地 `.verification`；可读摘要不能替代未来重新执行验收。

## 最终包实际界面

| 图片 | 内容 | 来源 |
| --- | --- | --- |
| [asset-library.png](asset-library.png) | 素材搜索、预览与使用位置 | 最终 EXE 项目/素材验收，`2026-11-07T16:49:53.399Z` |
| [animation-timeline.png](animation-timeline.png) | 多轨关键帧、演讲步骤与画布预览 | 最终 EXE 动画验收，`2026-11-07T16:50:44.189Z` |

两张均是原始 1600×1000 合成项目截图，已直接查看实际像素。没有科研内容、绝对用户路径或 PNG metadata，没有重新绘制或美化。图片 hash 与尺寸列在 JSON 的 `images` 字段；截图中的内容是软件验收图形，不是科研结论。

## 证据边界

- 最终 package 与正式路径的 installed smoke 是两次独立运行；普通用户原项目重开又单独检查。安装时旧窗口正常关闭，旧包留存，未强制杀进程。
- About 通过真实原生菜单 handler 与临时 `showMessageBox` stub 捕获版本，没有原生对话框截图的声明。
- 80 页性能测试使用隔离副本，未清空 OS 文件缓存；20 轮不是长时间稳定性证明。renderer/service 工作集增长保留原样，JS GC 回落不能证明无泄漏。
- 基准当前页没有图片，不能用空 URL 数组证明图片缓存。最终项目/素材专项另包含至少三张解码图片的保存与资源更新正向测试。
- 历史候选位于 `.verification/v06-source-candidate`，不是本目录最终包结果。早期失败与修复仍在验证报告中说明。
- 本地安装证据不自动证明远端已发布；里程碑推送后分别核对 `origin/main`、annotated tag 及 peeled commit。
