# Editor 0.16 validation

Runtime implementation, independent reviews, exact-package native acceptance and performance probes are complete. The accepted package is installed, both projects are restored, and local/private-account plugin delivery is verified. Performance improvements and remaining scroll costs are distinguished below.

## Source and independent review

Accepted runtime source: `1f7dfaab8910a41a27023b6ef1ca96f0aac66d5f`. Complete unit suite: **115 files passed, 1,247 tests passed, one existing skip**, 98.87 seconds with two workers. Core typecheck and repository Biome (816 files) passed. Four real Chromium viewport/residency tests passed after view integration; the subsequent evidence-scope correction does not change that renderer path. Eight portable-plugin configure/discovery tests passed; the later plugin change is one guidance sentence, and all 21 prepared local files were rehashed against source.

All five task-scoped reviews passed. Final whole-branch review found one important integration defect: local drafts and optimistic artwork inherited saved review evidence. The correction derives projection state from the existing immutable committed/projection data, suppresses the saved-match headline for displayed changes and preserves the actual saved record. Focused tests cover failed/conflicted saves, pending addition/removal, acknowledgement, discard, pinned scope and both languages. Scoped re-review found the defect addressed with no new blocking issue.

One nonblocking test improvement remains: the existing exact-payload uncertain-retry test could explicitly advance metadata-only state before retry. Review confirmed that pending request IDs and payloads bypass the new expectation assembly; no corresponding behavior defect was found.

## Exact package and native workflows

Clean runtime built at `2026-11-09T22:49:41.0398632Z`: Editor/plugin 0.16.0, Electron 38.7.2, core 2.3.1, `sourceDirty: false`. Hoisted packaging and relocation checks passed. Existing experimental TypeScript API and virtual-module build warnings remain; production output succeeded.

The exact package passed **13 workspace checks, 6 design/review checks and 11 retained regression checks**, with zero renderer exceptions. These cover unified views/sidebar width and preferences, native close guards, notes/IME, repeated/pinned occurrences, actual animation click steps, show origins, exact layout/save/review/Undo and CLI/stdio compatibility. A contiguous external edit updated rendered content through `/__pptd/current` without a new renderer `/__pptd/session` request.

The new projected-artwork probe holds a real transaction, verifies the saved object is still present while the displayed object is removed, checks both language explanations, releases the write and verifies stale evidence, then uses UI Undo to recover current evidence. Its first run exposed a test-driver cleanup race: interception removal preceded completion of the released route. Tooling-only commit `646c1e8` awaits that continuation; the complete rerun passed against the same unchanged runtime. The failed diagnostic remains local, not counted as passing evidence.

The actual [synthetic screens and sanitized receipts](evidence/v016/README.md) are retained. Physical Windows IME popup interaction, compositor presentation timing and native Office export appearance are not claimed. Narrow windows retain accessible controls with a smaller fitted canvas.

## Performance

The same method-3 benchmark is used for both old and new packages: fresh process/profile/project copy, background throttling disabled only in owned test webContents, renderer input through DOM condition and two animation frames. OS caches are not cleared; existing applications stay running. Header latency does not measure image decoding. Notes include the intentional 700 ms save debounce. Counts, latency and memory conditions are reported separately.

Two final-package runs per private deck and a 300-page synthetic run passed. All private originals retained their source-file hashes. [Sanitized per-run results](evidence/v016/performance.json) retain source revisions, sample sizes, free-memory conditions, image timing stages and excluded attempts.

| Observed workload | Old package | Final package |
| --- | --- | --- |
| 26 pages: browser renderers after two traversals | 26 | 9 |
| 26 pages: connected DOM nodes at that point | 3,486 | 1,428 |
| 26 pages: startup | 5.10–5.31 s | 4.88–5.05 s |
| 26 pages: per-run median selection | 117–146 ms | 119–134 ms |
| 92 pages: browser renderers after two traversals | 92 | 11 |
| 92 pages: connected DOM nodes at that point | 12,963 | 2,846 |
| 92 pages: startup | 6.55–8.13 s | 7.20–7.65 s |
| 92 pages: per-run median selection | 251–273 ms | 219–224 ms |
| 300-page synthetic: retained cards / renderers after two traversals | Not measured | 300 / 15 |

The synthetic workload has 4,713 text objects, one image and two shapes; startup was 9.14 s, median selection 458 ms and median notes input-to-disk 2.62 s including debounce. It does not represent a 300-page image-heavy deck. The final private runs showed no material startup regression, but no general startup-speed improvement is claimed. Notes save medians were 0.90–1.00 s and 1.38–1.40 s for the two private workloads.

**Remaining performance limit:** residency reduction does not establish uniformly smoother scrolling. The 92-page baseline recorded 9–12 scroll long tasks above the observer threshold; final runs recorded 19–21, with maxima 105–148 ms versus baseline 103–114 ms. The 26-page final runs recorded four versus baseline zero/one. Remounting introduces work during traversal, and the navigation layout also changes available width. These descriptive samples under a busy desktop do not isolate a cause or measure compositor frame delivery. Further mount scheduling/preview reuse and a controlled scroll trace remain follow-up work; this release does not claim to eliminate stutter. Image queue fairness/cancellation are covered by focused tests, while browser priority is advisory and header timing is separate from decode.

Initial pre-correction candidate measurements remain labeled separately; the first small-deck startup was 9.14 s and is not silently pooled with final runs. Method-2 background-throttled samples are excluded. One method-3 baseline startup attempt failed to produce a visible canvas; its unchanged original hashes and private failure receipt are retained, without a root-cause claim. The first 300-page attempt was rejected before the renderer because the generated fixture had null page short codes. The synthetic-only generator/input was corrected, passed packaged CLI validation, and the subsequent complete run passed. Product validation was not weakened.

## Delivery

The canonical Windows installation now contains the accepted clean-source runtime. All 29,288 staged package files matched the candidate; the previous version closed normally and remains in a separate rollback directory. Both project tabs, the active project and interface language were verified after visible launch. All 128 recorded project-source files retained their hashes after launch, and the unrelated dirty repository fixture remained unchanged.

The installed bridge doctor passed for both projects: 21 tools, two guides, writable access and operation-review support. Codex and Claude Code inventories report the enabled local plugin at 0.16.0. Their other configuration was compared with fresh pre-update backups and remained unchanged. DeepSeek launcher/configuration paths were prepared and verified; model profiles were not changed and no model task was run.

The existing private USER account plugin was updated to 0.16.0 and read back. The five intended changed files match the candidate, the 18-file inventory and existing App binding were preserved, and no delivery failures were reported. Existing client conversations may need a new chat or restart to load the new instructions; no hot-reload, model-task, cloud-sync or native Office compatibility claim is inferred from this delivery. The [handoff](HANDOFF-V016.md) records recovery locations and the private plugin link.
