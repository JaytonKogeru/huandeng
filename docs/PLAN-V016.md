# v0.16 implementation plan

Goal: responsive large-deck interaction and concrete reference preview with honest review status.
Architecture: retain React/Electron, PPTD single writer and actual renderer; change residency, scheduling and refresh policy at their existing seams.
Tech stack: TypeScript, React 19, Node, Electron, Vitest and existing Playwright harness; corepack pnpm 10.17.0.
Spec: [SPEC-V016.md](SPEC-V016.md).
Review focus: asynchronous races, revision correctness, occurrence identity, actual rendered preview and release evidence.

## Global Constraints

- Preserve stable page IDs, occurrence IDs, pinned versions, Main Position, existing Story APIs and designIntent metadata.
- Preserve the original private projects and unrelated identities.page fixture; use copies for all write probes. Do not commit private deck contents or identifiers.
- Preserve content-hash revision checks, writer compare-and-swap, guarded drafts/IME, undo and recovery. No mtime-only correctness shortcut.
- Use the existing actual slide renderer and existing layout/review entries. New product text must have Chinese and English variants. Do not translate authored slide content.
- No new runtime dependency, no source copied from license-incompatible projects, no npm publication or upstream push.
- Keep core package version under Changesets; editor/plugin release version is 0.16.0. Add user-facing changesets for core edits.

## Task 1 — bound browser residency

Primary files: workspace-views.tsx, section-browser.tsx under packages/core/src/app/components/pptd; packages/core/src/app/lib/pptd-workspace-views.ts and associated tests.
Keep lightweight cards mounted and all their semantics. Visibility must follow the actual scrolling viewport both entering and leaving a modest overscan band; eager notes preview remains mounted. Clean observers on changes/unmount and support a safe no-IntersectionObserver fallback. Avoid per-card whole-page scans for move buttons; memoize stable grouping/index work without stale labels or filtering. Preserve occurrence keys and pinned snapshots. Add focused meaningful tests and a changeset. Run relevant tests, core typecheck and full Biome before explicit-file commit. Report paths and exact commands/results.

## Task 2 — prioritize visible image work

Primary files: packages/core/src/pptd/asset-preview.ts and asset-preview.test.ts; renderer/back-end URLs only if needed.
Give original asset requests priority over queued previews, with finite fairness (no thumbnail starvation), at most two active workers and existing bounded queue. Cancel queued disconnected responses promptly, remove listeners on every completion/rejection/disposal, and avoid reading their sources. Preserve all revision/path/security/cache/pin/fallback behavior. Full queues must still allow useful original work via a bounded policy with explicit response semantics; do not silently lose a pending promise or exceed budgets. Add stage timing diagnostics without paths or contents. Test priority, starvation bound, disconnect, dispose and overload alongside existing cache tests. No cross-session cache or hash bypass. Add changeset, run focused tests/typecheck/Biome and commit explicit files.

## Task 3 — avoid event-triggered disk rescans

Primary files: packages/core/src/app/lib/pptd-document.ts and pptd-document.test.ts; transport only if needed.
Use existing optional getCommittedSnapshot for a contiguous same-epoch document event; fallback to getSnapshot if transport lacks it. Initial connection/reconnection/manual refresh/recovery, sequence gaps and epoch changes use getSnapshot. Coalescing must retain authoritative refresh requests even while a committed read is in flight or a save is active. Outdated events are ignored; a result must not roll snapshots backwards. Preserve drafts/conflicts/save retries/recovery/undo and no polling loop. Test known event vs gaps, escalation during in-flight work/save, old transport fallback and disconnect. Add changeset, focused tests/typecheck/Biome and commit.

## Task 4 — connect reference style to preview and review evidence

Primary files: pptd-title-layout.ts/tests, title-layout-panel.tsx, existing Checks component, huandeng locale dictionaries; add a focused preview helper/test where useful.
Extend existing title style capture, preserving frozen reference semantics. Display captured values and stale-reference indication. Prepare a full target-page preview using the exact operations destined for onApply. Apply enabled only for that prepared current preview; changes in selected target, current page/render/material/theme/document identity or captured reference invalidate it. Existing transaction expected revisions remain enforced. No write during preview. Show current/unverified/stale authorReview evidence in Checks with clear version-match-only wording, no approval badge, and explicit occurrence/pinned limits. Reuse existing UI entries and renderer, localize new strings, retain authored content. Tests cover resolved style, exact preview/apply operations, invalidation and evidence-state presentation. Add changeset, relevant tests/typecheck/Biome and commit.

## Task 5 — integrated acceptance and delivery

Controller owns integration: release version/plugin guidance, whole-branch review, required tests, native UI acceptance, comparable baseline/candidate measurements and original hash checks. Update release/handoff/validation and sanitized evidence. Build/install portable editor with rollback, restore user projects, update plugin destinations, verify installed runtime and milestone push only to origin. Never claim a speedup, compatibility or delivered feature without evidence.
