# V018 introduction slides: validation

> Historical 0.18 record. The author rejected the introduction slides after this record. The current introduction/design contract is [INTRODUCTION-REWORK.md](INTRODUCTION-REWORK.md); current validation and handoff are in [INTRODUCTION-DELIVERY.md](INTRODUCTION-DELIVERY.md). This record retains its historical technical measurements and does not establish author acceptance. Editor 0.18.0 is unchanged; current AI guidance is plugin 0.18.2.

Date: 2026-11-10.

## Visual review scope

This section records the independent visual and narrative review of the ChatGPT-authored
Chinese and English HUANDENG introductions: 22 pages in each language.
The Claude Code and DeepSeek Harness outputs are separate native tool trials. Their original
outputs and the assets actually available to them remain unchanged; later screenshots are not
retroactively counted as improvements to those trials.

All 44 introduction pages were inspected at contact-sheet scale. Critical pages were also
inspected at reading size, including source structure, presentations, identity, Story,
Browse/Outline, agents, the actual edit, saved changes and Live/Pinned references.
After revision, pages 11, 13, 15 and 18 were reread in both languages.
The final Chinese page 15 caption was also checked in the Editor and actual PowerPoint output.

The UI screenshots come from the actual production editor service in isolated headless
Chromium, not reconstructed interface artwork. Full windows use native DPR2; task crops
use native DPR4. The authored example content is public and contains no customer results.

## Visual decisions and findings

| Area | Accepted behavior |
| --- | --- |
| Background and hierarchy | Consistent white backgrounds; regular Chinese body text and restrained title hierarchy reduce visual pressure |
| Section rhythm | Pages 3, 8 and 17 contain only the section title, without a footer or decorative subtitle |
| One source, several talks | Actual Main and short-Presentation state supports the explanation |
| Stable identity | Actual before/after status strips show Position 2 then 4 while retaining the same short code |
| Story | The actual Story panel explains purpose, preserved content and the requested change |
| Readable evidence | Feature pages use task regions rather than shrinking every complete workspace |
| Source quality | The actual asset panel shows an imported PNG at 3840 x 2160 pixels |
| Concrete editing | Before/after content and a two-object saved-change list match the recorded writer operation |
| Tool roles | Plugin guidance, connector access and editor review are stated separately |
| Delivery | Localized export and presentation controls come from original high-resolution captures |

### Revisions requested by the independent reviewer

The first replacement Outline screenshot on page 11 was still unreadable at its display size.
Its 4448 x 1480 source was captured at DPR4, so the original region was 1112 CSS pixels wide.
Placing that entire region at about 400 slide pixels reduced a 13 px interface title to about
4.7 px. A left-side 44 percent crop preserves the thumbnails, headings and summary while
removing the unused right half. The revised image is readable and aligns with Browse.

Page 13 originally named compatible agents but did not explain the tool chain.
The revised right column explains what Plugin, Connector and Editor each do.
The Chinese title and the page 11/18 terminology were also made more natural.

Page 15 originally showed named versions while describing the scope of a particular edit.
It now shows the actual saved operation's changed title and explanation objects.
Named milestones remain a separate concept on page 16.

## Screenshot and example-project evidence

The public source library contains 120 original PNGs: 37 recommended, 37 reference and
46 diagnostic images. Original image bytes and SHA-256 hashes are preserved.
The release manifest uses logical project names, Public-Evidence-EN and Public-Demo-ZH.
Earlier Chinese-chrome/English-content captures and empty History states remain diagnostic;
they are not presented as final localized or completed-edit evidence.

Each public example contains six active pages and a three-page presentation referencing them.
The focused edit changes only title and explanation text through one writer transaction.
All other fields, objects and other pages match the baseline as parsed data.
A separate non-anchor page moves from Position 2 to 4 with its short code unchanged.
The supported undo restores page content, order and Project structure.

The portable English and Chinese copies preserve 17 and 11 original project files respectively,
including named checkpoints and imported image originals. Both copies were opened from their
release locations with a fresh writer state outside the deliverable. Each exposed six pages,
three short-presentation references and two named versions of the changed page.
The earlier checkpoint rendered its original title through the version-preview API.
Opening and reading the projects left every delivered project byte unchanged.

Logical evidence paths:

- Release/assets/manifest.json
- Release/assets-release-verification.json
- Release/evidence-projects/manifest.json
- Release/evidence-portability-validation.json
- ChatGPT/audit/independent-review-v018.md
- ChatGPT/audit/independent-review-inputs.json

## Office, PDF and portable delivery acceptance

The integration workstream validated the actual final exports, separately from the editor renders.
The machine receipt is ChatGPT/audit/artifact-qa/artifact-acceptance.json.
All four portable project checks reported an empty diagnostics array, and the source hashes
remained unchanged during inspection.

| Edition | Project pages | PDF pages | PPTX slides | Native PPTX text characters |
| --- | ---: | ---: | ---: | ---: |
| ChatGPT Chinese | 22 | 22 | 22 | 1618 |
| ChatGPT English | 22 | 22 | 22 | 3722 |
| Claude Code English | 21 | 21 | 21 | 7419 |
| DeepSeek Harness Chinese | 21 | 21 | 21 | 2957 |

The two ChatGPT PPTX files were opened read-only in Microsoft PowerPoint 16.0, without
Open and Repair. All 22 slides in each file were exported through PowerPoint itself.
The source SHA-256 before and after the operation was identical.
The integration owner inspected all six resulting contact sheets and reported no clipping,
missing images or glyph problems.

The two ChatGPT PDFs were also rendered through MuPDF, covering all 44 pages.
The integration owner inspected all four PDF contact sheets with the same result.
The final Chinese page 15 was additionally inspected by the visual reviewer in both the
editor render and the actual PowerPoint image; the final caption break is correct in both.

The Office automation receipts record successful opening/export and unchanged sources.
Their capture-time visualReview field says that separate inspection is still required.
The subsequent visual acceptance above is recorded by the integration workstream rather
than inferred from automation success.

### Exact checked exports

| Logical file | SHA-256 |
| --- | --- |
| Release/huandeng-chatgpt-zh.pptx | dd3dd5c55cfc1cc877941e36eb99a3c54b704255da56c7564c236c2d5bc090a7 |
| Release/huandeng-chatgpt-en.pptx | 15a25175a6764697e78a5070a1a10e77a6ade002aaa15e602f065668b6910045 |
| Release/huandeng-chatgpt-zh.pdf | e3f8f38a602eedce0acb729beb95fe60076ec8065114f3d45b4efc1c023e6c20 |
| Release/huandeng-chatgpt-en.pdf | c63d5f9eac1c097ef76ecfcbbbedbb65725bb2c8add227c53c406c1d1bbf1413 |
| Release/huandeng-claude-en.pptx | 6aed9ef80c3bd10232730e0b8d92c752037e3f910fa8844b2100ad452cebcc4c |
| Release/huandeng-deepseek-zh.pptx | c4650175315b8dff4ff1a39daf1daeba61b0458cdcb093d1c5481622587302db |

### Machine-receipt provenance

| Logical receipt | SHA-256 |
| --- | --- |
| ChatGPT/audit/artifact-qa/artifact-acceptance.json | effff2772ba5e5852e4d205778a8c45919ef03884c304999adf3b4bcd0b8d6f3 |
| ChatGPT/audit/office-final-en/office-render-acceptance.json | 8d093f430426edb6049501032e4076a903f6353e47528896b083cee3e6436a2c |
| ChatGPT/audit/office-final-zh/office-render-acceptance.json | 8a0612f4687cb81f11efc32abbdc6895025190f974beb970b3e8ace0dcbeb170 |

## Practical limits of this validation

- The editor review covers all pages at contact-sheet scale and selected pages at reading size.
  It is not a pixel-by-pixel equivalence test of every renderer.
- The Office check covers PowerPoint 16.0 on the validation machine. Font substitution and
  layout on other operating systems or Office versions were not revalidated in this pass.
- These are static introduction exports. This review does not establish animation or
  transition equivalence across presentation applications.
- The PPTX files contain native editable text. Product UI screenshots remain image objects;
  their internal labels do not become separate PowerPoint text boxes.
- The portable checkpoint examples are text-focused. The PNG import and dimensions display
  were checked, but these particular checkpoint comparisons do not independently prove
  every image-archive recovery case.
- Operation/activity logs remain local writer state and are excluded from portable projects.
  Named checkpoints, source pages and sanitized worked-edit proof accompany the examples.

Automated design checks reported no findings, yet the first page 11 screenshot needed a
readability correction. Native pixel count cannot replace inspection of the final display size.
For feature evidence, estimate effective label size as native CSS font size multiplied by
slide display width divided by captured CSS region width. A useful review target is roughly
10 px at 960-wide slide scale when the audience must read the label. Orientation images have
a different purpose and may show the full application window.

Final visual acceptance: passed. No blocking visual or narrative issue remains.

Public delivery summary: Release/slides-validation-summary.json. It uses logical paths and records
the source-receipt hashes, export hashes and separately reported visual inspections.
