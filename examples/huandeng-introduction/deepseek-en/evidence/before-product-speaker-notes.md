# Speaker notes · deepseek-en

The coordinator extracted the native author's saved Notes without rewriting or adding a script. Main Notes and Presentation occurrence Notes are labelled separately. Presentation sections use HUANDENG's actual resolved page data.

Metadata revision: `sha256:09d30e991254589f548012aabea8b4f7dc17d4de5d45964a03175727810dbde4`.

## Main Slides — 18

### 01 · 98RC · Why I built HUANDENG

Source: Main page Notes.

I want to start with why this exists, not with a feature list. I make slides constantly — group meeting, lab presentations, talks. Over the last year I became convinced that agents will write slides the way they now write code and text. The question I care about is not whether they can, but whether the result can sound like a person. This is the story of the two or three things that got in the way, and the editor I built around them.

### 02 · BR4V · I could see it from the back of the room.

Source: Main page Notes.

This began in group meeting. Someone would put up a deck, and my advisor — and honestly most of the room — could tell almost immediately that a model had made it. The design was often fine. Sometimes it was better than fine. The tell was that nobody seemed to have chosen anything. I started watching for that feeling instead of for a particular template.

### 03 · XFZM · The texture is not a style. It is an absence of focus.

Source: Main page Notes.

The usual explanation is AI style — a font, a gradient, a layout. I don't think that's it. The deck I recognized was complete in a way a person rarely is. Every point had a slide; every slide had a heading; every heading had three bullets. Completeness was the problem. A person makes a deck by deciding what not to say. A short post I read described this as covering everything, and it named what I had been feeling. The fix had to be upstream of layout.

### 04 · TPCJ · So I turned the process around.

Source: Main page Notes.

So I reversed the order. I don't ask for a deck and then write the talk. I talk first: why this exists, what I saw, what I decided, where I'm unsure. The model organizes that into a story, and we build pages from it. The Story field in the editor is where that intent lives for each page. The important part is not the feature; it's the direction of the work. The person supplies the point; the model helps with the form.

### 05 · 9KH9 · If the deck comes first, the talk becomes an explanation of the deck.

Source: Main page Notes.

There's a practical benefit I didn't expect. When I explain a project out loud, I wander. I double back. I remember the thing that mattered halfway through a sentence. That is not a defect to clean up; it is the talk. If the deck is built from that, the speaking comes with it. If the deck is built first, I end up writing a script that justifies an order I never chose. I would rather write the slides from the talk than the talk from the slides.

### 06 · MG2S · Change two pages. Receive a third copy of the deck.

Source: Main page Notes.

Story-first only works if the document can keep up. When I tried to edit a real deck with an agent, two walls appeared. The first was mechanical. On a fifty-page deck, I'd ask for two pages to change. I'd get a new file. Then another. Defensive agents preserve instead of replace. The folder filled with near-duplicates and final versions, and I couldn't tell which one was the deck. Git had already solved this for code. The unit of change should be the page.

### 07 · V7VJ · The only way to check a page was to photograph it.

Source: Main page Notes.

The second wall was the interface. With PowerPoint or Google Slides, the agent works through the screen. To judge a page it takes a full screenshot and looks at the picture. That is a bad loop: slow, expensive, and impossible to diff. You can't ask which object moved, or check bounds, or test a revision. Visual review still matters — a person still has to look — but it cannot be the only channel. I wanted the page to have a structure the agent could address directly.

### 08 · 7GWR · So the page stopped being a picture.

Source: Main page Notes.

That led me to the file format. PowerPoint already keeps slides as separate parts inside the .pptx package; I'm not claiming it has no structure. But the structure is packed inside one file and the working interface is the screen. I wanted the slide to be a page in a folder: a manifest, one file per page, media beside it, history underneath. That's PPTD. I first met the idea in the Kimi Slides ecosystem; the open-source open-slide project gave me pages as React components. HUANDENG is the two things put together in an Electron editor. It is not a renamed PPTX.

### 09 · WEZS · The editor

Source: Main page Notes.

So that's what I built. I'll show you the editor now, but I want to show it as answers to those two problems, not as a tour of every button.

### 10 · DR4V · One working document.

Source: Main page Notes.

This is the whole working document. Pages on the left, the canvas, the inspector, Story, materials, files, history. The canvas is one view, not the document. The important thing is that all of it lives in one project folder. The screenshot is a public example project, not this deck — I didn't want to stage a fake one.

### 11 · H29N · The brief stays with the page.

Source: Main page Notes.

Story is stored with the page. A prompt disappears when the chat ends; this doesn't. It records what the page is for, what must not change, and what this edit is meant to do. When another agent — or another person — opens the page, they start from the intent, not from a guess. It's an alignment tool, not a guarantee. The model can still get it wrong; but at least it's wrong against something explicit.

### 12 · 89DU · A page keeps its name when it moves.

Source: Main page Notes.

This is the identity problem. If I tell an agent to change page four, and the order has changed since the last version, page four is a different page. So every page has a stable Slide ID — the four-character code — separate from its Position. In this real footer the page moved from position two to position four; the ID stayed C014. That means I can ask for C014, and the history belongs to C014 no matter where it sits.

### 13 · CRUA · History belongs to the page.

Source: Main page Notes.

History is per page. Each page has named versions for the moments worth keeping, and an operation history for the smaller saves. Restoring a version changes only that page. That is the Git idea, applied at the unit that actually changes. I don't need a copy of the whole deck to try a different title.

### 14 · MKPP · A change arrives with its diff.

Source: Main page Notes.

And when a change comes in, I can see the diff before I accept it. Not a chat message saying 'improved the slide', but the exact fields that changed, with the page's Story beside it. That turns review into something I can actually do. A diff is a better conversation than 'make it better'.

### 15 · TJKM · A library, not a pasteboard.

Source: Main page Notes.

The materials library is the part I use most. Assets are stored once, at their original size, with their source and usage. This figure is a real one: C1′–C1′ distances at twelve paired positions in PDB 1BNA, one public structure. They are not independent replicates, and not hydrogen-bond distances; I use them as an example of real evidence, not as a result of the editor. The figure is referenced, not re-pasted, so the labels and pixels survive.

### 16 · 444J · One source, many audiences.

Source: Main page Notes.

One source, many talks. Main Slides is the canonical deck. A Presentation is a selection and order of those pages, with notes for that room. I can give a short version and a long version without maintaining two decks. If a page is fixed, every talk that uses it moves forward. If a talk has to stay exactly as it was, I can pin a version.

### 17 · DM3J · The work leaves as slides.

Source: Main page Notes.

The work still has to leave the editor. PDF for the room. Editable PPTX for whoever has to keep it. MP4 when the deck has to play itself. Export reads the saved pages, not a screenshot of the editor, and the PPTX is a real editable file, not a folder of slide images. The format is a working format, not a lock-in.

### 18 · TCMD · A deck should sound like the person who made it.

Source: Main page Notes.

That's the whole project. Not a better PowerPoint, and not a machine that makes decks for you. A way to start from the thing you actually want to say, and keep the document close enough to the person that it still sounds like them. The next step is more direct manipulation — layers, the kind of editing you do in an image tool — but the order is the point. Story first; slides after.

