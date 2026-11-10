# Deliberate presentation design

Read this when creating a deck, substantially redesigning it, or making a product introduction. Read the Project AGENTS.md and actual references first.

## Audit → Spec → Frame → Implement → Validate → Release

Audit the story, assets and rendered pages. Specify the audience, evidence and intended visual direction. Frame a small set of representative pages, usually two or three, that exposes this deck's main visual decisions: for example a product demonstration, a concept diagram or a data comparison. Choose their roles from the material; include a divider only when the deck calls for one. Inspect concrete geometry, type, color, imagery and rhythm before expanding. Implement through transactions. Validate a contact sheet, full-size pages and exports. Release a useful named milestone and the whole Project folder.

For code work, Frame can define types, module boundaries and a small runnable scaffold. It does not replace the audit or product test.

## Project policy

Keep the selected root AGENTS.md as the only discovered policy. Record audience/purpose/takeaway, language, reference page IDs, what to reuse, page roles, margins, type scale, default background and intentional exceptions, original figures to preserve, screenshot locale and delivery formats. Do not create another policy file and assume it is enforced. The model reads policy; the writer validates operations; actual rendered inspection assesses the result.

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

## Background and rhythm

Choose a deliberate background and color system suited to the subject and references. It may use one base or related light, dark, colored and image treatments for distinct roles. Keep their relationship recognizable and check contrast, evidence fidelity and transitions across the deck. Use designIntent.backgroundException to explain an exception when the Project has explicitly requested a base-background check; do not impose a universal white-page rule.

A Section is organization; it creates no divider. If the author requests a title-only opener, insert that actual slide and anchor the Section to it; its title-only contract excludes footers, numbers, subtitles, badges and icons. Other opener designs follow the Project's stated direction. Set designIntent.pageRole to section and the text object's role to title where appropriate. Use cover/content roles on other pages.

Composition follows purpose: comparable evidence aligns; one task screenshot needs room; a quiet idea page can be text only; a process needs meaningful order. Avoid repeating three rounded cards across every page.

## Review

Use huandeng_design_audit when advertised, or CLI quality. Sizes normalize to 960 width, raster sampling targets a 1920-wide output. Enable divider/background checks only when requested. Flags are advisory and do not replace visual judgment.

Keep exact operation IDs and review saved before/after. Render all affected pages. For a deck, inspect a contact sheet then every page at presentation size. Fix hierarchy, line breaks, image readability and unjustified repetition. Notes hold spoken context and transitions.

    huandeng --entry /project/deck.pptd quality --language zh-CN
    huandeng --entry /project/deck.pptd quality --language en --max-title 34 --max-body 22 --presentation public-talk

Use background or required-divider flags only for an explicit Project policy. A clean report does not establish image provenance, visual quality, rhythm or Office output. Inspect these separately, record the agent visual review honestly, and keep author acceptance separate until the author supplies it. Save the complete Project and final PDF/PPTX.
