# Connected visual authoring and exact review

## One flow across plugin and editor

Read Project identity, Story, selected page and live/pinned occurrences. Inspect the author's selected reference and original evidence. In the editor, the Layout task offers figure/caption, two-figure and figure/zoom compositions using project images. It previews the complete current page with proposed additions before one revision-checked save. Existing content and image pixels remain the source of the composition; the preview does not write the document.

An Agent uses the same document contract: read → bounded transaction → structural preview → authorized apply → exact receipt review → actual rendered inspection. The plugin does not add a second editor or chat panel. It must not interpret a valid object tree as proof of attractive or correct output.

## Read the saved operation

Use the actual `operationId` from `huandeng_apply` with `huandeng_review`; request one affected `pageId` when needed. The CLI equivalent is `review OPERATION_ID --page PAGE_ID`. Tool availability comes from the running runtime; older Editors may not advertise review.

The response identifies affected pages, before/after page snapshots, bounded changed objects or page-level fields, warnings, truncation and per-side theme provenance. Inspect all relevant pages. `null` means that a page actually did not exist on that side. An existing side without sufficient evidence fails with `HISTORY_UNAVAILABLE`; never replace it with the current page and call that historical truth. A pure project operation can have no page artwork and explains this explicitly.

Operation previews generally resolve local image paths against current project files. A matching path does not prove unchanged historical bytes. A missing historical theme or size is identified as current fallback. Preserve these qualifications in any comparison; use a named version with archived assets when archived appearance is required. Review itself is structured data, while the Editor uses its real page renderer to display it. Neither guarantees exported Office appearance.

## Make results discoverable

Report exact page IDs and operation IDs. Where supported, `huandeng_activity_report` accepts at most 20 `operationIds`; these are client claims until the Project journal resolves them. In Activity, the user can open a writer receipt, choose an affected page, switch Before/After, select a changed object, and navigate to its current live page. Deleted or historic-only objects may no longer be available for navigation. A fixed presentation version remains unaffected by later Main edits.

Keep the review read-only. Use existing revision-checked History/restore tools only when restoration is part of the authorized task. Do not introduce a mandatory approval checkpoint between every edit and review.

## Report each verification level accurately

| Evidence | What it establishes |
| --- | --- |
| Configuration generated | Connection instructions are prepared |
| Protocol/deck identity checked | The bridge reaches the intended Project |
| Client Activity report | That client explicitly reported a stage at a time |
| Apply receipt | The shared writer saved a particular operation |
| Structural preview/check | The proposed document operations validate |
| Actual render inspected | The visible page was checked for layout and fidelity |
| Export/Office inspected | The particular exported artifact was checked |
| Explicit human approval | The author accepted the specified result |

Only claim the rows actually observed. Do not turn a recent client report into a heartbeat, a setup fragment into an installed client, or a local export into successful cloud synchronization.
