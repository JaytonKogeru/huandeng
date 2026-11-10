# V018 UI implementation and visual acceptance

Date: 2026-11-10. Baseline: main commit `376e6b4`.
This is the UI workstream record. The shared workflow spec covers authoring and section semantics.

## Audit conclusions

The existing product introduction used 19 feature slides without a true title-only section page.
The actual v3 PDF, rather than the older overview image, was inspected.

- The 960 x 540 source used title text around 30, body text around 20-24, and frequent bold phrases. Those choices compressed the hierarchy and made Chinese pages feel crowded.
- Most pages were white; pages 1 and 8 used #F1F3F1; pages 5, 11 and 12 used #F5F6F4. The background changes did not consistently mark a narrative boundary.
- A 192 x 119 playback-menu image was placed at about 400 x 248. Enlarging it more than two times exposed its source limitation.
- A 300 x 417 Story crop was placed near its native dimensions. It could not support a crisp 2x output.
- Whole-window screenshots around 1600 x 812 were placed at 832 x 422 or smaller. More source pixels alone cannot make the tiny interface labels readable at that display size.
- The page-ID and command-timing material interrupted the product explanation. Stable identity should be demonstrated through reordering; literal identifiers and timings belong in technical documentation.
- The interface contained several stacked border and button treatments at the same visual priority. The darker theme approached black in both the canvas and navigation surfaces.

## Reference interpretation

Sources inspected:

- [Recent Design](https://recent.design/)
- [Recent Design skills](https://recent.design/skills)
- [Impeccable project](https://github.com/pbakaus/impeccable)
- [Quieter documentation](https://impeccable.style/docs/quieter/)
- [Typeset documentation](https://impeccable.style/docs/typeset/)
- [Context documentation](https://impeccable.style/docs/context/)
- [Critique documentation](https://impeccable.style/docs/critique/)

Actual Recent image pixels included a Linear screen, Pace presentation, particle login, and glass-button examples.
The useful transfer is a clear focal region, restrained supporting typography, consistent roles and deliberate review.
Decorative glass, particles and gradients do not help the editor's tasks and were not introduced.
These are design interpretations of the references, not claims that one visual style guarantees usability.

## Frame and implementation

| Area | Decision | Reason |
| --- | --- | --- |
| Editor surface | White content, neutral gray navigation and canvas | Keep authored slide colors distinct from application chrome |
| Dark surface | #26292D content, #1D2024 navigation, #17191C canvas | Preserve depth without near-black layers merging |
| Accent | Forest green in light mode; pale green in dark mode | Reserve emphasis for selected state, focus and primary action |
| Workspace navigation | One row of six text tabs with a 2 px selected underline | Keep the view model readable without six separate button boxes |
| Toolbar | Separate groups with space | Reduce redundant lines at the same level |
| Browse / Outline | Transparent resting cards, stronger selected card, quieter position label | Let slide content and page title lead |
| Desktop shell | Match editor neutral palette; retain 42 px geometry | Avoid a color seam without changing native content bounds |
| Welcome page | Neutral surfaces, lighter secondary action, system dark mode | Make entry consistent with the working editor |
| Dark welcome mark | Invert monochrome mark on dark surface | Restore the logo's visible contrast |
| Asset details | Show original image dimensions after decode | Judge source resolution before insertion |

Changed implementation files:

- `packages/core/src/app/styles.css`
- `packages/desktop/welcome.css`
- `packages/desktop/workspace-shell.css`
- `packages/desktop/main.cjs` (only native chrome foreground and background values)
- `packages/core/src/app/components/pptd/asset-library.tsx` (original pixel dimensions; SVG identified separately)

No generated shadcn component, view logic, project-panel logic or authoring API was changed in this UI workstream.

## Acceptance evidence

Evidence is under the ignored `.verification/visual-v018/` directory.
The capture runners are `.verification/ui-capture-v018.mjs` and `.verification/ui-chrome-capture-v018.mjs`.

| Check | Result |
| --- | --- |
| Core production build | Passed |
| Production editor build after final editor palette change | Passed |
| Biome check of the five implementation files | Passed after final line-ending normalization |
| Node syntax check of desktop main | Passed |
| EN and ZH, 1920 x 1080, six workspace views | 12 captures passed |
| EN and ZH, 1040 x 800, light and dark, Normal/Browse/Outline/Notes | 16 captures passed |
| Workspace navigation | 35 px high in all 28 states; one selected view |
| Compact viewport | No horizontal body overflow; view buttons stay inside viewport |
| Public fixture authored pages | Unchanged byte for byte after all view switches |
| Browser runtime | No page errors |
| Welcome and project strip, EN/ZH and light/dark | 8 captures passed |
| Native strip geometry | Remained 42 px |

The editor captures use a real local production service and six newly generated public example pages.
They do not attach to the user's existing project or native window.
Welcome and shell captures use the real HTML, CSS and JavaScript with an isolated desktop bridge fixture.
That check verifies rendered chrome and locale behavior; it does not replace native Electron routing acceptance.

Actual pixels inspected included wide English Normal, Chinese Browse, compact English dark Outline,
Chinese light Notes, English Sections, English light Welcome and Chinese dark Welcome.
This review caught and corrected the dark welcome logo contrast after the first automated pass.

## Screenshot source library

Twelve original 3840 x 2160 PNGs were copied into the task's `assets/ui-v018/` folder.
Their `manifest.json` records locale, authored-slide language, viewport, device scale, dimensions,
SHA-256 and capture provenance. The original example content is English in both UI locales. Mixed-language Chinese files are now diagnostic only.
The final manifest recommends separate English and Chinese source projects, with native DPR4 task crops and
Chinese-authored pages, Story, sections, short presentation and checkpoint labels for the Chinese assets.

| Use | Capture requirement |
| --- | --- |
| Product orientation | One complete editor window, 1920 x 1080 at DPR 2 |
| Story or inspector | Capture the specific panel directly at DPR 2; retain its labels |
| Browse rhythm | Capture a short group of actual page previews with the section label |
| Outline | Capture two or three rows with readable titles, not an entire long workspace |
| Review / history | Capture the active comparison region showing the actual change |
| Playback / export | Capture the open menu directly; do not reuse the old 192 x 119 bitmap |
| English introduction | English UI plus English page content; do not substitute a Chinese screenshot |
| Chinese introduction | Chinese UI plus Chinese page content where page text is part of the example |

A source should have at least two image pixels per final logical display pixel.
Never enlarge an existing bitmap to manufacture resolution.
A sharp full-window image still fails if its labels become too small on the slide.
For feature pages, choose the task region first and determine the source crop from the intended display size.
Preserve original captures separately from any derivative crops and retain source provenance.

The current desktop `icon.svg` wraps a 512 x 512 RGBA bitmap.
It is sufficient for the 38 px welcome mark, but should not be treated as an infinitely scalable vector
when preparing large brand artwork.

## Presentation contract for this workstream

Use the shared production-design contract for enforcement. The proposed 960 x 540 baseline is:

- White slide background throughout the main presentation.
- Chinese body 17-18, regular; main title 26-28; subordinate heading 19-20.
- Title-only section pages: one 32-36 title, no subtitle, footer, badge, page number or decoration.
- Use a small set of role-based sizes rather than resizing every block independently.
- One visual claim per feature page, tied to a real task and an actual product state.
- Use full-window screenshots sparingly; make task crops readable at the final slide size.
- Store screenshots, originals, locale and provenance with the project.
- Review actual renders at both reading size and contact-sheet scale.

The UI changes do not claim to solve content quality alone.
The section-title capability, design audit, story context, asset evidence and human review gates
provide the complementary controls in the shared V018 work.

## Integration acceptance and concrete workflow evidence

The final image manifest is the campaign's `assets/ui-v018/manifest.json`. Existing PNG bytes were retained.
New captures have new names; hashes, dimensions, authored language and provenance are recorded.
The Chinese project was scaffolded empty and its six pages, Story and sequences authored through the
supported writer API. The original user demo and both root introduction decks were not mutated.

| Integration task | Result and evidence |
| --- | --- |
| Insert Section title through actual UI | One text element at 34 regular on white; existing Section ID and Story preserved |
| Undo Section title once | Prior ordering and page data restored; Section identity retained |
| Design check dialog | Actual width 960 CSS px after responsive fix; six pages, one background and three missing-divider observations |
| Original asset dimensions | Real imported PNG shows 3840 x 2160 px; SVG shows intrinsic size and SVG type |
| Focused edit, English and Chinese | One writer transaction changes only title and lead text; all other fields, objects and pages equal as parsed data |
| Named versions | Before/after checkpoints saved through actual UI; older preview selected and Restore enabled |
| Stable identity | Non-anchor page moved Position 2 to 4; same short code; supported undo restores page data, order and Project structure |
| Operation review | Actual receipt selected; read-only preview and exactly two changed objects inspected |
| Final own-file validation | Five implementation files pass Biome; desktop main passes Node syntax check |

Receipts, before/after JSON and preservation assertions are in `focused-edit-evidence/`,
`chinese-edit-evidence/` and `identity-evidence/`. Reports distinguish Saved versions, Operation history
and Operation review. A checkpoint alone does not show the exact fields changed.

### Remaining observed interface friction

- Imported images use content-addressed filenames. Their header exposes a long hash instead of the human filename; retaining a display name would improve browsing. The new dimensions readout solves source-resolution discovery.
- An explicit internal page title can differ from its visible heading after a focused object edit. This example preserves the internal title while changing only two text values. A future affordance should clarify the distinction.
- A full workspace can be sharp yet unreadable on a slide. Final introduction pages use task crops and localized content.
