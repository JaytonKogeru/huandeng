const english = {
  '助手连接…': 'Agent setup…',
  '助手接入…': 'Agent setup…',
  '请使用有效的项目文件夹名称。': 'Use a valid project folder name.',
  文件: 'File',
  '新建项目…': 'New project…',
  '打开项目…': 'Open project…',
  '打开 PPTD 文件…': 'Open PPTD file…',
  '打开项目文件夹…': 'Open project folder…',
  打开项目文件夹: 'Open project folder',
  '设置项目文件夹图标…': 'Identify project folder…',
  项目文件夹标识: 'Project folder identity',
  '项目文件夹已添加 HUANDENG 图标。': 'The project folder now has a HUANDENG icon.',
  '已保留这个文件夹现有的图标设置。': 'The folder’s existing icon settings were preserved.',
  '此系统暂不支持项目文件夹图标。项目文件仍可正常打开。':
    'Folder icons are not supported on this system. The project still opens normally.',
  '未能设置项目文件夹图标。幻灯内容未改变。':
    'The folder icon could not be set. Slide content was not changed.',
  最近项目: 'Recent projects',
  暂无最近项目: 'No recent projects',
  在文件管理器中显示: 'Show in file manager',
  回到开始页: 'Back to start',
  关闭窗口: 'Close window',
  关闭文件预览: 'Close file preview',
  关闭项目: 'Close project',
  下一个项目: 'Next project',
  上一个项目: 'Previous project',
  项目编辑视图已停止: 'A project renderer stopped',
  '重新载入会将此项目连接到现有文档服务。其他项目保持打开。':
    'Reload reconnects this project to its existing document service. Other projects remain open.',
  重新载入项目: 'Reload project',
  保持打开: 'Keep open',
  编辑: 'Edit',
  撤销: 'Undo',
  重做: 'Redo',
  剪切: 'Cut',
  复制: 'Copy',
  粘贴: 'Paste',
  全选: 'Select all',
  视图: 'View',
  水平项目标签: 'Horizontal project tabs',
  垂直项目标签: 'Vertical project tabs',
  折叠垂直标签栏: 'Collapse vertical tab rail',
  向前移动项目标签: 'Move project tab earlier',
  向后移动项目标签: 'Move project tab later',
  实际大小: 'Actual size',
  放大界面: 'Zoom in',
  缩小界面: 'Zoom out',
  全屏: 'Fullscreen',
  界面语言: 'Interface language',
  界面外观: 'Interface theme',
  跟随系统: 'Follow system',
  浅色: 'Light',
  深色: 'Dark',
  帮助: 'Help',
  '关于 HUANDENG Editor': 'About HUANDENG Editor',
  '独立页面，持续演进。\n\nHUANDENG Story 记录意图。\nHUANDENG Plugin 连接外部 Agent。':
    'Independent slides. Evolving stories.\n\nHUANDENG Story records intent.\nHUANDENG Plugin connects external Agents.',
  关闭: 'Close',
  只读: 'Read-only',
  操作未完成: 'The operation did not complete',
  返回编辑器: 'Back to editor',
  '页面尚未确认保存完成。请检查未保存的修改或冲突，然后再试。':
    'The slide has not confirmed that saving is complete. Check unsaved changes or conflicts, then try again.',
  '正在打开项目…': 'Opening project…',
  '打开 HUANDENG 项目': 'Open HUANDENG project',
  'PPTD 项目': 'PPTD project',
  '新建 HUANDENG 项目文件夹 · 内含 deck.pptd': 'New HUANDENG project folder · Contains deck.pptd',
  '项目名称（创建独立文件夹）': 'Project name (creates a separate folder)',
  创建项目: 'Create project',
  '请选择当前项目中的文件。': 'Choose a file inside the current project.',
  '不支持这个编辑命令。': 'This editing command is not supported.',
  '此操作只适用于当前 HUANDENG 窗口。':
    'This operation is only available in the current HUANDENG window.',
  '这个项目不在最近项目中，请通过“打开项目”选择。':
    'This project is not in Recent projects. Choose it using Open project.',
  '页面仍有未保存的修改。': 'The slide still has unsaved changes.',
  '请给项目起一个名字。': 'Enter a project name.',
  '项目文件夹已经存在，请换一个名称：\n{path}':
    'This project folder already exists. Choose another name:\n{path}',
  '文档服务必须运行在本机。': 'The document service must run on this computer.',
  '文档服务返回 {status}。': 'The document service returned {status}.',
  '这个文档服务属于另一个项目。': 'This document service belongs to a different project.',
  '这个项目仍由旧版文档服务打开。请关闭旧版编辑器或终端服务，然后重新打开项目。':
    'An older document service has this project open. Close the older editor or terminal service, then reopen the project.',
  '这个项目已经以另一种读写模式打开。请先关闭原有会话。':
    'This project is already open with different read/write access. Close the previous session first.',
  'HUANDENG 文档服务尚未构建。请先运行 corepack pnpm --filter @open-slide/core build。':
    'The HUANDENG document service has not been built. Run corepack pnpm --filter @open-slide/core build first.',
  '请选择项目中的 .pptd 文件。': 'Choose the project’s .pptd file.',
  '请选择 .pptd 文件或项目文件夹。': 'Choose a .pptd file or project folder.',
  '这个文件夹中没有 .pptd 入口文件。请选择项目文件夹，或新建项目。':
    'This folder has no .pptd entry file. Choose a project folder or create a new project.',
  '这个文件夹中有多个 .pptd 文件。请明确打开其中一个：':
    'This folder contains several .pptd files. Open the intended file explicitly:',
  '文件夹中的入口链接到了其他位置。请明确打开实际项目。':
    'The folder entry links outside this project. Open its actual project explicitly.',
  '文档服务未能启动（{status}）。\n{output}':
    'The document service did not start ({status}).\n{output}',
  '文档服务需要重新构建。': 'The document service needs to be rebuilt.',
  '等待文档服务超时。\n{output}': 'Timed out waiting for the document service.\n{output}',
  '不支持此界面语言。': 'This interface language is not supported.',
  '吸附设置必须为开启或关闭。': 'The snapping setting must be on or off.',
};
let current = 'en';

function resolveLocale(preference, _systemLocale) {
  if (preference === 'en' || preference === 'zh-CN') return preference;
  return 'en';
}

function setCurrentLocale(locale) {
  if (locale !== 'en' && locale !== 'zh-CN') throw new Error('Unsupported interface language.');
  current = locale;
}

function getCurrentLocale() {
  return current;
}

function text(message, values) {
  const template = current === 'en' && Object.hasOwn(english, message) ? english[message] : message;
  return values
    ? template.replace(/\{(\w+)\}/g, (match, key) =>
        values[key] === undefined ? match : String(values[key]),
      )
    : template;
}

module.exports = { english, resolveLocale, setCurrentLocale, getCurrentLocale, text };
