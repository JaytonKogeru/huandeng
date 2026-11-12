# HUANDENG Editor 0.23.1 — delivery record

Date: 2026-11-12.

Status: the implemented release is accepted, installed and published. The clean Official package, actual current-user upgrade, native Editor workflows, all matching native clients and source/tag CI passed. All four public release assets were downloaded back with matching sizes and SHA-256.

This record describes observed delivery. The [release notes](RELEASE-V0231.md), [validation record](VALIDATION-V0231.md) and [Unicode correction specification](SPEC-WINDOWS-UNICODE-0.23.1.md) provide the detailed scope, acceptance and retained failures.

## Delivered implementation

The complete 0.23 upgrade covers private-client authentication and active-resource isolation, Git execution safety, duplicate-work reduction, bounded resource/history caches, versioned browser deltas, New Project, persistent themes/layout, conflict review/recovery and optional proposal review. Existing page identities, Main/live/pinned Presentation semantics and scientific rendering/export remain.

The 0.23.1 correction replaces Windows shortcut persistence with explicitly Unicode Shell interfaces for both creation and ownership readback. It preserves installer repair, replacement ownership, current-user registration and user-file-preserving uninstall. Product and native-plugin metadata advance together. The CI workflow constructs its real Chinese package directory from ASCII code-point expressions so PowerShell 5.1 runs the intended Unicode test.

## Frozen package identity

| Item | Accepted value |
| --- | --- |
| Runtime and both plugin source commits | `82023a5d68dd7bdd3c52e6e0faf89c2c889f16f0` |
| Annotated tag | `editor-v0.23.1` |
| Version / protocol / Electron | 0.23.1 / 2 / 45.3.1 |
| Official build | Clean source, release channel, 2026-11-12T08:17:41.262Z |
| Runtime content | 6,400 physical files; 500,096,273 bytes; all 6,399 manifest entries verified |
| Distribution | Editor ZIP, Claude/Codex ZIP, DeepSeek ZIP and SHA256SUMS.txt |
| Windows signing | NotSigned |

The final executable and both plugin packages use the same source commit. Later documentation commits describe this accepted build and do not change its source identity. Archive sizes and complete SHA-256 values are in the release notes.

## Actual installed state

The normal current-user installation points to the 0.23.1 Official runtime through the existing Desktop and Start Menu shortcuts, PPTD command and Agent runtime discovery. The old window closed normally. A real mouse double-click on the existing Desktop icon naturally restored the four original Project tabs and selected Project's directory, canvas and Inspector without another tab click.

Eleven recorded Project entry hashes, the four open-Project records and the complete tab state were unchanged. No user Project edits were made. The final user Editor remains running; synthetic native checks used separate fixtures and application instances.

Codex and Claude contain one enabled same-name HUANDENG 0.23.1 entry each. Their 25-file installed caches match the distribution. Both actual installed launchers returned protocol 2, 24 tools and the intended synthetic deck. Unrelated plugin inventories and Claude's existing user scope remain. These checks establish installation and MCP operation; model authoring and existing-chat hot-loading are not claimed.

DeepSeek Harness upgraded and enabled the existing same-name 0.23.1 bundle through its official Plugins page. The live component and default 24-tool MCP passed. A new independent Host conversation made exactly two read-only context/selection calls against the correct synthetic deck/page, with all five source files unchanged. The fixture then closed normally and its launcher/MCP route exited naturally. The four original Project routes, actual user Editor identity, account/model/permission settings and existing conversations were preserved.

The scheduled publisher's Action points to the new runtime. Its trigger, principal, settings, registration information, working directory and configuration bytes were preserved. No manual publishing run was triggered.

## Acceptance and evidence

The original full Windows source suite passed 1,527 tests with zero failures and one existing Windows skip. Final hosted native and desktop groups passed 16/16 and 68/68. Unicode installer contracts passed 7/7 on Chinese and English Windows. Actual complete-copy install, repeated repair and uninstall passed 6/6.

The final Official executable passed Windows smoke 9/9 and native upgrade workflows 9/9 locally. The source CI and Official tag CI also passed both Ubuntu and Windows jobs, including packaging, native workflows and uploaded artifacts. The first local screenshot timeout remains recorded; the successful serial rerun used unchanged assertions and timeouts.

New evidence is retained under .verification/implementation-20261112/patch-0231/. The local delivery aggregate is release/official-delivery.json, with status local-delivery-accepted and an empty pending list. Synthetic applications and routes closed normally. The temporary clean build checkout was retired; the final preservation guard confirmed all four original tracked changes, eleven entry hashes, four tabs/open-Project state and zero drafts. The validation record maps the detailed installation, native, source/tag CI and real user-entry receipts. Evidence from the earlier 0.23 implementation remains at its original paths.

## Preservation and publication

The four pre-existing tracked modifications, original untracked files, audit seed, frozen examples and research Projects remain outside the delivered source changes. Synthetic Projects supplied all writable acceptance tests. Existing account, model, permission and Windows default-application settings were retained.

The earlier unpublished 862c84de candidate remains separately identified and was never installed or published. The published 0.23.0 tag, assets and acceptance history remain intact; its release page records the installer compatibility defect. The accepted [0.23.1 release](https://github.com/JaytonKogeru/huandeng/releases/tag/editor-v0.23.1) contains all three ZIPs and SHA256SUMS.txt. GitHub asset digests and sizes match the local files, and each public asset was downloaded and independently hashed. The publication receipt is root/published-release.json; the release page carries final remote verification and the documentation-commit CI record.

The durable writer, CAS, original read dependencies, locks, journal/recovery, idempotent receipts and Undo remain required. Active-content isolation does not remove legitimate scientific SVG functionality. Optional human proposal review does not replace ordinary authorized preview/apply.
