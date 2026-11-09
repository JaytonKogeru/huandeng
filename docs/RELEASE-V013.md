# HUANDENG Editor 0.13.0

## Workspace release

- Keep multiple Projects open in browser-style tabs; return to Home/recent Projects without closing work.
- Read files in central document tabs while retaining the Slides canvas and drafts.
- Switch Pages between Thumbnails and Outline. Manage Sections from Pages using first-Slide boundaries; folded covers gain restrained card shadows.
- Enter fullscreen directly from Present or F5. Controls stay hidden until the bottom edge or keyboard focus; Escape restores the editing workspace.
- Follow explicit Agent task stages and actual writer receipts in each Project's Activity panel.
- Use a derived Main Position field for slide-number footers without rewriting page content on every reorder.
- Export into each Project first, validate, then quietly update a fixed shared PPTX. Save-triggered publishing and a silent scheduled fallback share one process lock.
- Use the transparent supplied mark for desktop/document icons and consistent HUANDENG Editor file registration.
- Authoring plugin 0.13.0 requires approved-page references, concrete layout choices, original evidence and actual rendered review.

## Compatibility

PPTD is the editable source. PPTX export supports native editable text, supported shapes/lines, images, tables, charts, groups and equations, with declared element fallbacks. Complex effects and fonts may differ; click builds remain static in PPTX. Arbitrary PPTX import, live Google Slides editing, a separate presenter display and an editor plugin marketplace are not included.

Existing Section ranges/member lists remain readable; conversion is explicit and validated. Existing numeric text remains text until **Use Slide Position** is selected. Notes and Story continue to create meaningful history. Activity requires clients to report their task stages and does not expose model-internal reasoning.

## Evidence and delivery

See [Audit](AUDIT-V013.md), [Specification](SPEC-V013.md), [Implementation](IMPLEMENTATION-V013.md), [Validation](VALIDATION-V013.md), [Workspace UX](WORKSPACE-UX.md), [Position fields](POSITION-FIELDS.md) and [PPTX publishing](PPTX-PUBLISHING.md).

The installed clean runtime is `886d6460cc3f690b2f153ba51a512e010d0dfb56`, built at `2026-11-09T05:45:58.5461954Z`. Its exact packaged desktop passed all 14 native workspace checks. The release also includes 82 distinct focused Vitest tests across 13 files, desktop recovery/publisher/client regressions, and actual Office editing/reopen acceptance for the supported scientific export objects. Guarded installation restored two existing Projects in one workspace while preserving their sources and the unrelated local fixture. The existing authoring plugin and native client adapters are 0.13.0. See [Handoff](HANDOFF-V013.md) for delivery details and [selected synthetic evidence](evidence/v013/README.md) for artifact-specific results.

Only Editor code, synthetic fixtures and selected evidence are committed. Private Projects, research figures, paths, publisher settings and installation receipts stay outside this repository. No upstream or npm publishing is performed.
