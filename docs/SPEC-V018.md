# v0.18 — deliberate design and a complete public workflow

> Historical 0.18 record. The author rejected the introduction slides after this record. The current introduction/design contract is [INTRODUCTION-REWORK.md](INTRODUCTION-REWORK.md); current validation and handoff are in [INTRODUCTION-DELIVERY.md](INTRODUCTION-DELIVERY.md). This record retains its historical technical measurements and does not establish author acceptance. Editor 0.18.0 is unchanged; current AI guidance is plugin 0.18.2.

## Goal and process

Improve human and Agent authoring and demonstrate it with four complete public introductions: ChatGPT Chinese and English, an independent DeepSeek Harness Chinese trial, and an independent Claude Code English trial.

Use Audit → Spec → Frame → Implement → Validate → Release. Frame establishes page roles, representative geometry and API interfaces before full implementation. Validate actual rendered pages and the product workflow. Release one tested milestone.

## Product UI

Retain Normal / Browse / Outline / Sections / Notes page / History. Use restrained neutral surfaces, consistent typography and clear primary actions. Add a direct title-only section-divider action and a discoverable read-only Design checks entry. Preserve Project binding, stable identity, pins, save/conflict guards and history.

## Design contract

Keep Project-root AGENTS.md as the single automatically discovered human policy: audience, takeaway, language, page roles, approved references, margins, type scale, background, source constraints and intentional exceptions.

At 960×540, Chinese content title 26–28, body 17–18 regular, subhead 19–20 and section title 32–36; English title 28–32 and body 18–20. Scale with canvas width. Reflow by language; do not enlarge short Chinese headings or mechanically resize original scientific labels.

Use #FFFFFF for ordinary introduction pages. Record deliberate exceptions in designIntent. Section dividers contain only their title, with no footer, number or decoration. Avoid repetitive card grids and ornamental arrows.

The read-only design audit reports measured typography, background distribution, requested divider compliance and image sampling with explicit adjustable thresholds. Findings never edit or approve slides.

## Public presentations and assets

ChatGPT creates two complete 22-page language-specific editions with speaker notes. Cover the problem, folder/PPTD model, Main and Presentation Slides, Story, human editing, Agent edits, review/history, playback and delivery using actual product evidence.

DSH and CC receive the same public brief and asset library in separate Projects, without ChatGPT's completed deck. Preserve raw outputs and execution evidence. Assist genuine tool blockers; do not replace their visual choices with ChatGPT edits.

Capture the real Editor with public/synthetic content in both UI languages. Use task-focused crops at preferably 2× used dimensions; inspect at presentation size. Index source, version, locale, original dimensions, crop and intended use. Recapture poor originals; exclude private paths, accounts and research content.

Deliver complete movable PPTD folders and PDF/PPTX for each successful edition with clear authorship and comparison results.

## Workflow and release

Add a safe CLI init entry for a new empty Project directory; refuse nonempty targets and reuse the desktop initialization contract. Keep AGENTS.md accessible in context/briefing/preview. No second writer or policy database.

Use one repository-owned skill and runtime guide. Account/native packages retain transport differences; compare shared-file hashes after packaging and installation. Resolve duplicate ChatGPT entries without breaking native Claude/DSH or unrelated configuration.

Run focused unit, protocol, HTTP, type and formatting checks. Test real section/quality actions and layouts. Review all ChatGPT pages at contact-sheet and presentation size, obtain independent criticism, and fix observed defects. Inspect PDF and PowerPoint output. Verify installed Editor/plugin bytes and routing while preserving private Projects.

Save release notes and handoff, then publish one significant tested milestone to origin only. Preserve repository visibility; do not publish upstream or npm.
