# HUANDENG v0.12 implementation

## Section identity and position

Section identity remains the stored `section.id`. The displayed Section Position is derived from current Main Slides order. A single explicitly marked leading Section may use `frontMatter: true` and display Section 00; ordinary Sections start at 01. A title alone never activates front matter. Validation rejects multiple front-matter Sections or a front-matter range that does not begin at the first Main Slide.

The Project panel, Pages rail, source picker and Project briefing use the same resolved numbering. Authors can inspect or copy the stable Section ID separately. Moving a boundary can change its displayed position without changing its identity. Existing fixed-range and explicit-member Sections retain their compatibility behavior.

## Pages interaction

The rail records the clicked Section heading's viewport position before folding and restores that anchor after the member list changes. Revealing the selected Slide responds to an actual selection change; it no longer runs simply because folding changed visible entries. The current Slide and playback sequence are unaffected.

Thumbnail drag targets distinguish upper and lower halves, and existing insertion gaps accept drops. A local insertion marker shows the destination. Edge scrolling uses animation frames while the pointer is near the rail boundary and stops when the drag ends. The route flushes current edits and then resolves neighboring stable IDs against fresh Main order before applying a move.

Create Section is available from a valid gap's context menu. The dialog names the Section and previews its existing first Slide and resolved range. The operation uses that Slide as the start anchor and extends through the next boundary, without inserting an additional Slide. It rejects a changed gap or incompatible unsaved Project arrangement instead of replacing current authoring with a stale Project snapshot. The shared document writer supplies persistence, revision checks and Undo/Redo.

## Selected text formatting

The inline editor owns its text range, composition state and formatting controls. It captures a range within the editable element and restores it when the scoped context menu or toolbar invokes a format. Foreground color and highlight use inline CSS that passes through the existing rich-text sanitizer. The context menu offers named presets; toolbar color controls accept custom colors. No highlight removes the selected highlight.

Portal events remain within the inline-formatting scope. A menu or color input receiving focus does not finish the text edit, and input-method composition is protected. Existing bold, italic, underline, superscript and subscript use the same range. Object-level property editing remains distinct from text-range formatting. The existing text edit commit and document Undo boundary remain authoritative.

## Canvas zoom

The canvas viewport handles Ctrl-wheel and Meta-wheel with a non-passive listener. It converts wheel units, clamps the scale to the existing 15%–300% range and retains the document point under the pointer after layout. Ordinary wheel and Shift-wheel keep their scrolling behavior. The listener is scoped to the authoring viewport rather than the window or unrelated panels.

## Client integration

The portable plugin resolves an explicit runtime first, then supported local discovery sources. An invalid explicit choice fails; ambiguous choices require selection. Active Project records are hints verified against the loopback service, canonical entry and protocol. Redirects and non-loopback destinations are rejected. A connection stays pinned to its selected Project.

The shared Story skill describes local clients and ChatGPT's existing authorized workstation route. Portable packages contain no account-specific binding. The separately generated private ChatGPT package includes the existing app binding and omits local stdio configuration. Neither package includes a document writer, model runner, public listener or tunnel. All writes continue through the Editor's existing CLI/MCP service.

Native client and account evidence is recorded separately in [Client delivery](../plugins/huandeng/docs/V012-CLIENT-DELIVERY.md). Creating an account release does not establish that a conversation loaded or installed it. A native plugin inventory does not establish a completed model authoring task.

## Verification and private authoring

Focused unit cases cover Section position/front matter, gap boundaries and stale targets, thumbnail grouping and wheel scaling. The synthetic Windows harness exercises Section identity, local fold anchors, gap creation with Undo/Redo, drag placement, Ctrl-wheel, partial text formatting and persistence after reopening. Final results and retained failures belong in Validation.

Private authoring uses the installed runtime after its own acceptance. Read revisions, preview an exact transaction, apply the same payload with its preview hash, then read and render the result. Private Project contents, IDs, figures, paths, screenshots and detailed receipts remain outside the repository and plugin archives. No historical Project baseline is restored during application installation.
