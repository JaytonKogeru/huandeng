# Authoring with HUANDENG v0.11

This guide covers the new authoring controls. The [complete workflow](WORKFLOW-V010.md) also explains opening a Project, image placement, Notes, presenting, and exports.

## Organize Main Slides with Sections

1. In **Pages**, select an existing Section cover.
2. Open **Project → Project and Story**, choose **New Section**, and enter its name.
3. Keep **First Slide to next Section** as the membership mode. Choose the cover, use **Set first Slide** when changing the choice, then **Save project**.
4. Repeat for the next cover. The preceding Section ends immediately before it. Slides before the first Section stay outside Sections; the final Section continues to the end.

The saved boundary is a stable Slide ID. Position is its current place in Main Slides. Inserting inside a Section includes the new Slide automatically. Moving a cover changes the adjacent ranges. A stored membership list is a compatibility cache; first-Slide membership is resolved from current Main order.

Click a Section chevron in Pages to fold or unfold it. The cover stays visible. Search temporarily reveals matching members and restores the folding state when cleared. Folding does not change presentation or export order.

Existing fixed ranges and explicit lists remain supported until deliberately converted. If a cover is removed, **Review Sections** leads to its definition. Repair all missing covers before saving the complete draft; an invalid partial repair is not written.

## Insert at a specific gap

Use a thumbnail gap above, between, or below Slides. Click it, activate it with the keyboard, or choose **Insert blank slide here** from its context menu. A gap after a folded Section refers to its last member, including hidden members, independently of the selected Slide.

The inserted Slide is selected. Normal Undo restores the preceding state. If another edit changes the neighboring Slides before insertion, select the location again.

## Manage a Presentation

A Project has one Main Slides library. Presentations contain references to those Slides and Sections, providing alternate arrangements of the same content.

Select a Presentation and open **Project → Project and Story**. **Delete Presentation** is beside its name. **Save project** commits the removal; **Discard draft** cancels it. Main Slides and their recorded versions remain.

**Add slides or Sections** opens the source choices with a Plus icon. **Close slide selection** closes them with a Minus icon. An empty Presentation can be saved; its central guidance leads to arranging content before Present or Export becomes available.

Ordinary pending edits use their panel's Save/Discard controls and the compact **Drafts** action in the document header. Actual conflicts and recovery failures retain dedicated notices.

## Preview supporting files

**Assets** is the library of placeable material. **Files** shows the broader folder structure, including documents and scripts.

Click an image or supported text file to preview it on the right. PNG, JPEG, GIF, and WebP display as images. Markdown, JSON, command files, and supported code formats display read-only source. They do not execute. Large text is bounded and marked when truncated; unsupported files receive an explanation.

Resize the preview at its edge. Close it or choose **Show Properties** to return to editing. The current Slide and other panel drafts remain. Delete, paste, and Undo inside Preview do not edit the canvas. Source text can be selected and copied.

## Reuse an authored title style

1. Open the target Slide and **Inspector → Properties → Quick Layout**.
2. Under **Match title style**, choose a Reference Slide and its specific title object.
3. Review **Captured reference style** and choose the specific independent title on the current Slide.
4. Select **Apply to chosen title**, inspect the result, and use one Undo if needed.

The action copies the captured position and supported typography to that one title. It keeps the target's words, semantic emphasis, figures, Notes, and unrelated objects. It does not create a live link. Use **Refresh reference style** to capture subsequent reference changes.

Use a reference with a consistent visible baseline style. Incompatible mixed styles require an explicit choice. A grouped target must be made independent before using this layout action.

## Choose and check fonts

Text Properties groups common document families, open-source suggestions, and generic families. Custom font stacks remain editable. A preset does not install a font.

Open **Workspace settings → Fonts** for samples and **Check local fonts**. The check starts only on request. Installed, loaded, generic, missing, and unverified states are distinct; denied or unsupported access stays unverified. Install a font through the operating system and check again. Source/license links describe the suggested families; proprietary font files are not bundled.

Inspect the actual export before a meeting or delivery on another computer. Local availability does not guarantee identical fonts elsewhere.

## Keep private Projects separate

Keep private Projects and original assets in their own working folders. Editor releases do not need their slide files, research images, screenshots, paths, or per-page audit records. Shared editor evidence uses synthetic examples. Cleaning the current tree does not erase earlier Git history.
