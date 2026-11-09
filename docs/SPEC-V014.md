# HUANDENG v0.14 — connected visual authoring

Status: implementation specification under the user's explicit instruction to proceed through Audit → Spec → Implement. Design choices below are implementation decisions, not claimed individual author approvals. Audit: [AUDIT-V014.md](AUDIT-V014.md).

## Product outcome

A researcher should be able to compose from original evidence, understand the scope of an edit, and inspect an Agent's actual saved changes without translating logs or typing image paths. Editor and plugin use the same Project identity, revision-checked writer, existing Story and real page renderer.

## Approach and trade-offs

1. Cosmetic-only restyling is small but leaves the task-to-result gap open.
2. A full new workspace/chat/document engine would greatly increase migration and regression risk.
3. **Selected: extend the existing workspace with a coherent context bar, Layout mode and exact operation review.** Reuse history, assets, recipes, renderer and writer. This provides a complete vertical workflow while keeping existing projects compatible.

## Whole interface

```text
Home | Project A | Project B                         native window controls
HUANDENG  Project title       Main / Presentation      Saved  Review  Export Present
Project Pages Assets Files | Slides | supporting file | Inspector
                          | insert tools             | Properties Layout Story Checks
Sections / thumbnails     | page + live/pinned scope  | relevant task controls
                          |                          |
                          |       SLIDE CANVAS       | layout choices / assets
                          |                          |
                          | position / zoom           |
                          | Activity → Review changes | 
```

The outer strip switches Projects; inner tabs switch documents. Layout is a first-class Inspector task, not a permanent extra pane. Activity remains a collapsible bottom panel. Review opens a sufficiently large dialog with operation identity, affected pages, before/after switch, change list and navigation back to the live page. Opening review is read-only and never applies or rolls back an operation.

## R1 — visual hierarchy and scope

- Preserve existing keyboard routes, Home, drafts, panel sizes, central file tabs, Notes, fullscreen and independent Project services.
- Align shell font stack and neutral/green focus states with editor chrome; support system dark appearance without forcing the page content dark.
- Distinguish Project tabs, document tabs and Inspector task tabs. Main toolbar actions must stay usable at 1040px and 1600px widths.
- Show current page title/code and Main/Presentation context near the canvas; distinguish a live reference from a pinned version. Derive live/pinned counts from actual Project occurrences; no fabricated numbers or inferred approvals.
- Secondary identifiers must not dominate. Disclose long Section IDs and session/task IDs. Preserve copy affordances.
- New UI supports English and Simplified Chinese using existing locale infrastructure. Do not regenerate shadcn UI components.

## R2 — exact saved-operation review

### Data contract

- `OperationReview` in `pptd/types.ts`: `deckId`, `operationId`, `actor`, `timestamp`, `summary`, `pageIds`, `pageId`, `before: PageVersionSnapshot | null`, `after: PageVersionSnapshot | null`, `changes: OperationReviewChange[]`, `truncated: boolean`, `warnings: string[]`.
- `OperationReviewChange`: `kind: 'added' | 'removed' | 'changed'`, optional `elementId`, `label`, `fields: string[]`. Page-level changes (notes, Story, theme, ordering) must be distinguishable from element changes.
- Add `PptdStore.operationReview(operationId: string, pageId?: string)` and read-only `GET /reviews/:operationId?pageId=...`. Add `PptdBackend.operationReview` and a matching `huandeng_review` MCP tool / CLI `review <operationId> [--page <pageId>]`.
- Read only the bound Project journal. Unknown operations/pages fail clearly; no cross-Project lookup, arbitrary file paths or writes. A requested page must belong to the operation's affected pages. Cap returned changed-object entries at 100 and mark truncation.
- Before/after describe that operation, even if later edits or external observations exist. Additions have `before=null`; removals have `after=null`. Do not substitute the current page or a nearby version for a missing side.
- Resolve historical source/metadata using recorded revisions and matching journal/observation evidence. If an existing side cannot be reconstructed, fail with `HISTORY_UNAVAILABLE`; null means actual absence only. Recover each side's manifest theme by recorded revision where possible. Add `themeSource: { before: 'recorded' | 'current-fallback' | 'absent', after: 'recorded' | 'current-fallback' | 'absent' }` to the result and provide each available side's explicit theme. A fallback requires a visible warning.
- Notes and versioned metadata changes are reviewable. Pure order/project operations may have no page artwork and must return an explicit explanation rather than claim a visual diff.
- Operation history uses current project image bytes unless an archived checkpoint is explicitly read. Show this limitation visibly, including the possibility of missing/changed assets. Never say original pixels were preserved based only on an unchanged source path. Historical theme context must be accurate where recorded or explicitly identified as current fallback.
- No new named checkpoints per keystroke. No side store duplicating full project snapshots.

### Activity and review UI

- Preserve client-report versus writer-receipt distinction. Show recent reports, true report timestamps and connection-to-stream status separately from agent execution status.
- Activity page chips navigate by stable identity. Writer receipts with an operation ID offer Review changes. Client reports may provide explicit operation IDs, at most 20; these are client claims until resolved against this Project's journal. Do not correlate by nearby timestamps.
- Dialog has affected-page picker, Before/After controls, actual `PptdPageRenderer`, bounded human-readable changes, selected-object highlight when geometry exists, Story context and current usage scope.
- Current-asset warning is always visible for operation previews. For deleted or historic-only objects, navigation must not silently select an unrelated object.
- Keep existing Page History restoration available through its established revision-checked path. This release's new comparison surface is read-only.
- A stale response from a previously selected operation/page/Project must never replace the current review. Closing the dialog cancels or ignores pending work.

## R3 — visual layout authoring

- Promote Layout to an Inspector task alongside Properties/Layers/Story/Checks, with a compact responsive treatment.
- Preserve the three recipes and their existing override/reset semantics: figure-with-caption, two-evidence-figures, figure-with-zoom.
- Replace the creation select with labeled visual recipe choices. Use actual project image thumbnails for each required slot. Offer search or a bounded picker using the existing asset API; retain raw path entry only as an advanced fallback.
- Do not load unbounded asset lists. Respect missing/unavailable assets and `hasMore`/truncation; offer retry/error states.
- Generate the preview with the same `createRecipe` logic and renderer used for the inserted objects. Preview is local and does not mutate page/metadata/history. Changing inputs updates it. Keep user scientific figures and labels intact; no invented scientific chart values.
- Preview the full cloned current page with generated elements appended in their final order, using the same instance ID, collision handling, theme and size as commit. Commit the exact generated operation payload with captured revisions, or rebuild after invalidation; never silently regenerate different geometry at click time.
- For new layouts on a page with an explicitly identified top title, initialize the existing recipe margin to leave that title legible when it fits; retain the value in the recipe binding. Do not move existing objects or change legacy recipe defaults. The complete preview remains the final way to inspect other overlaps.
- Commit only after Add to current slide, through existing transaction operations and current expected revisions. Disable for pinned/read-only pages, missing required assets and in-flight save. Detect stale base revisions; do not claim preview is the exact saved result if the underlying page changed.
- Preserve title-reference capture workflow. Show the actual reference page and explain the fields copied. Do not label an arbitrary reference as author-approved.
- On success, the new operation is discoverable from Activity review. Existing recipe bindings continue to edit/reset as before; no schema migration.

## R4 — plugin workflow and observed connection

- Retain the existing tools and transaction wire contract. Add review without breaking old clients.
- Extend Activity reports with optional `operationIds?: string[]` (20 maximum, bounded strings) so the plugin can cite actual apply receipts. Existing reports remain valid.
- Skill and runtime guide: read context and Story → inspect author-selected reference and evidence → describe a bounded change → structural preview → authorized apply → review exact receipt → inspect actual render → report result with page IDs and operation IDs. No additional mandatory approval gate.
- Distinguish structure validation, local rendering, Office/export verification and human approval; never collapse them into a single green check.
- Agent setup UI distinguishes instructions prepared from an observed client report in this Project. Display last report actor/time when available; absence is not a connection failure. No hidden heartbeat or model activity.
- Keep Project text, screenshots, source figures and account paths outside public/package fixtures. Synthetic examples only.
- Package Editor/plugin as 0.14.0 after validation. Preserve the upstream core package's independent npm version; use a changeset and never npm publish.

## R5 — complete workflow specification and validation

### Primary flow
1. Open Project and select a live page.
2. Enter Layout, choose two evidence figures and pick source images.
3. Inspect composed preview and reference-title context.
4. Add the layout through the shared writer.
5. Open its writer receipt in Activity; inspect exact before and after.
6. Select a changed object and return to its current page; inspect live/pinned usage.
7. Use existing Checks, History and Export as appropriate.

### Agent flow
Generate setup instructions → client reports its bound Project → task reports observable stages → apply receipt identifies the saved operation → review opens that operation → actual rendering is checked → final report includes receipt IDs. Switching the visible Project never rebinds the client.

### Verification gates
- Baseline and focused tests for operation reconstruction, metadata-only changes, addition/removal, multiple sequential edits, unknown/cross-project IDs, bounds/truncation, legacy Activity reports and explicit operation associations.
- Recipe preview and creation equivalence; UI test verifies selection, preview-without-write, commit, review and pinned disabled state.
- Native/synthetic acceptance at 1040×800 and 1600×1000, English/Chinese and light/dark; no overlaps or inaccessible primary actions. Capture full workspace, Layout, Review and narrow layout.
- Existing v0.13 Project isolation, drafts and fullscreen behavior remains passing.
- Typecheck, build, focused formatting/lint, plugin package validation, then packaged executable acceptance before installation/release claims.

## Deferred product lines

Full figure provenance extraction (PDF/PPT figure/citation graph), inheritable slide masters, a publisher/cloud-status dashboard, arbitrary PPTX import and multiplayer are separate additions. v0.14 lays out the connecting workflow and integrates existing Assets/Export without promising those implementations.
