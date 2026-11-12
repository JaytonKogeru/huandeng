# HUANDENG Editor 0.23.0

Release candidate, 2026-11-12. Builds on [0.22.2](RELEASE-V0222.md).

Status: implementation and focused checks are complete in several work packages; integrated security, UI, performance and packaged-Windows acceptance are still being consolidated. This document is a release draft. A version number is not evidence that a package has been published or installed.

## What changes

This iteration follows the [independent audit](AUDIT-NEXT-PHASE-2026-11-12.md) and [upgrade specification](SPEC-NEXT-PHASE-2026-11-12.md). It keeps PPTD, stable page identities, Main Slides, live/pinned Presentations and the shared writer.

- **Local service authentication:** protocol 2 separates Agent, launcher, UI, capture and export capabilities. Anonymous HTTP requests cannot obtain a session. CLI/MCP still bind to the selected Project through local discovery. Clients must upgrade together.
- **External content isolation:** SVG responses, navigation, browser resource tickets and export/capture authorization are being validated together. Git discovery disables project-controlled fsmonitor execution while retaining normal hook and signing requirements.
- **Fewer repeated operations:** the implementation targets redundant watcher refresh, duplicate transaction asset validation, snapshot work and history-list reads. Final measured changes will be recorded below; no project-wide speedup is claimed from a single timing.
- **Clearer workflows:** native New Project names its parent folder and final entry, with an optional separate three-page practice example. Window layout migration, conflict review and optional proposal review are part of this milestone. Ordinary authorized Agent edits continue through preview/apply and receipt review.
- **Windows delivery:** Electron is pinned to 45.3.1. The executable carries HUANDENG product metadata. Portable packages include current-user install/repair/uninstall entry points, a source/toolchain marker, a content digest manifest and installation instructions.
- **Smaller deployment graph:** the desktop's server dependencies come from its built CLI import graph. Browser-only dependency copies are excluded; the compiled browser editor is retained. Playwright, KaTeX and scientific export dependencies remain. Original licenses and notices for the core production dependency closure are copied separately before pruning.
- **Publication guard:** product workspaces are private. The inherited npm publication command now stops with an explicit product-policy error. Editor/plugin metadata is updated by one version tool; upstream npm versioning is not repurposed.

## Focused validation completed

These results are from the implementation checkout on Windows, before the final integrated build:

| Check | Observed result |
| --- | --- |
| Desktop unit tests | 7 files, 68 tests passed |
| Explicit desktop/plugin Node contracts and initial release contracts | 15 tests passed |
| Installation, repair and removal contracts | 5 checks passed in an isolated HKCU test branch |
| Product version consistency | Four product metadata files updated together from 0.22.2 to 0.23.0 |
| EXE product metadata | Isolated copy of Electron successfully branded; Windows VersionInfo readback matched HUANDENG |
| Initial release-script formatting | 13 selected files checked successfully |
| Windows workflow and smoke syntax | Workflow YAML parsed; smoke script syntax accepted |

The installation checks exercise Unicode/space paths, preserve an existing default application and protected UserChoice, prevent an old installation from unregistering a replacement, retain user Projects and modified application files, and reject a traversing content manifest before deletion. They do not alter the user's installed Editor or file associations.

## Final release acceptance

The release owner will replace this table with actual integrated results before publication.

| Gate | Final result |
| --- | --- |
| Core typecheck, complete unit suite and relevant browser tests | Pending final integration |
| Protocol 2 handshake and security negative cases | Pending final integration |
| Native workflow, conflict and proposal review | Pending final integration |
| Packaged Windows relocation, CLI/MCP, Undo/Redo and reopen | Pending final package |
| Packaged science SVG/PNG, chart, formula, font, PDF and PPTX | Pending final package |
| Performance before/after samples | Pending final measured report |
| Clean tagged source revision | Pending release commit and tag |
| Expanded package bytes / files / ZIP bytes | Pending final package |
| ZIP SHA-256 | Pending final archive |
| Published assets and installed version | Not yet published or installed |

The Windows CI job runs from a checkout and creates its own synthetic Projects. It packages into a path containing spaces and Chinese characters, exercises the native Editor and bundled clients, and uploads evidence and checksums. The OS folder picker is supplied a test-owned folder in the automated New Project check; this does not replace a manual native-dialog check. No Office automation result is implied by the hosted runner.

## Installation and compatibility

Extract the complete portable ZIP to a new folder. Use the bundled Install-Huandeng.cmd to register the current user's shortcuts and Open with entry. Running it again repairs those registrations; running it from the new version updates them to the new path. An existing Windows default is retained.

The bundled Uninstall-Huandeng.cmd removes only this installation's owned registrations, shortcuts and unchanged files listed in its content manifest. User Projects, preferences, added files and modified application files remain. An old copy cannot unregister a newer copy. Full details are in [Windows installation](WINDOWS-INSTALL.md).

Protocol 2 deliberately rejects old discovery records. Upgrade the matching bundled plugin and reopen the selected Project. RunAsNode remains enabled because desktop service, publisher and Agent setup still use it. Package metadata reports signing as unsigned; no signing credential, vendor purchase or npm publication was performed in this iteration.

The six accepted example editions and pre-existing research changes are outside this release's edit scope. Source attribution, original media, named page versions, compare-and-swap, idempotent receipts, atomic save/recovery and Undo remain acceptance requirements.

## Runtime reference

Electron 45.3.1 was the supported stable patch selected from the [official releases](https://releases.electronjs.org/) on 2026-11-12. The [official support schedule](https://releases.electronjs.org/schedule) records the supported lines; the former Electron 38 line had ended support.
