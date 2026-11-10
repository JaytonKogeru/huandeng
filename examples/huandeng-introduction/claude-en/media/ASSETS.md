# Asset index

All screenshots are real captures of the HUANDENG Editor (English UI) running a public synthetic example project ("HUANDENG showcase"). Crops are pixel-exact sub-rectangles of the parent; nothing was scaled, redrawn or retouched. Crop boxes are `x0, y0, x1, y1` in parent pixels (parents are 3840×2160, captured at 1920×1080 with device scale factor 2).

| Path | Kind | Locale / view | Parent | Crop box | Size | Used on (approx. display size, canvas units) |
| --- | --- | --- | --- | --- | --- | --- |
| media/en/edit-overview.png | Real screenshot, uncropped | en / Normal | en-edit-1920.png | none | 3840×2160 | "Six views of the same slides" (576×324) |
| media/en/browse-identity.png | Real screenshot crop | en / Browse | en-browse-1920.png | 586, 518, 1661, 1114 | 1075×596 | "A Slide keeps its ID wherever it moves" (460×255) |
| media/en/edit-scope.png | Real screenshot crop | en / Normal header | en-edit-1920.png | 586, 336, 1344, 419 | 758×83 | "Reuse is live by default and pinned on purpose" (379×41.5) |
| media/en/outline-story.png | Real screenshot crop | en / Outline | en-outline-1920.png | 624, 610, 1560, 845 | 936×235 | "Story tells the next editor what a slide is for" (404×101) |
| media/en/sections-focus.png | Real screenshot crop | en / Sections | en-sections-1920.png | 576, 365, 1997, 1365 | 1421×1000 | "Organise the argument with Sections" (540×380) |
| media/en/notes.png | Real screenshot crop | en / Notes page | en-notes-1920.png | 586, 346, 3840, 1382 | 3254×1036 | "Speaker notes stay with the slide" (848×270) |
| media/en/history-versions.png | Real screenshot crop | en / History | en-history-1920.png | 576, 365, 3840, 874 | 3264×509 | "Name a milestone, restore one page" (848×132) |
| media/en/history-restore.png | Real screenshot crop | en / History footer | en-history-1920.png | 576, 1974, 3840, 2099 | 3264×125 | "Name a milestone, restore one page" (848×32.5) |
| media/huandeng-icon.png | Official logo | — | candidate plugin `assets/icon.png` | none | 512×512 | Cover (56×56) |

`media/.huandeng-versions/` is created by HUANDENG when named versions are recorded; it holds content-addressed copies of the images above and must stay with the project.
