# Editor 0.16.1 acceptance and handoff

Accepted runtime source: `195e77921884b6d9b9950ec0015c15e3380de8bb`. Package built at `2026-11-09T23:34:48.1549413Z`, Editor/plugin 0.16.1, Electron 38.7.2, core 2.3.1, clean source. The package relocation checks passed. The initial packaging command lacked the optional Electron path; packaging then used the cached exact 38.7.2 distribution. This was a tooling-path failure before packaging, not a failed product test.

## Acceptance

- 23 focused unit tests passed: view controls, outline source/notes separation, identity/grouping, input guards and keyboard scope.
- Five real Chromium tests passed: local representation switching with retained search/selection/pins, viewport residency and revision refresh.
- Core typecheck and repository Biome passed. Four portable-client configuration tests passed.
- The exact standalone package passed all 13 workspace checks, with zero renderer exceptions. Checks include navigation width/tab/collapse invariance, remembered Browse representation, real selection/reordering, composition and save guards, permanent Slides/file close behavior, native close handling, animation steps, show origins, repeated/pinned occurrences and both languages at wide/light and narrow/dark sizes.
- The wide and narrow central Outline screenshots were inspected. Only synthetic screenshots and sanitized checks are committed; private project copies and raw receipts remain outside Git.

This targeted patch does not rerun or claim the previous full 1,247-test suite, native Office parity, physical IME popup interaction or a new performance speedup. Both navigation and Browse previews retain their existing viewport release behavior. The restored optional navigation adds its visible thumbnails back to Browse; v0.16's measured total layout/counts must not be presented as new measurements of this layout.

## Product decision

Outline belongs inside Browse because both inspect the whole deck's structure. Notes stays separate because it edits the speaking script. Primary view controls no longer alter the navigation panel. This supersedes v0.16's four-mode/special compact-sidebar contract. Browser representation is remembered in the current workspace, not persisted as a new desktop preference. The cost of retaining navigation is duplicate thumbnails when the user chooses to keep it open; the explicit collapse control is available in every view.

The visible ChatGPT advisory bootstrap did not expose a browser bridge; no question or project content was submitted. Code inspection, focused tests and exact-package native workflows provide the evidence for this correction.

## Delivery

The accepted package is installed at `D:/_Proj/Huandeng/dist/HUANDENG-win32-x64/HUANDENG Editor.exe`. All 29,288 staged files matched the candidate. The previous editor closed normally and is preserved at `D:/_Proj/Huandeng/dist/HUANDENG-v016-backup-20261110`. Earlier backups remain untouched. To roll back, close normally, preserve the current package separately and restore this backup to the canonical directory; do not replace project folders or preferences.

After launch, the native accessibility tree showed the new three-view controls and both restored project tabs. The active project and language matched the pre-install preferences. All 128 recorded project-source file hashes remained unchanged after launch, as did the unrelated dirty repository fixture. Both installed-project bridge doctors passed with 21 tools and operation-review support. Private preferences, hashes and receipts remain in `%LOCALAPPDATA%/Huandeng/upgrades/0.16.1-20261110`.

Local and private-account plugins have been updated to 0.16.1 and read back. Codex and Claude Code inventories report enabled 0.16.1 installations; other settings were compared with fresh backups and preserved. All 21 packaged local files match source. DeepSeek launcher/configuration paths exist and model profiles remain unchanged. The four intended account files match the prepared archive; the 18-file inventory, existing private App binding and audience were preserved. The account release is `pluginrel_6af258ff0a4c8191a3c17fc3a44c0b11`: [private plugin](https://chatgpt.com/plugins/plugins_6af0650a3a3c8191930513288c66ea4f). Existing conversations may require a new chat or client restart; an actual model task is not claimed.
