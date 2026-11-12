# HUANDENG Editor 0.22 — final public-release update

## Audit

The author has accepted the six introduction editions. Their narrative, artwork and page sequences remain frozen. The requested work is desktop usability and project handoff, followed by publication of the existing GitHub repository.

The current desktop shell has horizontal project tabs but no reorder interaction or vertical mode. Workspace settings is a narrow, long scrolling dialog: panel visibility, editing, fonts, language and appearance compete for one column. Export offers presentation outputs but no complete editable Project archive. Named page versions already belong to the Project; machine operation/recovery logs and connection state do not.

The repository is at the tested 0.21 milestone. Existing user edits and untracked authoring material are not release changes. Audit current open projects and preferences at deployment time, rather than restoring an earlier session by assumption. Performance and package decisions use measured running behavior and component sizes; no broad framework or dependency upgrade is planned.

## Spec and frame

### Project tabs

Keep the same open-project model and WebContentsView instances. Drag a tab to reorder it in either orientation, show the insertion position, preserve the active project, and persist the new order. Provide a keyboard/context-menu alternative. The shell offers horizontal tabs or a left vertical list; the latter can collapse to a narrow rail with meaningful accessible project labels. Home, application commands and native window controls remain reachable. Presentation mode uses the full content area and restores the chosen tab layout on exit.

Use an application-level `projectTabs` preference with `orientation` (`horizontal` or `vertical`) and `collapsed` fields. The desktop main process owns this preference and validates partial updates. Renderer bridge methods are `getTabLayout`, `setTabLayout` and `onTabLayoutChanged`; all open Projects observe changes. Keep document page order entirely separate from application tab order.

### Workspace settings

Use three compact groups: Workspace, Editing and Fonts. Workspace exposes labelled theme and language controls, desktop tab orientation and vertical collapse, panel visibility, and Notes dock (bottom or right). Editing contains snapping and keyboard help. Fonts retains the real installed-font check and preview. The group navigation and heading remain visible while only the current content scrolls. At narrow window widths the dialog fits without horizontal overflow. Settings apply immediately; failures remain visible and do not masquerade as saved preferences. Reset applies to the editing layout, not document content, language, theme or open Projects.

### Portable Project export

Add `Editable Project (ZIP)` to the existing Export dialog and force its scope to the entire Project. ZIP is a single ordinary archive, requiring no new compression dependency or special HUANDENG import format. After extraction, the recipient opens the original `.pptd` entry.

Preserve editable pages, original media and other authored project sources, Story, Sections, Presentations, project rules and portable named versions. Reuse the existing document consistency and export job boundary so the archive represents saved work. Do not copy machine connection/session state, machine operation/Undo logs, dependencies, repository internals, caches or recursively generated export bundles. The UI explains the handoff scope. Missing, external or unsafe required dependencies must not produce an apparently complete handoff. Use relative paths, preserve Unicode filenames, and validate extraction and reopening, including a Presentation pinned to a named version.

### Performance and release

Measure the installed package and actual multi-project behavior. Apply only narrow optimizations with a demonstrated cause, retaining the shared writer, original assets, meaningful history and active editing state. Do not silently discard tabs to reduce memory. Validate the new package at a normal desktop size and a smaller window.

Finish concise English and Chinese setup instructions, licensing/attribution and a tagged Windows release with the maintained plugin packages. Check the tracked source and history for actual credentials before changing repository visibility. The user has explicitly authorized making the existing GitHub repository public and publishing this completed update; no extra approval is needed. Keep the inherited npm publication disabled.

## Validation and release gate

Check tab reorder, active-project stability, keyboard operation, both orientations, collapse, resize, fullscreen/presentation restoration and preference persistence. Check settings in English and Chinese, desktop-wide updates and failure handling. Check ZIP bytes and paths, saved-state consistency, cancellation, portable named versions, exclusions and opening the extracted Project. Run focused regressions, core typecheck, production build and required repository formatting/lint. Inspect the real packaged UI. Preserve current author files and current open-project preferences during the normal-close installation, then publish the tested milestone and its release assets.
