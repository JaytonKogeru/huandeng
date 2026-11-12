# HUANDENG Editor 0.23.1

Release date: 2026-11-12. Builds on [0.23.0](RELEASE-V023.md).

The clean runtime, actual installation, native Editor workflows and matching native clients have passed acceptance. The release is public, and all four assets were downloaded back with matching sizes and SHA-256. Source and Official release-tag CI both passed.

## What this release delivers

This is the completed 0.23 upgrade plus the Windows Unicode installer correction discovered by hosted acceptance. The [independent audit](AUDIT-NEXT-PHASE-2026-11-12.md), [upgrade specification](SPEC-NEXT-PHASE-2026-11-12.md) and [0.23 validation](VALIDATION-V023.md) retain the original evidence and performance measurements.

- Protocol 2 separates Agent, UI, launcher, capture and export authority; private HTTP requires authentication. Active SVG/document content is isolated while scientific clips, masks, filters, fonts and file/data images remain usable.
- Git discovery uses a supported absolute executable, disables project-controlled fsmonitor callbacks and prevents external diff/textconv execution. Required hooks, filters and signing still defer unsafe automatic checkpoints.
- Exact watcher self-write recognition, reusable transaction preparation, versioned browser deltas and bounded history/resource caches remove repeated work. Authoritative scans, CAS, read dependencies, locking, durable journals, recovery, receipts and Undo remain.
- New Project supports a blank Project or a separate three-page practice Project. Theme and window layout persist across Projects. Conflict review shows actual alternatives, preserves independent remote changes and retains recoverable drafts.
- Optional proposal review shows real before/after content and binds human acceptance to a fresh, immutable review. Independent page subsets receive a new preview; ordinary authorized Agent work continues through preview/apply.
- Windows delivery includes source/toolchain identity, complete content hashes, retained dependency notices and current-user install, repair and uninstall. Product npm publication remains guarded.

The 0.23 measurements include an 80-page commit median of 358.08 to 222.00 ms, Agent preview/apply of 652.73 to 399.75 ms and 200 history summaries of 143.62 to 31.19 ms. A two-page delta transferred 97.01% fewer bytes. These are the retained implementation measurements, not new benchmarks of this installer patch; their non-improvements and cache conditions remain in the validation record.

## Unicode installation and removal

Hosted Windows CI exposed a real shortcut defect when an installation directory contained characters outside the system ANSI code page. The same failure was reproduced with existing Arabic and emoji targets on a code-page-936 system.

Installation and uninstall now share an explicitly Unicode Shell link implementation. Actual shortcut targets, working directories, descriptions, arguments and icons survive save/load. Uninstall reads the stored target without asking Windows to locate a moved executable. The helper is included in the package and content manifest.

Separate Start Menu/Desktop destinations and NoDesktopShortcut remain covered. Repair restores a damaged shortcut. Uninstalling an old installation leaves a replacement's shortcut bytes and registration intact. Uninstalling the current copy removes its owned unchanged files while preserving added Project files, modified application files, unrelated shortcuts and existing application choices.

The seven installation contracts passed locally on code page 936 and on hosted English Windows with code page 1252. A complete copy of the final package also passed actual install, repeated repair and uninstall in directories containing Chinese, Arabic and emoji characters. See the [correction specification](SPEC-WINDOWS-UNICODE-0.23.1.md).

## Accepted package and source

| Identity | Value |
| --- | --- |
| Product / desktop protocol | 0.23.1 / 2 |
| Runtime and plugin source | `82023a5d68dd7bdd3c52e6e0faf89c2c889f16f0` |
| Annotated release tag | `editor-v0.23.1` |
| Official marker | `sourceDirty=false`, channel `release`, built 2026-11-12T08:17:41.262Z |
| Runtime | Electron 45.3.1; embedded Node 24.22.2 |
| Build tools | Node 22.21.0; pnpm 10.17.0 |
| Expanded package | 500,096,273 bytes, 476.929 MiB, 6,400 files |
| Content manifest SHA-256 | `7b721f2d8cb1168ffd675f0a5a901a691f0ce52cde56f8595b1134f4b8fe4c42` |
| Windows signature readback | NotSigned |

Expanded bytes are 19.86% below the earlier 624,060,587-byte package. Every archive entry matched its clean source file's size and SHA-256.

| Archive | Bytes | SHA-256 |
| --- | ---: | --- |
| HUANDENG-Editor-0.23.1-win32-x64.zip | 199,871,518 | `3bf7ad81b77507eca1d3b0d5d84bb6f29bc8222c0ada3bd212da6bd3132b8aad` |
| HUANDENG-Plugin-0.23.1-Claude-Codex.zip | 228,917 | `d4a6c9c1e3c870464d1c83438ada69dbdee5b680439b77d3322d548269374e7f` |
| HUANDENG-Plugin-0.23.1-DeepSeek.zip | 410,416 | `b2010f00ae6388282c875d419da3e08b748bda933ad6b3a0cd91d70ebb41a922` |

SHA256SUMS.txt is 311 bytes, SHA-256 `3e95c79b48cc09a374f252ad1dbc869aa2759bdfb1d1a0d8e718449a17b4cca4`. Publication and download verification are recorded at the [versioned release](https://github.com/JaytonKogeru/huandeng/releases/tag/editor-v0.23.1).

## Acceptance

| Gate | Observed result |
| --- | --- |
| Retained full Windows source suite | 1,528 total: 1,527 passed, 0 failed, 1 existing POSIX-hook skip |
| Focused native and desktop contracts | 16/16 native; 68/68 desktop on hosted Windows |
| Unicode installation contracts | 7/7 on local code page 936 and hosted code page 1252 |
| Complete Official-copy install/repair/uninstall | 6/6; all four actual script invocations exited 0 |
| Final local Official Windows smoke | 9/9, including editing/Undo/Redo, CLI/MCP, scientific SVG and PDF/PPTX |
| Final local Official native workflows | 9/9, including creation/cancel, conflict/recovery, proposal review and restart |
| Source-commit CI | [Main run 43181396102](https://github.com/JaytonKogeru/huandeng/actions/runs/43181396102): Ubuntu and Windows success |
| Release-tag CI | [Tag run 43183022346](https://github.com/JaytonKogeru/huandeng/actions/runs/43183022346): Ubuntu and Windows Official packaging success |
| Actual desktop launch | Existing Desktop shortcut double-clicked; four tabs and original selected canvas restored without another tab click |
| Codex and Claude | Same-name 0.23.1 installations, 25 cache files each, protocol 2 and 24-tool MCP checks passed |
| DeepSeek Harness | Same-name live 0.23.1; default MCP and a new independent Host conversation with two read-only calls passed |
| Published delivery | Three ZIPs and SHA256SUMS.txt downloaded back; sizes and SHA-256 match local archives and GitHub digests |
| Final local preservation | Original four tracked changes, eleven entry hashes and four tabs unchanged; synthetic processes/routes closed and clean build checkout retired |

The [validation record](VALIDATION-V0231.md) retains the failed attempts and their actual follow-up results. The final local 9+9 used the original assertions and timeouts. Focused groups overlap other suites and must not be added into a synthetic total.

## Installed delivery and compatibility

The actual current-user installation now selects the Official 0.23.1 runtime through both existing shortcuts, the PPTD open command and Agent discovery. The old window closed normally. A real mouse double-click on the existing Desktop shortcut restored the four original tabs and selected Project, including its directory, canvas and Inspector. Eleven entry hashes, the open-Project list and complete tab state were unchanged; no Project was edited for this check.

Codex and Claude upgraded through their supported same-name commands. Unrelated plugin entries were unchanged. Their installed caches and actual MCP launchers were checked; those results do not claim model authoring or hot-loading into existing conversations.

DeepSeek Harness upgraded through its existing official Plugins page. The live component, default 24-tool MCP and a new independent Host conversation were verified. The conversation made exactly two read-only context/selection calls against the synthetic Project, with unchanged source hashes. Closing the synthetic Editor naturally removed its launcher and MCP route; the four original Project connections and user Editor remained.

The scheduled publisher's Action now points at the new runtime. Its trigger, principal, settings, registration information, working directory and configuration bytes were retained. No manual publishing run was triggered.

Extract the complete ZIP into a new folder and run Install-Huandeng.cmd. Rerunning it repairs owned shortcuts and registrations. An existing Windows default remains selected. Uninstall-Huandeng.cmd removes only this installation's matching registrations/shortcuts and unchanged manifest-listed files; Project data, preferences, added files and modified application files remain.

The package remains unsigned. No signing credential, certificate purchase, npm publication or upstream push forms part of this release. The published 0.23.0 tag and assets retain their identities and their installer compatibility notice. The [delivery record](HANDOFF-V0231.md) identifies the final observed state and retained evidence.
