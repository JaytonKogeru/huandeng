# HUANDENG v0.11 — consolidated authoring audit

Date: 2026-11-08. Status: source audit complete; an additional authoring preview found a YAML compatibility defect after the earlier package had passed UI and installation checks. Clean corrected source `0d0d8efe115c4b4dc9789c35f70b13efc899ab9e` passed new source gates, matching packaging, and all 43 UI groups. Incremental reinstall and authorized local authoring also passed. Documentation and reviewed generic evidence are ready for final private-origin delivery; actual remote refs are verified after the Git operations. Current evidence is in [VALIDATION-V011](VALIDATION-V011.md).

## Method and conclusion

Two independent reviewers followed the same authoring journey through the v0.10 implementation: open a Project, choose Main Slides or a Presentation, organize Sections, insert and refine Slides, inspect supporting files, and save or deliver. [Audit A](AUDIT-V011-A.md) and [Audit B](AUDIT-V011-B.md) record their separate findings. This document combines their conclusions with an additional integration review. The implementation contract is in [SPEC-V011](SPEC-V011.md).

The initial audits are source-based reviews of interaction and state flow. They are not new live desktop observations, performance measurements, or proof that the packaged application has passed acceptance. The user's reported experience guided the scenarios; private project contents, figures, screenshots, paths, and identifying validation records are excluded from these documents and distributable fixtures.

Both reviews reach the same conclusion: the underlying Main Slides and Presentation model is useful, but too many actions are distant from the object they affect. Some features already exist behind an unexpected disclosure or at the end of a long panel; others, including file preview and insertion between thumbnails, need an actual interaction. The release should connect these actions to the existing document model and protect the author's work while switching views.

## Consolidated findings and decisions

| User task | Finding agreed by both audits | v0.11 decision |
| --- | --- | --- |
| Remove the selected Presentation | Removal sits below arrangement and optional content, so the collection selector does not lead clearly to management. | Put Delete Presentation beside its name. Keep deletion in the Project draft until Save Project; Discard restores the persisted arrangement. Main Slides and recorded versions remain. |
| Open and close Slide selection | The icon stays Plus while the wording changes to an implementation term. | Use Add slides or Sections with Plus and Close slide selection with Minus; expose the actual expanded state. |
| Understand ordinary pending work | Routine drafts and empty Presentations compete with genuine save/recovery failures in broad warning rows. | Keep ordinary draft guidance near its own Save control, add a compact persistent Drafts review action, and put empty-Presentation guidance in its content area. Preserve prominent conflict and recovery actions. |
| Use an existing Slide as a Section cover | Fixed ranges require two boundaries; Pages only adds a text heading. | Add an explicit first-Slide mode. Resolve membership from its stable first Slide to the next Section start in Main order, or the end. Preserve older ranges and saved membership until an explicit conversion. |
| Fold a Section while navigating | Pages cannot collapse the members independently of selecting the cover. | Keep the cover thumbnail visible and give it a separate disclosure and count. Search reveals relevant members. Folding changes navigation only, never document order or Presentation content. |
| Insert at a visible gap | Gaps are inert, and the global Add action depends on the current selection. | Make every real boundary addressable, including the beginning and end. Add Insert before/after to thumbnail menus. Capture neighboring stable identities and reject an insertion if their adjacency has changed. |
| Read a supporting file | Files selects non-page paths but offers no content preview. | Add one closable, read-only preview on the right for supported images and bounded text. Keep the current Slide and drafts. Show source text without executing Markdown, HTML, or scripts. |
| Reuse authored layout decisions | Two nested disclosures hide the existing figure recipes; title consistency has no clear entry. | Use one visible Quick Layout section. Let the author choose a reference title and a target title explicitly, preserving authored words, figures, and other objects. Keep existing figure recipes and one Undo boundary. |
| Choose a font knowingly | A free-text family field provides neither discovery nor availability information. | Retain custom input and add Document fonts, Open-source fonts, and Generic families. Add Settings samples and an explicit local-font check. A listed family is not evidence that it is installed or embedded. |
| Understand Assets and Files | The two views overlap in storage but serve different tasks. | Keep Assets for placeable material and Files for Project structure and supporting content. Preview makes Files useful without creating a second import pipeline or a general-purpose code editor. |

The audits also agree on what should remain explicit: a cover is an ordinary editable Slide; selecting it and folding its Section are different actions. An authored reference style is a bounded source of geometry and typography, not permission to redesign an entire Project. English remains the default product language, and existing custom text and font settings must survive the new controls.

## Additional integration findings

### Missing Section covers need a visible repair route

The model correctly avoids extending a Section across an unavailable next boundary. However, the initial integration filtered every Section with a diagnostic out of Pages. With a missing cover, this could remove all automatic Section headings from the visible rail without explaining why. The user would see an apparently ungrouped deck and need to discover the Project diagnostics unaided.

The correction adds a compact Section issue state to Pages with Review Sections, leading to the Project editor. Unreliable membership is not displayed as a valid group, but its diagnostic and repair route stay discoverable. Main Slides remains usable while the author restores a cover or chooses a new first Slide. The subsequent packaged authoring suite passed this repair journey; see Validation for the actual coverage.

### Multiple missing covers must be repairable in one draft

The initial Section editor rejected any diagnostic on the Section being edited. When two covers were unavailable, choosing a replacement for either one still produced an unresolved end caused by the other missing cover. Neither replacement could enter the draft, preventing the author from completing the repairs sequentially.

The correction allows this specific unresolved-end condition while staging local Project edits. Missing or invalid chosen covers, reversed ranges, and overlapping definitions still fail. The shared writer continues to validate the complete Project on Save: a partially repaired definition is not accepted as a valid saved result.

An in-memory synthetic check using the actual Section setter and model confirmed that two covers can be repaired in sequence, that a partial save remains rejected, that the complete repair saves successfully, and that invalid/overlapping definitions remain rejected. This establishes the source-level behavior; it is not desktop acceptance.

### Existing YAML block arrays must remain patchable

A later authoring preview exposed a case outside the initial UI fixtures: YAML permits a block sequence at its mapping key's indentation, but a replacement flow value needs a deeper indentation. The codec's source-span replacement could therefore turn a valid multiline geometry array into invalid YAML and reject the proposed edit with `INVALID_DOCUMENT`. The rejection occurred before commit; no rejected transaction was applied.

The correction adds indentation when replacing a block sequence, while retaining source-span editing, adjacent fields/comments, newline style, and the existing validation/writer boundaries. Six generic codec cases cover LF/CRLF variants and one shared-store case covers read-only preview, bounded commit, and Undo. Matching corrected-source packaging and 43 UI groups also passed; incremental installation also passed. The separate authorized installed-authoring check subsequently passed, including native export, preservation checks, and independent visual review; its private data remains outside this audit. Private authoring contents and identifiers are excluded from the committed regressions.

## Design boundaries

The implementation keeps the existing shared writer, Undo, revision checks, and explicit Project save contract. Presentation removal is an arrangement edit. Section folding and panel placement are view state. File preview reads supporting content and does not execute or rewrite it. Font selection chooses a family; it does not install or redistribute font files.

Quick Layout uses a captured reference style and a checked target edit. A source page's recorded revision identifies where the captured style came from; it is not a claim that an independent source-page read is atomically checked by the writer. Reference capture and rich-text integration are implemented; the packaged authoring suite passed its rendered-style and Undo checks, separately recorded in Validation.

Potential future integrations include a citation-aware figure browser, local data/plot import, and a Project-specific style assistant. They are analysis topics for existing authoring interfaces. This release does not add an arbitrary plugin runtime, a marketplace, a model executor, or a network tunnel.

## Acceptance journeys

The initial audits above remain source reviews. Subsequent development-host and packaged UI runs passed, with source identity and exact coverage recorded separately in Validation. The focused journeys are:

1. Delete, discard, and save a Presentation; reopen and verify that Main Slides and recorded versions remain.
2. Open and close Slide selection with pointer and keyboard; inspect its label, icon, and expanded state.
3. Create automatic Sections, insert within and before them, move covers, remove and restore covers, repair multiple missing covers, and reopen. Check current membership and the visible repair route alongside legacy range/list behavior.
4. Fold a Section with a selected member, search for that member, and navigate by keyboard. Confirm full playback and export order remain unchanged.
5. Insert at first, middle, last, and collapsed-group boundaries, independently of the selected Slide. Check stale-boundary rejection, selection of the new Slide, and Undo/redo.
6. Preview images and text, switch files rapidly, and close/reopen the preview while retaining Slide, Notes, Story, and other drafts. Exercise unsupported, oversized, missing, and forbidden paths with synthetic files.
7. Capture an authored title style, apply it to an explicit target, and Undo. Check rich-text emphasis, wording, independent geometry, and reference refresh behavior.
8. Select a common family, an available open-source family, an unavailable suggestion, and a custom stack. Compare Settings status, canvas rendering, and existing export diagnostics; exercise denied or unavailable font access.
9. Confirm ordinary drafts and empty Presentations no longer create stacked warning rows, while genuine write conflicts and recovery remain visible and actionable.

The earlier `cb56cbc` installation remains historical evidence. The subsequent codec correction passed focused/full source gates, matching packaging, and 43 UI groups; incremental installation also completed. Authorized local authoring also completed successfully. Validation keeps source/model, synthetic UI, installation, and private authoring evidence levels separate. The fully accepted runtime is ready for scoped private-origin delivery, with actual remote refs independently checked afterward. All committed acceptance material must use fabricated content; private authoring work remains outside this repository.
