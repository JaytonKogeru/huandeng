# HUANDENG Editor 0.23.0 — validation record

Date: 2026-11-12.

**The final source checks, security probes, performance regression, packaged Windows smoke test and native workflow acceptance passed.** This record covers the implementation checks, the identified earlier candidates, the final clean Official package and the actual installed delivery. The final clean tagged Official archive, real installation and client checks are recorded separately below. Remote publication and hosted CI are verified against their GitHub records rather than inferred from a local test.

The work followed [the independent audit](AUDIT-NEXT-PHASE-2026-11-12.md) and [the accepted upgrade specification](SPEC-NEXT-PHASE-2026-11-12.md). The retained implementation uses PPTD, stable page identities, Main Slides, live/pinned Presentations and the shared durable writer.

Evidence references such as **[S1]** resolve to the repository-relative paths in the final section. The ignored `.verification/` evidence is retained locally; those paths are not public download links. This document contains no capability values, executable attack probes, private absolute directories or research content.

## 1. Final source and focused gates

| Gate | Observed final result | Evidence |
| --- | --- | --- |
| Complete unit run | **1,528 total; 1,527 passed; 0 failed; 1 expected skip**, 143.31 s. All 387 reported suites passed. | [S1] |
| Repository Biome check | Exit 0, 3.12 s; final root formatting also exited 0. | [S1] |
| Core TypeScript check | Final checked execution exited 0; no diagnostics. | [S2] |
| Authentication and service contracts | 49/49 passed, no skipped tests. | [S2] |
| Final Git/static-service boundary regression | 24/24 passed, including Windows current-directory executable substitution. | [S2] |
| Plugin discovery contracts | 4/4 passed. | [S2] |
| Writer, recovery, lock, proposal, checkpoint, browser-document and resource regression | 148/148 passed, no skipped tests, 9.96 s. | [P1] |
| Real browser security proof | Static and Vite service modes passed; no recorded browser errors. | [S3] |
| Final real-browser performance/consistency run | Passed, 42.59 s. | [P1] |
| Final same-fixture backend run | Passed, 69.91 s. | [P1] |
| Packaged Windows smoke, candidate 2 | 9/9 passed. | [D1] |
| Native upgrade workflow, candidate 2 | 9/9 passed, 54.52 s; no recorded UI errors. | [D2] |
| Clean Official Windows science smoke | 9/9 passed against final source `a27b920`; Electron 45.3.1 / runtime Node 24.22.2. | [D3] |
| Clean Official native upgrade workflows | 9/9 passed against final source `a27b920`; errors array empty. | [D4] |
| Complete Official-copy install, repair and uninstall | 6/6 checks passed; each actual bundled script exited 0. | [I1] |

Focused suites overlap the complete unit run; their counts must not be added to the 1,528 total. The single skip is the existing POSIX execute-bit hook test, `does not treat a non-executable hook file as an enabled hook`. Its source explicitly uses `it.skipIf(process.platform === 'win32')`; it is not a failed or silently omitted Windows acceptance gate. [S1]

The final complete run supersedes earlier concurrent-run failures. The real PNG rasterization test now has a specific 15 s allowance for browser/encoder startup; no suite-wide timeout was relaxed. A bounded retry handles unavailable Windows lock ports in the test fixture. Neither adjustment bypasses a product assertion. [S1, P1]

## 2. Security acceptance

### Local capabilities and client lifecycle

Anonymous requests to each of `/session`, `/current`, `/project`, `/history`, `/selection`, `/events`, `/activity/events` and `/proposals` were denied in both static and Vite modes. The browser proof exercised actual request headers and destinations rather than assuming how navigation, iframe, object, image and fetch requests would be classified. [S3]

A fresh browser obtained its UI capability through a one-use launch exchange. The launch fragment was removed from the address, refresh retained the legitimate session, a closed session was not inherited by a fresh tab, a new launch succeeded, and a service restart rejected the old capability while accepting the newly issued one. Legitimate UI private requests recorded zero failures. The contract suites also covered wrong or expired credentials, resource scope, method/revision constraints and discovery-record rejection. [S2, S3]

Protocol 2 discovery rejects remote, stale, mismatched and old-protocol records. Explicit bad installation paths do not silently fall back, a uniquely selected Project is pinned, and ambiguous multiple Projects require selection. The relocated packaged CLI and MCP clients authenticated to the intended synthetic Project. [S2, D1]

### SVG isolation and scientific rendering

The proof covered eight combinations of service mode, file/embedded SVG source and original/preview route. In each combination, top-level navigation, iframe and object probes produced **no script execution and no project write**. A resource response may legitimately return HTTP 200 while its document remains sandboxed; the pass criterion was isolation and absence of effects, not a blanket claim that every resource request returns 403. [S3]

The compatibility fixture included clip paths, masks, filters, styles and an embedded WOFF2 font. Both original and preview images decoded and were pixel-identical to the data-image reference in both service modes. This positive control accompanied the malicious-resource negative cases. [S3]

The final native workflow also attempted to navigate the trusted Editor window to a private API/resource document. The shell refused the navigation and retained the trusted Editor. The negative case was placed last in the automation because a deliberately cancelled navigation otherwise left a Playwright navigation barrier; the final 9/9 run passed without a product-source change for that harness issue. [D2]

### Git, publisher and capture boundaries

Git invocation resolves a verified absolute executable and disables project-controlled fsmonitor execution. The final regression includes a real Windows same-name executable in the working directory; it did not replace the intended Git executable. Normal checkpoint behavior, dirty-worktree handling and deferral to required hooks/signing remained covered. The fix does not rewrite the user's global Git configuration or bypass their normal commit requirements. [S2]

The hidden publisher produced a one-slide PPTX of 263,986 bytes, copied it byte-for-byte to the share target, and stopped. A separate capture produced a 329,720-byte PNG while two attempted selection-write POSTs were denied and the source remained unchanged. These checks exercised the intended narrow export/capture capabilities rather than giving the hidden renderer ordinary writer authority. [S4]

## 3. Performance acceptance

The before/after runs used the same local machine, original fixture generator and operation sequences: 8/80 pages, 64 objects per page, 401 SVG files including a standalone 4 MiB resource, and 200 valid writer-generated history records. Timing runs disabled counters; filesystem/hash/clone counters were collected in separate probes. Browser, backend and export workloads were serialized for the final measured windows. [P0, P1]

Values below are **p50 / p95 in milliseconds**. The p95 is the observed nearest-rank sample, not a production tail-latency guarantee.

| Operation | Samples | Baseline | Final source |
| --- | ---: | ---: | ---: |
| 8-page commit | 20 | 109.26 / 284.33 | 91.93 / 102.25 |
| 80-page commit | 20 | 358.08 / 440.02 | **222.00 / 236.65** |
| 80-page authoritative no-change refresh | 10 | 169.38 / 257.15 | 138.22 / 166.58 |
| Agent preview + apply, 80 pages | 10 | 652.73 / 729.01 | **399.75 / 423.66** |
| 200 history summaries | 10 | 143.62 / 197.49 | **31.19 / 143.67** |
| 4 MiB conditional original request | 20 | 9.61 / 11.51 | 2.71 / 18.89 |
| Delete key to DOM removal | 10 | 87.35 / 93.00 | **75.65 / 89.70** |
| Delete key to two animation frames | 10 | 158.80 / 271.00 | 153.00 / 174.40 |
| Delete key to observed persisted bytes | 10 | 391.25 / 447.40 | **294.65 / 320.90** |

The 80-page commit median decreased 38.00%; Agent preview plus apply decreased 38.76%; history-summary median decreased 78.28%. Input feedback and durable-save observations are reported separately. [P1]

### Reduced work and retained checks

Three actual Windows self-save probes each made 85 page-file reads during the writer transaction and exactly one additional read to verify the persisted bytes: **86 total, replacing 165**. Their watcher callbacks took 4.59, 3.52 and 2.89 ms. An unrelated auxiliary file caused zero document reads. Same-size/restored-mtime edits, atomic replacement, an external write within the self-save debounce, and referenced-resource changes still reached authoritative refresh and appeared in the document. [P1]

Windows emits parent-directory events during an atomic page save. The final fix merges a directory echo only when all recorded written children in that same batch match the committed bytes and the persisted directory generation also matches. A directory signature alone is never proof of child content. Directory-only events, roots/overflow, changed siblings, uncertain mappings and generation mismatches retain full validation; there is no time-based ignore window. [P1]

The 80-page commit retained its complete authoritative page scan. Its counter probe changed stat calls from 652 to 329, realpath calls from 814 to 491 and createHash calls from 1,145 to 504. Nine structuredClone calls remained, but clone time fell from approximately 39.28 to 1.92 ms. Preparation fell from 171.94 to 40.59 ms; authoritative load remained 143.05 to 143.40 ms and durable persistence 24.29 to 24.65 ms. The benefit came primarily from removing duplicate preparation. [P1]

After initial connection the real browser used 20 `/changes` responses and zero full `/current` responses. Median change payload was 23,274.5 bytes, with response.json p50/p95 of 0.85/3.70 ms. Two initial `/session` responses still carried a full snapshot. A two-page delta across interleaved commits reconstructed the exact authoritative document and used 36,176 bytes versus 1,211,420 bytes for the full snapshot, a 97.01% reduction. Transport-only capability/protocol fields were excluded from document equality. [P1]

Twenty timed conditional requests and one counter probe left the 4 MiB resource's sourceReads at 1, with 21 version-cache hits. Warm history-summary queries avoided record rereads/hashes while still enumerating and validating file signatures. Bounded caches and pagination did not remove corrupt-history detection, undo information or source-resource ownership. [P1]

### Limits and non-improvements

The final conditional-resource p95 was 18.89 ms, above the baseline 11.51 ms; one final sample reached 38.40 ms. Fresh 8-page Store median increased from 141.05 to 166.12 ms; reopening with 201 history records increased from 1,219.27 to 1,502.50 ms; full 80-page snapshot cloning changed from 32.29 to 33.48 ms. These results remain in the evidence and are not represented as gains. [P1]

The OS cache was not cleared. Fresh-Store measurements used the same Node process and recently written fixtures, so they are neither process-cold nor OS-cold. Existing applications and free-memory differences limit cross-run attribution. Memory samples include retained benchmark data and GC variation; they establish workload footprint, not absence of a long-running leak. Two animation frames are a renderer observation, not a display/compositor measurement. [P0, P1]

## 4. Packaged Windows and native workflows

Candidate 2 identifies product version **0.23.0**, Electron **45.3.1** and bundled Node **24.22.2**. Its package was relocated to a path containing spaces and Chinese characters, with independent synthetic Projects and runtime state. All nine smoke checks passed. [D1]

| User task | Accepted behavior |
| --- | --- |
| Open a relocated Project | Native package opened the self-contained Project; protocol 2 clients authenticated and anonymous session reads were denied. |
| Edit and save | Native keyboard editing reached durable bytes; Undo and Redo succeeded. |
| Use an Agent | Packaged CLI preview/apply retained idempotency; Agent setup resolved the relocated package and selected Project; bundled MCP stdio read that exact Project. |
| Render science content | Formula, native chart, PNG and file/data SVG with clips, masks, filters and embedded font rendered. |
| Export | PDF and PPTX succeeded; structural checks retained editable Office math and the chart workbook. |
| Create a Project | Cancelling created no partial directory; the optional practice Project contained three editable slides and original media. |
| Close and reopen | A normal close/reopen retained saved page content, notes and original assets. |

The separate final native upgrade workflow passed all nine checks: Home theme broadcast; cancellation and actual entry display; practice creation; blank creation and window-layout sharing across two Projects; real overlapping external-write conflict; recoverable discarded draft; actual-slide proposal review and fresh preview for an independent subset; restart persistence; and native private-document navigation refusal. The conflict check preserved unrelated remote fields. Restoring a discarded draft restored the local work for review; it did not silently save over the newer document. [D2]

The final Official package was independently built from `a27b92083ecedaeaca3c5258102b3fbaeea9de93` with the matching annotated `editor-v0.23.0` tag. Its marker records `sourceDirty=false`, channel `release` and build time `2026-11-12T07:09:54.311Z`. That exact EXE separately passed the nine Windows science smoke checks and all nine native upgrade workflow checks; the combined checked process exited 0 after 106.99 s. The recorded runtime was Electron 45.3.1 with Node 24.22.2; the build-host Node recorded in the marker is 22.21.0. [D3, D4]

The first real default installation revealed a PowerShell single-item-array conversion that joined the Start Menu and Desktop paths. The follow-up runtime-source commit fixes that one installation line and adds a regression through the actual script with only filesystem/shortcut writes mocked. The old code failed the new check; the fixed installation contract passed 6/6, and both real default shortcuts were then read back correctly. Product rendering and writer code were unchanged. [I2]

A separate first B-source smoke run hit a Playwright race when the expected Cancel action closed its own modal before the click promise settled. The validation-only correction waits for the close event and accepts that precise closed-target exception only after the modal has closed. It additionally requires the original Editor and canvas to remain available and the cancelled Project directory to remain absent. The corrected harness passed against the same unmodified Official EXE. This test-only change belongs to the delivery commit; it does not change the runtime's source identity. The initial failed result remains retained. [D3, I2]

A complete copy of the Official package then ran its actual install, repair and uninstall scripts against a unique isolated HKCU registration subtree and shortcut directory. All 6,398 manifest files, totaling 498,932,304 bytes, matched before the test; the content manifest itself is the 6,399th file. Repair corrected a deliberately damaged shortcut. Removal deleted 6,397 unchanged owned files, including the real EXE, and retained the modified `INSTALL.md` and extra synthetic user file byte-for-byte. The other default ProgId, UserChoice and OpenWith entry were preserved. The original Official package was fully rehashed afterwards and remained unchanged. Six checks passed; the observed execution exited 0 after 223.65 s. The earlier C1-copy result remains a distinct historical record. [I1]

These automated New Project checks supplied a test-owned directory to the folder-selection boundary. They do not claim that every Windows shell dialog variation was manually exercised.

## 5. Actual PowerPoint compatibility

The recorded synthetic science PPTX was opened by **Microsoft PowerPoint 16.0**, read-only, with `OpenAndRepair=false`. It contained one slide and one native chart. The observed shapes included the title, equation, native chart, file SVG, embedded SVG, PNG and a native shape. Source bytes were unchanged; the run began and ended with zero open presentations. [O1]

PowerPoint exported a 128,003-byte PNG, and the resulting pixels were inspected. The record retains both the source and PNG hashes. This is actual Office acceptance of the identified scientific export fixture, separately from package smoke and XML inspection; it is not an implied Office result from the hosted Windows CI runner. [O1]

## 6. Preserved safety and product contracts

- Fresh authoritative loading, page/global CAS, read dependencies, the writer lock, durable journaling, interrupted-save recovery and idempotent receipts remain in the ordinary write path. Optimistic UI feedback is not a durable-save receipt.
- Preview does not mutate the document. Nested groups, shared-style inputs, old snapshots, history.before/after and failed preparation remained isolated in regression tests.
- Delta application verifies the epoch and exact base version, carries explicit removals and the target page order, and applies one consistent target state. Stale/evicted cursors and epoch changes fall back to a full snapshot.
- Conflict rebase uses the explicitly reviewed latest page/metadata revisions and a normal CAS transaction. Overlapping fields need an explicit choice; missing objects or shared-component conflicts cannot be forced. A second conflict keeps the draft.
- Pending proposals are optional. Ordinary authorized Agent work can still use preview/apply. Human acceptance uses the UI capability and a bound approval receipt; an Agent-provided actor label is not approval. A subset is re-previewed, and a truncated visual review cannot be accepted as if hidden pages had been inspected.
- Reviewed proposals bind the before/after visual resource baseline. Actual page, manifest, metadata and asset bytes are checked before journal creation in the same writer queue. An external resource replacement before watcher delivery or after preparation rejects the stale review without changing page bytes or creating a pending journal.
- Main Slides remain the source collection. Live/pinned Presentations, Story, notes, original assets, named versions and Undo/Redo remain product contracts. The six frozen example editions and pre-existing research changes were outside the upgrade's edit scope.
- Safety, performance and release probes used synthetic Projects. Real research Projects were not writable test targets. The separate actual upgrade changed the owned installation registrations, restored the user's existing Project tabs and preserved existing Windows application choices as recorded below.

These boundaries are supported by the full and focused suites plus the native and security evidence; they do not assert a universal absence of defects in every untested workload. [S1–S4, P1, D1, D2]

## 7. Release provenance at this record

| Item | Recorded status |
| --- | --- |
| Delivered Official runtime | 0.23.0 from `a27b92083ecedaeaca3c5258102b3fbaeea9de93`; its Windows science smoke and native upgrade workflow each passed 9/9. |
| Earlier candidate source marker | `e456d6f676007c24d348d924b2500ba7950daeab`, identifying the base revision recorded by the implementation-worktree builds. It is not proof that the upgrade was already committed at that revision. |
| Final clean source commit and release tag | `a27b92083ecedaeaca3c5258102b3fbaeea9de93`, annotated `editor-v0.23.0`; Official marker records `sourceDirty=false` and channel `release`. Plugins retain source `92dbeef3976e868d8e8e2eebaac77766706745cc`; the complete plugin tree is identical at both commits. |
| Official archive, content manifest and SHA-256 | Three complete archives were checked entry-by-entry against their clean sources. Exact archive bytes and SHA-256 are recorded in [RELEASE-V023](RELEASE-V023.md). Content-manifest SHA-256: `3ca15512f1287a4e83915c8b0eeff835665dcc321d495fb64571b97eb797b57a`. |
| Installation/repair/uninstall of the official package | Actual bundled scripts passed the complete-Official-copy acceptance described above; each process exited 0. Current-user delivery is recorded separately below. |
| Actual installed version | Normal Desktop shortcut launch verified 0.23.0 and restored the four existing Project tabs; Codex/Claude same-name inventories and DeepSeek live bundle are 0.23.0. |
| Remote publication | [Versioned release](https://github.com/JaytonKogeru/huandeng/releases/tag/editor-v0.23.0) and [hosted CI records](https://github.com/JaytonKogeru/huandeng/actions/workflows/ci.yml); their observed remote results are recorded separately from these local checks. |
| Signing and npm publication | Official metadata and Windows signature readback are unsigned; no signing credential, supplier purchase or npm publication forms part of these results. |

The final marker, executable product/version information, complete package and all three archives were read back. Runtime and plugin provenance remain explicit: the installer follow-up changes the runtime commit, while the identical plugin tree retains its earlier source identity. [I2]

### Current-user and native client delivery

The actual default installer created separate Start Menu and Desktop shortcuts, registered the new PPTD command and updated the Agent runtime pointer. The old 0.22 window closed normally without force; the existing Desktop shortcut launched the final 0.23 executable. Four existing tabs were visibly restored. The open-Project list, tab state and all 11 recorded entry hashes were unchanged. The four original tracked edits also matched their original audit-baseline bytes and hashes. [I2]

Codex and Claude each retained one enabled same-name HUANDENG 0.23.0 entry. Every file in each 25-file installed cache matched the distribution. Both installed-cache doctors verified protocol 2, 24 tools and the exact synthetic Project; these checks do not claim a new model-authoring task in those clients. DeepSeek Harness loaded the existing bundle identity at live 0.23.0; its default standard launcher and a separate actual Host conversation both returned the expected synthetic context and selection. The Host task was restricted to those two read-only calls. Account, model, permission and existing-conversation state were preserved. [I2, H1]

The scheduled publisher changed only the runtime paths inside its Action. The trigger, principal, settings, registration information, working directory and configuration bytes were unchanged. No manual trigger was used; the retained task later ran naturally and returned Windows task result 0. The science fixture above supplies the distinct export-content acceptance. The temporary clean source checkout was retired after its evidence and archives were retained. [I2]

### Hosted Windows path-alias correction

The first hosted runs for [main](https://github.com/JaytonKogeru/huandeng/actions/runs/43177381104) and [the runtime tag](https://github.com/JaytonKogeru/huandeng/actions/runs/43177381477) both passed the complete Ubuntu core job. Both Windows jobs stopped at native contracts: 13 passed and three plugin-discovery assertions failed before packaging or native smoke ran. The Windows runner's temporary directory used an 8.3 path alias; discovery correctly returned the canonical filesystem path, while the fixture expected the alias spelling. [R1]

A real Windows short-path fixture reproduced the same three failures against the old test. Canonicalizing the fixture root made all four discovery tests pass; the complete native contract suite then passed 16/16 and Biome passed. The production discovery code and all strict assertions remain unchanged. The later main workflow verifies this corrected fixture together with the remaining Windows gates. Its observed result is linked from the release record; the original failed runs remain part of the history. [R1]

This test correction does not move the published runtime tag or replace the accepted runtime and plugin archives. All four published assets, including the checksum file, were downloaded back and matched their recorded size and SHA-256. [R2]

## 8. Evidence index

All paths below are relative to the repository root. Raw probes and runtime credentials are excluded from public commits and release packages.

| Reference | Retained evidence |
| --- | --- |
| S1 | `.verification/implementation-20261112/root/final-source-checks.json`; `.verification/implementation-20261112/root/final-unit.json`; Windows skip definition in `packages/core/src/pptd/git.test.ts` |
| S2 | `.verification/implementation-20261112/security/auth-vitest.json`; `final-boundary-vitest.json`; `plugin-discovery.log`; `core-tsc.log`; `git-boundary-biome.log` in the same directory |
| S3 | `.verification/implementation-20261112/security/browser-proof.json` |
| S4 | `.verification/implementation-20261112/security/publisher-capture-proof.json` |
| P0 | `.verification/independent-audit-20261112/performance/summary.json` and its referenced original raw samples |
| P1 | `.verification/implementation-20261112/performance/PERFORMANCE_VALIDATION.md`; `summary.json`; `backend-comparison.json`; `browser-comparison.json`; `phase-comparison.json`; `initial-regression.json`; `initial-regression-summary.json` in the same directory |
| P1 backend raw run | `.verification/implementation-20261112/performance/runs/2026-11-12T06-29-48.131Z/backend.json` |
| P1 browser raw run | `.verification/implementation-20261112/performance/browser-2026-11-12T06-28-41.599Z/browser.json` and `normal-view.png` |
| D1 | `.verification/windows-release-a49f0525-ba24-4589-8ba4-8c8a58f218c7/result.json` |
| D2 | `.verification/upgrade-workflows-107831c8-a9f7-4357-9686-c8e0562feb43/report.json` and the screenshots in that directory |
| O1 | `.verification/windows-release-016f3c2c-de50-46f4-b91c-9b883b665676/science-office-result.json` and `science-office.png` |
| D3 | `.verification/implementation-20261112/release/official-windows/result.json`, science exports and PNG evidence |
| D4 | `.verification/implementation-20261112/release/official-upgrade/report.json` and eight PNGs |
| I1 | `.verification/implementation-20261112/official-installer-a27b920-mwd7k8nq-c1a219641c/result.json`, `execution.json` and script logs |
| I2 | `.verification/implementation-20261112/release/official-delivery.json`; `first-b-smoke-close-race-result.json`, `protected-final.json` and `worktree-retirement.json` in the same directory; `.verification/implementation-20261112/root/source-commit-installer-fix.json` and `installer-fix-biome.log` |
| H1 | `.verification/implementation-20261112/deepseek/live-upgrade.json`; `mcp-final-proof.json`; `native-host-proof.json` and its official trace screenshots |
| R1 | `.verification/implementation-20261112/release/ci-native-path-failure.json`; `ci-native-alias-before.json` and `ci-native-alias-after.json` with their logs |
| R2 | `.verification/implementation-20261112/root/published-release.json` and its downloaded release assets |
