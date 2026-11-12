# HUANDENG Editor 0.22.0

Released 2026-11-12. Editor and plugin version: **0.22.0**. The inherited core npm version remains separate. This release implements the [0.22 specification](SPEC-V022.md) and preserves the accepted introduction examples.

[Downloads](https://github.com/JaytonKogeru/huandeng/releases/tag/editor-v0.22.0) | [English guide](../README.md) | [中文说明](../README.zh-CN.md)

## Arrange open projects

Project tabs can be dragged into a new order. Switch between the top strip and a left vertical list from the tab-layout control, View menu or Workspace settings. The left list can collapse to a narrow rail.

Reordering keeps the existing project views and writer services. Order, active project and layout survive a normal restart. Keyboard focus uses the axis appropriate to the layout; Alt+Shift with that axis reorders the focused tab. Saving failures restore the last saved order or layout. Presenting temporarily uses the full window.

## Workspace settings

Settings now groups controls into Workspace, Editing and Fonts. Theme, language, project tabs, panel visibility and Notes dock are in Workspace. Snapping and shortcut help are in Editing. Fonts retains the existing local availability check and preview without losing its state when changing groups.

The dialog keeps its heading and group controls visible while its body scrolls in small windows. A language or desktop preference failure is shown in place.

## Hand over an editable project

In Export, choose **Editable Project (ZIP)** / **可编辑项目（ZIP）**. The scope is the complete saved project, even when the current view is a Presentation.

The archive retains the original entry filename, pages, source media, Story, Sections, Presentations, author instructions and portable named page versions with their archived assets. Unzip it into a folder and open its original `.pptd` entry.

Generated exports, repository data, dependencies, caches and known machine connection or credential files are excluded. The export report identifies the actual exclusions. Local recovery and operation journals remain local. Required missing files, external local dependencies or unsafe paths fail explicitly. This is a portable project archive, not a general backup of every machine file.

The first implementation uses ordinary ZIP with explicit limits of 60,000 files and 3.75 GiB of uncompressed source. Fonts are referenced by name; recipients still need suitable fonts installed. ZIP does not preserve Windows folder decoration attributes or file permissions.

MCP and CLI use the existing export/status/cancel operations with format `zip`. The plugin's Story skill documents the handoff. No extra tool is introduced.

## Distribution and responsiveness

The Windows x64 application retains Electron 38.7.2 and its rendering stack. Packaging removes verified dependency source-map sidecars while preserving executable code, assets, types, licenses and plugin content.

| Installed directory | 0.21 | 0.22 |
| --- | ---: | ---: |
| Size | 655.01 MiB | approximately 595.14 MiB |
| Files | 29,344 | 26,051 |

The installed directory is about 9.1% smaller. Download ZIP sizes are listed on the release. This is still a complete Electron application.

Matched isolated writer measurements using the same full English example found low idle CPU after loading: about 0.13% of one logical core in both versions over 12 seconds. Single startup samples were 2.94 seconds and 4.00 seconds respectively; they do not establish a speedup or a regression. An earlier uncontrolled three-service CPU observation was not reproduced, so this release does not claim to fix it.

Opening Export no longer probes the video encoder until MP4 is selected.

## Validation

- Core typecheck and production build passed. Repository `pnpm check` passed with existing informational diagnostics.
- 74 focused unit tests and 6 browser interaction tests passed across archive export, workspace settings, tabs and package pruning.
- Nine real Electron checks passed with eight isolated projects, including drag/drop, keyboard ordering, layout changes, persistence failure, presentation bounds and restart recovery. No renderer errors were recorded.
- Both staged and relocated desktop packages passed self-contained runtime and plugin verification.
- The actual package exported a complete 28-page project with two Presentations and 154 named versions. All 571 archived files matched after extraction. A fresh writer opened the project and archived version assets, then rendered a 1920 × 1080 page successfully. Prior Exports were excluded.
- English and Chinese README screenshots were captured from the actual 0.22 application using independent copies of the committed examples.

## Open-source release

The existing GitHub repository and history are public. English and Chinese README files cover the workflow, architecture, Editor and agent connections. MIT licensing and upstream notices are retained. GitHub private vulnerability reporting is enabled and verified.

The release provides the Windows application, the portable Claude Code/Codex plugin, and the native DeepSeek Harness plugin. Both plugin forms are built from `plugins/huandeng` in this repository. Source builds remain available; this release's packaged desktop acceptance was performed on Windows x64.
