# Editor 0.12.1 handoff

Runtime source: **c82b36885ed125c348b3a5e110aff141f221d515**. Editor version: **0.12.1**. Build time: **2026-11-08T23:57:51.4525420Z**. The source was clean when packaged. Existing portable client plugin version remains **0.12.1**.

**Local implementation, matching-package acceptance and guarded ordinary-profile installation are complete.** The application was left open on the same writable Project. Current files and the unrelated canonical fixture are unchanged; the old application package remains retained. The installed CLI/MCP connection verifies 18 tools and two guides.

## Completed implementation

High-contrast text selection; folded Section card edges with stable viewport; Create Section at existing boundaries and deck end with an atomic new cover; reversible Main Slide visibility; playback and collection export filtering with explicit hidden-slide inclusion. Existing native named Page Versions are verified rather than replaced.

All 1,102 unit tests pass with one existing platform skip, core TypeScript passes, Biome checks 753 files, production build/package checks pass, and the exact package passes seven synthetic UI groups with two normal exits. Independent review found no blocker and separately verified repeated pinned appearances against current visibility in both directions.

## Preserve these contracts

- `metadata.patch` accepts exact boolean `hidden`; nested/invalid writes are rejected. The field is current organization state and survives named artwork restore.
- Main Slide hiding governs all its Presentation appearances. Archived content, Notes and metadata remain immutable; repeated pinned appearances retain their identities.
- Delivery filtering builds a transient snapshot and does not rewrite Main order, Section membership or source bytes. Default PDF/PPTX/MP4 exclude hidden Slides; `includeHidden` / `--include-hidden` explicitly includes them. Direct single-page PNG/MP4 can still render a hidden Slide.
- `page.add.section` is one transaction for new cover plus boundary. The dialog uses the same document-layer boundary logic; existing Section anchors and fixed/member semantics remain intact. Revalidate captured neighbors after flushing drafts and preserve manifest/metadata CAS.
- A folded Section's first-Slide preview and count remain navigable. Folding must not trigger selected-Slide auto-scroll or change delivery order. Card animation respects reduced motion.
- Autosave and journal operations remain separate from named Page Versions. Record explicit milestones before and after accepted page revisions using the native archive.

## Release and operational boundaries

Raw local receipts, native output, installer records and personal Project data stay outside Git. Public evidence is an allowlist of build/test/install outcomes plus visually inspected synthetic screenshots. The canonical unrelated page fixture must remain unchanged. Current-change privacy review does not erase older historical traces.

The source worktree is `D:/_Proj/Huandeng-v0121-20261109`, branch `editor/v0.12.1-authoring`; canonical checkout remains `D:/_Proj/Huandeng`. Preserve the current ordinary profile and private Project. Integration verifies installed bytes, protected current files and the fresh writable service before resuming authoring.

Only origin receives the approved tested milestone, with release/handoff records. Verify actual remote refs after push. Do not push upstream, publish npm, rewrite history or change repository visibility. Documentation-only commits after acceptance do not change the runtime source identity above.
