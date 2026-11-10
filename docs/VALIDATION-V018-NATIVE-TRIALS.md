# v0.18 validation — independent native-agent trials

> Historical 0.18 record. The author rejected the introduction slides after this record. The current introduction/design contract is [INTRODUCTION-REWORK.md](INTRODUCTION-REWORK.md); current validation and handoff are in [INTRODUCTION-DELIVERY.md](INTRODUCTION-DELIVERY.md). This record retains its historical technical measurements and does not establish author acceptance. Editor 0.18.0 is unchanged; current AI guidance is plugin 0.18.2.

Completed 2026-11-10 on THUG. Both native clients produced 21-slide editable HUANDENG projects and native PDF/PPTX exports. Claude completed the original English task without coordinator authoring assistance. DeepSeek's Chinese first round hit a real binary-file execution blocker; its raw result remains frozen, followed by exactly one authorized same-session technical continuation after coordinator asset import. Neither client received aesthetic feedback or a redesign request.

## 1. Frozen first-pass evidence

Base directory: `<intro-workspace>\Trials\supervision\submissions\`.

| Submission | SHA-256 | Files |
|---|---|---:|
| `deepseek-zh-first-round.zip` | `ecae4d1c68f09ebc573fb3698f02c8a00240d9f4da5259590776145f3a78ea00` | 40 |
| `claude-en-first-round.zip` | `08705ac49cbc2b0bc87deff846cc618d14053dc65c24d7bcdab9b11fca8cfe37` | 83 |
| `deepseek-zh-assisted.zip` | `570d5bd03f00df91acf386677d8742df3371480055df2df1675128627e53e04e` | 71 |

Each archive has a separate `*-manifest.json` with every file hash. Archive bytes were checked against the manifests. Claude's original 83 files were rechecked and remained unchanged. DeepSeek's continuation changed only 4 of 21 `.page` files; the other 17 pages matched the raw archive byte for byte. The continued live project's export paths necessarily contain its new exports; the raw first-pass PDF/PPTX remain in its frozen archive.

## 2. Final deliverables

| Client | Editable entry | PDF | PPTX |
|---|---|---|---|
| Claude English | `<intro-workspace>\Trials\claude-en\slides\deck.pptd` | `<intro-workspace>\Trials\claude-en\Exports\HUANDENG-claude-en.pdf` | `<intro-workspace>\Trials\claude-en\Exports\HUANDENG-claude-en.pptx` |
| DeepSeek Chinese, technically assisted | `<intro-workspace>\Trials\deepseek-zh\slides\deck.pptd` | `<intro-workspace>\Trials\deepseek-zh\Exports\HUANDENG-deepseek-zh.pdf` | `<intro-workspace>\Trials\deepseek-zh\Exports\HUANDENG-deepseek-zh.pptx` |

The editable deliverable is the entire `slides` folder, including pages, media and `.huandeng` metadata/history. `deck.pptd` alone is only its entry. The final index records full file hashes. DeepSeek's final named exports are coordinator-created byte-identical copies of HUANDENG's own `slides\Exports\deck.*`, not regenerated exports.

## 3. Acceptance and visual result

| Evidence | Claude English | DeepSeek raw first pass | DeepSeek after technical continuation |
|---|---|---|---|
| Pages / pure dividers | 21 / 4 | 21 / 4 | 21 / 4 |
| Sections | 4 | 5 | 5 |
| Presentations | 21 full + 8 brief | 21 full + 7 brief | Same as first pass |
| Notes | 21 of 21 | 21 of 21 | 21 of 21 |
| Real UI imagery | 8 English crops + official logo | None | 3 Chinese UI crops + official logo |
| PPTX editable text runs | 160 | 158 | 156 |
| Current missing images / objects outside canvas | 0 / 0 | 0 / 0 | 0 / 0 |
| Native run duration | 21m 03s | 18m 58s | 7m 38s additional |

Claude is the stronger finished product demonstration: the real reuse-position table, interface crops and varied content-driven layouts give the audience tangible evidence. The white background, restrained green emphasis and 28/18–20/13 type hierarchy are consistent. Slide 17 still shows an empty named-version state rather than an actual milestone, and its earlier operation history contains an author-caused missing old crop. Those weaknesses remain in the independent submission; no redo was requested.

DeepSeek has calm Chinese typography (27 title / 17 body / 34 divider), clear explanations and a credible six-step example. The raw first pass was incomplete as a visual introduction because its shell could not copy binary assets. The continuation added Browse, Story and Export crops at readable sizes and the official mark, preserving the narrative and dividers. The result is usable but still more text-led and less varied than Claude's. Small light gray labels remain a weaker choice for projection. The Chinese interface captures intentionally contain English synthetic demo-page content, as documented in the shared asset manifest.

All three contact sheets were inspected. Selected frozen PDF pages were inspected at 1920×1080: Claude 4, 13, 14, 17, 21; DeepSeek raw 2, 7, 14, 20, 21. All four changed DeepSeek pages (1, 7, 10, 18) were also inspected at 1920×1080 after continuation. No clipping or asset distortion was observed on these full-page checks. This is not a claim that the supervisor independently inspected every PDF page at full size; both native authors separately report doing that.

### Actual Office QA

The supervisor subsequently opened exact QA copies of both final PPTX files read-only in **Microsoft PowerPoint 16.0**, rendered all **42 slides** natively at **1920×1080**, and closed only those QA presentations. Both sources retained their SHA-256 hashes. Native Office evidence is in `qa\office\office-report.json`, with all PNGs and two contact sheets under its adjacent client directories.

Both 21-page native contact sheets were inspected. A mechanical text-bound check flagged Claude slides 2, 4, 5, 21 and DeepSeek slide 21; all five were inspected at full resolution. These were small bound overruns into available whitespace, not visible truncation or collisions. The sampled PowerPoint pages preserve readable text, Chinese glyphs, tables and images. Office opening and native static rendering therefore passed; exact pixel identity, interactive playback and animation were not asserted.

## 4. Tool findings and disposition

1. **DeepSeek binary-file blocker was real.** `pwsh`, including `Get-Location`, failed before command execution with `SetNamedSecurityInfoW failed (Win32 5): grantWrite(...)`. The native agent and its own subagent reproduced it. No ACL, sandbox, account or global configuration was changed. After raw archival, the coordinator used the supported authenticated writer `/__pptd/assets/import` route to import 24 exact public Chinese captures/crops plus the official logo. A single continuation of the original native session then completed image integration and export. It used 4 imports and retained all 25, including unused originals.
2. **Ordinary `media/` text was misclassified as an asset.** Both agents encountered this; Claude's table page 9 (`pageId 7dbf6217-2ed6-4806-916b-2882b8ad3dcf`, `folder-table`) failed rendering with `Asset is not a file or exceeds 64 MiB.` The precise reproduction was sent to workflow_plugins. That team reports the semantic `src/url` scanner fix, regression coverage, full 1292-test pass plus one skip, and an actual new packaged-runtime render of unchanged path-like table text. This confirms a product fix in the later v0.18 candidate; the old trial writer and raw workarounds were not altered.
3. **Asset lifecycle guidance needed enforcement.** Claude deleted a superseded Sections crop before replacing the reference and overwrote an Outline crop in place. Current exports are complete, but one before-history view has a missing old asset and another can show later pixels. This is retained as an actual trial failure. The final plugin guidance was strengthened by workflow_plugins to preserve original/history assets and use new filenames.
4. **Render scheduling and response size caused friction.** Claude's parallel renders were rejected with a Chinese-language busy error. A 14-page preview produced about 61,000 characters, exceeding its native tool output. It parsed a saved response before applying. The later guidance requires serial render/export within one project; a bounded summary mode remains a worthwhile product improvement.
5. **Native DeepSeek observations retained for review:** `afterPageId: null` inserts at the beginning while omission appends; missing `requestId` yields only `Invalid transaction envelope`; differently ordered JSON keys were reported to change `previewHash`; imported unused assets expose hashed names; `version_record` snapshot revisions can be confused with active-page revisions. These were forwarded with their native operation record. They are not silently promoted to independently reproduced bugs.
6. **Capability drift was visible, handled honestly.** Both trials loaded the frozen 0.18 skill but connected to an older running writer advertising 21 tools. The new design-audit tool was absent; neither agent claimed to have run it. They used renders and measurements instead. The later rebuilt candidate advertises 22 tools and was validated separately by the product team.

## 5. Run identities and record index

| Run | Request ID | Native session | Outcome |
|---|---|---|---|
| DeepSeek startup preflight | `1149c042-8620-451f-ac80-b20b8da529c8` | None | Coordinator CLI option-order error before model launch; retained, corrected once |
| DeepSeek raw | `20ad22d3-006c-4add-b139-7bc4a2913a5c` | `session-3ccaad26-02c1-400e-bcad-bb24b4bbf1d2` | Native completed, exit 0; binary assets blocked |
| Claude raw/final | `60e4a747-576c-45b3-99b9-9beb72aa6d96` | `9ca9654c-1fda-4cd8-98a2-828158a007fc` | Native completed, exit 0 |
| DeepSeek technical continuation | `922a759f-1081-4b7f-97be-feec1c89cc0a` | Same original DeepSeek session | Native completed, exit 0; no redesign brief |

Both native clients used their existing configured models and accounts; no model override was applied. Each had its own registered project, exact pinned entry, output folder and writer. Frozen candidate Story skill SHA-256: `b3985d0e0ac763058d1c9d503d1f57e9a8d8aab9c5ebf98d13e6302854109737`. The native-session results are evidence of these two concrete tasks, not a statistical comparison of model quality across languages.

Everything below is under `<intro-workspace>\Trials\supervision\` unless a full path is given:

- `FINAL-TRIAL-INDEX.json`: machine-readable requests, sessions, durations, tool counts, all archive and final artifact hashes.
- `runs\<request-id>\`: exact authored request, status, reduced visible native result, stderr/worker records and archival receipt. DeepSeek tool-event receipts record timestamps, tool names, call IDs and result statuses; they intentionally omit reasoning text and sensitive environment values.
- `COMMON-BRIEF.md`, `PREFLIGHT.md`, native request JSONs, `deepseek-continuation-prompt.md`: the actual constraints and authorized continuation wording.
- `claude-en-native-response.md`, `deepseek-zh-native-response.md`, `deepseek-zh-assisted-native-response.md`: visible native delivery reports, kept separately.
- `deepseek-assets-imported.json`: exact source/import provenance and successful supported-route receipts; `deepseek-assisted-finalization.json`: file-only copy hashes and the 4 changed page filenames.
- `submissions\`: three immutable ZIPs and per-file manifests.
- `qa\claude-en\`, `qa\deepseek-zh\`, `qa\deepseek-zh-assisted\`: read-only structural audits, PDF contact sheets and selected full-page PNGs.
- `qa\office\office-report.json`, `qa\office\claude-en\`, `qa\office\deepseek-zh-assisted\`: actual Microsoft PowerPoint renders of all 42 final slides and preserved QA input copies.
- Each trial root contains its author's `STORY.md`, `SOURCES.md` and `TRIAL-NOTES.md`; frozen versions remain inside the associated submission ZIPs.

No native task is still pending. The two trial writers were left available for the release owner. The raw archives include internal supervision/configuration paths and should be treated as audit evidence; public packaging should select the finished project/export files and deliberately prepared source notes. The release owner still needs to validate public repository availability: the native trial observed HTTP 404 and a private-repository README, so neither result proves that a public release is already accessible.

## 6. Portable release copies

The `<intro-workspace>` marker identifies retained local evidence, not a required installation path. Packaging copied source bytes only; no native page or PPTD manifest was edited. Both portable projects include their original AGENTS.md, project metadata, named checkpoints, all original media, archived version media, and optional Windows folder branding. Their generated Exports directory was excluded; PDF/PPTX are separate downloads. Connection patches, runtime/service state, tokens, logs, supervision records and raw native sessions were not included.

The preflight found no missing current or named-version image references: Claude has 21 named versions, DeepSeek has 4. The reviewed Project sources contain no detected credential-key fields or absolute local drive paths. The original AGENTS.md mentions the external supervision brief; the new portable README explains that historical reference without changing the original guidance.

Each portable README labels Claude as the untouched first pass and DeepSeek as the single same-session technical continuation. SOURCE-MANIFEST.json records every source hash. DeepSeek also includes ASSET-PROVENANCE.json for all 25 imported public assets, including unused originals.

| Trial | Portable entry relative to introduction workspace | Files | Project bytes | ZIP bytes |
|---|---|---:|---:|---:|
| claude-en | `Release/projects/claude-en/deck.pptd` | 69 | 2,085,715 | 1,855,064 |
| deepseek-zh | `Release/projects/deepseek-zh/deck.pptd` | 61 | 5,941,370 | 5,466,598 |

The two project folders total 8,027,085 bytes. The six downloadable ZIP/PDF/PPTX files total 9,952,270 bytes (9.95 MB, decimal). ZIP members were checked byte for byte against their portable project; all original source files, including all 42 pages and both entry manifests, retain their hashes.

| Release file | SHA-256 |
|---|---|
| `huandeng-claude-en.zip` | `73a244877d3a2a53283fddfac6b06471d0ed57e5ae4b6681b485eb49eb270ff6` |
| `huandeng-claude-en.pdf` | `c5e2cf450dfa8ec600e395c31b926aa17565fce79d68ae7d9523956fd8cc7621` |
| `huandeng-claude-en.pptx` | `6aed9ef80c3bd10232730e0b8d92c752037e3f910fa8844b2100ad452cebcc4c` |
| `huandeng-deepseek-zh.zip` | `5089253bde7dcedfaa5e098c420b2259348c31ff2449b092cada31d608035e12` |
| `huandeng-deepseek-zh.pdf` | `1c76bea8a26d3caee92cca1f0fc081180fde6357a2e02560d6977562c0eeea87` |
| `huandeng-deepseek-zh.pptx` | `c4650175315b8dff4ff1a39daf1daeba61b0458cdcb093d1c5481622587302db` |

## 7. DeepSeek continuation source proof

Only these four page files changed in the authorized native continuation. Packaging leaves their final hashes unchanged; the other 17 pages match the frozen first pass.

| Main position | Page file | First-pass SHA-256 | Final SHA-256 |
|---:|---|---|---|
| 1 | `pages/initial.page` | `63a48ea88f54ead9a8ce4b2dcdb93210fede7cd673a99c0ffedf4433e8a4db7f` | `1b8eba932edcb6a1cedb87eae9f93a1c3f02fc54302dbadf3f2ead7d01cd44e5` |
| 7 | `pages/H62N.page` | `a597b8477a224104d9d651cfc4891eb340a3ccf984fdf86c2e2d95242b3f1086` | `900d13f7a73a7b242ac38213f7f055b73ee63538dc5edd634ca0f815276ce68f` |
| 10 | `pages/4SYN.page` | `03b8f559bf405552a8172b1c574d1555e1fdf1536bff467663c5cd6baa2db10d` | `e3968de7d78a92ed12f4ade0155a28d0ad11fd554fe9919ee2a478e992699f80` |
| 18 | `pages/UBDB.page` | `101c140845a17d7b99fd8821bb432a156e1ccdf11db86f06e5cc5f5e5d6c4b87` | `876605e2b1b95cc9806bdd852d8b8c95280dd311dd3cf57f9eb1a441696b3d70` |

| Page | Exact imported source | SHA-256 |
|---:|---|---|
| 1 | `huandeng-icon.png` | `c6cce013fd62e96048a5f10c1168ba05a2a7d6192f334d83386a4eec45732c22` |
| 7 | `zh-CN-browse-crop.png` | `c48d45b781ff23f4062462182cafc4e99a660878a4ee372fa6e1d78afce54349` |
| 10 | `zh-CN-story-crop.png` | `3c2fca738fe3e96eb9c7d1a318815924c6b2ae4dfb63250b77e1b814a48f5c5c` |
| 18 | `zh-CN-export-crop.png` | `55aeff2240b17359992a897f1c20c479fbe82a111f3cd74c323e74c440657f1d` |

After the trials ended, the shared asset library added fully Chinese synthetic content and stronger operation/history evidence. Those later captures were not substituted into either native submission. This report preserves the actual inputs and outcomes.
