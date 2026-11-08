# HUANDENG v0.11 release — draft

**Release status: PENDING final validation, packaging, installed-build verification, and publication.** The changes below describe the implemented candidate, not an accepted or installed release. [VALIDATION-V011](VALIDATION-V011.md) owns the final evidence; [HANDOFF-V011](HANDOFF-V011.md) records the remaining work.

## Candidate changes

### Presentation actions where they are needed

Delete Presentation sits beside the Presentation name. Removing it is a Project draft edit with Save and Discard, and retains Main Slides and recorded versions. Slide selection has consistent wording, Plus/Minus states, and an accessible expanded state. Ordinary pending drafts and empty-Presentation guidance move into their working context while genuine save/recovery failures remain prominent.

### Sections built around their first Slide

An optional first-Slide mode follows Main order until the next Section start, with the final Section continuing to the end. Existing fixed ranges and explicit memberships remain compatible. Pages keeps the cover visible, provides a separate collapse control and count, and exposes matching members during search. Missing boundaries have a visible Review Sections route; multiple missing covers can be repaired in the local draft before the complete result is saved.

### Insert exactly between Slides

Focusable thumbnail gaps and before/after context-menu actions insert a blank Slide at the requested location. Stable neighboring identities and current revisions protect against stale locations. The first and last boundaries are explicit, and normal selection and Undo use the existing writer.

### Read supporting files beside the Slide

Files opens supported images and bounded source text in a closable right-side preview. It retains the current Slide and working drafts. Markdown, HTML, JSON, and scripts are read-only source, not executable content. Preview enforces Project containment, link rejection, type/size limits, request ordering, and image freshness. Assets remains the placeable-material view.

### Reuse an authored title style

Quick Layout has one visible entry. Match title style captures an explicitly chosen title's position and supported visible typography, shows the captured reference, and offers Refresh reference style for subsequent source edits. Applying affects one explicitly chosen independent title and preserves words, semantic emphasis, figures, and unrelated objects. Target revision checks and one Undo protect the edit; the source revision describes captured provenance rather than an atomic cross-page read dependency.

Imported rich text receives deliberate baseline handling so changing a font or size is not silently defeated by its existing inline CSS. A reference with incompatible mixed baseline styles must be explained instead of reduced to an arbitrary container default. Existing evidence-figure recipes remain available.

### Font choices with real availability information

Text Properties offers grouped common document fonts, open-source suggestions, and generic families alongside custom font-stack input. Settings shows samples and an explicit Check local fonts action. Installed, loaded, generic, missing, and unverified states are distinct; denial or unsupported access does not label every family missing. Presets neither install nor embed fonts, and no proprietary font binaries are bundled by this change.

## Compatibility and scope

Main Slides remains the reusable content source, and Presentation edits remain arrangement edits. Automatic Section starts are opt-in; old ranges/lists are not silently migrated. Folding and panel placement do not alter document order. The existing writer, draft retention, recovery, and Undo paths remain the editing foundation.

File preview is a read-only authoring aid. Quick Layout copies an explicit captured style rather than synchronizing the entire Project with a live template. Font availability applies to the checked computer and does not promise identical rendering elsewhere. A plugin marketplace, arbitrary plugin execution, new model runner, new public listener/tunnel, and full PPTX round-trip capability are outside this candidate's scope.

## Privacy and public-release boundary

This milestone contains editor source, generic documentation, and approved synthetic evidence. Private Projects, research media, screenshots, source contents, paths, and identifying per-page receipts are excluded from repository and release artifacts.

Current-tree legacy identifiers were cleaned and detailed identifying validation data was replaced with aggregate summaries. No full private research deck or private research media was found in the scanned published Git objects. The scan's scope does not include every possible remote cache or external attachment.

Historical identifier, path, hash, and object-identifier traces remain in reachable history. They require a separate action before a public release or visibility change. No history rewrite is authorized or performed by this milestone; present-tree cleanup must not be described as history erasure.

## Release record to complete

| Item | Final value |
| --- | --- |
| Accepted product version | **PENDING** |
| Accepted source/build identity | **PENDING** |
| Windows type/format/unit results reported by the release lead | TypeScript passed; Biome checked 735 files without warnings; unit suite: 97 files, 1,079 passed, one platform skip. Final source receipt linkage remains **PENDING**. |
| Actual packaged Windows UI result and count | **PENDING** |
| Production build/package/relocation result | Core/editor build passed on Windows; package and relocation verification remain **PENDING**. |
| Installed executable and shortcut verification | **PENDING** |
| Aggregate private-document preservation result | **PENDING** — retain detailed private receipt locally |
| Generic evidence index | **PENDING** |
| Private-origin publication and independently verified refs | **PENDING** |
| Final known limitations and disposition | **PENDING** |

Complete the gates and receipts in [VALIDATION-V011](VALIDATION-V011.md) before describing this candidate as released, installed, or accepted. Installation and remote publication are separate outcomes; success in one does not establish the other.
