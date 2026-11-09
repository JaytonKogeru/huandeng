# HUANDENG Editor 0.15.0

This release separates editing a slide, inspecting the whole presentation and preparing speaker notes. It also fixes mixed-language controls and document-close behavior.

- **Consistent language:** Chinese and English translate application controls, empty states and native menus. Authored titles, notes, figures and identifiers retain their original language.
- **Workspace views:** the permanent Slides document contains Edit, Section browser and Notes page. The browser renders actual slides under section headings, supports search, three thumbnail sizes and explicit Main-order move controls. Notes page shares the existing notes draft and save path.
- **Navigation:** thumbnails use compact insertion gaps. Navigation titles prefer explicit semantic roles and visible heading hierarchy, and search includes existing Story. Numeric authored headings remain valid titles.
- **Application actions:** assistant connection moves beside Activity. Ctrl+W closes an active file preview and retains the permanent Slides document. Explicit Project/window close retains draft protection. Playback offers From beginning and From current slide.
- **Interactive animation:** the existing effects and click-step engine is presented as object effects, click steps and page transition. Advanced keyframes remain available. PNG/PDF/PPTX remain static exports.
- **Plugin:** instructions distinguish UI language from authored language, Position from stable identity, section anchors from divider pages, and prepared configuration from observed execution. Reference inspection, exact saved receipts and rendered review remain the authoring workflow.

Editor and plugin versions are 0.15.0. The core npm package remains 2.3.1; no npm publication or upstream push is part of this release. Delivery evidence is recorded in [Validation](VALIDATION-V015.md) and [Handoff](HANDOFF-V015.md); actual interface screens and operations are in the [walkthrough](UI-WALKTHROUGH-V015.md).

Accepted runtime source is `127e9c8900203ea5abe7dc1774396c4c4cd58fde`. Final source verification passed 113 test files (1,197 tests, one existing skip), core typechecking and eight portable-client tests. The exact Windows package passed 23 native workflow checks with no renderer exceptions. Independent whole-branch review and the scoped fix review completed before installation.

Browser reordering uses buttons and Alt+Up/Down; existing rail drag remains available. Browser search, collapse and size preferences reset when leaving that view. When a document has no explicit title semantics, heading inference is a navigation heuristic and does not rewrite its content. There is no new master system, native PowerPoint animation export or claim of superior aesthetics based on a controlled comparison.
