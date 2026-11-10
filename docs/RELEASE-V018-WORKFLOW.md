# v0.18 workflow release preparation

Status: the existing private account plugin was updated in place to 0.18.0 and read back successfully. Native distributions remain prepared; combined Editor/deck acceptance controls desktop installation and the repository milestone.

## One source, client-specific routes

The repository owns the Story skill, design references, discovery scripts and shared writer contract. Build local and account distributions from this same source. Native Codex and Claude Code use their supported marketplace installers; DeepSeek Harness loads its explicit Cordis patch and skill provider; the account plugin keeps its existing workstation App binding.

Do not remove native Codex merely to simplify the ChatGPT picker. Native and account connections are separate hosts. Keep the account plugin ID, scope, audience, App binding, presentation metadata and default prompts unchanged. Update its existing release rather than creating a second account plugin.

The existing account manifest's author and developer display values differ from the portable repository default. The prepared account update preserves the existing values and changes only version. Comparing both current manifests and the prepared manifests after removing version produced exact object equality; the App configuration also matched.

## Prepared artifacts

| Artifact | Contents | SHA-256 |
| --- | --- | --- |
| Shared Story skill | Final source, local and account package | `f09f2bf2a49bfc62bc89e76fca53c5ef3d25ee08f810d51b6285d6160cdee990` |
| Local ZIP | 24 files, version 0.18.0 | `46e406b39c238067b0b1b5306538516a77acbce9467d20173ec44e383f38c364` |
| Full account ZIP | 21 files, version 0.18.0 | `c7d9928c19ad46e1ad205477eaf865352da8ec9fa2124034ac55905f8e2afe96` |
| Account update ZIP | 20 text files; existing icon retained | `ae1c486b2766c674a4c7a6ce9c7e7678cf5d4dcdd391f355a48890acac5b01a1` |

The update archive's omitted icon was compared to the existing account plugin and matched. Both archives were read back and CRC-checked. Every included file was checked against content-manifest.json. The account route adds its private App binding to client-routing.md; that target-specific routing file is intentionally different. Story and design/evidence references have identical bytes.

The external trial candidate remains frozen at its earlier hash `b3985d0e0ac763058d1c9d503d1f57e9a8d8aab9c5ebf98d13e6302854109737`. Subsequent init discovery, supplied-asset preflight, historical source preservation and per-Project render serialization are recorded improvements; they do not retroactively change what the models loaded.

## Desktop package gate

prepare-desktop-workspace.mjs now uses the same allowlisted local-package builder instead of copying the source plugin tree. Its smoke workspace contains 24 files with the final Story hash, and excludes examples and test scripts.

verify-desktop-package.mjs checks the complete package content manifest, plugin version, Story hash, required design references and shared Project initializer. It reports the Story hash with its existing portability result. A staged plugin check is not installed Editor acceptance.

## Release sequence

1. Complete the combined source tests, actual UI inspection and four-deck deliverables.
2. Build the desktop release from the reviewed source and verify the installed app's version, build identity, Project initializer and plugin content hashes.
3. Stage the local package in the versioned client distribution. Preserve all unrelated native settings and marketplace registrations.
4. Refresh/install the existing huandeng-local marketplace with each client's supported CLI. Keep the native Codex plugin. Reload native clients and verify actual tool discovery, exact Project binding and Story hash.
5. Generate DSH's patch from the installed package. Use the native --patch route or an explicitly configured project profile; a generic jobs runner that omits --patch does not load HUANDENG.
6. Re-read account plugin metadata and reconcile any newer release. Upload the prepared overlay with the observed release precondition, then read back the updated skill, references, metadata and content manifest.
7. Verify the intended ChatGPT host loaded that release. Resolve any remaining duplicate picker entry through the host's actual plugin-management surface, preserving native adapters.
8. Record the single repository milestone and release evidence.

Supported native commands were inspected from the installed CLIs: Codex marketplace add plus plugin add, and Claude marketplace add/install or plugin update. Do not edit installed caches. Versioned packages are retained for explicit rollback; a rollback also needs matching config and runtime verification.

## Duplicate-entry boundary

The two initially visible HUANDENG references did not prove that one was a stale account duplicate: one was an account plugin, and one was a local marketplace reference. Updating the account does not uninstall a native plugin. Removing a Windows Codex cache does not prove the ChatGPT picker changed.

The ChatGPT uninstall tool requires exact user-approved uninstall targets and explicitly excludes code plugins; it cannot be used for an assistant-selected ambiguous old entry. If the host still presents both entries after refresh, resolve the exact host identity first. Report that concrete remaining action rather than claiming deduplication from a filesystem deletion.

## Audit limits

The design audit uses the actual image schema `fit:{mode:"contain"|"cover"}`, which matches the renderer/export behavior. Plain fit strings are not that schema. Checkpoint presentation assets use archived project-relative source paths, so the bounded reader measures those archived files rather than silently substituting the live source.

A zero-warning quality report is advisory. Human-scale typography, visual rhythm, real screenshot provenance and readable exported output still require inspection.

## Inspected script boundaries

- Package-Huandeng.ps1 prepares a private staging workspace, deploys production dependencies, verifies the allowlisted plugin/content manifest, and relocates the portable app. Replace requires a HUANDENG marker and no process running from the target. It does not install, change client configuration, commit or push.
- Install-Huandeng.ps1 registers the provided executable through current-user HKCU document associations and Start Menu/Desktop shortcuts. It preserves a protected Windows UserChoice association and offers NoFileAssociation/NoDesktopShortcut flags. It does not copy the application into a managed install directory or update native/account plugins; choose the final retained application path before using it.
- Native marketplace commands are client-owned user-scope operations. Keep unrelated marketplace registrations and settings. Prepared staging validation does not establish enabled-client reload.
- The account update retains the existing USER/PRIVATE plugin identity and workstation App binding. Re-read the current release and use its update precondition; never replace an intervening release based on the old audit alone.
- Only the project owner performs the reviewed clean-source commit, final installation/distribution and one origin milestone. No inherited npm publish or upstream push is part of these scripts.

## Account update observed on 2026-11-10

The existing account plugin was updated with its freshly observed release precondition. The service returned version 0.18.0, the same plugin identity and USER/PRIVATE scope. All 20 returned text files match the submitted overlay byte for byte and match their content-manifest hashes; the existing icon was retained. Both manifests preserve existing metadata except version, and the original App binding is unchanged. The current host's skill reader also returned the final Story hash `f09f2bf2a49bfc62bc89e76fca53c5ef3d25ee08f810d51b6285d6160cdee990`.

The exhaustive personal-plugin inventory contained one HUANDENG account entry. The current managed runtime reported no installed huandeng-local plugin or registered marketplace. The separately supplied local code-plugin reference is not an obsolete second account record, and the App uninstall tool explicitly does not manage code plugins. No native Codex/Claude/DSH removal was performed. Account release and live skill delivery are verified; disappearance of a second picker entry is not asserted. Exact private release IDs, link, binding and verification receipt remain under .verification/v018-account-release.json.
