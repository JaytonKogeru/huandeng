# HUANDENG v0.12 authoring guide

## Organize Sections in Pages

Every Section has two different identifiers:

| Field | Meaning |
| --- | --- |
| Section Position, such as Section 03 | Its current place in Main Slides; follows the current order. |
| Section ID | Its persistent identity; remains the same when its position or title changes. |

In Project, mark a leading Section as **Front matter (Section 00)** when it contains the title, contents or introductory notices. Its first Slide must be the first Main Slide. Ordinary Sections begin at 01. This is an explicit choice and does not depend on a particular title.

To create a Section around existing Slides, right-click the gap immediately before its first Slide and choose **Create Section here**. Enter the title, check the displayed range and create it. The range ends before the next Section. This creates the organization without adding a cover Slide. If Project has an unsaved arrangement, save or resolve that draft first.

Fold a Section with its arrow in Pages. Its heading stays at the place you were viewing; the selected Slide does not change. Folding does not remove Slides from presentation or export. Hover the heading to inspect its full identity, or use **Copy Section ID** in Project.

To move a Slide, drag toward the upper or lower half of a thumbnail, or onto a gap. Follow the insertion marker. Hold the drag near the top or bottom of Pages to scroll. Position follows the move; Slide ID remains unchanged.

## Format part of a text box

Enter text editing, select the words, then right-click. **Text color** changes only the selected range, and **Highlight** changes its background. Existing bold, italic, underline, superscript and subscript remain available. The floating text toolbar provides custom color pickers; **No highlight** removes a selected highlight.

The Inspector still changes an object's properties. Use inline selection controls when only a phrase should change. Finish editing with Escape or Ctrl+Enter; the document save status confirms persistence. Undo uses the existing text-edit boundary.

## Zoom the canvas

Hold Ctrl while scrolling over the canvas to zoom around the pointer. Meta-wheel also works where supported. Zoom remains between 15% and 300%. The ordinary wheel scrolls, and Shift-wheel retains horizontal scrolling. These controls do not change the Slide's exported dimensions.

## Use the client plugin

Open the intended Project in HUANDENG Editor. A portable Codex, Claude Code or DeepSeek Harness adapter finds a compatible local runtime and verifies its live service. If several installations or Projects match, choose explicitly. Copying a plugin to another computer does not copy a private Project or the original computer's account binding.

ChatGPT uses the existing authorized workstation app through its private plugin package. Saving a plugin release, installing it into ChatGPT and loading its skill in a conversation are distinct steps. The native **Agent setup** screen continues to generate configuration; opening it does not establish a connection.

Start an authoring request by identifying the Project or current selection and describing the audience, evidence and edits. The shared Story skill reads the runtime guides, checks revisions, previews changes and applies the authorized exact payload through the shared writer. Review the resulting Slides in the Editor. See [Plugin installation and routing](../plugins/huandeng/README.md) for client commands and boundaries.
