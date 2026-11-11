# Open-source preparation: final candidate

**The final Editor examples, bilingual documentation and native plugin distributions are prepared for owner review.** The repository remains private. Public visibility and release publication have not been changed.

This record describes the final November 11 candidate. It replaces the interrupted task's recovery note. Product details are in the [English README](../README.md) and [Chinese README](../README.zh-CN.md); example checks are in [final validation](PRODUCT-INTRODUCTION-VALIDATION.md).

## What is ready

| Area | Concrete result |
| --- | --- |
| Editor examples | ChatGPT English: 24 pages authored directly by the primary session. Chinese: 24 pages produced in three parallel sections and personally reviewed by the primary session. Both have 12-occurrence short talks. |
| Frozen native editions | Claude 25 EN / 26 ZH and DeepSeek 22 EN / 22 ZH preserved; exactly 95 attribution objects added across 95 pages. |
| Deliveries | 22 final PDF/PPTX files; 394 rendered pages across the two formats have their correct watermark; 197 PPTX Notes match the saved sequence. |
| Target-viewer checks | 11 final PPTX files opened read-only in PowerPoint with repair disabled; all 197 slides rendered and reviewed at the recorded inspection scale. |
| Documentation | English and Chinese README lead with actual Editor use, architecture, project structure, assistant setup, use cases and current limits. |
| Community files | HUANDENG contribution guide, security policy, conduct reporting status, three issue forms and a pull-request template. The inherited upstream sponsorship configuration is removed. |
| Plugins | Repository-built portable Claude Code/Codex and native DeepSeek Harness packages, ZIPs, manifests and native-format/protocol checks. |
| Source cleanup | Known private bindings, native session identifiers and maintainer paths generalized in public candidate documents; original private records retained separately. |
| Attribution | Upstream MIT license, vendored-code notices, dependency notices and asset provenance retained. |

The source/runtime boundary remains explicit: Editor 0.19.0 is still built from C3 `cadaecbf9cf1661e28464fe68b7b866f68fecabe`. This candidate changes examples, public documentation and plugin packaging documentation. It does not relabel the installed executable.

## Prepared artifact layout

The local candidate root is `dist/open-source-candidate/`.

| Relative path | Contents |
| --- | --- |
| `HUANDENG-source-final-20261111.zip` | A source snapshot of the final scoped commit, created with `git archive`, with no Git history. |
| `projects/huandeng-<edition>-final.zip` | Six complete editable projects with originals, named versions, source/evidence, canonical exports and reports. |
| `deliveries/huandeng-<edition>[-brief].pdf` and `.pptx` | The 22 exact final delivery files. |
| `plugins/HUANDENG-Plugin-0.19.0-Claude-Codex.zip` | Portable Claude Code/Codex package. |
| `plugins/HUANDENG-Plugin-0.19.0-DeepSeek.zip` | Native DeepSeek Harness bundle. |
| `generated-artifacts.json`, `candidate-manifest.json`, `SHA256SUMS.txt` | Candidate file identity, source commit, per-file hashes and verification results. |

Generated deliveries are excluded from Git. Each project's `SOURCE-MANIFEST.json` distinguishes its source-file inventory from optional generated deliveries, so a source checkout and a complete project archive have clear boundaries. The user-modified unrelated fixture is excluded from the scoped commit; the source archive uses the committed fixture baseline.

The two plugin package directories and detailed validation also remain under `dist/plugin-packages/0.19.0/`. Their source is entirely within `plugins/huandeng`. See [native integration](NATIVE-INTEGRATION-0.19.md) and [package evidence](evidence/final-examples/plugin-packages.json).

## Public-source audit

The final documented cleanup changed 60 existing files and added the [public audit note](PUBLIC-SOURCE-AUDIT.md). It generalized four private app bindings, 13 native session references, 97 maintainer paths, one temporary path and six sample configuration paths. Validation preserved 161 frozen native source/Notes files and all 27 license/NOTICE hashes.

The recorded rescan covered 3,783 candidate paths and 2,521 text files. It found zero unresolved matches in the audited credential, binding, session and machine-path categories. Test fixtures and explicit environment placeholders were classified and retained.

This is a bounded source audit. The older binary library was not exhaustively OCR-scanned, and credential values were not tested online. Actual README images and final tutorial/Office images received visual review. The audit records these scopes without claiming a complete security assessment.

### Why the private Git repository stays private

A targeted history check confirmed known old app-binding values in seven relevant historical revisions, with 13 matching file versions. Cleaning today's files does not remove earlier Git objects.

The proposed public first release therefore uses the clean source snapshot without `.git`. The existing private development history remains intact. A history rewrite, repository rename or visibility change requires a separate reviewed publishing decision. No such action was performed.

## Native host evidence

Both Claude Code watermark tasks ran inside the actual native client and exited successfully. Both DeepSeek Harness tasks used the installed native Cordis adapter and saved the requested watermarks. Their process exits retained the host's Windows ACL failure; the saved project effects were independently confirmed.

The refreshed ZIPs passed manifest/ZIP byte checks, documentation-link checks, 18 focused tests, Claude's strict native plugin validation and real stdio doctor calls with 22 tools. Runtime and shared-skill bytes match the existing installation. The new archives were not installed over the clients or relabelled as separate model trials. [Native outcomes](evidence/final-examples/native-watermark-jobs.json)

## Recorded delivery limits

- Claude English Main page 12 and Brief page 5 retain the same PowerPoint x-axis title/tick overlap. The chart remains native and its data are preserved; the frozen author design was not rewritten.
- One DeepSeek Chinese Main page has a minor punctuation wrap in Office, with all text present.
- Five ChatGPT folder icons and one multi-point line export through verified image fallback, for nine appearances across Main/Brief. Their appearance is preserved in actual PowerPoint.
- Font files are not embedded. Static PDF/PPTX output does not transfer Editor click steps into PowerPoint animation.

The [Office record](evidence/final-examples/office.json) and [export record](evidence/final-examples/exports.json) identify the exact files and checks.

## Before public announcement

The remaining decisions concern publication, not another redesign:

1. Approve the final ChatGPT examples and the exact source/artifact candidate to publish.
2. Choose the public repository/history strategy. Use the clean first-release snapshot if the private history is to remain private.
3. Enable and verify GitHub private vulnerability reporting on the public repository, including maintainer notifications, and update [SECURITY.md](../SECURITY.md).
4. Publish a verified private conduct-reporting contact in [CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md).
5. Attach the exact reviewed artifacts and checksums to the intended public release. Do not treat earlier 0.19 assets as this final revision.

No public release, visibility change, npm publication, upstream push or private-history rewrite is claimed by this preparation.

## References used for preparation

The preparation follows the applicable recommendations on clear onboarding, contribution routes, source attribution and public-source review; it does not adopt another organization's internal approval policy.

- [GitHub: repository best practices](https://docs.github.com/en/repositories/creating-and-managing-repositories/best-practices-for-repositories)
- [GitHub: what a README should explain](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes)
- [GitHub: contributor guidelines](https://docs.github.com/en/communities/setting-up-your-project-for-healthy-contributions/setting-guidelines-for-repository-contributors)
- [GitHub: private vulnerability reporting](https://docs.github.com/en/code-security/how-tos/report-and-fix-vulnerabilities/configure-vulnerability-reporting/configure-for-a-repository)
- [Google Open Source: preparing a release](https://opensource.google/documentation/reference/releasing/preparing)
