# Workspace organization

This document records the workstation cleanup accompanying the introduction rework. The current HUANDENG entry is the main repository, `D:\_Proj\Huandeng`. The rework changes presentation examples and plugin guidance; the installed Editor remains **0.18.0**.

## One project entry

The four editable introductions live in [examples/huandeng-introduction](../examples/huandeng-introduction/README.md): `chatgpt-zh`, `chatgpt-en`, `claude-en`, and `deepseek-zh`. Each directory contains its own `deck.pptd`. Shared assets and useful reference projects are alongside those four projects. Old parallel copies under the former top-level introduction directory have been retired.

Use `Start-Huandeng.cmd` from the main repository for the current desktop application. The top-level `D:\_Proj\README.md` is a short Chinese index pointing here and explaining the remaining related directories. No additional dated archive or active repository was created for this cleanup.

## Measured cleanup

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

| Location under `D:\_Proj` | Role and reason for retention |
| --- | --- |
| `Huandeng` | Current source, four introductions, shared assets, current desktop package, and development entry. |
| `Huandeng-v010-20261108` | Still runs a writer for a real research project. Retained in place; no project schema migration was attempted. |
| `Huandeng-Handoff-Private` | Current private handoff material. Preserved at its existing location. |
| `HUANDENG-PRIVATE-HANDOFFS` | Additional user private handoff material. Preserved at its existing location. |
| `FreestyleScientificSlides` | Independent FSS / ArgFrame source with local changes and an active native plugin dependency. |
| `FSS-worktrees` | Two FSS worktrees with distinct modified and untracked source files. |
| `FSS-PPTD-Validation` | Existing validation and reference material whose reproducibility was not established. |

The main repository also retains `.verification/v04-worktree`: its audit found 76 modified or untracked source files. It is not a second public project entry. The v0.10 tree and FSS trees were not treated as disposable merely because their names are old.

The old v0.18 worktree was removed after both authoring teams released its screenshot dependency. Playwright is available through the main repository's core package dependencies, so an entire historical checkout is no longer needed to run the capture helpers.

## Desktop and active research protection

The only physical main-repository installation is `dist/HUANDENG-v0.18.0-win32-x64`. Its build records source revision `35dfe649d450d22a0e4e3b70661be52c67eb9f7a` with `sourceDirty=false`. The `dist/HUANDENG-win32-x64` junction points to this same directory; it contains no second binary copy. Existing shortcuts and the PPTD association point to the current package. No Editor executable or Editor source was upgraded during this rework.

Only six identified historical public-demo or test processes were stopped. The four current introduction writers and the older research writer remained available. Final inspection also confirmed that the ordinary Editor process was still running with the user's two research projects. No private project was closed, discarded, migrated, or exported by the cleanup.

A unique earlier save-failure project, a small original draft recovery set, and a research design reference were retained under ignored verification storage. They are user data, not release material. Generated runtimes, repeated Office inputs, bulk session logs, and whole historical package copies were not retained with them.

## Recent projects

The retired introduction paths in the ordinary Editor's recent list were migrated to the four canonical project paths. The migration used a compare-and-swap check of the final saved preferences after normal application exit. It changed **only `recentProjects`** and preserved all other eight preference fields, including saved layouts, window state, and the then-current empty tab selection. The initial list changed from ten entries to nine after duplicate retirement.

The same 0.18.0 executable was reopened. The user subsequently opened research projects; that later activity was preserved. Historical layout keys were not removed as a side effect of cleaning the visible recent list. This matters because the Editor saves its in-memory preference snapshot as a whole: overwriting a live profile would risk restoring stale state.

## Plugin source, native distribution, and host deduplication

The current plugin source and installed native distribution are **0.18.2**. The Editor remains 0.18.0. The new guide permits an intentional background system, meaningful logos and icons, original explanatory diagrams, and scientific charts when they serve the content. It no longer treats white backgrounds, absent illustrations, or a fixed page sequence as a universal quality rule. Evidence fidelity and real Office review remain necessary. Agent visual review is recorded separately from author acceptance.

The native Claude Code and DeepSeek Harness trials actually loaded the frozen **0.18.1 candidate**. That provenance remains unchanged. Version 0.18.2 changes the remaining contradictory README examples and three version manifests; the three tested guide files have identical bytes. The final native package has 24 files. A portable marketplace wrapper adds two catalog files whose source is the relative path `./huandeng`.

Codex and Claude Code were updated through their supported plugin CLI commands. The dedicated HUANDENG DeepSeek launcher now selects the generated 0.18.2 patch; ordinary DeepSeek settings were not changed. The distribution directory, Codex cache, and Claude cache each matched all 24 package files. One final doctor run verified the local stdio MCP protocol and the current public project. This is protocol verification, not another model trial. The real DSH trial used its recorded desktop-host route and explicit project patch, not the dedicated interactive launcher.

The duplicate entries were then traced to the actual OpenAI native Windows host: a folder-marketplace installation and an installation of the owned cloud plugin. Its detail menu exposed separate **Uninstall** and **Delete plugin** actions. Only **Uninstall** was used on the cloud-backed host installation. Final installed-list inspection showed one HUANDENG, `huandeng@huandeng-local`, whose detail page showed 0.18.2 and the 0.18.2 catalog path. The owned cloud plugin still exists at 0.18.2 and remains available for installation on another host. Its source, App binding, and account identity were not deleted.

The separate DC-WALT connection remained ready after the operation, with the same runtime epoch. No native Claude or DeepSeek configuration was removed for the purpose of deduplication. An optional composer query was stopped by a guard because a user draft was already present; no message was sent and no draft text was changed. The completed verification is the host's installed list and plugin detail, rather than a claim about every other client's picker or about the catalog of available owned plugins.

## Storage accounting

The final free-space checkpoint increased from **138,432,684,032 bytes to 152,060,272,640 bytes**, an observed net increase of **13,627,588,608 bytes (12.692 GiB)**. The first checkpoint was taken after cleanup had already started. Concurrent authoring and export writes also affect free space, so this is a measured net difference over that interval, not an exact attribution or the entire cleanup total.

The initial scan measured **45,228,656,083 apparent bytes (42.122 GiB)** across the thirteen removed top-level worktree containers. That number excludes the removed nested v0.4 release tree and precedes selective user-data retention. It must not be presented as physically reclaimed storage: package-manager hard links and shared data can make apparent file sizes count the same allocated storage more than once. Removing the twelve old main-repository packages was separately observed to increase free space by 8,565,207,040 bytes during that step; that interval is part of the later cleanup, so these figures are not added together.

The final pass also removed **182 top-level loose files**, totalling 12,698,004 file bytes: old transfer fragments, source bundles, generated logs, and one-off helpers. Their 139 base64 fragments reassembled to the recorded ZIPs, and all 95 substantive ZIP members were found in Git history. Only three private original snapshots (61,812 bytes) and a compact semantic source delta (20,378 on-disk bytes) were retained. The original-file hashes were checked again before deletion. These files were not moved wholesale into another archive directory.

## Evidence and future handling

Detailed local receipts are kept under the main repository's ignored `.verification/rework-20261110` directory. They include `worktree-removals.json`, `legacy-package-removals.json`, `retired-standalone-removals.json`, `recent-projects-migration-plan.json`, `native-host-deduplication.json`, and the final workspace summary. These receipts contain operational paths and are not added to the public release.

The earlier native trials retain three immutable submission ZIPs, their manifests, final visible responses, bounded run receipts, and selected Office evidence. They retain the distinction between an original model submission and an assisted technical continuation. Older unaccepted introduction drafts remain historical evidence; retaining them does not claim that the user accepted their appearance. Current visual and compatibility findings belong in the introduction review, not in a successful directory-cleanup claim.

Future HUANDENG development should start from the main repository. Use temporary worktrees for isolated changes and remove them after integration only when unique local changes, ignored user material, and active services have been checked. Keep a single current physical desktop package and use the compatibility alias for the existing launcher. New presentations should live in their intended project directory rather than beside another dated copy of the whole repository.
