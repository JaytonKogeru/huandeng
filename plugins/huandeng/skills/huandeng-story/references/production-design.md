# Deliberate presentation design

The canonical anti-pattern and positive standard is the generated [Editorial Standard](editorial-standard.md), sourced only from `packages/core/src/pptd/editorial-standard.json`. This reference explains implementation techniques rather than defining a competing global policy.

Read this when creating a deck, substantially redesigning it, or making a product introduction. Read the Project AGENTS.md and actual references first.

## Audit → Spec → Implement → Validate → Release

Audit the author's complete account, explicit corrections, relevant history, assets and rendered pages. Spec organizes the audience, causal argument, evidence, preservation inventory and intended visual direction. Include a small representative composition plan (Frame) within Spec: for example a product demonstration, a concept diagram or a data comparison, plus any requested title-only divider. Implement through transactions, rendering these representative pages first and inspecting geometry, type, color, imagery and rhythm before expanding. Validate the actual argument and visual work, then the necessary technical behavior and exports. Release a useful named milestone and the whole Project folder after the design is ready. Keep these stages proportionate; a focused edit does not require a new deck or an elaborate release archive.

For code work, the Spec may include types, module boundaries and a small scaffold plan. It does not replace the audit or product test.

## Establish the presentation's job

Start with the audience, what they need to understand or do, and the evidence that can teach it. The author's account is reasoning material: infer the motivation, priorities and useful distinctions, then organize the explanation. Do not treat the spoken order, every anecdote or a cause-and-effect story arc as a compulsory slide sequence. Correct weak transitions and add verified details that the audience needs. Preserve the author's meaning without merely illustrating a transcript.

For a product introduction, the sequence must make clear what the tool is, how its parts work together, how to perform a representative task, and why the design helps that task. Show a usable route from opening a project to editing, review, reuse and delivery where relevant. A feature earns space through audience usefulness as well as its connection to the founding story. Neither an exhaustive inventory nor an origin story alone meets this job. If the brief is story-driven, embed demonstrations at the point where the story creates the need and return to the argument afterwards. Adding a tutorial is not authorization to replace that story with an operation sequence.

Before layout, write a short argument and a topic map with each audience question, takeaway, evidence, practical action and transition. Keep a preservation inventory of valuable existing pages, icons, original figures, examples and acknowledgments. Reuse them deliberately; a rewrite does not authorize silently dropping useful content. Do not invent incidents, metrics, research findings or consensus from an anecdote.

Record overall purpose, audience and takeaway in the existing Main/Presentation Story fields. Give each page/local Story a purpose and explicit preservation constraints. Use Speaker Notes for the speakable explanation, rather than printing every narrative link on slides. Story is an alignment aid, not a requirement that every page narrate an episode.

Determine whether bilingual correspondence is requested. When it is, establish a semantic topic map covering substantive claims, demonstrations, user steps, qualifications and acknowledgments; titles, text lengths and page breaks may differ. When independent editions are requested, let each argument determine its grouping, pacing and page boundaries instead of imposing a translated page map. In either case, verified facts and necessary attribution remain accurate.

Read headings and notes in sequence, then separately test the presentation's job: can the audience explain the tool and perform the demonstrated task? Review missing functionality, pointless repetition and the first usable next step. Share verified facts and hard constraints across comparative client trials. When the user requests independent acquisition, each author must independently search, download, generate its own professional plots and capture its UI evidence; do not provide a shared prepared media pool. Keep acquisition provenance distinct from layout authorship. Independently obtaining the same public resource is compatible with independence; copying or re-encoding another author's asset is not.

## Project policy

Keep the selected root AGENTS.md as the only discovered policy. Record audience/purpose/takeaway, language, reference page IDs, what to reuse, page roles, margins, type scale, default background and intentional exceptions, original figures to preserve, screenshot locale and delivery formats. Do not create another policy file and assume it is enforced. Never rewrite the author's requirements or root AGENTS.md to fit an agent's plan. A policy change needs authorization from the task and a traceable user correction, not the agent's previous output. Keep quoted instructions separate from editorial inference. The model reads policy; the writer validates operations; actual rendered inspection assesses the result.

## Bilingual type scale

Starting ranges at 960×540; multiply by canvasWidth / 960 for another size. Existing approved layouts take precedence. These are adjustable starting points, not aesthetic acceptance thresholds. Set hierarchy from the slide's role, audience, viewing conditions and visual direction; a large lead statement or detailed reference page can need a different scale.

| Role | Chinese | English |
| --- | --- | --- |
| Content title | 26–28, medium/semibold | 28–32, medium/semibold |
| Subhead | 19–20 | 20–22 |
| Body | 17–18, regular | 18–20, regular |
| Caption / source | 12–14 | 12–14 |
| Section title | 32–36 | 34–40 |

Use regular paragraphs with selective emphasis, not long entirely bold blocks. Do not inflate short Chinese phrases. Rewrite and reflow English rather than copying Chinese coordinates. When space is insufficient, reduce wording, split the evidence or change the composition. Original scientific labels are evidence; do not mechanically resize or reconstruct them to match body defaults.

## Text and data objects

Use a native table for a real two-dimensional relationship: entities in rows, comparable attributes in columns. Do not simulate a table by aligning separate text boxes, rectangular cell shapes or hand-drawn rules. Keep an ordinary paragraph or bullet list in one rich-text object where practical, with internal emphasis and list formatting; split it only for a meaningful reading or interaction need. This makes later human edits manageable. Repeating a heading box, a description box and a separator for each ordinary list item is still fragmented prose even without cell borders. Read the editable object tree as well as the rendered image. Do not force a prose list into a native table merely to satisfy the object rule; choose a table only when the row/column relationship is real.

A multi-panel scientific comparison, aligned plots, labels attached to evidence and nodes in an explanatory diagram are different structures. Preserve them when their geometry expresses an actual comparison or relationship. Do not flatten useful evidence into prose or apply a blanket ban on panels, boxes or arrows.

## Background and rhythm

Choose a deliberate background and color system suited to the subject and references. It may use one base or related light, dark, colored and image treatments for distinct roles. Keep their relationship recognizable and check contrast, evidence fidelity and transitions across the deck. Use designIntent.backgroundException to explain an exception when the Project has explicitly requested a base-background check; do not impose a universal white-page rule.

A Section is organization; it creates no divider. If the author requests a title-only opener, insert that actual slide and anchor the Section to it; its title-only contract excludes watermarks, footers, numbers, subtitles, badges and icons. A general attribution request does not create an exception to an explicit title-only instruction. Other opener designs follow the Project's stated direction. Set designIntent.pageRole to section and the text object's role to title where appropriate. Use cover/content roles on other pages.

Composition follows purpose: comparable evidence aligns; one task screenshot needs room; a quiet idea page can be text only; a process needs meaningful order. Use images, plots, screenshots or other visual evidence as the main explanation when they communicate the point; they should not merely decorate large text. Compare like scales and frames, with clear changed and retained regions. UI teaching must establish where a detail belongs in the whole interface. Avoid repeating three rounded cards across every page.

## Review

Use huandeng_design_audit when advertised, or CLI quality. Sizes normalize to 960 width, raster sampling targets a 1920-wide output. Enable divider/background checks only when requested. Flags are advisory and do not replace visual judgment. Do not turn human-feeling or AI-feeling into a numeric score. The author's specific typographic, palette and diagram constraints belong to that Project, not a universal ban on a visual category.

Keep exact operation IDs and review saved before/after. Render all affected pages. For a deck, inspect a contact sheet then every page at presentation size. Fix hierarchy, line breaks, image readability and unjustified repetition. Also check the presentation's practical job, local/Main Story alignment, preservation inventory, bilingual topic correspondence when applicable, and whether the notes can be spoken in order. Ask which audience question each image answers and whether every claimed workflow step is actually shown or clearly explained. Keep personal observations attributed to the speaker and verified product claims tied to actual behavior. Structured access and zero warnings do not replace this review.

    huandeng --entry /project/deck.pptd quality --language zh-CN
    huandeng --entry /project/deck.pptd quality --language en --max-title 34 --max-body 22 --presentation public-talk

Use background or required-divider flags only for an explicit Project policy. A clean report does not establish image provenance, visual quality, rhythm or Office output. Inspect these separately, record the agent visual review honestly, and keep author acceptance separate until the author supplies it. Save the complete Project and final PDF/PPTX.
