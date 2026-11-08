# HUANDENG v0.12 validation

Accepted clean runtime: **0.12.0**, source `01780db2871d2eb516fcd7a00ccbcc43f666daa1`, built `2026-11-08T12:59:10.9221682Z`. Client plugin: **0.12.1**. The source commit identifies the clean source used for the accepted build; candidate/installed manifest equality establishes byte identity, and the later documentation/evidence commit does not rebuild the runtime.

## Source and packaged acceptance

| Gate | Observed result |
| --- | --- |
| Focused editor units | 47 tests passed |
| Full unit project | 99 files; 1,096 passed, one platform skip; 1,097 total |
| Client plugin tests | 8 passed on Windows; the same eight also passed on Linux |
| Workspace TypeScript | Five tasks passed |
| Biome | 748 files checked; no remaining error, no final fixes |
| Production core/editor build | Passed |
| Clean desktop packaging | Exit 0, 60.361 seconds; staged and relocated portability checks passed |
| Matching packaged UI | 8/8 groups, 30.866 seconds; exact candidate executable, no development app override |
| Normal lifecycle | Two launches and two normal exits, both code 0 / no signal |
| Renderer errors | None |

The final harness read the candidate build marker on both launches and required identical identity. Its synthetic Project and profile were isolated from the ordinary installation. Development-host acceptance also passed eight groups, but that result is not substituted for packaged acceptance. Previous release UI matrices and performance soaks were not rerun without a new risk requiring them.

| Packaged interaction | Result |
| --- | --- |
| Section 00 and sequential topic numbers expose stable Section IDs | Passed |
| folding and unfolding a later Section preserves its viewport anchor and selected Slide | Passed |
| gap Create Section splits existing Slides with one saved action and Undo/Redo | Passed |
| native thumbnail drag supports the upper half and exact page gaps | Passed |
| dragging near the rail edge scrolls while retaining the actual hidden Section boundary | Passed |
| selection color and highlight preserve other text, semantic bold and native Undo | Passed |
| Ctrl+wheel zooms the canvas, preserves browser scale and leaves Shift scrolling available | Passed |
| normal reopen retains Section IDs, numbering and saved range formatting | Passed |

All seven generated captures were visually inspected. The release retains three reviewed, synthetic screenshots with personal root paths masked at capture. The sanitized [acceptance record](evidence/v012/acceptance.json) omits raw Project paths, generated IDs, session data, native client account details and process logs.

## Installed application

The guarded installation completed against the exact accepted runtime. Installed application files match the candidate manifest, the previous application remains retained, and both product shortcuts identify the installed executable. The existing ordinary profile reopened the current writable Project through the packaged CLI and production frontend. Served frontend bytes matched the installed files, and service-parent/epoch checks confirmed a fresh native process.

Installation took a fresh inventory of current materialized Project files, requested a normal close through the application's existing save guard, and protected the just-closed state. Original Project files and the pre-existing canonical modified fixture remained unchanged by installation. The installer did not force terminate an application, rewrite preferences, restore a historical document baseline, or perform an automatic rollback. Private inventories and detailed receipts remain outside Git.

The installed plugin bridge and the native Codex plugin cache were checked against Editor 0.12: **18 tools, two guide resources, writable verified Project**, read-only protocol doctor passed. This is connection evidence, not a full Codex model editing task.

## Actual authoring and client boundaries

Authorized private authoring passed installed shared-writer prepare, exact proposal preview, apply, complete saved-data comparison, native PDF export, source-preservation checks and independent visual inspection. Private contents, scientific citations tied to that work, page counts, Section structure, IDs, media, screenshots, export hashes and detailed receipts are not repository evidence.

Codex and Claude Code native plugin installations were verified. The official DeepSeek Harness completed a real read-only model task on a fabricated Project with the then-installed Editor 0.11 runtime; its five calls loaded the Story skill, both guides, context and briefing. No full Codex/Claude model authoring task or live second-computer acceptance is claimed. ChatGPT account packaging and verified host availability are recorded separately in [Client delivery](../plugins/huandeng/docs/V012-CLIENT-DELIVERY.md).

## Failures retained and resolved

1. Early implementation checks found type errors in dialog error handling and synthetic test data, plus Biome issues in the new controls. These were corrected before the source freeze; final TypeScript and Biome passed.
2. The first semantic-bold assertion assumed an attribute-free `strong` tag. The harness now checks the actual semantic formatting. A separate real product defect was then found: the saved renderer dropped sanitized color/background styles attached to semantic emphasis tags. Applying already-sanitized styles to those tags fixed saved and reopened output without widening sanitizer permissions. The final packaged color/highlight group verifies the result visually and through saved data.
3. The first full unit run had eight invalid-hook-call failures across four files because a hoisted development install loaded two physical React 19.2.8 instances. A frozen, offline isolated reinstall restored the established single-instance topology. All 16 affected tests then passed, followed by the full 1,096-pass run. No versions, test assertions or application source changed for this environment repair. Production packaging remains independently verified and self-contained.
4. Turbo initially could not find a pnpm subprocess executable. A Corepack shim in ignored verification storage and a process-local PATH supplied the repository's pnpm 10.17.0. No system PATH or source configuration changed; all remaining exact gates passed.
5. A postcheck helper initially decoded a UTF-8 receipt with Windows' default encoding. Explicit UTF-8 reading verified the unchanged successful receipt. The already-passing package and UI gates did not require rerunning.
6. The first installation attempt stopped before closing or replacing the application because the ordinary Chromium window exposed only its native host Pane to Windows accessibility. Its visible Saved state was independently confirmed from the actual window pixels. The private installer records inaccessible renderer text explicitly and retains the unchanged native save/close veto, normal code-zero exit, fresh file inventory and complete package verification. Exact translated Saved/draft labels were also corrected. The accepted staged candidate was reused only after the failed-before-close receipt and all candidate bytes matched; no document or preference restore was used.

Earlier failed logs and receipts remain in local verification storage. Neither isolated checks nor a successful protocol connection replace actual application acceptance.
