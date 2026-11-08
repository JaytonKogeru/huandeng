# HUANDENG v0.12 — Sections, text selection and client plugins

**Accepted and installed: Editor 0.12.0.** Clean runtime source `01780db2871d2eb516fcd7a00ccbcc43f666daa1`, built `2026-11-08T12:59:10.9221682Z`. **Client plugin 0.12.1** is delivered with portable local adapters and a separately generated private ChatGPT package. Release tag: `editor-v0.12.0`.

## User-visible changes

| Area | Result |
| --- | --- |
| Section identity | Pages, Project and source selection show current Section Position; persistent Section ID remains inspectable/copyable. An explicitly marked leading front-matter Section displays 00; ordinary Sections begin at 01. |
| Folding | The heading being folded retains its rail position. Unrelated selected Slides no longer pull the rail away. Selection and playback order remain intact. |
| Create Section | A gap context menu can start a Section at the next existing Slide, extending through the next boundary. The dialog shows the range, validates fresh neighbors and uses shared Save/Undo. |
| Slide movement | Upper/lower thumbnail halves, exact gaps, insertion markers and edge scrolling make before/after placement explicit. Stable IDs survive moves. |
| Partial text | Selected words have Text color and Highlight actions. Range capture survives menu focus; existing emphasis, input methods and Undo remain supported. Saved semantic markup retains its colors and backgrounds. |
| Zoom | Ctrl-wheel/Meta-wheel zoom around the pointer from 15% to 300%; ordinary and Shift scrolling remain available. |
| Local clients | Codex, Claude Code and DeepSeek Harness can resolve a local Editor and verify the intended active Project. Explicit invalid choices fail and ambiguous choices require selection. |
| ChatGPT | The private package binds the existing authorized workstation app. The authenticated owner page and Try in chat flow were verified through an unsent HUANDENG composer. No new reverse proxy, public listener or tunnel is introduced. |

## Acceptance

Full units: **1,096 passed, one platform skip** across 99 files. Client tests: **8 passed**. TypeScript, Biome and production build passed. The exact clean package passed **eight UI groups and two launches, one normal reopen, and two normal exits**, with no renderer errors. The ordinary installation and installed 18-tool/two-guide bridge passed their own checks. Authorized private authoring and native output were independently reviewed without adding those materials to the code repository.

See [Validation](VALIDATION-V012.md), [Audit](AUDIT-V012.md), [Specification](SPEC-V012.md), [Implementation](IMPLEMENTATION-V012.md), [Authoring guide](WORKFLOW-V012.md), and [Handoff](HANDOFF-V012.md).

## Compatibility and scope

Section Position is derived; Section ID and first-Slide boundary identity remain stable. Existing fixed ranges/member lists preserve their semantics. Front matter is explicit rather than inferred from a title. The shared GUI/CLI/MCP writer retains revisions, idempotency, preview binding, history and Undo. Project data remains portable outside the application directory.

Native client installation, protocol connectivity, an actual model task, and ChatGPT account installation are separate outcomes. The private account release does not by itself prove a conversation loaded it; [Client delivery](../plugins/huandeng/docs/V012-CLIENT-DELIVERY.md) records the observed boundary.

PNG/PDF/PPTX retain their existing static-export scope. Full PPTX round-trip, native Office animation, independent presenter windows, occurrence visual variants and an editor plugin marketplace remain separate capabilities. This release adds no new long-session/high-resolution performance claim.

## Privacy and delivery

The reviewed runtime changes and client archives contain editor code, generic documentation, the supplied product icon and synthetic tests. Portable packages contain no personal Project or account app binding. Private authoring pages, figures, IDs, paths, source citations, screenshots and receipts stay with the user's private files.

The repository remains private. Previous bounded history review found identifier/path traces in older commits; current-tree cleanliness does not erase Git history. No history rewrite, visibility change, upstream push or npm publication forms part of this release. A separate scoped cleanup is required before making the repository public.

The runtime source commit above identifies the clean source used for the accepted build; the installed-file manifest matches the candidate manifest. A separate documentation/evidence delivery commit and annotated tag identify this release record; actual origin refs are verified after the milestone push.
