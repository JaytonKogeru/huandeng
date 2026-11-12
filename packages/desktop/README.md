# HUANDENG Editor desktop

Windows 桌面宿主，复用 HUANDENG 的 React 画布和 PPTD 文档服务。用户打开独立应用窗口，原生菜单、文件对话框和任务栏入口都由 Electron 提供。文档服务在应用内部启动，仅监听本机地址，外部 CLI/MCP 与这个服务共享同一个写入者。

## 使用

双击项目根目录 `Start-Huandeng.cmd`，或安装后的 **HUANDENG Editor** 快捷方式。首次启动显示开始页；之后可以继续最近打开的项目。开始页和“文件”菜单均提供打开、新建及最近项目。

“打开项目”选择已有项目中的 `.pptd` 清单。“新建项目”分别填写项目名称和父文件夹，并预览最终的 `folder/deck.pptd`。可以从一页空白开始，或创建独立的三页可编辑练习。取消不会创建项目，已有目录不会被覆盖。项目包含 `.page`、`media` 和可编辑的 `AGENTS.md` 创作约定；整个文件夹才是完整项目。需要交接时，在导出中选择「可编辑项目（ZIP）」；对方解压后打开原入口文件。也可以直接复制整个项目文件夹。

Windows 新项目使用目录内 `.huandeng/project.ico` 与 `desktop.ini` 显示 HUANDENG 文件夹图标。图标路径为相对路径，不依赖原安装位置；装饰失败不会影响项目创建。其他平台仍使用普通文件夹。已有目录的图标、`desktop.ini` 和创作约定不会被自动替换。

快捷键：`Ctrl+O` 打开项目，`Ctrl+N` 新建项目，`Ctrl+W` 仅关闭当前文件预览，保留永久的幻灯片文档。通过“文件 > 关闭项目”显式关闭项目；`Ctrl+Shift+W` 或窗口关闭操作保留草稿保护。切换或关闭前会要求画布保存已完成的编辑；存在保存冲突时仍停留在当前页面。

原 `Start-Huandeng.cmd` 保留为兼容入口，行为也改为打开桌面应用。现有 `.pptd` 文件关联不变。

## 项目标签与工作区

拖动项目标签可调整顺序，横排和左侧竖排都支持。标签栏的布局按钮、原生「查看」菜单和「工作区设置」可切换显示方式；垂直标签栏可折叠。标签排序保留既有项目与文档服务，应用重新启动后按保存顺序恢复。

键盘在标签上用左右或上下键切换焦点，Home/End 到首末标签；Alt+Shift 加对应方向键调整位置。Ctrl+Tab 按当前标签顺序循环。

工作区设置分为窗口布局、编辑、字体检查三组。主题、语言、标签布局和吸附是应用偏好；面板尺寸、显隐与 Notes 停靠在同一窗口的所有项目间同步。升级时从当前活动项目的旧布局迁移初值并保留旧记录。每个项目仍保留自己的缩放、选页和当前视图。首页也可以切换主题。

## 开发与打包

```powershell
corepack pnpm install
corepack pnpm --filter @open-slide/core build
corepack pnpm --filter @huandeng/desktop start
```

桌面包固定 Electron `45.3.1`，与本地协议 2 的 CLI 和插件一起升级。首次安装依赖时，如果 pnpm 未运行 Electron 的下载脚本，按该依赖自带的安装脚本取得锁定版本；打包会拒绝版本不匹配的运行时。

```powershell
.\scripts\Package-Huandeng.ps1 -ElectronRuntimePath "C:\path\to\electron\dist"
.\scripts\Install-Huandeng.ps1
```

产物为 `dist\HUANDENG-win32-x64\HUANDENG Editor.exe`，同目录包含 Electron 运行时和应用的生产依赖。整个文件夹可移动，不能只复制 `.exe`。随包的 `Install-Huandeng.cmd` 安装或修复当前用户快捷方式与 Open with 注册；`Uninstall-Huandeng.cmd` 移除该安装拥有的项目。已有 Windows 默认应用和用户工程保留，详见 [Windows 安装说明](../../docs/WINDOWS-INSTALL.md)。

打包时会建立临时工作区，复用仓库锁定的依赖版本，以 pnpm 的 `hoisted` 布局生成实际依赖目录。临时工作区删除后、应用目录移动后，各检查一次依赖链接与文档服务启动，避免 Windows Junction 指向已移动的构建目录。

已有构建需要更新时，先关闭该应用，再向打包脚本传入 `-Replace`。脚本会核对构建标记与完整内容清单；存在新增、缺失或修改文件时拒绝覆盖。正式发行另使用 `-Official`，要求干净 checkout 和匹配的 `editor-v*` 标签，并记录来源、工具链、锁文件与文件摘要。

## 宿主接口

渲染进程通过隔离的 `window.huandengDesktop` 使用 `openProject`、`newProject`、`recentProjects`、`openRecent`、`revealPath`、`showHome` 和 `getContext`。`onBeforeLeave` 注册文档保存回调；`onContextChanged` 和 `onStatus` 提供宿主状态。

打开项目时先查找已经运行的兼容文档服务；如果存在就复用。如果由桌面宿主启动服务，则通过 IPC 请求正常关闭。应用退出不会终止独立 CLI 启动的外部服务。

`HUANDENG_DESKTOP_DATA_DIR` 可用于隔离桌面偏好和单实例锁；`HUANDENG_RUNTIME_DIR` 用于隔离文档服务状态。自动验证使用独立临时目录，避免修改用户项目或最近项目。

## 实现依据

- [Electron preload scripts](https://www.electronjs.org/docs/latest/tutorial/tutorial-preload)
- [Electron application packaging](https://www.electronjs.org/docs/latest/tutorial/application-distribution)
- [Electron environment variables](https://www.electronjs.org/docs/latest/api/environment-variables)

Electron 仅承担桌面宿主；PPTD、单页版本、Frame 和 Agent 命令继续由同一份文档核心处理。
