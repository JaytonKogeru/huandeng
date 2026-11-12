# HUANDENG Editor 0.22.2

Patch release, 2026-11-12. Builds on [0.22.1](RELEASE-V022.md).

This patch fixes a desktop-wide workspace preference that was incorrectly scoped to individual slide projects. Because each project has its own local document-server origin, the previous theme preference could differ between open tabs.

## What changed

- **One interface theme per Editor:** Light / Dark / Follow system now persists in desktop application preferences and broadcasts to all open projects.
- The native title bar, project tab strip, and Home use the same preference, even when the operating system appearance differs.
- Old project-specific theme values can no longer override the desktop preference after switching tabs, opening a project or reloading.
- Theme changes report save failures and do not falsely switch every project when preferences cannot be written.
- The Workspace settings dialog identifies global application settings versus project-local panel settings. Snapping is global, panel sizes and Notes dock remain per-project for now.

No slides, notes, presentations, named versions or research source images were modified in this patch.

## Verified

- Eight real multi-project Electron checks, including simultaneous project origins, Theme/OS mismatch, switching tabs, Follow system, stale localStorage, failed writes, and restart.
- Existing settings browser interaction tests: 4 passed.
- Full core unit suite: 140 test files, 1,488 passed, 1 skipped.
- Core TypeScript check, production build and repository formatting checks passed.
- The remaining UX observations and prioritization are in [the Workspace UX audit](UX-AUDIT-2026-11-12.md).

## Known scope

The local panel layout (widths, visibility, Notes placement) is still saved separately for each project. This patch does not silently reset or migrate it. A future change to a window-global layout requires a migration and cross-tab synchronization design.

Installation: extract the complete Windows ZIP, run HUANDENG Editor.exe, or use `scripts/Install-Huandeng.ps1` to register shortcuts and .pptd associations. Save open projects before replacing the executable. Plugins are repackaged with matching metadata but have no runtime protocol changes.
