# v0.16 synthetic acceptance evidence

These screenshots and sanitized receipts come from the standalone Windows package built from clean source `1f7dfaab8910a41a27023b6ef1ca96f0aac66d5f` at `2026-11-09T22:49:41.0398632Z`. They contain synthetic fixtures, not private project content. Editor/plugin 0.16.0, Electron 38.7.2, core 2.3.1.

- `workspace-checks.json`: 13 checks, including unified views, panel preferences, actual native close paths, IME/drafts, repeated/pinned occurrences, real animation click steps and both languages at wide/light and narrow/dark sizes.
- `design-checks.json`: 6 checks, including no-write target preview, exact apply/Undo, stale reference/target handling, live committed-event refresh and saved-versus-projected review evidence. A real transaction is held through request interception to inspect unsaved artwork, then released to verify acknowledgement and Undo.
- `regression-checks.json`: 11 retained visual/layout/review and CLI/stdio checks.

All 30 checks passed with zero renderer exceptions. The acceptance driver correction in `646c1e8` awaits held request continuations before removing interception; it does not change the packaged runtime. The first extended-probe attempt failed at that cleanup boundary after capturing both projected-state screens; its local diagnostic is retained and is not counted as a passing run.

Physical IME candidate-window interaction and compositor presentation timing are not claimed. Screens demonstrate tested controls and scope, not a subjective aesthetic or native Office export certification. Private benchmark copies and their raw reports remain outside Git; the separately sanitized performance summary contains only counts, timings and runtime identities.
