# Historical validation: the superseded 24-page tutorial revision

**Status updated 2026-11-11:** this document preserves the earlier revision's reported checks. It does not validate the current ChatGPT English 28-page / 19-occurrence or Chinese 31-page / 21-occurrence projects. Current visual review and final output checks remain in progress. The [current implementation scope](PRODUCT-INTRODUCTION-SPEC.md) and [story contract](INTRODUCTION-STORY-SPEC.md) govern the revised work.

The earlier tutorial-only interpretation, removal of title-only Section pages and watermark-only native freeze below are superseded. Current Section pages must contain only a title. The primary session now personally revises both ChatGPT editions. Claude Code's last native review jobs were interrupted by the host's five-hour usage limit; DeepSeek continues its own revision. The 0.20.0 Editor/plugin candidate is not declared released by this record.

Everything below describes the old saved source and outputs. File links may now point to paths that are being updated; an old result applies only to its recorded revision or hash. Preserve the record without treating its editorial assumptions, counts, watermark strings or claimed passes as current instructions.

**Result reported at that revision:** the two ChatGPT Editor walkthroughs were recorded as complete and personally reviewed, the four native editions preserved their then-frozen source content with watermarks added, and 22 PDF/PPTX files passed structural delivery checks. The 11 PPTX files were opened read-only in actual PowerPoint and rendered. One pre-existing Claude English chart-label layout issue was documented. Those technical checks did not establish that the author's narrative and design requirements had been met.

The [previous 0.19 validation](PRODUCT-INTRODUCTION-VALIDATION-PREVIOUS-019.md) is also historical. Public historical documents have machine-specific identifiers generalized as described in the [source audit](PUBLIC-SOURCE-AUDIT.md).

## Historical editorial premise, subsequently corrected

The earlier ChatGPT editions still gave too much space to the product's origin and scientific slide example. The final editions teach the Editor through actual work: open a project, locate a page and object, use Story and original assets, edit and save, inspect the change, name a version, arrange a talk, write its Notes, choose live or pinned references, rehearse and export.

The primary session wrote and designed every English page. Three parallel section agents authored eight Chinese pages each. The primary session coordinated shared metadata and personally inspected every final Chinese page. English and Chinese are independent explanations, with no forced semantic or page alignment.

The DNA source package and earlier named versions remain available as provenance and history. They no longer organize the ChatGPT tutorial.

## Editions at the historical baseline

| Edition | Main | Brief | Visible watermark |
| --- | ---: | ---: | --- |
| ChatGPT English | 24 | 12 | English · ChatGPT 6 Astra |
| ChatGPT Chinese | 24 | 12 | Chinese · ChatGPT 6 Astra + Subagents |
| Claude English | 25 | 9 | English · Claude Opus 5.5 |
| Claude Chinese | 26 | 9 | 中文 · Claude Opus 5.5 |
| DeepSeek English | 22 | — | English · DeepSeek V4.1 Flash 1017 |
| DeepSeek Chinese | 22 | 12 | Chinese · DeepSeek V4.1 Flash 1017 |

These are 143 Main pages and 54 Brief occurrences. The [collection index](../examples/huandeng-introduction/README.md) links the six editable entries.

## ChatGPT source and visual checks

Both projects retain their stable page identities, originals and meaningful history. Page and metadata edits used the active shared writer with fresh revisions, exact preview/apply and saved-operation readback. Every final page has Notes and current Story purpose and preservation constraints. Forty-eight final named page versions were recorded after visual review.

The primary session inspected all 48 final Editor renders individually. The review checked readable UI regions, actual controls, complete crops, visible comparison guides, layout, Notes/Story consistency and the correct editable watermark. Concrete crop problems in the English Assets, text-properties, Layers and assistant-selector views were corrected and rendered again. Chinese section owners also reviewed their final returned pages before integration.

| Image use at the historical baseline | English | Chinese |
| --- | ---: | ---: |
| Distinct referenced image files | 32 | 43 |
| Image instances on Main pages | 39 | 52 |
| Main pages personally reviewed | 24 | 24 |

These counts describe current image objects, not a quality score. They include actual Editor regions, page previews and retained public operation/identity evidence. Current captures use Editor 0.19; selected prior 0.18 evidence is identified by source. Image originals and their hashes remain available; native crops preserve the original files.

The English short talk is **First edit · short talk**, with 12 occurrences and the named **Project map · tutorial** pin. The Chinese short talk is **第一次修改 · 简短演讲**, with 12 occurrences and **保存页面 · 教程定稿** pinned. Both include actual occurrence-specific Notes. Sections begin at useful content pages; the earlier title-only divider pattern and scientific pin are historical.

Evidence paths recorded at that revision (not acceptance of their current contents):

- [English personal review](../examples/huandeng-introduction/chatgpt-en/evidence/final-review.json), [assets](../examples/huandeng-introduction/chatgpt-en/evidence/assets.json), [composition](../examples/huandeng-introduction/chatgpt-en/evidence/composition.json) and [Notes](../examples/huandeng-introduction/chatgpt-en/speaker-notes.md).
- [Chinese personal review](../examples/huandeng-introduction/chatgpt-zh/evidence/final-review.json), [assets](../examples/huandeng-introduction/chatgpt-zh/evidence/assets.json), [composition](../examples/huandeng-introduction/chatgpt-zh/evidence/composition.json) and [Notes](../examples/huandeng-introduction/chatgpt-zh/speaker-notes.md).

Earlier root evidence is retained under each project's `evidence/history/before-final-20261111`; it does not validate the current artwork.

## Native freeze verification

The owner froze both Claude Code and DeepSeek Harness editions. Their native authors added the language/model watermarks.

A separate read-only comparison checked all **95 Main pages** against the pre-watermark baseline. Each page has exactly one new attribution text object. Removing that object reproduces the entire prior page data. Original element order, objects, Notes, scientific values, metadata, stable page order and Presentation arrangements remain unchanged. Both Claude native chart objects and their data match the baseline.

The [full freeze report](evidence/final-examples/native-watermark-freeze.json) includes per-page results and aggregate data hashes. This verifies the authorized maintenance boundary; it does not rewrite prior authoring findings as new passes.

Both Claude native watermark jobs exited successfully. Both DeepSeek native tasks reported completion and saved their watermark changes through the real native bundle, but their processes retained the host's Windows ACL/permission failure and exited with code 1. The saved project results were independently verified. No permission bypass, account/profile change or raw-MCP substitution was used to erase that distinction. See [native job outcomes](evidence/final-examples/native-watermark-jobs.json).

## Final PDF/PPTX checks

All **22 files**, representing **11 saved collections**, were regenerated from the final source through installed Editor 0.19.0. Canonical filenames are `Exports/deck.pdf`, `Exports/deck.pptx` and, where authored, `Exports/brief.pdf` and `Exports/brief.pptx`.

The [export report](evidence/final-examples/exports.json) records:

- 197 PDF pages and 197 PPTX slides, in the expected saved order.
- Exact attribution text on all **394 delivered pages** across both formats.
- All **197 PPTX Notes** matching the resolved page or occurrence Notes, with Unicode and whitespace normalization.
- Correct 960 × 540 dimensions, ZIP integrity, relationships, media/native-object counts and file SHA-256.
- Nine verified image-fallback uses across the ChatGPT Main/Brief outputs.

Those fallbacks cover five folder-icon objects and one multi-point emphasis line, reused where appropriate. The exported PNG resources are present and nonempty; extracted pixels and actual PowerPoint renders preserve their appearance. These particular objects are images in PPTX while remaining native editable objects in the HUANDENG project. The report retains `UNSUPPORTED_OBJECT` / `UNSUPPORTED_LINE_PATH` warnings rather than concealing the fallback.

Fonts are not embedded. The exporter's native-chart advisory is separate from actual Office inspection.

## Actual PowerPoint inspection

All **11 final PPTX files / 197 slides** were opened using PowerPoint's read-only `Open2007` route with repair disabled, and rendered to individual PNGs. Original exports and identical inspection copies retained their SHA-256 values. The [Office record](evidence/final-examples/office.json) identifies the exact files, actual application version and inspection scope.

The final ChatGPT Main pages received full visual review in Office. The file-folder icons and Chinese export-range emphasis line were compared with the current Editor images; no missing graphics or severe displacement was found. The primary session also directly inspected the English project-map and handoff pages and the Chinese export-range page in Office.

Claude English retains its earlier **Main page 12 / Brief page 5** issue: the native chart's long x-axis explanation overlaps the numeric tick-label band in PowerPoint. Its source values and curve remain correct, and the native chart is present. The primary session inspected the actual final Office page. The Chinese counterpart does not show that overlap. The frozen source was not changed to hide the finding.

PDF/Editor appearance and native PowerPoint layout are therefore reported separately. Technical checks and reviewer judgment do not assert the owner's acceptance of the rebuilt ChatGPT designs.

## Runtime, plugins and public-source boundary

The Editor runtime remains 0.19.0 at source C3 `cadaecbf9cf1661e28464fe68b7b866f68fecabe`; core npm remains 2.3.1. This final example/documentation milestone does not rebuild or relabel that executable.

Both client-package forms are built inside the engineering project from `plugins/huandeng`. The final packaging changes repair documentation links, include the linked native guide and correct the current Agent setup toolbar route. Runtime, adapter and shared skill bytes remain identical to the existing native installation. Package integrity/protocol checks and real native task evidence are kept distinct in [native integration](NATIVE-INTEGRATION-0.19.md).

Public-source cleanup preserves licenses and source attribution while removing private account bindings, native session identities and machine-specific document paths from the candidate tree. It does not erase private Git history. The [readiness record](OPEN-SOURCE-READINESS.md) describes the clean source snapshot, prepared delivery files and remaining publication decisions.
