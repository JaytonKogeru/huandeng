# v0.16.1 — workspace views act where they appear

## Audit

The user's 10 November feedback identifies two concrete regressions in v0.16: the central Outline control changes the left navigation instead of the central workspace, and Browse automatically collapses that navigation while other modes restore it. Moving two existing controls into one row did not unify their scope. Outline and notes also represent different data: the former reads page titles, Story purpose and content; the latter edits the speaker's script. Combining those fields would obscure what is being changed.

## Interaction contract

- One primary row: Normal / Browse / Notes page. Browse is labeled 浏览 in Chinese; no Section browser label remains in active controls.
- Browse owns two local representations, Thumbnails / Outline. Both keep the same section groups, query, collapse state, selection, occurrence identity and Main move constraints. Outline occupies the central workspace with a small actual page preview beside the title and page summary, rather than altering navigation. It reads existing Story purpose or content excerpts; it does not create or overwrite notes.
- The selected Browse representation survives a trip to Normal or Notes within the workspace. Search and section state remain shared when switching Browse representations. Thumbnail size is only shown where it applies.
- View switching never changes the chosen navigation tab, width or collapsed preference. The left Pages navigation consistently remains thumbnails when the user opens it. Explicit sidebar buttons and resizing retain their current functions. Keep draft/IME guards and permanent Slides/file-close behavior.
- Main selection, repeated/pinned presentation occurrences, exact ordering, read-only scope, saved review and undo remain unchanged. Double-click/Enter on either Browse representation opens the selected page in Normal. Notes continues to show that selected page and its existing script.
- All new controls and empty states have Chinese/English text. User-authored content remains untouched. Preserve bounded viewport preview rendering; do not add a runtime dependency.

## Verification and delivery

Cover central Outline content, both language controls, shared filtering/selection, repeat/pin scope and representation retention. Run focused unit/type/style checks, real Chromium residency checks and the packaged workspace workflows at wide/narrow sizes. Verify navigation width/tab/collapse invariance through all views and draft/IME guard behavior. Package and install with rollback after acceptance, preserve original projects, and update the shared plugin instructions to match the actual interface. Report native checks separately from any unmeasured timing improvement.
