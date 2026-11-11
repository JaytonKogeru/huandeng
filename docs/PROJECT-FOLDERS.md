# Project folders and entries

A HUANDENG presentation is a working project folder. The .pptd file is its entry and page order; the pages, material and portable named versions live beside it.

## Open the project

In Editor 0.19, Home and File offer separate actions for an entry file and a project folder:

- **Open PPTD file** selects one explicit .pptd file.
- **Open project folder** selects a directory. The directory must directly contain exactly one .pptd file.
- Dragging a supported entry or project directory into Home follows the same resolver.
- CLI entry arguments accept the same file or folder.

The resolver does not search descendants or choose a file by date or preferred filename. If no entry exists, it reports that condition. If several entries exist, it lists bounded candidates and asks the user to select the precise file. The file does not have to be named deck.pptd.

Opening the same canonical entry returns to its existing tab and writer. A folder route and a file route do not create two copies of the document.

## Give the folder a recognizable identity

Existing projects can use the visible menu button at the top left: **Application menu → File → Identify project folder…**, or **应用菜单 → 文件 → 设置项目文件夹图标…**. On Windows this adds the HUANDENG project icon using the supported desktop.ini convention and a project-local icon. It preserves existing customizations and does not change the deck entry or page source.

A descriptive folder name such as DNA-lab-meeting is sufficient. A name such as DNA-lab-meeting.huandeng is also valid if the user prefers a visible project suffix; it remains a normal directory. A suffix is optional, and existing project directories are not renamed during an upgrade.

Windows Explorer double-clicks a folder by opening that folder. HUANDENG’s folder support applies to its Open folder, Home drop and launch/CLI routes; it does not register all system directories to launch the Editor. Double-clicking an associated .pptd entry continues to open the Editor.

## What travels with the folder

| Part | Purpose |
| --- | --- |
| The single .pptd entry | Project entry, page references and Main order |
| pages/ | Editable page source |
| media/ and other referenced asset paths | Original material and derivatives used by pages |
| .huandeng/project.json | Stable page identity, Story, sections and saved Presentations |
| .huandeng/checkpoints/ and media/.huandeng-versions/ | Named page versions and their referenced historical material |
| AGENTS.md | Human-editable project authoring guidance |
| sources/ and evidence/ when present | Source material, attribution and specific verification records |
| Exports/ | Fixed current delivery files and export reports |

Keep the complete folder together when copying or sharing it. Do not extract only the entry. Machine-local operation and recovery journals remain with the original installation; they are separate from portable named page versions.

The maintained introduction source and release ZIPs exclude machine-local Windows folder decorations: desktop.ini and .huandeng/project.ico. These exact paths are not page media or named-version assets. Existing local icon files and folder attributes are preserved when historical decoration files leave Git tracking. After extraction, use File → Identify project folder if a Windows icon is wanted; ZIP extraction does not itself guarantee the Explorer folder attributes needed for that decoration.

The six introduction projects use their existing author/language directories under examples/huandeng-introduction. Each has one deck.pptd. There is no second dated introduction tree.

## People and assistants

Choose the same explicit entry when configuring assistants. Read the project and stable Slide ID before editing. A different GUI tab is not an instruction to silently retarget an already configured client.

Different pages can be assigned to different assistants. Saves still pass through the project’s shared writer and current expected revisions. Same-page work, shared Story, section structure and presentation metadata need coordination. An assistant’s task report is a declaration; an operation receipt records an actual saved change.

For a sequential handoff, name the page, the saved operation and the evidence to preserve. The next assistant reads the current result before preparing its own focused change. See [native integration and the real collaboration test](NATIVE-INTEGRATION-0.19.md).
