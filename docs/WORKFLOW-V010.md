# HUANDENG v0.10 authoring workflow

Each Project has one set of **Main Slides**. A **Presentation** selects and orders references to those slides for a particular talk. Editing a live Main Slide updates all its live references. Creating another Presentation does not copy the source artwork.

## From opening the editor to delivery

1. Open HUANDENG, reopen a recent Project, or choose **New Project** / **Open Project**. Keep the `.pptd` entry, `pages`, `media` and `.huandeng` together when moving a Project.
2. Choose **Main Slides** in the top selector. **Pages** shows thumbnails and provides the add-slide button. The canvas toolbar adds Text, Image, Shape, Line and Data.
3. Use **Assets** for reusable images. Drag an available image onto the canvas, use its Insert action, or choose **Import and place** for a device image. Supporting JSON, Python and other files stay in **Files** and the explicit **All files** asset view.
4. Open **Project → Main Slides → New Section**. Name the Section, choose **Start Position** and **End Position**, then click **Set range**. Its members appear below it and as a group in the thumbnail rail. Click **Save Project**.
5. Choose **New Presentation** and enter a name. Click **Add slides or Sections**, search by title, Slide ID or Position, and recognize choices using thumbnails and hover/focus previews. Click to append; a slide may appear more than once. Reorder or remove items using their controls.
6. Click **Save Project**, then select the saved Presentation in the top selector. Empty Presentations need at least one Slide or nonempty Section before presentation/export. Saving the current collection preserves the current Slide and occurrence while they still exist.
7. Right-click objects for common formatting, duplication, clipboard and layer actions. The Inspector separates **Properties**, **Layers**, **Story** and **Checks**. Checks concerns files, fonts and layout; it does not validate scientific conclusions.
8. Open **Notes** from the canvas toolbar. Drag its boundary to resize; its header docks it below or on the right. **Show Properties** returns from right Notes to the Inspector. **Workspace settings** contains panel toggles/reset, snapping, shortcut help, appearance and language. Collapse/reopen controls sit on each panel edge; **Fit** in the status bar fits the canvas.
9. Use **Present**, F5 from the start, or Shift+F5 from the current slide. Exit with Escape. In **Export**, verify the range names the intended Presentation. PNG/PDF/PPTX use the base slide state; interactive click animation is a presentation feature.

## Save semantics

**Save slides** / Ctrl+S flushes pending slide edits. **Save Project** explicitly saves Section and Presentation organization. A Project draft is preserved while changing views and must be saved or discarded before operations that depend on its arrangement. Conflicting external edits preserve the draft instead of overwriting newer work.

Main Slide notes belong to that slide. A Presentation item can have independent notes in **Notes and version**; the docked occurrence Notes pane provides an **Edit notes** route to that control. An explicitly empty occurrence note differs from following Main notes. Expanding a Section into individual references enables per-slide notes/version choices while retaining the same Main content.

## Identity and Section behavior

| Label | Meaning |
| --- | --- |
| Slide ID | Stable readable identity, such as `A7F3` or `DD01` |
| Permanent ID / `pageId` | Stored UUID identifying the reusable page |
| Position | Current ordinal in the selected collection |
| `occurrenceId` | One appearance of a slide within a Presentation |

New Section ranges store stable boundary IDs. Inserting before a range changes displayed positions; inserting inside includes the new slide. Missing, reversed or overlapping boundaries are diagnosed. Older explicit memberships are preserved until the user chooses Set range. Detailed compatibility and pinning behavior is in [PROJECTS.md](PROJECTS.md).

## Agent setup

**Project → Agent setup** generates configuration or CLI arguments for the current Project. Clicking it does not establish a connection or alter client settings. Follow the displayed next step for the selected client.

ChatGPT uses the already authorized DC-WALT workstation channel to run the generated CLI arguments locally. No reverse proxy, additional tunnel or public endpoint is introduced. Read the [Plugin guide](../plugins/huandeng/README.md) for client-specific instructions and [EXTENSIONS.md](EXTENSIONS.md) for integration boundaries.

## Drug Design example

Open [`examples/drug-design-v010/deck.pptd`](../examples/drug-design-v010/deck.pptd). It has ten editable Main Slides, three Sections, a full ten-slide Presentation and a five-slide briefing. Primary references are in each slide's Notes and `SOURCES.md`.

English is the default for new profiles. Chinese is selectable; core product terms retain their English meanings. Authored slide text never changes when switching interface language.
