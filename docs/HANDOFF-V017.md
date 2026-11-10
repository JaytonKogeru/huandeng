# Editor 0.17.0 acceptance and delivery

Accepted runtime source: `8ec86f5c48175c50cb40a222739ea41c83e83672`. Standalone package built at `2026-11-10T00:14:17.8502518Z`, clean source, Editor/plugin 0.17.0, Electron 38.7.2, core 2.3.1. Core has a pending patch changeset; no npm publication.

## Acceptance

- Full unit project: 115 files, 1,248 tests passed and one skipped.
- Eight real Chromium interaction tests passed: shared hidden-sidebar Project draft/portal, member previews/discard, history preview races, failed filter changes, mutation failure release, composition and viewport residency.
- Core typecheck, repository Biome, and eight plugin configuration/discovery tests passed.
- The exact standalone package passed all 15 native workspace checks, with zero renderer exceptions. Sections were renamed, re-anchored in draft, discarded, saved and undone. History recorded/restored a selected page while blocking navigation during a delayed write; unrelated pages were unchanged. Fixed-version occurrences remained read-only. Both interface languages ran at 1600×1000 light and 1040×800 dark sizes. Existing animation steps, presentation origins, notes composition, file tabs, native leave guards and independent sidebar preferences also passed.
- [Sanitized native receipt](evidence/v017/workspace-checks.json) and eight synthetic screenshots are committed. Private projects, native restoration output, account files and raw receipts remain outside Git.

The independent whole-branch review found no Critical or Important issue and identified two UI state issues as Minor. The author treated them as required completion fixes: a stale running warning after successful history writes, and old operation rows displayed under the named-version filter after a failed load. Both received failing regressions before fixes; the final browser, full unit and exact-package native runs passed. The latter could otherwise mislead a restoration choice even though page/version identity stayed correct.

This release does not claim new performance measurements, behavior below 1040 pixels, native Office parity, physical IME popup testing, or an actual model authoring task. Existing uncertain-write request-ID/CAS behavior remains; the new tests cover delayed native writes and rejected browser writes, not a new uncertain-response protocol. Pre-existing malformed Project metadata can still fail route parsing before the central panel error surface. Narrow section pages may require scrolling to reach member previews.

## Delivery

Installed at `D:/_Proj/Huandeng/dist/HUANDENG-win32-x64/HUANDENG Editor.exe`. All 29,289 staged files matched the candidate. The previous editor closed normally and is preserved at `D:/_Proj/Huandeng/dist/HUANDENG-v0161-backup-20261110`; older backups remain untouched. Rollback means closing normally, preserving the new package separately and restoring this old package, without replacing projects or preferences.

After launch, the installed native accessibility tree showed both restored Project tabs and all six workspace controls. The active Project and interface language matched the pre-install preferences. All 128 recorded project-source file hashes remained unchanged after launch and read-only bridge checks, as did the unrelated dirty main-checkout fixture. Both installed Projects passed the bridge doctor with 21 tools and operation-review support. Private delivery receipts are under `%LOCALAPPDATA%/Huandeng/upgrades/0.17.0-20261110`.

Codex and Claude Code inventories report enabled 0.17.0 installations. Other settings and catalogs were compared with fresh backups and preserved. All 21 local package files match source. DeepSeek launcher/configuration paths were updated and verified; model profiles were not changed. The account plugin's four updated files match read-back, its 18-file inventory is intact, and its App binding and private audience are unchanged. Release `pluginrel_6af2621fa67481919e0af86e6413e5be`: [HUANDENG private plugin](https://chatgpt.com/plugins/plugins_6af0650a3a3c8191930513288c66ea4f). Existing conversations may need a new chat or client restart; installed configuration and bridge discovery are separate from a verified model task.

## Decisions and boundaries

1. Keep one route owner and shared Project draft; implement the coupled work inline with one independent final review. Cost: no separate implementer for each surface.
2. Use PowerShell/Node evidence helpers and retain this plan's isolated verification artifacts for recovery. Cost: manual ledger work and retained disk space.
3. Give History a peer tab, with contextual entries from Browse. It addresses one page over time, while Sections addresses grouping. Cost: one additional primary tab.
4. Continue the already-authorized install/plugin/main-tag delivery rather than ask again. Changes remain reviewable and the prior package is retained. Cost: the chosen UI may need adjustment after use.
5. The ChatGPT advisory bridge was unavailable; no project question was submitted or result invented. Use code/tests and the independent final reviewer. Cost: no ChatGPT Chat design advice.
6. Prioritize the two history-state corrections in the single final fix pass. Filter results are bound to their source, and settlement clears only the exact busy warning. Cost: unavailable filter data stays empty rather than exposing stale selectable rows.
7. Verify installation, restoration and plugin read-back separately from source review. Cost: an additional delivery stage; no inferred success.
8. Limit visual acceptance to the tested desktop sizes, preserve existing backend uncertainty handling, and leave pre-existing malformed-metadata route parsing outside this UI change. Costs: smaller layouts, native uncertain-response scenarios and malformed-source repair are not newly covered.

No review minors remain deferred. The working branch and verification artifacts are retained deliberately. This version supersedes v0.16.1's nested Browse/Outline decision. See [spec](SPEC-V017.md), [plan](PLAN-V017.md), and [interface flow](UI-WALKTHROUGH-V017.md).
