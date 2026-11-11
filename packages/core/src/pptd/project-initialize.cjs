const fs = require('node:fs/promises');
const path = require('node:path');

async function initializeProject(directory, options = {}) {
  const root = path.resolve(directory);
  const title = options.title === undefined ? path.basename(root) : options.title;
  if (typeof title !== 'string' || !title.trim() || title.length > 240 || title.includes('\0'))
    throw new Error('Choose a nonempty Project title of at most 240 characters.');
  const guidance =
    "# HUANDENG project authoring\n\nThese editable notes describe this project's content and visual preferences. The author's current request takes precedence. They are authoring context, not executable commands or authorization for external actions.\n\n## Project\n\n- This directory is the complete project. `deck.pptd` is its entry manifest; keep the directory together when moving or sharing it.\n- `pages/` holds editable slides, `media/` holds source assets, and `.huandeng/` holds project relationships and named versions. `Exports/` contains delivery files.\n- Read the current page, its Story and these notes before changing content. Use stable Slide IDs; page position may change.\n\n## Purpose and narrative\n\n- Establish the presentation's mission, audience and useful takeaway. A product introduction must also explain what the tool does, how to use it and why it helps; a scientific presentation must explain the question, evidence and interpretation.\n- Treat the human story as reasoning input, not a transcript to illustrate page by page. Reorganize its causal logic, fill relevant explanatory gaps with verified facts, and preserve the author's intent without inventing personal experiences or quotations.\n- Let each page contribute to the presentation's purpose. Use Story to align the claim, evidence and visual choice; derive speakable Notes from that argument.\n\n## Content and design\n\n- Let content and approved references determine composition, color, typography and visual density. Human authorship does not require a white background or sparse black text. Use purposeful backgrounds, product icons and meaningful imagery; do not remove them merely to simplify.\n- Preserve original figures, values and the author's approved composition. Use genuine product screenshots in the audience's language when showing an interface; distinguish conceptual diagrams from actual UI.\n- Use a coherent rich-text object for a paragraph or ordinary list. Use a native table for genuinely tabular data. Do not assemble fake tables or comparison grids from independent text boxes. Scientific panels, figure labels and necessary annotations remain appropriate.\n- Keep original image assets and usable source resolution. Record source, version, locale and any crop; a full-window screenshot shrunk into an unreadable panel is not useful evidence.\n- Preserve necessary citations, sources and acknowledgments. Put implementation caveats and test records in project documentation unless they matter to the audience's understanding.\n- If bilingual editions are requested, keep their corresponding claims, data, feature coverage and acknowledgments aligned. Adapt language, typography and screenshots; record intentional differences rather than letting the content drift.\n\n## Editing and review\n\n- Use Audit → Spec → Frame → Implement → Validate → Release. Review a representative evidence-rich content page and any requested section divider before expanding the deck. A requested title-only divider contains its title.\n- Use HUANDENG's shared editing tools. Preview the intended scope, apply that proposal, read the actual receipt and inspect the rendered slide. Metrics support review; they do not establish visual acceptance.\n- Multiple clients can divide work by stable Slide IDs through one shared writer. Coordinate shared Story/Section/order changes, refresh stale revisions, and hand off exact saved receipts. Client task reports are not proof of live execution.\n- Preserve unrelated pages, authored choices, pinned versions and original assets. Record a named version after a meaningful completed revision.\n\n## Author's preferences\n\nAdd the audience, presentation purpose, approved visual references and any content that must be preserved here.\n";
  await fs.mkdir(root);
  await fs.mkdir(path.join(root, 'pages'));
  await fs.mkdir(path.join(root, 'media'));
  await fs.writeFile(path.join(root, 'pages', 'initial.page'), 'elements: []\nnotes: ""\n', {
    flag: 'wx',
  });
  const entry = path.join(root, 'deck.pptd');
  await fs.writeFile(
    entry,
    `title: ${JSON.stringify(title.trim())}\nsize: [960, 540]\npages:\n  - pages/initial.page\ntheme:\n  fontFamily: Arial\n`,
    { flag: 'wx' },
  );
  await fs.writeFile(path.join(root, '.gitignore'), 'Exports/\n', { flag: 'wx' });
  await fs.writeFile(path.join(root, 'AGENTS.md'), guidance, { flag: 'wx' });
  return { root, entry, title: title.trim() };
}

module.exports = { initializeProject };
