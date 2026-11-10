# Introduction rework: delivery and review

Date: 2026-11-10. Release identity: **plugin-v0.18.2**. Editor runtime: **0.18.0**, unchanged.

The author rejected the previous introduction delivery. This milestone replaces the four introduction projects, corrects the AI authoring guidance and consolidates the local workspace. It is a review candidate, not a record of author acceptance. The independent native trials retain their actual limitations.

[Four editions and downloads](../examples/huandeng-introduction/README.md) · [Contract](INTRODUCTION-REWORK.md) · [Visual audit](INTRODUCTION-VISUAL-AUDIT.md) · [Workspace organization](WORKSPACE-ORGANIZATION.md)

## What was corrected

The previous specification converted “reduce generic AI styling” into universal white backgrounds, a predetermined page count and restrictions on useful marks and visual devices. That was a requirements error. The original demo's product identity, real client marks, gray-green structural pages, scientific images and varied composition were relevant requirements.

The new root editions use the original HUANDENG mark and the actual client marks. Paper, sage and sand backgrounds correspond to evidence, structure and source/folder pages. Images have a task: show the specimen, explain its measurement, show a real edited state or make actual page reuse visible. The design does not use emptiness or a ban on icons as a quality metric.

The audit-to-delivery chain is observable:

| Stage | Decision or evidence |
| --- | --- |
| Audit | Read the nominated original 19-page demo, its project guidance, the prior contract and the FSS/ArgFrame design principles; distinguish inspected sources from uninspected historical material |
| Spec | Restore identity, meaningful backgrounds, scientific evidence, title-only Sections, localized screenshots and independent native authorship |
| Frame | Compare cover, science and architecture frames; reject the first misleading serial plugin diagram and replace it with clients/connector/shared writer/human editing |
| Implement | Edit through the selected shared writer with revisions and preview/apply; preserve the original source material and exact operation records |
| Validate | Read back project structure and source values, inspect every page, export, then render all four PPTX files in actual PowerPoint |
| Release | Keep four canonical projects, ship complete portable sources and static exports, install the corrected plugin, and preserve honest native-trial status |

## Four current editions

| Edition | Main / full | Short presentation | Authorship and status |
| --- | ---: | ---: | --- |
| ChatGPT Chinese | 19 / 19 | 7 | Root-authored; peer and Office review completed; awaits author review |
| ChatGPT English | 19 / 19 | 7 | Root-authored; peer and Office review completed; awaits author review |
| DeepSeek Harness Chinese | 16 / 16 | 8 | Native task completed; no cosmetic rewrite; known findings retained |
| Claude Code English | 20 / 20 | 9 | Native-authored pages; account quota interrupted final review; limited coordinator metadata completion and export |

The canonical location is `examples/huandeng-introduction/{chatgpt-zh,chatgpt-en,deepseek-zh,claude-en}`. Open each project's `deck.pptd`. Git and the project's named versions preserve history; there is no new dated parallel introduction directory.

The root editions contain three actual title-only Section pages at Main positions 3, 7 and 12. Their seven-page brief changes the order and pins the scientific page to a real named version. The source projects, not just the slides describing them, contain those arrangements.

## One scientific example carried through the work

The root editions use the public [PDB 1BNA structure](https://www.rcsb.org/structure/1BNA). Original coordinates, calculation code, CSV, structure views and source attribution travel with every project under `sources/science/`. [Source package and method](../examples/huandeng-introduction/assets/science/README.md).

The structure image marks the C1′ atoms A7/B18. Their measured distance, 10.2329 Å, is the seventh point in the twelve-position series and appears in the selected-value table and equation. The values are positions within one structure, not experimental replicates, hydrogen-bond lengths or a product benchmark.

Each root PPTX contains **two native editable charts, four native tables and one Office equation**. Scientific structure views, real UI captures and product/client marks remain images. Functional icons use documented image fallbacks in PowerPoint. Export reports describe these boundaries.

A real saved copy edit changes only the scientific page's title and context. The saved operation evidence records both exact strings; the figure bytes, all twelve measurements and the original chart axes were unchanged by that transaction. A later separately recorded layout refinement changes the live chart axes and removes an auxiliary focus series to improve native Office output. It is not attributed to the earlier copy edit. The brief's pinned checkpoint intentionally preserves the earlier state.

Current UI captures show the actual 19-page project and use Chinese or English interface labels to match the edition. Full workspace captures use DPR 3; small native menu crops keep their actual source pixels. Each root project's `evidence/assets.json` records imports, dimensions, captures and uses.

## Independent native trials

Both native authors received the source assets and the corrected 0.18.1 design guidance, with freedom to choose their own explanation, sequence and length. The final 0.18.2 package has exactly the same three design-guide hashes; its later README correction removes the remaining contradictory white-background/fixed-frame example. Do not relabel the actual trial version as 0.18.2.

### DeepSeek Harness Chinese

DeepSeek completed its native task in about 18.6 minutes. Asset preloading through the supported project route resolved the previously observed shell-write limitation. The coordinator did not rewrite its pages, impose the root narrative or request aesthetic rework.

The 16-page result restores recognizable identity, scientific imagery, green structural pages and three pure-title pauses. It still has concrete weaknesses:

- Page 15 overstates OpenPPTD as the PPTD document foundation. The actual reused code is the MathML-to-OMML formula conversion module; the original statement remains visible as a trial defect.
- Page 4 has a Chinese comma at a line start in PowerPoint; PDF wrapping differs.
- Page 6 introduces several identity terms at once, and page 13's interface captures are small.
- The scientific example is not carried through the later generic text-edit demonstration. Its distance chart is an image, not a native chart.

### Claude Code English

Claude independently authored 20 pages before its native account reached the five-hour usage limit. The native process did not complete. At interruption, its existing PDF contained only 18 pages.

The coordinator exported the saved 20-page source and applied only the exact presentation plan already present in Claude's own script: full 20 pages and a nine-page lab-meeting sequence. The 41 page-file hashes and Main order remained unchanged. Four occurrence notes and a completion named version were not supplied by an exact native plan and were left unfinished. Pages 10 and 18 describe related features that are not fully demonstrated in this submitted project.

The original quota receipt, old project metadata, page hashes and then-current 18-page PDF remain under `claude-en/evidence/native-submission/`, clearly identified as historical evidence. They are not another active project. The current exports both contain 20 pages.

After the quota reset, the same Claude session completed a read-only verification turn. It confirmed the current source/export revisions and wrote no pages or exports. This is recorded separately as verificationRecovery; the first native turn remains incomplete. It also identified missing Story fields on pages 10 and 18 and an earlier command string in the small closing-page thumbnail. The inherited 21-page README and media index were preserved byte for byte and replaced with coordinator-labelled current indexes; the pages remain unchanged.

Claude's authored result retains a PowerPoint axis-label collision on page 5. Its twelve data values are intact and its PDF is readable. The later editing example also switches away from the scientific page. These are trial findings; they were not silently repaired or represented as completed native review.

[Native trial evidence](evidence/introduction-rework/native-trials.json) records actual authorship, coordinator actions and source hashes.

## Verification and its limits

[Office evidence](evidence/introduction-rework/office-qa.json) binds the exact final PDFs/PPTX files and preview images to their SHA-256 hashes.

- All **74 pages** across 19 + 19 + 16 + 20 were rendered by PowerPoint 16.0 at 1920 × 1080 from read-only copies. Source files and input copies remained unchanged.
- All four page sequences received contact-sheet inspection. The final root scientific layouts on pages 2 and 6 were also checked at full size for axes, table clipping and equation position.
- Final native-source counts, real presentation membership, three root Sections, position mapping and the pinned named version were checked against the document model.
- Every portable ZIP passed CRC and per-entry hash verification. Main pages, retained pages, image references and named-version assets resolve inside the complete project.
- Every portable project carries 14 science files, 12 brand files and eight original-reference files. Page resources, checkpoint assets and current AGENTS resource paths resolve without a sibling assets directory. Credits notes retain optional repository-relative provenance references; portable notices and sources are included under notices/ and sources/.
- Current native AGENTS resource paths were adjusted only for portability; the exact original trial guidance was saved first as `evidence/trial-authoring-guidance.md`.
- Plugin configuration/discovery tests passed 8/8. Native client installation and doctor receipts verify the shipped plugin. The final formatting/source-scope gate is recorded with the release manifest.

These checks demonstrate defined properties of the delivered files. They do not turn the retained native defects into a pass, prove native Claude completion or establish author acceptance.

## Plugin and workspace

Plugin **0.18.2** is the maintained authoring package. The Story, scientific-design and production-design guides prioritize author requirements, source evidence and meaningful composition. A diagram, a useful icon, a dense scientific panel or an intentional background is allowed when it serves the explanation. Diagnostics do not dictate a universal visual style.

The existing account plugin was updated in place. In this Windows host, both the account-backed HUANDENG and the native local HUANDENG were installed; the duplicate account-backed installation was uninstalled through the actual host UI. The owned account record remains available. The host's installed list now has one HUANDENG entry, the native local 0.18.2 plugin. Native Claude/DSH installations and the working workstation channel were preserved.

[Workspace organization](WORKSPACE-ORGANIZATION.md) records the actual retained directories, removed redundant worktrees/packages and protected active research writers. Remaining private or modified working directories are explained rather than deleted to produce a misleadingly clean listing.

The Editor source, installed 0.18.0 binary and existing Editor tag remain unchanged. This release contains plugin/example work only. Repository visibility stays private, and no upstream or npm publication is part of this milestone.

## Release contents and continuation

The release contains four portable project ZIPs, four PDFs, four PPTX files, a plugin ZIP, a native-marketplace ZIP, a combined manifest and checksums. Marketplace paths are relative; private account bindings and machine-specific launch configuration are excluded.

[Release](https://github.com/JaytonKogeru/huandeng/releases/tag/plugin-v0.18.2) · [Artifact manifest](evidence/introduction-rework/release-manifest.json) · [Checksums](evidence/introduction-rework/SHA256SUMS.txt).

Use the four canonical projects for continued review. Keep the user's original nominated demo unchanged. Do not reinstate white-background or fixed-outline requirements from superseded 0.18 documents, recreate dated working copies, overwrite unrelated modified fixtures or report agent review as author approval.
