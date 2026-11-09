# Editor 0.13 — validation

Source, native Office, packaged desktop and installed production checks are distinct. Public evidence uses synthetic Projects; private research data is excluded.

## Source gates

- **66 focused tests across 12 Vitest files pass:** Project tabs, Outline, Activity API/storage, MCP, derived Position rendering, history/checkpoints, Presentation snapshots, formatted export and writer recovery. The final history/recovery gate passed 29 tests, including two new legacy-observation and external-reorder position-context regressions.
- **5 recovery regressions pass:** rapid fullscreen enter/exit, invalid or destroyed windows, timeout restoration, renderer-loss ownership and pending leave requests, and reload/close recovery.
- **11 publisher regressions pass on Windows and Linux.** The Windows suite crashes a real lock owner, races two new processes and delays one until the new owner is exporting. Only one process publishes; the preceding shared output survives until validated replacement.
- **8 portable-client tests pass on Windows.** Explicit routing, discovery and client fragments remain compatible.
- Core TypeScript and production build pass. Biome formatting/checks pass at the source checkpoint.

## Real Electron workspace

The integrated synthetic desktop journey passes all **12 checks**, with a normal code-zero exit and no renderer errors:

1. Home opens a second Project while retaining the first renderer and service.
2. Recent Projects deduplicate; background IPC remains bound to its sender.
3. Unsaved Story survives Project/Home switches and blocks only its own close.
4. Central file tabs preserve Slides; read-only shortcuts and Ctrl+W behave correctly.
5. An Agent transaction changes its background Project without touching the active Project.
6. Activity reports stay inside their explicitly selected Project.
7. Outline search and folding preserve Slide identity.
8. Pages edits a first-Slide Section through the shared Save/Undo path.
9. Present enters fullscreen with initially hidden, edge-revealed controls.
10. F5 hides the Project strip; Escape closes the presenter and restores the workspace.
11. Closing a background Project destroys only its renderer/service.
12. Normal application close flushes the remaining Project and exits cleanly.

This test found a real F5 focus regression: an asynchronous Slide-selection transition restored focus to the obscured canvas, which consumed Escape. The fix clears that focus intent during presentation, performs presenter focus handoff before paint, and gives presentation cancellation priority. The failing receipts remain local. The exact packaged application must repeat this journey before installation; the release/handoff records its final identity and result.

## Native PowerPoint

A five-slide synthetic PPTX opened in installed PowerPoint 16.0 with automatic repair disabled. Its native table, six charts with workbook values, group and five equations were read successfully. Table and chart edits saved and reopened; all equations remained. The input remained unchanged, SHA-256:

`142d67ff0aae16455ae57f7efe81b95a97046dd00ab6d1fc1afbfb35acf9d229`

All five Office-rendered pages were visually inspected: table/math, category/combination charts, numeric XY/bubble, pie/area, and native scientific shape presets. This verifies those objects through actual Office editing, beyond ZIP structure checks. It does not certify arbitrary PPTX import/round-trip, font equivalence or animation compatibility.

## Capture and delivery boundaries

Capture the active `WebContentsView` directly. `BrowserWindow.capturePage()` can capture the shell without child views and produce a blank center; those early captures are not visual acceptance evidence. Do not capture the hidden shell during fullscreen. Public evidence uses only selected synthetic screenshots and sanitized receipts.

The packaged publisher also receives an independent two-Project native export check: hidden-page exclusion, retained Notes, unchanged sources, local/shared byte equality, and no-change skips. Installation preserves the preceding application and current Project files; native client/account plugin delivery and real shared-file publication are recorded separately. OneDrive cloud upload completion is not inferred from local file replacement.
