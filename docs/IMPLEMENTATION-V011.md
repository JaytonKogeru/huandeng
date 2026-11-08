# HUANDENG v0.11 implementation

Date: 2026-11-08. This document records the authoring implementation and its boundaries, following [AUDIT-V011](AUDIT-V011.md) and [SPEC-V011](SPEC-V011.md). The current clean corrected source is `0d0d8efe115c4b4dc9789c35f70b13efc899ab9e` (product 0.11.0). New source gates, matching packaging, and all 43 UI groups passed. Incremental reinstall and authorized local authoring also passed. The accepted runtime is release-ready; documentation/evidence delivery uses a separate commit and actual remote refs are verified after the push. Earlier `cb56cbc` installation successes remain historical evidence. See [VALIDATION-V011](VALIDATION-V011.md) and [WORKFLOW-V011](WORKFLOW-V011.md).

## Presentation management and status

The Project editor places Delete Presentation beside the Presentation name. The action removes that arrangement from the local Project draft and explains Save Project and Discard. Main Slides and recorded Slide versions remain independent of the arrangement. The existing revision-aware Project save path remains the persistence boundary; a failed save retains the draft.

Slide selection uses consistent content vocabulary. Add slides or Sections opens the choices with Plus; Close slide selection closes them with Minus. The toggle exposes its expanded state. It no longer calls the user-facing surface a source picker.

Routine pending work is shown in its context rather than as stacked global warning rows. The header has a compact Drafts review action leading back to Project, Story, chart, or timeline work. An intentionally empty Presentation receives guidance and an arrangement action in its content area. Present and Export remain guarded while relevant drafts or invalid references are unresolved. Genuine save errors, conflicts, and recovery states retain their visible actions.

## Sections and thumbnail navigation

A Section can explicitly use its first Slide as the membership boundary. Its end is derived from the next Section start in current Main order; the last automatic Section continues to the end. Slides before the first start remain outside automatic Sections. Moving or inserting Slides therefore updates the resolved membership without replacing a stable identity with a Position number.

Older fixed ranges and explicit member lists remain distinct modes. Opening a Project does not migrate their definitions. The model diagnoses unavailable starts or range boundaries, reversed ranges, duplicate starts, and overlaps. Cached members support compatibility; they do not replace the selected first Slide as the automatic boundary.

Pages renders valid continuous Sections with the cover thumbnail retained, a separate disclosure, and a member count. Collapsing hides the following members in the rail; it never rewrites Main order or Presentation references. When the current Slide is inside a collapsed Section, the heading identifies that state. Search temporarily exposes matching members and their cover without overwriting the user's collapse choices. Keyboard navigation uses the visible entries.

Two integration corrections protect recovery from missing covers:

- Pages surfaces a compact Section diagnostic and Review Sections action instead of silently dropping every invalid group without explanation.
- The Project draft can hold a first-Slide repair while another missing cover still prevents end resolution. Invalid chosen boundaries and overlaps remain blocked. Save still validates the complete result through the writer, so a partially repaired Project is not treated as a valid saved arrangement.

The latter correction was checked with synthetic in-memory data against the actual setter and model. A two-cover repair can be staged sequentially and saved once complete; partial saves and invalid definitions remain rejected. The packaged authoring suite passed the repair and reopen journey; its exact interaction coverage is recorded separately in Validation.

## Exact insertion boundaries

Thumbnail gaps and context menus provide blank-Slide insertion before and after the intended location. The first gap explicitly inserts before the first Slide, and the final gap inserts after the last Slide. The location is stored as the neighboring identities from the current Main snapshot, not inferred later from the selected Slide or a displayed ordinal.

Before insertion, pending page changes are flushed and the current adjacency is checked again. A changed boundary produces an actionable error requiring the user to choose the insertion point again. The transaction carries the current manifest and metadata revisions, uses the existing page-add operation, and selects the resulting Slide. The writer's normal Undo behavior applies. Gap insertion is not offered as an edit to a Presentation's reference sequence. Search suppresses gap targets whose visual adjacency would be misleading; thumbnail before/after actions retain their explicit location.

## Read-only Files preview

Files and Assets remain complementary views of the same Project. A page file continues to select its Slide. A supported non-page file opens a right-side preview while the Slide remains visible. The preview has Close, Refresh, image sizing, and a route back to the Inspector; the desktop can reveal the selected file through its existing host action.

The preview supports PNG, JPEG, GIF, and WebP images, and bounded text such as Markdown, JSON, command files, and ordinary source files. Markdown, HTML, SVG, and scripts are shown as literal source text. The application does not execute them or treat them as its own markup. Unsupported files receive an explanation.

The reader enforces these limits and boundaries:

| Boundary | Implementation |
| --- | --- |
| Project access | Normalize a relative path, reject absolute/traversal/alternate-stream input, reject linked path components, and verify realpath containment and the opened regular file. |
| Text reads | Read at most 256 KiB; show truncation. Decode supported text encodings deliberately and reject binary/control-byte content. |
| Image reads | Limit file size to 32 MiB and image dimensions to 32 megapixels; inspect source signatures and dimensions. |
| Image freshness | Serve the selected source image only when its revision still matches the preview request. |
| Request ordering | Abort superseded requests and keep the selected path attached to the loaded result. A slow response cannot replace a newer file selection. |

The HTTP routes use the existing loopback and origin checks. Preview adds no public listener or content-execution service.

Opening Preview hides the Inspector or right-side Notes context without destroying it. The Inspector remains mounted, and existing draft retention paths continue to own edits. Preview keyboard events do not become canvas editing commands; native Edit handling and paste also distinguish the preview region. Global save/help/focus behavior remains available through the workspace's established routing. These protections were source-reviewed and exercised in the development-host journey. The packaged authoring suite passed its draft/keyboard checks; the complete matching-package suite and visual results are recorded separately in Validation.

## Quick Layout and authored references

Inspector exposes one Quick Layout section instead of two nested disclosures. Existing figure recipes remain available. Match title style lets the author choose an existing Slide and reference text object, then an independent target text object on the current editable Slide. It does not guess that every large object is a title or alter unrelated figures, backgrounds, or objects. Ordinary and Section-cover titles use this same explicit reference workflow; no mandatory visual theme is introduced.

The integration uses a captured reference style, a frozen reference preview, and an explicit reference refresh. The captured values describe typography, appearance, position, and size. Applying creates a bounded target edit through the existing writer with one Undo boundary. The target's words and semantic emphasis are retained; conflicting baseline inline formatting is handled separately so a new family or layout can actually take effect on imported rich text.

Capture reads a consistent supported visible inline baseline and explains incompatible mixed baselines. Applying clears only the relevant baseline CSS so imported inline font, size, and uniform emphasis declarations cannot silently defeat the chosen style. Semantic tags and mixed local emphasis remain. The target page revision protects the edit; the reference page revision is provenance for a captured style. There is no atomic source-page read dependency or cross-page source CAS, and no promise to follow future reference edits. Unit coverage and the final packaged capture/rendering/Undo result are distinguished in Validation.

## Font catalog and Settings

Text Properties adds a grouped preset selector while retaining the custom font-stack field. Existing values are not rewritten merely by opening the Inspector. A deliberate selection uses the existing text patch and save/Undo path.

| Group | Presets |
| --- | --- |
| Document fonts | Arial, Arial Black, Times New Roman, Calibri, Cambria, Georgia, Verdana, Tahoma, Trebuchet MS, Segoe UI, Aptos, Courier New |
| Open-source fonts | Source Sans 3, Source Serif 4, Noto Sans, Noto Serif, Noto Sans SC, Noto Serif SC, Inter, Libre Baskerville, Libre Franklin |
| Generic families | system-ui, sans-serif, serif, monospace |

Workspace settings has a Fonts section with samples, the selected family's status, and links to the source/license for open-source suggestions. Check local fonts is an explicit user action. It uses the existing local-font access boundary; denied, unsupported, or failed access leaves unknown families unverified rather than incorrectly marking the entire catalog missing. Loaded editor fonts, installed families, generic fallbacks, missing families, and unverified availability have distinct labels. Local aliases are checked only after access is granted. The implementation does not use a successful generic fallback as proof that a named font is installed.

No font binaries are added by this catalog. Proprietary system fonts are selected when available, not copied into the application. Presets do not install fonts or promise embedding or identical rendering on another computer. Existing render/export font diagnostics remain relevant. Rich-text font application and Settings/localization have regression coverage; the packaged authoring suite passed its rendered preset and explicit local-font check journeys. Validation retains the exact scope and accepted runtime provenance.

## YAML source compatibility

The shared codec's `replaceNode` path handles valid indentless block sequences when converting a source span to a JSON-style flow value. It adds two spaces for a block sequence; scalar and existing flow-node replacement retain their prior behavior. This prevents a following-line geometry/alignment value from staying at the mapping key's indentation and failing YAML parsing. It is a three-line runtime correction, not a new serializer or a writer/CAS bypass.

Six synthetic codec regressions exercise LF and CRLF for multiline geometry/alignment arrays, empty manifest arrays, and block-array-to-flow-map replacement. They check semantic equality and surrounding source, including BOM, comments, following fields, and unknown content. One shared-store regression checks that preview leaves protected bytes, snapshot, and history unchanged; commit changes only the intended Project/page content; Undo restores bytes. The focused 44 checks and full 1,089-case suite passed. Matching packaged UI also passed; incremental installation also passed on its own receipt. Authorized installed-authoring acceptance subsequently passed on its own receipt; it is not inferred from these tests.

## Privacy and publication boundaries

Editor code and generic synthetic evidence are the publishable deliverables. Private Project documents, figures, supporting research files, screenshots, previews, local paths, and identifying per-page validation records stay outside the editor repository and release artifacts. Applying the editor to a private Project is local authoring work; it does not make that Project an editor fixture or demonstration asset.

Legacy current-tree documentation and acceptance records have been sanitized to generic descriptions and aggregate counts while retaining the truthful verification outcomes. This includes private manifest/export hashes as well as page/contact-sheet hashes and source element identifiers. Detailed private audit records are not placed in repository documentation. This cleanup does not remove material from older commits or tags. Historical identifying references require a separate review before changing repository visibility; this milestone does not rewrite shared history or force-push it.

Future extension analysis favors bounded adapters for local figures/citations, scientific data and plots, and Project-specific style assistance through the shared authoring interfaces. No arbitrary plugin execution, marketplace, model runner, new tunnel, or replacement document model is introduced here.

## Validation state and release gates

The initial A/B audits and the additional integration review are source review. The synthetic Section recovery check is a focused model check. Neither is a live desktop acceptance result.

Corrected source `0d0d8ef` passed 44 focused codec/store tests in 7.38 seconds, TypeScript in 4.70 seconds, Biome over 735 files in 3.03 seconds, the full suite (1,088 passed plus one platform skip across 97 files; 70.51 seconds wall), and the production build in 8.18 seconds. Its matching package passed in 90.62 seconds, built at `2026-11-08T09:51:50.6948572Z`, with all 43 UI groups passing. The earlier `cb56cbc` installed-state result is retained as a historical fact; the corrected-source incremental installation passed in 451.00 seconds, exit 0. Authorized local authoring then passed installed CLI/shared-writer preview, apply, verify-after, native export, preservation checks, and independent visual review. Private contents and detailed receipts remain local.

[VALIDATION-V011](VALIDATION-V011.md) distinguishes source/model, unit, live UI, and installed evidence. Private authoring data does not enter editor fixtures or evidence. The accepted runtime remains identified by `0d0d8ef`; the final documentation/evidence delivery commit is separate and does not alter its installed bytes. Documentation is ready for the scoped private-origin milestone. Actual remote-ref verification occurs only after the authorized push.
