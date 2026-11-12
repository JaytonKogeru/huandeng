# HUANDENG Editor 0.23 — delivery record

Date: 2026-11-12.

This record accompanies [release notes](RELEASE-V023.md) and the [validation report](VALIDATION-V023.md). The work completed the independent Audit, Spec, implementation and local acceptance sequence. Remote publication and hosted CI are reported by the [versioned release](https://github.com/JaytonKogeru/huandeng/releases/tag/editor-v0.23.0) and [workflow records](https://github.com/JaytonKogeru/huandeng/actions/workflows/ci.yml).

## Source identity

| Layer | Accepted identity |
| --- | --- |
| Implementation | `92dbeef3976e868d8e8e2eebaac77766706745cc` |
| Final runtime | `a27b92083ecedaeaca3c5258102b3fbaeea9de93` |
| Annotated runtime tag | `editor-v0.23.0` |
| Plugin distributions | Implementation commit; complete plugin tree `059cfecae8517e8170522fc94ffc46c58c340d04` is identical at the final runtime commit |
| Product / desktop protocol | 0.23.0 / 2 |
| Runtime | Electron 45.3.1; embedded Node 24.22.2 |
| Build | Clean source, pnpm 10.17.0, build-host Node 22.21.0, built 2026-11-12T07:09:54.311Z |

The final runtime commit preserves the implementation history and fixes the default Windows shortcut path collection, with a red-to-green regression. The local tag was corrected before any remote publication. A later delivery commit contains records and a validation-only correction for an expected modal-close race; it does not change the runtime or plugin files.

## Delivered behavior

- Private local services require role-appropriate capabilities. SVG/document navigation, resource tickets, launcher bootstrap and capture/export authority were checked together. Git discovery does not execute project fsmonitor commands or substitute a current-directory executable.
- Watcher self-notifications, repeated preparation, full browser transfers, unchanged resource reads and history-summary reads are reduced. Complete authoritative scans, CAS, read dependencies, locking, durable journals, recovery, idempotency and Undo remain.
- New Project supports a blank Project or separate practice example and shows the final path. Theme and window layout persist across Projects. Conflict review preserves remote changes and recoverable local work. Optional proposal review shows actual before/after content and requires a bound human acceptance for reviewed writes.
- The Windows package carries product/source identity, complete content hashes, retained notices and current-user install/repair/uninstall entry points. Npm publication remains guarded and core npm remains 2.3.1.

## Accepted results

| Gate | Observed result |
| --- | --- |
| Complete local Windows unit suite | 1,527 passed, 0 failed, 1 existing Windows skip; 1,528 total |
| Source checks | Biome and core TypeScript passed; the installer follow-up also passed Biome |
| Final Official science/Windows smoke | 9/9 passed against the final runtime EXE |
| Final Official native upgrade workflows | 9/9 passed against the same EXE |
| Installation contracts | 6/6, including default Start Menu/Desktop paths and NoDesktopShortcut |
| Complete final-package install/repair/uninstall | 6/6; all three bundled scripts exited 0; modified and additional user files and other defaults survived |
| Actual PowerPoint | Read-only, no-repair science fixture open; one native chart; source bytes unchanged; exported pixels inspected |
| Codex / Claude | Same-name 0.23.0 enabled inventories, all 25 cache files matched, 24 tools and the selected synthetic Project verified from actual installed launchers |
| DeepSeek Harness | Live 0.23.0 under the same bundle identity; default launcher and actual Host context/selection calls verified in a separate synthetic read-only conversation |

The 80-page commit median changed from 358.08 to 222.00 ms; Agent preview plus apply from 652.73 to 399.75 ms; 200-item history summaries from 143.62 to 31.19 ms. Non-improvements and measurement limits remain in the validation report. Focused suites overlap the complete suite and are not added to its total.

## Actual user installation

The two existing shortcuts, PPTD registration and Agent runtime pointer select `dist/HUANDENG-v0.23.0-win32-x64/HUANDENG Editor.exe`. The former 0.22 window closed through its normal path, and the existing Desktop shortcut launched 0.23. The original four tabs were restored. The Project list, tab state and SHA-256 of 11 entries were unchanged.

The scheduled publisher's Action now uses the new runtime. Its trigger, principal, settings, registration information, working directory and configuration bytes remain unchanged. No manual publication was triggered. A natural scheduled invocation later returned task result 0; the separate science fixture supplies content/export acceptance.

The old 0.19 orphan was identified as an idle validation fixture and removed by a recorded targeted termination because its original IPC parent and console were absent. Its 25 source files were unchanged. A leftover candidate Error window and its test harness exited normally after the window closed; its 17 synthetic source files were unchanged. These were test cleanup operations, not terminations of user research windows.

## Distribution identity

| Archive | Bytes | SHA-256 |
| --- | ---: | --- |
| HUANDENG-Editor-0.23.0-win32-x64.zip | 199,870,013 | `abec1116888f69e98f0f36f9f88afffafbd5cf414fa419013408fb4232db3504` |
| HUANDENG-Plugin-0.23.0-Claude-Codex.zip | 226,175 | `9f43a7b3a149c324ba61a0c12fb97927bea28e4a150adc71c0496ad66eabcb23` |
| HUANDENG-Plugin-0.23.0-DeepSeek.zip | 406,946 | `9f5aba28e9f24ef2dfc45bd245e88e3ac57e707de1edb64ab3be17a37f4755d3` |

All ZIP entries matched their source files. The expanded Official package contains 6,399 files and 500,091,058 bytes, 19.86% below the earlier package's expanded bytes. The checksum file covers all three archives.

## Preservation and evidence

The four pre-existing tracked edits were compared against the original audit baseline after implementation and actual upgrade; all bytes and SHA-256 values remained unchanged. They were excluded from every release commit. The original Audit Seed and other unrelated untracked files were retained. The six frozen examples and existing research Projects were not writable test fixtures.

Detailed local evidence is retained under `.verification/implementation-20261112/`: `release/official-delivery.json`, `release/official-windows/`, `release/official-upgrade/`, the final `official-installer-a27b920-*/` record, `deepseek/`, `performance/` and `root/`. The temporary clean build checkout was retired after its artifacts and evidence were retained. The source, failed attempts and final accepted results remain distinguishable.

The package is unsigned. Account, model and permission settings were preserved. No upstream push, npm publication, published-history rewrite or certificate purchase was performed.
