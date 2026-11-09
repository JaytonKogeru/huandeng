# HUANDENG Editor 0.16.1

This patch corrects the scope of workspace view controls after the user's review of v0.16.

- **Normal / Browse / Notes page** is the primary view row. 浏览 replaces 章节浏览.
- Browse contains **Thumbnails / Outline**. Outline shows page previews, titles and Story/content summaries in the central workspace. Both representations share search, grouping, selection and ordering controls.
- Changing the primary view preserves the navigation tab, width and collapsed state. It no longer switches the left rail to outline or automatically narrows it in Browse. The selected Browse representation survives a visit to Normal or Notes in the current workspace.
- Notes remains the speaker-script editor. Displaying an outline neither edits notes nor creates a second source of authored text.

Editor and shared plugin are 0.16.1; core remains 2.3.1. The [audit and contract](SPEC-V0161.md), [actual interface](UI-WALKTHROUGH-V0161.md) and [acceptance/handoff](HANDOFF-V0161.md) record the change. No new runtime dependency, document format or writer API is introduced.
