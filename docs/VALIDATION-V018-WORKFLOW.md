# v0.18 workflow validation

Observed on 2026-11-10. The sections retain their checkpoint order; the final section records the clean installed release and actual desktop acceptance.

## Executed checks

- Six focused Vitest files: 30 tests passed. Covers normalized type sizes, low-resolution sampling, threshold overrides, optional dividers, background exceptions, vector/contain/crop behavior, no document mutation, linked/escaping source rejection, real HTTP presentation scope, invalid queries, MCP routing, Project initialization and desktop creation.
- Native plugin configure/discovery Node tests: 8 passed. Unicode/space paths, explicit invalid routing, separate DSH skill provider and verified Project discovery remain intact.
- Core TypeScript check and Biome on 16 workflow code files: passed.
- Core tsdown build: passed, with existing virtual-module externalization warnings.
- Compiled CLI: init created a complete Project; check parsed one 960×540 blank page with no diagnostics; repeat init rejected the target and preserved its manifest SHA-256.

## Candidate package

The allowlisted 0.18.0 local candidate has 24 files, including production-design.md, asset-evidence.md and content-manifest.json, with no private Project files. Story skill SHA-256: b3985d0e0ac763058d1c9d503d1f57e9a8d8aab9c5ebf98d13e6302854109737.

External trials receive an independent candidate path and record the skill/tool surface actually loaded. Reading new guidance alone is not installed Editor acceptance.

## Combined release acceptance

Real UI quality/divider actions, complete visual review, PDF/Office inspection, installed Editor identity, native/account plugin hashes and publication are checked in the combined release. Account/native release has not occurred at this checkpoint.

## Final source and native distribution gates

The final source run includes the defect discovered by the independent Claude trial. Vitest passed 127 files with 1,292 tests passed and one existing platform skip in 105.30 seconds (`--maxWorkers 2`). Core TypeScript, full-repository Biome (850 files), the tsdown/production Editor build and eight Node plugin tests passed. Native Claude CLI validation passed for both the staged plugin and its marketplace. Existing virtual-module externalization build warnings remained nonfatal.

The first unrestricted unit run exposed a missing Background locale key, an operation-review fixture probing the child path instead of the actual Project root, and timing-sensitive tests under high worker load. Background was translated and the fixture now probes its real root; the final full run used two workers and passed. The failed logs remain in .verification alongside the successful run. No production lock behavior was relaxed.

The Claude regression was reproduced with normal table text including pages/, media/, .huandeng/ and Exports/ plus a real image asset. Both new tests failed against the prior collector, including the reported Asset is not a file or exceeds 64 MiB error. The collector now reads only semantic src/url fields; all 18 asset/workspace tests passed. A true image src pointing to a directory still rejects. The regression preserves authored source data and exact binary bytes.

Final source, local and account Story SHA-256 is `f09f2bf2a49bfc62bc89e76fca53c5ef3d25ee08f810d51b6285d6160cdee990`. The local package has 24 files and the account package 21; their shared design and evidence references match byte for byte. Archive CRC and all manifest hashes passed. The account overlay has 20 text files; its omitted icon matches the existing account package. Current account metadata and App binding match the prepared update exactly except version. These are staged checks, not account publication.

Final guide changes explicitly preserve originals and earlier crops needed by operation history, preflight actual client capabilities, permit preloading exact authorized assets through the selected writer when native copying is unavailable, and serialize render/export per Project. The existing busy error is already translated through the UI; no new queue was added.

Raw local receipts: v018-final-typecheck.log, v018-final-biome.log, v018-full-unit-with-asset-fix.log, v018-final-build.log, v018-final-plugin-tests.log, v018-asset-regression-red.log, v018-asset-regression-green.log and v018-final-plugin-artifacts.json under .verification. The public design rationale is [DESIGN-V018](DESIGN-V018.md); see [UI acceptance](VALIDATION-V018-UI.md) for the separately inspected states.

## Runnable Editor candidate

The standard Package-Huandeng.ps1 pipeline rebuilt the candidate and passed both staging and relocated portability verification. The package contains product/plugin 0.18.0, core 2.3.1 and Electron 38.7.2. Its marker is baseline `376e6b4a5a32aff4919701427da47929dba8c7e5`, sourceDirty=true and builtAt `2026-11-10T09:08:31.9353176Z`. This is a concrete integration candidate, not the clean release or installed app.

The candidate executable's own runtime then passed safe init, overwrite rejection with unchanged manifest hash, automatic guidance loading, preview/apply, read-only quality diagnostics, exact 0.24 image sampling, a real 1920x1080 PNG containing the original folder-table strings, and the 22-tool MCP doctor. The resulting page bytes remained unchanged by quality/render. The packaged Story hash matched the final source manifest. The server exited normally through its shutdown IPC.

The runtime Story guide hash is `b65eb6be627fb5006b10617aecbdcbb1ee0d196e2527a60b82f73d4380953050`; it is a separate resource from the packaged Story skill. Exact receipts are .verification/v018-final-package.log, v018-final-package-smoke.log and v018-package-smoke.json. The build is under dist/HUANDENG-v018-candidate. No global installation, native client update, account upload, git commit/tag or remote push occurred in this workflow stage.

## Account release and host read-back

After the candidate checks, the project owner authorized the existing private account plugin update. The guarded update succeeded at 0.18.0 with its original USER/PRIVATE scope and App binding. All 20 text files read back exactly match the submitted archive and content-manifest hashes; no file was missing or truncated. The current host's huandeng-story skill reader returned the identical final Story SHA-256. The personal account inventory is exhausted and contains only one HUANDENG account plugin. Native adapters were untouched at this account-update checkpoint; their subsequent installation is recorded below. The second supplied local code-plugin reference cannot be managed by the App uninstall surface and is absent from this managed runtime's installed marketplace inventory, so a cleared duplicate picker is not claimed. Exact private metadata is retained in .verification/v018-account-release.json.

## Clean installed release acceptance

The release was rebuilt from clean source commit `35dfe649d450d22a0e4e3b70661be52c67eb9f7a`. The retained package marker reports `sourceDirty=false`, product/plugin 0.18.0, core 2.3.1, Electron 38.7.2 and build time `2026-11-10T09:26:30.7136963Z`. Staging and relocated portability verification passed. The clean versioned directory is `HUANDENG-v0.18.0-win32-x64`; it is separate from the previously running package.

Installation registered that retained executable in current-user Desktop/Start Menu shortcuts and the PPTD open command. The agent runtime pointer also targets its application directory. The existing ordinary-profile Editor remained running throughout; installation did not close its private projects or replace its package. Until that existing session is closed normally, a new ordinary-profile launch can be routed to the older process by single-instance handling. The isolated acceptance below proves the new executable independently.

| Native route | Observed installation and connection evidence |
| --- | --- |
| Codex | Fresh CLI inventory reports huandeng@huandeng-local 0.18.0 installed and enabled. Its installed cache matches all 24 packaged files. The doctor launched from that installed adapter initializes the selected writer with 22 tools. |
| Claude Code | Fresh CLI inventory reports the same version enabled at user scope. Its installed cache matches all 24 files and its doctor initializes the same 22-tool writer. Unrelated plugin versions and enabled states are retained. |
| DeepSeek Harness | A versioned explicit patch contains both the MCP launcher and skills provider. The actual Desktop engine accepts that patch in a no-model headless config-merge preflight. The adapter doctor connects to the same writer with 22 tools. A dedicated Start Menu launcher selects the patch; the ordinary desktop profile is not globally rewritten. |

Every doctor reports plugin 0.18.0, `designAuditSupported=true`, the final Story skill hash `f09f2bf2a49bfc62bc89e76fca53c5ef3d25ee08f810d51b6285d6160cdee990` and runtime Story guide hash `b65eb6be627fb5006b10617aecbdcbb1ee0d196e2527a60b82f73d4380953050`. DSH's native config merge proves configuration composition; adapter doctor evidence separately proves MCP connectivity. It is not a claim that a new DSH model task was run during installation.

The actual installed EXE was launched with isolated user data and runtime directories, using copies of the public English and Chinese examples. Its application path resolved to the new package. The English project rendered its Editor DOM and opened the design dialog, returning one slide, zero observations and one background. A second native EXE launch with the Chinese entry routed into that same isolated workspace as its second active project. There were no renderer errors, the application exited normally with code 0, all owned acceptance processes ended, and fingerprints confirmed both original examples and both copies retained their authored contents.

Two additional hidden-window screenshot attempts could not complete compositor capture. Their harness receipts were retained; the completed installed-app gate covers actual binary identity, rendered DOM, native routing and connection behavior, without claiming a native pixel screenshot. Visual evidence remains in the separately reviewed UI and deck acceptance.

The supported same-name marketplace source change used each native client's remove/add commands. Claude explicitly uninstalled the previous HUANDENG plugin during marketplace removal, then installed 0.18.0; this local stdio plugin declares no user configuration or auth fields. This was native version replacement, not ChatGPT picker deduplication. Earlier versioned distributions and the original trial candidate were retained.

The public, path-normalized receipt is [installed-release-acceptance.json](evidence/v018/installed-release-acceptance.json). Exact workstation receipts remain in .verification/v018-installation.json, v018-installed-acceptance.json, v018-native-cli-listings.json and v018-dsh-native-config.json. No commit, tag or push was performed by this installation phase.

## Final documentation and example gate

After adding the public introduction collection and final receipts, repository Biome passed across 953 files. Portable authored data keeps its original bytes through a collection-scoped formatter setting and Git attributes; JSON parsing/linting remains active. Delivery-only changes leave packages, plugins, scripts and changesets byte-identical to the clean runtime commit. Final archive hashes are consolidated in evidence/v018/release-manifest.json and SHA256SUMS.txt.
