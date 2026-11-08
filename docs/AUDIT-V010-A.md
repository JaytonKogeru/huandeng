# v0.10 independent user journey audit A

Date: 2026-11-08 (Australia/Sydney). Baseline: `f62dd72b413468b49471dc066c66f707d5fc4e8e`.

## Recovery and evidence

The v0.10 worktree was clean at inspection. Its notes contained only v0.9 audits; no v0.10 Audit/Spec/subagent report was found. Dependencies and a source export were prepared. The previous isolated harness survives in the v0.9 worktree as `.verification/v010-ux-a.mjs` and `.verification/v010-ux-a/`. Its last `state-2.json` says a native New Project picker was opened, while its URL and body still show the welcome page. This proves an initial attempt, not completed project creation or acceptance.

This audit combines source inspection and visual inspection of the existing v0.9 `english-workspace.png`. It is not a fresh live acceptance run. No user window was changed; the root agent owns live UI work.

## Judgment

The Main Slides / Presentation model is useful. Its organisational UI currently makes users discover implementation details before doing ordinary work. Creating a Presentation, recognising source slides, editing, saving and presenting must become a continuous visible workflow. Story remains available without occupying the first screen of every organisational task.

| Priority | Baseline evidence | Required behaviour |
| --- | --- | --- |
| P0 | `ProjectPanel.save` always selects the collection again; `huandeng.tsx` `selectPresentation` deletes `page` and `occurrence` even for the same collection. | Saving organisation preserves the current page and repeated occurrence if still present. |
| P0 | New Presentation is empty; an expanded Story form precedes the source picker. Picker entries contain only shortCode/legacy label. | Prominent Add slides/Add Section controls, thumbnail + content title + Position + Slide ID, hover/focus preview, immediate append feedback. |
| P0 | Sections are arbitrary `pageIds`; Main editor exposes a per-slide assignment form and separate membership ordering. | Visible Section groups and continuous Main Slides ranges. Position is derived; stable IDs anchor saved boundaries. Legacy lists remain unchanged until explicit conversion. |
| P0 | Canvas lacks object context menus; Inspector exposes only front/back; keyboard router lacks object format/layer commands. | Shared menu/shortcut actions for text formatting and four layer moves, duplicate/copy/delete. Native text editing and Undo retain their scopes. |
| P1 | Browser and desktop defaults follow system Chinese. | New profiles default to English. Chinese mode retains core nouns in English; authored content never gets translated. |
| P1 | Bottom bar mixes sidebar collapse, Notes, Animation, keyboard help and Snapping. Notes textarea uses `resize-none`. | Sidebar-edge controls; View/Settings for workspace options; Help for shortcuts; Notes resize handle and right docking. |
| P1 | Centre Assets/upload controls duplicate the Assets tab/import action. | One identifiable Assets surface; preserve drag-to-canvas and distinguish import from place. |
| P1 | Asset scanner indexes every media/assets file; UI defaults to all, including JSON/scripts. | Default to placeable images, filtering before pagination. Retain source documents/scripts under Files and expose missing referenced assets. |
| P1 | Connect an Agent generates configuration; its explanation is below the configuration area. | Rename to Agent setup/access and state the outcome near the action. ChatGPT uses existing DC-WALT; no reverse proxy or tunnel is needed. |
| P1 | Inspector mixes Story, quick layout, checks and Layers; expanded Animation constrains the canvas in the screenshot. | Clear Properties/Layers/Story/Checks organisation; secondary details collapsed; Checks explains layout, fonts and missing assets. |

Primary source paths: `packages/core/src/app/components/pptd/project-panel.tsx`, `project-overview.tsx`, `asset-library.tsx`, `editor-canvas.tsx`, `inspector.tsx`, `agent-connection-dialog.tsx`; `app/routes/huandeng.tsx`; `app/lib/pptd-keyboard.ts`, `huandeng-locale.ts`; `pptd/project-model.ts`, `asset-library.ts`; `packages/desktop/locale.cjs`.

## Competitor lessons from primary sources

1. PowerPoint puts named, collapsible Sections among thumbnails; a selected first slide defines a new Section. Adopt visible grouping and ranges. Stable identity storage is our design, not a claim about Microsoft's internals. [Microsoft Sections](https://support.microsoft.com/en-au/powerpoint/training/organize-your-powerpoint-slides-into-sections).
2. PowerPoint's Notes pane has a draggable boundary. Adopt a visible resize handle; right docking is the user's HUANDENG request. [Microsoft Notes](https://support.microsoft.com/en-us/powerpoint/training/add-speaker-notes-to-your-slides).
3. WPS exposes Section actions in its toolbar and thumbnail context menu. Adopt the contextual entry, not the full Office ribbon. [WPS Section guide](https://help.wps.com/c/wps-slides-editing-collaboration/2087353558488408066-guide-to-adding-or-deleting-sections-in-wps-slides-collaboration-mode?entry=category).
4. PPTist documents object context menus and focus-scoped shortcuts. Adopt the behaviour using HUANDENG's writer/Undo. No code was copied. [PPTist](https://github.com/pipipi-pikachu/PPTist), [official FAQ](https://github.com/pipipi-pikachu/PPTist/blob/master/doc/Q%26A.md).
5. Kimi documents editable generated output and continuing model work from the latest edited result. Adopt clear handoff between external Agent work and direct edits, using existing Story and transactions. Product-documentation claims were not independently benchmarked. [Kimi guide, updated 2026-11-05](https://www.kimi.com/academy/slides-intro).

## End-to-end acceptance

Create the requested roughly ten-slide Drug Design Project using the desktop workflow. Group Main Slides into three continuous Sections. Build a shorter Presentation from Sections and individual slides, including a repeated slide. Recognise sources by preview, reorder, and save while viewing a middle occurrence without losing that location. Format text by context menu/shortcut, reorder an image, drag from Assets and verify scripts/JSON remain under Files. Resize/dock Notes, edit an occurrence's notes without changing Main notes, and inspect a thumbnail's history. Save/reopen, present the selected Presentation, export it, and inspect actual output order/content.

Record source implementation, live UI observation, packaged installation and remote release separately. An audit or an opened picker does not complete the task.
