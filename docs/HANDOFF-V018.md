# v0.18 handoff

> Historical 0.18 record. The author rejected the introduction slides after this record. The current introduction/design contract is [INTRODUCTION-REWORK.md](INTRODUCTION-REWORK.md); current validation and handoff are in [INTRODUCTION-DELIVERY.md](INTRODUCTION-DELIVERY.md). This record retains its historical technical measurements and does not establish author acceptance. Editor 0.18.0 is unchanged; current AI guidance is plugin 0.18.2.

Date: 2026-11-10. Status: accepted source, clean installed release and four complete introduction editions. Delivery milestone: [editor-v0.18.0](https://github.com/JaytonKogeru/huandeng/releases/tag/editor-v0.18.0). Verify the actual tag and release when determining remote publication state.

## Read first

[Workflow audit](AUDIT-V018-WORKFLOW.md), [shared spec](SPEC-V018.md), [workflow frame](FRAME-V018-WORKFLOW.md), [design rationale](DESIGN-V018.md), [UI acceptance](VALIDATION-V018-UI.md), [workflow validation](VALIDATION-V018-WORKFLOW.md), [slide acceptance](VALIDATION-V018-SLIDES.md), [native-client trials](VALIDATION-V018-NATIVE-TRIALS.md), [release notes](RELEASE-V018.md) and [distribution record](RELEASE-V018-WORKFLOW.md).

The process is Audit → Spec → Frame → Implement → Validate → Release. Editor and plugin version is 0.18.0; core npm remains 2.3.1 with pending changesets. No npm publication, upstream push, repository visibility change or history rewrite is included.

## Source and package identity

Runtime source is the clean commit `35dfe649d450d22a0e4e3b70661be52c67eb9f7a`. The retained binary records `sourceDirty=false`, Electron 38.7.2 and build time `2026-11-10T09:26:30.7136963Z`. Later delivery changes add only documentation and public introduction examples; they do not rebuild or change the runtime.

The milestone branch is `editor/v0.18-design-workflow`, based on `376e6b4`. The canonical checkout's unrelated modified `tests/fixtures/studio/pages/identities.page` is outside this work and must remain untouched. Push only the accepted origin milestone. Artifact identity is recorded in [release-manifest.json](evidence/v018/release-manifest.json).

## Implemented contract

- One shared writer and the exact Project-root AGENTS.md serve GUI, CLI and MCP. Read-only design audit is available through the Editor, HTTP, CLI quality and huandeng_design_audit.
- The audit records source revisions, language-adjustable type thresholds, backgrounds, opt-in title-only dividers and bounded raster sampling. Results navigate to the relevant page and become stale after changes. It never rewrites artwork.
- CLI init and desktop creation share a safe initializer. Init refuses an existing target, including an empty directory.
- page.add.sectionId inserts a title-only first Slide into an existing Section while retaining its identity, Story and membership in one undoable transaction.
- Neutral UI hierarchy keeps the six workspaces; actual image dimensions are visible in Assets. Chinese typography is quieter, with smaller default titles and less heavy chrome.
- Export reads semantic src/url asset references. Plain table text such as media/ no longer triggers erroneous asset reads; real asset boundary checks remain active.
- Editor, native and account packages share byte-identical Story/design references. Client routing stays transport-specific. Keep original assets and earlier crops needed by history, preflight required capabilities, and serialize render/export per Project.

## Four delivered introductions

| Edition | Pages | Delivery |
| --- | ---: | --- |
| ChatGPT Chinese | 22 | Reviewed primary introduction, 3 pure section dividers, full/8-page talks, notes, Story and 22 named versions |
| ChatGPT English | 22 | Localized primary introduction with the same reviewed narrative and native English evidence |
| Claude Code English | 21 | Actual native first submission, 4 pure dividers, 21 notes and named versions; no cosmetic rewrite |
| DeepSeek Harness Chinese | 21 | Actual native trial with a separately recorded blocker-only continuation; 17 pages unchanged |

All four include portable source, PDF and editable PPTX. See [the introduction collection](../examples/huandeng-introduction/README.md). The screenshot library includes 120 original PNGs, with 37 recommended images; portable public evidence projects accompany them.

The primary narrative now demonstrates a real two-object edit, stable Slide ID under reordering, reusable Main/Presentation content, Story, named versions and Live/Pinned delivery. It separates the responsibilities of the folder/PPTD, Plugin, Connector and Editor.

## Accepted evidence

- 127 unit files: 1,292 passed and one existing platform skip. Eight plugin tests, core TypeScript, repository Biome and production build passed.
- Actual UI journeys and representative light/dark states were inspected. Section insertion and Undo, design-check navigation/staleness and original-image dimensions were exercised.
- The exact installed EXE passed isolated-profile English open, design check, second native launch routing into the Chinese project, zero renderer errors and normal exit. Native hidden-window pixels were not captured; actual UI pixels were reviewed through the production service separately.
- Both primary decks passed independent visual review, including requested corrections to readability and evidence accuracy.
- Microsoft PowerPoint 16.0 opened all four PPTX files read-only without repair and exported all 86 slides. The review covered every slide through contact sheets and selected full-size checks. No visible clipping, missing image or glyph problem was found; input hashes were unchanged.
- Four PDFs contain 22/22/21/21 pages at 16:9. The primary PDFs were rendered and visually inspected across all 44 pages.
- Four portable project checks have no diagnostics. Public evidence projects were opened from their release copies, including old named-version previews, without changing delivered bytes.

## Installed clients and account

The retained 0.18.0 package is installed separately from older versions. Desktop and Start Menu shortcuts, the current-user PPTD open command and agent runtime pointer select it.

Native Codex and Claude inventories report huandeng@huandeng-local 0.18.0 enabled, with all 24 package files verified. Unrelated plugins remain unchanged. DeepSeek has a versioned explicit overlay and a dedicated HUANDENG DeepSeek launcher; its ordinary global profile remains intact. All three adapter doctors report 22 tools and design-audit support. Shared Story SHA-256 is `f09f2bf2a49bfc62bc89e76fca53c5ef3d25ee08f810d51b6285d6160cdee990`.

The existing account plugin was updated in place, preserving its identity, scope and App binding. All 20 returned text files match, and the current host returned the final Story hash. Private binding/release receipts stay outside the public tree.

## Remaining boundaries

The account inventory contains one HUANDENG account entry. The other supplied reference is a local code plugin; the account uninstall tool does not manage it, and the managed runtime has no matching installed marketplace. Updating or removing Windows adapters would not prove the ChatGPT picker changed. A second picker entry has therefore not been claimed removed.

The user's original ordinary-profile Editor was left running with its private projects. New launches can route into that older single instance until it is closed normally. The isolated test verified the new installed executable; it did not silently replace the running session.

Claude's current output retains an early empty History screenshot and one missing old operation-preview crop. DeepSeek needed the documented asset-import continuation after a native permission initialization failure and has fewer screenshots. These are genuine trial findings, not hidden corrections.

PPTX exports are static. This milestone does not implement arbitrary PPTX import/round-trip, native PowerPoint animation, a separate presenter window, inherited master layouts or an Editor extension marketplace. Those existing gaps remain in the product backlog.

## Next-session rules

Keep source, package, installed runtime, account delivery, native trial and visual review evidence distinct. Do not overwrite the four native/root editions while extending them; create a new named milestone. Do not delete apparently unused images without checking archived versions and operation references. Use the published artifact hashes and installed marker before claiming a version mismatch.
