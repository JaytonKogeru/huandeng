# Empty slide start

## Audit

A newly created project opens a blank page without a next step. The user must already know the text tool, page Story inspector and Agent connection entry. The text inspector also exposes two English-only dynamic position messages in Chinese mode.

## Specification

- Show a compact, non-exported action row above an empty, editable Main slide: add a title, set page intent, connect an Agent.
- Reuse the existing Story inspector and connection dialog. Adding a title uses the document writer and records the semantic title role so Outline and search can find it.
- Re-read the page after flushing pending edits and require its revision before title insertion. Do not add a second title when another client has filled the page.
- Hide the row on populated pages, pinned versions, presentation occurrences, read-only pages, active insertion tools and animation workspaces.
- Localize UI labels only; authored text is never translated when the interface language changes.

## Acceptance

Component checks cover live empty pages, populated pages, read-only mode, pinned versions and presentation occurrences. Title geometry checks cover wide, square and portrait pages, and rendering checks confirm the guidance is absent from the page renderer. The existing locale coverage test verifies both position labels and interpolation.

Verified: focused unit tests (3 files, 11 tests), core TypeScript check, and Biome on the affected files. Native desktop creation and live app restart are outside this patch's verification.

The native New Project dialog already describes creation of a same-name folder. A live final-path preview would need a dedicated creation surface; this change does not add a second confirmation dialog.
