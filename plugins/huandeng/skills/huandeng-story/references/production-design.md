# Deliberate presentation design

Read this when creating a deck, substantially redesigning it, or making a product introduction. Read the Project AGENTS.md and actual references first.

## Audit → Spec → Frame → Implement → Validate → Release

Audit the story, assets and rendered pages. Specify the audience and sequence. Frame one representative content page and one section divider using concrete geometry and type sizes, then inspect before expanding. Implement through transactions. Validate a contact sheet, full-size pages and exports. Release a useful named milestone and the whole Project folder.

For code work, Frame can define types, module boundaries and a small runnable scaffold. It does not replace the audit or product test.

## Project policy

Keep the selected root AGENTS.md as the only discovered policy. Record audience/purpose/takeaway, language, reference page IDs, what to reuse, page roles, margins, type scale, default background and intentional exceptions, original figures to preserve, screenshot locale and delivery formats. Do not create another policy file and assume it is enforced. The model reads policy; the writer validates operations; actual rendered inspection assesses the result.

## Bilingual type scale

Starting ranges at 960×540; multiply by canvasWidth / 960 for another size. Existing approved layouts take precedence.

| Role | Chinese | English |
| --- | --- | --- |
| Content title | 26–28, medium/semibold | 28–32, medium/semibold |
| Subhead | 19–20 | 20–22 |
| Body | 17–18, regular | 18–20, regular |
| Caption / source | 12–14 | 12–14 |
| Section title | 32–36 | 34–40 |

Use regular paragraphs with selective emphasis, not long entirely bold blocks. Do not inflate short Chinese phrases. Rewrite and reflow English rather than copying Chinese coordinates. When space is insufficient, reduce wording, split the evidence or change the composition. Original scientific labels are evidence; do not mechanically resize or reconstruct them to match body defaults.

## Background and rhythm

Choose one ordinary-page background, normally white. Record a deliberate exception in designIntent.backgroundException with a short explanation. Vary evidence scale and emphasis instead of arbitrary page colors.

A Section is organization; it creates no divider. When requested, insert an actual title-only slide and anchor the Section to it. No footer, page number, subtitle, badge or icon. Set designIntent.pageRole to section and the text object's role to title. Use cover/content roles on other pages.

Composition follows purpose: comparable evidence aligns; one task screenshot needs room; a quiet idea page can be text only; a process needs meaningful order. Avoid repeating three rounded cards across every page.

## Review

Use huandeng_design_audit when advertised, or CLI quality. Sizes normalize to 960 width, raster sampling targets a 1920-wide output. Enable divider/background checks only when requested. Flags are advisory and do not replace visual judgment.

Keep exact operation IDs and review saved before/after. Render all affected pages. For a deck, inspect a contact sheet then every page at presentation size. Fix hierarchy, line breaks, image readability and unjustified repetition. Notes hold spoken context and transitions.

    huandeng --entry /project/deck.pptd quality --language zh-CN --background '#FFFFFF' --require-section-dividers
    huandeng --entry /project/deck.pptd quality --language en --max-title 34 --max-body 22 --presentation public-talk

A clean report does not establish image provenance, rhythm or Office output. Inspect these separately, then save the complete Project and final PDF/PPTX.
