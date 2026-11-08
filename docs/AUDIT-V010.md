# HUANDENG v0.10 audit decisions

Date: 2026-11-08. Baseline: `f62dd72b413468b49471dc066c66f707d5fc4e8e`.

The interrupted worktree contained dependencies and a source export, but no completed v0.10 audit/specification or implementation. Two independent reviews repeated the same user journey: [audit A](AUDIT-V010-A.md) and [audit B](AUDIT-V010-B.md). They agree with the recorded user experience: the Main Slides / Presentation model is useful, but recognition, next actions and control placement were obscured.

| Task or reported problem | v0.10 decision |
| --- | --- |
| Start from the editor icon | English for fresh profiles; retain New/Open/Recent Project and publish a complete walkthrough |
| Build an empty Presentation | Keep name, visual Add slides or Sections, arrangement and Save Project together; collapse optional Story/details |
| Recognize a source slide | Title, thumbnail, Position and Slide ID, larger hover/focus preview, search and append feedback |
| Understand Section membership | Continuous Main ranges with visible members/thumbnail headers, stable boundary IDs and explicit legacy conversion |
| Save without jumping to the beginning | Preserve navigation when saving the same collection and retain the occurrence while it still exists |
| Find insertion, workspace and help commands | Header for document/delivery, toolbar for objects, Settings for workspace/help, status bar for identity/zoom/Fit |
| Resize and move Notes | Draggable boundary, bottom/right dock and persisted bounded layout |
| Collapse or resize sidebars | Controls at each corresponding panel edge |
| Make quick object adjustments | Shared menu, shortcut and Inspector commands for text styling and four layer moves with one Undo step |
| Understand Inspector contents | Mounted Properties/Layers/Story/Checks tabs; retained drafts and explained technical diagnostics |
| Reuse Assets without script clutter | Images by default; supporting files in Files/All files; preserve import/reuse and actual image dragging |
| Understand Connect Agent | Rename Agent setup, explain configuration output and the next step; ChatGPT uses existing DC-WALT |
| Replace the H mark | Use the supplied original mark in UI, welcome, packaged icon assets and shortcuts |
| Keep integrations open | Document existing shared CLI/MCP/HTTP surfaces and a bounded future asset-provider contract |
| Validate a real scientific task | Ten editable Drug Design slides, three range Sections and full/brief reusable Presentations |

Primary-source comparisons are in audits A/B. PowerPoint's Sections/Notes, WPS's contextual operations, PPTist's object menus and focus-scoped shortcuts, and VS Code's panel positioning informed the relevant choices. Kimi's documented cycle between generated output and direct editing informed the external-Agent handoff explanation. These comparisons are not independent product benchmarks or claims of feature parity.

The release does not adopt a full Office ribbon, replace PPTD as the source of truth, introduce a model executor or new tunnel, or ship an undefined marketplace. Those expansions do not resolve the reported task-flow failures. The agreed finishing scope is in [SPEC-V010](SPEC-V010.md).

Audit observations, source tests, actual editor behavior, packaged acceptance, installation and Git publication have separate evidence. An opened picker or passing unit test is not a completed user journey. VALIDATION-V010 records actual outcomes and failed attempts; RELEASE-V010 and HANDOFF-V010 record the accepted runtime and delivery.
