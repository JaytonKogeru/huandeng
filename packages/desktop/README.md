# HUANDING Editor desktop

Windows 桌面宿主，复用 HUANDING 的 React 画布和 PPTD 文档服务。用户打开独立应用窗口，原生菜单、文件对话框和任务栏入口都由 Electron 提供。文档服务在应用内部启动，仅监听本机地址，外部 CLI/MCP 与这个服务共享同一个写入者。

## 使用

双击项目根目录 `Start-Huanding.cmd`，或安装后的 **HUANDING Editor** 快捷方式。首次启动显示开始页；之后可以继续最近打开的项目。开始页和“文件”菜单均提供打开、新建及最近项目。

“打开项目”选择已有项目的 `.pptd` 文件。“新建项目”中的名称用于建立独立文件夹，例如选择 `D:\Documents\Research.pptd` 会创建 `D:\Documents\Research\deck.pptd`，其中包含一页空白 `.page` 和 `media` 目录。项目不会自动套用布局。

快捷键：`Ctrl+O` 打开项目，`Ctrl+N` 新建项目，`Ctrl+W` 关闭窗口。切换或关闭前会要求画布保存已完成的编辑；存在保存冲突时仍停留在当前页面。

原 `Start-Huandeng.cmd` 保留为兼容入口，行为也改为打开桌面应用。现有 `.pptd` 文件关联不变。

## 开发与打包

```powershell
corepack pnpm install
corepack pnpm --filter @open-slide/core build
corepack pnpm --filter @huanding/desktop start
```

桌面包固定 Electron `38.7.2`。首次安装依赖时，如果 pnpm 未运行 Electron 的下载脚本，可以使用已安装的同版本运行时；无需修改旧编辑器。

```powershell
.\scripts\Package-Huanding.ps1 -ElectronRuntimePath "C:\path\to\electron\dist"
.\scripts\Install-Huanding.ps1
```

产物为 `dist\HUANDING-win32-x64\HUANDING Editor.exe`，同目录包含 Electron 运行时和应用的生产依赖。整个文件夹可移动，不能只复制 `.exe`。安装脚本只创建当前用户的开始菜单及桌面快捷方式。

打包时会建立临时工作区，复用仓库锁定的依赖版本，以 pnpm 的 `hoisted` 布局生成实际依赖目录。临时工作区删除后、应用目录移动后，各检查一次依赖链接与文档服务启动，避免 Windows Junction 指向已移动的构建目录。

已有构建需要更新时，先关闭该应用，再向打包脚本传入 `-Replace`。脚本只允许替换带有 HUANDING 构建标记的目录。

## 宿主接口

渲染进程通过隔离的 `window.huandingDesktop` 使用 `openProject`、`newProject`、`recentProjects`、`openRecent`、`revealPath`、`showHome` 和 `getContext`。`onBeforeLeave` 注册文档保存回调；`onContextChanged` 和 `onStatus` 提供宿主状态。

打开项目时先查找已经运行的兼容文档服务；如果存在就复用。如果由桌面宿主启动服务，则通过 IPC 请求正常关闭。应用退出不会终止独立 CLI 启动的外部服务。

`HUANDING_DESKTOP_DATA_DIR` 可用于隔离桌面偏好和单实例锁；`HUANDENG_RUNTIME_DIR` 用于隔离文档服务状态。自动验证使用独立临时目录，避免修改用户项目或最近项目。

## 实现依据

- [Electron preload scripts](https://www.electronjs.org/docs/latest/tutorial/tutorial-preload)
- [Electron application packaging](https://www.electronjs.org/docs/latest/tutorial/application-distribution)
- [Electron environment variables](https://www.electronjs.org/docs/latest/api/environment-variables)

Electron 仅承担桌面宿主；PPTD、单页版本、Frame 和 Agent 命令继续由同一份文档核心处理。
