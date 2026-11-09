# Editor 0.13 — validation

Source, native Office, packaged desktop and installed production checks are distinct. Public evidence uses synthetic Projects; private research data is excluded.

## Source gates

- **82 focused tests across 13 Vitest files pass:** Project tabs, Outline, Activity API/storage, MCP, derived Position rendering, history/checkpoints, Presentation snapshots, formatted export and writer recovery. The history/recovery gate passed 29 tests, including two new legacy-observation and external-reorder position-context regressions. A later native-launch gate passed 20 tests: the existing four Project-tab tests plus 16 new launch-request cases. The 82 total counts distinct focused tests, not repeated runs.
- **5 recovery regressions pass:** rapid fullscreen enter/exit, invalid or destroyed windows, timeout restoration, renderer-loss ownership and pending leave requests, and reload/close recovery.
- **17 publisher regressions pass on Windows and Linux.** The Windows suite crashes a real lock owner, races two new processes and delays one until the new owner is exporting. Only one process publishes; the preceding shared output survives until validated replacement. Six additional regression cases cover content-equivalent ZIP repackaging, every payload (including document properties, media and export reports), entry-name/set changes, CRC/header/descriptor corruption and duplicates, changed source/canonical output, and concurrent saves during equivalence verification.
- **8 portable-client tests pass on Windows.** Explicit routing, discovery and client fragments remain compatible.
- Core TypeScript and production build pass. Biome formatting/checks pass at the source checkpoint.

## Real Electron workspace

The final clean packaged desktop passes all **14 checks**, with a normal code-zero exit and no renderer errors:

1. An actual native second instance opens `--entry value`, including spaces and Unicode, inside the existing workspace.
2. Native `--entry=value` and bare PPTD launches focus existing tabs without restarting their writers.
3. Home returns to either Project while retaining both renderers and services.
4. Recent Projects deduplicate; background IPC remains bound to its sender.
5. Unsaved Story survives Project/Home switches and blocks only its own close.
6. Central file tabs preserve Slides; read-only shortcuts and Ctrl+W behave correctly.
7. An Agent transaction changes its background Project without touching the active Project.
8. Activity reports stay inside their explicitly selected Project.
9. Outline search and folding preserve Slide identity.
10. Pages edits a first-Slide Section through the shared Save/Undo path.
11. Present enters fullscreen with initially hidden, edge-revealed controls.
12. F5 hides the Project strip; Escape closes the presenter and restores the workspace.
13. Closing a background Project destroys only its renderer/service.
14. Normal application close flushes the remaining Project and exits cleanly.

This test found a real F5 focus regression: an asynchronous Slide-selection transition restored focus to the obscured canvas, which consumed Escape. The fix clears that focus intent during presentation, performs presenter focus handoff before paint, and gives presentation cancellation priority. The failing receipts remain local. The first clean package repeated those 12 checks. Its ordinary-profile installation then exposed a separate Windows second-instance parsing failure: Chromium reordered `--entry` and inserted its own switch. No Project source was changed. A positional PPTD open restored both tabs while the source defect was repaired. The final harness adds actual OS processes for `--entry value`, `--entry=value` and bare PPTD paths, including Unicode and spaces. The release/handoff records the final clean build and all 14 checks after acceptance.

An earlier candidate validation attempt stopped when a synthetic writer-lock port was Windows-reserved. Its fixture preflight had canonicalized only the parent and then appended a mixed-case child directory, whereas the writer canonicalizes the complete Project root. The harness now creates and canonicalizes the complete synthetic Project path before its lock-port probe. The same unchanged package then passed all 14 checks. The failed receipt is retained locally; no production lock or permissions were bypassed.

## Native launch handoff

Electron documents that second-instance `argv` can be reordered and recommends `additionalData` when the original arguments matter ([official API](https://www.electronjs.org/docs/latest/api/app#event-second-instance)). The desktop now sends a small validated launch request captured from its original arguments. Its fallback rejects switches as file paths, resolves relative paths using the sender working directory, and queues requests during startup. The harness spawns the exact native executable and confirms the second process exits, the expected Project opens, duplicate launches retain the writer, and structured data reaches the primary process. It does not simulate this with `app.emit`.

## Native PowerPoint

A five-slide synthetic PPTX opened in installed PowerPoint 16.0 with automatic repair disabled. Its native table, six charts with workbook values, group and five equations were read successfully. Table and chart edits saved and reopened; all equations remained. The input remained unchanged, SHA-256:

`142d67ff0aae16455ae57f7efe81b95a97046dd00ab6d1fc1afbfb35acf9d229`

All five Office-rendered pages were visually inspected: table/math, category/combination charts, numeric XY/bubble, pie/area, and native scientific shape presets. This verifies those objects through actual Office editing, beyond ZIP structure checks. It does not certify arbitrary PPTX import/round-trip, font equivalence or animation compatibility.

## Capture and delivery boundaries

Capture the active `WebContentsView` directly. `BrowserWindow.capturePage()` can capture the shell without child views and produce a blank center; those early captures are not visual acceptance evidence. Do not capture the hidden shell during fullscreen. Public evidence uses only selected synthetic screenshots and sanitized receipts.

The packaged publisher also receives an independent two-Project native export check: hidden-page exclusion, retained Notes, unchanged sources, local/shared byte equality, and no-change skips. Installation preserves the preceding application and current Project files; native client/account plugin delivery and real shared-file publication are recorded separately. OneDrive cloud upload completion is not inferred from local file replacement.

## Shared PPTX repackaging

Ordinary Office/OneDrive use exposed another concrete delivery issue: a shared PPTX acquired different ZIP entry timestamps while every uncompressed member remained identical. Comparing only whole-file SHA values repeatedly attempted to replace this still-current open document. The publisher now validates and compares all exact member names and payloads when the saved source and canonical output are unchanged. It records the actual canonical/shared hashes separately, preserves the preceding publication time on a skip, and does not close Office. The six new synthetic cases bring the publisher gate to 17 tests on Windows and Linux. Invalid packages, duplicate entries, any payload or member-set change, and concurrent saves do not pass equivalence. Actual installed-task acceptance is recorded in the handoff.
