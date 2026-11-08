# HUANDENG v0.11 validation — draft

Date: 2026-11-08. **Status: PENDING final validation. This is not an acceptance receipt.**

Contract: [Audit](AUDIT-V011.md) → [Specification](SPEC-V011.md) → [Implementation](IMPLEMENTATION-V011.md) → validation → [release](RELEASE-V011.md). The release lead must replace pending entries with observed results for the final candidate. Source review, prepared scripts, and development checks do not establish that the packaged or installed application passed.

## Evidence established before final acceptance

The independent A/B audits and the integration review examined source and state flow. They are not live Windows UI tests. An in-memory synthetic check using the actual Section setter and model confirmed sequential repair of multiple missing covers, rejection of a partial save, acceptance of the completed repair, and continued rejection of invalid or overlapping boundaries. That check makes no claim about desktop controls, packaging, or installation.

The privacy review and current-tree cleanup have the bounded findings recorded below. The release lead has reported the Windows code-gate results below; this document does not attribute those executions to the source reviewers. Accepted runtime identity, completed Windows UI results, package results, and installed-state results remain **PENDING**. Intermediate reports must not be combined into an unobserved final pass.

## Final candidate identity

| Field | Final observed value |
| --- | --- |
| Product version | **PENDING** — read from the accepted candidate |
| Editor source revision and dirty state | **PENDING** — record the build receipt |
| Build time and build mode | **PENDING** |
| Electron/runtime version | **PENDING** |
| Acceptance execution environment | **PENDING** — distinguish development server, packaged executable, and installed executable |
| Sanitized evidence index | **PENDING** — include only generic editor evidence |

Local workstation paths, private project identifiers, and raw preservation inventories do not belong in this table. Runtime provenance and private document-preservation receipts are separate records.

## Code and packaging gates

| Gate | Required evidence | Final result |
| --- | --- | --- |
| TypeScript | Command/source-state receipt linkage remains pending | Passed on Windows; 4.38 seconds, reported by the release lead |
| Formatting and lint | Biome over the candidate source | 735 files checked with no warnings after two trivial warning fixes, reported by the release lead |
| Unit regression suite | Full Windows unit run | 97 files; 1,079 passed and one platform-specific skip, 1,080 total; 75.34 seconds, reported by the release lead |
| Additional focused regression gate | Only if later code changes or a concrete remaining risk require it | **PENDING disposition** |
| Core/editor production build | Build receipt/source-state linkage remains pending | Passed on Windows; 13.05 seconds. Inherited virtual-import and experimental-TypeScript notices were reported. |
| Self-contained Windows package | Dependency/package verification and launch | **PENDING** |
| Relocated package | Launch and document-service operation away from the build location | **PENDING** |
| Installed executable | Independent runtime identity and ordinary launch check | **PENDING** |

Record failed attempts and their corrections separately. A rerun passes only the assertions it actually exercised; it does not erase a prior failure or certify a different binary.

## Windows UI acceptance matrix

Use isolated synthetic Projects and normal controls. Compare saved data and visible output where the behavior needs both. Every result in this matrix is pending until observed on the candidate identified above.

| Journey | Required observation | Result |
| --- | --- | --- |
| Presentation removal | Delete is discoverable beside the name; Discard restores the draft; Save persists removal; Main Slides and recorded versions remain. | **PENDING** |
| Slide selection disclosure | Plus/Minus, Add slides or Sections/Close slide selection, keyboard use, and expanded state agree. | **PENDING** |
| Draft and empty states | Ordinary drafts use contextual guidance and the compact Drafts action; empty Presentation guidance is in context; genuine conflicts/recovery remain visible. | **PENDING** |
| Automatic Sections | First-Slide membership follows current Main order after insertion, append, and cover movement; introductory Slides stay outside Sections. | **PENDING** |
| Compatibility | Fixed ranges and explicit member lists remain unchanged until deliberate conversion. | **PENDING** |
| Missing-cover recovery | Pages shows its repair route; missing covers can be restored or rebound; multiple repairs can be staged before a valid final save. | **PENDING** |
| Section folding and search | Covers remain visible; current hidden-member state is clear; search exposes matches; keyboard navigation follows visible entries without changing playback/export order. | **PENDING** |
| Exact insertion | First, middle, last, and collapsed-group boundaries insert at the chosen location independently of current selection; changed adjacency is rejected. | **PENDING** |
| Insertion Undo/reopen | The inserted Slide is selected; Undo/redo and reopen preserve the intended order and identity behavior. | **PENDING** |
| File preview content | Supported images render; Markdown, JSON, and command/script files appear as read-only source; unsupported and truncated states are useful. | **PENDING** |
| Preview continuity | Rapid file switches cannot display an older response; Close restores the working context; Slide, Notes, Story, and other drafts survive. | **PENDING** |
| Preview keyboard ownership | Text selection/copy, arrows, Delete, Undo, paste, and native Edit commands inside Preview do not edit the Slide. Global save/help/focus behavior remains intentional. | **PENDING** |
| Preview access limits | Synthetic traversal, absolute paths, alternate streams, links, binary disguises, excessive sizes/dimensions, missing files, and changed image revisions are rejected or explained. | **PENDING** |
| Captured title style | Explicit reference selection freezes the shown style and preview; later reference edits require Refresh reference style; applying affects only the chosen title. | **PENDING** |
| Visible text baseline | Capture uses a supported, consistent visible inline baseline; conflicting/mixed reference styles are explained; font/size changes take effect instead of remaining hidden by inline CSS. | **PENDING** |
| Target protection and Undo | A stale target revision rejects the layout edit; wording, semantic emphasis, figures, and unrelated objects remain; one Undo restores the target. | **PENDING** |
| Font presets and custom input | Document, open-source, generic, and custom choices are usable without rewriting unrelated existing font settings. | **PENDING** |
| Local font access | Check local fonts starts explicitly; available, loaded, generic, missing, denied, unsupported, and failed states are honest. | **PENDING** |
| Export and reopen | Synthetic Main Slides/Presentation outputs follow the saved order; the actual candidate reopens the Project and displays the expected result. | **PENDING** |

Quick Layout validates the edited target through its existing revision-aware writer path. A captured reference's source revision is provenance, not a cross-page source-read CAS guarantee. Do not add an acceptance claim that the application locks or atomically rechecks the reference page while applying its captured values.

## Visual review

**PENDING.** Record the actual synthetic screens reviewed at ordinary and smaller window sizes. Check readable controls, Section covers and repair notices, file-preview sizing, visible text baselines, and font samples. Automated selectors and stored-property assertions are not substitutes for inspecting the rendered result.

No private slide screenshots, research figures, source text, or thumbnails may be attached to the repository evidence. Generic UI evidence must also omit private recent-file lists, titles, paths, and account details.

## Privacy review and its limits

Current-tree legacy identifiers and personal local-path references were replaced with generic descriptions. Identifying per-page validation details were reduced to truthful aggregate summaries; private detailed receipts remain outside the repository.

The inspected published Git objects did **not** contain a full private research deck or private research media. This is a bounded finding about the objects scanned, not a guarantee about every remote cache, issue, attachment, or external copy. Historical identifier, path, per-page hash, and object-identifier traces still exist in earlier reachable commits or tags. Cleaning the current tree does not remove them.

History rewriting is not authorized for this milestone and has not been performed as part of this cleanup. A separate, explicitly scoped history action is required before any public-release/visibility decision. This draft records the issue without reproducing the sensitive values.

| Publication privacy gate | Status |
| --- | --- |
| Initial current-tree cleanup | Completed in the source mirror; final staged-tree recheck remains **PENDING** |
| Inspected published-object findings | Recorded with the limits above |
| Private Project/media exclusion from final staging and package | **PENDING final inspection** |
| Historical trace removal | Not performed; separate action required before public release |

## Installation and publication receipts

**Installation: PENDING.** Record normal closure/save handling, retained previous application package, accepted-to-installed binary comparison, shortcut targets, installed launch/runtime identity, and aggregate private-document preservation results. Keep private filenames and inventories in local receipts. Replacing the application must not restore, overwrite, or roll back the user's documents.

**Remote publication: PENDING.** Record the actual editor milestone synchronization and independently verified refs after it succeeds. Publish scoped editor source and approved generic evidence only. Do not push upstream, publish npm, rewrite history, or change repository visibility under this release task.

## Failures, corrections, and final disposition

The first development-host UI attempt completed its first five groups, then stopped in group six on a harness assertion that treated the stored Section member cache as authoritative immediately after adding a Slide. The release lead observed the synthetic Section displaying three resolved members with its cover identity retained. Automatic Section membership is resolved from current Main order; its compatibility cache need not be rewritten by each page-add operation.

The harness assertion was corrected to inspect resolved membership through the story-briefing result. No runtime fix or weakened membership assertion was made for this failure. It does not establish a Section runtime defect. A second complete 19-group development UI run was underway when this draft was updated; its result is **PENDING**. Development-host results must remain separate from actual packaged and installed acceptance.

**Final disposition: PENDING.** The release lead must attach sanitized receipts, record subsequent attempts and corrections, enter unresolved limitations, and make the final acceptance decision. Do not mark the release accepted while required gates above remain pending.
