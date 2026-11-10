# Workspace UX and PowerPoint capability audit

Current workspace contract: [v0.17 interface and flow](UI-WALKTHROUGH-V017.md). The historical audit below describes v0.13; its left-rail outline, modal managers, sorter gaps and Ctrl+W behavior are superseded. The six peer central workspaces preserve independent navigation; Ctrl+W cannot close Slides.

Reviewed 9 November 2026 against the v0.13 candidate source. This document answers the workspace and product questions in requests 11–16. It records product decisions and source coverage; it is not a packaged-application acceptance report. New workspace behavior still requires the matching release's desktop validation. No private presentation content, names, paths, or screenshots are included.

## Product direction

HUANDENG should make a research presentation Project easy to navigate, edit, explain, and deliver. Its useful organizing principle is **Project → document → selected object**. A Project owns its Main Slides, Sections, Presentations, source files, assets, history, and Agent activity. A document is either the Slides workspace or a supporting file. The selected object determines the editing tools.

This makes the existing four sidebar tabs reasonable. Pages and Assets directly support composition. Files supports reading the source material. Project describes the whole collection and its presentation routes; it does not need to change the canvas whenever a metadata field receives focus. The problem was the lack of a clear place for each task, especially file reading and switching Projects.

The v0.13 candidate addresses that with persistent Project tabs above the workspace, a permanent Slides document tab, central file previews, and Section navigation inside Pages. A new full-screen Project dashboard is not required to make these changes useful. If Project planning later needs more space, an explicit Overview document would fit this model; that is a future option, not a feature delivered by this candidate. [S1–S5]

## Responsibilities of the visible areas

| Area | Owns | Interaction rule |
| --- | --- | --- |
| Desktop strip | Home and open Projects | A Project tab selects its own service and live renderer. Home remains reachable without closing any Project. A close action names the Project being closed. |
| Project header | Main Slides / Presentation selection, save state, history, Present, Export, Activity | These controls act on the current Project. A Presentation changes the route through shared Slides; it is not another Project tab. |
| Pages | Slide thumbnails, Outline, Section boundaries and current position | Selecting a Slide reveals the Slides document. Collapse changes navigation visibility, not the selected Slide or Section membership. |
| Assets | Find reusable visual material, inspect its source and usage, place it | A compact preview is useful during insertion. A future larger preview can use a document tab; an extra permanent Inspector is unnecessary. |
| Files | Project directory and supporting sources | Opening a supported file reveals it in the center. A `.page` entry selects its Slide. The directory is not itself a second editable document model. |
| Project | Project story, overview, Presentations and collection actions | Keep this a concise summary. Section editing is opened deliberately from Pages or Manage Sections instead of rendering every Section form at once. |
| Center | Slides, or the selected supporting document | Slides remains mounted while a file is read, preserving drafts, selection and authoring state. File tabs are closable; Slides is permanent. |
| Right Inspector | Properties, Layers, Story and Checks for the current Slide | Show relevant controls for the selected content. It does not host the large file document. |
| Notes / Activity panels | Speaker text and Project execution information | Notes belongs to the Slide; Activity belongs to the Project. Each can be opened intentionally. Activity is a progress view, not a second writer or shell terminal. |
| Status and workspace controls | Position, Slide ID, zoom, panel visibility | Status should describe the current context. Persistent action failures stay visible near the action; routine save messages should not consume a large warning banner. |

Two tab levels are justified because they answer different questions: “Which Project?” and “Which document inside it?” They should differ visually in size and position. Repeating Project names, navigation tools and insertion controls in every row would recreate the earlier toolbar crowding. Native Windows title-bar controls share the Project strip in the candidate. [S1–S5]

## What to adopt from the reference products

These are interaction choices inferred from the documented products and the supplied UI example. They are not claims that HUANDENG has every feature of those products.

| Reference | Documented or observed pattern | Adopt for HUANDENG | Leave out of this release |
| --- | --- | --- | --- |
| VS Code | Its central editor has document tabs; sidebars contain navigators; a separate Panel supports output and other tools. Its Outline provides searchable structure. [R1] | Keep file reading central, preserve document state while switching, and give Activity a named panel. Make Pages Outline about Sections and Slides. | Arbitrary editor grids, a general terminal, source-code editing, debugging and extension APIs would add a second product to maintain. File preview alone does not promise an IDE. |
| Photoshop | Document windows can be tabbed; panels monitor and modify work; the Options bar follows the selected tool. [R2] | Separate document navigation from selection properties. Keep frequent text/image actions contextual and let the full Inspector provide detail. | A full image-retouching toolset, unrestricted floating palettes, and a permanently dense controls ribbon are not needed for the current presentation workflow. |
| Blender | Workspaces are arrangements of editors for different tasks, with tabs selecting those arrangements. [R3] | Let the user's task determine which panel deserves space. Preserve the author's chosen arrangement while moving between tasks. | Do not copy Blender workspace tabs literally: HUANDENG's outer tabs represent independent Projects, not alternative layouts of the same scene. Node editors and freely split regions are outside this iteration. |
| PowerPoint | Its basic workflow covers creating Slides, formatting text, adding pictures/shapes, Notes and presenting. It also has distinct Outline and master views. [R4–R6] | Preserve familiar page insertion, selection, common formatting, hide/reorder, Notes and presentation shortcuts. An Outline should expose the story at a glance. | Copying the whole Ribbon is not evidence of feature completeness. Master editing, paragraph structure editing in Outline, and specialized media features need their own document semantics and acceptance. |
| Supplied ChatGPT UI example | The user's screenshot shows persistent global navigation, a clearly separated content region, and restrained separators. | Keep Home reachable, distinguish global Project navigation from local editing, and use consistent spacing and selection states. | Do not turn the slide editor into a transcript or make chat the default center. The slide and its supporting document remain the author's primary objects. |

The strongest opportunity is context clarity, not ornamental restyling. The candidate's small shadows on Section stacks should explain depth and additional Slides; a shadow should not become a substitute for Section title, position, stable ID and count. [S4]

## Central file documents: the intended contract

The candidate keeps each opened preview mounted until its tab is closed. A text selection, scroll position or image fit choice can survive switching to Slides and back. Selecting Pages, Assets, or an actual Slide returns to the Slides document without deleting the open file tabs. Ctrl+W closes the current supporting document first; from Slides it requests closing that Project, including its existing draft checks. [S2, S3]

Supported previews are deliberately explicit. PNG, JPEG, GIF and WebP have image previews. Markdown, JSON, YAML and common scripts appear as read-only source. SVG appears as source in this file preview implementation. PDF, PPTX and other unsupported binaries do not acquire an embedded viewer simply because Files lists them. Large text is bounded and marked when truncated; image size and dimensions are bounded. Existing path checks reject linked files and resolution outside the Project. Reading a script does not execute it. [S6]

Read-only source is a useful first step for inspecting a Project's data structure. A future source editor would need schema validation, dirty-state ownership, expected revisions, undo behavior and a merge/conflict view through the same document service. Adding a writable textarea that bypasses those rules would make the existing canvas less trustworthy.

The candidate keeps separate renderers for separate Projects, so tab switching does not unmount Story, chart, Notes or animation state. This increases memory use; it is the appropriate first implementation for preserving work. After measurement, background resource limits may be added without evicting an unsaved Project. Open Projects and selected layout preferences are persisted. This is not a claim that every unsaved draft or open file tab can be restored after a process crash. [S1, S2]

## PowerPoint basics: current coverage and actual gaps

**HUANDENG does not yet cover all PowerPoint fundamentals.** It has the core free-canvas editing and delivery loop. It lacks several high-value document and presentation capabilities, especially a full master/layout system and PPTX import. The matrix distinguishes source implementations from compatibility guarantees. The older [PowerPoint comparison](POWERPOINT-COMPARISON.md) is useful historical evidence, but its v0.4 animation description is superseded by [ANIMATION.md](ANIMATION.md).

| Capability | Current source coverage | Remaining boundary or gap |
| --- | --- | --- |
| Create, open and switch documents | PPTD create/open, recent Projects, v0.13 persistent Project tabs and Home. [S1] | Arbitrary PPTX opening/editing and live Google Slides documents are absent. |
| Add, duplicate, move, remove and hide Slides | Shared page operations; insertion at gaps; tombstone recovery; reversible hidden metadata. [S4, S7] | A full slide-sorter grid and general batch editing through a sorter are not implemented. |
| Sections and story navigation | Pages thumbnails/Outline, stable identities, first-Slide Section boundaries and focused manager. [S4] | This Outline is navigation/search with text summaries. It is not PowerPoint's editable paragraph outline with promotion/demotion and bulk text editing. [R6] |
| Multiple presentation routes | Main Slides plus ordered Presentation references, repeated appearances and named-version references. [S7] | These are shared references. Editing an active Main Slide can affect multiple routes; the UI must keep that scope legible. |
| Free-canvas object editing | Position/size/rotation, multi-selection, duplication, object order, grouping, alignment/distribution and snapping. [S8] | Complex path editing, the complete PowerPoint shape-editing surface, and an unrestricted drawing program are outside current coverage. |
| Common text formatting | Whole-box font family/size/line spacing/alignment; selected-text bold, italic, underline, super/subscript, color and highlight. [S8, S9] | Selected-text font-family/size controls, full paragraph indent/list tooling and deck-wide text find/replace do not have equivalent dedicated UI. Do not imply that every right-side font field targets a partial selection. |
| Images and visual assets | Import/place/drag, crop values, geometry, project asset usage and source previews. [S8, S10] | Dedicated interactive crop handles, background removal, image correction and complete PowerPoint artistic effects are not covered by this interface. |
| Layout consistency | Figure recipes and explicit matching of an existing title's geometry/style. [S11] | These are useful authoring operations, not a Slide Master with inherited layouts, placeholders and global propagation. Main Slides must never be described as a Slide Master. [R5] |
| Tables, formulae and charts | Scientific objects have editable source models; supported families map to native PPTX objects. [S12] | More advanced chart axes/statistics, custom error bars, trend fitting and SmartArt-style semantic diagrams are separate work. Original scientific figures can remain image assets. |
| Notes and Story | Speaker Notes, per-Slide purpose/constraints, Section and Presentation stories, resizable/dockable Notes. [S2, S13] | Notes and authoring intent are different data. A slide's scientific evidence and narration should not be collapsed into an all-purpose comment field. |
| Save, undo, recovery and page history | Revision-checked shared writes, automatic saved working state, operation history and explicit portable named page versions. [S7, S14] | These are not cross-machine live coauthoring, threaded comments, track changes or a distributed conflict-free document. OneDrive synchronization alone does not provide those features. |
| Present | Slide navigation, hidden-slide filtering, build steps, blackout, Notes/next-page aids; native fullscreen/edge controls in this candidate. [S15] | Complete dual-monitor Presenter View, rehearsal timing and narration recording remain absent. The same-window Notes helper must not be advertised as a separate presenter screen. |
| Animation and video | Click-triggered builds, advanced keyframes, preview and slide fade; deterministic MP4 export using an available FFmpeg. [S15] | PPTX animation/timing is not exported. MP4 has no narration/audio track, with documented duration and dynamic-media limits. |
| Fonts | Preset families, custom font stack and a local availability check in Settings. [S16] | A preset does not install a font. Export references fonts; it does not embed them or guarantee their presence on the recipient's computer. |
| Accessibility and review | Keyboard/focus handling and technical file/font/layout diagnostics. [S17] | A full accessibility checker, complete reading-order/alternative-text workflow, spelling/grammar review and PowerPoint review collaboration are not implemented. Technical Checks is not an accessibility certification. |
| Delivery | PPTX, PDF, PNG and supported MP4; explicit Project output and configured shared copies. [S12, S15, S18] | PPTX conversion is one-way delivery. It is not arbitrary PPTX round-trip fidelity, a live Office document, or a Google Slides connector. |

## PPTD → PPTX: what the export currently promises

PPTD remains the editable source. The export path creates a frozen document snapshot and maps supported text, lines, shapes, pictures, tables, formulae, charts and groups to their available PPTX representations. Advanced unsupported rendering uses a reported object-level image fallback when a reliable result is available. It does not automatically flatten every slide. Missing or invalid content without a safe fallback prevents a successful complete export. [S12]

Editability and appearance are separate checks. Native chart data, table cells or formula objects can be editable while Office lays out text or labels differently. Fonts are referenced, not embedded. Current PPTX delivery uses the base static layout; HUANDENG builds and transitions remain in PPTD. Historical Office acceptance demonstrates those earlier tested cases, not an unconditional guarantee for every new document or this new executable. Package validation, source immutability and actual Office rendering remain distinct gates. [S12, S15, S18]

For publishing, generate the canonical fixed PPTX in the Project first and distribute a verified ordinary-file copy to a configured shared location. See [PPTX-PUBLISHING.md](PPTX-PUBLISHING.md) for the atomic replacement, OneDrive link limitation, hidden scheduler, export reports and format matrix. A successful local shared copy is not proof of a completed OneDrive upload. [S18]

## Priorities after this iteration

1. **Finish the current navigation and reliability gate.** Measure independent Project drafts, close/reopen behavior, per-Project Agent identity, large-deck memory use, central preview keyboard behavior and actual fullscreen on the packaged executable. All later features depend on this working predictably.
2. **Make frequent authoring adjustments faster.** Add selected-text font size/family and deliberate paragraph/list controls; improve image crop interaction; make disabled layout controls explain what to select. These solve daily actions before adding more decorative templates.
3. **Introduce reusable layouts with explicit inheritance.** A small title/content/Section-cover system can build on captured title styles and recipes. It needs clear detach/override rules and previewed multi-page changes before becoming a global master editor.
4. **Strengthen presentation and review.** Add a real independent presenter screen, practical accessibility metadata/checking and document search when a concrete use case requires them. Keep each feature separate from source/render versioning.
5. **Treat PPTX import as a distinct project.** Start with a published import support matrix and unsupported-object diagnostics. Do not turn the export button into an unqualified compatibility claim.

## Source map

Repository paths below identify the reviewed implementation. They do not replace release validation results.

- **S1:** [Desktop main](../packages/desktop/main.cjs), [Project registry](../packages/desktop/project-tabs.cjs), [workspace shell](../packages/desktop/workspace-shell.js).
- **S2:** [Editor route](../packages/core/src/app/routes/huandeng.tsx), [workspace preference lifecycle](../packages/core/src/app/lib/pptd-preferences.ts), [leave/save guard](../packages/core/src/app/lib/use-pptd-document.ts).
- **S3:** [Document tabs](../packages/core/src/app/components/pptd/workspace-document-tabs.tsx), [central file panel](../packages/core/src/app/components/pptd/file-preview-panel.tsx).
- **S4:** [Pages and Outline](../packages/core/src/app/components/pptd/thumbnail-rail.tsx), [Project panel](../packages/core/src/app/components/pptd/project-panel.tsx), [Section editor](../packages/core/src/app/components/pptd/project-section-editor.tsx).
- **S5:** [Activity panel](../packages/core/src/app/components/pptd/activity-panel.tsx), [Project overview](../packages/core/src/app/components/pptd/project-overview.tsx).
- **S6:** [Project file preview model and bounds](../packages/core/src/pptd/project-file-preview.ts), [file tree](../packages/core/src/app/components/pptd/project-tree.tsx).
- **S7:** [Document store](../packages/core/src/pptd/store.ts), [Project model](../packages/core/src/pptd/project-model.ts), [visibility behavior](AUTHORING-V0121.md).
- **S8:** [Inspector](../packages/core/src/app/components/pptd/inspector.tsx), [arrangement controls](../packages/core/src/app/components/pptd/arrangement-controls.tsx), [object context menu](../packages/core/src/app/components/pptd/object-context-menu.tsx), [canvas](../packages/core/src/app/components/pptd/editor-canvas.tsx).
- **S9:** [Inline text editor](../packages/core/src/app/components/pptd/inline-text-element.tsx).
- **S10:** [Asset library](../packages/core/src/app/components/pptd/asset-library.tsx).
- **S11:** [Layout recipes](../packages/core/src/app/components/pptd/recipe-panel.tsx), [title style matching](../packages/core/src/app/components/pptd/title-layout-panel.tsx).
- **S12:** [PPTX exporter](../packages/core/src/pptd/export.ts), [scientific objects](SCIENTIFIC-OBJECTS.md), [native mapping and historical Office evidence](POWERPOINT-COMPARISON.md).
- **S13:** [Story](STORY.md), [Notes panel](../packages/core/src/app/components/pptd/notes-panel.tsx).
- **S14:** [Page history](../packages/core/src/pptd/page-history.ts), [history dialog](../packages/core/src/app/components/pptd/page-history-dialog.tsx).
- **S15:** [Animation and video boundaries](ANIMATION.md), [presenter](../packages/core/src/app/components/pptd/presentation-view.tsx).
- **S16:** [Font library](../packages/core/src/app/components/pptd/font-library.tsx), [preset catalog](../packages/core/src/app/lib/pptd-font-catalog.ts).
- **S17:** [Technical checks](../packages/core/src/app/components/pptd/technical-qa-panel.tsx), [keyboard handling](../packages/core/src/app/lib/pptd-keyboard.ts).
- **S18:** [PPTX publishing](PPTX-PUBLISHING.md).

## Official reference material

Accessed 9 November 2026. Conclusions about what HUANDENG should adopt are this audit's design judgments; feature descriptions are drawn from these primary sources.

- **R1:** Microsoft, [Visual Studio Code user interface](https://code.visualstudio.com/docs/editing/getting-started/userinterface).
- **R2:** Adobe, [Photoshop workspace overview](https://helpx.adobe.com/photoshop/desktop/get-started/learn-the-basics/workspace-overview.html).
- **R3:** Blender Foundation, [Workspaces](https://docs.blender.org/manual/en/latest/interface/window_system/workspaces.html). The official indexed documentation was readable; the direct fetch returned an access error during this audit.
- **R4:** Microsoft, [Basic tasks for creating a PowerPoint presentation](https://support.microsoft.com/en-us/powerpoint/basic-tasks-for-creating-a-powerpoint-presentation).
- **R5:** Microsoft, [Choose the right view for the task in PowerPoint](https://support.microsoft.com/en-us/powerpoint/training/choose-the-right-view-for-the-task-in-powerpoint).
- **R6:** Microsoft, [Create and print a presentation in Outline view](https://support.microsoft.com/en-us/powerpoint/create-and-print-a-presentation-in-outline-view).
