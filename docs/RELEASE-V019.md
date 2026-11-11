# HUANDENG Editor and AI plugins 0.19.0

Status: implementation, final package and ordinary installation verified. The six presentation candidates and their current exports are frozen. Presentation author acceptance is recorded separately from release packaging.

## What this milestone changes

The introduction now has a practical audience task: understand HUANDENG, edit a page, preserve evidence, review a change, compose a talk and deliver it. The founder's experience determines the emphasis; the authored sequence supplies the useful product explanation and repairs the order where necessary.

The ChatGPT Chinese and English projects each contain 24 Main pages and a 12-page Brief. They retain original scientific material, real localized UI, HUANDENG/client marks, native tables, a native chart, an Office equation, purposeful backgrounds and acknowledgments. The Brief is an actual saved Presentation with local speaking notes and a named-version pin. Claude and DeepSeek retain their independent native authorship and visual directions.

The Editor opens either a .pptd entry or its project folder. A selected folder must contain exactly one direct .pptd; an empty or ambiguous selection produces an explicit error. The visible Application menu → File route can identify an existing project folder with the HUANDENG icon while preserving customization. A descriptive directory suffix is optional; the directory remains a normal Windows folder.

The assistant panel distinguishes configuration, dated client task reports and saved-operation receipts. The native DeepSeek adapter now belongs to the canonical product source. Stable project-derived routes, recurring discovery and lifecycle disposal support multiple open projects. Claude Code, Codex and the private ChatGPT plugin receive the same corrected authoring guidance.

A late background project load now respects the user's newer tab or Home selection. This covers restored tabs and an explicit project-open request that finishes after another navigation action. Failed loads remove their pending tab and restore the correct active service and saved selection.

## Use the work

The six maintained sources are under [examples/huandeng-introduction](../examples/huandeng-introduction/README.md). Open a project's deck.pptd or its containing folder. Keep pages, media, .huandeng and supporting material together when moving it. PDF/PPTX are delivery files; the source project remains editable. The six existing project ignore files exclude Exports/ from Git. The complete project ZIPs and release attachments retain all 44 canonical export/report files. Release verification separately matches the remaining 1,685 project files to Git D and the 44 generated files to the frozen project/archive bytes; it does not claim every ZIP member is a Git-tracked file.

Read [PROJECT-FOLDERS.md](PROJECT-FOLDERS.md) for entry, identity and portability rules, and [NATIVE-INTEGRATION-0.19.md](NATIVE-INTEGRATION-0.19.md) for client installation and the actual collaboration trial. Each project's README records its reviewed result and remaining findings.

For an upgrade, normally close the old Editor, open the new version and refresh client bridges. If a runtime location was registered, refresh it with the packaged scripts/register-runtime.mjs --install-dir <new-Editor-directory>. Installation alone does not update that fallback pointer. Regenerate manually pinned old executable/CLI configurations separately.

## Source and binary identity

Final runtime source C3 is **cadaecbf9cf1661e28464fe68b7b866f68fecabe**. Feature/plugin commit C1 is **aff4ac28753bb2d4422f2f993f2409742afaecf9**; navigation correction C2 is **f8ec88f73eef0db18a35b2e9b5024a70b7ffe734**. C3 adds a visible workspace Application menu button with a shell-only route to the existing native menu. Plugin source and distributions retain their verified C1 provenance.

The Windows package was built from a clean detached checkout of C3 with a frozen offline dependency installation. Its build marker reports Editor 0.19.0, core 2.3.1, plugin 0.19.0, sourceRevision C3 and sourceDirty false. The delivery tag editor-v0.19.0 identifies the later examples/documentation/evidence commit D. The attached release-manifest.json records delivery D, runtime C3 and plugin C1 without changing the executable's build marker.

| Artifact | Verified identity |
| --- | --- |
| HUANDENG-Editor-0.19.0-win32-x64.zip | 236,214,422 bytes |
| Editor archive SHA-256 | 4a484088a2d5a0c2c08e8234df71330a60c6057e1e5e3cb2a4a77c3404385aad |
| Editor archive entries | 29,313; every decompressed entry matched to the verified package |
| Portable 24-file content manifest | 91e6590712b601544e6bdb2aad4b8e4443c6fa7756fd908f4c78c762a0eecfa9 |
| Native DSH 36-file content manifest | aacc8106c15e5970999181ae23783686b0a5f5297fbe1a75a409c9edf696d4b8 |
| Shared authoring SKILL.md | f4188e0934e7846346e286286041f49592bec3231747caa99d0b7b32dd9d016b |

Portable and DSH plugin packages were independently regenerated from C1 and matched the frozen distributions. Account-specific configuration is excluded from their archives.

## Verification

The exact-C3 build passed 78 focused tests, one shared-writer CAS scenario, three browser checks and 18 plugin tests, plus core type checking, production build and Biome. The exact packaged application passed eight native workflow gates, two delayed-open/navigation regressions and four actual visible-menu checks with normal exit. The menu checks cover new folder identification, preserved customization, disabled Home state and English/Chinese access. Older full-suite counts are not presented as current runs.

The navigation suite includes delayed restoration followed by a user tab choice, a failed pending target, and explicit opening followed by another tab or Home. An early blank-paint probe repeatedly forced foreground focus before sampling; it was not passive evidence. Corrected physical-launch tests with passive image/DOM observation showed normal Home and six-project paint. This milestone does not claim a measured cold-start speed improvement or a separately proven blank-paint repair.

Both ChatGPT Main decks were fully rendered read-only in PowerPoint 16.0. Each chart cache retained all twelve scientific measurements. Actual Brief exports were checked for their occurrence notes and historical pinned page. Independent review closed five concrete content, legibility and reuse findings that the zero-finding geometry report had missed.

A real native DeepSeek session and ChatGPT shared a three-page project. Independent page edits survived; a stale same-page save was refused; a fresh style handoff preserved the other contributor's content. This supports coordinated multi-agent work through the shared writer. Automatic section locks, a scheduler, online-presence tracking and a native Claude collaboration trial were not part of that result.

Detailed scopes and retained failures are in [EDITOR-0.19-VALIDATION.md](EDITOR-0.19-VALIDATION.md), [PRODUCT-INTRODUCTION-VALIDATION.md](PRODUCT-INTRODUCTION-VALIDATION.md) and [NATIVE-INTEGRATION-0.19.md).

## Native results and instruction compliance

Loading the guide is insufficient evidence of compliance. Final text, source objects, Notes, visual material and bilingual meaning are checked separately. Conflicting white-background defaults were removed. Product usefulness, preservation, coherent prose objects and real tabular relationships now have consistent instructions in the shared skill, runtime guide and project AGENTS.

DeepSeek English completed 22 Main pages after three malformed tool-argument responses and same-session recovery using one small operation per call. It materially improves imagery and functional coverage; five classes of factual/Notes findings remain. DeepSeek Chinese completed 22 Main and 12 Brief pages, replaced the criticized fractured prose with coherent rich text, and retains four content/correspondence finding classes. Native source was preserved. The Chinese Brief was mechanically exported from the actual 12-page sequence to replace stale 11-page files.

Claude's original account initially reached its usage limit before saving. Its original sessions subsequently completed native maintenance and bounded factual/version correspondence corrections, preserving the preferred English design and protected scientific/table and directory-tree edits. English has 25 Main/9 Brief; Chinese has 26 Main/9 Brief. Their core product facts, use steps, evidence and qualifications correspond; Chinese gives the actual collaboration example a separate page. The Chinese runner retains needs_attention for a denied append to DELIVERY-R2.md, while the saved revisions and all four exports were independently verified. The denied log was not rewritten or bypassed. English retains the actual Office chart-label issue on Main page 12 and Brief page 5; its existing one-column prose table and tiny earlier preview snapshots remain documented in project QA.

## Installation and publication

The same-path C3 installation passed ordinary foreground launch and six-tab checks. Actual tab/page actions restored and verified the prior selected short IDs, active DeepSeek English and maximized state; all 1,240 authored/source/export files were unchanged. The four unmarked project folders were identified through actual menu actions, preserving both existing marker pairs. Fresh checks passed for three default clients and all six DSH routes. These receipts released the Editor publication hold.

The earlier C1 and C2 Editor ZIPs were never uploaded. The ordinary C2 check exposed the unreachable File menu despite successful internal action tests; C3's visible entry was verified through actual clicks. Publication requires the exact delivery commit and annotated tag, successful CI, and all 33 asset sizes/digests, including the release manifest and checksum list. Final remote identities belong in those attached records rather than a self-referential commit hash in this source file.

The maintained source directories stay fixed. Local Windows folder decorations remain on the workstation but are excluded from portable source packages and Git; authored artwork, named page versions and historical materials are retained. One previous 0.18 installation is the rollback copy. The temporary clean-build worktree, three superseded application candidates, two unpublished older Editor ZIPs and owned test directories were retired after verification. The active C3 installation and single final archive were retained.

Repository visibility remains private. No upstream or npm publication is included. Packaging a native review candidate does not mark its presentation accepted.
