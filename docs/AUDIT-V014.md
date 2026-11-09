# HUANDENG v0.14 — product, visual and plugin audit

Date: 9 November 2026. Baseline: `5040bb1`, Editor/plugin 0.13.0. This audit starts from the author's request to connect visual hierarchy, Agent change review and visual layouts. It reviews source, v0.13 synthetic acceptance captures and the existing tests; it does not infer live usability from unit tests. The production projects are not audit fixtures.

## Current product model

The existing model is worth preserving: independent Projects, Main Slides, ordered Presentation occurrences, stable page identity, first-slide Sections, explicit named page versions, one revision-checked writer, Story and Notes as different concepts. The outer Project tabs and inner document tabs represent different scopes. Files is a navigator and the central region previews documents. Inspector follows the current slide/object. An agent remains bound to its explicit entry, independently of visible Project selection.

## Findings and decisions

| ID | Evidence | User consequence | v0.14 decision |
|---|---|---|---|
| A01 | `packages/desktop/workspace-shell.css` uses a separate Arial/light palette; `app/styles.css` defines Geist, brand colors and dark tokens | The two navigation layers look related but are not a coherent design system | Align typography, selection, focus and dark appearance; retain outer/inner tab distinction |
| A02 | v0.13 workspace captures show repeated small labels and similar tab backgrounds | Project, document, page and property scopes require reading rather than recognition | Introduce clear page context and task-oriented Inspector navigation; primary labels 12–14px, technical details progressively disclosed |
| A03 | `activity-panel.tsx` renders summaries and session/task IDs, without affected-page or comparison actions | A save receipt does not help inspect what changed | Make affected pages navigable and saved operations reviewable through exact operation identity |
| A04 | `activity.ts` already retains pageIds, operationId and distinct client/writer sources | Valuable identities are available but mostly invisible | Reuse these identities; never correlate tasks with writes merely by time or actor name |
| A05 | `page-history.ts`, `store.ts` and the persistence journal contain operation before/after sources; ordinary historical previews use current assets | A naive adjacent-version comparison can confuse addition/deletion, external changes, theme and asset changes | Expose exact operation-side review; preserve explicit asset/theme limitations, additions/removals and metadata-only changes |
| A06 | `mcp.ts` describes preview as structural and non-rendering | Structural success can be mistaken for visual verification | Distinguish preflight, saved operation, actual rendering and author review in plugin language and UI |
| A07 | `recipe-panel.tsx` exposes three scientific recipes through a select and typed image paths | Visual composition is expressed as a configuration form | Recipe thumbnails, project image selection and a real local composition preview before adding objects |
| A08 | `title-layout-panel.tsx` captures an existing title and uses revision checks | Useful reuse already exists; a new master system would duplicate it | Make the existing reference workflow discoverable from Layout and retain exact semantics |
| A09 | `design-intent-panel.tsx` records purpose, keep and requestedChange | Story is meaningful but separated from visual work | Keep Story visible as a nearby task; layout and review show the current purpose and preserve constraints without claiming automatic enforcement |
| A10 | `project-overview.tsx` and `huandeng.tsx` already distinguish live references and pinned versions | Editing scope exists but is distributed across panels | Add compact current-page scope with real live/pinned occurrence counts; disclose destinations |
| A11 | `asset-library.tsx` supports thumbnails, placement and usage navigation; lacks document/figure/citation provenance graph | Source Library must build on working assets, not replace them | Integrate existing source selection now; specify provenance expansion separately rather than claim implemented PDF extraction |
| A12 | `agent-connection-dialog.tsx` only generates configuration; Activity has client reports | A connection label risks overstating readiness | Show setup versus observed client reports separately, with project identity and timestamps; do not invent a heartbeat |
| A13 | publisher is separate from editor save, export and OneDrive | A saved indicator cannot represent cloud publication | Audit retains distinct states; no unverified cloud indicator. Full publisher dashboard is subsequent scope unless a safe authoritative adapter is available |
| A14 | existing Checks can locate objects; History can preview and restore | Valuable visual feedback is already present | Connect to existing destinations and reuse rendering and restoration flows |

## Visual direction

Keep warm neutral workspace chrome, a quiet green interaction accent, white scientific pages and original figure colors. Distinguish navigation scope with position, geometry and typography, not a unique color per section. Make task status visible with words plus icons. Keep UUIDs, raw paths and client IDs in details where possible. Avoid a second chat pane, a decorative dashboard, extra confirmation gates, or a generic card template for scientific slides.

## End-to-end acceptance journey

Open a synthetic Project → identify Main versus Presentation scope → enter Layout → choose two project images → inspect a true composition preview → add through the shared writer → inspect Activity → open the exact operation's before/after → locate a changed object → inspect live and pinned usages → verify Story/Notes and saved-page behavior → export through the existing export workflow.

Repeat with another Project, a pinned occurrence, long Chinese names, a small desktop window, missing assets, a stale revision, metadata-only edits and a removed page. Distinguish UI screenshots from functional assertions and document both.

## Baseline verification

Focused baseline: 29 tests passed across Activity, page history, recipes and Project tabs. Dependencies were installed from the lockfile; the host default package manager differs from the repository's pinned 10.17.0, so subsequent package commands use `corepack pnpm` and installation-generated policy edits are not product changes.

## Scope boundary

The next release implements the visual hierarchy, exact saved-operation review, visual layouts and matching plugin workflow. It does not claim arbitrary PPTX import, real-time multiplayer, durable remote-agent scheduling, automatic scientific validation, PDF figure extraction or OneDrive cloud verification. These remain named follow-up product lines, not silently omitted requirements.
