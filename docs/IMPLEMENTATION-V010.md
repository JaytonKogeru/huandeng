# HUANDENG v0.10 implementation

The resumed work follows Audit → Specification → Implementation → Validation → Release. See SPEC-V010.md for the acceptance contract.

## Ownership

- Lead: recovery, specification, route/workspace/Notes, language, Assets, branding, integration, Windows acceptance and release.
- Independent audit A / Project implementation: source picker, Presentation flow, Sections, save identity.
- Independent audit B / object implementation: object context actions, keyboard mapping, inspector contexts.
- Drug Design: researched narrative and reproducible native PPTD example.

## Recovery

The Windows v0.10 worktree is `D:/_Proj/Huandeng-v010-20261108`, branch `editor/v0.10-product-workflow`, starting at f62dd72. The canonical installed application remains v0.9. The old isolated v010 UX harness was found under the v09 worktree; its waiting process is not active product development. The recovered source ZIP SHA-256 is `b9eb1276f59a1400c77c748f1f432b4f1ff5321bf43e98079dfecfc8133dcb88`. Local editing is a transfer snapshot only; Windows retains authoritative Git history and build provenance.

## Implemented behavior

Project source selection uses content titles, stable Slide ID, derived Position, lazy thumbnails, larger hover/focus preview and explicit append feedback. Optional Story and occurrence notes/version details are collapsed. Saving the viewed collection does not reselect it or reset its page/occurrence.

Section `range` stores start/end page IDs. Resolution follows current Main order, diagnoses missing/reversed/overlapping boundaries, preserves legacy membership and refreshes its compatibility cache only during an explicit valid Project save. Main thumbnails expose Section headers. Model/writer tests cover insertion, invalid boundaries, old projects and reopen.

The workspace has a document header, object toolbar, panel-edge controls and identity/zoom footer. Settings contains panel toggles/reset, snapping, help, theme and language. Native menus remain accessible with Alt. Notes supports draggable/keyboard resizing and bottom/right docking. Properties/Layers/Story/Checks stay mounted while switching tabs to retain drafts.

Menu, shortcut and Inspector actions share text-format/layer dispatch. Effective page-theme styles are respected, group order stays within sibling scope, and each operation uses the existing writer and Undo. Underline is preserved in rendering and native text export. Assets filters images before counts/pagination, retains supporting files and uses the shared writer for reuse/import/internal dragging.

English is the fresh-profile default. Static Chinese templates preserve core English nouns before interpolating authored text. Agent setup explains configuration generation, with ChatGPT using existing DC-WALT. The supplied branding PNG is retained with SHA-256 `bd04c9ebb0e94cdaa5ba6c3a7df8d5ae1d35236933b3ca9ab297912d7b870530`; generated assets derive from it. Desktop product version is 0.10.0, separate from inherited npm versions.

Drug Design has ten native editable slides, three stable-boundary Sections and full/brief Presentations. Notes and a bibliography retain primary sources. The reproducible generator refuses an existing destination without explicit replacement.

## Findings resolved during integration

- A test helper sent repeated Escape events while a closing menu remained mounted, clearing selection. It now waits for ordinary menu closure and sends one Escape when dismissal is intended. Repeated layer edits then passed.
- Semantic `hr` resize handles inherited zero height, preventing vertical-edge dragging. Explicit stretch height fixes the real defect; actual Notes and sidebar drags passed afterwards. The harness now checks both dimensions.
- Internal image placement awaited lookup/decode before engaging the close guard. It now marks import pending before the first await and clears that state in finally, retaining the captured target.
- Debounced layout persistence could lose an immediate close. The normal leave response carries the latest layout; the host saves inside the current operation, avoiding a queued-IPC deadlock. Renderer/revision stamps prevent delayed stale saves from overwriting it. Real temporary-file writer tests and immediate-close UI regression cover this path.
- Old default-Chinese test labels were updated to English or explicit locale transitions. Data preservation, unsupported-schema and disabled-control assertions remain intact.

Concrete run counts, visual review, packaging and installation belong to VALIDATION-V010, RELEASE-V010 and HANDOFF-V010. Development-host success alone is not claimed as accepted installed behavior.
