# HUANDENG v0.16 — responsive browsing and trustworthy preview

## Goal and audit basis

Improve the measured large-deck bottlenecks in [the v0.15 performance audit](AUDIT-V015-PERFORMANCE.md), and adopt the reference → render → review discipline identified in [the open-source audit](AUDIT-V015-OPEN-SOURCE.md). The user authorized the next upgrade on 10 November 2026. This specification scopes that next release; it does not claim to implement the entire longer-term roadmap.

## Product behavior

1. Section browser cards keep their positions, labels, keyboard targets and grouping. Complex slide renderers mount only near the browser viewport and unmount when well outside it. Scrolling back remounts the current revision. Search, collapsed sections, duplicate occurrences and pinned versions retain their identities. Main order remains the source for move operations.
2. Current-canvas original images take priority over queued thumbnail generation, with bounded fairness so thumbnails still progress. Disconnected queued requests leave the queue promptly. Existing two-worker, queue and disk budgets remain bounded; content SHA-256 verification, path controls, response pinning and fallback remain intact. Diagnostics distinguish queue, source-read and preview time. No cross-session cache or metadata-only revision shortcuts in this release.
3. A contiguous document event reads the already committed snapshot instead of rescanning the project. Initial connection, reconnection, sequence gaps and epoch changes retain authoritative refresh. Coalescing must preserve the strongest refresh requirement and drafts, conflicts, recovery and undo remain unchanged. This reduces redundant I/O, not full snapshot transport size; delta transport and compact Agent context remain future work.
4. The existing Layout → Match title style entry gains an actual target-slide preview before Apply. It displays the concrete captured position, font, size, color and spacing. A changed reference is identified as a captured older version. Target, theme, material or document changes invalidate a prepared preview; Apply uses exactly the prepared operations and expected revisions. Refresh never silently applies. Authored wording, intentional emphasis, and unrelated objects remain unchanged.
5. Existing author-review evidence becomes visible in Checks: current version matched, changed since review, or unverified/no evidence. This is a version-match indicator, not approval or a visual-quality PASS. No new author-approval write path is introduced. Pinned/occurrence context is made explicit where the main-page evidence does not cover it. Font/environment and export fidelity remain separately unverified.
6. User clarification: consolidate the two view-control rows into one Normal / Outline / Section browser / Notes page entry in the Slides workspace. Normal uses the thumbnail rail and canvas; Outline uses the text rail and canvas; Notes uses thumbnail navigation and the notes page. Section browser suppresses the duplicate Pages rail while retaining access to Project, Assets and Files. Returning restores navigation without losing selected page/occurrence. Remove the redundant left Thumbnails/Outline controls. Keep document/draft/IME guards, permanent Slides tab and explicit panel access; do not create another independent view state that can disagree with the selected mode.

## Global Constraints

- Preserve stable page IDs, occurrence IDs, pinned versions, Main Position, existing Story APIs and designIntent metadata.
- Preserve the original private projects and unrelated identities.page fixture; use copies for all write probes. Do not commit private deck contents or identifiers.
- Preserve content-hash revision checks, writer compare-and-swap, guarded drafts/IME, undo and recovery. No mtime-only correctness shortcut.
- Use the existing actual slide renderer and existing layout/review entries. New product text must have Chinese and English variants. Do not translate authored slide content.
- No new runtime dependency, no source copied from license-incompatible projects, no npm publication or upstream push.
- Keep core package version under Changesets; editor/plugin release version is 0.16.0. Add user-facing changesets for core edits.

## Acceptance

- Focused behavior tests cover viewport exit/re-entry, order/search/collapse identity, priority/fairness/cancellation/queue bounds, event refresh escalation, preview invalidation and exact apply, and review-state wording.
- Core typecheck, Biome, applicable unit and portable-client checks pass. Native packaged editor has no renderer exceptions during the new flow and retained v0.15 workflows.
- Repeat the existing benchmark on two private deck copies. A full browser traversal must not retain every slide renderer; mounted count follows the visible band rather than total pages, including a synthetic 300-page deck. Report actual timing samples, not a promised percentage or timing assertion on a busy desktop.
- Compare baseline and candidate under comparable conditions where practical; report measured latency, DOM residency, long tasks and image waits separately. Verify original project hashes after probes.
- Package, validate, install with rollback, update local/account plugin guidance, restore projects, and document the tested milestone. Push only the completed milestone to origin.

## Deferred deliberately

Persistent cross-session preview cache, snapshot deltas, project hibernation, a complete design-constraint extraction engine, font/export-bound approval receipts, and native PPTX animation/master parity need separate contracts and acceptance. v0.16 provides measurable responsiveness and a real reference-to-preview path without representing these future capabilities as delivered.
