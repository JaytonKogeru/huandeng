# v0.10 integration review

Static review of the local v0.10 integration snapshot on 2026-11-08. This review did not run the Windows app or modify implementation files. Findings below describe the reviewed snapshot; final validation should record their disposition separately.

## 1. Pending internal image placement is outside the leave guard

**Priority: P2 — complete before release.**

In `packages/core/src/app/routes/huandeng.tsx`, the new internal Assets `onDrop` handler awaits the asset query and the original image's `onload` before calling `insertLibraryAsset`. It does not mark this interval as `importingImages` or as another pending operation. In contrast, device-image import sets `importingImages` before its asynchronous work and clears it in `finally`.

`usePptdDocument` guards close and project switching using `importingAssets`, auxiliary drafts, and the document client's pending work. During the internal image lookup/load interval, none of those represent the placement. A slow image drop followed immediately by a normal close or project switch can therefore leave successfully before the new image reaches `client.apply`.

Track the placement before the first await, retain the original target slide, and clear its pending state in `finally`. This should use the existing leave protection and editing-busy behavior rather than a separate uncoordinated write path. Avoid allowing overlapping placements to clear a shared boolean prematurely.

**Focused validation:** delay the Assets response or the original image response, perform a real internal drag, and request a normal close or project switch while the response is pending. The leave must be blocked or must await the placement. Release the response, verify one image on the original target slide, and verify normal close/reopen preserves it.

## 2. Immediate leave can lose the most recent workspace layout

**Priority: P2 — complete before release.**

`useWorkspaceLayout` in `packages/core/src/app/lib/pptd-preferences.ts` persists after a 300 ms timer and cancels that timer on effect cleanup. The existing before-leave callback in `use-pptd-document.ts` flushes document work only. Notes passes an empty `onResizeEnd`, so releasing a resize does not synchronously hand its final value to persistence.

A clean normal close or project navigation within the debounce interval can therefore retain the previous dock, size, visibility, or reset state. Ordinary restart checks with a delay after the last interaction do not exercise this case.

The host currently queues `huandeng:set-workspace-layout` through `operate()`. Close and project-open actions also execute inside `operate()` and wait for the renderer's before-leave response. Consequently, simply awaiting that setter from the existing before-leave callback would deadlock behind the action already waiting for the callback. Use a leave response that carries the latest layout for the host to persist, or an independently serialized preference-flush path.

**Focused validation:** change a panel size or dock and initiate normal close without a 300 ms pause; reopen and verify the last displayed state. Also cover immediate project switching and reset-to-defaults.

## 3. Inspector setting and right-docked Notes disagree about visibility

**Priority: P3 — small workflow correction.**

The Inspector container is hidden while Notes is open on the right. The Settings checkbox nevertheless receives only `!inspectorCollapsed`, and its change handler changes only that flag. Thus Inspector can appear checked while invisible, and switching it off then on cannot reveal it until Notes is separately closed.

Derive the checkbox from actual visibility and make enabling Inspector reveal it, using the same behavior as the Notes header's Show Properties action.

## Reviewed paths without a new blocker

- Text formatting and layer actions use the existing shared document client. Context-menu and Inspector commands reach the same dispatcher; text theme overrides match the renderer's page-level override behavior.
- Internal image placement validates the requested asset against the current project's image list and captures its target slide before applying the operation. Selection is changed only if the user remains on that slide.
- Section ranges use stable start/end slide identities and resolve current Main Slides positions at read time. Missing/reversed boundaries and overlap diagnostics prevent the affected Presentation from passing readiness checks. The store calls the project operation with the current snapshot.
- Saving an unchanged collection no longer resets its selection through `onSelectPresentation`; the route also short-circuits a repeated collection selection. Stable occurrence IDs allow repeated slide references to retain their intended selection through an arrangement save.
- Story, chart, and Project editor state remains mounted or explicitly retained across tab and panel visibility changes. Notes uses the document client's existing draft and autosave path.

These observations are source-level checks. The independent UI harnesses and candidate-build validation remain necessary for interaction behavior, persistence, focus, and rendering.

## Workspace persistence implementation follow-up

The immediate-leave layout issue has an implementation in the local candidate. The renderer includes its latest layout in the existing successful before-leave response, after document guards and saves have completed. The host persists that snapshot within the close/open operation already holding the native operation queue. It does not invoke or await another queued setter.

Each renderer's layout updates carry its instance ID and a monotonically increasing revision. The production workspace writer ignores an older debounce that executes after a newer leave snapshot, and ignores updates from a replaced renderer. Failed preference writes do not advance the revision, so the same latest snapshot remains retryable. The stored preference format remains the normalized layout object; coordination metadata is not added to user preferences.

Three focused unit regressions were added to `packages/desktop/workspace.test.ts`: durable latest-snapshot ordering, replaced-renderer rejection, and same-snapshot retry after a failed write. Local Node checks passed against the production writer and real atomic preference-file functions, and desktop CJS syntax checks passed. The full Vitest/TypeScript gates and the actual Windows UI regression remain to be run by the release coordinator. The object/workspace harness now includes a separate dock/resize followed by immediate normal close and reopen, with no saved-state or preference polling before the close.
