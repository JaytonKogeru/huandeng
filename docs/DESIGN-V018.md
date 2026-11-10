# Deliberate slide design with HUANDENG

This release addresses an observed authoring problem: a mechanically valid deck can still have heavy text, inconsistent backgrounds, missing divider pages and screenshots that cannot be read at presentation size. The remedy needs to reach the project, agent guidance, runtime and Editor together.

## Evidence from the introduction audit

The supplied 19-page introduction used ordinary titles around 30 and body text around 20–24 on a 960×540 canvas. The stronger source of visual pressure was the repeated bold treatment of whole text blocks. Several ordinary pages changed from white to subtly different gray-green backgrounds without a recorded reason. No page served as a title-only Section divider. One menu capture supplied only 192×119 pixels while occupying about 400×248 canvas units.

The revised introduction uses regular text, an explicit type hierarchy, one white background, three real divider pages and audience-language captures from the running Editor. It also includes a short Presentation made from references to the same Main pages.

## References and the decisions they informed

[Recent](https://recent.design/) was useful as a visual reference collection. The relevant lessons were a clear focal point, a small number of typographic roles and enough space for the actual product or content to lead. The Editor does not need ornamental effects borrowed from marketing websites.

[Impeccable's quieter guidance](https://impeccable.style/docs/quieter/) identifies competing accents, supporting controls that are too heavy and unnecessary borders as sources of visual pressure. [Its typeset guidance](https://impeccable.style/docs/typeset/) treats size, weight, spacing and repeated roles as one system. These principles informed the neutral document surface, quieter navigation, restrained green selection state and regular slide text. They are design references, not copied interface assets or code.

## Where the working agreement lives

| Layer | Responsibility |
| --- | --- |
| Project folder and exact root `AGENTS.md` | Audience, purpose, approved visual references, language and project preferences. This remains the single editable authoring policy. |
| PPTD objects and page identity | Editable content, geometry, assets, stable identity and revisions. Position is derived from a collection. |
| Story and `designIntent` | Page purpose, evidence to preserve, current requested change and explicit visual exceptions. |
| Plugin and client adapters | Read the project context, use the selected shared writer and follow the authoring sequence. Keep common guidance identical across distributions. |
| Connector, MCP and CLI | Preview an exact proposed change, save it with revision preconditions, and inspect the corresponding receipt. |
| Editor | Let the author see the page, structure, Story, history and the effect of a change. |
| Design audit and visual review | Find measurable inconsistencies, then judge the actual composition and exported output. |

Instructions cannot force every model to obey. Transaction preconditions protect identity and concurrent edits; they do not establish good typography. The design audit is advisory and does not silently restyle a page or certify aesthetic quality. A concrete reference page and actual visual review remain necessary.

## Audit → Spec → Frame → Implement → Validate → Release

1. **Audit:** inspect the actual project and screenshots, read earlier audits, identify already completed features, and state the audience's task. Separate content defects from tool defects.
2. **Spec:** write the page sequence, evidence needs, type hierarchy, background rule, divider requirements and acceptance criteria. Specify which data or objects must remain intact.
3. **Frame:** create an editable content page and requested divider before expanding. For a product change, also establish the API/types, affected UI entry points and a small executable integration path. A frame is concrete enough to test, not another prose outline.
4. **Implement:** expand the agreed composition through shared-writer transactions. Reuse authentic assets. Keep a modification focused enough to review its impact.
5. **Validate:** inspect contact sheets for rhythm, full-size pages for reading and image detail, and actual exported files for delivery behavior. Check the relevant UI with real actions. Automated checks answer narrower questions than visual review.
6. **Release:** name the completed page versions, retain asset provenance, verify packaged guidance hashes, document first-round external-client results, and release one tested product milestone.

## Introduction design contract

On a 960-wide canvas, Chinese ordinary titles usually use 26–28 and regular body text 17–20. English ordinary titles use 28–32 and body text 18–22. These are reference ranges for this product introduction, not universal limits for all presentation genres. Subordinate text should recede through role and spacing. Avoid shrinking a dense paragraph until it fits; edit it or move the explanation into notes.

Requested Section dividers contain only the Section title. A structural Section is not itself a visible divider. `page.add.sectionId` lets the Editor insert a title before an existing first Slide while retaining the same Section identity and Story. The insertion is one undoable change.

Every ordinary page uses the agreed background. If a page needs a deliberate exception, record its purpose in `designIntent.backgroundException`. Avoid adding color merely to alternate templates.

## Screenshot evidence

Keep source captures and a manifest together. Record the Editor version, interface locale, authored page language, source project, original pixel dimensions, viewport, device scale factor, crop and intended use. A full-window overview can orient an audience, but a feature explanation needs a readable task region. Do not upscale a small bitmap or reconstruct an interface as if it were a real capture.

The runtime audit evaluates the source pixels available after cropping against a 1920-wide delivery. A source/output ratio below 1 means the image is being enlarged at that delivery size. Passing this check does not make tiny interface labels legible. Check the final slide at its intended viewing size.

## Independent client trials

The DeepSeek Harness Chinese deck and Claude Code English deck use the same product facts and public asset collection. They run in their actual native clients with explicit HUANDENG configuration and their existing model settings. Preserve the first completed output and logs. Fix an execution blocker when necessary, but do not conceal a weak result by replacing it with a ChatGPT-authored deck. Compare completeness, instruction adherence, screenshot choice, editability, export validity and friction separately.

The introduction is a usable example, not a claim that every PowerPoint workflow has been replaced. PPTX round-trip editing, full master/layout inheritance and an independent presenter screen remain separate workstreams documented by earlier audits.
