# HUANDENG introduction: current visual audit

Date: 2026-11-10. Scope: presentation content, composition and reusable assets. This pass makes no Editor changes.

## Current decision

**The user rejected the version 0.18 ChatGPT introductions.** Successful structural checks, valid exports and agent peer review remain technical records; they are not author approval. This audit replaces the assumption that a quiet white deck is necessarily a better or more human result.

The user-nominated original Chinese demo is the stronger visual reference among the three inspected works. It has a recognizable product identity, genuine visual objects, purposeful shifts in density, real page stacks, a layered architecture, a measured data plot and concrete source attribution. Its defects are localized and repairable. Preserve those expressive choices while improving screenshot detail, typography and workflow explanation.

Claude's native English draft explains the audience's problem, shows actual full/brief presentation positions and distinguishes Editor, Plugin and Connector. It provides stronger explanatory writing than the ChatGPT 0.18 draft in these places. It still follows the narrow white/text-led brief. Its reasoning is useful; its visual pacing should not be copied wholesale.

## Actual inspection

| Input | Inspection in this audit | Source identity |
| --- | --- | --- |
| Original Chinese demo | All 19 pages individually at reading size, plus four contact sheets | [Reference PDF](../examples/huandeng-introduction/assets/reference/original-demo.pdf); SHA-256 `a3d2393fc283c3738ebcfc074a5446207a53cf158ecaaaf1e55dab4d60c54392` |
| ChatGPT 0.18 Chinese | All 22 pages in contact sheets; pages 1, 5, 6, 12, 13, 14, 15, 18, 20 and 22 individually | Released PDF SHA-256 `e3f8f38a602eedce0acb729beb95fe60076ec8065114f3d45b4efc1c023e6c20` |
| Claude native English | All 21 pages in contact sheets; pages 1, 2, 4, 6, 10 and 20 individually | Native export SHA-256 `c5e2cf450dfa8ec600e395c31b926aa17565fce79d68ae7d9523956fd8cc7621` |

The original has 19 active pages, not all 27 page files retained in its directory. All 19 current page-file hashes match the page revisions in its existing PDF export report. The checked PDF equals its existing deck.pdf byte for byte. Existing exports were rasterized for this audit; no original file was edited and no Office rerun was needed.

Full-size images, inventories, the source-hash comparison, timing verification and render manifest are under the existing repository's `.verification/rework-20261110`. Public reference copies are in [assets/reference](../examples/huandeng-introduction/assets/reference/README.md). This historical PDF is a design input, **not a fifth current edition**.

This pass does not independently re-rate every ChatGPT English page or the DeepSeek deck. Their previous technical validation is not visual acceptance. No automatic “AI feeling” score is claimed.

## Where the intent was lost

| Layer | Evidence | Consequence |
| --- | --- | --- |
| User requirement | Improve visual quality, reduce heavy Chinese type, investigate inconsistent backgrounds, add title-only Section pages, and make bilingual/native-client introductions. The current correction permits meaningful backgrounds, logos, icons, charts and authored explanatory diagrams. | These communication goals do not require every ordinary page to be white or every concept to become a sparse text pair. |
| Assistant-authored specification | [Released SPEC-V018](https://github.com/JaytonKogeru/huandeng/blob/editor-v0.18.0/docs/SPEC-V018.md) prescribed #FFFFFF, narrow type ranges and 22 pages. [Released DESIGN-V018](https://github.com/JaytonKogeru/huandeng/blob/editor-v0.18.0/docs/DESIGN-V018.md) treated old background changes as lacking reason despite the original policy giving them roles. | The assistant converted an open design problem into a restrictive template. Those rules were not user approval. Keep measurements as diagnostics, not a definition of design quality. |
| Actual delivery | Brand marks disappeared; real slide stacks and the architecture/data visual became abstract text or small UI evidence; concrete attribution became a generic repository note. | The implementation compounded the specification error. Restoring one cover logo is insufficient: content-specific visual objects must carry the narrative. |

The original policy explicitly allowed pale gray/gray-green cover, organization and architecture pages. It requested the original HUANDENG mark, real client marks, genuine imagery/data, actual-page stacks, deliberate asymmetry and preservation of recognized layouts. The old deck's five tinted pages are therefore not automatically accidental inconsistency.

### Historical contracts

FSS's local `FreestyleScientificSlides/docs/07-HUMAN-SLIDES.md` states:

> Form follows evidence and the speaker's intended comparison; factual failures are repaired, functional irregularities are preserved.

It ranks human-authored design above story tooling and file format. “Elastic density” permits a full-width scientific figure, dense multi-panel comparison, formula or sparse question according to the argument. ArgFrame preserves this priority and calls for page-specific authored geometry.

The released HUANDENG skill says project style takes precedence, but its step 2 also defaults to white slides, black text and whitespace. Its released scientific-design reference broadly bans self-drawn arrows; production-design normally selects a white ordinary background. These generic defaults became stronger in practice than the project's visual contract. Repository guidance is now being corrected separately; these findings describe the released instructions.

The old no-arrow rule is not a current blanket prohibition. A true dependency connector, actual-sequence arrow or semantic icon can improve this explanation. Draw the relationship accurately. Preserve real data and never reconstruct a screenshot as though it were the actual interface.

## Original Chinese demo: page-by-page findings

Coordinates use the 960 × 540 source canvas. These are observations and starting suggestions, not another universal template.

| Page | What earns its space | Specific repair or reuse |
| --- | --- | --- |
| 1 — Cover | HUANDENG mark, gray surface, substantial screenshot and asymmetric text establish a product. The 48 px two-line title has an intentional cover role. | Keep the mark and product/evidence pairing. Replace old UI pixels with a current capture showing a useful visual example. Keep the image around 540–580 units wide rather than reducing it to a decorative thumbnail. |
| 2 — Continuing an edit | Actual before/after wording makes the promise concrete. The unchanged heading shows limited edit scope. | Align the changed phrase; reduce redundant explanation and bold treatment. Old 1380 × 130 strips placed 748 × 70 are slightly undersampled at 1920 output; newer 4× captures can replace their pixels. |
| 3 — Workspace | A large actual workspace orients the viewer, at roughly 832 × 422 units. | Keep as the primary full-window orientation page. Later task pages should not repeat this whole-window composition. |
| 4 — Browse / Outline | Genuinely different views support a direct comparison; captions tell the viewer what to look for. | Keep the pair. Capture comparable regions and enlarge meaningful rows. Current sources are only 519 × 476 and 714 × 549. |
| 5 — Sections / presentations | Three stacks contain six actual page images. The pale background separates white page objects and gives the collection a visible form. | Preserve actual-page stacks, preferably using the new talk's own pages. Back cards are offset 13 units horizontally and 37 vertically; front panels are 260 × 146.25. Show actual membership/order for full and brief talks. Do not replace this with only a settings screenshot or generic card wall. |
| 6 — Starting a page | The real toolbar ties three actions to their actual location. The horizontal strip suits their sequence. | Recapture: 1012 × 214 pixels occupy about 880 × 186 units. Keep necessary actions while reducing heavy subheads and redundant descriptions. |
| 7 — Assets / layout | A real asset pane and relevant example plot connect the import operation to actual material. | The full-window layout repeats page 3 and makes the asset details small. Use a large source figure plus a focused asset/provenance inset, or a large task crop showing import and use. |
| 8 — AI clients | Four real marks provide immediate identity; text separates clients from connection methods. The tinted ground has a structural role. | Preserve marks, names, colors and proportions. Update wording to actual current routes. Show the shared project/writer relation with an accurate concept diagram when useful. |
| 9 — Policy / Story | A real Story panel locates purpose / keep / change. Its narrow form justifies asymmetry. | The 300 × 417 image occupies about 295 × 410 units, only about half the pixels needed at 1920 output. Use the new 4× crop and a concrete preservation example. |
| 10 — Review | Actual operation history establishes that saved changes can be inspected. | Another complete window hides the details. Use the selected operation's real before/after and affected objects. Keep one consistent example through the edit/review sequence. |
| 11 — Architecture | White layers on gray show interfaces, document service and shared writer. Its visual structure carries meaning. | Retain the layers. Make UI and client APIs reaching the same document service/writer explicit, using meaningful connectors where helpful. Do not imply independent competing writers. |
| 12 — Project directory | Real filenames and roles explain what belongs to the project. Its background links it to architecture. | Keep the actual folder semantics. A container diagram or the existing table can show the whole-directory relationship. Avoid invented files or needless technical detail. |
| 13 — Identity | Order, short code, page identity and occurrence are correctly distinguished. | The full UUID consumes attention without teaching reuse. Replace it with an actual moved-page example or visible page token in two collection positions. Keep complete IDs in notes. |
| 14 — Versions | A genuine named-version list supports a function distinct from ordinary operation history. | Focus on one named milestone and its real page preview. Show what stays fixed instead of only naming the feature. |
| 15 — Live / pinned | A real shared page is paired with two reuse roles. | The image does not reveal the difference between following Main and retaining an earlier state. Show actual current/fixed appearances of the same page, or a faithful conceptual diagram. |
| 16 — Present / export | A real menu demonstrates two starting positions; the formats are named clearly. | The 192 × 119 source occupies 400 × 248 units: about 0.24 source pixels per 1920-output pixel. Recapture it. This is a resolution defect, not a reason to remove the visual demonstration. |
| 17 — Command timings | Actual observations, units, sample counts and medians create a content-specific data page. | Keep if relevant to the new talk, or use another genuine public figure. This is the old production run including CLI startup/communication, not a product-performance benchmark. Never relabel it as current performance. |
| 18 — Foundations | Marks and contribution descriptions separate code foundations from workflow/product inspiration. | Preserve this distinction. At minimum, identify OpenSlide, OpenPPTD and PptxGenJS and their actual roles. Optional inspirations can be an appendix. |
| 19 — References | A denser catalog is functional: each mark has a name, contribution and source. | Keep relevant references or move them to an appendix. Do not erase all attribution or equate genuine identity marks with meaningless stock icons. |

### The original plot is real evidence

The original CSV has 78 calls. Recomputed medians and sample counts match the displayed two-decimal values.

| Operation | Calls | Median seconds |
| --- | ---: | ---: |
| Read project | 37 | 1.794 |
| Preview change | 21 | 2.169 |
| Apply change | 12 | 2.456 |
| Render PNG | 8 | 4.973 |

This verifies the old graphic's derivation. It does not establish current UI responsiveness or a comparison with PowerPoint.

### Scientific-expression gap

The original shows a real workflow measurement, but it does not demonstrate an author preserving a complex figure, its labels and its argument while making a targeted edit. The repeated UI canvas contains the same command-timing plot; this proves that a plot can be placed, not that scientific composition is handled well.

A useful new public example should show one real scientific object large enough to inspect, its source/units, the relevant derived plot or table, and a specific editing request that preserves the evidence. The before/after must retain the same data, scale, panels and labels. A molecular picture alone would decorate the workflow; a structure linked to a precise measurement and a visible preservation task would demonstrate it.

The planned 1BNA example can fill this role if its structure, derived geometry and captions agree. Twelve positions in one coordinate structure must remain twelve structural positions, not twelve independent experiments. A C1′ pair-distance plot should not acquire error bars, population claims, time-series language or performance implications unless a separate source supports them. A page may be dense enough to compare structure, locator and plotted geometry together; splitting them into three unrelated decorative cards would weaken the argument.

## What to retain from 0.18, and what to replace

High-resolution, language-specific task captures are useful assets. The actual stable-identity move, two-object edit, populated operation history, Story panel and localized controls improve on several old whole-window images. Better source pixels do not by themselves make a strong composition.

| 0.18 page | Observed weakness | Next composition |
| --- | --- | --- |
| 1 | Product name and UI remain, but the distinctive mark is absent. The screenshot itself contains another largely textual slide. | Restore identity and show visually meaningful work in the real Editor. |
| 5 / 18 | Project counts and a two-column description state reuse without showing which pages are shared or reordered. | Actual-page stacks or a library-to-two-talk mapping. Claude page 4's actual position table is a useful compact evidence model. |
| 6 | Status strips prove identity but give an entire page to a system-status detail. | Visible page token and old/new collection position, with the real status strip as supporting evidence. |
| 12 | Text advocates showing the task region, while the image is a small full window. 3840 × 2160 is a pixel count, not legibility. | Make a real source figure the visual object; use a readable provenance/asset-detail inset. |
| 13 | Four client names and three role sentences remove the original marks and flatten the architecture. | Branded client identity and the actual interfaces → shared writer → project relationship. |
| 14 / 15 | Edit text and saved-object list are authentic, but two consecutive sparse text-shaped pages do not explain the whole authoring task. | The same meaningful page before/after plus one focused saved-change detail. Retain the major figure and highlight the authorized change. |
| 16 / 19 | Named version and Live/Pinned remain mostly verbal. | Two actual states of one page, or a concise semantic diagram with a visibly fixed snapshot. |
| 22 | “Based on open-slide and other open-source work” loses the distinction between editor foundation, reused conversion code and export library. | Direct credits with marks and contribution labels; repository link as the next action. |

Claude page 2 describes a credible problem: one results slide is reused for different audiences and copies diverge. Page 4 provides real Main/full/brief positions from its own deck. Page 10 explains the three tool roles in complete sentences. Retain that clarity. Its text-heavy geometry is not a visual target, and an empty historical screenshot must not become proof of populated history.

## Reusable assets

[Shared brand manifest](../examples/huandeng-introduction/assets/brand/manifest.json) contains nine unchanged PNGs: the default HUANDENG mark and user-supplied source, four client marks, OpenSlide, the GitHub repository mark used with OpenPPTD, and PptxGenJS. Entries record source URLs, dimensions, original processing and SHA-256. No Editor branding source was modified.

The GitHub mark identifies a repository; it is not an invented OpenPPTD logo. Codex's official extension mark stays paired with Codex text. DeepSeek's mark is not a distinct Harness logo.

| Need | Reusable material | Follow-up |
| --- | --- | --- |
| Identity / clients | [assets/brand](../examples/huandeng-introduction/assets/brand/README.md) | Preserve color/proportions and readable product names. |
| Whole-deck rhythm | [Original 19-page PDF and contacts](../examples/huandeng-introduction/assets/reference/README.md) | Historical design reference, not another current edition. |
| Page stacks | Original page 5 uses six verified 1920 × 1080 page images. | Prefer renders of the actual new deck so membership supports its own narrative. |
| Story, review, move, versions | [Screenshot manifest](../examples/huandeng-introduction/assets/manifest.json) recommended EN/ZH task mappings | Choose crops by meaning; operation history and named versions are different evidence. |
| Empirical data | Original cli-timing.csv and 1890 × 828 plot | Old-run evidence only, not a new benchmark. |
| Public scientific object | Integration's planned shared assets/science example | Inspect source, method, units and matching structure/plot/table before use. |
| Attribution | Direct-code-source marks and contribution text | Distinguish reused code, export dependency and design inspiration. |

## Executable visual brief

### Narrative

Start with the actual editing problem and show a concrete work object. Then explain how the workflow preserves it through edits, versions and different talks. Page count follows the demonstration; do not force it into 22 pages.

Useful roles, expandable or combinable according to evidence: identity + real work; repeated-edit problem; title-only Section; one project and real page library; actual full/brief reuse; title-only Section; figure-first example and editable objects; targeted human/agent change; exact review and preserved intent; shared-writer architecture and clients; title-only Section; named/fixed versions; presentation/export; direct attribution and a concrete next action.

A requested Section divider contains only its title. Its surface may use the deck's intentional background palette. “Only a title” does not impose white. Section pages are pauses; every content page should not become a pause.

### A visual vocabulary

| Role | Starting composition | Visible point |
| --- | --- | --- |
| Product cover | Original mark around 56–80 units; one clear claim; actual Editor/example uses roughly 55–65% of usable width | Identity and concrete work |
| Figure / evidence | Actual plot or structure can occupy 60–80% of the frame, with labels and necessary source | The data feature or comparison |
| Reuse / collection | Actual-page previews around 230–280 units wide, with intentional overlap or a visible two-talk mapping | Which pages are shared, and order |
| Focused edit | Same real page/crop at the same scale before/after, with preserved image geometry visible | What changed and what stayed |
| Workflow / architecture | Semantic groups, true directed relations, limited labels | How people and clients reach one document |
| UI task | One large task region, optional small orientation inset | The control/state proving the function |
| Attribution | Marks around 32–44 units plus contribution labels | Code foundation, library or inspiration |

Use two or three consistent background roles. White for detailed evidence and restrained gray/gray-green for product/structure pages is a useful starting family from the original. A stronger/darker page can be proposed if it serves contrast for that page; it is not a requirement. Consistency means the same role has the same meaning, not identical background pixels throughout.

For these examples, ordinary Chinese titles around 27–30 and regular body around 18–21 at 960 width are a starting point, with selective semibold emphasis. Covers/Sections can be larger. Actual word length, visual pressure and evidence scale decide the result. Do not enlarge short Chinese phrases mechanically, shrink source labels or reduce a figure merely to pass a generic size rule. Rephrase/reflow English instead of translating into identical coordinates.

Margins around 36–56 units can provide continuity while a justified full-width figure may use more space. Do not reserve the same empty half on every page. Keep semantic color stable and preserve scientific source colors/units.

### Frame before expansion

Render three materially different representative pages before full authoring: a branded cover, an evidence-dominant page and a meaningful workflow/reuse diagram. Add one title-only divider to verify the pause. One text page plus one blank divider cannot establish the deck's whole visual system.

For every page, record the viewer's question, the exact visual object, what the speaker points at, why its size/crop/placement help, and what must remain unchanged. A page can be text-led when the text is the object. It should not default to text because the prompt or renderer makes imagery inconvenient.

### Independent review gates

1. Inspect every actual page, then the sequence. Does composition change when the material changes?
2. Compare with the original at matched scale. State a concrete communication improvement; removed elements are not automatic progress.
3. Verify meaning and provenance: genuine screenshots, preserved scientific values/labels, accurate diagram relations and exact product/source identities.
4. Inspect projected reading size. Pixel counts and clean geometry reports cannot make tiny labels readable.
5. Check the preservation promise on a real edited example: same object, crop, scale and unchanged figures where required.
6. Separate technical checks, agent aesthetic review and the user's judgment. A draft remains a draft until the user responds; agent sign-off is never author approval.

## Scope and record

This audit read the original policy, production/source notes, FSS/ArgFrame contracts and the released 0.18 audit/spec/design guidance. Measurements come from source PPTD objects, raster dimensions, the export report, CSV and inspected images. It makes no new performance claim.

All original page files, original PDF and media remain untouched. Public changes from this workstream are the compact brand set, historical reference copies, this current audit, the example README's accurate rejection/reference status, and the documented portable scientific source copies. Intermediate verification stays inside the existing repository. The Editor is out of scope for this rework.

## Independent review of the new public science assets

The new [science asset collection](../examples/huandeng-introduction/assets/science/README.md) was then inspected directly: both coordinate views, both language plots, generator, coordinate file and measurements. [RCSB's 1BNA record](https://www.rcsb.org/structure/1BNA) confirms X-ray diffraction, 1.90 Å resolution, two 12-residue chains and the Drew et al. primary publication. The 12 C1′ pair distances were independently recomputed from the supplied PDB with a separate Euclidean calculation; all agree with the JSON values at their recorded four-decimal precision. The independent receipt is in the internal audit directory as science-independent-review.json. No source asset was regenerated.

The source material is suitable for a real worked example. The final slide still needs a visible connection between molecular structure, the measured pair and the plot. Identify the chain colors, explain what one plotted position denotes, and use a locator/measurement label if the audience must relate a point to the structure. Do not imply that the line is a temporal trajectory or that positions are repeated experiments. Keep the non-zero y-axis labels visible.

A concrete composition issue is the transparent canvas around both structures. The side image is 1572 × 1572, but its nontransparent bounds are x=474…1127, y=189…1437; its bounding box is about 33% of the canvas area. The end image is 1812 × 1812 with bounds x=547…1300, y=527…1260, about 16.8% of canvas area. Placing either full square in a modest slide rectangle makes the molecule unnecessarily small. Crop the transparent margin in the slide, with a small safety margin and original aspect preserved; retain the original asset bytes. The side view can be the dominant narrow figure. The end view should appear only if it serves an actual comparison or geometric explanation.

## Current 19-page candidate: narrative review

The proposed 19 roles are sufficient for a coherent introduction, but their initial order separates the real edit from its review and introduces Story after the edit. This is a sequencing issue, not a slide-count issue.

Using the integration owner's initial page numbers, the recommended order is **1, 2, 3, 6, 7, 4, 8, 11, 9, 5, 10, 12, 13, 14, 15, 16, 17, 18, 19**. The intended progression is:

- Product and actual scientific example.
- Evidence Section: real Editor, original assets/source, editable chart/table/formula using that same example.
- Human/Agent Section: Story and preservation request, client/shared-writer relation, the actual targeted edit, its saved-operation review.
- Reuse Section: actual pages in two talks, a concrete position/identity example, Live/Pinned.
- Presentation/export, the portable project folder, direct attribution, a useful next action.

This order keeps request → edit → review connected. An alternative order can work, but the same example must remain recognizable through that sequence. Do not turn an early before/after into a detached teaser and then explain the tool chain without reconnecting it.

### Redundancy to resolve

The scientific page, the chart/table/formula page and the edit page should have different jobs. The scientific page shows what the work means; the object page shows how the same figure, values and expression remain separately editable; the edit page proves a requested change preserves that evidence. A generic inventory of chart/table/formula features would repeat familiar PowerPoint capabilities and dilute the workflow claim.

The reuse/identity/Live-Pinned sequence also needs three distinct questions: **which pages belong in each talk; what stays the same when order changes; which artwork follows Main and which stays fixed**. The identity page should use real examples, such as three page titles or thumbnails with Main/full/brief positions. A glossary of pageId, occurrenceId and UUIDs would repeat definitions while showing little.

A folder page near delivery is appropriate if it answers “what do I take away?” Link the actual directory parts to the just-demonstrated artifacts. The ending should give a concrete action—open the supplied example and change one thing—alongside the project link and original mark, rather than a generic motivational line.

### Scientific editing value

The opening example must be introduced as a real page being built and maintained in HUANDENG. A light example label, clear cover promise or explicit speaker transition can do this without turning the scientific title into product marketing. The scientific content then remains a plausible authored page.

The preservation demonstration should visibly keep the structure, selected atoms, plot values, axis scales and source intact while the title/explanation changes. A before/after of only two text strips proves the wording changed; it does not by itself show that the figure was preserved. Show enough of the common scientific page for the viewer to recognize the same evidence.

## First actual representative-frame review

The Chinese and English science and client/architecture frames were inspected as actual PNGs. Temporary Main positions 23/24 were understood as old-page staging, not a visual defect; final positions will be derived.

**Historical first science frame: continue with targeted refinement.** The two highlighted atoms and measurement line on the structure, the selected red point and the A7/B18 value form a visible semantic chain. Chain labels and source attribution are present, and the picture is now large enough to function as evidence. This is a material improvement over the text-led 0.18 example.

The native chart's endpoint ticks currently create half-steps at 10.1 and 11.1 around the regular 0.2 grid. A 10.0–11.2 domain with 0.2 ticks gives a more legible uniform axis while preserving the real values and the explicit non-zero scale. The final visual decision should keep the actual pair meaning and axis labels readable; it must not invent experimental variability.

**Client/architecture frame: redraw the lower relation.** The original marks and gray-green field are effective, but Plugin ↕ Connector ↕ PPTD + Editor appears to be a serial processing pipeline. Plugin is guidance rather than a data-processing stage; the depicted structure also omits the actual shared writer and the human canvas entry.

Keep the four client identifiers. Below them, show the supported relationship: agents through the connector reach the Editor's shared write service; human canvas edits reach that same service; it persists the PPTD project. Place plugin guidance near the client group as an instruction role. A conceptual diagram is justified here because it explains convergence and ownership; short decorative arrows between role descriptions do not yet explain those relations.

## Recent: specific visual relationships, not a white-background prescription

Actual static source images were inspected from [Recent's design collection](https://recent.design/) and [app screenshots collection](https://recent.design/app-store-screenshots). This is a composition review of those images, not a claim to have tested their apps or animations. Original pixels remain in the internal inspection cache; no external artwork was copied into the introduction asset library or slides.

| Inspected example | Concrete relationship in the image | Useful transfer to HUANDENG |
| --- | --- | --- |
| [Pace experimental layout](https://cdn.recent.design/items/cerral2/0/image/50f4dcbbec0261806ed5/1844.webp) | A large portrait and repeated geometric motif occupy most of the surface. Small copy and the prominent wordmark occupy opposite upper corners. The brand mark belongs to the composition rather than being an afterthought. | Give the original HUANDENG mark a deliberate position and scale on the cover. Let a large real work object carry the page. In reuse pages, actual slide previews can create a meaningful repeated form; their identity and selected contents must remain visible. |
| [Linear Mobile screenshot](https://cdn.recent.design/items/6lc4ss0/app-store/screenshots/0/600.webp) | A short claim precedes a large legible product view. The dark outer surface and product surface are related, while the device boundary and UI hierarchy preserve separation. Small colored icons encode different real items. | A real Editor view should dominate the orientation page and show a meaningful current task. Use the surrounding slide surface to make that view readable. Small semantic icons are useful when they identify content; a fake device frame is unnecessary. |
| [Cursor app screenshot](https://cdn.recent.design/items/3fx6gpg/app-store/screenshots/0/600.webp) | One dark headline and quieter supporting wording sit directly above the actual task list. The interface fills the remaining space instead of competing with a paragraph of feature claims. | Put a concrete action/benefit above one actual task crop. Ensure the crop proves the wording, such as selected data or an actual saved operation. Reduce supporting text weight, not the size of the useful visual. |
| [Flighty presentation image](https://cdn.recent.design/items/d4r3nnp/app-store/screenshots/0/600.webp) | The aircraft, route and map share the product's subject. Large text sits in a quiet upper field; the visual has room and a distinct accent. Lower identity/award objects are grouped separately. | An actual structure/plot can be a strong subject, with text located where it remains legible. The lesson is semantic image–product fit and clear grouping, not a requirement for 3D decoration, dark backgrounds or copied accolades. |
| [Easy Does It poster](https://cdn.recent.design/items/2yzdjxg/0/poster/1192.webp) | One large chromatic form reaches the edges. Narrow, aligned text establishes an edge rail; short metadata does not become a competing center. High contrast assigns clear roles to form and type. | Let a justified scientific figure or task region use most of the frame. Align compact source/caption text to a stable edge. Strong image scale and type placement are transferable; the abstract gradient is not scientific evidence. |
| [Meridian seat-selection interface](https://cdn.recent.design/items/wn7zt6p/0/poster/553.webp) | Many repeated seat objects preserve their spatial relationship. The screen arc orients the viewer. State colors and a nearby legend make the repeated geometry useful rather than generic decoration. | A library of actual slides can be dense when membership, order and selected/fixed states matter. Mark states consistently and label their meaning. Do not reject every repeated thumbnail layout as a card wall, or copy low-contrast phone labels into projection slides. |
| [Sign-in composition with Ramp button](https://cdn.recent.design/items/ukxeowa/0/poster/1200.webp) | Peripheral textured imagery recedes around a quiet center containing a small identity mark, concise wording and one bright control. Background complexity and foreground contrast are separated spatially. | Reserve a calm, high-contrast region for identity and the main claim when a cover has a complex visual. The evidence can remain large elsewhere. Do not place labels on busy molecular detail or borrow an unrelated particle texture. |

These references support three concrete choices for the new deck. First, the image or interface earns enough space to demonstrate the point. Second, background is an active relationship between content regions and visual roles, not a pass/fail “all white” flag. Third, logos and semantic marks belong in the explanation when they identify products, sources or states.

The new science frame's warm surface and the architecture frame's gray-green surface can form a coherent two-role system. A white task screenshot can remain its own document surface within that system. The role should stay recognizable through the sequence; adding an arbitrary third color to every page would not provide the same coherence.


## Updated frames and complete root-candidate review

The revised cover, science, Section and architecture frames were inspected in both languages. The 10.0–11.2 axis resolves the earlier uneven endpoint intervals. The new diagram correctly separates client guidance from Connector ↔ shared document service ↔ human canvas editing, with persistence to deck.pptd. The four original client marks, original HUANDENG mark and actual scientific Editor view now carry identity and product meaning.

All **19 Chinese and 19 English pages** were then inspected individually in actual Main order. This is an agent review of a candidate, not author acceptance. The sequence now makes the same scientific evidence recognizable through editable objects, Story, a real wording change, saved versions and different talk references. Warm evidence, gray-green product/structure and sand provenance/folder surfaces have consistent roles. No English long-copy clipping or missing figures was observed in these rendered candidates.

Four targeted revisions were requested. The Main page number is used below; internal render filenames retain the earlier design number.

| Main page | Finding | Requested revision |
| --- | --- | --- |
| 4, Chinese | The right-side copy leaves “象。” and “面。” as isolated fragments. | Rephrase the canvas and notes descriptions into natural, complete lines without enlarging the text. |
| 11, both languages | The left crop proves named versions, but the right repeats the scientific page while the footer claims operation history. | Keep the version evidence and replace the repeated page with the actual two-text operation detail or clearly labelled real field differences. |
| 16, both languages | Playback-menu text is roughly three times the apparent size of Export-dialog text; the dialog also comes from the earlier six-page fixture. | Reduce the oversized menu, enlarge a meaningful Export task crop, and prefer the actual current project's range. Pixel resolution alone does not resolve display-scale imbalance. |
| 18, both languages | The GitHub symbol above OpenPPTD can be mistaken for that project's own logo. | Label it as a code-repository symbol beside the contribution attribution. |

Page 14's three-row position table was checked against the actual project models. Science is Main/full/brief **2/2/3**; clients **9/9/2**; focused edit **10/10/4**. Both projects have 19 full and 7 brief entries. The brief science reference resolves to its real wording-edit checkpoint. Its smaller axis difference is truthfully explained on page 15; an axis detail could make the difference easier to notice, but the underlying state is valid.

The two saved scientific page sources were independently parsed and compared. Their only differing fields are the title and context text. All 12 current chart values equal the public measurement JSON. Pinned and current structure-image hashes are identical; their different source paths distinguish the saved asset from the imported asset, not different pixels. The subsequent 10.1–11.1 to 10.0–11.2 axis refinement is a separate state change. This page-source comparison does not independently prove preservation of every other page; that broader assertion remains supported by the transaction receipt.

The 38 inspected PNG hashes and Main/design-number mapping are recorded in the internal peer-review/candidate-inputs.json; source checks are in peer-review/source-evidence-verification.json. The later corrected-page and final Office checks described below close this earlier inspection stage.

## Independent DeepSeek candidate review

The new DeepSeek Chinese trial was inspected as all 16 individually rendered PDF pages and three contact sheets. It has materially stronger identity and scientific use than the rejected 0.18 direction: a dark green branded cover and client page, warm scientific surface, title-only Sections, an actual 1BNA structure/curve and explicit source/scope. The 10.23–10.89 Å range and statement that the twelve points are positions in one structure are accurate.

The remaining limitations are specific. Pages 8, 12 and 13 use the earlier text-only public fixture for the actual editing/review demonstration rather than carrying the scientific example's structure and 12 values through the edit. Page 13 reduces two complete dialogs enough that the changed-field details are difficult to read. Page 6 presents pageId, occurrenceId and versionId together, adding implementation vocabulary early in the introduction. Page 15 describes OpenPPTD as a “PPTD document foundation”; the current [vendored NOTICE](../packages/core/src/pptd/vendor/open-pptd/NOTICE.md) and [source comparison](POWERPOINT-COMPARISON.md) identify the reused MathML-to-OMML formula conversion modules. That contribution should not be broadened into authorship of the current document model. Its GitHub symbol is a repository marker, not an OpenPPTD product logo.

These are recorded as observations about the frozen native result. No page, export or screenshot was replaced, and the model was not asked to redo its aesthetic choices. The internal peer-review/deepseek-visual-review.json binds this assessment to the sixteen inspected page hashes. This review does not claim the author accepted the candidate.

## Portable public scientific sources

The science source manifest now covers the original coordinate file, measurements, derived figures, plots, both reproducible scripts and the README, excluding its own hash. The marked A7/B18 C1′ segment is documented as a geometric measurement rather than a chemical-bond annotation. Both root projects contain identical, complete sources/science copies, including all files referenced by that manifest. The package includes original figure bytes so the relative references resolve without an external shared-assets directory.

The source.json SHA-256 is `6cc19ce8ad1a3e97a6ccffee65e86a09aacc414dac51c29761f7070901c27fd4`. Each copy contains fourteen files; all thirteen manifest entries and all copied bytes were verified. The internal receipt is science-package-verification.json. Numeric reproduction uses the unchanged PDB; plot bytes can depend on renderer/font versions, which the README distinguishes from the exact distributed-file hashes. At this earlier step only the two root projects received the science package. The final portable delivery includes the same source files in all four projects; these coordinator additions do not change native page authorship.

## Closure of the four root-candidate revisions

All twelve re-rendered pages were inspected again: design files 01, 04, 06, 10, 16 and 18 in both languages. They are the only changed PNG inputs since the full 38-page review. The four requested corrections are closed at agent-review level; this does not record author acceptance.

Chinese page 4 now uses complete natural lines. Page 11 retains the real named-version crop and replaces the repeated science image with legible before/after text values. All four displayed strings in each language exactly match the corresponding saved page sources; its notes state that the native text transcribes the operation snapshots rather than simulating an interface. Page 16 now shows the actual 19-page project, with a smaller playback menu and a larger meaningful Export region at comparable visual text scale. Page 18 labels the GitHub symbol as a repository marker. The refreshed cover and Editor page show the complete current project; the chart/table/equation page retains its correct data and adds the visible PDB identifier.

No new concrete clipping, missing-image, language or attribution defect was observed in these corrected renders. The latest hashes replace the twelve previous hashes in peer-review/candidate-inputs.json, which preserves each prior hash and records the closed findings. The delivered PDFs and actual Office output were subsequently inspected; the final evidence and exact export hashes are recorded in INTRODUCTION-DELIVERY.md and evidence/introduction-rework/office-qa.json.

## Claude native candidate and export-specific review

The Claude candidate was reviewed through four PDF contact sheets covering all twenty pages, and full-size PDF pages 5, 10, 17, 18, 19 and 20. Its native chart, selected-value table and structure create a concrete scientific page. The real full/brief talk thumbnails and notes comparison, shared-writer/human-editing relation, project-folder table and correctly limited OpenPPTD attribution make the introduction more specific than the rejected 0.18 direction. No clipping was observed on these six PDF focus pages. The actual before/after editing example still uses the earlier text fixture, so the scientific figure does not itself pass through that demonstrated edit.

The native controller reported an account quota stop after the twenty-page source had been written; native_completed remains false. Its later export was mechanical and did not revise the native pages. This status is distinct from the availability of usable exported files.

Actual Office page 5 has a material difference from the PDF: the chart's numeric x-axis was laid out differently, while the manually placed base-pair labels and explanatory line retained their old positions. They crowd the axis and the first C–G label sits near numeric position 2 rather than 1. The curve's measured values are not replaced, but the label-to-position association is unreliable in this exported Office page. This is a scientific readability/association defect, not merely a taste preference. The authored .page files were not edited or aesthetically resubmitted. Coordinator metadata completion followed Claude's exact existing plan; export and packaging documentation changes are recorded separately.

For the root editions, all eight Office contact sheets covering the 38 pages were inspected, with full-size checks of pages 2, 5, 6, 14 and 17 in both languages, plus Chinese page 4 and English page 11. Charts, table values, Chinese lines and actual text-difference layout were intact in those checks. Page 6 exposed an export-specific layout difference: the display equation was centered by the browser but started at its wide text box's left edge in Office. The requested narrow, explicitly positioned equation box was applied. The final Chinese and English Office pages 2 and 6 were independently re-inspected: the twelve-point single series, axis labels, selected-value table, centered equation and English wrapping showed no further concrete defect.

### Current main chart versus saved historical states

The initial representative frame and saved wording-edit/pinned states used a red helper series to emphasize position 7. The final Main chart contains the twelve measured distance values in one native editable series. The structural A7/B18 measurement line and adjacent value identify the **seventh curve value**, without claiming that the current chart contains a red point. The old before/after and pinned images remain authentic historical states with their original red emphasis.

The helper-series removal and equation-box adjustment are later compatibility edits. They are not part of the two-field wording operation and must not be folded into its preservation claim. The focused final Office review of pages 2 and 6 and affected English wrapping is complete. The final Claude PPTX was also fully re-rendered after metadata packaging; all twenty rendered pages are pixel-identical to the previously reviewed Office sequence, retaining its known page-5 label defect.
