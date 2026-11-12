# HUANDENG Editor 0.23.1 — validation record

Date: 2026-11-12.

The clean runtime, actual installation, native Editor workflows, all matching native clients and source/tag CI have passed. The release is public. All four published assets were downloaded back and matched their expected sizes and SHA-256.

## Final accepted source and package

Runtime and plugin source: `82023a5d68dd7bdd3c52e6e0faf89c2c889f16f0`, annotated `editor-v0.23.1`. The final Official build records clean source, release channel, Electron 45.3.1, protocol 2 and build time 2026-11-12T08:17:41.262Z. Windows reads product/file version 0.23.1.0 and NotSigned.

The package contains 6,400 files and 500,096,273 bytes including its content manifest. All 6,399 manifest entries were verified before and after complete-copy installation testing. The Unicode helper is present and its digest agrees with the manifest. All entries in the three distribution ZIPs matched their clean source files.

| Gate | Result |
| --- | --- |
| Original full Windows unit suite, unchanged core implementation | 1,527 passed, 0 failed, 1 existing Windows skip; 1,528 total |
| Source quality | Biome, native contracts and release guards passed before the patch commit; hosted CI also passed core TypeScript and the full unit suite |
| Hosted native contracts | 16/16 passed |
| Hosted desktop unit tests | 68/68 passed |
| Unicode installer contracts | 7/7 passed locally and on hosted English Windows |
| Complete final-package install/repair/uninstall | 6/6, actual checked process exit 0, 274.49 s |
| Final local Windows smoke | 9/9, child exit 0, 49.497 s |
| Final local native upgrade workflows | 9/9, child exit 0, 56.412 s, no recorded UI errors |
| Final native wrapper and preservation | Actual exit 0, 111.04 s; its own applications closed and the existing user process was unchanged |
| Source CI | [43181396102](https://github.com/JaytonKogeru/huandeng/actions/runs/43181396102), both jobs completed/success |
| Official tag CI | [43183022346](https://github.com/JaytonKogeru/huandeng/actions/runs/43183022346), both jobs completed/success |
| Actual Desktop user gesture | Original four tabs and selected Project/canvas/Inspector naturally restored; 11 entry hashes and tab state unchanged |
| Installed Codex / Claude | Same-name 0.23.1 enabled; actual cache digests and 24-tool MCP verified |
| Installed DeepSeek Harness | Same-name live 0.23.1; default 24-tool MCP and exactly two real read-only Host calls passed |
| Synthetic route cleanup | Owned holder/Editor/launcher/MCP exited normally; original four routes and user Editor identity preserved |
| Final local preservation | Original four tracked changes, eleven entry hashes, open-Project list and four tabs unchanged; zero drafts |
| Publication | Four public assets downloaded back; all sizes and SHA-256 match local files and GitHub asset digests |

The full-suite count and focused counts overlap. The original skip is explicitly the existing POSIX execute-bit hook test on Windows. The [0.23 validation record](VALIDATION-V023.md) retains the original security, writer, resource, browser, performance and actual PowerPoint evidence. This patch does not relabel those earlier measurements as new benchmarks.

## Reproduced installer defect and correction

The [d61f440 Windows job](https://github.com/JaytonKogeru/huandeng/actions/runs/43178726765/job/131049189708) passed native and desktop tests, then failed while WScript.Shell assigned a Chinese shortcut target on English Windows. The earlier discovery-fixture short-path alias issue had already been corrected.

A local probe with ANSI code page 936 saved/read ASCII and Chinese targets, but existing Arabic and emoji targets failed with HRESULT 0x80070057. The old production installer failed on that fixture, and the corrected production installer passed. System locale was not changed. Existing WScript ASCII/Chinese links were also read and saved through the new helper, then read back compatibly through WScript.

Installation and uninstall share the Unicode IShellLinkW implementation, with native IPersistFile persistence and explicit wide-string marshaling. Locally owned COM objects are released in finally. Ownership reads use the stored raw target without Resolve. Packaging copies the helper before content-manifest generation. Independent ABI and deletion-ownership reviews found no blocking issue.

The seven actual contracts cover default shortcut selection, Chinese/Arabic/emoji paths and metadata, repeated repair, old-installation replacement protection, owned-file removal with user-data preservation, and malformed-manifest rejection before deletion. Default-location checks intercept the write boundary; explicit isolated destinations exercise actual COM. Both real current-user shortcuts retained their original hashes during the contract test.

The [first patch Windows job](https://github.com/JaytonKogeru/huandeng/actions/runs/43180601949/job/131055338093) independently passed all seven checks with ANSI code page 1252. It then encountered a distinct CI script-encoding problem before the packager executed.

## CI encoding and native test execution

Windows PowerShell 5.1 decoded the runner-generated UTF-8 inline script using code page 1252. A literal Chinese directory introduced a smart quote in the decoded source, producing a missing-string-terminator error. The workflow now constructs the same Chinese directory from code points in ASCII script source. It retains PowerShell 5.1 and actual Unicode packaging. A local parser regression reproduced the old error and verified the corrected parse and identical output directory.

The first local 82023a native attempt passed four checks, then exceeded the existing 15-second screenshot limit. Its checked execution exited 1 after 47.38 s. Installation and archival work were running in the same period; this timing does not establish the timeout's cause.

After those tasks finished, one serial run used the same Official package, original assertions and original timeouts in a new evidence directory. Both native groups passed 9/9. A programmatic comparison confirms that execution scripts differed from their source only by exact repository/evidence locations and the scientific fixture import. Both failed and successful attempts, raw stacks and script hashes remain retained.

The final local exports were PDF 212,117 bytes and PPTX 241,654 bytes. Native checks retained editable Office math and chart workbook data, scientific file/data SVG, clips, masks, filters and fonts. The science Editor and proposal-review screenshots were independently inspected. Hosted source and Official tag runs also completed both native groups and artifact upload.

## Complete-package installation and actual user delivery

A complete copied package was tested in directories containing Chinese, Arabic and emoji. Actual bundled install, repair, repeated repair and uninstall each exited 0. Uninstall removed 6,398 unchanged owned files, including the EXE and helper, plus its manifest and owned registrations/shortcut. Modified INSTALL.md and an added synthetic user file retained their hashes; other default/UserChoice/OpenWith values remained. The unique registry subtree was removed. Source/copy/source-after aggregates matched across all 6,399 manifest entries.

Actual current-user installation updated the two original shortcuts, PPTD command and runtime pointer. The old window closed normally without force. An initial background PowerShell launch/UIA activation showed the restored tab strip with blank content until the current tab was clicked. That observation was retained rather than accepted as the final visual proof.

The final check closed that window normally, displayed the Desktop and used a native mouse double-click on the existing HUANDENG Editor shortcut. Without a tab click, the app naturally restored the original fourth selected Project, directory, canvas and Inspector. Fresh pixels were inspected. All 11 entry hashes, four open Projects and the complete tab state remained unchanged; draft-file counts were zero before/after, and no document edits were performed.

Codex retained 51 plugin entries and Claude retained three. Each has one enabled same-name 0.23.1 HUANDENG entry; all unrelated entries and Claude's user scope remain. Each actual installed cache matched 25 distribution files. Both installed launchers returned protocol 2, 24 tools and the exact synthetic deck. Their receipts correctly retain modelTaskVerified=false.

DeepSeek Harness used the running Desktop's official Plugins page to replace and enable the same-name 0.23.1 bundle. The live version and running component were observed. Default MCP discovered the final runtime without an override and exposed 24 tools. A new independent Host conversation made exactly two actual calls, context and selection read, against the intended synthetic deck and page. The official tool traces were inspected, and all five synthetic source-file hashes remained unchanged. Account, model and permission settings and existing conversations were untouched.

Two earlier private MCP checks rejected incorrect verifier assumptions: context pages expose pageId, and the Host launches the CLI with its own process.execPath. The verifier was corrected against the actual protocol/source and exact final CLI path. Both failed records remain; no product code or assertion about the selected runtime/deck/page was relaxed.

After the Host checks, the owned fixture closed normally. Its holder, Editor, launcher and MCP processes all exited without force. The four original Project route fingerprints and actual user Editor identity were unchanged.

The scheduled publisher changed only three runtime paths inside its Action. Its trigger, principal, settings, registration information, working directory and configuration bytes were preserved. No manual publishing run was triggered.

## Final cleanup and publication

The final local aggregate records local-delivery-accepted with an empty pending list. The temporary clean build checkout was retired. Git's initial filename-length cleanup error remains in its receipt; after checking its registration/control files, cleanup removed only that exact owned directory using the extended Windows path. Stable distributions, failed/successful evidence and the actual user Editor were retained. Final preservation checks again matched the original four tracked-file hashes, eleven Project entry hashes, open-Project list and complete four-tab state, with zero drafts.

The public [0.23.1 release](https://github.com/JaytonKogeru/huandeng/releases/tag/editor-v0.23.1) contains three ZIPs and SHA256SUMS.txt. Each uploaded asset's GitHub digest and size matched the frozen local files. All four were downloaded after publication and independently hashed with matching results. The first attempt queried the uploaded draft through its tag and received 404; the same unique draft was then read and published by release ID. No release or asset was recreated. The original failed attempt and successful checked process exit remain recorded.

The release page carries the final remote verification and documentation-commit CI record. Later documentation commits do not change the accepted executable/plugin source or either published runtime tag.

## Evidence

All paths below are relative to .verification/implementation-20261112/patch-0231/ unless stated otherwise. Raw evidence and runtime credentials stay outside public source and release archives.

| Area | Retained record |
| --- | --- |
| Installer source regression | release/installer-contract.json; installer-execution.json; unicode-production-red-green.json |
| Original WScript negative probe | ../release/unicode-shortcut-probe.json |
| CI encoding regression | root/ci-encoding-red-green.json |
| Final build and all-file identity | release/clean-build-execution.json; artifact-identities.json |
| Archive checks | release/editor-archive.json; local-plugin-archive.json; deepseek-plugin-archive.json; archive-execution.json |
| Complete copied package | i-5f7b527ca17e/result.json and execution.json |
| First native attempt | native-82023a5d-mwda0ozm/windows/result.json and execution.json |
| Final native acceptance | native-82023a5d-rerun-mwda3hso/windows/result.json; upgrade/report.json; execution.json; terminal-observation.json; harness-relocation-proof.json and screenshots |
| Actual user entry | release/normal-user-upgrade.json; desktop-gesture-editor.png |
| Native clients | release/native-clients-comparison.json; codex-installed-digests.json; claude-installed-digests.json; codex-installed-doctor.json; claude-installed-doctor.json |
| DeepSeek native Host | deepseek/live-upgrade.json; mcp-final-proof.json; native-host-proof.json and official tool-trace screenshots |
| Synthetic route cleanup | deepseek/native-route-cleanup-proof.json; release/installed-interop-final/shutdown-proof.json |
| Source/tag CI | root/tag-published.json; final native directory/github-ci-run.json and github-ci-jobs.json |
| Final local delivery and preservation | release/official-delivery.json, including retirement/preservation receipts and receiptPaths |
| Public release and downloads | root/publication-stage.json; published-release.json; published-release-metadata.json |

The published 0.23.0 tag and archive identities are retained. The earlier unpublished 862c84de candidate was archived before the final clean build; it was not installed or published. Exact final distribution identities appear in [RELEASE-V0231](RELEASE-V0231.md).
