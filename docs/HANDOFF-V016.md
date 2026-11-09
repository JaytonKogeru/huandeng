# Editor 0.16 handoff

Accepted runtime source: `1f7dfaab8910a41a27023b6ef1ca96f0aac66d5f`. [Validation](VALIDATION-V016.md) records checks and limits; the [walkthrough](UI-WALKTHROUGH-V016.md) shows the interface. The accepted editor is installed, projects are restored, and local/private-account plugin delivery is verified.

## Workflow

Select Project and collection → choose Normal / Outline / Section browser / Notes page → inspect Story, references and source evidence → prepare a bounded visual change → inspect the actual target page → save through the shared writer → review the saved receipt and rendered result → rehearse or inspect the export.

Unsaved and pending artwork is explicitly outside saved review evidence. Current saved-version correspondence does not establish author approval, visual quality, occurrence/pinned context, local fonts or exported Office fidelity. Stable IDs, Main Position and occurrence/version identity remain distinct.

## Execution decisions and tradeoffs

1. Reused the existing isolated workspace and PowerShell/Node review artifacts. This avoids an additional shell dependency; the cost is manual ledger bookkeeping and relocation if the environment changes.
2. Continued the user's established audit/spec/implementation/acceptance/install milestone without another design-approval interruption. Changes remain reviewable and rollbackable if the intended scope was misunderstood.
3. Scoped this release to browser residency, image scheduling, committed-event refresh, concrete title preview and review evidence; full reference extraction and native export parity remain future work. The cost is that those broader capabilities are still unavailable.
4. Retained ignored plan, raw diagnostic and acceptance artifacts for recovery rather than deleting them. The cost is local disk usage; private evidence is not published.
5. The prior ChatGPT Chat advisory bootstrap was unavailable, so no question or project material was sent and no external answer was invented. Native implementation/review supplied the evidence instead; the cost is the absence of that additional advisory perspective.
6. Adopted the user's unified four-mode view model. Browse suppresses duplicate Pages navigation but retains a compact sidebar entry strip; the cost is one explicit click to reopen Project/Assets/Files while browsing.
7. Excluded earlier background-throttled method-2 timing from new comparisons and used identical method-3 settings for baseline/candidate owned test windows. Raw attempts remain retained; ordinary background/compositor latency is not established by these measurements.
8. Enforced explicitly supplied optional manifest/metadata preconditions for plain element patches after reproducing stale acceptance. The cost is stricter conflicts for callers that supply outdated optional expectations; omitted expectations remain compatible.
9. Newly assembled ordinary drafts may use accepted metadata only when touched objects have no component binding in either base or current page. Prepared changes and uncertain pending requests stay frozen. The cost of an uncovered binding transition would be incorrect conflict behavior; focused tests and independent review cover the implemented cases.
10. Corrected the native test driver's interception cleanup ordering after an observed failure. Awaiting actual continuation changes no product behavior or assertion; a wrong correction would leave native acceptance failing, so the complete probe was rerun successfully before installation.
11. Corrected missing short codes only in the generated 300-page synthetic fixture after the document service rejected it. The editor's identity validation remains intact, and the invalid input/failed attempt are retained. The cost of a mistaken diagnosis would be continued failed acceptance; the corrected fixture passed the packaged CLI's validation before the browser probe was rerun.
12. Accepted the measured residency improvement with the observed scroll-long-task tradeoff explicitly recorded. The spec requires bounded rendering and honest measurements, not a guaranteed frame-time target. The cost is that fast repeated scrolling can still stutter; mount scheduling and preview reuse remain follow-up work, and no blanket smoothness claim is made.

The final review's one nonblocking metadata-only retry-test extension remains recorded in validation. Larger reference engines, persistent caches, compact/delta Agent context, project hibernation and native PPTX animation/master parity were explicitly declined from this release's scope. Protocol discovery is separate from running an actual client model task.

## Delivery and recovery

The canonical executable is `D:/_Proj/Huandeng/dist/HUANDENG-win32-x64/HUANDENG Editor.exe`, installed from the accepted source above. The milestone also includes acceptance-driver commit `646c1e8` and final documentation; neither changes the packaged runtime. All 29,288 staged files matched. The previous editor closed normally, and `D:/_Proj/Huandeng/dist/HUANDENG-v015-backup-20261110` retains the previous package for rollback. Earlier backups remain untouched. To roll back, close the editor normally, preserve the current installation separately, then restore that previous package to the canonical directory; do not replace project folders or preference files.

Visible launch restored both project tabs, the selected project and the interface language. All 128 recorded project-source hashes and the unrelated dirty fixture remained unchanged after launch. The installed bridge doctor passed for both projects with 21 tools, two guides, writable access and operation-review support. Private source hashes, preferences, installation and client receipts remain under `%LOCALAPPDATA%/Huandeng/upgrades/0.16.0-20261110`; private benchmark diagnostics remain under `%LOCALAPPDATA%/Huandeng/audits/performance-v016-20261110`. Only synthetic screens and sanitized benchmark results are committed.

Codex and Claude Code report the enabled local plugin at 0.16.0. Its durable source is `%LOCALAPPDATA%/Huandeng/client-plugins/0.16.0/huandeng`; all 21 allowlisted files match source. The native client commands updated their plugin installations, preserving other settings. DeepSeek launcher/configuration paths were checked without changing model profiles. Start a new client conversation or restart to load the updated instructions when required; an actual model task and hot reload were not verified.

The [existing private account plugin](https://chatgpt.com/plugins/plugins_6af0650a3a3c8191930513288c66ea4f) now has release `pluginrel_6af25344a5a081918dc6ff5613d86a73`, version 0.16.0. Read-back confirmed the five intended files, unchanged 18-file inventory, private USER scope and existing App binding. Local/account pre-update configuration and source backups are retained in the private delivery directory.
