const api = window.newProject;
const form = document.getElementById('project-form');
const nameInput = document.getElementById('project-name');
const directoryInput = document.getElementById('parent-folder');
const destination = document.getElementById('destination');
const errorElement = document.getElementById('error');
const createButton = document.getElementById('create');
let locale = 'en';
let validationSequence = 0;
let creating = false;
const chinese = {
  'New project': '新建项目',
  'Keep your slides, source images and history together in one folder.':
    '页面、原始素材与历史保存在同一个项目文件夹中。',
  'Project name': '项目名称',
  'Parent folder': '父文件夹',
  'Choose…': '选择…',
  'Start with': '初始内容',
  'Blank project': '空白项目',
  'Three editable practice slides': '三页可编辑练习',
  'Project entry': '项目入口',
  Cancel: '取消',
  'Create project': '创建项目',
};
function message(error) {
  return String(error?.message ?? error).replace(
    /^Error invoking remote method '[^']+': Error: /,
    '',
  );
}
async function preview() {
  const sequence = ++validationSequence;
  createButton.disabled = true;
  try {
    const location = await api.location(nameInput.value);
    if (sequence !== validationSequence || creating) return;
    destination.textContent = location.entry;
    errorElement.textContent = '';
    createButton.disabled = false;
  } catch (error) {
    if (sequence !== validationSequence) return;
    destination.textContent = '';
    errorElement.textContent = message(error);
  }
}
nameInput.addEventListener('input', () => void preview());
document.getElementById('browse').addEventListener('click', async () => {
  try {
    directoryInput.value = await api.browse();
    await preview();
  } catch (error) {
    errorElement.textContent = message(error);
  }
});
document.getElementById('cancel').addEventListener('click', () => void api.cancel());
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !creating) void api.cancel();
});
form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (creating || createButton.disabled) return;
  const request = {
    name: nameInput.value,
    template: new FormData(form).get('template') ?? 'blank',
  };
  creating = true;
  for (const control of form.elements) control.disabled = true;
  try {
    await api.create(request);
  } catch (error) {
    creating = false;
    for (const control of form.elements) control.disabled = false;
    errorElement.textContent = message(error);
  }
});
void api
  .settings()
  .then((settings) => {
    locale = settings.locale;
    document.documentElement.lang = locale;
    document.documentElement.style.colorScheme =
      settings.theme === 'system' ? 'light dark' : settings.theme;
    for (const element of document.querySelectorAll('[data-text]'))
      element.textContent =
        locale === 'zh-CN'
          ? (chinese[element.dataset.text] ?? element.dataset.text)
          : element.dataset.text;
    directoryInput.value = settings.directory;
    nameInput.value = locale === 'zh-CN' ? '未命名项目' : 'Untitled';
    nameInput.select();
    return preview();
  })
  .catch((error) => {
    errorElement.textContent = message(error);
  });
