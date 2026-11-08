# HUANDENG v0.11 validation

Date: 2026-11-08. **HUANDENG 0.11.0 is accepted and installed from clean runtime source `0d0d8efe115c4b4dc9789c35f70b13efc899ab9e`. Source gates, matching packaging, all 43 UI groups, installation, and the authorized local authoring check passed.** Documentation and safe evidence are ready for the final private-origin milestone; remote refs still require independent verification after the push.

Contract: [Audit](AUDIT-V011.md) → [Specification](SPEC-V011.md) → [Implementation](IMPLEMENTATION-V011.md) → validation → [Release](RELEASE-V011.md). User controls are described in [WORKFLOW-V011](WORKFLOW-V011.md).

## Accepted runtime and completed gates

The release lead reports the following Windows executions. The independent A/B auditors reviewed source and state flow; their reviews are not desktop acceptance receipts.

| Item | Observed result |
| --- | --- |
| Product version | 0.11.0 |
| Accepted clean runtime source | `0d0d8efe115c4b4dc9789c35f70b13efc899ab9e`; clean |
| Writer correction | Three runtime lines in the source-preserving YAML replacement path; no writer/CAS relaxation |
| Focused codec/store checks | **44 passed**; 7.38 seconds |
| New regression cases | Six synthetic codec cases across LF/CRLF plus one shared-store preview/commit/Undo case |
| TypeScript | Passed; **4.70 seconds** |
| Biome | **735 files**, no errors; **3.03 seconds** |
| Full unit suite | **97 files; 1,088 passed + one platform skip = 1,089 total**; **70.51 seconds wall / 68.61 seconds Vitest**, four workers |
| Core/editor production build | Passed; **8.18 seconds** |
| Matching corrected-source Windows package | **Passed; 90.62 seconds**; clean `0d0d8ef`, built `2026-11-08T09:51:50.6948572Z`; 2,405 portable dependency directories, zero relative executable links |
| Matching-package authoring UI | **19/19 passed**, 44.96 seconds |
| Matching-package workflow UI | **7/7 passed**, 14.55 seconds |
| Matching-package object/workspace UI | **17/17 passed**, 39.63 seconds |
| Complete matching-package UI | **43/43 passed**; the successful strict installer validated all ten required normal exits |
| Incremental reinstall | **Passed; 451.00 seconds**, exit `0`; installed runtime `0d0d8efe115c4b4dc9789c35f70b13efc899ab9e` |
| Installed application files | **29,229 files / 685,593,328 bytes**; two shortcuts checked |
| Ordinary-profile reopen | English; **existing Project**, zero diagnostics, writable protocol 1 |
| Aggregate preservation | **all current Project files unchanged**; normal closure saved zero files; previous `cb56cbc` and v0.10 packages retained |
| Authorized local authoring | **Passed** through the installed CLI/shared writer: preview → apply → verify-after, native export, source-preservation checks, and independent visual review; private details stay local |
| Earlier installed source | `cb56cbc71b2898d8872e84732f55480587b2a5ef`; earlier successful installation recorded below |
| Delivery state | **Ready for final private-origin milestone**; documentation/evidence delivery commit is separate from the runtime commit, and actual remote refs are not yet verified in this record |

The correction changes application code, so prior-package evidence was not reused as proof of it. The accepted runtime has its own matching package/UI, successful incremental installation, and completed authorized authoring outcome. The final documentation/evidence delivery commit records those facts and does not change the accepted runtime bytes.

## Failures and corrections retained in the record

### Source-preserving YAML array replacement

An additional authoring preview rejected a layout edit with `INVALID_DOCUMENT` before commit. The source was valid YAML with an indentless block sequence: a sequence may begin at the same indentation as its mapping key, while a replacement flow value may not. Replacing that sequence with JSON at the old dash position produced invalid indentation for a following-line geometry array. No document write or application of the rejected transaction occurred.

The shared codec now adds two spaces when replacing a block sequence with a flow value. It retains source-span editing and the original newline convention; scalar and existing-flow replacements keep their prior behavior. It does not serialize the whole document, relax validation/CAS, or bypass the shared writer.

Six generic codec cases cover LF and CRLF for geometry/alignment arrays, an empty manifest sequence, and a block-array-to-flow-map replacement. They check parsed semantics and surrounding source preservation, including BOM, adjacent comments, following fields, and unknown content. A shared-store synthetic case verifies that preview leaves document bytes/state/history unchanged, commit changes only the intended Project/page data, and Undo restores the original bytes. The focused 44-test run and the full suite passed. The corrected packaged authoring suite and the subsequent installed authoring check both passed, with distinct receipts. Private authoring data is not a committed fixture.

### Earlier attempts retained for provenance

The first development UI attempt passed five groups, then failed a harness assertion that treated the stored Section member cache as authoritative immediately after insertion. The visible Section had three resolved members and retained its cover. The assertion now checks resolved membership through the story-briefing result; no runtime change or weaker membership requirement was introduced for that failure. A subsequent **development-host** run passed all 19 groups in 43.38 seconds, with zero renderer errors, five normal `0`/`null` exits, and 13 synthetic screens. That intermediate result does not certify the final packaged candidate.

A later full unit run at default concurrency failed two legacy cases: an asset-queue test observed zero rather than two active reads before asynchronous `fs.open` readiness, and a store-recipe case exceeded its five-second timeout. Two downstream socket-cleanup errors followed. Both affected files, totaling 31 tests, passed unchanged in an isolated 12.93-second run. Only the queue test's wait was then corrected to include file-open readiness in the same wait; its assertions and resource/writer runtime stayed unchanged. The final full run with four workers passed as recorded above. The default-concurrency failure remains part of the result; no resource leak or writer repair is inferred from it.

The final source also contains two additional unit regressions for uniform inline emphasis handling, including normal font-weight CSS that would otherwise defeat an applied bold style. Empty-Presentation guidance no longer duplicates a shared top notice. The packaged authoring suite has now passed its rendered title-style and font-preset checks. The complete object/workspace suite also passed after the harness-only correction below; the earlier `cb56cbc` matching-package and installation checks are recorded separately below.

The first object/workspace attempt stopped in group 12 after 11 passes because the preceding Files scenario had intentionally left a Python source preview open. The harness then sought the hidden Inspector resize control. A 12-line harness-only correction explicitly checks that the preview is read-only, closes it, and checks the restored Inspector before resizing. All groups and resize assertions remain. The unchanged application then passed **17/17 in 39.12 seconds**. This correction is committed as `cb56cbc71b2898d8872e84732f55480587b2a5ef`; it is not a runtime resize or resource fix.

The first repackaging command for the final clean commit stopped at the existing-output guard. The supported `-Replace` rerun then passed in 104.77 seconds. All three suites then passed against the matching `cb56cbc` package: authoring 19/19 in 51.89 seconds, workflow 7/7 in 14.87 seconds, and object/workspace 17/17 in 38.88 seconds, runner exit 0. Those results predate the YAML compatibility correction and do not replace its required rerun.

## Corrected matching-package UI scope

The scripts below use isolated synthetic Projects and the packaged executable. Both the prior `cb56cbc` package and the corrected matching-source package passed **43/43 groups**; only the corrected package supplies the current timings above. Codec/store unit coverage is listed separately and must not be described as a live UI check.

| Script | Groups | Interaction and data observations |
| --- | ---: | --- |
| `scripts/verify-authoring-v011.mjs` | 19 | Stable first-Slide Sections and reopen; folding/search; insertion before a cover, after a folded Section's last member, and before the first Slide; Undo; empty-Presentation guidance; Plus/Minus disclosure; discardable/saved deletion; compact Drafts; image and inert source previews; keyboard/native-menu isolation; return to Notes; rendered title style and font presets with one Undo; explicit font inventory; missing-cover diagnostics, rejected partial save, retained repair draft, successful complete save, and reopen. |
| `scripts/verify-workflow-v010.mjs` | 7 | Welcome/New Project; saved Main Slides; compatible fixed Section ranges; visual source choices and repeated references; reorder/removal while retaining the selected occurrence; ordinary/compact layout; normal close/Open Project. |
| `scripts/verify-object-workspace-v010.mjs` | 17 | English/default and optional Chinese vocabulary; object menus; shared formatting and layer shortcuts; Story/chart draft retention; Notes resize/dock/input ownership; Assets filtering, reuse/import/drag placement; panel layout and immediate-close persistence; Settings/help; Agent setup explanation; readable document and normal closure. |

The [acceptance record](evidence/v011/acceptance.json) is the shareable evidence index for the accepted corrected runtime. Raw execution receipts stay local. A script's existence is not a passed result, and unit-only edge cases are not promoted into live UI claims.

## Unit, model, and source-review coverage

The full unit suite covers the model and authoring helpers alongside existing regression tests. Relevant coverage includes first-Slide membership and diagnostic resolution; legacy range/list compatibility; thumbnail visibility and exact-neighbor insertion; bounded file-preview reads and path/link/type/size restrictions; title-style capture and target edits; visible rich-text baseline handling; grouped font presets and honest availability states; and existing shared writer behavior. These checks do not imply that every corresponding error state was clicked in the packaged UI.

A focused synthetic model check additionally exercised two missing covers repaired sequentially: the first repair can remain in the draft, a partial save is rejected, the completed repair saves, and invalid/overlapping definitions remain rejected. The packaged authoring script separately includes the user-facing repair journey and a real rejected writer response.

Source review checked that Preview retains draft-owning panels, isolates canvas-editing keys, cancels superseded reads, and uses existing loopback/origin boundaries. Quick Layout freezes the selected reference style until explicit refresh and revision-checks the edited target. The recorded reference revision is provenance; it is **not cross-page source-read CAS**. No atomic reference-page lock is claimed.

## Visual review and remaining limits

The release lead and independent reviewer inspected the accepted `0d0d8ef` package captures below. All seven contain synthetic content without visible personal roots; the safe evidence set and its whitelisted acceptance record have been prepared. Selectors and stored-property assertions alone do not establish appearance.

| Visual check | Final capture |
| --- | --- |
| Section cover retained when folded | [Collapsed Section](evidence/v011/03-collapsed-cover.png) |
| Central empty-Presentation guidance | [Empty Presentation](evidence/v011/04-empty-presentation.png) |
| Read-only image preview with personal root masked | [Files preview](evidence/v011/06-image-preview.png) |
| Captured title style visibly applied | [Title style](evidence/v011/07-title-style.png) |
| Font groups, samples, and local check | [Font settings](evidence/v011/09-font-settings.png) |
| Completed cover repair and resolved Sections | [Repaired Sections](evidence/v011/12-repaired-sections.png) |
| Compact Project workflow | [Compact workflow](evidence/v011/workflow-1040.png) |

This milestone adds no long-session or high-resolution soak conclusion, full PPTX round-trip guarantee, native PowerPoint animation, separate audience/presenter windows, arbitrary plugin runtime, or font embedding. Local font inventory describes the checked computer; permission denial/unsupported access remains unverified. Exports and Office rendering retain the scope of their existing validation records unless a new run is explicitly recorded.

## Privacy boundary

Current-tree legacy project identifiers and personal local paths were generalized. Private page/contact-sheet hashes, source element IDs, manifest hashes, and PDF/PPTX export hashes were replaced with truthful aggregate results and private-local-retention explanations. The final eight manifest/export fingerprint occurrences in three legacy files are included in the committed cleanup. Measured sizes, unchanged results, and counts were retained.

The earlier source-commit tree scan covered 1,217 tracked/nonignored files: 1,140 text files and 77 binaries, including the newly added documentation. No private project name or personal Windows user path remained in text. All ten tracked v0.10 PNGs were re-inspected; none showed personal account paths or private research contents. The final v0.11 captures listed above were also reviewed, with personal project/config roots masked at capture time. Synthetic screenshots can otherwise reveal local account paths. Raw receipts remain outside Git.

The inspected published Git objects did not contain a full private research deck or private research media. That finding is limited to the objects scanned; it does not certify remote caches, issues, attachments, or external copies. Earlier commits/tags still contain identifier, path, hash, and object-identifier traces. **History rewriting is not authorized or performed here; a separate history action is required before public release or a visibility change.**

## Earlier installation and document preservation

Installation completed in **452.55 seconds**, exit `0`, using the clean `cb56cbc` package before the YAML correction. The installed application matches all **29,229 package files / 685,588,012 bytes**. The retained v0.10 rollback package was verified, and both ordinary launch shortcuts were checked.

The application closed normally with **zero files saved** during closure. The ordinary English profile then reopened the **existing Project** with writable protocol 1, zero diagnostics, and a fresh service epoch. Production frontend bytes and the service's process-parent relationship were verified. The installed copy runs from its normal application location, independently of the development worktree.

All current Project files remained byte-identical across normal closure, application replacement, and reopening. The separate protected canonical fixture also remained unchanged. There was no forced termination or restoration of historical document data. Detailed private paths and per-file inventories are retained only in the local installation receipt; these are aggregate preservation results, not publishable research fixtures.

## Corrected-source incremental installation

The reviewed incremental installer completed in **451.00 seconds**, exit `0`, with installed runtime `0d0d8efe115c4b4dc9789c35f70b13efc899ab9e`. The installation covers **29,229 application files / 685,593,328 bytes** and the two ordinary shortcuts. The English profile reopened the **existing Project** with zero diagnostics and writable protocol 1.

Normal closure saved **zero files**. All current Project files remained unchanged. The previous `cb56cbc` application package and the existing v0.10 backup are retained separately. The completion receipt reports `passed: true`, `installationState: complete`, and `pendingRecovery: false`. Original-file preservation, protected-fixture preservation, installed-manifest matching, previous-version retention, and leaving the ordinary application open all passed. The native window was also observed in its saved English state. Private filenames, inventories, and authoring receipts remain local.

## Authorized local authoring acceptance

The accepted installed runtime completed an authorized local authoring task through the same CLI/shared writer: preview, apply, and verify-after all succeeded. Native export and source-preservation checks passed, followed by review by the release lead and an independent reviewer. Unchanged content retained its original rendering. This records the editor's actual authoring outcome without publishing the private document, its structure, page counts, changes, identifiers, paths, figures, screenshots, or detailed receipts.

## Final disposition and delivery provenance

**Accepted and installed runtime:** `0d0d8efe115c4b4dc9789c35f70b13efc899ab9e`, version 0.11.0, built `2026-11-08T09:51:50.6948572Z`. All required source, matching-package UI, installation, preservation, and authorized authoring checks are complete. The earlier `cb56cbc` installation remains separately recorded historical evidence.

**Documentation/evidence delivery:** these records and the reviewed generic evidence are ready for the final scoped delivery commit. That commit is separate from the runtime source above and does not replace the accepted build identity. The planned private-origin milestone is `main` / `editor-v0.11.0`; this pre-push record does not assert that remote synchronization or independent ref verification has already succeeded. Record those actual outcomes after the Git operations.

Final staging contains editor source/docs and reviewed synthetic evidence only. Private authoring material remains local. Follow [RELEASE-POLICY](RELEASE-POLICY.md): no upstream push, npm publishing, history rewrite, or visibility change. Historical privacy cleanup remains a separate requirement before any public-release decision.
