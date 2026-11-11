# Saved speaker notes: deepseek-en

Generated from the saved Main and the Editor-resolved Presentations. Named versions and occurrence-specific Notes are resolved by the Editor; the notes below are not paraphrased.

## Main

Pages: 24.

### 1. A deck you can keep working on.

Slide ID: 98RC / Main position: 1

I want to start with why this exists, not with a feature list. I make slides constantly — group meeting, lab presentations, talks. Over the last year I became convinced that agents will write slides the way they now write code and text. The question I care about is not whether they can, but whether the result can sound like a person. This is the story of the two or three things that got in the way, and the editor I built around them.

### 2. Why this exists

Slide ID: RK7Q / Main position: 2



### 3. One project. One writer. Any assistant.

Slide ID: BR4V / Main position: 3

The product in one sentence. One project folder is the document; the Editor is where you edit; a plugin or connector is how an assistant reaches the same writer. The three routes are different; the writer is one.

### 4. The texture is not a style. It is an absence of focus.

Slide ID: XFZM / Main position: 4

The usual explanation is AI style — a font, a gradient, a layout. I don't think that's it. The deck I recognized was complete in a way a person rarely is. Every point had a slide; every slide had a heading; every heading had three bullets. Completeness was the problem. A person makes a deck by deciding what not to say. The left page is a real page from this deck that tries to cover every point; the right is a Section divider that chooses one pause. The difference is not decoration; it is focus.

### 5. The folder is the deck.

Slide ID: TPCJ / Main position: 5

The folder is the deck. deck.pptd is the manifest, pages/*.page are the slides, media/ holds the originals, .huandeng/ holds identity, Story and history. To move the deck, move the folder. PowerPoint is also structured internally, but its parts are packed inside one file; this is a working directory, not a renamed PPTX.

### 6. Two edits should not leave three decks.

Slide ID: MG2S / Main position: 6

Story-first only works if the document can keep up. When I tried to edit a real deck with an agent, two walls appeared. The first was mechanical. On a fifty-page deck, I'd ask for two pages to change. I'd get a new file. Then another. Defensive agents preserve instead of replace. The folder filled with near-duplicates and final versions, and I couldn't tell which one was the deck. Git had already solved this for code. The unit of change should be the page.

### 7. The page is not a picture.

Slide ID: V7VJ / Main position: 7

The second wall was the interface. With PowerPoint or Google Slides, the agent works through the screen. To judge a page it takes a full screenshot and looks at the picture. That is a bad loop: slow, expensive, and impossible to diff. You can't ask which object moved, or check bounds, or test a revision. Visual review still matters — a person still has to look — but it cannot be the only channel. I wanted the page to have a structure the agent could address directly.

### 8. PPTD plus React, in a desktop editor.

Slide ID: 7GWR / Main position: 8

That led me to the file format. PowerPoint already keeps slides as separate parts inside the .pptx package; I'm not claiming it has no structure. But the structure is packed inside one file and the working interface is the screen. I wanted the slide to be a page in a folder: a manifest, one file per page, media beside it, history underneath. That's PPTD. I first met the idea in the Kimi Slides ecosystem; the open-source open-slide project gave me pages as React components. HUANDENG is the two things put together in an Electron editor. It is not a renamed PPTX.

### 9. The editor

Slide ID: WEZS / Main position: 9

So that's what I built. I'll show you the editor now, but I want to show it as answers to those two problems, not as a tour of every button.

### 10. One working document.

Slide ID: DR4V / Main position: 10

This is the whole working document. Pages on the left, the canvas, the inspector, Story, materials, files, history. The canvas is one view, not the document. The capture is this deck, taken on 2026-11-11.

### 11. A page can carry real evidence.

Slide ID: KWPT / Main position: 11

This is the scientific worked example: the Dickerson–Drew DNA dodecamer, PDB 1BNA. The plot derives C1′–C1′ distances at twelve paired positions from this edition's own download of the deposited coordinates (2026-11-12), recomputed with our own script. The structure is the official RCSB assembly image, downloaded the same day. It is not an experiment run by HUANDENG, not independent replicates, and not a set of hydrogen-bond lengths. On the next page, this page's Story says what an edit must preserve.

### 12. Story tells the agent what to keep.

Slide ID: H29N / Main position: 12

Story is stored with the page. A prompt disappears when the chat ends; this doesn't. It records what the page is for, what must not change, and what this edit is meant to do. When another agent — or another person — opens the page, they start from the intent, not from a guess. It's an alignment tool, not a guarantee. The model can still get it wrong; but at least it's wrong against something explicit.

### 13. One wording correction, reviewed.

Slide ID: MKPP / Main position: 13

And when a change comes in, I can see the diff before I accept it. Not a chat message saying 'improved the slide', but the exact fields that changed. Open Activity from the top bar, then Review changes on the saved receipt. The window shows the affected page at left and the exact fields at right; here the source line, body and caption changed, while the plot, structure and layout stayed. A marks the page, B the saved fields.

### 14. A page keeps its name when it moves.

Slide ID: 89DU / Main position: 14

This is the identity problem. If I tell an agent to change page four, and the order has changed since the last version, page four is a different page. So every page has a stable Slide ID — the four-character code — separate from its Position. In these real status bars the same page, TPCJ, moved from position 4 of 22 to position 5 of 23 when a Section divider was inserted. The ID stayed TPCJ. That means I can ask for TPCJ, and the history belongs to TPCJ no matter where it sits.

### 15. History belongs to the page.

Slide ID: CRUA / Main position: 15

History is per page. TPCJ has two named versions: before and after this consistency pass, and an operation history for the smaller saves. The older version can be read without restoring it. Restoring changes only this page. That is the Git idea, applied at the unit that actually changes. I don't need a copy of the whole deck to try a different title.

### 16. Browse groups the deck.

Slide ID: CBCQ / Main position: 16

Browse groups pages by Section and shows the stable Slide ID and history entry under each thumbnail. The page order is the deck. This is a reading surface before edit, not a separate document. The capture is from this deck.

### 17. Outline reads the argument.

Slide ID: V3DV / Main position: 17



### 18. One source, many audiences.

Slide ID: 444J / Main position: 18

One source, many talks. Main Slides is the canonical deck. A Presentation is a selection and order of those pages, with notes for that room. The Short introduction in this project is a real six-page Presentation built from Main. I can give a short version and a long version without maintaining two decks. If a page is fixed, every talk that uses it moves forward. If a talk has to stay exactly as it was, I can pin a version.

### 19. A library, not a pasteboard.

Slide ID: TJKM / Main position: 19

The materials library is the part I use most. Assets are stored once, at their original size, with their source and usage. This figure is a real one: C1′–C1′ distances at twelve paired positions in PDB 1BNA, one public structure. The plot is this edition's recomputation from its own 2026-11-12 download; the structure is the RCSB assembly image. They are not independent replicates, and not hydrogen-bond distances. The figure is referenced, not re-pasted, so the labels and pixels survive.

### 20. Several assistants, one shared writer.

Slide ID: EKZK / Main position: 20

This is the collaboration page. Codex and Claude Code use the local plugin; ChatGPT reaches the local editor through the authorized workstation route; DeepSeek Harness mounts the bundle. They share one writer, so different pages can be saved independently, but two edits to the same page conflict even if they touch different objects. Main page order is tracked by the manifest revision; Project Story, Sections, the Presentation configuration and the order of pages within a Presentation are tracked by the metadata revision. Activity shows declared stages and saved receipts, not live presence or an automatic section lock. A content-to-design handoff works through saved operations and revisions: read the saved state, then preview, apply and render the focused change.

### 21. The work leaves as slides.

Slide ID: DM3J / Main position: 21

The work still has to leave the editor. PDF for the room. Editable PPTX for whoever has to keep it. MP4 when the deck has to play itself. Export reads the saved pages, not a screenshot of the editor, and the PPTX is a real editable file, not a folder of slide images. The format is a working format, not a lock-in.

### 22. Built on open work.

Slide ID: JYJD / Main position: 22

HUANDENG is built on open work, but the relationships differ. OpenSlide is the editor code foundation under MIT. OpenPPTD contributes only the MathML-to-OMML formula conversion modules, not the whole document model. PptxGenJS generates the PPTX export; Apache ECharts, KaTeX and Font Awesome are dependencies for charts, formulas and icons. PowerPoint and WPS are the file-and-canvas model this project reacts to. Kimi/Moonshot and open-kimi-ppt-skill are where I first met the PPTD approach; this is not a claim that Kimi invented a standard. PPTist, Slidev, Presenton, PPTAgent, PPTMaster, OpenSlides Studio (openslides.dev), OPF and VS Code are workflow inspiration and researched alternatives. HUANDENG is not affiliated with or endorsed by Kimi or the named projects. The not-yet list keeps the talk from implying completeness.

### 23. Start with your story.

Slide ID: AEUJ / Main position: 23

A concrete first action. Open the Editor and choose a project folder or its deck.pptd. Connect the assistant you already use from Agent setup. Tell it the story first, then ask for one page change; read the preview, apply it, and review the saved operation. The repository and the example project are on the right. This introduction is itself a HUANDENG project.

### 24. A deck should sound like the person who made it.

Slide ID: TCMD / Main position: 24

That's the whole project. Not a better PowerPoint, and not a machine that makes decks for you. A way to start from the thing you actually want to say, and keep the document close enough to the person that it still sounds like them. The next step is more direct manipulation — layers, the kind of editing you do in an image tool — but the order is the point. Story first; slides after.

## Short introduction

Pages: 6.

### 1. A deck you can keep working on.

Slide ID: 98RC / Main position: 1

I want to start with why this exists, not with a feature list. I make slides constantly — group meeting, lab presentations, talks. Over the last year I became convinced that agents will write slides the way they now write code and text. The question I care about is not whether they can, but whether the result can sound like a person. This is the story of the two or three things that got in the way, and the editor I built around them.

### 2. Why this exists

Slide ID: RK7Q / Main position: 2



### 3. One project. One writer. Any assistant.

Slide ID: BR4V / Main position: 3

The product in one sentence. One project folder is the document; the Editor is where you edit; a plugin or connector is how an assistant reaches the same writer. The three routes are different; the writer is one.

### 4. A page can carry real evidence.

Slide ID: KWPT / Main position: 11

This is the scientific worked example: the Dickerson–Drew DNA dodecamer, PDB 1BNA. The plot derives C1′–C1′ distances at twelve paired positions from this edition's own download of the deposited coordinates (2026-11-12), recomputed with our own script. The structure is the official RCSB assembly image, downloaded the same day. It is not an experiment run by HUANDENG, not independent replicates, and not a set of hydrogen-bond lengths. On the next page, this page's Story says what an edit must preserve.

### 5. One source, many audiences.

Slide ID: 444J / Main position: 18

One source, many talks. Main Slides is the canonical deck. A Presentation is a selection and order of those pages, with notes for that room. The Short introduction in this project is a real six-page Presentation built from Main. I can give a short version and a long version without maintaining two decks. If a page is fixed, every talk that uses it moves forward. If a talk has to stay exactly as it was, I can pin a version.

### 6. A deck should sound like the person who made it.

Slide ID: TCMD / Main position: 24

That's the whole project. Not a better PowerPoint, and not a machine that makes decks for you. A way to start from the thing you actually want to say, and keep the document close enough to the person that it still sounds like them. The next step is more direct manipulation — layers, the kind of editing you do in an image tool — but the order is the point. Story first; slides after.
