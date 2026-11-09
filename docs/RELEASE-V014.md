# HUANDENG Editor 0.14.0

This release connects visual layout authoring, saved-change review and the scope of an edit in one existing workspace.

- **Layout:** choose one of three figure compositions, select original Project images with previews, inspect the complete composed page, then save the exact prepared result. Existing artwork stays in place. A marked top title supplies initial clearance for new layouts; old recipe defaults and bindings remain compatible.
- **Review:** Activity opens the exact writer operation. Compare rendered before/after sides, select changed objects, inspect Story/notes and return to the current page/object. Explicit client-reported receipt IDs are resolved against the current Project journal.
- **Scope:** the page context bar shows identity, Main/live/pinned state and actual live/pinned occurrences, with navigation through the existing draft guards.
- **Connection:** prepared setup instructions and the latest observed client report have separate states. Unavailable retained history is not presented as confirmed absence.
- **Plugin:** authoring instructions connect reference inspection, preview/apply, saved receipt review and rendered checking. MCP and CLI add `huandeng_review` / `review`; protocol discovery reports 21 tools and two guides.

The accepted Windows runtime is built from clean source `2f3e627ec3c27f07111824937118e0f76be265b2`, at `2026-11-09T10:07:59.5096295Z`. Editor and plugin versions are 0.14.0; the core npm package remains 2.3.1. No npm publication or upstream push is part of this release.

The installed runtime passed 11 new workflow checks and 14 existing workspace checks. Source verification passed 110 Vitest files (1,171 tests, one existing skip), core typechecking and eight portable-client tests. An independent whole-branch review approved the source. See [Validation](VALIDATION-V014.md), [Handoff](HANDOFF-V014.md), and the [Chinese interface walkthrough](UI-WALKTHROUGH-V014.md).

Operation review is read-only. Its images come from current Project files and may differ from historic bytes; the interface exposes this limitation and any theme/size fallback. Named checkpoints remain the route for archived-image versions and restoration. Full document provenance extraction, inheritable masters and a cloud publisher status dashboard remain later product work.
