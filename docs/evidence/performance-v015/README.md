# 0.15 performance evidence

`summary.json` contains aggregate measurements only. The tested package was built from clean runtime source `100659c513161356413eb9ef3707f6e772a64897`; final delivery source is `07c58c573da60fc841ed7e463272bb244e3ee87d`.

Each private project was copied to an isolated temporary project with a fresh Electron profile and service runtime. Runs 2–4 use renderer-internal event-to-DOM-plus-two-frames timing; exploratory run 1 is excluded from interaction aggregates. Run 4 additionally records reversible notes edits in the copy, file persistence and image-response headers. Original manifests, pages and metadata were hashed before/after every run and remained unchanged. All runs closed their owned application normally.

The executable, original source, copied source, profile and raw reports are local/private. They are intentionally absent here. The two fixtures are identified by size only. Upstream revision metadata describes repositories consulted; it does not mean they were installed, run or benchmarked.

Re-run from the repository root with the existing workspace dependencies:

```powershell
$env:HUANDENG_DESKTOP_EXE = '<absolute installed HUANDENG Editor.exe>'
node scripts/benchmark-workspace-v015.mjs --entry '<absolute deck.pptd>' --output '<absolute private evidence directory>' --label sample-run1 --edit-probe
```

The script makes a new project copy and retains it for inspection. Do not place its output or copies in a tracked directory. Filesystem cache is not flushed, other user applications remain running, and no forced garbage collection is performed. The optional notes probe changes and restores notes only in the copy; it does not exercise scientific content generation or a model task.

Read the [audit](../../AUDIT-V015-PERFORMANCE.md) for interpretation and measurement limits. `passed` means the measurement sequence completed, the original sources were preserved and no renderer exceptions were recorded; it is not a performance-budget pass.
