const fs = require('node:fs/promises');
const path = require('node:path');

function starterPages(locale) {
  const zh = locale === 'zh-CN';
  const text = (id, value, bounds, fontSize = 20, color = '#24364b') => ({
    elementId: id,
    elementType: 'text',
    bounds,
    content: { text: value, fontSize, fontFamily: 'Arial', color, lineHeight: 1.3 },
  });
  const page = (number, title, body, task, notes, image = false) => ({
    elements: [
      text('lesson', `HUANDENG · ${number}/3`, [54, 36, 400, 24], 14, '#496f95'),
      text('title', title, [54, 90, 850, 60], 32),
      text('body', body, [54, 172, image ? 430 : 820, 138]),
      ...(image
        ? [
            {
              elementId: 'practice-figure',
              elementType: 'image',
              bounds: [540, 170, 330, 180],
              src: 'media/practice.svg',
            },
          ]
        : []),
      text('task', task, [54, 376, 840, 90], 22, '#1e6090'),
    ],
    notes,
  });
  return [
    page(
      1,
      zh ? '从一个可以核对的小修改开始' : 'Start with one change you can verify',
      zh
        ? '选中下方这句话，修改文字，再保存页面。\n然后打开页面历史，查看这次修改。'
        : 'Select the sentence below, change its wording, then save.\nOpen Page History to inspect what changed.',
      zh
        ? '把这句话改成你想讲的研究问题。'
        : 'Replace this sentence with the question you want to explain.',
      zh
        ? '练习：选中蓝色句子，在属性中编辑正文，保存页面。右键缩略图打开历史，查看修改并尝试撤销、重做。这个项目是独立副本，可以自由练习。'
        : 'Practice: select the blue sentence, edit Text content in Properties, and save. Right-click its thumbnail to open History. Try Undo and Redo. This is your own practice project.',
    ),
    page(
      2,
      zh ? '原始素材与可编辑页面放在一起' : 'Keep original assets beside editable slides',
      zh
        ? '右侧图形来自项目中的 SVG。\n选中它，尝试移动和缩放；\n也可以从素材中导入你自己的图片。'
        : 'The figure is an SVG stored in this project.\nSelect it, then move or resize it.\nImport your own image from Assets.',
      zh ? '试试：缩放画布，观察图形边缘。' : 'Try zooming in: the source figure stays sharp.',
      zh
        ? '练习：在素材中查看 practice.svg。移动右侧图片并保存；撤销后检查图片是否恢复。原始文件保存在 media 中，显示大小与文件内容是不同的。'
        : 'Practice: find practice.svg in Assets. Move the image and save, then undo. The original lives in media; its display size and original file are separate.',
      true,
    ),
    page(
      3,
      zh ? '用同一组主页面组织一次演讲' : 'Arrange a talk from the same Main Slides',
      zh
        ? '在项目中创建一个演讲，添加前两页。\n页面仍属于 Main Slides，演讲保存自己的顺序。\n先放映，再导出并检查成品。'
        : 'Create a Presentation in Project and add the first two slides.\nMain Slides keeps the source pages; the talk keeps its own order.\nRehearse, then export and inspect the result.',
      zh ? '下一步：按 F5 放映，或打开导出。' : 'Next: press F5 to present, or open Export.',
      zh
        ? '练习：创建练习演讲，添加两页并保存项目。用 F5 放映，Esc 返回。导出一份 PDF 或 PPTX，核对页面范围和实际画面。无需连接 Agent 即可完成这些操作。'
        : 'Practice: create a two-slide Presentation and save the Project. Use F5 to present and Esc to return. Export PDF or PPTX and check its range and actual appearance. An Agent connection is optional.',
    ),
  ];
}

async function writeStarterProject(root, title, locale) {
  const pages = starterPages(locale);
  const names = ['initial', 'assets', 'presentation'];
  for (let index = 0; index < pages.length; index++)
    await fs.writeFile(
      path.join(root, 'pages', `${names[index]}.page`),
      `${JSON.stringify(pages[index], null, 2)}\n`,
      { flag: index === 0 ? 'w' : 'wx' },
    );
  await fs.writeFile(
    path.join(root, 'media', 'practice.svg'),
    '<svg xmlns="http://www.w3.org/2000/svg" width="440" height="240" viewBox="0 0 440 240"><rect width="440" height="240" rx="12" fill="#eef4f8"/><path d="M92 172 L218 66 L348 172" fill="none" stroke="#2f6b96" stroke-width="8"/><g fill="#2f6b96"><circle cx="92" cy="172" r="20"/><circle cx="218" cy="66" r="20"/><circle cx="348" cy="172" r="20"/></g></svg>\n',
    { flag: 'wx' },
  );
  await fs.writeFile(
    path.join(root, 'deck.pptd'),
    `${JSON.stringify({ title, size: [960, 540], pages: names.map((name) => `pages/${name}.page`), theme: { fontFamily: 'Arial' } }, null, 2)}\n`,
  );
}

module.exports = { starterPages, writeStarterProject };
