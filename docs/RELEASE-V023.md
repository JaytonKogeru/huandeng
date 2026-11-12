# HUANDENG Editor 0.23.0

Release date: 2026-11-12. Builds on [0.22.2](RELEASE-V0222.md).

The implementation, final clean-package acceptance, actual installation and native client checks are complete. [Release downloads and remote checks](https://github.com/JaytonKogeru/huandeng/releases/tag/editor-v0.23.0) provide the publication record. The accepted runtime source is `a27b92083ecedaeaca3c5258102b3fbaeea9de93`, tagged `editor-v0.23.0`, following the implementation commit `92dbeef3976e868d8e8e2eebaac77766706745cc`. Later delivery documentation does not change the executable's source identity.

## What changes

This release follows the [independent audit](AUDIT-NEXT-PHASE-2026-11-12.md) and [upgrade specification](SPEC-NEXT-PHASE-2026-11-12.md). PPTD files, stable page identities, Main Slides, live/pinned Presentations and the shared writer remain authoritative.

### Protect local Projects and external content

Protocol 2 separates Agent, launcher, UI, capture and export capabilities. Anonymous private HTTP requests are rejected. Native UI bootstrap is restricted to the trusted Project window; browser launch uses a short-lived, single-use ticket that is removed from the address. Resource tickets bind the exact path, revision, purpose, service epoch and request method. Capture and export receive limited capabilities rather than the Agent writer's authority.

SVG and other active resources are served with sandbox and content-type protections. Browser navigation, iframe and object probes could not execute the injected scripts or change the Project. Positive checks retained scientific SVG clips, masks, filters, embedded fonts and file/data-image rendering, including export.

Git discovery uses a supported absolute executable, excludes current-directory executable replacement, disables project-controlled fsmonitor callbacks and prevents external diff/textconv execution. Existing hook, filter and signing requirements still defer unsafe automatic checkpoints; they are not silently disabled to make a checkpoint succeed.

### Remove repeated document work

The writer reuses validated transaction inputs and shares immutable unchanged structures. Watcher handling recognizes its own exact persisted bytes and corresponding directory notifications while preserving independent external changes. Versioned deltas update the browser atomically; missing history, mismatched base revisions or a new service epoch fall back to a full snapshot.

Bounded resource and history-summary caches avoid rereading unchanged bytes. Complete authoritative page loading, CAS, read dependencies, writer locking, durable journaling, recovery, receipt verification and Undo remain in the write path.

### Complete creation, conflict and review workflows

Native New Project shows the chosen parent and final entry before creation. Cancellation creates nothing. A blank Project and a separate optional three-page practice Project are available. Home and Project windows share the selected theme; window layout preferences migrate and propagate across Projects while page selection and zoom remain Project-specific.

Conflicts show the actual local and current content. Rebase preserves unrelated remote changes and requires explicit choices for overlapping fields, then saves through normal CAS. Discarded local work can be recovered as a draft for another review; recovery does not silently overwrite the current document.

Optional proposal review shows before/after slides, Notes and affected fields in Activity. Human acceptance uses a UI-bound, single-use approval value and rechecks page, global and visual-resource baselines before journal creation. Independent page subsets receive a fresh preview and identity. Truncated visual reviews cannot be accepted as complete reviews. Authorized ordinary Agent work continues to use preview/apply. See [proposal review](PROPOSAL-REVIEW.md).

### Deliver a verifiable Windows package

Electron is pinned to 45.3.1. The executable carries HUANDENG product metadata. The portable package includes current-user install, repair and uninstall entry points, source/toolchain identity, a file-content manifest and [installation instructions](WINDOWS-INSTALL.md).

The desktop's server dependency set follows its built CLI imports. Browser-only duplicate packages are excluded while the compiled browser editor, Playwright, KaTeX and scientific export dependencies remain. Licenses and notices from the complete production dependency closure are retained separately before pruning.

Product workspaces are private and the inherited npm publication command stops with a product-policy error. One version command updates the four Editor/plugin metadata files consistently; the upstream core npm version remains 2.3.1.

## Acceptance

The [validation record](VALIDATION-V023.md) identifies fixtures, raw evidence and measurement limits. Focused test groups overlap the full suite and are not added to its total.

| Gate | Observed result |
| --- | --- |
| Complete Windows unit suite | 1,528 tests: 1,527 passed, 0 failed, 1 existing POSIX-hook skip; 387 reported suites passed |
| Source quality | Full Biome and core TypeScript checks passed |
| Protocol 2 and content isolation | Private-request denial, role boundaries, ticket lifecycle, eight active-resource attack surfaces, and scientific SVG positive controls passed |
| Publisher and capture | Actual hidden publisher/CLI export and capture passed with restricted authority; source bytes were preserved |
| Final candidate Windows smoke | 9/9: relocated Unicode/space path, native save/Undo/Redo, CLI/MCP, science rendering, PDF/PPTX and reopen |
| Final candidate native upgrade workflows | 9/9: creation/cancel, theme/layout, real external-write conflict, recovered draft, proposal subset/review, restart and navigation denial |
| Actual PowerPoint | PowerPoint 16.0 opened the synthetic science PPTX read-only with OpenAndRepair=false; one native chart remained; source SHA-256 was unchanged |
| Install/repair/removal contracts | Six contract checks passed, including the default two-shortcut path and NoDesktopShortcut regression; complete-package install/repair/removal also preserves user files and existing choices |
| Clean Official package | Final `a27b920` source/tag/clean marker verified; the exact EXE passed Windows science smoke 9/9 and native upgrade workflows 9/9 |
| Actual installed Editor and matching plugins | Normal Desktop launch verified 0.23 with four restored Project tabs; Codex/Claude inventories and caches verified; DeepSeek live 0.23 and actual Host read-only MCP calls verified |
| GitHub hosted CI and release assets | Recorded by the [release](https://github.com/JaytonKogeru/huandeng/releases/tag/editor-v0.23.0) and [HUANDENG CI](https://github.com/JaytonKogeru/huandeng/actions/workflows/ci.yml); remote results are distinct from the local acceptance above |

Actual PowerPoint exported a PNG whose rendered formula, chart and original SVG content were visually inspected. Hosted Windows CI performs its own synthetic package checks and does not claim to run PowerPoint. Automated New Project checks supply a test-owned directory at the folder-selection boundary.

## Measured performance

The same THUG Windows machine and synthetic fixture definitions were used before and after. Values below are p50 / p95 in milliseconds; the complete report retains raw samples.

| Workload | 0.22.2 baseline | 0.23 implementation |
| --- | ---: | ---: |
| Commit one edit in an 80-page Project, n=20 | 358.08 / 440.02 | 222.00 / 236.65 |
| Agent preview plus apply, n=10 | 652.73 / 729.01 | 399.75 / 423.66 |
| List 200 history summaries, n=10 | 143.62 / 197.49 | 31.19 / 143.67 |
| Unchanged authoritative refresh, n=10 | 169.38 / 257.15 | 138.22 / 166.58 |
| Browser-observed durable delete, n=10 | 391.25 / 447.40 | 294.65 / 320.90 |
| Conditional 4 MiB resource response | 9.61 / 11.51 | 2.71 / 18.89 |

A self-write sequence now makes 86 page-file reads in total instead of 165: 85 reads during the transaction for the 80-page Project, followed by one read to verify the changed page. External same-size/restored-mtime writes, atomic replacements and concurrent changes still trigger the required refresh. A two-page delta was 36,176 bytes versus 1,211,420 bytes for the full snapshot, a 97.01% reduction. Twenty conditional resource requests plus one probe caused no additional source read after the first read.

The conditional-response p95 worsened, and fresh Store opening, history reopening and full snapshot cloning did not improve uniformly. These results support the specific reductions above, not a universal speedup. OS caches were not cleared and the fixtures were recently written; these are not OS-cold startup measurements.

## Artifact identity

| Item | Value |
| --- | --- |
| Product / protocol | 0.23.0 / 2 |
| Runtime source | `a27b92083ecedaeaca3c5258102b3fbaeea9de93` |
| Plugin source | `92dbeef3976e868d8e8e2eebaac77766706745cc`; the complete plugin tree is identical at the runtime source |
| Annotated runtime tag | `editor-v0.23.0` |
| Official source cleanliness | `sourceDirty=false`, channel `release`, built 2026-11-12T07:09:54.311Z |
| Expanded package / file count | 500,091,058 bytes (476.924 MiB), 6,399 files including the content manifest |
| Editor archive | 199,870,013 bytes; `abec1116888f69e98f0f36f9f88afffafbd5cf414fa419013408fb4232db3504` |
| Claude/Codex archive | 226,175 bytes; `9f43a7b3a149c324ba61a0c12fb97927bea28e4a150adc71c0496ad66eabcb23` |
| DeepSeek archive | 406,946 bytes; `9f5aba28e9f24ef2dfc45bd245e88e3ac57e707de1edb64ab3be17a37f4755d3` |

The Official package is 19.86% smaller in expanded bytes than the earlier 624,060,587-byte, 26,052-file package. Every archive entry was checked against its clean source for size and SHA-256. `SHA256SUMS.txt` lists all three ZIPs; that 311-byte checksum file has SHA-256 `730c2f7c895d3bfc29cb923f5933f85d4495d7e38a5fe7270a783d23c2f9d852`. Plugin distributions retain their original C1 source provenance; Git confirms that the complete plugin tree is identical at the final runtime commit.

## Installed delivery

The actual current-user installation registered both the Start Menu and Desktop shortcuts, the PPTD open command and the Agent runtime pointer to the Official 0.23 directory. The old 0.22 window closed through its normal close path. Opening the existing Desktop shortcut launched the new 0.23 executable and restored the original four Project tabs. The open-Project list, tab state and SHA-256 of 11 entries remained unchanged; no discarded draft was used to complete the upgrade.

The real default-install step exposed a PowerShell single-item-array conversion that the original explicit-directory fixture did not cover. The fix preserves separate Start Menu and Desktop paths. Its new regression failed against the old code and passed after the fix; the full installation contract now has six checks. The corrected package then passed the real default installation and the complete-copy install/repair/uninstall acceptance. The first Editor package and failed evidence were retained locally and were not published.

Codex and Claude were updated through their supported same-name marketplace/plugin commands. Each fresh inventory contains one enabled 0.23.0 HUANDENG entry; unrelated entries remain unchanged. Each actual installed cache matched all 25 distribution files. Their installed launchers authenticated, discovered 24 tools and read the exact synthetic Project. These are installation and MCP checks, not claims that an existing model conversation hot-loaded new instructions.

DeepSeek Harness loaded the same HUANDENG bundle identity at live version 0.23.0. A new, separate synthetic verification conversation called the specified context and selection tools through the actual Host and returned the expected Project, page and revisions. The standard bundle's default launcher also passed 24-tool discovery without installation-path overrides. Account, model and permission settings were retained; existing conversations were not used as test targets.

The existing scheduled PPTX publisher now points at the new runtime. Only three runtime paths in its Action changed; its trigger, principal, settings, registration information, working directory and configuration bytes were preserved. No manual publishing run was triggered. A later natural scheduled invocation returned Windows task result 0; that is recorded separately from the scientific export fixture's content acceptance.

## Installation and compatibility

Extract the complete portable ZIP to a new folder. Run the bundled Install-Huandeng.cmd to register the current user's shortcuts and Open with entry. Running it again repairs those registrations; running it from the new version updates them to that version. An existing Windows default remains selected.

Uninstall-Huandeng.cmd removes only this installation's owned registrations, shortcuts and unchanged files listed in its manifest. User Projects, preferences, added files and modified application files remain. An old installation cannot unregister its replacement.

Protocol 2 rejects old discovery records. Upgrade the matching HUANDENG plugin and reopen the selected Project. Native client installation inventory, an actual live host activation, and a model's completed authoring task are separate acceptance claims.

The package remains unsigned. No signing credential, certificate purchase, npm publication or upstream push forms part of this release. RunAsNode remains enabled because desktop service, publisher and Agent setup still use it.

The six accepted example editions and pre-existing research edits are outside this release's edit scope. Stable IDs, original media, named versions, document history and all existing write-safety mechanisms remain preserved.

## Runtime reference

The runtime selection was checked against the [official Electron releases](https://releases.electronjs.org/) and [support schedule](https://releases.electronjs.org/schedule) on 2026-11-12. The build marker records the exact Electron and bundled Node versions used by the delivered package.
