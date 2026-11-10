# v0.17 implementation plan

Authority: [SPEC-V017](SPEC-V017.md). Base: `e16ec204686673f66c7351961df9b1115a21850a`. Execute inline in the existing isolated worktree; the route, Project draft and history transition guards are shared interfaces.

## Global constraints

Preserve original private projects and the unrelated dirty main fixture. Use synthetic/copy-only write probes. Keep existing backend APIs, identity, CAS, Undo, read-only and IME behavior. Run `corepack pnpm` and Biome before commits; add a patch changeset for core edits. Preserve old packages and ignored acceptance artifacts. Editor/plugin version 0.17.0, core stays Changesets-managed. Installation, existing private plugin update and tested origin main/tag delivery are within the user's continuing workflow.

## Task 1: Flat views and local browser actions

Write and observe a failing six-view/no-nested-controls test. Extend the view union and switcher; Browse and Outline share the same mounted browser instance and query/collapse state. Add a contextual page-history action. Update keyboard gating and native view helpers. Expected: focused unit/browser tests pass; Outline is never editable canvas or left-rail mode.

## Task 2: Central section management

Write a browser failing test against the existing ProjectPanel using a central mount target, rather than duplicating draft state. Render the existing section controls into this target with React portal; remove the modal. Existing manage buttons request the workspace. Add visible member previews using the draft-resolved membership, and clear central error/empty scope. Expected: opening no writes; rename/boundary draft preview, discard and CAS save behave identically; native guards retain the draft.

## Task 3: Central page history

Write failing browser coverage for inline surface, delayed preview transitions and mutation/IME guard signals. Move existing history content into an inline workspace; parent follows selected page and blocks all page/collection/view transitions during record/restore. Preserve backend read/restore/checkpoint semantics. Expected: no stale preview can be restored, failures release the guard, explicit restore acts on the correct page, pins remain read-only.

## Task 4: Review, native acceptance and delivery

Update the synthetic native verifier for all six surfaces and new section/history flows; run focused source checks and packaged acceptance. Obtain one independent whole-branch review, triage and fix blocking findings with regression evidence. Refresh release/interface/handoff docs and exact local/account plugin files. Install only the accepted source, verify original hashes and restoration, then publish main/tag once.

## Review focus

Portal lifetime with hidden sidebar and Project draft; stale expected revisions during external updates; section entry while other drafts exist; asynchronous history list/preview state and stale restore buttons; mutation activity across page/occurrence/collection/native navigation; pinned Main-history scope; no accidental route changes during restore; empty/read-only projects; viewport preview residency and narrow layouts.
