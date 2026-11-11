# Speaker notes · claude-en

The coordinator extracted the native author's saved Notes without rewriting or adding a script. Main Notes and Presentation occurrence Notes are labelled separately. Presentation sections use HUANDENG's actual resolved page data.

Metadata revision: `sha256:be41c8a1230b88e6bbf901ad04507dcd9b086dfc24b48c1ed1ae715e3714ee52`.

## Main Slides — 25

### 01 · QMYQ · Slides that start from a story

Source: Main page Notes.

I want to tell you why I built HUANDENG, rather than list its features. It started in group meetings, with slides that everyone could tell were made by AI, and with agents that turned two small edits into three copies of a deck. HUANDENG is a desktop slide editor where you and an AI agent work on one deck, one page at a time, starting from the story you want to tell. The molecule on the right is the worked example later in the talk: the DNA dodecamer from PDB entry 1BNA.

### 02 · BW88 · Why I built it

Source: Main page Notes.

Section 1. I will start with why. There are four reasons, and they all came from real group meetings and real attempts to make slides with AI.

### 03 · PPKK · My advisor can spot AI slides at a glance

Source: Main page Notes.

This is where it started. In group meetings I see more and more slides made with AI, and I think that is the direction things are going: slides are data, a file format, so of course agents will learn to make them. But my advisor, and most people in the room, can tell at a glance when a deck was made by AI. Each tool has its own style, PowerPoint, Google Slides, ChatGPT, Kimi, and they all still look like AI. I read a post on Xiaohongshu that put it well: the AI look comes from having no focus, from covering everything, from having no story, from aiming to be complete and safe. Even this talk fell into it. On the right are pages from the previous version, made by Claude Code. They look fine. My comment on them was: the visuals are good, but there is no focus, because there is no story. That is the problem this project is about.

### 04 · RQ64 · Two small edits should not leave three decks

Source: Main page Notes.

The second problem appeared when I asked an agent to change a deck. Say I have fifty slides and want two of them fixed. Many agents are cautious: instead of replacing the file, they keep the original and write a new copy. One small tweak, another copy. After an afternoon the folder is full of near-identical decks, and the history is spread across file names. That made me think of Git. Version control works because the unit of change is small and every change is recorded. So in HUANDENG the page is the unit: an edit rewrites one page file and adds to that page's history, and a named version marks a milestone. The file names and edits here are an illustration, not a real folder.

### 05 · GDDR · Most tools give an agent only a screenshot

Source: Main page Notes.

The third problem showed up when I asked AI to work on Google Slides or PowerPoint decks. To check its own work, the agent often has to render the whole slide to a picture and look at it. That is a useful review, but it is not something you can measure, compare or optimise: every check is a fresh guess from pixels. So I wanted a slide format where the agent reads the slide as data. On the right is a real excerpt from the 1BNA slide in this very project: the chart is an object with its bounds, its twelve values and its axis range. An agent can change one value or one label without touching anything else, and the change can be diffed. I still look at renders for composition and readability; they are a review surface, not the editable model.

### 06 · C45U · Start from the story, not from the slides

Source: Main page Notes.

Here is the reason I care most about. If the AI makes the slides first, you then write a speech to fit them, and you end up following the AI's logic, which often has no soul. If you start by telling your story, freestyle, the way you would explain it to a colleague, the agent can organise that story, build the slides on it, and your own words become the speaker notes. Even improvised speech has a structure. Keeping it means the deck has a point of view, and you do not have to invent a script afterwards. This talk is an example: I told the story of why I built HUANDENG, and this version was rebuilt from that account.

### 07 · 2SD8 · What I built

Source: Main page Notes.

Section 2. Those four problems led to one tool: an editor plus a plugin. Here is where it came from and what it looks like.

### 08 · TFJB · PPTD plus React, in a desktop editor

Source: Main page Notes.

So what did I build? While looking at how people are teaching agents to make slides, I met the PPTD idea in the Kimi Slides ecosystem: a deck kept as a folder of page files rather than one packed file. Then I found OpenSlide, an open-source editor where every page is a React component. I thought these two ideas fit together: PPTD as the document, React as the interface. HUANDENG is that combination, packaged as an Electron desktop app. Most of the editing behaviour comes from OpenSlide; sections, views and notes borrow from PowerPoint and WPS, and the Layers panel takes its cue from Photoshop. Next to the editor sits a plugin, so that the AI client you already use can work in the same editor. Editor plus plugin is the workflow. To be precise about credit: OpenPPTD is a different project, and we reuse only its equation-conversion code. And HUANDENG has no affiliation with Kimi.

### 09 · 7NHP · Unzip a PPTX: it is already pages

Source: Main page Notes.

Here is the format idea in one picture. If you unzip a PowerPoint file, you find that it is already organised by page: presentation.xml, then slide1.xml, slide2.xml and so on, with media, notes and charts as separate parts. The left column comes from this deck's own exported PPTX. PPTD keeps the same idea but leaves the parts open as a working folder: deck.pptd for the order, one .page file per slide, a media folder, and a .huandeng folder for Slide IDs, Story, Sections, Presentations and history. So an agent can open one page file, and nothing forces it to rewrite the whole deck. HUANDENG still exports PPTX when you need to send it. This introduction is one such folder.

### 10 · DKSN · The HUANDENG Editor

Source: Main page Notes.

This is the editor itself, running a small public example. 1, the sidebar has four tabs: Project, Pages, Assets, and Files, which shows the project folder the way VS Code shows a code repository. Assets is a real library: every figure in the project, with its original size and where it is used. 2, the views above the canvas: Normal, Browse, Outline, Sections, Notes page and History. 3, the canvas edits native objects, including tables and charts. 4, the Inspector: properties, layout, a Layers panel in the spirit of Photoshop, the Story of the slide, and checks. 5, Agent setup connects the AI client you already use, and Activity shows what it reports and what was actually saved. 6, Export and Present. There is no chat box inside the editor.

### 11 · EEGK · Story first: one slide, start to finish

Source: Main page Notes.

Section 3. Now let me follow one real scientific slide: what it shows, the Story behind it, how a change is asked for, and how that change can be checked.

### 12 · AVNM · 1BNA: twelve base-pair distances, kept as data

Source: Main page Notes.

Here is the kind of slide this talk is about: one real result. The structure is PDB entry 1BNA, the Dickerson–Drew DNA dodecamer, drawn from its deposited coordinates; chain A is green, chain B ochre. For each of the twelve base pairs we measured the distance between the paired C1-prime atoms. The chart is not a pasted picture: it is a HUANDENG chart object holding the twelve values from the CSV, with a labelled axis that deliberately does not start at zero, so the geometric variation is visible. If a value or a label needs to change, you edit the data, not the pixels. Be careful about what the chart says: these are twelve positions in a single crystal structure. They are not replicates and carry no error bars. The shortest distance is at pair 7, a T–A pair in the central AATT region; the longest at pair 12, a terminal G–C pair.

Method: Euclidean distance between C1′ atoms, chain A residues 1–12 ascending paired with chain B residues 24–13 descending. Values from paired-c1-distances.csv (assets/science, generate.py).

Source: RCSB PDB 1BNA, https://www.rcsb.org/structure/1BNA; structure DOI 10.2210/pdb1BNA/pdb. Drew HR, Wing RM, Takano T, Broka C, Tanaka S, Itakura K, Dickerson RE. PNAS 78 (1981) 2179–2183, https://doi.org/10.1073/pnas.78.4.2179.

### 13 · QK69 · Story tells the agent what matters

Source: Main page Notes.

This is the part of HUANDENG that comes most directly from the story-first idea. Every slide carries a short Story: what it is for, what must be kept, and what change was asked for. Think of it as an alignment tool between me and the agent. On the right is the Story actually recorded for the 1BNA slide: keep the exact values, keep the labelled axis and its units, keep the citation, and make no claims of replicates or trends. When an agent is asked to tidy that slide, it reads this first. Story also exists for the whole project, each Section and each Presentation. An agent's Story is its interpretation, not my approval.

### 14 · AZJC · Outline: read the deck as a story

Source: Main page Notes.

Before polishing any single slide, I read the deck as a story. The Outline view lists every slide with its title, its Story summary and its Slide ID, grouped by Section, so I can see whether the argument holds. Browse shows the same slides as thumbnails, for density and rhythm. Sections divide the talk into parts; each starts at a stable first slide and runs to the next.

### 15 · 6FNH · One requested change, before and after

Source: Main page Notes.

Here is one change from start to finish, in the public example project. The Story for this slide said: shorten the title and the explanation, and keep the layout, every other object and the main message. On the left is the slide before; on the right, after. The table below lists exactly what changed: the title and the lead sentence. The Purpose and Keep columns, the footer and the geometry are untouched. The change was proposed as a transaction, previewed, and then applied through the shared writer, so it is recorded and can be reviewed on the next slide. The same discipline applies to a scientific slide: an edit to the 1BNA chart title must not touch the data or the citation.

### 16 · 4V98 · Every saved change can be reviewed

Source: Main page Notes.

After the change is saved, anyone can open its record. 1, the receipt says which operation it was, in which project and when. 2, Before and After show the actual slide, with the changed object outlined. 3, Saved changes lists every object and field that was written; here, the text of the title and of the lead. 4, the panel also shows the slide's Story and where the slide is used: one live reference in the Quick introduction presentation, no pinned ones. This dialog is read-only. If you want the old slide back, you restore a named version from History, which affects only that slide. Changes from people and from agents arrive through the same writer, so they are reviewed in the same way.

### 17 · KM5E · The page is the unit of change

Source: Main page Notes.

Section 4. Back to the Git idea: if the page is the unit of change, each page needs a name that does not move, and a history of its own.

### 18 · V2SV · Say “C014”, not “slide 4”

Source: Main page Notes.

When I talk to an agent about my slides, I used to say: fix slide four. But if the order changed since the last version, slide four is a different slide. So HUANDENG separates the two. Position is just where a slide sits now. The Slide ID is a short four-character code, letters and numbers, that belongs to the slide for good. The status bar here shows Position moving from 2 to 4 while the Slide ID stays C014. Now I can say: fix the chart on C014, and the agent knows exactly which page I mean, next week as well as today. The same ID is what page history hangs on.

### 19 · 73AG · Every page has its own history

Source: Main page Notes.

This is the feature I consider most important. History is kept per page, not for the whole deck. Right-click a slide in the Pages panel and choose View version history. Saved versions are the milestones I name myself, like Before copy edit. Operation history lists every saved change to that page, each with its review. And restoring a version changes only that slide; every other slide, and every talk that uses them, stays as it is. This is what replaces the folder of copies from the beginning of the talk.

### 20 · JZ7U · One Main library, two Presentations

Source: Main page Notes.

A HUANDENG project has one Main Slides library. A Presentation is an ordered list of references into it. On the left is the project overview in the Editor, with the Main library and one Presentation. On the right is this very deck. The full introduction you are watching has twenty-five slides. The lab-meeting version uses nine of the same slides in its own order: the reasons, the 1BNA slide and its Story, page history, agents, and how to start. The stacked previews and the grid are thumbnails rendered from this project's own export. Neither Presentation holds copies, so if I fix the 1BNA chart in Main Slides, both talks show the fix. The lab version gives four slides shorter speaker notes of their own; those notes belong to that appearance, not to the slide. If a talk has to stay frozen, for example one you have already submitted, you pin a named version of a slide there.

### 21 · SQNG · Working with agents

Source: Main page Notes.

Section 5. Finally, how agents actually connect, how a talk leaves the project, what HUANDENG is built on, and how to start.

### 22 · AUBX · Agents work through the same writer as you

Source: Main page Notes.

You keep the AI client you already use. Codex and Claude Code load the HUANDENG plugin locally over MCP; DeepSeek uses it through its Harness; ChatGPT reaches the local editor through a command-line route. Whatever the client, every write goes through the same shared writer that the editor window uses. It checks that the agent read the current version, applies exactly the change that was previewed, and returns a receipt. So an agent cannot quietly overwrite something I changed a minute ago. This version of the talk was written by Claude Code along exactly this route.

### 23 · SY94 · Check, present and export

Source: Main page Notes.

Before delivering, run Design check. It reads the whole collection and reports observations: type sizes outside the range you chose, unexpected backgrounds, Sections without a title slide, images with too few pixels for the size they are shown at. It is read-only; you still look at the slides yourself. Present starts from the beginning with F5 or from the current slide with Shift+F5, in a full-screen window with click builds. Export takes the slides as saved when it starts. The project folder itself is the editable source. PPTX keeps supported objects native, so a co-author can keep editing text, tables and basic charts in PowerPoint; animation becomes static. PDF is for sharing, and MP4 plays the click builds on a timer. This deck was exported to PDF and PPTX in exactly this way.

### 24 · 3ECM · Built on open work, with clear gaps

Source: Main page Notes.

HUANDENG did not start from nothing. The editor is built on OpenSlide, under the MIT licence. Equation conversion reuses code from the OpenPPTD repository; the GitHub mark here identifies that repository, it is not an OpenPPTD logo. PowerPoint export uses PptxGenJS. On the right are things HUANDENG does not do yet, as listed in the project README: importing arbitrary PPTX files and round-tripping them, editing Google Slides directly, a separate presenter window on a second screen, inheritable slide masters, native PowerPoint animation in exported files, and a plugin marketplace. If you need one of these, that is where a contribution would help most.

### 25 · SMGE · Start with your story

Source: Main page Notes.

If you want to try it, open the editor and start a project, or open an existing deck. Connect the AI client you already use from Agent setup. Then do what I did for this talk: tell the agent your story first, out loud and freestyle, and let it organise the story before it makes any slides. After that, ask for one change at a time, read the preview, apply it, and look at the review. The code and the build commands are on the right, and the repository is at the bottom. Thank you.

## Presentation · HUANDENG introduction (full, about 25 minutes) — 25

ID: `pres-full`. Explicit occurrence Notes: 0.

This Presentation stores no independent occurrence Notes; the text below resolves from its referenced pages.

### 01 · QMYQ · Slides that start from a story

Source: referenced page Notes (resolved).

I want to tell you why I built HUANDENG, rather than list its features. It started in group meetings, with slides that everyone could tell were made by AI, and with agents that turned two small edits into three copies of a deck. HUANDENG is a desktop slide editor where you and an AI agent work on one deck, one page at a time, starting from the story you want to tell. The molecule on the right is the worked example later in the talk: the DNA dodecamer from PDB entry 1BNA.

### 02 · BW88 · Why I built it

Source: referenced page Notes (resolved).

Section 1. I will start with why. There are four reasons, and they all came from real group meetings and real attempts to make slides with AI.

### 03 · PPKK · My advisor can spot AI slides at a glance

Source: referenced page Notes (resolved).

This is where it started. In group meetings I see more and more slides made with AI, and I think that is the direction things are going: slides are data, a file format, so of course agents will learn to make them. But my advisor, and most people in the room, can tell at a glance when a deck was made by AI. Each tool has its own style, PowerPoint, Google Slides, ChatGPT, Kimi, and they all still look like AI. I read a post on Xiaohongshu that put it well: the AI look comes from having no focus, from covering everything, from having no story, from aiming to be complete and safe. Even this talk fell into it. On the right are pages from the previous version, made by Claude Code. They look fine. My comment on them was: the visuals are good, but there is no focus, because there is no story. That is the problem this project is about.

### 04 · RQ64 · Two small edits should not leave three decks

Source: referenced page Notes (resolved).

The second problem appeared when I asked an agent to change a deck. Say I have fifty slides and want two of them fixed. Many agents are cautious: instead of replacing the file, they keep the original and write a new copy. One small tweak, another copy. After an afternoon the folder is full of near-identical decks, and the history is spread across file names. That made me think of Git. Version control works because the unit of change is small and every change is recorded. So in HUANDENG the page is the unit: an edit rewrites one page file and adds to that page's history, and a named version marks a milestone. The file names and edits here are an illustration, not a real folder.

### 05 · GDDR · Most tools give an agent only a screenshot

Source: referenced page Notes (resolved).

The third problem showed up when I asked AI to work on Google Slides or PowerPoint decks. To check its own work, the agent often has to render the whole slide to a picture and look at it. That is a useful review, but it is not something you can measure, compare or optimise: every check is a fresh guess from pixels. So I wanted a slide format where the agent reads the slide as data. On the right is a real excerpt from the 1BNA slide in this very project: the chart is an object with its bounds, its twelve values and its axis range. An agent can change one value or one label without touching anything else, and the change can be diffed. I still look at renders for composition and readability; they are a review surface, not the editable model.

### 06 · C45U · Start from the story, not from the slides

Source: referenced page Notes (resolved).

Here is the reason I care most about. If the AI makes the slides first, you then write a speech to fit them, and you end up following the AI's logic, which often has no soul. If you start by telling your story, freestyle, the way you would explain it to a colleague, the agent can organise that story, build the slides on it, and your own words become the speaker notes. Even improvised speech has a structure. Keeping it means the deck has a point of view, and you do not have to invent a script afterwards. This talk is an example: I told the story of why I built HUANDENG, and this version was rebuilt from that account.

### 07 · 2SD8 · What I built

Source: referenced page Notes (resolved).

Section 2. Those four problems led to one tool: an editor plus a plugin. Here is where it came from and what it looks like.

### 08 · TFJB · PPTD plus React, in a desktop editor

Source: referenced page Notes (resolved).

So what did I build? While looking at how people are teaching agents to make slides, I met the PPTD idea in the Kimi Slides ecosystem: a deck kept as a folder of page files rather than one packed file. Then I found OpenSlide, an open-source editor where every page is a React component. I thought these two ideas fit together: PPTD as the document, React as the interface. HUANDENG is that combination, packaged as an Electron desktop app. Most of the editing behaviour comes from OpenSlide; sections, views and notes borrow from PowerPoint and WPS, and the Layers panel takes its cue from Photoshop. Next to the editor sits a plugin, so that the AI client you already use can work in the same editor. Editor plus plugin is the workflow. To be precise about credit: OpenPPTD is a different project, and we reuse only its equation-conversion code. And HUANDENG has no affiliation with Kimi.

### 09 · 7NHP · Unzip a PPTX: it is already pages

Source: referenced page Notes (resolved).

Here is the format idea in one picture. If you unzip a PowerPoint file, you find that it is already organised by page: presentation.xml, then slide1.xml, slide2.xml and so on, with media, notes and charts as separate parts. The left column comes from this deck's own exported PPTX. PPTD keeps the same idea but leaves the parts open as a working folder: deck.pptd for the order, one .page file per slide, a media folder, and a .huandeng folder for Slide IDs, Story, Sections, Presentations and history. So an agent can open one page file, and nothing forces it to rewrite the whole deck. HUANDENG still exports PPTX when you need to send it. This introduction is one such folder.

### 10 · DKSN · The HUANDENG Editor

Source: referenced page Notes (resolved).

This is the editor itself, running a small public example. 1, the sidebar has four tabs: Project, Pages, Assets, and Files, which shows the project folder the way VS Code shows a code repository. Assets is a real library: every figure in the project, with its original size and where it is used. 2, the views above the canvas: Normal, Browse, Outline, Sections, Notes page and History. 3, the canvas edits native objects, including tables and charts. 4, the Inspector: properties, layout, a Layers panel in the spirit of Photoshop, the Story of the slide, and checks. 5, Agent setup connects the AI client you already use, and Activity shows what it reports and what was actually saved. 6, Export and Present. There is no chat box inside the editor.

### 11 · EEGK · Story first: one slide, start to finish

Source: referenced page Notes (resolved).

Section 3. Now let me follow one real scientific slide: what it shows, the Story behind it, how a change is asked for, and how that change can be checked.

### 12 · AVNM · 1BNA: twelve base-pair distances, kept as data

Source: referenced page Notes (resolved).

Here is the kind of slide this talk is about: one real result. The structure is PDB entry 1BNA, the Dickerson–Drew DNA dodecamer, drawn from its deposited coordinates; chain A is green, chain B ochre. For each of the twelve base pairs we measured the distance between the paired C1-prime atoms. The chart is not a pasted picture: it is a HUANDENG chart object holding the twelve values from the CSV, with a labelled axis that deliberately does not start at zero, so the geometric variation is visible. If a value or a label needs to change, you edit the data, not the pixels. Be careful about what the chart says: these are twelve positions in a single crystal structure. They are not replicates and carry no error bars. The shortest distance is at pair 7, a T–A pair in the central AATT region; the longest at pair 12, a terminal G–C pair.

Method: Euclidean distance between C1′ atoms, chain A residues 1–12 ascending paired with chain B residues 24–13 descending. Values from paired-c1-distances.csv (assets/science, generate.py).

Source: RCSB PDB 1BNA, https://www.rcsb.org/structure/1BNA; structure DOI 10.2210/pdb1BNA/pdb. Drew HR, Wing RM, Takano T, Broka C, Tanaka S, Itakura K, Dickerson RE. PNAS 78 (1981) 2179–2183, https://doi.org/10.1073/pnas.78.4.2179.

### 13 · QK69 · Story tells the agent what matters

Source: referenced page Notes (resolved).

This is the part of HUANDENG that comes most directly from the story-first idea. Every slide carries a short Story: what it is for, what must be kept, and what change was asked for. Think of it as an alignment tool between me and the agent. On the right is the Story actually recorded for the 1BNA slide: keep the exact values, keep the labelled axis and its units, keep the citation, and make no claims of replicates or trends. When an agent is asked to tidy that slide, it reads this first. Story also exists for the whole project, each Section and each Presentation. An agent's Story is its interpretation, not my approval.

### 14 · AZJC · Outline: read the deck as a story

Source: referenced page Notes (resolved).

Before polishing any single slide, I read the deck as a story. The Outline view lists every slide with its title, its Story summary and its Slide ID, grouped by Section, so I can see whether the argument holds. Browse shows the same slides as thumbnails, for density and rhythm. Sections divide the talk into parts; each starts at a stable first slide and runs to the next.

### 15 · 6FNH · One requested change, before and after

Source: referenced page Notes (resolved).

Here is one change from start to finish, in the public example project. The Story for this slide said: shorten the title and the explanation, and keep the layout, every other object and the main message. On the left is the slide before; on the right, after. The table below lists exactly what changed: the title and the lead sentence. The Purpose and Keep columns, the footer and the geometry are untouched. The change was proposed as a transaction, previewed, and then applied through the shared writer, so it is recorded and can be reviewed on the next slide. The same discipline applies to a scientific slide: an edit to the 1BNA chart title must not touch the data or the citation.

### 16 · 4V98 · Every saved change can be reviewed

Source: referenced page Notes (resolved).

After the change is saved, anyone can open its record. 1, the receipt says which operation it was, in which project and when. 2, Before and After show the actual slide, with the changed object outlined. 3, Saved changes lists every object and field that was written; here, the text of the title and of the lead. 4, the panel also shows the slide's Story and where the slide is used: one live reference in the Quick introduction presentation, no pinned ones. This dialog is read-only. If you want the old slide back, you restore a named version from History, which affects only that slide. Changes from people and from agents arrive through the same writer, so they are reviewed in the same way.

### 17 · KM5E · The page is the unit of change

Source: referenced page Notes (resolved).

Section 4. Back to the Git idea: if the page is the unit of change, each page needs a name that does not move, and a history of its own.

### 18 · V2SV · Say “C014”, not “slide 4”

Source: referenced page Notes (resolved).

When I talk to an agent about my slides, I used to say: fix slide four. But if the order changed since the last version, slide four is a different slide. So HUANDENG separates the two. Position is just where a slide sits now. The Slide ID is a short four-character code, letters and numbers, that belongs to the slide for good. The status bar here shows Position moving from 2 to 4 while the Slide ID stays C014. Now I can say: fix the chart on C014, and the agent knows exactly which page I mean, next week as well as today. The same ID is what page history hangs on.

### 19 · 73AG · Every page has its own history

Source: referenced page Notes (resolved).

This is the feature I consider most important. History is kept per page, not for the whole deck. Right-click a slide in the Pages panel and choose View version history. Saved versions are the milestones I name myself, like Before copy edit. Operation history lists every saved change to that page, each with its review. And restoring a version changes only that slide; every other slide, and every talk that uses them, stays as it is. This is what replaces the folder of copies from the beginning of the talk.

### 20 · JZ7U · One Main library, two Presentations

Source: referenced page Notes (resolved).

A HUANDENG project has one Main Slides library. A Presentation is an ordered list of references into it. On the left is the project overview in the Editor, with the Main library and one Presentation. On the right is this very deck. The full introduction you are watching has twenty-five slides. The lab-meeting version uses nine of the same slides in its own order: the reasons, the 1BNA slide and its Story, page history, agents, and how to start. The stacked previews and the grid are thumbnails rendered from this project's own export. Neither Presentation holds copies, so if I fix the 1BNA chart in Main Slides, both talks show the fix. The lab version gives four slides shorter speaker notes of their own; those notes belong to that appearance, not to the slide. If a talk has to stay frozen, for example one you have already submitted, you pin a named version of a slide there.

### 21 · SQNG · Working with agents

Source: referenced page Notes (resolved).

Section 5. Finally, how agents actually connect, how a talk leaves the project, what HUANDENG is built on, and how to start.

### 22 · AUBX · Agents work through the same writer as you

Source: referenced page Notes (resolved).

You keep the AI client you already use. Codex and Claude Code load the HUANDENG plugin locally over MCP; DeepSeek uses it through its Harness; ChatGPT reaches the local editor through a command-line route. Whatever the client, every write goes through the same shared writer that the editor window uses. It checks that the agent read the current version, applies exactly the change that was previewed, and returns a receipt. So an agent cannot quietly overwrite something I changed a minute ago. This version of the talk was written by Claude Code along exactly this route.

### 23 · SY94 · Check, present and export

Source: referenced page Notes (resolved).

Before delivering, run Design check. It reads the whole collection and reports observations: type sizes outside the range you chose, unexpected backgrounds, Sections without a title slide, images with too few pixels for the size they are shown at. It is read-only; you still look at the slides yourself. Present starts from the beginning with F5 or from the current slide with Shift+F5, in a full-screen window with click builds. Export takes the slides as saved when it starts. The project folder itself is the editable source. PPTX keeps supported objects native, so a co-author can keep editing text, tables and basic charts in PowerPoint; animation becomes static. PDF is for sharing, and MP4 plays the click builds on a timer. This deck was exported to PDF and PPTX in exactly this way.

### 24 · 3ECM · Built on open work, with clear gaps

Source: referenced page Notes (resolved).

HUANDENG did not start from nothing. The editor is built on OpenSlide, under the MIT licence. Equation conversion reuses code from the OpenPPTD repository; the GitHub mark here identifies that repository, it is not an OpenPPTD logo. PowerPoint export uses PptxGenJS. On the right are things HUANDENG does not do yet, as listed in the project README: importing arbitrary PPTX files and round-tripping them, editing Google Slides directly, a separate presenter window on a second screen, inheritable slide masters, native PowerPoint animation in exported files, and a plugin marketplace. If you need one of these, that is where a contribution would help most.

### 25 · SMGE · Start with your story

Source: referenced page Notes (resolved).

If you want to try it, open the editor and start a project, or open an existing deck. Connect the AI client you already use from Agent setup. Then do what I did for this talk: tell the agent your story first, out loud and freestyle, and let it organise the story before it makes any slides. After that, ask for one change at a time, read the preview, apply it, and look at the review. The code and the build commands are on the right, and the repository is at the bottom. Thank you.

## Presentation · Lab-meeting version (about 8 minutes) — 9

ID: `pres-lab`. Explicit occurrence Notes: 4.

### 01 · QMYQ · Slides that start from a story

Source: Presentation occurrence Notes.

Lab-meeting version, about eight minutes. I will skip the product tour and keep to the story: why I built this, one real slide, and how a change is made.

### 02 · PPKK · My advisor can spot AI slides at a glance

Source: Presentation occurrence Notes.

Short version: you have all seen slides that look like AI. My view is that the look comes from having no focus and no story. Even my own previous version of this talk had that problem.

### 03 · RQ64 · Two small edits should not leave three decks

Source: referenced page Notes (resolved).

The second problem appeared when I asked an agent to change a deck. Say I have fifty slides and want two of them fixed. Many agents are cautious: instead of replacing the file, they keep the original and write a new copy. One small tweak, another copy. After an afternoon the folder is full of near-identical decks, and the history is spread across file names. That made me think of Git. Version control works because the unit of change is small and every change is recorded. So in HUANDENG the page is the unit: an edit rewrites one page file and adds to that page's history, and a named version marks a milestone. The file names and edits here are an illustration, not a real folder.

### 04 · C45U · Start from the story, not from the slides

Source: referenced page Notes (resolved).

Here is the reason I care most about. If the AI makes the slides first, you then write a speech to fit them, and you end up following the AI's logic, which often has no soul. If you start by telling your story, freestyle, the way you would explain it to a colleague, the agent can organise that story, build the slides on it, and your own words become the speaker notes. Even improvised speech has a structure. Keeping it means the deck has a point of view, and you do not have to invent a script afterwards. This talk is an example: I told the story of why I built HUANDENG, and this version was rebuilt from that account.

### 05 · AVNM · 1BNA: twelve base-pair distances, kept as data

Source: Presentation occurrence Notes.

Short version: this is a real result kept as data. If a value or a label changes, the agent edits the chart object, not a picture.

### 06 · QK69 · Story tells the agent what matters

Source: referenced page Notes (resolved).

This is the part of HUANDENG that comes most directly from the story-first idea. Every slide carries a short Story: what it is for, what must be kept, and what change was asked for. Think of it as an alignment tool between me and the agent. On the right is the Story actually recorded for the 1BNA slide: keep the exact values, keep the labelled axis and its units, keep the citation, and make no claims of replicates or trends. When an agent is asked to tidy that slide, it reads this first. Story also exists for the whole project, each Section and each Presentation. An agent's Story is its interpretation, not my approval.

### 07 · 73AG · Every page has its own history

Source: referenced page Notes (resolved).

This is the feature I consider most important. History is kept per page, not for the whole deck. Right-click a slide in the Pages panel and choose View version history. Saved versions are the milestones I name myself, like Before copy edit. Operation history lists every saved change to that page, each with its review. And restoring a version changes only that slide; every other slide, and every talk that uses them, stays as it is. This is what replaces the folder of copies from the beginning of the talk.

### 08 · AUBX · Agents work through the same writer as you

Source: referenced page Notes (resolved).

You keep the AI client you already use. Codex and Claude Code load the HUANDENG plugin locally over MCP; DeepSeek uses it through its Harness; ChatGPT reaches the local editor through a command-line route. Whatever the client, every write goes through the same shared writer that the editor window uses. It checks that the agent read the current version, applies exactly the change that was previewed, and returns a receipt. So an agent cannot quietly overwrite something I changed a minute ago. This version of the talk was written by Claude Code along exactly this route.

### 09 · SMGE · Start with your story

Source: Presentation occurrence Notes.

Short version: try it on your next group-meeting deck. Tell the agent your story first, then ask for one change at a time.

