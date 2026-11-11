# HUANDENG v0.12 handoff

**Local implementation, acceptance and installation are complete.** Editor 0.12.0 uses clean runtime `01780db2871d2eb516fcd7a00ccbcc43f666daa1`, built `2026-11-08T12:59:10.9221682Z`. The delivery-only commit records documentation and sanitized synthetic evidence; it does not change installed code. Tag: `editor-v0.12.0`. Verify actual origin refs against the delivery commit when resuming; local successful checks do not imply remote delivery by themselves.

## Completed

- Explicit Section 00 front matter, derived Section Positions, stable Section IDs and shared numbering across Pages/Project/pickers/briefing.
- Fold anchor retention, fresh gap Section creation with Undo, before/after drag targets and edge scrolling.
- Selected text foreground/highlight, range preservation, semantic-style persistence after save/reopen, and scoped Ctrl/Meta-wheel zoom.
- Portable plugin 0.12.1, Codex/Claude native installations, reusable DeepSeek adapter, a real synthetic DeepSeek read-only task, private ChatGPT account package and final installed-runtime protocol doctor.
- 47 focused editor tests; full 99-file unit run with 1,096 passed/one skip; eight plugin tests; TypeScript, Biome, production build, clean package and eight matching UI groups with two normal exits.
- Guarded normal-close application installation, retained previous package, ordinary-profile reopen and original-file protection. Detailed installation/authoring receipts remain outside Git.
- Authorized private authoring, native export and visual review completed separately. No private slide content, structure, IDs, image evidence or detailed counts belong in this handoff.

## Contracts to preserve

`section.id` is identity; displayed position is derived from Main order. Only one explicitly marked front-matter Section is allowed; it must be nonempty, contiguous and begin at Main Position 1. First-Slide Sections extend to the next boundary. A member array is a compatibility cache, not authority for a dynamic Section. Do not silently convert older fixed semantics.

Folding records the clicked heading's viewport anchor. Selected-Slide scrolling responds to selection, page-order and search changes; Section folding alone does not trigger it. Gap create/move revalidate actual neighboring IDs after flushing current edits. Existing Project drafts must not be overwritten by a stale organization snapshot.

Inline formatting owns a bounded editable range, preserves IME and portal focus, and commits through existing text-edit/Undo boundaries. Renderer CSS remains restricted by the existing sanitizer. Styles on semantic emphasis tags must survive ordinary saved rendering, not only contenteditable. Pointer-anchored zoom stays within the canvas and does not consume unrelated panel scrolling.

Client discovery treats local session files as hints, verifies loopback/canonical entry/protocol, refuses redirects and pins the chosen Project. An explicit invalid runtime must not silently fall back. Registration stores only an application pointer. Portable source never contains a private app/account binding, Project or credential. Account package creation is not host installation; native inventory is not a model authoring task.

Native revision receipts can include loaded historical page files whose identities are tombstones, while the inspection page list contains active Main Slides. Match active revisions by identity and preserve verified inactive entries; do not assume these maps have the same count. The author-review envelope is derived from saved review metadata and the current render revision. Validate that derivation separately from exact stored document content.

Preserve all existing writer/recovery, history, Notes/docking, file-preview, layout, animation and export invariants in WEBCHAT and earlier handoffs. No new public listener or arbitrary editor plugin executor is part of this release.

## Working environment

Windows is authoritative: `<workspace-checkout>`, branch `editor/v0.12-sections-authoring`; canonical checkout `<editor-checkout>`. The Linux transfer mirror has no authoritative Git history. Preserve the unrelated modified canonical fixture. Never broad-stage/reset/clean or restore an old private document baseline.

Use isolated development dependencies with the frozen lockfile; hoisted development layout produced duplicate physical React instances. Production packaging independently deploys a self-contained hoisted copy and passes its own binary UI checks. If Turbo cannot find pnpm, provide the existing Corepack shim through process-local PATH; do not alter application tests to mask a launcher failure.

The accepted GUI harness is `scripts/verify-authoring-v012.mjs`, with the exact candidate `HUANDENG_DESKTOP_EXE`, no `HUANDENG_DESKTOP_APP`, and isolated profiles/synthetic Projects. Use the ordinary-profile installation receipt for installation claims. Preserve failed receipts described in Validation.

## Remaining boundaries

The authenticated ChatGPT owner page and its Try in chat flow were verified: the resulting unsent composer displays HUANDENG. This establishes account availability and that host entry point; the owner page had no distinct Install action. It does not certify hot-loading into an existing conversation or a complete ChatGPT model authoring task. Reuse the existing private plugin. Native account details and the private link stay outside the repository. Codex/Claude full model editing and a live second-computer run are not certified by this milestone.

Keep private Project edits in their authorized private location. Future research changes are separate from the editor release. Public visibility still requires a scoped historical privacy cleanup; no force push or history rewrite has been performed.
