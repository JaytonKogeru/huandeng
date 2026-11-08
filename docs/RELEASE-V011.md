# HUANDENG v0.11 — organize and refine authored Slides

**Accepted and installed: HUANDENG 0.11.0**, clean runtime source `0d0d8efe115c4b4dc9789c35f70b13efc899ab9e`, built `2026-11-08T09:51:50.6948572Z`. Source gates, matching packaging, all 43 UI groups, installation, and authorized local authoring passed. The documentation and reviewed generic evidence are ready for the final private-origin milestone. The delivery commit is separate from the runtime commit; this record does not claim that the push or independent remote-ref verification has already occurred.

Start with [WORKFLOW-V011](WORKFLOW-V011.md). Decisions and proof are in [Audit](AUDIT-V011.md), [Specification](SPEC-V011.md), [Implementation](IMPLEMENTATION-V011.md), and [Validation](VALIDATION-V011.md).

## Changes

| Area | Result |
| --- | --- |
| Presentation management | Delete Presentation is beside its name and remains a Save/Discard Project edit. Main Slides and recorded versions remain. Slide selection uses matching Plus/Minus icons and Add slides or Sections/Close slide selection wording. |
| Work in progress | Routine drafts use contextual Save/Discard and a compact Drafts action. An empty Presentation shows central arrangement guidance. Genuine conflicts and recovery failures remain actionable. |
| Sections | Optional first-Slide boundaries follow Main order to the next Section start or the end. Pages retains the cover, provides a separate collapse control, and reveals matches during search. Legacy fixed ranges/lists remain compatible. Missing covers have a visible repair route; multiple repairs can be staged before a valid final save. |
| Exact insertion | Thumbnail gaps and before/after actions insert at the chosen stable-neighbor boundary, including the first Slide and the end of a folded Section. Changed adjacency is rejected. Existing selection, writer, and Undo behavior apply. |
| Files | A closable right-side image/source preview retains the Slide and drafts. Files remains the broader Project tree; Assets remains placeable material. Text, including scripts and markup, is read-only and does not execute. |
| Quick Layout | One visible entry exposes existing recipes and Match title style. Choose an authored reference title and an independent target, review the captured style, apply once, and Undo once. Explicit refresh captures later reference changes. Words, semantic emphasis, and unrelated objects remain. |
| Fonts | Grouped document/open-source/generic presets accompany custom stacks. Settings shows samples and an explicit Check local fonts action. Installed, loaded, generic, missing, and unverified states are distinct. Uniform inline baselines no longer silently defeat supported font, size, or emphasis changes. |
| Existing YAML documents | Source-preserving edits now indent a flow value when replacing an indentless block sequence. This prevents a valid multiline geometry/alignment array from becoming invalid YAML during a patch, while retaining surrounding source and the existing writer contract. |

## Compatibility and boundaries

Automatic Sections are opt-in. The cover is an ordinary editable Slide with a stable identity; Position and resolved membership follow Main order. Folding is view state. The shared writer, revision checks, drafts, Undo, recovery, and original PPTD/page/media authority remain intact.

Preview enforces Project containment, link rejection, bounded reads, type/dimension checks, response ordering, and image freshness. Quick Layout applies a captured style to a revision-checked target. A reference revision records provenance; there is no cross-page source-read CAS or continuing template link. Font suggestions do not install, redistribute, or embed font binaries, and local availability does not guarantee rendering elsewhere.

This milestone does not add a plugin marketplace, arbitrary plugin execution, model runner, new tunnel/public listener, full PPTX round-trip, native PowerPoint animation, or independent presenter window. It makes no new long-session/high-resolution performance claim.

## Validation record

| Gate | Result |
| --- | --- |
| Accepted clean runtime source | `0d0d8efe115c4b4dc9789c35f70b13efc899ab9e` |
| Focused codec/store checks | **44 passed**, 7.38 seconds; six codec regressions and one shared preview/commit/Undo regression added |
| Windows TypeScript | Passed; **4.70 seconds** |
| Biome | **735 files**, no errors; **3.03 seconds** |
| Full Windows units | **97 files, 1,088 passed + one platform skip = 1,089 total**; **70.51 seconds wall / 68.61 seconds Vitest**, four workers |
| Production build | Passed; **8.18 seconds** |
| Matching corrected-source package | **Passed; 90.62 seconds**, built `2026-11-08T09:51:50.6948572Z`; 2,405 dependency directories, zero relative executable links |
| Matching packaged UI | **43/43 passed**: authoring 19/19 in 44.96 seconds, workflow 7/7 in 14.55 seconds, object/workspace 17/17 in 39.63 seconds |
| Incremental reinstall | **Passed; 451.00 seconds**, exit `0`; corrected `0d0d8ef` installed |
| Application and ordinary reopen | **29,229 files / 685,593,328 bytes**, two shortcuts; English profile, the existing Project, zero diagnostics, writable protocol 1 |
| Aggregate preservation | **all current Project files unchanged**, normal-close saved files `0`; prior `cb56cbc` and v0.10 packages retained |
| Authorized local authoring | **Passed** through installed CLI/shared writer preview → apply → verify-after, native export, preservation checks, and independent visual review; private details stay local |
| Prior package | `cb56cbc` retained; earlier checks remain separately recorded in Validation |
| Delivery | **Release-ready** for private-origin `main` / `editor-v0.11.0`; actual remote refs await independent verification after the push |

[VALIDATION-V011](VALIDATION-V011.md) retains the development harness correction, the failed default-concurrency unit attempt, the isolated passing rerun, and the final full four-worker pass. It also records the object/workspace harness looking for a hidden Inspector while Preview was still open, the explicit preview-close correction with all assertions retained, the passing 17-group rerun, and the final repackaging output guard. Source/model checks and earlier development-host UI results are not substitutes for final packaged or installed evidence.

## Privacy

This release scope is editor source, generic documentation, and approved synthetic evidence. Private Projects, research media, screenshots, source contents, paths, and identifying receipts stay outside it. Current-tree legacy identifiers and file/page fingerprints have been generalized while preserving measured verification facts.

No full private research deck or private research media was found in the scanned published Git objects. Earlier commits/tags still contain identifier/path/hash/object-identifier traces. A separate scoped history action is required before public release or changing visibility; no history rewrite is authorized or performed here. Current-tree cleanup is not history erasure.

The corrected installed runtime passed the final authorized local authoring check. Keep its accepted `0d0d8ef` build identity distinct from the subsequent documentation/evidence delivery commit and from earlier `cb56cbc` evidence. Publish only the scoped editor milestone under [RELEASE-POLICY](RELEASE-POLICY.md), then verify actual remote refs; no completed push is claimed by this pre-push record.
