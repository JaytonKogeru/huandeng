# Editor 0.13 — handoff

## Runtime and installation

Release preparation is complete at the source checkpoint. The final package and installation receipt must be added here after exact-package validation; do not treat this source checkpoint as proof of installation.

## Invariants for subsequent work

- Project identity follows the explicit canonical entry and sender renderer, never the visible tab.
- Home/tab switches keep mounted document state. Close requests use existing draft/recovery guards; never force-close production to install.
- Keep one shared Project organization draft and one document writer. Normal Sections use first-Slide boundaries; do not silently rewrite legacy membership.
- File previews are inert/read-only and central. Preserve focus isolation and mounted Notes/Inspector drafts.
- Native fullscreen has a serialized transition controller. Presenter focus must not be stolen by a delayed canvas-selection intent.
- Activity client reports and writer receipts are separate, bounded and local. A reporting failure cannot corrupt or delay document writes.
- Only explicit `main-position` fields are derived; arbitrary numeric text remains authored. History display context must not alter content integrity or reuse a historical revision for a current write.
- Publisher validates Project output before an ordinary-file atomic shared copy. Preserve old valid output on failure/lock. Keep the v3 stale-lock retirement mechanism; deleting retirement directories while another publisher may be running reintroduces an ABA race.
- Keep `.pptd` registration, installed-runtime discovery and client configuration separate from account-plugin availability. Do not broaden permissions or add a public tunnel.
- Use current read/preview/apply and meaningful changed-page versions for private work; never copy research Projects into Editor fixtures, docs, plugin archives or Git history.

## Remaining product work

Prioritize PPTX import/round-trip, a true presenter display, native animation export, reusable master/layout semantics and richer source/reference management as separate designs. The current Activity surface is enough for explicit parallel client tasks; a built-in autonomous model runner is not implied. [Workspace UX](WORKSPACE-UX.md) records the PowerPoint feature audit and design rationale.

The Windows isolated source worktree is `D:/_Proj/Huandeng-v013-20261109`; canonical is `D:/_Proj/Huandeng`. Preserve the unrelated modified canonical fixture. Push only a tested milestone to origin and retain upstream attribution.
