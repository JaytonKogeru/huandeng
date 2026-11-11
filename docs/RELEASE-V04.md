# HUANDENG Editor v0.4.0 — Release notes

Release date: 2026-11-07 (UTC). Installed and verified on THUG at 10:08 UTC. Milestone tag: `editor-v0.4.0`.

Windows runtime source revision: `c2fede5f45aa7a41e853304f9907c2d17e6bf8a2`. The release tag also includes the final audit and acceptance documents; it does not identify a different executable build.

## Delivered core

HUANDENG remains an Electron / React editor whose authoritative document is a PPTD manifest, independent `.page` files and local media. This release completes the scientific static-editing core and the shared-project narrative workflow. The original [SPEC](SPEC.md) is the Master Product Specification; [v0.4](SPEC-V04.md) is an incremental contract. The [original-SPEC audit](AUDIT-V04.md) and [PowerPoint matrix](POWERPOINT-COMPARISON.md) retain the exact scope and remaining differences.

| Capability | Resulting behavior |
| --- | --- |
| Main Slides | Exactly one canonical page and media library per project directory |
| Sections | One chapter layer with its own page order and Story |
| Presentation Slides | Multiple ordered views referring to sections or individual Main pages; repeated occurrences are supported |
| Live / pinned references | Live pages follow Main; a named checkpoint freezes content, assets and theme; broken references block delivery |
| Story | Main, Section and Presentation goals, audience and takeaway, plus per-page evidence and design intent |
| Speaker notes | Per-occurrence notes can override Main notes, including an intentionally empty note |
| Page identity | UUID and legacy short code retained; stable S1, S2 aliases simplify daily use |
| Page versions | Autosave and Undo create no named versions; explicit recording creates portable checkpoints |
| Scientific editing | 13 ECharts chart families, TSV/CSV data editing, merged tables, KaTeX/MathML, local icons, 21 shape presets and nested groups |
| Image import | File choice, drag/drop and image paste preserve source bytes in content-addressed local storage |
| Export | Frozen PNG/PDF; supported native PPTX text, shapes, tables, OMML, charts and groups; explicit object-level fallback reports |
| Draft safety | Project, Story and chart drafts survive navigation and retain conflicts; incomplete drafts block misleading export/leave operations |
| Technical QA | Locatable missing assets, invalid bounds/crops and rotated overflow warnings |

## Project and page-version decisions

Checkpoints live in `.huandeng/checkpoints/`, with immutable local assets in `media/.huandeng-versions/`. They travel with the project and need no Git. Creation and restoration use revision checks and idempotency. Restore changes the target page and its metadata, preserves other pages and current shared assets, and does not automatically create another named version.

Sections are dynamic references until expanded into individual Presentation items. Expanding fixes membership and order; choosing a named version separately fixes content. Presentation order, Story and notes do not become a second canonical deck. Flat Sections avoid adding equivalent Part / Section / Chapter hierarchies before a concrete need exists.

## Verification and installation

The accepted package was built from committed, clean source at `2026-11-07T10:03:16.5150028Z`. The actual packaged EXE passed six desktop workflows, then the same package was installed at `<editor-checkout>/dist/HUANDENG-win32-x64/HUANDENG Editor.exe`. A separate launch from this formal path verified the document service, a temporary project, the About version `0.4.0`, and no renderer errors. Desktop and Start Menu shortcuts point to the formal path. The prior installed build remains in `<editor-checkout>/.verification/installed-v03-backup-20261107`.

| Gate | Observed result | Evidence |
| --- | --- | --- |
| Core regression | Linux: 732 tests across 56 files; Windows: 731 passed and one platform-conditional skip; core TypeScript and builds passed | [Code validation](evidence/ui-v04/code-validation.json) |
| Packaged desktop | 6/6: branded window, external MCP editing and Story, page history restore, project tree, restart, native New/Open | [Desktop](evidence/ui-v04/desktop-acceptance.json) |
| Project organization | 11/11: two Sections and Presentations, repeated pages, live and pinned versions, notes, playback/export order, missing references and retained drafts | [Project](evidence/ui-v04/project-acceptance.json) |
| Scientific UI | 22/22: all 13 chart families, data edits/reload/conflicts, tables, LaTeX/MathML, three icon sets, groups, image import and export | [Science](evidence/ui-v04/science-acceptance.json) |
| Native Office objects | Five synthetic slides; six native charts with editable workbooks, one merged table, one group, five OMML formulas retained after editing and save/reopen | [Office](evidence/native-v04/office-acceptance.json) |
| Transparent fallback and frozen versions | Both current and pinned occurrences preserve their backgrounds/themes; short text boxes, paragraph spacing and thick strokes remain complete; physical PDF count is two | [Background and overflow](evidence/ui-v04/background-export-acceptance.json) |
| Complete scientific deck | 80 pages and 1,451 content objects; 80-page PDF and PPTX; all 80 DOM pages validated; named checkpoint restored with 79 sibling pages unchanged | [Real project](evidence/ui-v04/real-project-acceptance.json) |
| Complete Office rendering | Final PPTX opened read-only with repair disabled; all 80 PowerPoint PNGs visually reviewed; all 100 fallback images mapped and passed transparent-edge checks | [Real Office](evidence/ui-v04/real-project-office-acceptance.json) |
| Formal installation | Relocated package is self-contained, formal EXE opens, About version and both shortcuts verified; existing modified fixture preserved | [Installation](evidence/ui-v04/install-acceptance.json) |

Receipts preserve the source actually tested. Project UI validation used the recorded wave-two transfer. Scientific UI validation used `7c3f04c` and the recorded verification-only timing adjustments. Subsequent `c2fede5` changes address object-image overflow and are covered by the expanded fallback regression, the complete real-deck/Office run and the final packaged desktop run. Windows core tests were serialized to avoid test-fixture writer-lock contention; the sole skip concerns POSIX executable permissions. Final Linux checks use `c2fede5`.

The real project contains 1,089 native editable content objects, 262 original asset images, and 100 object-image fallbacks (97 complex text objects and three special line paths). Its charts were already pictures; it does not establish native chart or formula coverage. The separate synthetic Office fixture establishes those capabilities. All 970 files read from the original research project retained their SHA-256 hashes. No research content or screenshots are committed to Git.

Final PDF SHA-256: retained in the private local verification receipt.

Final PPTX SHA-256: retained in the private local verification receipt.

Actual validation found and fixed cold scientific-component reloads, a blank trailing PDF page, native chart zero values and Office XML compatibility, formula spacing and accents, background contamination of fallback images, and clipped text on two real slides. The final artifact was re-exported and rechecked after these fixes.

## PowerPoint scope

Native charts cover bar, line, area, pie/doughnut, scatter and bubble, plus supported combinations and embedded numerical data. The other seven rendered chart families use an object image in PPTX and remain data-editable in PPTD. Original MathML and unsupported formula constructs also use reported images. Continuous and nested groups retain native PowerPoint groups; interleaved stacking keeps independently editable children in the correct z-order and reports the lost group relationship.

PowerPoint renders its own native chart layout, which can differ from ECharts. PDF/PNG preserve the browser appearance. Unsupported chart filters, dual axes and logarithmic/time axes receive explicit diagnostics; scientific meaning is not silently approximated. Statistical error bars, trendlines and the full legacy styling model are not claimed.

Full PPTX import/round-trip, Slide Master/SmartArt/OLE, audio/video and animation timelines, full dual-screen rehearsal, cloud coauthoring and arbitrary registered React scientific components remain outside this static core. Technical QA does not yet prove installed-font availability or universal text-overflow detection.

## Start using the release

Open the **HUANDENG Editor** desktop or Start Menu shortcut. The usage guides are [Projects](PROJECTS.md), [Scientific objects](SCIENTIFIC-OBJECTS.md), and [Story](STORY.md). Operational proof and engineering continuity are in [HANDOFF-V04](HANDOFF-V04.md).

Product version `0.4.0` is separate from inherited npm workspace versions. No npm package is published. Only the private HUANDENG origin receives the accepted source milestone and annotated editor tag; OpenSlide upstream and the user's existing modified fixture remain unchanged.
