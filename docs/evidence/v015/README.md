# v0.15 synthetic desktop evidence

All images are captured from the exact packaged runtime built from clean source `100659c513161356413eb9ef3707f6e772a64897`, built at `2026-11-09T13:00:57.9576537Z`. No private Project content is included.

- [Workspace receipt](workspace-acceptance.json): 12 native checks, no renderer exceptions. Includes real file/menu close, Section grouping/reordering, Notes composition and disk save, hidden-canvas isolation, 6 px thumbnail gaps, two click effects, both playback origins, repeated/pinned occurrences, draft guards and language/sizing checks.
- [Layout/review receipt](review-acceptance.json): 11 existing native checks, no renderer exceptions. Covers full layout preview/save, exact receipt/history review, stale request handling, scope, pinned artwork, setup/report distinction and CLI/MCP operation review.
- [Interface walkthrough](../../UI-WALKTHROUGH-V015.md): selected Edit/Browser/Notes/animation/review screenshots. Additional two-click screenshots show actual rendered effect progression; they are not generated video.

The harness records and acknowledges actual native guard dialog options; it does not test physical pointer-menu appearance. Composition uses Chromium IME events rather than a physical Windows candidate popup. New browser pin coverage verifies identity/notes and artwork count; the prior layout/review harness also checks its pinned baseline. A distinct live-artwork mutation in the new browser remains a coverage extension. Narrow editing with all side panels open leaves a small fitted canvas; close a side panel for detailed layout work.
