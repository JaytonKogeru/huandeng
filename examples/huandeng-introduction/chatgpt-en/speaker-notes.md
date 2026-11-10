# Why I started HUANDENG: speaker notes

Extracted from the actual project Notes. Continue editing on the corresponding page.

## Full introduction

### 1. Why I started HUANDENG · 9DAA

I want to begin with why I started HUANDENG. At lab meetings, I wanted AI to help prepare slides while keeping my own judgment visible. I also kept running into another problem: changing two slides could leave me with another complete copy of the deck. Those experiences led me to put the human story, page identity and editable material into one project.

### 2. I still wanted agents to make slides · YSGH

I was not looking for a return to doing everything by hand. Slides are files and structured data. If an agent can work with code, objects and sources, I expect it to become a capable slide author too. That is my starting belief. The question for me was how to keep my own explanation intact as more of the preparation becomes automated.

Account source: sources/story/USER-STORY.zh-CN.md. The explanation is based on the founder’s personal experience and design judgment.

### 3. At lab meetings, people could tell · P72R

At lab meetings and other presentations, I noticed how readily people recognized AI-made slides. The tools had different styles, but the slides often tried to cover everything. I found the same problem in my own introduction: there was plenty of material, yet the point was hard to follow. The images here are earlier pages from my own introduction. These pages made me look again at the story I was trying to tell.

Account source: sources/story/USER-STORY.zh-CN.md. The explanation is based on the founder’s personal experience and design judgment.

### 4. Change two of fifty slides. Another full copy? · 2XM9

The second problem was mundane. Suppose I already had fifty slides and wanted to change two. Some agents would preserve the original by creating another complete deck. With repeated edits, the directory could fill with dated copies. Git suggested a useful principle: record what changed in the unit being edited, rather than preserving every small revision as another full presentation.

Account source: sources/story/USER-STORY.zh-CN.md. The explanation is based on the founder’s personal experience and design judgment.

### 5. Seeing the slide is only part of editing it · GX5Z

The third problem was precision. Screenshots are useful: I still need to see the composition and judge whether figures and labels work together. But a screenshot alone does not identify the object, its data or its uses elsewhere in a project. I wanted the picture and the structure together. The structure enables precise edits and checks; it does not replace looking at the slide.

Account source: sources/story/USER-STORY.zh-CN.md. The explanation is based on the founder’s personal experience and design judgment.

### 6. So I wanted to tell the story first · KW5P

My working hypothesis is that the AI feel comes partly from trying to cover everything without deciding what matters. I would rather speak first, even roughly, and have the agent organize the logic already present in that account. That is what I did for this introduction. The talk and the slides can then grow from the same reasoning, instead of my inventing a speech to fit a deck the AI has already made.

Account source: sources/story/USER-STORY.zh-CN.md. The explanation is based on the founder’s personal experience and design judgment.

### 7. The ideas I brought together · 5HW8

I then looked for existing work I could build on. I encountered the PPTD approach in the Kimi Slides ecosystem. OpenSlide already connected React pages to a canvas and editing tools. HUANDENG builds on the OpenSlide codebase, with a PPTD document model and an Electron desktop application. These existing projects gave me foundations to combine. OpenPPTD contributes the formula conversion modules.

Sources and precise attribution: sources/story/FACTS.md ; https://open-slide.dev/docs ; https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document .

### 8. A page with an identity · 9VGD

Those frustrations led me to treat the page as the unit of continuing work. I will first explain how the project is organized, how we identify the same page, and how we return to its history.

### 9. PPTX already contains separate pages · TBGV

PPTX already separates slides, media and notes inside an Open XML package. I was not inventing the idea of a page. I wanted an accessible project directory as the everyday working surface, with deck.pptd organizing pages and assets. The two formats have different models: renaming a PPTX does not convert it into PPTD. This diagram selects the relevant parts of each structure.

Sources and precise attribution: sources/story/FACTS.md ; https://open-slide.dev/docs ; https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document .

### 10. A folder I can return to · BHPP

Opening deck.pptd opens the project, but that entry is only one part of it. Pages, images, Story, composition and history live beside it. AGENTS.md keeps the authoring preferences available to the agent. The Files view exposes that working directory, much like an IDE project tree. Carrying the whole folder keeps the materials and history available for the next edit.

### 11. First, which page are we talking about? · DHVW

If a page is the editing unit, I need a reliable way to name it. Slide four may no longer be fourth after a reorder. Position therefore describes the current sequence; the four-character Slide ID identifies the page. The table uses actual sequences from this project. That makes an editing request less ambiguous, even when two talks use the same page in different positions.

### 12. Keeping the history with the page · 2ZQ3

Stable identity lets the history stay with the page. I can inspect its operations to see what changed, and save a named version at a meaningful stage for later review or restore. These are real page versions saved in this project. This is my response to the full-deck copy problem: keep working in one project, with the history attached to the page being changed.

### 13. Keeping the story in the work · 7E4T

Page identity and history define the scope of an edit. I also wanted the human judgment to survive, so let us look inside the editor at how Story and materials carry intent and evidence into the next revision.

### 14. The editor I return to with the agent · FKA9

A document model still needs an editor people want to use. The canvas remains available for direct manipulation, with Project, Pages, Assets and Files on the left and object properties, layers and Story on the right. An agent’s changes appear in that same work. I wanted AI collaboration to coexist with selecting objects, arranging layers and refining the composition by hand.

### 15. Leaving the reason for the next edit · U8ZQ

Story keeps the reason for the work available after the conversation ends. At the project level it records the purpose of the talk. On a page it records the point being made and what an edit must preserve. This scientific example keeps the structure, twelve values and source attribution. Story gives both the agent and my future self context; it is not a switch that guarantees judgment.

### 16. The asset library carries the work forward · 35U5

The asset library matters especially for scientific talks. A structure image, another view, source data and attribution will often be used again. If those materials exist only in a conversation or scattered files, the next edit loses its foundation. Here they belong to the project and remain available. The alternate 1BNA view on the right comes from the same coordinates, preserving a connection to the evidence.

Source: https://www.rcsb.org/structure/1BNA ; https://doi.org/10.1073/pnas.78.4.2179 . Source coordinates, calculation and all twelve values: sources/science/.

### 17. Local variation in one structure · ZWZJ

Here is a concrete scientific page. The 1BNA DNA structure and the twelve paired C1′ distances come from the same deposited coordinates. Position seven joins A7 and B18. This is a public worked example, not a new research result or twelve independent experiments. It makes the editing requirement tangible: the wording may change while the structure, values, units and attribution stay intact.

Source: https://www.rcsb.org/structure/1BNA ; https://doi.org/10.1073/pnas.78.4.2179 . Source coordinates, calculation and all twelve values: sources/science/.

### 18. Tables and equations stay editable · XF8A

I also want the table and equation to remain editable. This is one native table, rather than separate text boxes arranged to resemble cells. The equation remains an equation. That matters when a person takes over and needs to change a column or a value. The five rows are selected from the same twelve-position dataset; the full source data and calculation script stay with the project.

Source: https://www.rcsb.org/structure/1BNA ; https://doi.org/10.1073/pnas.78.4.2179 . Source coordinates, calculation and all twelve values: sources/science/.

### 19. This time, just clarify the explanation · ZN52

A request can be small: make this page’s title and explanation clearer while preserving the source figure, all twelve values, axes and citation. These are the saved before and after states of that actual operation. The agent reads the current revision, previews the change and saves it. I can then inspect whether the result matches the request.

### 20. Stepping back to inspect the whole talk · 9QQW

I also need to step back from the current slide. Browse shows the actual pages by section, Outline makes the sequence of headings easier to inspect, and Sections lets me organize those groups. These are views of the same work. This is where I check whether a chapter answers the question that led to it, rather than simply adding more features.

### 21. Taking the workflow to different agents · YZ4T

The workflow does not require one model. The plugin carries authoring guidance and project context. The connector sends requests to the selected project’s shared document service, where direct editor changes also arrive. For this introduction, ChatGPT, Claude Code and DeepSeek Harness made independent attempts. They can share the file and operation model while their editorial judgment is still assessed separately.

### 22. Back to the next lab meeting · X5J6

All of this has to return to the actual talk. The next lab meeting may have different listeners or a different amount of time. I need to choose pages from this material, prepare the notes, and bring the appropriate version.

### 23. Choosing the pages for the next talk · AAD6

Back at a lab meeting, I will not always tell the same version of the story. Main Slides holds the complete page library. A shorter talk can select some of those pages and arrange them differently. These thumbnails come from the real full and brief presentations in this project. A live reference keeps pointing to the canonical page, so I do not have to maintain two diverging copies.

### 24. The same page can support another explanation · 74A2

The same page may serve different listeners. Its Main notes hold the general explanation, while one occurrence in a Presentation can have its own speaker notes. In a lab meeting I might explain the measurement; in this project introduction I use the page to explain evidence preservation. The picture can stay the same while the purpose and spoken explanation change.

### 25. Live and pinned references · 9N3S

Sometimes I want a talk to follow continuing edits; sometimes I need to hold a particular stage. Live uses the current page. Pinned selects a saved named version. The right image preserves the earlier wording-edit stage; the left includes later chart-label refinements. The page identity is shared while the selected content version differs. That is separate from where the page appears in the talk.

### 26. Presenting and sharing from the same project · DDJN

When the talk is ready, I can present it directly or export PPTX for continued editing and PDF for reading. This is the actual export entry in the current project. Live reveals belong to playback; static files carry the final page. Delivery should grow out of the same working project rather than creating yet another source deck to keep track of.

### 27. Next time, I begin with my story · ECVR

I started HUANDENG so that preparing the next lab meeting could begin with what I actually wanted to say. The agent can help organize, build and revise it. The materials, page identity and history stay in the project, and I can return to the same work. This introduction itself grew from my spoken account. What I want to preserve is the human judgment behind the presentation.

## Brief introduction

### 1. Why I started HUANDENG · 9DAA

I want to begin with why I started HUANDENG. At lab meetings, I wanted AI to help prepare slides while keeping my own judgment visible. I also kept running into another problem: changing two slides could leave me with another complete copy of the deck. Those experiences led me to put the human story, page identity and editable material into one project.

### 2. At lab meetings, people could tell · P72R

At lab meetings and other presentations, I noticed how readily people recognized AI-made slides. The tools had different styles, but the slides often tried to cover everything. I found the same problem in my own introduction: there was plenty of material, yet the point was hard to follow. The images here are earlier pages from my own introduction. These pages made me look again at the story I was trying to tell.

Account source: sources/story/USER-STORY.zh-CN.md. The explanation is based on the founder’s personal experience and design judgment.

### 3. Change two of fifty slides. Another full copy? · 2XM9

The second problem was mundane. Suppose I already had fifty slides and wanted to change two. Some agents would preserve the original by creating another complete deck. With repeated edits, the directory could fill with dated copies. Git suggested a useful principle: record what changed in the unit being edited, rather than preserving every small revision as another full presentation.

Account source: sources/story/USER-STORY.zh-CN.md. The explanation is based on the founder’s personal experience and design judgment.

### 4. So I wanted to tell the story first · KW5P

My working hypothesis is that the AI feel comes partly from trying to cover everything without deciding what matters. I would rather speak first, even roughly, and have the agent organize the logic already present in that account. That is what I did for this introduction. The talk and the slides can then grow from the same reasoning, instead of my inventing a speech to fit a deck the AI has already made.

Account source: sources/story/USER-STORY.zh-CN.md. The explanation is based on the founder’s personal experience and design judgment.

### 5. PPTX already contains separate pages · TBGV

PPTX already separates slides, media and notes inside an Open XML package. I was not inventing the idea of a page. I wanted an accessible project directory as the everyday working surface, with deck.pptd organizing pages and assets. The two formats have different models: renaming a PPTX does not convert it into PPTD. This diagram selects the relevant parts of each structure.

Sources and precise attribution: sources/story/FACTS.md ; https://open-slide.dev/docs ; https://learn.microsoft.com/en-us/office/open-xml/presentation/structure-of-a-presentationml-document .

### 6. First, which page are we talking about? · DHVW

If a page is the editing unit, I need a reliable way to name it. Slide four may no longer be fourth after a reorder. Position therefore describes the current sequence; the four-character Slide ID identifies the page. The table uses actual sequences from this project. That makes an editing request less ambiguous, even when two talks use the same page in different positions.

### 7. Keeping the history with the page · 2ZQ3

Stable identity lets the history stay with the page. I can inspect its operations to see what changed, and save a named version at a meaningful stage for later review or restore. These are real page versions saved in this project. This is my response to the full-deck copy problem: keep working in one project, with the history attached to the page being changed.

### 8. Leaving the reason for the next edit · U8ZQ

Story keeps the reason for the work available after the conversation ends. At the project level it records the purpose of the talk. On a page it records the point being made and what an edit must preserve. This scientific example keeps the structure, twelve values and source attribution. Story gives both the agent and my future self context; it is not a switch that guarantees judgment.

### 9. The asset library carries the work forward · 35U5

The asset library matters especially for scientific talks. A structure image, another view, source data and attribution will often be used again. If those materials exist only in a conversation or scattered files, the next edit loses its foundation. Here they belong to the project and remain available. The alternate 1BNA view on the right comes from the same coordinates, preserving a connection to the evidence.

Source: https://www.rcsb.org/structure/1BNA ; https://doi.org/10.1073/pnas.78.4.2179 . Source coordinates, calculation and all twelve values: sources/science/.

### 10. Local variation in one structure · ZWZJ

This is a public DNA example. Its figure and twelve values come from the same deposited coordinates. When I change only the explanation, I want the figure, values and source to stay intact. That is also the working agreement I want to carry to different agents.

### 11. Taking the workflow to different agents · YZ4T

The workflow does not require one model. The plugin carries authoring guidance and project context. The connector sends requests to the selected project’s shared document service, where direct editor changes also arrive. For this introduction, ChatGPT, Claude Code and DeepSeek Harness made independent attempts. They can share the file and operation model while their editorial judgment is still assessed separately.

### 12. Choosing the pages for the next talk · AAD6

Back at a lab meeting, I will not always tell the same version of the story. Main Slides holds the complete page library. A shorter talk can select some of those pages and arrange them differently. These thumbnails come from the real full and brief presentations in this project. A live reference keeps pointing to the canonical page, so I do not have to maintain two diverging copies.

### 13. Next time, I begin with my story · ECVR

I started HUANDENG so that preparing the next lab meeting could begin with what I actually wanted to say. The agent can help organize, build and revise it. The materials, page identity and history stay in the project, and I can return to the same work. This introduction itself grew from my spoken account. What I want to preserve is the human judgment behind the presentation.
