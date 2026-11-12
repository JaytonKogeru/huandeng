# Saved speaker notes — Claude Code English product introduction

Generated from the saved Main and resolved Presentation Notes on 12 November 2026 (0.21 source-link update).

Main: 26. pres-full: 26 pages, 0 occurrence Notes; pres-lab: 9 pages, 4 occurrence Notes.

## Main 1. Slides that start from a story — QMYQ

I want to tell you why I built HUANDENG, rather than list its features. It started in group meetings, with slides that everyone could tell were made by AI, and with agents that turned two small edits into three copies of a deck. HUANDENG is a desktop slide editor where you and an AI agent work on one deck, one page at a time, starting from the story you want to tell. The molecule on the right is the worked example later in the talk: the DNA dodecamer from PDB entry 1BNA.

## Main 2. Why I built it — BW88

Section 1. I will start with why. There are four reasons, and they all came from real group meetings and real attempts to make slides with AI.

## Main 3. My advisor can spot AI slides at a glance — PPKK

This is where it started. In group meetings I see more and more slides made with AI, and I think that is the direction things are going: slides are data, a file format, so of course agents will learn to make them. But my advisor, and most people in the room, can tell at a glance when a deck was made by AI. Each tool has its own style, PowerPoint, Google Slides, ChatGPT, Kimi, and they all still look like AI. I read a post on Xiaohongshu that put it well: the AI look comes from having no focus, from covering everything, from having no story, from aiming to be complete and safe. Even this talk fell into it. On the right are pages from the previous version, made by Claude Code. They look fine. My comment on them was: the visuals are good, but there is no focus, because there is no story. That is the problem this project is about.

## Main 4. Two small edits should not leave three decks — RQ64

The second problem appeared when I asked an agent to change a deck. Say I have fifty slides and want two of them fixed. Many agents are cautious: instead of replacing the file, they keep the original and write a new copy. One small tweak, another copy. After an afternoon the folder is full of near-identical decks, and the history is spread across file names. That made me think of Git. Version control works because the unit of change is small and every change is recorded. So in HUANDENG the page is the unit: an edit rewrites one page file and adds to that page's history, and a named version marks a milestone. The file names and edits here are an illustration, not a real folder.

## Main 5. Screenshots alone made agent edits slow to check — GDDR

The third problem showed up when I asked AI to work on Google Slides or PowerPoint decks. To check its own work, the agent often had to render the whole slide to a picture, look at it, and work out from the pixels which value or position to change. Images can be measured and compared, but in that loop every precise fix had to be recovered from the picture first, and it was slow. So I wanted a slide format where the agent also reads the slide as data. On the right is a real excerpt from the 1BNA slide in this very project: the figure is an object with its bounds and the file it shows, and the summary table holds its values as text. The figure itself is drawn from the CSV by a script kept in the project. An agent can inspect and change one object, one value or the data behind the figure directly, without touching anything else, and the change can be diffed. I still look at renders for composition and readability; they are a review surface, not the editable model.

## Main 6. Start from the story, not from the slides — C45U

Here is the reason I care most about. If the AI makes the slides first, you then write a speech to fit them, and you end up following the AI's logic, which often has no soul. If you start by telling your story, freestyle, the way you would explain it to a colleague, the agent can organise that story, build the slides on it, and your own words become the speaker notes. Even improvised speech has a structure. Keeping it helps the deck keep your judgment and point of view, and you do not have to invent a script afterwards. It does not by itself remove an AI look: I still review the rendered pages. This talk is an example: I told the story of why I built HUANDENG, and this version was rebuilt from that account.

## Main 7. What I built — 2SD8

Section 2. Those four problems led to one tool: an editor plus a plugin. Here is where it came from and what it looks like.

## Main 8. PPTD plus React, in a desktop editor — TFJB

So what did I build? While looking at how people are teaching agents to make slides, I met the PPTD idea in the Kimi Slides ecosystem: a deck kept as a folder of page files rather than one packed file. Then I found OpenSlide, an open-source editor where every page is a React component. I thought these two ideas fit together: PPTD as the document, React as the interface. HUANDENG is that combination, packaged as an Electron desktop app. Most of the editing behaviour comes from OpenSlide; sections, views and notes borrow from PowerPoint and WPS, and the Layers panel takes its cue from Photoshop. Next to the editor sits a plugin, so that the AI client you already use can work in the same editor. Editor plus plugin is the workflow. To be precise about credit: OpenPPTD is a different project, and we reuse only its equation-conversion code. And HUANDENG has no affiliation with Kimi.

## Main 9. Unzip a PPTX: it is already pages — 7NHP

Here is the format idea in one picture. If you unzip a PowerPoint file, you find that it is already organised by page: presentation.xml, then slide1.xml, slide2.xml and so on, with media, notes and charts as separate parts. The left column comes from this deck's own exported PPTX. PPTD keeps the same idea but leaves the parts open as a working folder: deck.pptd for the order, one .page file per slide, a media folder, and a .huandeng folder for Slide IDs, Story, Sections, Presentations and history. So an agent can open one page file, and nothing forces it to rewrite the whole deck. HUANDENG still exports PPTX when you need to send it. This introduction is one such folder.

## Main 10. The HUANDENG Editor — DKSN

This is the editor itself, open on this very talk, with the 1BNA slide selected. 1, the sidebar has four tabs: Project, Pages, Assets, and Files, which shows the project folder the way VS Code shows a code repository. Pages lists every slide with its Section, Position and Slide ID. Assets is a real library: every figure in the project, with its original size and where it is used. 2, the views above the canvas: Normal, Browse, Outline, Sections, Notes page and History. 3, the canvas edits native objects: text, images, shapes and tables. The plot you see on the 1BNA slide is a Matplotlib figure placed as an image; the data and the script that draw it live in the project folder. 4, the Inspector: properties, layout, a Layers panel in the spirit of Photoshop, the Story of the slide, and checks. 5, Agent setup connects the AI client you already use, and Activity shows what it reports and what was actually saved. 6, Export and Present. There is no chat box inside the editor.

## Main 11. Story first: one slide, start to finish — EEGK

Section 3. Now let me follow one real scientific slide: what it shows, the Story behind it, how a change is asked for, and how that change can be checked.

## Main 12. 1BNA: twelve base-pair distances, plotted from the data — AVNM

Here is the kind of slide this talk is about: one real result. The structure is PDB entry 1BNA, the Dickerson–Drew DNA dodecamer, drawn from its deposited coordinates; chain A is green, chain B ochre. For each of the twelve base pairs we measured the distance between the paired C1-prime atoms. The plot is a Matplotlib figure drawn from the CSV by a short script kept in this project, at the size it appears on the slide. If a value or a label needs to change, you change the data or the script and draw the figure again; nobody retouches pixels, and nobody retypes numbers into a slide chart. The axis deliberately does not start at zero, so the geometric variation is visible. Be careful about what it says: these are twelve positions in a single crystal structure. They are not replicates and carry no error bars. The shortest distance is at pair 7, a T–A pair in the central AATT region; the longest at pair 12, a terminal G–C pair.

Method: Euclidean distance between C1′ atoms, chain A residues 1–12 ascending paired with chain B residues 24–13 descending. Values in sources/independent-20261111/science/paired-c1-distances.csv, computed from the RCSB file by generate_1bna.py; figure by plot_c1_distances.py (PNG, SVG and PDF).

Source: RCSB PDB 1BNA, https://www.rcsb.org/structure/1BNA; structure DOI 10.2210/pdb1BNA/pdb. Drew HR, Wing RM, Takano T, Broka C, Tanaka S, Itakura K, Dickerson RE. PNAS 78 (1981) 2179–2183, https://doi.org/10.1073/pnas.78.4.2179.

## Main 13. Story tells the agent what matters — QK69

This is the part of HUANDENG that comes most directly from the story-first idea. Every slide carries a short Story: what it is for, what must be kept, and what change was asked for. Think of it as an alignment tool between me and the agent. On the left is the Story tab in the Inspector, for the 1BNA slide; on the right, the same Story at a readable size. Keep the exact values, keep the labelled axis and its units, keep the citation, make no claims of replicates or trends, and never retouch the figure. The change came from my own feedback while preparing this talk: data plots should be drawn with a professional tool such as a Python package, from the data, not built inside the slide. Charts drawn inside slides are one of the strongest sources of the AI look. The request says what to change and, just as important, what must not move. When an agent works on that slide, it reads this first. Story also exists for the whole project, each Section and each Presentation. An agent’s Story is its interpretation, not my approval.

## Main 14. Outline: read the deck as a story — AZJC

Before polishing any single slide, I read the deck as a story. This is the Outline view of this talk, at the start of the worked example: every slide with its Position, its title, the purpose from its Story and its Slide ID, grouped by Section, so I can see whether the argument holds. The 1BNA slide is selected. Browse shows the same slides as thumbnails, for density and rhythm. Sections divide the talk into parts; each starts at a stable first slide and runs to the next.

## Main 15. One requested change, before and after — 6FNH

Here is one change from start to finish, on the 1BNA slide itself. When I reviewed the deck, my feedback was direct: data plots should be drawn with a professional tool, such as a Python package, from the data, not built inside the slide. A chart drawn inside a slide is one of the strongest sources of the AI look; even here, the agent had already had to patch its labels once, because PowerPoint placed them differently. So the request in the Story was: replace the slide chart with a Matplotlib figure drawn from the CSV, and keep the values, the axis range, the citation and the summary table. On the left is the slide before; on the right, after, at the same scale. The table lists what changed: the numbers now live in the data file and a short plotting script in the project, and the figure is regenerated from them, never retouched. The change was proposed as a transaction, previewed and applied through the shared writer, so it can be reviewed on the next slide.

## Main 16. Every saved change can be reviewed — 4V98

After the change is saved, anyone can open its record, and this is where to find it. 1, the Activity panel lists every saved writer receipt with the slides it touched; Review changes opens it. 2, the receipt says which operation it was, who made it and when: here, Claude Code at 10:53 in the evening. 3, Before and After show the actual slide in both states. 4, Saved changes lists every object and field that was written: the slide chart and its two axis titles removed, the new figure added, the title, the lead, the speaker notes and the Story. This dialog is read-only. If you want the old slide back, you restore a named version from History, which affects only that slide. Changes from people and from agents arrive through the same writer, so they are reviewed in the same way.

## Main 17. The page is the unit of change — KM5E

Section 4. Back to the Git idea: if the page is the unit of change, each page needs a name that does not move, and a history of its own.

## Main 18. Say “SMGE”, not “slide 25” — V2SV

When I talk to an agent about my slides, I used to say: fix slide four. But if the order changed since the last version, slide four is a different slide. So HUANDENG separates the two. Position is just where a slide sits now. The Slide ID is a short four-character code, letters and numbers, that belongs to the slide for good. This happened while I was preparing this talk: I added the acknowledgments slide near the end, and the closing slide moved from Position 25 to 26. Its Slide ID stayed SMGE. Now I can say: change the commands on SMGE, and the agent knows exactly which page I mean, next week as well as today. The same ID is what page history hangs on.

## Main 19. Every page has its own history — 73AG

This is the feature I consider most important. History is kept per page, not for the whole deck. Open the History view, or right-click a slide in the Pages panel and choose View version history. Here is the 1BNA slide. Saved versions are named milestones: Before Matplotlib figure and Matplotlib figure were recorded around the change you just saw, and below them the earlier axis-label fix. Versions recorded from the command line are labelled human in this list, even though the agent recorded them. Operation history lists every saved change to that page, each with its review. And restoring a version changes only that slide; every other slide, and every talk that uses them, stays as it is. This is what replaces the folder of copies from the beginning of the talk.

## Main 20. One Main library, two Presentations — JZ7U

A HUANDENG project has one Main Slides library. A Presentation is an ordered list of references into it. On the left is the Project tab for this deck: the Main library with twenty-six slides and five Sections, and the two Presentations built from it. On the right, the same two talks. The full introduction has twenty-six slides. The lab-meeting version uses nine of the same slides in its own order: the reasons, the 1BNA slide and its Story, page history, agents, and how to start. The stacked previews and the grid are rendered from this project. Neither Presentation holds copies, so when the 1BNA plot was replaced in Main Slides, both talks showed the new figure. The lab version gives four slides shorter speaker notes of their own; those notes belong to that appearance, not to the slide. If a talk has to stay frozen, for example one you have already submitted, you pin a named version of a slide there.

## Main 21. Working with agents — SQNG

Section 5. Finally, how agents actually connect, how a talk leaves the project, what HUANDENG is built on, and how to start.

## Main 22. Agents work through the same writer as you — AUBX

You keep the AI client you already use. Codex and Claude Code load the HUANDENG plugin locally over MCP; DeepSeek uses it through its Harness; ChatGPT reaches the local editor through a command-line route. Whatever the client, every write goes through the same shared writer that the editor window uses. The writer saves one transaction at a time and checks the revisions each request read. So several people and agents can work on one project: edits to different pages can both be saved, while a second edit to the same page, even to a different object, is refused if it was prepared from an older version. Story, Section and Presentation information shares one metadata revision, so those edits can conflict too. After a refusal, read the saved result and prepare a fresh preview. In 0.19 this was tested for real: a native DeepSeek Harness session and ChatGPT shared a three-page test project. Their independent page edits both survived, a stale same-page write was rejected once, and the following style handoff kept the other client's content. That run did not include a native Claude Code session, and it is not a claim of simultaneous raw file writes. There are no section locks, no automatic scheduling and no online presence: you agree who does what, and for a handoff you name the operation, the page and the revision. An agent's activity report is its own claim; the writer receipt is the record of what was saved. This version of the talk was written by Claude Code along this route.

## Main 23. Check, present and export — SY94

Before delivering, run Design check. It reads the whole collection and reports observations: type sizes outside the range you chose, unexpected backgrounds, Sections without a title slide, images with too few pixels for the size they are shown at. It is read-only; you still look at the slides yourself. Present starts from the beginning with F5 or from the current slide with Shift+F5, in a full-screen window with click builds. Export takes the slides as saved when it starts. The project folder itself is the editable source. PPTX keeps supported objects native, so a co-author can keep editing text, tables and basic charts in PowerPoint; animation becomes static. PDF is for sharing, and MP4 plays the click builds on a timer. This deck was exported to PDF and PPTX in exactly this way.

## Main 24. Built on open work, with clear gaps — 3ECM

HUANDENG did not start from nothing. The editor is built on OpenSlide, under the MIT licence. Equation conversion reuses code from the OpenPPTD repository; the GitHub mark here identifies that repository, it is not an OpenPPTD logo. PowerPoint export uses PptxGenJS. On the right are things HUANDENG does not do yet, as listed in the project README: importing arbitrary PPTX files and round-tripping them, editing Google Slides directly, a separate presenter window on a second screen, inheritable slide masters, native PowerPoint animation in exported files, and a plugin marketplace. If you need one of these, that is where a contribution would help most.

Reference URLs (names link to source repositories or official sites):
HUANDENG: https://github.com/JaytonKogeru/huandeng
OpenSlide: https://github.com/open-slide/open-slide
OpenPPTD: https://github.com/Shingwha/open-pptd
PptxGenJS: https://github.com/gitbrent/PptxGenJS
PowerPoint: https://www.microsoft.com/microsoft-365/powerpoint
WPS: https://www.wps.com/
Kimi / Moonshot AI: https://www.kimi.com/
open-kimi-ppt-skill: https://github.com/Amonginin/open-kimi-ppt-skill
PPTist: https://github.com/pipipi-pikachu/PPTist
VS Code: https://github.com/microsoft/vscode
Slidev: https://github.com/slidevjs/slidev
Presenton: https://github.com/presenton/presenton
PPTAgent: https://github.com/icip-cas/PPTAgent
PPTMaster: https://github.com/hugohe3/ppt-master
OpenSlides Studio: https://gitlab.com/open-slides/openslides
OPF: https://github.com/OpenPresentation/opf
Apache ECharts: https://github.com/apache/echarts
KaTeX: https://github.com/KaTeX/KaTeX
Font Awesome: https://github.com/FortAwesome/Font-Awesome
OpenSlides Studio website: https://openslides.dev/
OPF website: https://www.openpresentation.org/

## Main 25. Acknowledgments — 9JFE

Before the last slide, the people and projects this work stands on. Three of them are in the code. OpenSlide is the foundation: the editor, canvas, Inspector, presentation and export come from it. Three equation-conversion modules come from OpenPPTD, and PptxGenJS writes the PowerPoint files. Everything else is a relationship of ideas, not code. I first met the PPTD idea in the Kimi Slides ecosystem, and the community open-kimi-ppt-skill notes helped with the format. PowerPoint, WPS and VS Code shaped the workspace: sections, notes, views, tabs and panels. OpenSlides Studio and the OpenPresentation format shaped how objects get stable IDs and how changes are checked against a revision. And I studied PPTist, Slidev, Presenton, PPTAgent and PPT Master as alternatives; each solves part of this problem well, and each taught me something specific. None of them endorses HUANDENG. The full list, with links and what was adopted, is in docs/ACKNOWLEDGMENTS.md in the repository.

Reference URLs (names link to source repositories or official sites):
HUANDENG: https://github.com/JaytonKogeru/huandeng
OpenSlide: https://github.com/open-slide/open-slide
OpenPPTD: https://github.com/Shingwha/open-pptd
PptxGenJS: https://github.com/gitbrent/PptxGenJS
PowerPoint: https://www.microsoft.com/microsoft-365/powerpoint
WPS: https://www.wps.com/
Kimi / Moonshot AI: https://www.kimi.com/
open-kimi-ppt-skill: https://github.com/Amonginin/open-kimi-ppt-skill
PPTist: https://github.com/pipipi-pikachu/PPTist
VS Code: https://github.com/microsoft/vscode
Slidev: https://github.com/slidevjs/slidev
Presenton: https://github.com/presenton/presenton
PPTAgent: https://github.com/icip-cas/PPTAgent
PPTMaster: https://github.com/hugohe3/ppt-master
OpenSlides Studio: https://gitlab.com/open-slides/openslides
OPF: https://github.com/OpenPresentation/opf
Apache ECharts: https://github.com/apache/echarts
KaTeX: https://github.com/KaTeX/KaTeX
Font Awesome: https://github.com/FortAwesome/Font-Awesome
OpenSlides Studio website: https://openslides.dev/
OPF website: https://www.openpresentation.org/

## Main 26. Start with your story — SMGE

If you want to try it, open the editor and start a project, or open an existing one. You can open the .pptd file itself, or the project folder, as long as that folder directly contains exactly one .pptd; if it has none, or several, the Editor says so and asks you to choose the file. The folder is the project: pages, media and the .huandeng metadata live beside the .pptd, so copy or share the whole folder, not just the .pptd. Connect the AI client you already use from Agent setup. Then do what I did for this talk: tell the agent your story first, out loud and freestyle, and let it organise the story before it makes any slides. After that, ask for one change at a time, read the preview, apply it, and look at the review. The code and the build commands are on the right, and the repository is at the bottom. Thank you.

## Presentation HUANDENG introduction (full, about 25 minutes) — pres-full

### 1. Main 1 · QMYQ · Main Notes

I want to tell you why I built HUANDENG, rather than list its features. It started in group meetings, with slides that everyone could tell were made by AI, and with agents that turned two small edits into three copies of a deck. HUANDENG is a desktop slide editor where you and an AI agent work on one deck, one page at a time, starting from the story you want to tell. The molecule on the right is the worked example later in the talk: the DNA dodecamer from PDB entry 1BNA.

### 2. Main 2 · BW88 · Main Notes

Section 1. I will start with why. There are four reasons, and they all came from real group meetings and real attempts to make slides with AI.

### 3. Main 3 · PPKK · Main Notes

This is where it started. In group meetings I see more and more slides made with AI, and I think that is the direction things are going: slides are data, a file format, so of course agents will learn to make them. But my advisor, and most people in the room, can tell at a glance when a deck was made by AI. Each tool has its own style, PowerPoint, Google Slides, ChatGPT, Kimi, and they all still look like AI. I read a post on Xiaohongshu that put it well: the AI look comes from having no focus, from covering everything, from having no story, from aiming to be complete and safe. Even this talk fell into it. On the right are pages from the previous version, made by Claude Code. They look fine. My comment on them was: the visuals are good, but there is no focus, because there is no story. That is the problem this project is about.

### 4. Main 4 · RQ64 · Main Notes

The second problem appeared when I asked an agent to change a deck. Say I have fifty slides and want two of them fixed. Many agents are cautious: instead of replacing the file, they keep the original and write a new copy. One small tweak, another copy. After an afternoon the folder is full of near-identical decks, and the history is spread across file names. That made me think of Git. Version control works because the unit of change is small and every change is recorded. So in HUANDENG the page is the unit: an edit rewrites one page file and adds to that page's history, and a named version marks a milestone. The file names and edits here are an illustration, not a real folder.

### 5. Main 5 · GDDR · Main Notes

The third problem showed up when I asked AI to work on Google Slides or PowerPoint decks. To check its own work, the agent often had to render the whole slide to a picture, look at it, and work out from the pixels which value or position to change. Images can be measured and compared, but in that loop every precise fix had to be recovered from the picture first, and it was slow. So I wanted a slide format where the agent also reads the slide as data. On the right is a real excerpt from the 1BNA slide in this very project: the figure is an object with its bounds and the file it shows, and the summary table holds its values as text. The figure itself is drawn from the CSV by a script kept in the project. An agent can inspect and change one object, one value or the data behind the figure directly, without touching anything else, and the change can be diffed. I still look at renders for composition and readability; they are a review surface, not the editable model.

### 6. Main 6 · C45U · Main Notes

Here is the reason I care most about. If the AI makes the slides first, you then write a speech to fit them, and you end up following the AI's logic, which often has no soul. If you start by telling your story, freestyle, the way you would explain it to a colleague, the agent can organise that story, build the slides on it, and your own words become the speaker notes. Even improvised speech has a structure. Keeping it helps the deck keep your judgment and point of view, and you do not have to invent a script afterwards. It does not by itself remove an AI look: I still review the rendered pages. This talk is an example: I told the story of why I built HUANDENG, and this version was rebuilt from that account.

### 7. Main 7 · 2SD8 · Main Notes

Section 2. Those four problems led to one tool: an editor plus a plugin. Here is where it came from and what it looks like.

### 8. Main 8 · TFJB · Main Notes

So what did I build? While looking at how people are teaching agents to make slides, I met the PPTD idea in the Kimi Slides ecosystem: a deck kept as a folder of page files rather than one packed file. Then I found OpenSlide, an open-source editor where every page is a React component. I thought these two ideas fit together: PPTD as the document, React as the interface. HUANDENG is that combination, packaged as an Electron desktop app. Most of the editing behaviour comes from OpenSlide; sections, views and notes borrow from PowerPoint and WPS, and the Layers panel takes its cue from Photoshop. Next to the editor sits a plugin, so that the AI client you already use can work in the same editor. Editor plus plugin is the workflow. To be precise about credit: OpenPPTD is a different project, and we reuse only its equation-conversion code. And HUANDENG has no affiliation with Kimi.

### 9. Main 9 · 7NHP · Main Notes

Here is the format idea in one picture. If you unzip a PowerPoint file, you find that it is already organised by page: presentation.xml, then slide1.xml, slide2.xml and so on, with media, notes and charts as separate parts. The left column comes from this deck's own exported PPTX. PPTD keeps the same idea but leaves the parts open as a working folder: deck.pptd for the order, one .page file per slide, a media folder, and a .huandeng folder for Slide IDs, Story, Sections, Presentations and history. So an agent can open one page file, and nothing forces it to rewrite the whole deck. HUANDENG still exports PPTX when you need to send it. This introduction is one such folder.

### 10. Main 10 · DKSN · Main Notes

This is the editor itself, open on this very talk, with the 1BNA slide selected. 1, the sidebar has four tabs: Project, Pages, Assets, and Files, which shows the project folder the way VS Code shows a code repository. Pages lists every slide with its Section, Position and Slide ID. Assets is a real library: every figure in the project, with its original size and where it is used. 2, the views above the canvas: Normal, Browse, Outline, Sections, Notes page and History. 3, the canvas edits native objects: text, images, shapes and tables. The plot you see on the 1BNA slide is a Matplotlib figure placed as an image; the data and the script that draw it live in the project folder. 4, the Inspector: properties, layout, a Layers panel in the spirit of Photoshop, the Story of the slide, and checks. 5, Agent setup connects the AI client you already use, and Activity shows what it reports and what was actually saved. 6, Export and Present. There is no chat box inside the editor.

### 11. Main 11 · EEGK · Main Notes

Section 3. Now let me follow one real scientific slide: what it shows, the Story behind it, how a change is asked for, and how that change can be checked.

### 12. Main 12 · AVNM · Main Notes

Here is the kind of slide this talk is about: one real result. The structure is PDB entry 1BNA, the Dickerson–Drew DNA dodecamer, drawn from its deposited coordinates; chain A is green, chain B ochre. For each of the twelve base pairs we measured the distance between the paired C1-prime atoms. The plot is a Matplotlib figure drawn from the CSV by a short script kept in this project, at the size it appears on the slide. If a value or a label needs to change, you change the data or the script and draw the figure again; nobody retouches pixels, and nobody retypes numbers into a slide chart. The axis deliberately does not start at zero, so the geometric variation is visible. Be careful about what it says: these are twelve positions in a single crystal structure. They are not replicates and carry no error bars. The shortest distance is at pair 7, a T–A pair in the central AATT region; the longest at pair 12, a terminal G–C pair.

Method: Euclidean distance between C1′ atoms, chain A residues 1–12 ascending paired with chain B residues 24–13 descending. Values in sources/independent-20261111/science/paired-c1-distances.csv, computed from the RCSB file by generate_1bna.py; figure by plot_c1_distances.py (PNG, SVG and PDF).

Source: RCSB PDB 1BNA, https://www.rcsb.org/structure/1BNA; structure DOI 10.2210/pdb1BNA/pdb. Drew HR, Wing RM, Takano T, Broka C, Tanaka S, Itakura K, Dickerson RE. PNAS 78 (1981) 2179–2183, https://doi.org/10.1073/pnas.78.4.2179.

### 13. Main 13 · QK69 · Main Notes

This is the part of HUANDENG that comes most directly from the story-first idea. Every slide carries a short Story: what it is for, what must be kept, and what change was asked for. Think of it as an alignment tool between me and the agent. On the left is the Story tab in the Inspector, for the 1BNA slide; on the right, the same Story at a readable size. Keep the exact values, keep the labelled axis and its units, keep the citation, make no claims of replicates or trends, and never retouch the figure. The change came from my own feedback while preparing this talk: data plots should be drawn with a professional tool such as a Python package, from the data, not built inside the slide. Charts drawn inside slides are one of the strongest sources of the AI look. The request says what to change and, just as important, what must not move. When an agent works on that slide, it reads this first. Story also exists for the whole project, each Section and each Presentation. An agent’s Story is its interpretation, not my approval.

### 14. Main 14 · AZJC · Main Notes

Before polishing any single slide, I read the deck as a story. This is the Outline view of this talk, at the start of the worked example: every slide with its Position, its title, the purpose from its Story and its Slide ID, grouped by Section, so I can see whether the argument holds. The 1BNA slide is selected. Browse shows the same slides as thumbnails, for density and rhythm. Sections divide the talk into parts; each starts at a stable first slide and runs to the next.

### 15. Main 15 · 6FNH · Main Notes

Here is one change from start to finish, on the 1BNA slide itself. When I reviewed the deck, my feedback was direct: data plots should be drawn with a professional tool, such as a Python package, from the data, not built inside the slide. A chart drawn inside a slide is one of the strongest sources of the AI look; even here, the agent had already had to patch its labels once, because PowerPoint placed them differently. So the request in the Story was: replace the slide chart with a Matplotlib figure drawn from the CSV, and keep the values, the axis range, the citation and the summary table. On the left is the slide before; on the right, after, at the same scale. The table lists what changed: the numbers now live in the data file and a short plotting script in the project, and the figure is regenerated from them, never retouched. The change was proposed as a transaction, previewed and applied through the shared writer, so it can be reviewed on the next slide.

### 16. Main 16 · 4V98 · Main Notes

After the change is saved, anyone can open its record, and this is where to find it. 1, the Activity panel lists every saved writer receipt with the slides it touched; Review changes opens it. 2, the receipt says which operation it was, who made it and when: here, Claude Code at 10:53 in the evening. 3, Before and After show the actual slide in both states. 4, Saved changes lists every object and field that was written: the slide chart and its two axis titles removed, the new figure added, the title, the lead, the speaker notes and the Story. This dialog is read-only. If you want the old slide back, you restore a named version from History, which affects only that slide. Changes from people and from agents arrive through the same writer, so they are reviewed in the same way.

### 17. Main 17 · KM5E · Main Notes

Section 4. Back to the Git idea: if the page is the unit of change, each page needs a name that does not move, and a history of its own.

### 18. Main 18 · V2SV · Main Notes

When I talk to an agent about my slides, I used to say: fix slide four. But if the order changed since the last version, slide four is a different slide. So HUANDENG separates the two. Position is just where a slide sits now. The Slide ID is a short four-character code, letters and numbers, that belongs to the slide for good. This happened while I was preparing this talk: I added the acknowledgments slide near the end, and the closing slide moved from Position 25 to 26. Its Slide ID stayed SMGE. Now I can say: change the commands on SMGE, and the agent knows exactly which page I mean, next week as well as today. The same ID is what page history hangs on.

### 19. Main 19 · 73AG · Main Notes

This is the feature I consider most important. History is kept per page, not for the whole deck. Open the History view, or right-click a slide in the Pages panel and choose View version history. Here is the 1BNA slide. Saved versions are named milestones: Before Matplotlib figure and Matplotlib figure were recorded around the change you just saw, and below them the earlier axis-label fix. Versions recorded from the command line are labelled human in this list, even though the agent recorded them. Operation history lists every saved change to that page, each with its review. And restoring a version changes only that slide; every other slide, and every talk that uses them, stays as it is. This is what replaces the folder of copies from the beginning of the talk.

### 20. Main 20 · JZ7U · Main Notes

A HUANDENG project has one Main Slides library. A Presentation is an ordered list of references into it. On the left is the Project tab for this deck: the Main library with twenty-six slides and five Sections, and the two Presentations built from it. On the right, the same two talks. The full introduction has twenty-six slides. The lab-meeting version uses nine of the same slides in its own order: the reasons, the 1BNA slide and its Story, page history, agents, and how to start. The stacked previews and the grid are rendered from this project. Neither Presentation holds copies, so when the 1BNA plot was replaced in Main Slides, both talks showed the new figure. The lab version gives four slides shorter speaker notes of their own; those notes belong to that appearance, not to the slide. If a talk has to stay frozen, for example one you have already submitted, you pin a named version of a slide there.

### 21. Main 21 · SQNG · Main Notes

Section 5. Finally, how agents actually connect, how a talk leaves the project, what HUANDENG is built on, and how to start.

### 22. Main 22 · AUBX · Main Notes

You keep the AI client you already use. Codex and Claude Code load the HUANDENG plugin locally over MCP; DeepSeek uses it through its Harness; ChatGPT reaches the local editor through a command-line route. Whatever the client, every write goes through the same shared writer that the editor window uses. The writer saves one transaction at a time and checks the revisions each request read. So several people and agents can work on one project: edits to different pages can both be saved, while a second edit to the same page, even to a different object, is refused if it was prepared from an older version. Story, Section and Presentation information shares one metadata revision, so those edits can conflict too. After a refusal, read the saved result and prepare a fresh preview. In 0.19 this was tested for real: a native DeepSeek Harness session and ChatGPT shared a three-page test project. Their independent page edits both survived, a stale same-page write was rejected once, and the following style handoff kept the other client's content. That run did not include a native Claude Code session, and it is not a claim of simultaneous raw file writes. There are no section locks, no automatic scheduling and no online presence: you agree who does what, and for a handoff you name the operation, the page and the revision. An agent's activity report is its own claim; the writer receipt is the record of what was saved. This version of the talk was written by Claude Code along this route.

### 23. Main 23 · SY94 · Main Notes

Before delivering, run Design check. It reads the whole collection and reports observations: type sizes outside the range you chose, unexpected backgrounds, Sections without a title slide, images with too few pixels for the size they are shown at. It is read-only; you still look at the slides yourself. Present starts from the beginning with F5 or from the current slide with Shift+F5, in a full-screen window with click builds. Export takes the slides as saved when it starts. The project folder itself is the editable source. PPTX keeps supported objects native, so a co-author can keep editing text, tables and basic charts in PowerPoint; animation becomes static. PDF is for sharing, and MP4 plays the click builds on a timer. This deck was exported to PDF and PPTX in exactly this way.

### 24. Main 24 · 3ECM · Main Notes

HUANDENG did not start from nothing. The editor is built on OpenSlide, under the MIT licence. Equation conversion reuses code from the OpenPPTD repository; the GitHub mark here identifies that repository, it is not an OpenPPTD logo. PowerPoint export uses PptxGenJS. On the right are things HUANDENG does not do yet, as listed in the project README: importing arbitrary PPTX files and round-tripping them, editing Google Slides directly, a separate presenter window on a second screen, inheritable slide masters, native PowerPoint animation in exported files, and a plugin marketplace. If you need one of these, that is where a contribution would help most.

Reference URLs (names link to source repositories or official sites):
HUANDENG: https://github.com/JaytonKogeru/huandeng
OpenSlide: https://github.com/open-slide/open-slide
OpenPPTD: https://github.com/Shingwha/open-pptd
PptxGenJS: https://github.com/gitbrent/PptxGenJS
PowerPoint: https://www.microsoft.com/microsoft-365/powerpoint
WPS: https://www.wps.com/
Kimi / Moonshot AI: https://www.kimi.com/
open-kimi-ppt-skill: https://github.com/Amonginin/open-kimi-ppt-skill
PPTist: https://github.com/pipipi-pikachu/PPTist
VS Code: https://github.com/microsoft/vscode
Slidev: https://github.com/slidevjs/slidev
Presenton: https://github.com/presenton/presenton
PPTAgent: https://github.com/icip-cas/PPTAgent
PPTMaster: https://github.com/hugohe3/ppt-master
OpenSlides Studio: https://gitlab.com/open-slides/openslides
OPF: https://github.com/OpenPresentation/opf
Apache ECharts: https://github.com/apache/echarts
KaTeX: https://github.com/KaTeX/KaTeX
Font Awesome: https://github.com/FortAwesome/Font-Awesome
OpenSlides Studio website: https://openslides.dev/
OPF website: https://www.openpresentation.org/

### 25. Main 25 · 9JFE · Main Notes

Before the last slide, the people and projects this work stands on. Three of them are in the code. OpenSlide is the foundation: the editor, canvas, Inspector, presentation and export come from it. Three equation-conversion modules come from OpenPPTD, and PptxGenJS writes the PowerPoint files. Everything else is a relationship of ideas, not code. I first met the PPTD idea in the Kimi Slides ecosystem, and the community open-kimi-ppt-skill notes helped with the format. PowerPoint, WPS and VS Code shaped the workspace: sections, notes, views, tabs and panels. OpenSlides Studio and the OpenPresentation format shaped how objects get stable IDs and how changes are checked against a revision. And I studied PPTist, Slidev, Presenton, PPTAgent and PPT Master as alternatives; each solves part of this problem well, and each taught me something specific. None of them endorses HUANDENG. The full list, with links and what was adopted, is in docs/ACKNOWLEDGMENTS.md in the repository.

Reference URLs (names link to source repositories or official sites):
HUANDENG: https://github.com/JaytonKogeru/huandeng
OpenSlide: https://github.com/open-slide/open-slide
OpenPPTD: https://github.com/Shingwha/open-pptd
PptxGenJS: https://github.com/gitbrent/PptxGenJS
PowerPoint: https://www.microsoft.com/microsoft-365/powerpoint
WPS: https://www.wps.com/
Kimi / Moonshot AI: https://www.kimi.com/
open-kimi-ppt-skill: https://github.com/Amonginin/open-kimi-ppt-skill
PPTist: https://github.com/pipipi-pikachu/PPTist
VS Code: https://github.com/microsoft/vscode
Slidev: https://github.com/slidevjs/slidev
Presenton: https://github.com/presenton/presenton
PPTAgent: https://github.com/icip-cas/PPTAgent
PPTMaster: https://github.com/hugohe3/ppt-master
OpenSlides Studio: https://gitlab.com/open-slides/openslides
OPF: https://github.com/OpenPresentation/opf
Apache ECharts: https://github.com/apache/echarts
KaTeX: https://github.com/KaTeX/KaTeX
Font Awesome: https://github.com/FortAwesome/Font-Awesome
OpenSlides Studio website: https://openslides.dev/
OPF website: https://www.openpresentation.org/

### 26. Main 26 · SMGE · Main Notes

If you want to try it, open the editor and start a project, or open an existing one. You can open the .pptd file itself, or the project folder, as long as that folder directly contains exactly one .pptd; if it has none, or several, the Editor says so and asks you to choose the file. The folder is the project: pages, media and the .huandeng metadata live beside the .pptd, so copy or share the whole folder, not just the .pptd. Connect the AI client you already use from Agent setup. Then do what I did for this talk: tell the agent your story first, out loud and freestyle, and let it organise the story before it makes any slides. After that, ask for one change at a time, read the preview, apply it, and look at the review. The code and the build commands are on the right, and the repository is at the bottom. Thank you.

## Presentation Lab-meeting version (about 8 minutes) — pres-lab

### 1. Main 1 · QMYQ · occurrence Notes

Lab-meeting version, about eight minutes. I will skip the product tour and keep to the story: why I built this, one real slide, and how a change is made.

### 2. Main 3 · PPKK · occurrence Notes

Short version: you have all seen slides that look like AI. My view is that the look comes from having no focus and no story. Even my own previous version of this talk had that problem.

### 3. Main 4 · RQ64 · Main Notes

The second problem appeared when I asked an agent to change a deck. Say I have fifty slides and want two of them fixed. Many agents are cautious: instead of replacing the file, they keep the original and write a new copy. One small tweak, another copy. After an afternoon the folder is full of near-identical decks, and the history is spread across file names. That made me think of Git. Version control works because the unit of change is small and every change is recorded. So in HUANDENG the page is the unit: an edit rewrites one page file and adds to that page's history, and a named version marks a milestone. The file names and edits here are an illustration, not a real folder.

### 4. Main 6 · C45U · Main Notes

Here is the reason I care most about. If the AI makes the slides first, you then write a speech to fit them, and you end up following the AI's logic, which often has no soul. If you start by telling your story, freestyle, the way you would explain it to a colleague, the agent can organise that story, build the slides on it, and your own words become the speaker notes. Even improvised speech has a structure. Keeping it helps the deck keep your judgment and point of view, and you do not have to invent a script afterwards. It does not by itself remove an AI look: I still review the rendered pages. This talk is an example: I told the story of why I built HUANDENG, and this version was rebuilt from that account.

### 5. Main 12 · AVNM · occurrence Notes

Short version: this is a real result. The plot is drawn with Matplotlib from the data file, so if a value or a label changes, the agent changes the data or the script and redraws the figure, never the pixels.

### 6. Main 13 · QK69 · Main Notes

This is the part of HUANDENG that comes most directly from the story-first idea. Every slide carries a short Story: what it is for, what must be kept, and what change was asked for. Think of it as an alignment tool between me and the agent. On the left is the Story tab in the Inspector, for the 1BNA slide; on the right, the same Story at a readable size. Keep the exact values, keep the labelled axis and its units, keep the citation, make no claims of replicates or trends, and never retouch the figure. The change came from my own feedback while preparing this talk: data plots should be drawn with a professional tool such as a Python package, from the data, not built inside the slide. Charts drawn inside slides are one of the strongest sources of the AI look. The request says what to change and, just as important, what must not move. When an agent works on that slide, it reads this first. Story also exists for the whole project, each Section and each Presentation. An agent’s Story is its interpretation, not my approval.

### 7. Main 19 · 73AG · Main Notes

This is the feature I consider most important. History is kept per page, not for the whole deck. Open the History view, or right-click a slide in the Pages panel and choose View version history. Here is the 1BNA slide. Saved versions are named milestones: Before Matplotlib figure and Matplotlib figure were recorded around the change you just saw, and below them the earlier axis-label fix. Versions recorded from the command line are labelled human in this list, even though the agent recorded them. Operation history lists every saved change to that page, each with its review. And restoring a version changes only that slide; every other slide, and every talk that uses them, stays as it is. This is what replaces the folder of copies from the beginning of the talk.

### 8. Main 22 · AUBX · Main Notes

You keep the AI client you already use. Codex and Claude Code load the HUANDENG plugin locally over MCP; DeepSeek uses it through its Harness; ChatGPT reaches the local editor through a command-line route. Whatever the client, every write goes through the same shared writer that the editor window uses. The writer saves one transaction at a time and checks the revisions each request read. So several people and agents can work on one project: edits to different pages can both be saved, while a second edit to the same page, even to a different object, is refused if it was prepared from an older version. Story, Section and Presentation information shares one metadata revision, so those edits can conflict too. After a refusal, read the saved result and prepare a fresh preview. In 0.19 this was tested for real: a native DeepSeek Harness session and ChatGPT shared a three-page test project. Their independent page edits both survived, a stale same-page write was rejected once, and the following style handoff kept the other client's content. That run did not include a native Claude Code session, and it is not a claim of simultaneous raw file writes. There are no section locks, no automatic scheduling and no online presence: you agree who does what, and for a handoff you name the operation, the page and the revision. An agent's activity report is its own claim; the writer receipt is the record of what was saved. This version of the talk was written by Claude Code along this route.

### 9. Main 26 · SMGE · occurrence Notes

Short version: try it on your next group-meeting deck. Tell the agent your story first, then ask for one change at a time.
