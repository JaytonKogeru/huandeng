# HUANDENG Editor 0.19.0 validation

This record covers project-folder entry, folder identification, assistant setup evidence, and new-project authoring guidance. The final Windows package was built from clean runtime commit `cadaecbf9cf1661e28464fe68b7b866f68fecabe`; its embedded marker records `sourceDirty: false`. Compact receipts retain the earlier dirty development candidate and superseded-build history; their reproducible full application trees have been removed. The completed installation transition is recorded below.

## Behavior verified

A project can be opened through its `.pptd` file or its folder. Exactly one immediate manifest resolves; zero or several produce an error. A name such as `Study.huandeng` is optional and uses the same rules as an ordinary folder. The canonical manifest remains the tab and writer identity. Invalid explicit launch arguments cannot fall back to another positional candidate.

Folder identification preserves existing customization. A failed attempt removes only its own files after checking identity and unchanged bytes; a retry succeeds. A real Windows test set the INI's hidden/system attributes, injected a later failure, confirmed cleanup, retried successfully, and verified that the project manifest was unchanged.

The workspace has a visible, keyboard-focusable application-menu button. It opens the existing native menu; File → Identify project folder uses the existing guarded marker action. Actual Windows input verified that a clean folder gets the icon, existing customization remains unchanged, Home disables project-only actions, and the menu labels follow English/Chinese UI locale.

Assistant setup separates explicitly reported client work from actual writer records. Reports remain dated and labeled as reports. Saved records open the existing review by exact operation ID. Configuration, SSE connectivity and a client-supplied name do not establish live authenticated presence.

New-project guidance treats Story as reasoning input, begins with the presentation's mission and audience, uses native tables and coherent prose objects, permits meaningful backgrounds and scientific panels, and maintains corresponding claims and evidence across requested languages. Existing authored project guidance is not migrated.

During restoration and slow project opens, the latest accepted user navigation controls the active view. Clicking the current tab or Home counts as an explicit choice. A project may finish loading in the background; it does not override that later choice. The shell restores keyboard focus only when it already held focus. Regression checks also cover a selected pending project that fails to load.

## Exact-source gates and artifact

| Gate | Result | Source |
| --- | --- | --- |
| Repository formatting/lint check | Exit 0; 1,190 files; 20 informational diagnostics; no fixes | `pnpm check` |
| Focused unit suites including authoring guide | 78 passed in 11 files | Entry/initialization, Desktop launch/marker/locale, assistant setup/evidence, runtime guide |
| Existing shared-writer CAS case | 1 passed; 25 unrelated cases filtered | `packages/core/src/pptd/store.test.ts` |
| Setup browser interactions | 3 passed | `agent-connection-dialog.browser.test.ts` |
| Plugin/native adapter | 18 passed | Discovery, configuration, DeepSeek adapter |
| Core typecheck and production build | Both exit 0 | `packages/core` |
| Exact packaged Windows UI | 8/8 passed; zero renderer errors; normal exit 0 | File/folder entry, canonical reuse, invalid explicit entry, CLI, folder marker, reports/receipts, ambiguity |
| Exact packaged asynchronous navigation | 2/2 passed; normal exit 0 | Delayed Open then another tab or Home |
| Visible native application menu | 4/4 passed; six fixture source/metadata files unchanged; normal exit 0 | Real mouse/keyboard path, native dialogs unstubbed, custom preservation and Home disabled |
| Package portability | Passed before and after staging relocation | `scripts/verify-desktop-package.mjs` |
| ZIP entries read back | All 29,313 files match the package byte for byte | Archive inventory verification |

The final archive is `HUANDENG-Editor-0.19.0-win32-x64.zip` (236,214,422 bytes), with SHA-256 `4a484088a2d5a0c2c08e8234df71330a60c6057e1e5e3cb2a4a77c3404385aad`. The full package-content fingerprint is `23d938dc4520a97e2754934a48131b8eed889961d096333fb3338d0f5ea3e3e5`. Its archive-entry inventory fingerprint is `9323d1327910c0bd32ffef3eab40394dbe29ad81aec2ddb7211da0f6e8c09df7`.

The native run used a separate profile and a synthetic project. Native picker selection was stubbed; the actual buttons, IPC, resolver, writer and packaged renderer executed. Explorer drag gestures and Explorer's final custom-icon pixels were not claimed as observed. Six existing user-owned writer identities and epochs remained unchanged through these tests. A separate four-case test used actual Windows mouse/keyboard input and unstubbed native menus/dialogs. Its first file guard lacked a persisted before-map and did not pass; that result was retained. The same package passed after both fixture writers initialized, with complete before/after and post-close source hashes.

Public receipts: [clean build](evidence/editor-019/clean-build.json), [packaged native gates](evidence/editor-019/packaged-native-gates.json), [archive verification](evidence/editor-019/archive.json), and [visible menu verification](evidence/editor-019/visible-menu.json). They contain no local profile paths, per-window state, connection tokens, or private prompt contents.

## Startup and navigation evidence

The [navigation receipt](evidence/editor-019/navigation-validation.json) separates the confirmed selection race from startup measurement. Earlier probes forced the native window to the foreground before each screenshot, so those images were not passive startup observations. Controlled foreground launches with passive capture passed for Home and six public project copies. No blank-screen repair or startup-speed improvement is claimed. The actual normal-profile installation is checked separately below. Private desktop captures are not published.

## Protected authored files

| File | SHA256 retained |
| --- | --- |
| `examples/huandeng-introduction/claude-en/pages/AVNM.page` | `21f2134a7d402d04ace4a125f22cbc93ac9edd8e5056b7dfc1a0121f86c23260` |
| `tests/fixtures/studio/pages/identities.page` | `fe378a48e57b63f2b9e7286578f68eefe856a381422930a6615f920b02622832` |

## Screenshot provenance

The English and Chinese Home-action crops are 488 × 730 pixels. Report/receipt crops are 1224 × 926 pixels. They were captured from the real Electron renderer at device-pixel ratio 2 and visually inspected. Crops exclude local paths and connection configuration.

The public image set below retains its original clean C1 capture provenance; the same interface behaviors were rerun and visually checked in the final C3 package.

Public capture assets ([provenance and SHA-256 manifest](evidence/editor-019/ui/provenance.json)):

| View | English | Chinese | Pixels |
| --- | --- | --- | --- |
| Home actions | [PNG](evidence/editor-019/ui/folder-actions-en.png) | [PNG](evidence/editor-019/ui/folder-actions-zh.png) | 488 × 730 |
| Reported work / saved receipts | [PNG](evidence/editor-019/ui/reported-work-en.png) | [PNG](evidence/editor-019/ui/reported-work-zh.png) | 1224 × 926 |
| Complete empty Home | — | [PNG](evidence/editor-019/ui/home-zh.png) | 2880 × 1836 |

Final-C3 native menu crops ([provenance](evidence/editor-019/ui/menu-provenance.json)): [English active project](evidence/editor-019/ui/application-menu-en.png) and [Chinese Home with project-only commands disabled](evidence/editor-019/ui/application-menu-zh.png), each 410 × 420 pixels. These are actual Windows desktop crops from a separate synthetic project, using unchanged captured pixels.

The report rows explicitly identify synthetic test reports. A real saved Notes transaction exists only in that synthetic project. These images demonstrate the interface and must not be presented as evidence that Claude Code or DeepSeek performed a real authoring task.

The change adds no heartbeat protocol, section lock, task scheduler, automatic content-to-art handoff, mandatory folder suffix, or global directory double-click association. Existing page CAS remains the concurrency boundary; shared project metadata still needs coordination.

## Installation transition

The final C3 package is installed and verified in the existing application location. The [installation receipt](evidence/editor-019/installation.json) records a normal shutdown, byte-verified package promotion, ordinary-profile relaunch, and restoration of all six tabs, their selected stable slide IDs, the active project and previous maximized state. Page selections were restored through actual tab clicks and exact page-button UI Automation Invoke; automatic selected-page restoration is not claimed. All 1,240 authored source and export files remained unchanged; no unrelated process was stopped. Existing shortcuts, the stable alias, file association and Windows UserChoice were preserved.

An actual foreground launch discovered all six writers after 47.10 seconds; a passive desktop observation showed the complete Editor after 51.98 seconds. This is one observed startup, not a benchmark or a claim of increased startup speed. Whole-desktop images remain private.

Through the visible application menu, File → Identify project folder added icons to `chatgpt-en`, `chatgpt-zh`, `claude-zh` and `deepseek-en`. Existing `claude-en` and `deepseek-zh` icon bytes were preserved. The INI uses a relative `.huandeng\project.ico` resource; folders were not renamed. The Editor and DeepSeek application remain running.

## Owned build cleanup

The [cleanup receipt](evidence/editor-019/cleanup.json) records removal of the clean build checkout, three superseded application trees, two superseded Editor archives and the owned temporary fixture/profile/runtime directories. The current installation, one explicit 0.18 rollback and the single final release ZIP remain. Failed and passed reports, scripts and necessary private screenshots are retained. No user project, authored page, asset, page history, export, live Editor process or DeepSeek profile was removed.
