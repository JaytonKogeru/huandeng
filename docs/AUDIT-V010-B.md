# v0.10 independent user journey audit B

2026-11-08, Australia/Sydney. Baseline: `f62dd72b413468b49471dc066c66f707d5fc4e8e`.

This audit independently traces opening HUANDENG, creating a Project, organizing Main Slides and Sections, assembling a Presentation, editing, saving, presenting and exporting. Evidence is source inspection plus the user's recorded interaction. It is not a claim of completed desktop acceptance; the release owner performs that separately.

## Recovery

The inspected THUG worktree was clean at the v0.9 handoff commit. `docs/notes`, `docs/research` and `.verification` contained earlier reviews and the v0.10 dependency/development export preparation. No completed prior v0.10 audit/spec or implementation was recovered there. The v0.9 handoff records the saved-arrangement navigation jump as a pending issue.

## Findings

| Priority | Observed behavior | Concrete change and acceptance |
| --- | --- | --- |
| P0 | `project-panel.tsx` creates a local Presentation draft while the canvas stays in the old persisted collection; Story fields precede the essential arrangement action. | Put the new Presentation title, empty state and Add slides together. A first-time user can assemble and save it without searching another pane. |
| P0 | Source picker is a native select whose slide options contain only shortCode/legacy label/UUID. Search covers IDs/path, not content. | Use thumbnail/title/Position/Slide ID rows with hover and keyboard-focus preview. Repeated references remain distinguishable. |
| P0 | Section membership is arbitrary pageIds, with independent internal reorder buttons and one selector per Main Slide. It can be discontinuous and disagree with Main order. | Section authoring uses contiguous Main Slide ranges or start boundaries, shown as headers/counts/children. Stable IDs persist; positions are current ordinals. Preserve legacy custom membership until explicit conversion. Test insertion before/inside, move and boundary deletion. |
| P0 | `ProjectPanel.save()` always calls `onSelectPresentation`; route `selectPresentation()` always deletes page/occurrence query state. | Preserve current page/occurrence when saving the same collection; choose a defined nearby survivor only if that occurrence was removed. |
| P1 | Browser/desktop fresh locale follows system language; welcome starts/falls back to Chinese. | English default for fresh profiles, preserving explicit language preferences. Core product nouns remain English in both modes. |
| P1 | Left Materials and the canvas toolbar Materials button open the same browser. Adjacent uploads also duplicate the import-and-place action. | Left navigation owns Materials/Files; make any insertion action distinct. Consolidate View/settings and Help commands. |
| P1 | Notes is fixed `h-28` with `resize-none`; inspector is fixed `w-72`. Both collapse controls sit in the canvas footer. | Visible resize boundaries, bottom/right Notes dock, panel-header collapse and edge reopen controls, remembered preferences and reset. |
| P1 | No object context menu; ordering supports only extremes. Inline rich text has B/I/U but selected text-box shortcuts are missing. | Shared object commands for menu/shortcuts/inspector: B/I/U, font size, color, four ordering moves, copy/paste/group/duplicate/delete. Preserve input/IME ownership and Undo. |
| P1 | Asset indexing includes every media/assets file; JSON and Python appear beside placeable images. | Materials defaults to placeable visual resources; Files retains data/scripts/support files. Match counts/pagination to the filter and preserve missing-resource diagnostics. |
| P1 | Inspector stacks Story, layout recipes, Technical QA and Layers. | Properties / Layers / Story / Checks tabs; checks explained as file/font/layout diagnostics. Keep drafts mounted while changing tabs. |
| P1 | Connect Agent generates configuration and does not connect a client. | Agent setup clearly describes generating/copying config. ChatGPT uses the existing DC-WALT workstation, without a new public tunnel or proxy. |
| P2 | Maximize2 in footer means Fit, with no visible effect when already fitted. | Explicit Fit label/tooltip, separate from fullscreen. |
| P2 | Open AssetLibrary reloads on every snapshot sequence even for text-only edits. | Measure the actual asset task before claiming speed improvements; prefer targeted invalidation and stable preview keys. |

Main source entry points are `packages/core/src/app/routes/huandeng.tsx`, `app/components/pptd/{project-panel,asset-library,inspector,editor-canvas,agent-connection-dialog}.tsx`, `app/lib/pptd-keyboard.ts`, `pptd/{project-model,asset-library}.ts`, and desktop welcome/locale files. Paths beginning with `app` or `pptd` are relative to `packages/core/src`.

## Competitor decisions

Official documentation retrieved 2026-11-08:

- [PowerPoint Sections](https://support.microsoft.com/en-au/powerpoint/training/organize-your-powerpoint-slides-into-sections) creates Sections at the first slide/between slides and shows collapsible named headers/counts. Adopt visible contiguous grouping while retaining HUANDENG stable IDs.
- [PowerPoint Notes](https://support.microsoft.com/en-us/powerpoint/training/add-speaker-notes-to-your-slides) supports dragging the Notes top boundary. Adopt a visible resizing affordance. A Notes toggle on a status bar is not itself a defect; unrelated controls and missing resizing are the concrete problems here.
- [PowerPoint Selection Pane](https://support.microsoft.com/en-gb/powerpoint/select-individual-objects-on-a-slide) makes list order correspond to layer order. Adopt predictable ordering controls. Hiding/locking requires its own explicit playback/document semantics.
- [WPS view options](https://www.wps.com/academy/how-to-set-the-view-effect-of-wps-presentation/1861884/) groups layout settings and provides selection/right-click mini toolbars. Adopt local formatting access, without copying an entire ribbon hierarchy.
- [VS Code Custom Layout](https://code.visualstudio.com/docs/configure/custom-layout) exposes panel position through View/Appearance and panel headers, with reset options. Adopt a bounded Notes bottom/right dock; arbitrary IDE docking is unnecessary here.

## Acceptance walkthrough

Use a disposable copy of the approximately ten-slide Drug Design project, two Sections, two Presentations and one repeated slide reference. Check normal and compact English windows.

1. Open/create a Project and identify Main Slides, supplied brand icon and next action.
2. Create a Presentation, identify/add slides visually, add a Section, repeat a slide, reorder and remove references.
3. Save while viewing a middle Main Slide and a repeated occurrence; preserve selection. Reopen and verify arrangement.
4. Change Section boundaries and insert/move/delete slides; verify specified continuous behavior after reopening and in Presentation expansion.
5. Format selected text with menu and shortcuts; Undo/Redo; verify inline text/IME behavior separately. Reorder images and nested groups.
6. Drag a Material; find sidecars in Files; retain missing-image diagnostics.
7. Resize/dock Notes, collapse/reopen panels from their own boundaries, reset layout, and preserve text/drafts/selection.
8. Generate/copy Agent setup without claiming connection or changing client settings.
9. Present from start/current slide, exit, export the intended Presentation, reopen, and verify source assets.
10. Verify fresh English, explicit locale switching, and persistence without changing authored content.

Preserve shared writer/CAS/recovery, stable page and occurrence identity, version pinning, original assets, inline rich text and existing user preferences. Source tests, desktop acceptance, installed package provenance and remote release each need their own evidence.
