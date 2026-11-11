# Introducing HUANDENG: speaker notes

Extracted from the actual project Notes. Continue editing on the page or the relevant Presentation occurrence.

## Full introduction

### 1. Scientific slides, kept as a working project · 9DAA

HUANDENG is an editing workflow for scientific presentations. It brings together a visual editor, a portable working project and access for AI agents. It began with my experience preparing lab meetings: I wanted help with repetitive work while retaining the judgment, original material and a clear place to make the next edit. We will locate a page, preserve its intent and evidence, inspect a change and turn the pages into a talk.

### 2. A small edit should stay a small edit · 2XM9

Two frustrations often appeared together in my work. A deck could look complete while missing the point I wanted to make. Changing two pages in fifty could also leave another full copy. I separated those concerns: where does the human intent stay, and which page actually changed? Story keeps the intent available; page identity and history keep the revision attached to the work. The filenames illustrate my use case, not a claim about every AI tool.

### 3. What comes together in HUANDENG? · GX5Z

The Editor is the workspace for inspection, direct editing and presentation. The folder containing the PPTD entry is the complete project, with pages, assets and history. A plugin supplies authoring and collaboration guidance; a connector binds the assistant to the selected project’s shared writer. People and assistants can therefore work on the same source. The next section starts with that shared page.

### 4. Make one page work · 9VGD

Start with one page: locate the work, keep its intent and evidence, and inspect a focused edit.

### 5. Start from the page in the editor · FKA9

The left navigation gives access to the project, pages, assets and files. The central canvas remains available for direct object editing. The right inspector holds properties, layers and Story. Workspace views above the canvas let us browse the deck, inspect the outline, arrange sections, write notes and inspect history. An agent edits the same document. Next we will record the page intent and prepare the source material.

### 6. Keep the reason beside the edit · U8ZQ

The human account helps the agent understand the job. Project Story records the overall purpose; page Story records the point, the evidence to preserve and the requested change. It is not a command to print the transcript on the slide. The actual Story panel sits beside a concrete editing request. A person or another assistant taking over should read this context instead of guessing what happened in the previous conversation.

### 7. Keep the original material within reach · 35U5

The asset library keeps the original material available for the next revision. These two DNA views, coordinates and distance table come from one public structure. After import, Assets lets us locate the material and reuse it on a page; the source record and method remain with the project. A new composition should not require inventing a similar-looking figure with different data. We will use this material in the scientific example.

### 8. Local variation in one structure · ZWZJ

This public scientific page is the working example for the demonstration. The 1BNA structure and the twelve paired C1′ distances come from the same coordinates. At position seven, A7–B18 measures 10.2329 Å, displayed as 10.233 Å. These are positions within one structure, not independent experimental replicates. We will refine the explanation while retaining the figure, all values, axes and citation. This is a concrete editing task a scientific presenter can inspect.

Sources: https://www.rcsb.org/structure/1BNA ; https://doi.org/10.1073/pnas.78.4.2179 . Source coordinates and method: sources/science/.

### 9. Keep charts, tables and equations editable · XF8A

The preceding chart retains all twelve source values. This page selects five positions in a native table and keeps the distance calculation as an editable equation. A person can work with actual cells, a chart series and the equation instead of moving imitation cell text boxes. The plot and table use the same public data, so values and units can be checked together.

### 10. Match the saved change to the request · ZN52

This is an actual saved edit. The request tightened the title and explanation while retaining the figure, all twelve values, axes and source. The before and after views come from that operation’s real snapshots. The scope can be checked directly. Next we need to identify the page and follow its history, as well as inspect the final appearance.

Saved operation: d2d18509-c72c-48e7-81cc-4251486a522e. Verification: evidence/wording-edit.json.

### 11. Identify the page. Then follow its history. · DHVW

Position is the current order; after rearranging, slide four can mean a different page. Slide ID preserves the page identity. The mapping here uses this project’s full and brief presentations. Name the stable ID and the intended object when asking an assistant for a change. History follows that same page instead of an ambiguous position number.

### 12. Review a change. Return to a saved stage. · 2ZQ3

Select the page and open History to inspect saved operations or record a named version. An operation explains a particular change; a named version preserves a meaningful stage of the whole page. Restoring acts on the selected page. Small revisions can stay in the current project rather than becoming another full source deck.

### 13. Turn pages into a talk · 7E4T

Once a page can keep evolving, assemble the talk: inspect its rhythm, select the pages and adapt the explanation to this audience.

### 14. Step back and inspect the whole talk · 9QQW

After editing individual pages, inspect the talk as a whole. Browse shows actual pages and section rhythm. Outline makes headings and content cues easy to scan. Sections organizes chapter boundaries. These are views of the same pages. Each shown view is captured from the actual editor. Returning to Normal keeps the same page identities and content.

### 15. Keep the pages. Change the selection. · AAD6

Main Slides is the continuing page library. Open Project, Arrange Presentation and New Presentation; select pages, set their order and save Project. The upper row shows part of Main. The lower row shows three actual selections in this project’s brief talk, each referring to its original Slide ID. Next we will give one page the notes for this particular talk.

### 16. The same page can carry a different script · 74A2

Reusing a page does not require reading the same script. Main Notes can keep the general explanation; one occurrence in a Presentation can hold its own notes. The brief introduction uses this scientific page to explain evidence preservation, while a longer account can explain the method. The local notes belong to this appearance; the page need not be duplicated.

### 17. Follow the page, or hold a saved version · 9N3S

Some talks should follow continuing edits; others need a particular settled stage. Live uses the current Main page; Pinned selects a named version of that page. The left is the current scientific example; the right is the actual saved wording-edit stage. The brief introduction really pins that version. The identity is the same, while the selected content version differs.

### 18. Take the project, not just its entry file · BHPP

The PPTD file is the entry; the directory is the complete project. Pages, media, Story, composition, named page versions and authoring guidance stay together. Named versions travel with the folder; machine-local operation journals stay on the computer where they were recorded. PPTX already contains slide parts too; HUANDENG exposes an accessible working folder. The new entry flow accepts a PPTD or a folder containing exactly one PPTD. A descriptive folder suffix is optional. If the folder has several entries, choose the intended file explicitly.

### 19. Work with people and agents · X5J6

With pages and talks organized, we can bring people and assistants into the same project and explain setup, division of work, handoff and delivery.

### 20. Different assistants, one working project · YZ4T

For the first connection, open Agent setup at the top of the editor, choose the client and follow its setup instructions. Ask the assistant to read the project and selected page, then check the returned project name and Slide ID. Different assistants use native integrations with the same document contract. The plugin carries guidance; the connector binds requests to the explicitly chosen project. The Editor and assistants save through the shared writer. The marks identify supported routes, not models currently online. A real read and task are still needed to verify the selected project and access.

### 21. Divide the work. Make the handoff explicit. · KW5P

Work can be divided by pages, or passed from content drafting to visual refinement. A handoff needs page IDs, the task and evidence-preservation constraints. Different-page saves can proceed independently. A same-page or shared-metadata conflict requires rereading and reconciling the intended change. Activity distinguishes client reports from saved receipts; configuration alone is not online presence. The diagram illustrates task allocation. In a separate controlled test, native DeepSeek Harness and ChatGPT saved distinct pages from the same starting state. A stale same-page proposal was rejected; after rereading, a focused font and color handoff succeeded. Claude Code did not participate in this round’s parallel test. See evidence/collaboration.json.

### 22. From the working project to the audience · DDJN

Present or export from the same working project. Click-by-click reveals belong to live playback; PPTX and PDF carry the static slides. Provide the complete PPTD project when someone needs to continue editing, and an appropriate export when they need to read or present it. Further changes return to the same source project.

### 23. Built on work worth acknowledging · 5HW8

HUANDENG builds on OpenSlide. OpenPPTD contributes formula-conversion modules and PptxGenJS supplies PPTX generation. The PPTD approach was inspired by the Kimi Slides ecosystem; that is not a claim about inventing a universal standard. Charts, formulas and functional icons also build on open-source work. The public DNA example comes from PDB 1BNA and Drew and colleagues. Sources and licenses stay with the project; third-party marks do not imply endorsement.

Sources and scope: sources/brand/manifest.json; notices/; sources/science/source.json; https://recent.design/ . The GitHub mark identifies the OpenPPTD repository, not an OpenPPTD product logo.

### 24. Open a page. Try one specific edit. · ECVR

Open this example and select the scientific page. Use its Slide ID to ask for one small change: clarify the explanation while preserving the figure, all twelve values, units and source. Inspect the proposal, then the saved page and history. The person can keep shaping the explanation throughout the work. Intent, evidence and revisions stay available for the next edit.

## Brief introduction

### 1. Scientific slides, kept as a working project · 9DAA

HUANDENG is an editing workflow for scientific presentations. It brings together a visual editor, a portable working project and access for AI agents. It began with my experience preparing lab meetings: I wanted help with repetitive work while retaining the judgment, original material and a clear place to make the next edit. We will locate a page, preserve its intent and evidence, inspect a change and turn the pages into a talk.

### 2. A small edit should stay a small edit · 2XM9

Two frustrations often appeared together in my work. A deck could look complete while missing the point I wanted to make. Changing two pages in fifty could also leave another full copy. I separated those concerns: where does the human intent stay, and which page actually changed? Story keeps the intent available; page identity and history keep the revision attached to the work. The filenames illustrate my use case, not a claim about every AI tool.

### 3. What comes together in HUANDENG? · GX5Z

The Editor is the workspace for inspection, direct editing and presentation. The folder containing the PPTD entry is the complete project, with pages, assets and history. A plugin supplies authoring and collaboration guidance; a connector binds the assistant to the selected project’s shared writer. People and assistants can therefore work on the same source. The next section starts with that shared page.

### 4. Start from the page in the editor · FKA9

Locate the shared work: project, pages, assets and files on the left, direct editing in the canvas, and properties, layers and Story on the right. An assistant works on that same page. In this brief talk we next find the original material in Assets and inspect a focused edit.

### 5. Keep the original material within reach · 35U5

The asset library keeps the original material available for the next revision. These two DNA views, coordinates and distance table come from one public structure. After import, Assets lets us locate the material and reuse it on a page; the source record and method remain with the project. A new composition should not require inventing a similar-looking figure with different data. We will use this material in the scientific example.

### 6. Local variation in one structure · ZWZJ

For this talk, change only the explanation. Keep the figure, all twelve values, units and source. The page need not be copied; this talk pins the saved wording-edit stage.

### 7. Match the saved change to the request · ZN52

This is an actual saved edit. The request tightened the title and explanation while retaining the figure, all twelve values, axes and source. The before and after views come from that operation’s real snapshots. The scope can be checked directly. Next we need to identify the page and follow its history, as well as inspect the final appearance.

Saved operation: d2d18509-c72c-48e7-81cc-4251486a522e. Verification: evidence/wording-edit.json.

### 8. Identify the page. Then follow its history. · DHVW

Position is the current order; after rearranging, slide four can mean a different page. Slide ID preserves the page identity. The mapping here uses this project’s full and brief presentations. Name the stable ID and the intended object when asking an assistant for a change. History follows that same page instead of an ambiguous position number.

### 9. Keep the pages. Change the selection. · AAD6

The brief talk selects from the same Main pages while retaining their Slide IDs. These actual pages show the selection relationship. Next we connect assistants to this project and then consider division of work and handoff.

### 10. Different assistants, one working project · YZ4T

For the first connection, open Agent setup at the top of the editor, choose the client and follow its setup instructions. Ask the assistant to read the project and selected page, then check the returned project name and Slide ID. Different assistants use native integrations with the same document contract. The plugin carries guidance; the connector binds requests to the explicitly chosen project. The Editor and assistants save through the shared writer. The marks identify supported routes, not models currently online. A real read and task are still needed to verify the selected project and access.

### 11. Divide the work. Make the handoff explicit. · KW5P

Work can be divided by pages, or passed from content drafting to visual refinement. A handoff needs page IDs, the task and evidence-preservation constraints. Different-page saves can proceed independently. A same-page or shared-metadata conflict requires rereading and reconciling the intended change. Activity distinguishes client reports from saved receipts; configuration alone is not online presence. The diagram illustrates task allocation. In a separate controlled test, native DeepSeek Harness and ChatGPT saved distinct pages from the same starting state. A stale same-page proposal was rejected; after rereading, a focused font and color handoff succeeded. Claude Code did not participate in this round’s parallel test. See evidence/collaboration.json.

### 12. Open a page. Try one specific edit. · ECVR

Open this example and select the scientific page. Use its Slide ID to ask for one small change: clarify the explanation while preserving the figure, all twelve values, units and source. Inspect the proposal, then the saved page and history. The person can keep shaping the explanation throughout the work. Intent, evidence and revisions stay available for the next edit.
