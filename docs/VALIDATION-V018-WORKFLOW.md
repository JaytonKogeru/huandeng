# v0.18 workflow validation

Observed on 2026-11-10, before full Editor installation and release acceptance.

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

After the candidate checks, the project owner authorized the existing private account plugin update. The guarded update succeeded at 0.18.0 with its original USER/PRIVATE scope and App binding. All 20 text files read back exactly match the submitted archive and content-manifest hashes; no file was missing or truncated. The current host's huandeng-story skill reader returned the identical final Story SHA-256. The personal account inventory is exhausted and contains only one HUANDENG account plugin. Native adapters remain untouched. The second supplied local code-plugin reference cannot be managed by the App uninstall surface and is absent from this managed runtime's installed marketplace inventory, so a cleared duplicate picker is not claimed. Exact private metadata is retained in .verification/v018-account-release.json.
