# Project folder identity

## Audit

The desktop creates a directory containing `deck.pptd`, `pages/` and `media/`, but the creation dialog still resembles saving a single document. Copying only the manifest loses the rest of the project. A newly created directory also has no visible product identity or local authoring instructions.

## Specification

- A HUANDENG project remains an ordinary, portable directory. `deck.pptd` is its entry manifest; the whole directory is the handoff unit. No new extension, archive format or registry association is introduced.
- New projects include a short editable root `AGENTS.md` for content and visual authoring. Current user requests take precedence. These notes are authoring context, not commands, authentication or model authorization.
- On Windows, copy the bundled brand icon to `.huandeng/project.ico` and create a Unicode `desktop.ini` with a relative icon path. Set only the project folder's read-only shell customization attribute and the INI file's hidden/system attributes. Do not use recursive attribute operations.
- Preserve any existing `desktop.ini` or icon. Never traverse linked metadata directories. Unsupported platforms and icon/attribute failures leave a usable project.
- UI help explicitly distinguishes the project directory from its manifest. Opening remains through the `.pptd` entry file.
- Existing projects are not changed automatically. The folder marker helper can be called explicitly on a verified project directory; it never replaces author-supplied customization.

## Basis and acceptance

Microsoft documents Unicode `desktop.ini`, `IconFile` plus `IconIndex`, relative icon paths, and the folder customization attributes in [How to Customize Folders with Desktop.ini](https://learn.microsoft.com/en-us/windows/win32/shell/how-to-customize-folders-with-desktop-ini). Attribute changes use literal argument arrays and no shell or recursion; see [attrib](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/attrib).

Tests check the new project tree and editable guidance, manifest/title escaping, portability of the relative icon reference, exact local attribute targets, preservation of existing customization, linked-folder rejection, unsupported platforms, and graceful marker failure. Project creation must remain successful if visual decoration cannot be applied.

Verified: project and desktop locale tests (2 files, 9 tests) and Biome on the affected runtime files. The integrated portable candidate also creates a synthetic project with the real Windows attribute runner: its folder has ReadOnly and Directory attributes, while `desktop.ini` has Hidden and System attributes. Explorer rendering and its icon cache were not checked.
