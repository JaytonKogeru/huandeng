# HUANDENG Editor 0.16.0

This release connects workspace views, large-deck browsing and reviewable title styling.

- **One view entry:** Normal, Outline, Section browser and Notes page control both navigation and the central workspace. Outline retains the editing canvas. Section browser removes the duplicate thumbnail column, retaining Project/Pages/Assets/Files in a narrow strip and restoring saved panel preferences on return.
- **Bounded browsing work:** offscreen cards retain their identities and controls while releasing complex page renderers. Returning renders the current revision. Original image requests take priority over queued previews with bounded fairness, overload handling and cancellation.
- **Less repeated I/O:** contiguous document events read committed state. Initial connection, reconnection, event gaps and changed session epochs retain authoritative refresh; drafts, recovery and uncertain requests retain their safeguards.
- **Preview before matching title style:** capture concrete reference geometry and typography, inspect a full target-page preview, then apply that exact prepared change. Target/theme/context changes invalidate preparation; changed reference captures remain visibly frozen until refreshed.
- **Honest review evidence:** Checks distinguishes matching, stale and absent saved evidence, and explicitly identifies unsaved/pending artwork outside that evidence. A matching revision is not approval. The shared plugin follows the same reference, preview, save, receipt and rendered-inspection workflow.

Editor and plugin are 0.16.0; the core package remains 2.3.1. No npm publication or upstream push is part of this release. The [interface walkthrough](UI-WALKTHROUGH-V016.md) shows actual synthetic screens; [validation](VALIDATION-V016.md) records source, performance and delivery evidence.

Accepted runtime source is `1f7dfaab8910a41a27023b6ef1ca96f0aac66d5f`. Its complete unit run passed 115 files and 1,247 tests with one existing skip. The exact standalone Windows package passed 30 native checks with no renderer exceptions. Whole-branch review identified a projected-artwork evidence defect; the bounded correction and scoped re-review completed before delivery.

After two browser traversals, retained complex renderers fell from 26 to 9 and from 92 to 11 in the measured decks; a 300-page synthetic deck retained 15. Fast traversal still has measurable long tasks, and the 92-page final runs recorded more of them than the baseline. This is a residency improvement, not a claim that all scrolling stutter or startup delays are resolved. The accepted package and 0.16.0 local/private-account plugins are installed; both projects and their source hashes were preserved.

Persistent cross-session caching, delta/compact Agent context, a full reference-design constraint engine and native PowerPoint animation/master parity remain later work. Current-image priority is advisory in the browser; a saturated thumbnail queue can return an explicit retryable response. Startup and image decoding remain separate from browser residency improvements.
