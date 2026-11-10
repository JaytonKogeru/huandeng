# Technical facts for the founder's story

Checked against the HUANDENG source and primary references on 2026-11-11. This is a fact sheet, not a prescribed outline. Each author chooses their narrative and design independently. The founder's observations and motivations are preserved in USER-STORY.zh-CN.md.

## Format and code provenance

- PowerPoint's `.pptx` is an Open XML package. It already separates slides, media, notes and other parts; each slide has its own XML part. Do not claim PPTX has no page structure or is inherently uneditable by agents. HUANDENG's choice is to expose a working project directory and a shared page-oriented editing service.
- In HUANDENG, `deck.pptd` is the manifest/entry, `pages/*.page` carries editable page content, `media/` carries assets, and `.huandeng/` carries project identity, Story, composition and history. Carry the complete directory when moving a project. It is not merely a renamed or unpacked PPTX; formats and models differ.
- The relevant upstream is **open-slide/open-slide**, not unrelated products also named OpenSlides. Its pages are React components. HUANDENG retains that code foundation and uses React/Electron for its interface with a PPTD document model. Do not describe PPTX itself as React code.
- The founder encountered the PPTD approach in the Kimi Slides ecosystem. The public unofficial open-kimi-ppt-skill project documents that association; its original repository is now cleared. This supports the inspiration story, not a verified claim that Kimi was the first inventor of a universal standard. Do not claim Kimi affiliation or endorsement.
- **OpenPPTD** and **PPTD** are different names: the actual OpenPPTD code reused here is the MathML-to-OMML formula conversion modules pinned in the vendored NOTICE. It is not the source of HUANDENG's whole document model. PptxGenJS contributes PPTX generation. Preserve specific attribution.

## User-facing behavior

- **Position** is the page's position in the current collection and can change. **Slide ID** is the stable four-character readable code; internal references use the permanent page UUID. Explain the readable ID beside per-page history; a UUID lecture is unnecessary.
- Operation history records edits. Explicit named page versions preserve meaningful stages for review/restore or pinned uses. This is HUANDENG's page-history system, not a claim that every page is a separate Git repository or every keystroke creates a checkpoint.
- Main Slides holds the canonical pages. Presentation Slides selects/reorders live references, with optional named-version pins. Notes may be specific to one occurrence. Reusing a page does not require copying the whole deck.
- Story records human purpose and constraints. It helps an agent understand an edit; it does not guarantee obedience, automatically certify aesthetics, or constitute author approval.
- Structured objects enable precise targeting, revision checks, bounds checks and diffs. Visual inspection still matters for composition, figure readability and rhythm. A screenshot is a useful review surface, not the whole editable model.
- The founder's account of AI-looking slides and defensive copies is personal experience and a design hypothesis. Avoid invented benchmarks, model rankings, universal research claims or product-launch superiority slogans.

## Sources

- Microsoft, PresentationML structure: https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document
- Microsoft, opening a presentation package: https://support.microsoft.com/en-us/powerpoint/extract-files-or-objects-from-a-powerpoint-file
- OpenSlide's own documentation: https://open-slide.dev/docs ; https://github.com/open-slide/open-slide
- Unofficial Kimi ecosystem project and its present status: https://github.com/Binaryify/open-kimi-ppt-skill
- HUANDENG repository: `docs/UPSTREAM_README.md`, `docs/PROJECTS.md`, `docs/STORY.md`, `docs/POWERPOINT-COMPARISON.md`, `packages/core/src/pptd/vendor/open-pptd/NOTICE.md`, `packages/desktop/NOTICE.md`.
- The optional public DNA worked example uses RCSB PDB **1BNA** coordinates, https://www.rcsb.org/structure/1BNA ; Drew et al., PNAS (1981), https://doi.org/10.1073/pnas.78.4.2179 . Distances are C1′–C1′ values at twelve paired positions within one structure, not independent replicates or hydrogen-bond lengths. The reproducible source files are in `../assets/science/`.
