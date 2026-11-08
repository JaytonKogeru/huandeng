# HUANDENG v0.11 UX audit A

## Method and conclusion

This independent review follows the authoring journey through the v0.10 source: choose a collection, organize it, navigate pages, inspect supporting files, and make consistent edits. It is a source-based interaction audit, not a claim of new desktop clicks. No private project content or screenshots were used in this report.

The main problem is discoverability and continuity. Existing features often require another panel, another disclosure, or a different noun before the next action becomes apparent. The next release should make the existing document model directly usable from the page list, without introducing a second editing model.

## Findings and decisions

| Journey | Observed v0.10 behavior | Recommended change |
| --- | --- | --- |
| Remove a Presentation | The action is below all items and notes in `project-panel.tsx`; the collection selector has no management cue. | Place a labeled Delete Presentation action beside the Presentation name or in an adjacent, labeled actions menu. Explain that Main Slides remain. Preserve the existing explicit Save Project transaction and provide a clear cancel/revert route. |
| Show or hide sources | The button always uses Plus and alternates between “Add slides or Sections” and the implementation term “Hide source picker”. | Keep the object vocabulary: “Add slides or Sections” with Plus when closed, “Close slide selection” with a closing/disclosure icon when open. Match `aria-expanded` and the actual state. |
| Continue normal editing | Unsaved auxiliary drafts and an empty Presentation produce full-width amber rows below the header; empty content is presented together with save failures. | Put routine draft state beside the relevant Save control, and empty-Presentation guidance in its content area. Keep a compact, reachable workspace status for hidden drafts. Reserve persistent global alerts for failures requiring attention, including recovery and conflicts. Present/export guards must remain effective and offer the action that resolves the block. |
| Navigate by Section cover | Section ranges bind stable boundary page IDs; Position is derived. The page rail renders a static text heading before the first member. | Support a Section anchored to its first Slide and ending immediately before the next Section start, with the last continuing to the end. Keep explicit ranges and legacy membership compatible. Show the cover thumbnail as the visible anchor, with an adjacent disclosure control and member count. |
| Collapse a Section | Only the separate Project member list has a disclosure; the Pages rail cannot collapse a group. | Collapse members while retaining the cover. Clicking the cover selects it; its disclosure expands/collapses. Show when the current Slide is inside a collapsed group. Search should expose matches, keyboard navigation should follow visible entries, and collapsing must not change playback/export order. |
| Insert between Slides | Page context menus omit insertion and gaps have no interaction target. The only add action uses the currently selected Slide. | Make each actual insertion boundary addressable, including before the first and after the last Slide. Offer “Insert blank slide here” by context menu and a modest hover/focus affordance. Resolve the boundary to a stable predecessor ID, not a stale ordinal or unrelated current selection. |
| Open a supporting file | Files changes its selected path; only a `.page` activates content. Other files offer reveal/copy but no preview. | Keep Files and Assets separate. Clicking a supported non-page file opens a closeable, read-only preview on the right while retaining the Slide and drafts. Show images with contained sizing; show Markdown and text/code/JSON with their filename and clear rendering mode. Unsupported or oversized files need a useful explanation and reveal action. |
| Find layout assistance | “Layout tools” wraps another closed “Quick Layout” disclosure. Three existing recipes require image paths and do not provide a title or Section-cover convention. | Remove the double disclosure. Show useful layout choices immediately, including ordinary title and Section-cover layouts. Allow a project-local title/cover style derived from an existing authored reference. Apply only explicit roles/selected objects, retain content and manual edits, and keep one Undo boundary. |
| Choose a font | Text font is an unrestricted string field, not a catalog. Current insertion uses Arial; rendering has a MiSans/Arial fallback. Settings has no font area. | Provide an editable grouped picker: common document fonts, recommended open fonts, and installed fonts. Show local availability without pretending a listed family is installed or embedded. Add Fonts in Settings for inventory and explanation. Preserve custom names and separate Latin/East Asian font settings. |

## Section model recommendation

A cover-based Section should store its stable first-Slide identity; its displayed Position and end are computed from current Main order. Section array order must not override document order. Slides before the first cover remain outside Sections. Inserting a new cover divides the preceding automatic Section; inserting ordinary Slides does not require updating a saved end boundary. Reordering or removing a cover requires visible validation, not silently assigning its former members to an arbitrary surviving Slide.

Use a distinct, explicit mode for this behavior so existing fixed ranges and custom memberships do not change upon opening an older Project. Range overlaps, duplicate starts, missing covers and mixed-mode interactions need deterministic diagnostics. The cover remains a normal editable Slide; collapsing the navigation view never removes it from content.

## Focused acceptance cases

1. Discover deletion from a selected Presentation without scrolling through its entire contents; delete, cancel/revert, save and reopen while Main Slides and named versions remain unchanged.
2. Open and close Slide selection with consistent labels, icons, keyboard focus and expanded state.
3. Create an empty Presentation and a Project draft without adding global layout-shifting warning rows; attempting Present/export still leads to the correct resolution. A genuine save conflict remains visible and preserves the draft.
4. Create two cover-based Sections, insert inside and before them, append at the end, reorder a cover, remove/restore one, and reopen. Verify stable identity, current membership, diagnostics and explicit-range compatibility.
5. Collapse with a selected child, search for a hidden child, traverse with the keyboard, and reopen. Verify the full playback/export sequence is unaffected.
6. Insert from a gap unrelated to the current selection, including beginning/end and a collapsed Section boundary. Verify exact position, one Undo and no accidental operation on a Presentation reference sequence.
7. Preview image, Markdown, JSON and command text; switch rapidly, close and reopen while retaining Slide edits. Verify read-only handling, bounded reads, path containment, no script/HTML execution, and useful unsupported-file behavior.
8. Apply title/cover layout assistance to a synthetic authored example, then Undo. Verify existing text, scientific figures, identities and unrelated geometry survive.
9. Select an available common font, a custom family and an unavailable suggestion; verify the stored choice, availability explanation and exported rendering without silently rewriting existing font settings.

Editor evidence should use synthetic projects. Private project organization and visual editing remain local authoring work and must not enter repository fixtures, screenshots, logs or release artifacts.
