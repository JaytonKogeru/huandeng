# HUANDENG v0.11 — consolidated authoring audit

Date: 2026-11-08. Status: source audit complete; integration and real Windows UI acceptance remain in progress.

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

The correction adds a compact Section issue state to Pages with Review Sections, leading to the Project editor. Unreliable membership is not displayed as a valid group, but its diagnostic and repair route stay discoverable. Main Slides remains usable while the author restores a cover or chooses a new first Slide. This UI correction still requires actual Windows acceptance.

### Multiple missing covers must be repairable in one draft

The initial Section editor rejected any diagnostic on the Section being edited. When two covers were unavailable, choosing a replacement for either one still produced an unresolved end caused by the other missing cover. Neither replacement could enter the draft, preventing the author from completing the repairs sequentially.

The correction allows this specific unresolved-end condition while staging local Project edits. Missing or invalid chosen covers, reversed ranges, and overlapping definitions still fail. The shared writer continues to validate the complete Project on Save: a partially repaired definition is not accepted as a valid saved result.

An in-memory synthetic check using the actual Section setter and model confirmed that two covers can be repaired in sequence, that a partial save remains rejected, that the complete repair saves successfully, and that invalid/overlapping definitions remain rejected. This establishes the source-level behavior; it is not desktop acceptance.

## Design boundaries

The implementation keeps the existing shared writer, Undo, revision checks, and explicit Project save contract. Presentation removal is an arrangement edit. Section folding and panel placement are view state. File preview reads supporting content and does not execute or rewrite it. Font selection chooses a family; it does not install or redistribute font files.

Quick Layout uses a captured reference style and a checked target edit. A source page's recorded revision identifies where the captured style came from; it is not a claim that an independent source-page read is atomically checked by the writer. Reference capture and rich-text integration are being finalized and must be exercised before release.

Potential future integrations include a citation-aware figure browser, local data/plot import, and a Project-specific style assistant. They are analysis topics for existing authoring interfaces. This release does not add an arbitrary plugin runtime, a marketplace, a model executor, or a network tunnel.

## Remaining acceptance work

Real Windows UI validation is pending at this audit checkpoint. The focused journeys are:

1. Delete, discard, and save a Presentation; reopen and verify that Main Slides and recorded versions remain.
2. Open and close Slide selection with pointer and keyboard; inspect its label, icon, and expanded state.
3. Create automatic Sections, insert within and before them, move covers, remove and restore covers, repair multiple missing covers, and reopen. Check current membership and the visible repair route alongside legacy range/list behavior.
4. Fold a Section with a selected member, search for that member, and navigate by keyboard. Confirm full playback and export order remain unchanged.
5. Insert at first, middle, last, and collapsed-group boundaries, independently of the selected Slide. Check stale-boundary rejection, selection of the new Slide, and Undo/redo.
6. Preview images and text, switch files rapidly, and close/reopen the preview while retaining Slide, Notes, Story, and other drafts. Exercise unsupported, oversized, missing, and forbidden paths with synthetic files.
7. Capture an authored title style, apply it to an explicit target, and Undo. Check rich-text emphasis, wording, independent geometry, and reference refresh behavior.
8. Select a common family, an available open-source family, an unavailable suggestion, and a custom stack. Compare Settings status, canvas rendering, and existing export diagnostics; exercise denied or unavailable font access.
9. Confirm ordinary drafts and empty Presentations no longer create stacked warning rows, while genuine write conflicts and recovery remain visible and actionable.

Production packaging, installed-build verification, and release publication are separate gates. Source review, a model check, and a prepared acceptance script do not complete those gates. All committed acceptance material must use fabricated content; private authoring work remains outside this repository.
