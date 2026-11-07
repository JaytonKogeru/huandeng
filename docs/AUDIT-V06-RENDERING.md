# HUANDENG v0.6 — 渲染诊断与长会话资源审计

日期：2026-11-08（Australia/Sydney）。基线 ef80f5b / runtime 03a96957。

## 已确认的源码事实

`technical-diagnostics.ts` 检查对象尺寸/旋转外框、图片裁切与已知缺失资源。`TechnicalQaPanel` 明确显示字体未验证；现有 `requestedPageFonts` 仅访问页数据和页主题覆盖，没有完整的继承样式或渲染后的富文本信息，也不包含 DOM 内容范围测量。

`renderer.tsx` 的 `resolveAsset` 对本地素材 URL 追加整页 `renderRevision`。因此文字等与图片字节无关的修改也会产生新的图片 URL。页面已有逐素材 `assetRevisions`，可将资源身份缩小到真实素材变化。它是重复请求/解码的具体来源候选；源码事实不直接证明 Windows 工作集增长的全部来源。

`science-renderer.tsx` 的模块级 `chartCache` 已有 32 条 FIFO 上限，异步结果也有卸载保护；它不是无界条目缓存。每个 SVG/键的大小没有预算，可增加总字节边界并优先保留近期使用内容。PptdDocument 的投影缓存为 WeakMap，现有源码没有同类强引用无界列表的直接证据。

## 字体检查选择

使用用户触发的 Local Font Access 查询本机字体族，同时读取当前已加载 FontFaceSet；检查对象使用渲染后的有效字体栈，以覆盖继承、富文本和表格。返回字体族可用性和首个可用回退，逐字形覆盖、字体版本与 Office 最终排版另有边界。

- Chrome 官方 [Local Font Access](https://developer.chrome.com/docs/capabilities/web-apis/local-fonts) 说明桌面 Chromium 的本机字体枚举与用户触发权限。
- Electron 官方 [Session permission handlers](https://www.electronjs.org/docs/latest/api/session) 包含 `local-fonts`，桌面授权只适用于受信任的当前编辑器主 frame。
- CSSWG [Font Loading check](https://drafts.csswg.org/css-font-loading/#font-face-set-check) 的语义是字体加载是否需要等待，不能据此判断任意指定本机字体确实存在。

## 内容范围检查选择

在明确的检查操作中，等待当前字体布局完成，测量实际画布文字/公式内容相对于对象外框的局部布局范围，避免缩略图、旋转和缩放造成坐标误判。超出是提醒，提供定位对象和重新检查，允许作者保留有意越界；未能可靠测量的对象不报告为通过。

## 资源验证

将图片 URL 变化和图表缓存容量作为定向检查，再用真实 80 页副本进行更长连续操作。记录 heap 和 renderer/service 工作集、DOM、错误、关闭与原输入摘要。有限轮次通过仅证明该次条件；不从单一工作集采样推断泄漏或完全修复。

## 已完成的候选验证

2026-11-07T16:35:38.145Z 的实际 Windows 项目/素材验收 11/11 通过：至少三张已解码画布图片在同页文字保存后 URL 不变；同路径 SVG 字节更新后，仅对应画布图片与素材预览 URL/尺寸刷新，控制图片不变。真实按钮枚举本机字体后，正确报告有意设置的缺失继承字体及 sans-serif 回退。真实溢出文字可定位，内容修改或切页后旧检查失效。零 renderer errors，窗口正常退出 0/null；这是源码候选证据，正式包另验。

真实 80 页副本的 50 轮和修复后 20 轮增删均完成，无文档事务失败，原输入摘要不变。20 轮工作集仍增长，显式 GC 后 JS heap 回到接近初始水平；不据此宣称所有内存问题已解决。当前页在此性能样本中没有图片，空数组 URL 比较没有被当作图片复用证据；上面的专项检查使用真实非零图片数量。性能、内存、测试条件与失败修复详见 [集中验证](VALIDATION-V06.md)。
