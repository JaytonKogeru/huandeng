# Workspace organization

This document records the earlier 0.18 cleanup and the current 0.19 follow-up. The maintained HUANDENG entry is `<editor-checkout>`. The older sections retain their own version, process and storage checkpoints; they are historical records. Current runtime installation and release identity are in [HANDOFF-V019.md](HANDOFF-V019.md), and the final section below records this follow-up's directory changes.

## One project entry

The editable introductions live in [examples/huandeng-introduction](../examples/huandeng-introduction/README.md), which maintains the current collection and its authoring provenance. Each project has its own `deck.pptd`; shared assets and useful references live alongside the projects. The collection contains six introduction projects: ChatGPT, Claude Code and DeepSeek Harness, each in Chinese and English. Their current content and review status are recorded in the collection index. Old parallel copies under the former top-level introduction directory have been retired.

Use `Start-Huandeng.cmd` from the main repository for the current desktop application. The top-level `<workspace-checkout>` is a short Chinese index pointing here and explaining the remaining related directories. No additional dated archive or active repository was created for this cleanup.

## Earlier cleanup checkpoint

The first pass counted related directory names; it was not a complete inventory of every item in `<workspace-root>`. The later all-entry pass below covers the previously missed unprefixed installer, v0.13 transfer files, and private handoff directories.

| Item | Before | After | Handling |
| --- | ---: | ---: | --- |
| Related top-level HUANDENG / FSS / ArgFrame directories | 24 | 7 | Removed redundant committed worktrees and retired installation / introduction directories. |
| Registered HUANDENG worktrees, including main | 17 | 3 | Removed 14; kept main, an uncommitted source tree, and an active research writer tree. |
| Registered FSS worktrees, including main | 3 | 3 | All contain independent work or active dependencies. |
| Physical Editor packages in main `dist` | 13 | 1 | Retained the clean 0.18.0 package; removed 12 obsolete packages. |
| Compatibility directory aliases in main `dist` | — | 1 | `HUANDENG-win32-x64` is a junction to the retained 0.18.0 package. |
| HUANDENG installations shown in the current native host | 2 | 1 | Uninstalled the duplicate cloud-backed installation through the host's management UI. |

The four retired standalone directories were `Huandeng-Intro-20261110`, `Huandeng-plugin-v012-format`, `Huandeng-v012-installation`, and `Huandeng-v0121-installation`. Before removal, all 306 files in the four historical slide project trees were checked against their audit hashes again. Their source is retained in Git history or immutable original trial submissions; only reproducible intermediate exports lacked a matching archive. No pending draft files were found. Useful authored notes, source records, and private installation snapshots were retained selectively and verified byte for byte.

Git removed worktree registrations through `git worktree remove`, without forcing away dirty changes. Windows left some long-path or reparse-point residues after unregistering a clean tree. Those exact residues were removed only after checking that their commit remained reachable. Branches were retained. The user-modified fixture in main was hash checked before and after cleanup and was not changed.

## What remains, and why

| Location under `<workspace-root>` | Role and reason for retention |
| --- | --- |
| `Huandeng` | Current source, introductions, shared assets, current desktop package, and development entry. |
| `dsh-huandeng` | Current installed native DeepSeek bundle. Its package identity is huandeng; maintained source is now inside Huandeng/plugins/huandeng/adapters/deepseek. The directory name deliberately avoids the Windows collision with Huandeng. Unique prototype bytes were preserved during the formal upgrade. |
| `FreestyleScientificSlides` | Independent FSS / ArgFrame source with local changes and an active native plugin dependency. |
| `FSS-worktrees` | Two FSS worktrees with distinct modified and untracked source files. |
| `FSS-PPTD-Validation` | Existing validation and reference material whose reproducibility was not established. |

The last nested v0.4 worktree and the v0.10 research-service tree have now been retired following the source-retention and live-dependency checks below. HUANDENG has one registered worktree: main. The FSS trees retain their independent work.

The old v0.18 worktree was removed after both authoring teams released its screenshot dependency. Playwright is available through the main repository's core package dependencies, so an entire historical checkout is no longer needed to run the capture helpers.

## Historical 0.18 desktop and active research protection

The only physical main-repository installation is `dist/HUANDENG-v0.18.0-win32-x64`. Its build records source revision `35dfe649d450d22a0e4e3b70661be52c67eb9f7a` with `sourceDirty=false`. The `dist/HUANDENG-win32-x64` junction points to this same directory; it contains no second binary copy. Existing shortcuts and the PPTD association point to the current package. No Editor executable or Editor source was upgraded during this rework.

During the earlier introduction-rework cleanup, six identified historical public-demo or test processes were stopped. The four task-owned introduction writers remained available through rendering, export and release verification. After the release assets were published and checked, those four temporary writers were closed following fresh process and GUI dependency checks. The ordinary Editor retained the user's two research projects, and the older research writer remained available. User preferences were byte-identical before and after this service cleanup. No private project was closed, discarded, migrated, or exported.

A unique earlier save-failure project, a small original draft recovery set, and a research design reference were retained under ignored verification storage. They are user data, not release material. Generated runtimes, repeated Office inputs, bulk session logs, and whole historical package copies were not retained with them.

## Recent projects

The retired introduction paths in the ordinary Editor's recent list were migrated to the four canonical project paths. The migration used a compare-and-swap check of the final saved preferences after normal application exit. It changed **only `recentProjects`** and preserved all other eight preference fields, including saved layouts, window state, and the then-current empty tab selection. The initial list changed from ten entries to nine after duplicate retirement.

The same 0.18.0 executable was reopened. The user subsequently opened research projects; that later activity was preserved. Historical layout keys were not removed as a side effect of cleaning the visible recent list. This matters because the Editor saves its in-memory preference snapshot as a whole: overwriting a live profile would risk restoring stale state.

## Earlier plugin distribution and host deduplication

The first rework installed native plugin **0.18.2**. The current story-rework native update is recorded below. The Editor remains 0.18.0. The new guide permits an intentional background system, meaningful logos and icons, original explanatory diagrams, and scientific charts when they serve the content. It no longer treats white backgrounds, absent illustrations, or a fixed page sequence as a universal quality rule. Evidence fidelity and real Office review remain necessary. Agent visual review is recorded separately from author acceptance.

The native Claude Code and DeepSeek Harness trials actually loaded the frozen **0.18.1 candidate**. That provenance remains unchanged. Version 0.18.2 changes the remaining contradictory README examples and three version manifests; the three tested guide files have identical bytes. The final native package has 24 files. A portable marketplace wrapper adds two catalog files whose source is the relative path `./huandeng`.

Codex and Claude Code were updated through their supported plugin CLI commands. At that checkpoint, the dedicated HUANDENG DeepSeek launcher selected the generated 0.18.2 patch; ordinary DeepSeek settings were not changed. The distribution directory, Codex cache, and Claude cache each matched all 24 package files. One final doctor run verified the local stdio MCP protocol and the current public project. This is protocol verification, not another model trial. The real DSH trial used its recorded desktop-host route and explicit project patch, not the dedicated interactive launcher.

The duplicate entries were then traced to the actual OpenAI native Windows host: a folder-marketplace installation and an installation of the owned cloud plugin. Its detail menu exposed separate **Uninstall** and **Delete plugin** actions. Only **Uninstall** was used on the cloud-backed host installation. Final installed-list inspection showed one HUANDENG, `huandeng@huandeng-local`, whose detail page showed 0.18.2 and the 0.18.2 catalog path. The owned cloud plugin was retained at 0.18.2 and remained available for installation on another host. Its source, App binding, and account identity were not deleted.

The separate DC-WALT connection remained ready after the operation, with the same runtime epoch. No native Claude or DeepSeek configuration was removed for the purpose of deduplication. An optional composer query was stopped by a guard because a user draft was already present; no message was sent and no draft text was changed. The completed verification is the host's installed list and plugin detail, rather than a claim about every other client's picker or about the catalog of available owned plugins.

## Storage accounting

The earlier introduction-rework free-space checkpoint increased from **138,432,684,032 bytes to 152,060,272,640 bytes**, an observed net increase of **13,627,588,608 bytes (12.692 GiB)**. The first checkpoint was taken after cleanup had already started. Concurrent authoring and export writes also affect free space, so this is a measured net difference over that interval, not an exact attribution or the entire cleanup total.

The initial scan measured **45,228,656,083 apparent bytes (42.122 GiB)** across the thirteen removed top-level worktree containers. That number excludes the removed nested v0.4 release tree and precedes selective user-data retention. It must not be presented as physically reclaimed storage: package-manager hard links and shared data can make apparent file sizes count the same allocated storage more than once. Removing the twelve old main-repository packages was separately observed to increase free space by 8,565,207,040 bytes during that step; that interval is part of the later cleanup, so these figures are not added together.

The final pass also removed **182 top-level loose files**, totalling 12,698,004 file bytes: old transfer fragments, source bundles, generated logs, and one-off helpers. Their 139 base64 fragments reassembled to the recorded ZIPs, and all 95 substantive ZIP members were found in Git history. Only three private original snapshots (61,812 bytes) and a compact semantic source delta (20,378 on-disk bytes) were retained. The original-file hashes were checked again before deletion. These files were not moved wholesale into another archive directory.

## Evidence and future handling

Detailed local receipts are kept under the main repository's ignored `.verification/rework-20261110` directory. They include `worktree-removals.json`, `legacy-package-removals.json`, `retired-standalone-removals.json`, `recent-projects-migration-plan.json`, `native-host-deduplication.json`, and the final workspace summary. These receipts contain operational paths and are not added to the public release.

The earlier native trials retain three immutable submission ZIPs, their manifests, final visible responses, bounded run receipts, and selected Office evidence. They retain the distinction between an original model submission and an assisted technical continuation. Older unaccepted introduction drafts remain historical evidence; retaining them does not claim that the user accepted their appearance. Current visual and compatibility findings belong in the introduction review, not in a successful directory-cleanup claim.

Future HUANDENG development should start from the main repository. Use temporary worktrees for isolated changes and remove them after integration only when unique local changes, ignored user material, and active services have been checked. Keep a single current physical desktop package and use the compatibility alias for the existing launcher. New presentations should live in their intended project directory rather than beside another dated copy of the whole repository.


## Post-release duplicate archive cleanup

Three redundant native/coordinator ZIP files, totaling 39,745,201 bytes, were removed after their original source members were mapped to the committed canonical files and the published packages were verified. One unique 7,608-byte DeepSeek asset-provenance record was extracted and hash-verified before its surrounding duplicate archive was removed. It remains in the existing workstation audit receipts; no new archive directory or active project was created. The original quota-time PDF, metadata, guidance and inherited documentation already retained in the canonical projects remain available.

## Story rework: complete top-level follow-up

The follow-up recorded at 2026-11-10 22:32 UTC examined **all 118 top-level entries**, including names without a HUANDENG prefix. This corrects the scope of the earlier audit. The work directory is named `story-20261111`; that name is not a claim about the host timezone.

| All top-level items in `<workspace-root>` | Before | After |
| --- | ---: | ---: |
| Directories | 27 | 22 |
| Loose files | 91 | 4 |

The removed material comprised `installer-v013`, `v013-evidence-preliminary`, and 87 `v013-*` loose files. Three former top-level private handoff directories became empty after their **29 unique originals (342,153 bytes)** were moved into the main repository's ignored private-handoff area, preserving relative filenames and verifying every file's SHA-256. Private titles and paths are intentionally absent from this public document.

The installer directory contained three complete historical application packages. Their 1,232 application-source files matched reachable Git objects exactly; the recorded commits were ancestors of the current repository. Generated dependencies and binaries were removed. Only small unique recovery records, preference snapshots, and useful helper differences were retained. The preliminary evidence directory held committed screenshots, superseded captures, and four small records; no duplicate capture tree was kept.

The five old source transfers contained 114 members: 36 matched Git bytes, 41 were formatter-equivalent to Git, 33 had substantive differences, and four were generated checksum manifests. The 33 substantive drafts were retained as a **112,471-byte patch** against identified Git bases, with original and normalized hashes recorded locally. The old ZIPs, base64 fragments, and repeated source copies were removed after verification.

Free space increased by **2,244,448,256 bytes (2.090 GiB)** during this follow-up. This is an observed net change while other work continued, not the sum of apparent file sizes and not an independently additive measure of every prior cleanup step.

The current 0.18.0 GUI, both research-service children, and the separate v0.10 research service retained their process identities. The three introduction projects that the user had since opened in that GUI also remained open. The live preference file and protected user-modified fixture were byte-identical across cleanup. Shortcuts and the existing scheduled task had no dependency on the retired directories. No live profile was rewritten.

The final 22 directories include independent non-HUANDENG projects, which were left intact. The four remaining loose files are the directory index and three user files outside the proven cleanup set. At that checkpoint, HUANDENG had three registered worktrees and FSS had three. The subsequent v0.10 and v0.4 retirements below reduced HUANDENG to one. Main `dist` still contains one physical Editor package plus its compatibility junction.

Local receipts for this pass are `initial-audit.json`, `omitted-v013-source-audit.json`, `v013-source-retention.json`, `launch-dependencies.json`, `handoff-dependency-audit.json`, and `omitted-items-cleanup.json` under `.verification/story-20261111`. The top-level Chinese index was updated to the canonical collection entry and no longer points to the retired private directories.

## Story rework: native plugin 0.18.3

The frozen **0.18.3** plugin was installed through the supported Codex and Claude Code commands, retaining the single `huandeng-local` catalog name. The dedicated HUANDENG DeepSeek launcher and patch now select 0.18.3; no ordinary DeepSeek settings were written. The installed Editor remains 0.18.0.

The distribution directory, Codex cache, and Claude cache each matched all **24 package files**, including the content manifest. The story skill SHA-256 is `b41675a608ebddf63933e3f0dab519aeb1bf5ea18a19bf82549e26fb16f64b82`. The portable wrapper has two catalog files using `./huandeng`; workstation-specific launchers and project patches are not included in that portable wrapper.

A read-only doctor run succeeded against an existing coordinator-owned public-project writer. It did not start a second writer, open a GUI, render a deck, or repeat a model trial. The real story authoring trials retain their separately recorded candidate and session provenance. Before final packaging, Biome formatted three plugin JSON manifests without changing their parsed values. The package was rebuilt and reinstalled with the supported commands; all 24 files were reverified at all three installation roots. Guides, README and scripts are byte-identical to the native trial candidate. The original four manifest files are retained as a small historical receipt.

Doctor's `plugin.skillSha256` hashes the installed plugin skill. Its separate `storyGuideSha256` hashes the text returned by the existing Editor 0.18.0 MCP resource `huandeng://guide/story`. The runtime guide is not the plugin skill, and protocol verification is not a replacement for the full package hash comparison. Final receipts are `plugin-0183-format-refresh.json` and `plugin-0183-final-doctor.json`; the earlier installation and candidate receipts remain historical evidence.

A further check found the v0.10 worktree clean at `40ef08e68f6541c28728576c70e2fda24e6ba4b3`, an ancestor of main. Its service reported `writable=false` and desktop protocol 1. The saved project list alone did not prove a live client; the subsequent investigation and retirement are recorded below.

## Story rework: startup measurement

Two isolated launches used the installed 0.18.0 executable, a separate profile and runtime directory, and one committed public project opened read-only. The project had 19 active pages, 42 stored page files, and 10,142,914 bytes of source and media. Native authoring trials remained active while the coordinator paused its rendering and exports. The filesystem cache was warm; this was not a clean-machine or post-reboot cold-start benchmark.

| Observed stage | Time |
| --- | ---: |
| New process, empty Home DOM interactive | 1.854 s |
| Second launch reused that process; forwarding process exited | 1.129 s |
| Existing window, first public-project DOM ready | 5.117 s |
| New process restoring one project, Home DOM interactive | 1.883 s |
| Same restore launch, project DOM ready | 6.086 s |

Home readiness meant the locale had loaded and the Open button was enabled. Project readiness meant rendered page elements were attached and fonts were ready. These are observed DOM checkpoints; Home's paint timing was unavailable in the offscreen window. The results separate the early Home UI from later project readiness and do not extrapolate to the user's larger private projects.

The installed `main.cjs` and repository source had the same SHA-256. In [desktop main](../packages/desktop/main.cjs), `createWindow()` loads and shows Home before startup restoration. The startup handler then awaits each restored project in sequence, processes the requested or last project afterward, and only then sets `launchReady` and drains second-instance requests. `loadProject()` waits for the document service and renderer URL load, and activates each project. This ordering can make the desired project and later open requests wait behind every earlier saved tab. The production log confirmed the bundled production editor; Vite development startup was not the cause in this probe.

The smallest follow-up worth implementing is a focused restoration change: prioritize the requested or last active project, admit pending open requests before the remaining restoration batch, and restore other tabs without repeatedly changing the active tab or focus. Preserve their saved ordering and the existing single-writer checks. This can be evaluated independently of UI art or a new Editor release. No Editor source or binary was changed in this audit, and there is no evidence here that all project startup time comes from restoration order.

Both test applications closed normally with exit code 0, and both temporary document-service ports closed. The original public snapshot files, the user's live preferences, the protected fixture, and the research service identity remained unchanged. The temporary project, profile, and runtime were removed after those checks. Compact receipts remain as `startup-probe-setup.json`, `startup-timings.json`, and `startup-probe-cleanup.json` in `.verification/story-20261111`.

## Story rework: retiring the orphaned v0.10 service

The later dependency check found the old read-only service's parent absent, no child processes, and only its listening socket in three samples over 18 seconds. No client connection was present. The same-entry discovery record was absent, and the checked runtime registrations, native client configurations, shortcuts, and PPTD association did not reference the old tree. The service was therefore an orphan, rather than a reason to retain an entire historical checkout.

The installed current core successfully opened the original research entry in read-only mode using an isolated temporary runtime. No project UI, page retrieval, rendering, or export was performed. The temporary reader stopped through its normal shutdown IPC. The original 100 source and metadata files had identical aggregate hashes before validation, after validation, and after stopping the old service. Their original filesystem location was retained.

The old service then received `CTRL_C_EVENT` through a console whose only clients were that exact process and the cleanup helper. Its normal shutdown handler exited with code 0. Controlled forced termination was not needed. The process identity was checked through both its creation time and a held process handle; its port was confirmed closed afterward.

The ignored historical material was reduced to **23 small unique helpers or handoff records (275,268 bytes)** and a **119,575-byte semantic source patch**. Of 1,303 transferred source members, 1,215 matched reachable Git bytes, 35 more matched after formatting, 43 substantive drafts were represented in the patch, and ten were generated checksum manifests. The original user-mark image was already retained byte for byte in the committed brand assets. Whole packages, duplicate source ZIPs, transfer fragments, repeated screenshots, and build logs were removed.

`git worktree remove` unregistered the clean, merged v0.10 tree. Windows reported a long-path deletion residue; that exact unregistered residue was then removed after the same source and process guards. That step reduced HUANDENG to **two registered worktrees**: main and the nested v0.4 source worktree, which was subsequently retired as recorded below. The v0.10 removal interval showed an additional **827,506,688-byte (0.771 GiB)** net free-space increase; it is reported separately from earlier intervals.

The latest full top-level snapshot is **22 directories and four loose files**. During this pass, a new independent `dsh-huandeng` adapter source directory appeared, briefly taking the count to 23 before the v0.10 tree was removed. Neither the root coordinator nor the native trial controllers created it. Its source was inventoried with hashes and preserved as potentially concurrent user work. This new source directory is distinct from the retired installation and transfer artifacts.

Receipts are `v010-live-dependencies.json`, `v010-current-core-validation.json`, `v010-orphan-stop.json`, `v010-retention.json`, `v010-worktree-removal.json`, and `concurrent-dsh-adapter-inventory.json` in the current ignored work directory. The top-level index has been updated accordingly.


## Historical story rework: final nested-worktree retirement

The final v0.4 audit found 81 modified or untracked source entries. Of these, 67 original byte sequences were already reachable Git blobs. The remaining 14 source differences were retained in a **37,667-byte patch** against identified Git bases. The patch passed `git apply --check`, was actually applied in a temporary verification directory, and reproduced every retained file's original SHA-256. No historical branch commit or whole source copy was created.

Ten unique JSON verification records, totaling **1,345,348 bytes**, were retained under the existing ignored private-handoff area. A repeated result was kept once. Generated dependency trees, duplicate screenshots, test exports and full build payloads were not retained.

Fresh checks of processes, 153 shortcuts, six client configurations, file associations and scheduled tasks found no dependency on the v0.4 tree. Its 2,881 generated reparse links were unlinked without following their targets. After the source-retention checks, `git worktree remove --force` removed the registration; a Windows long-path residue was then removed only within that exact unregistered directory. No process was stopped during this step.

HUANDENG now has **one registered worktree**, the main repository. The final top-level inventory remains **22 directories and four loose files** because this last tree was nested inside main. FSS retains three independent worktrees. Main `dist` has one physical Editor 0.18.0 package and one compatibility junction. The six current introduction projects remain inside the canonical example collection.

The removed v0.4 tree contained 1,951,776,699 apparent file bytes; 1,848,122,141 bytes belonged to files with multiple hard links. During its removal, concurrent release packaging produced a net free-space change of **minus 99,581,952 bytes**. That interval cannot establish this deletion's standalone physical recovery, and its apparent size is not a reclaimed-space claim.

The private research sources and their original paths were preserved. The protected user fixture remains unchanged. This step did not rewrite the live desktop profile or alter the current application, introduction writers, unrelated projects or the newly observed independent adapter source. Receipts are `v04-retirement-audit.json`, `v04-source-retention.json`, `v04-worktree-removal.json` and the final `directory-plugin-final.json` in the current ignored work directory.

## 0.19 follow-up: one source, explicit installed bundles

The 2026-11-11 follow-up again found 22 top-level directories and four loose files, with no v013-* loose artifacts. It did not remove unrelated projects. The workspace README now distinguishes the canonical HUANDENG source from the intentional DeepSeek installation directory.

The formal DSH source is plugins/huandeng/adapters/deepseek in the HUANDENG repository. <dsh-bundle-dir> contains the installed native distribution named huandeng, not another maintained product checkout. Its path is deliberately different because Windows would otherwise collide with <workspace-checkout> Unique prototype bytes were retained before the supported native upgrade; account, model and session stores were preserved.

The six introductions continue in their existing author/language directories inside examples/huandeng-introduction. Eight generated Brief aliases were verified byte-identical to the normalized brief files and removed. Named page versions remain inside their projects; ordinary modifications do not create another whole project.

The exact-source release build used the fixed internal temporary worktree .verification/product-intro-20261111/build-src, preserving the unrelated dirty fixture in the main checkout. After the exact-C archive was verified, that worktree was retired. Git's first removal left a Windows long-path residue; the bounded follow-up checked the original clean identity, remaining tracked bytes and reparse ownership before removing only that residue. The archive, compact receipts and protected originals were unchanged. This was temporary build isolation, not a second daily development tree. Installed-version switching and the one active application are recorded in the release handoff.

## Final 0.19 installation and cleanup

The final C3 runtime is installed in the existing versioned application path. The ordinary profile has six project tabs; their prior selected pages were restored through actual UI actions, and the active DeepSeek English project and maximized window were retained. All 1,240 authored/source/export files were rechecked unchanged after cleanup.

The [final cleanup receipt](evidence/editor-019/cleanup.json) records retirement of three superseded application trees, two superseded Editor ZIPs, owned test fixture/profile/runtime directories and the temporary clean-build worktree. The package/fixture removal covered 92,141 files and 2,993,935,330 apparent file bytes; this is a file inventory, not a separately measured physical free-space gain. The clean-worktree residual was removed only after its 2,875 tracked files matched C3 and active process references were checked. No process was stopped for cleanup.

HUANDENG has one registered worktree, main. Its dist directory contains the current C3 0.19 physical installation and the stable compatibility junction. One explicit 0.18 rollback package is retained separately, alongside the single final 0.19 release ZIP and compact verification records. The top-level <workspace-root> inventory remains 22 directories and four existing loose files, with no new dated introduction or build tree.

All six source folders now have Windows folder markers. Four were created through the visible Application menu > File action; two pre-existing pairs were preserved. The four historically tracked desktop.ini/project.ico files were removed only from the Git index, with their local bytes and attributes unchanged. Scoped ignore rules keep these host decorations out of future commits and portable archives. The six actual project folders, their artwork, stable IDs, named versions and current exports remain the maintained work.
