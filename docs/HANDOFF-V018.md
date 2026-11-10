# v0.18 handoff

Date: 2026-11-10. Status: integration candidate with the private account plugin updated in place to 0.18.0 and read-back verified. Desktop/native installation, four-deck acceptance and the origin milestone are not asserted by this record.

## Read first

[Workflow audit](AUDIT-V018-WORKFLOW.md), [shared spec](SPEC-V018.md), [workflow frame](FRAME-V018-WORKFLOW.md), [design rationale](DESIGN-V018.md), [UI acceptance](VALIDATION-V018-UI.md), [workflow validation](VALIDATION-V018-WORKFLOW.md), [release notes](RELEASE-V018.md) and [distribution record](RELEASE-V018-WORKFLOW.md).

The six-stage process is Audit, Spec, Frame, Implement, Validate and Release. Product version is 0.18.0; core npm version remains 2.3.1 with pending changesets. No npm publication or repository visibility change is part of this release.

## Implemented contract

- One shared writer and exact Project-root AGENTS.md continue to serve GUI, CLI and MCP. Read-only design audit is available through the Editor, HTTP, CLI quality and huandeng_design_audit.
- The audit records source revisions, language-adjustable type thresholds, backgrounds, opt-in title-only dividers and bounded raster sampling. It does not edit pages or replace visual inspection.
- CLI init and desktop creation share a safe initializer. Init refuses an existing target, including an empty directory, instead of overwriting a Project.
- page.add.sectionId inserts a new first Slide into an existing Section while retaining identity, Story and membership semantics in one undoable transaction. A structural Section still need not have a divider unless requested.
- Neutral UI hierarchy retains the six workspaces. The quality dialog links findings back to their pages and marks stale results.
- Export freezes semantic src/url references. Authored text such as media/ in a table no longer triggers asset reads; real asset scope, size and consistency checks remain active.
- Source, Editor and native/account packages share byte-identical Story/design references. Client routing remains transport-specific. Preserve imported originals and old crops used by operation history, preflight required client capabilities, and serialize render/export within each Project.

## Verified source gates

127 unit files: 1,292 passed and one existing platform skip. Eight plugin configure/discovery tests passed. Core TypeScript, full-repository Biome and production build passed. Native Claude plugin and marketplace manifest validation passed. Exact package evidence and integration status are recorded in the workflow validation document.

## Integration and release ownership

The active worktree is based on 376e6b4 on editor/v0.18-design-workflow. The main checkout's unrelated modified fixture remains outside this work. A package built from uncommitted reviewed code is explicitly a dirty integration candidate, not a clean release identity.

The project owner completes the four presentation deliveries and independent visual review, actual PDF/PowerPoint inspection, native Editor installation and exact installed plugin checks. Preserve the first DSH/Claude attempts and record any blocker repair separately; do not replace their authored choices with ChatGPT output.

Keep the existing account plugin identity and App binding. Native Codex, Claude and DSH routes remain installed independently. A local marketplace reference and an account App are not proof of an obsolete duplicate; resolve the exact ChatGPT host identity before any removal. Native distribution artifacts remain prepared. The account update and current-host Story skill hash are verified; see the distribution record for the exact scope and remaining picker-entry limitation.

After combined acceptance, commit reviewed runtime code, build and verify the clean release, perform the authorized installation/distribution, and record the accepted origin milestone with its actual source and artifact identities. Keep source, package, installation, model-trial and human-review evidence distinct.
