const fs = require('node:fs/promises');
const path = require('node:path');

async function initializeProject(directory, options = {}) {
  const root = path.resolve(directory);
  const title = options.title === undefined ? path.basename(root) : options.title;
  if (typeof title !== 'string' || !title.trim() || title.length > 240 || title.includes('\0'))
    throw new Error('Choose a nonempty Project title of at most 240 characters.');
  const guidance =
    "# HUANDENG project authoring\n\nThese editable notes describe this project's content and visual preferences. The author's current request takes precedence. They are authoring context, not executable commands or authorization for external actions.\n\n## Project\n\n- This directory is the complete project. `deck.pptd` is its entry manifest; keep the directory together when moving or sharing it.\n- `pages/` holds editable slides, `media/` holds source assets, and `.huandeng/` holds project relationships and named versions. `Exports/` contains delivery files.\n- Read the current page, its Story and these notes before changing content. Use stable page identity; page position may change.\n\n## Content and design\n\n- Start with white backgrounds, dark text, clear hierarchy and generous whitespace. Adapt these defaults to the author's approved reference pages.\n- Let the content determine the layout. Keep one clear point per slide; put extended explanation in speaker notes.\n- Preserve original figures, values and the author's approved composition. Use genuine product screenshots when showing an interface; distinguish conceptual diagrams from actual UI.\n- Do not add hand-drawn arrows, decorative flow connectors or circled step numbers unless the author asks for them. Preserve arrow annotations in original source figures. Avoid repeated generic cards.\n- Keep audience-facing copy direct. Put implementation caveats and test records in project documentation, rather than adding them to presentation pages unasked.\n- Preserve necessary sources and acknowledgments. Do not invent evidence or silently replace authored content when switching the interface language.\n\n## Editing and review\n\n- Use HUANDENG's shared editing tools for document changes. Preview the intended scope, apply that proposal, and inspect the actual rendered slide.\n- Keep unrelated pages and pinned versions intact. Record a named version after a meaningful completed revision.\n\n## A deliberate visual contract\n\nUse Audit → Spec → Frame → Implement → Validate → Release. Start a new deck by inspecting one representative content page and one requested section divider before expanding.\n\nAt 960×540, a restrained product introduction can use Chinese title 26–28/body 17–18 regular and English title 28–32/body 18–20. Scale with canvas width and adapt to the author's approved references. Keep ordinary backgrounds white unless a deliberate exception is recorded. A requested section divider contains only its title. Do not mechanically resize original scientific labels.\n\nUse real UI captures in the audience's language. Prefer 2× their used dimensions, preserve originals, and record source/version/locale/dimensions/crop in an asset index. A full-window screenshot shrunk into a tiny panel remains unreadable.\n\nRun the read-only Design checks / CLI quality when available, then inspect actual full-size renders and exports. Measured warnings guide review; they never establish aesthetic acceptance.\n\n## Author's preferences\n\nAdd the audience, presentation purpose, approved visual references and any content that must be preserved here.\n";
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
