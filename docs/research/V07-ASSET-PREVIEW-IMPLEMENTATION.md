# v0.7 高清素材预览实施与验证

日期：2026-11-08（Australia/Sydney）。对应 `SPEC-V07.md` §4.2。性能代理完成实现与 Linux 单元/HTTP 验证；负责人负责实际 Windows EXE 验证及最终验收。本文不把三个扫页循环计为长时间真实编辑。

## 已实现的边界

缩略图和素材库网格通过 `/__pptd/asset-preview` 获取保比例预览，默认长边 320px，可请求 640px。画布、素材详情、插入时的天然尺寸以及导出继续使用原图。预览支持 PNG/JPEG 派生；SVG、GIF、WebP 等保留原图回退。本版不以预览功能覆盖完整色彩管理、JPEG EXIF 和所有图片格式的视觉验收。

`revision` 只用于真实完整 SHA-256，页级 renderRevision、stat 提示和复合提示通过 `hint` 传递。服务器根据当前源字节验证真正的内容版本：旧版本 URL 不返回新字节，冲突为 409，缺图为 404。返回内容或 304 前仍验证源版本。原图和派生图均使用 `private, no-cache` 与表示内容的强 ETag；这是可重新验证的缓存，未设置 `immutable`。

采用这一区分的依据是 [MDN Cache-Control](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Cache-Control) 对 `immutable` 的含义，以及 [MDN ETag](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/ETag) 对条件请求与 304 的定义。只有地址真正代表不可改变的内容，才能把其当作永久不变的资源身份。

## 资源生命周期

| 资源 | 约束与释放 |
| --- | --- |
| 原图读取 | 读取 Buffer 前最多 2 个活动请求；等待队列最多 32 个，超出返回 503 / Retry-After |
| 文件字节 | 先 open / handle.stat，文件不超过 64 MiB 才分配指定大小 Buffer，循环读取后多读 1 字节；增长或提前 EOF 明确冲突，finally 关闭句柄 |
| 并发同图 | 按实际内容 hash、尺寸、预览格式版本合并派生，不因不同路径重复编码 |
| 常驻缓存 | session 独占磁盘目录；最多 256 项 / 128 MiB，内存只保存文件位置和少量元数据 |
| 在用预览 | 请求持有 pin，响应结束/关闭后释放；在用文件不淘汰 |
| 编码 | 可选 FFmpeg；PNG/JPEG，最多 32M 像素，默认 15 秒超时，派生输出验证尺寸及 4 MiB 大小 |
| 子进程 | 仅跟踪本 manager 启动的进程；超时和服务关闭终止，等待操作结算后清理目录 |
| 输出响应 | 派生物从文件流读取；原图保留当前两个活动槽，响应结束/断开释放，不持有无限待发 Buffer |

FFmpeg 检测顺序为显式配置、随运行时可用工具位置、PATH。无工具、格式不支持、尺寸已经足够小、像素超限、编码失败或超时时，返回已核对版本的原图，并以 `x-huandeng-preview` 和 `x-huandeng-preview-reason` 标明实际结果。普通素材功能可在无 FFmpeg 时使用；不能将此回退声称为已经降采样。[FFmpeg scale 文档](https://ffmpeg.org/ffmpeg-filters.html#scale) 支持使用 `force_original_aspect_ratio=decrease` 将长边约束在目标框内。

缓存命中仍读取、hash 校验源文件；本轮收益来自免重复派生和前端接收/解码更小的预览。没有声称消除所有素材文件读取。缓存是本会话所有，正常关闭删除，不作为跨会话热启动缓存。两个原图读取槽的字节预算不是整个 Electron/renderer/GPU/RSS 的上界。

## 文件占用故障的复审修复

负责人复审发现 Windows 删除失败时原实现会先从 cache 移除条目并扣除 bytes，导致目录所有权与预算丢失。已修复为：

1. admission 串行处理；选中淘汰项后先禁止新读，真实目录删除成功才移除条目和扣预算。部分删除失败的文件不再作为有效预览发送。
2. 失败目录继续登记；之后的 cache miss 先重试清理。清理未恢复时不分配新派生目录，直接发送已校验原图，原因标为 `cache-unavailable`。仍有效的缓存命中、原图请求不受这项磁盘故障阻断。
3. 目录删除使用 Node 的有限重试（2 次，50ms 基础间隔）。由于新分配暂停，失败目录上界由已有 cache 和当时最多两个活动工作目录决定，不随后续失败请求数量线性增加。缓存的正常字节预算之外，当前工作目录暂存各自输入及派生输出；不能把 128 MiB 缓存预算写成所有临时磁盘使用的上界。
4. `dispose` 先停止子进程、排队与响应，等待本管理器操作结束。目录仍被外部占用时记录诊断和目录位置，保留所有权信息供再次调用 `dispose` 重试，不阻止服务正常关闭。无法解除的外部占用可能留临时目录，不能把关闭返回成功写作“所有文件必然清理”。

另按负责人批准，把共享 `readProjectAsset` 从 stat 后无界 readFile 改为已打开句柄上的限定大小读取；后端导出与预览共用此边界。data URL、MIME、浏览器启动、素材源识别语义保持原样。

## 已完成验证

Linux Node v24.22.1，真实 `/usr/bin/ffmpeg` 可用；没有跳过实际编码用例。

- `asset-preview.test.ts` **10 项通过**。真实 HTTP 验证原图回退、ETag/304、同长度且恢复 mtime 的替换导致旧 hash 409、缺图 404。
- 真实 FFmpeg 将 1024×512 PNG 派生为 320×160；两个不同路径的同内容只编码一次，原文件 hash 不变，原图端点天然尺寸不变。
- 在原图 open 之前的槽位门限与 503 队列上界；LRU 淘汰；不支持格式与像素过大不启动编码；超时杀自有进程；关闭活动编码后无遗留子进程。
- 模拟 EBUSY 连续请求 8 次：原缓存预算不减，临时工作目录保持两项，返回原图；解锁后下一请求清理并恢复正常缓存。关闭目录被占用不会抛出阻断服务关闭，重复 dispose 在解锁后清理成功。临时目录不可写时原图仍能显示、关闭仍成功。
- 新增 `export-environment.test.ts` **7 项通过**：正常/空文件、partial read 循环、stat 后增长/截断、超过 64 MiB、真实读取错误。每种正常或失败返回都确认句柄已关闭。
- 相关 asset-preview / asset-library / pptd-asset-revision / static-server / pptd-document 五个文件曾 **63 项通过**。最后共享读取补丁完成后，export-environment / asset-preview / export-workspace 三个文件 **26 项通过**（2026-11-07 21:10 UTC）。总体单元回归由负责人执行。
- 完整 core `tsc --noEmit` 通过，最后变更文件 Biome 通过。

重跑命令（仓库根目录，已安装依赖）：

```sh
./node_modules/.bin/vitest run --project unit packages/core/src/pptd/export-environment.test.ts packages/core/src/pptd/asset-preview.test.ts packages/core/src/pptd/export-workspace.test.ts
./node_modules/.bin/biome check packages/core/src/pptd/asset-preview.ts packages/core/src/pptd/asset-preview.test.ts packages/core/src/pptd/export-environment.ts packages/core/src/pptd/export-environment.test.ts
```

TypeScript 命令在 `packages/core` 目录执行：`./node_modules/.bin/tsc --noEmit`。

## Windows 验证交接

负责人已将验证脚本提升到 `scripts/verify-hd-assets-v07.mjs`。原诊断副本冻结，不再维护两份不同的逻辑。仓库根目录执行，现有 core Playwright 即可；设置 `HUANDENG_DESKTOP_EXE`，需要指定工具时设置 `HUANDENG_FFMPEG`。开发 Electron 另可设置 `HUANDENG_DESKTOP_APP`。

```powershell
$env:HUANDENG_DESKTOP_EXE = '候选 EXE 的完整路径'
$env:HUANDENG_FFMPEG = '可选 FFmpeg 的完整路径'
node scripts/verify-hd-assets-v07.mjs
node scripts/verify-hd-assets-v07.mjs --without-encoder
```

脚本只能创建自己的合成项目，不能传入用户原稿。每次创建独占临时项目、profile、runtime：30 页，每页独立 3840×2160 PNG，加一份跨页复用图，共 31 文件 / 30 种内容，119,177,776 源字节。Linux `--prepare-only` 与语法检查已通过；本代理未在 Linux 运行 GUI。

实际检查包括三个 30 页扫页循环、画布原尺寸、可见缩略图真实图片/预览尺寸、素材网格与原尺寸详情、同长度恢复 mtime 替换冲突、静态 PNG 导出、源文件 hash、renderer JS 错误、正常关闭。记录 JS heap、DOM、Electron 分进程内存、Windows 独占 service 进程的 working/private bytes；请求的 Content-Length 是响应头数据，不等价于真实网络流量。无编码器场景必须显示真实原尺寸回退。

Windows 客户端结果由负责人归入总 Validation。尚未在本文宣称完成的内容：长达数小时的用户实际编辑、GPU/image-cache retained size 归因、JPEG EXIF/色彩管理、WebP/GIF 派生、跨会话缓存、所有机器自带编码器。
