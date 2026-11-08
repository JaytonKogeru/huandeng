# HUANDENG v0.10 — complete authoring workflow

Date: 2026-11-08. Baseline: `f62dd72b413468b49471dc066c66f707d5fc4e8e` (v0.9). This resumes the interrupted v0.10 worktree. The prior session left dependencies and a verified source export; no v0.10 audit, specification or implementation was recovered in that tree. Independent audits A and B inform this specification.

## Product outcome

A person can open HUANDENG, create or reopen a Project, author Main Slides, organize contiguous Sections, build a Presentation by recognizing slides visually, edit and rehearse it, save, reopen and export it. The native editable Drug Design example is the acceptance task. English is the default interface; Chinese remains selectable and keeps the same core product vocabulary.

## Required behavior

1. **Identity and language.** Use the supplied 幻 mark in the app, welcome screen, executable and shortcuts. New profiles use English regardless of OS language. An explicit language preference remains a preference. Project, Main Slides, Presentation, Story, Section, Slide ID and Position remain English terms in either language. A Slide ID identifies content; Position is derived from the current ordered collection.
2. **Project workflow.** Project provides a clear overview and a visible entry to build a Presentation. New empty Presentations explain their next action. Source choices show a thumbnail, content title, current Position and stable Slide ID; search includes these fields. Selected sources provide a larger preview, and adding a source gives visible confirmation. Story fields must not hide the primary add/reorder/save task.
3. **Sections.** The UI edits a contiguous range in Main Slides rather than assigning every slide independently. Stable boundary identities retain the intended range when slides are inserted inside it. Legacy membership remains readable and is never silently rewritten. Invalid or discontiguous legacy data is explained and can be explicitly converted. Section order follows Main Slides. Presentation references continue to use the existing writer/model.
4. **Save and navigation.** Saving Project/Presentation arrangement retains the current page/occurrence when the collection and source still exist. It must not jump to Position 1 as a side effect. Empty saved Presentations are editable; presenting/exporting one offers the actionable route to add slides.
5. **Workspace.** The main header owns document/collection/save/present/export. The canvas toolbar owns object insertion and animation. Assets has one visible library entry; insertion can import an image directly. Settings/View owns workspace toggles, snapping, language/theme and keyboard help. The status bar owns identity and zoom with a labeled Fit action. Collapse/expand controls sit on the corresponding panel edge. Avoid redundant rows.
6. **Notes.** Notes has a visible resize handle and can dock below the canvas or on the right. Resizing/docking retains text, dirty state and composition behavior. Main notes remain editable; Presentation occurrence notes retain their existing distinct semantics and provide an explicit edit path. Panel layout changes are UI preferences, not document operations.
7. **Inspector and object actions.** Properties, Layers, Story and Checks are navigable contexts instead of one long stack. Checks explain geometry/assets/technical issues and do not claim scientific verification. Canvas object context menus provide quick text formatting, layer order, existing clipboard/group/delete and access to Properties. Shortcuts share action logic, retain normal text-input semantics, and respect read-only/busy state. One format/layer action has one Undo step.
8. **Assets and files.** Assets defaults to placeable images and filters before pagination. JSON, Python, fonts and documents remain available through Files or an explicit all-files choice; they are not presented as drag-to-canvas images. Existing image dragging, source resolution, usage and missing-reference repair stay intact.
9. **Agent setup.** Rename the entry to Agent setup. Explain that it generates/copies configuration for the current Project, with a clear next action per client. ChatGPT uses the already connected DC-WALT workstation and shared CLI. No reverse proxy, new tunnel, new public listener or built-in model runner is introduced.
10. **Extensibility.** Document the existing shared GUI/CLI/MCP and asset import APIs and a small future provider contract. Do not ship a half-defined marketplace or expand trust boundaries during this finishing release.

## Acceptance and delivery

- Focused unit tests for range/identity/keyboard/formatting/asset filters and changed business logic; TypeScript and Biome required before commit. Broader existing unit suite once for the final candidate where feasible.
- Exercise an isolated Windows profile with real UI actions: startup/new/open, source preview/add/reorder/save, save identity, Section range, notes resize/dock, context actions/shortcuts/Undo, language selection, image placement, settings, Agent setup, presentation and export. Inspect screenshot pixels at normal and smaller window sizes.
- Review every Drug Design slide visually. Main deck contains approximately ten editable slides, three contiguous Sections and saved reusable Presentations. Sources are in slide notes and the companion review. Scientific content stays at method/decision level.
- Build and test the actual self-contained Windows package. Installation preserves user document bytes and existing unsaved work, retains the old package, verifies shortcuts and starts the accepted build. Record actual build identity and test outcomes separately from Git publication.
- Deliver audit/spec/implementation/validation/release/handoff documents. Commit only scoped changes, then synchronize the significant tested milestone to private origin and verify its branch/tag. Never publish npm or push upstream.

## Scope carried forward

This completes the requested v0.10 workflow work. A separate presenter window, full PPTX round-trip/native animation, arbitrary occurrence visual overrides and a plugin marketplace remain distinct future capabilities; no acceptance claim depends on them.
