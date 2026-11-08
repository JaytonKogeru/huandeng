# Authoring polish — Editor 0.12.1

## Audit

The accepted 0.12 workflow exposed four small authoring gaps. Native text selection inherited a faint theme color. A folded Section retained its cover but gave little sense of the remaining Slides. Create Section was omitted at gaps whose next Slide already started a Section and at the end of Main Slides. There was no persistent Hide slide choice for retaining working material while omitting it from presentation and collection exports.

Page Version History already provides named, portable snapshots, including referenced local assets. Autosave and operation history do not substitute for recording these named versions. This release keeps that established archive and restore path and verifies its actual UI.

## Specification

- Selected text uses a solid blue selection with white text, including keyboard selection and nested formatted text. The selection style never modifies saved artwork.
- A folded multi-Slide Section retains the first-Slide preview and count, with two offset card edges. Folding keeps its heading's viewport position and current selection. Reduced-motion preferences remove the short fan animation.
- Every Main Slides gap exposes Create Section here. Inside a Section, the following existing Slide can remain the first Slide; an optional new cover is available. Before an existing Section or at the end, the action inserts a new cover and a new stable Section boundary together. Other Section covers remain anchored. One Undo reverses both changes.
- Hide slide is reversible organization metadata, not deletion. Hidden Slides remain searchable, editable and included in Main order and Section membership. They are skipped in live playback and collection PDF/PPTX/MP4 delivery by default. Export offers Include hidden slides; an explicitly requested single-page PNG or MP4 remains possible.
- Hiding a Main Slide applies to its Presentation appearances, including pinned artwork. Restoring an artwork version does not change current visibility. Slide and Section IDs remain stable.
- Named versions are explicit authoring milestones. Record before a substantial revision and after accepting it; the UI must show both archived versions after reopening.

## Implementation

Visibility is the optional boolean `SlideIdentity.hidden`. The shared `metadata.patch` writer validates it, checks metadata revisions and retains journal/Undo behavior. A delivery-only snapshot filter leaves the saved manifest untouched. Live playback uses the same visible-page predicate. GUI, CLI and MCP exports accept an explicit `includeHidden` override; CLI spells it `--include-hidden`.

The shared `page.add` operation accepts optional `section: { id, title, frontMatter? }`. This creates the cover and Section in one transaction. Boundary logic lives in the document layer and is reused by the dialog preview. Dynamic first-Slide Sections remain dynamic; contiguous fixed/member ranges are split according to their existing semantics, while unsupported noncontiguous splits fail explicitly.

No dependencies, new network listener, model runner or client-plugin protocol are added. Native client plugins continue to use the installed Editor's shared writer. All acceptance material is fabricated and isolated from the ordinary profile.

## Validation plan

Unit coverage checks delivery filtering, metadata validation and Undo, named artwork restore with retained visibility, atomic cover insertion and range semantics, and video collection/single-page scope. The desktop harness `scripts/verify-authoring-v0121.mjs` checks text selection, folded card stacks and viewport position, cover insertion at both formerly missing gaps, named Page Version History, hide/Undo/playback, native output with and without hidden Slides, and normal reopen/Show slide.

The exact package identity, measured results and installation status are recorded separately in the release and handoff. Source tests and development-host UI are not substitutes for matching packaged acceptance.
