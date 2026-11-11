# HUANDENG Editor — repository instructions

HUANDENG is an AI-native desktop slide editor built on the OpenSlide codebase. Product UI: React + Electron; document format: PPTD. Keep upstream licenses and attribution.

- origin is the HUANDENG repository; upstream is the original OpenSlide repository. NEVER push upstream.
- Commit coherent work locally. Push to origin ONLY after a significant tested editor version milestone, not after every minor edit. A milestone push requires release notes and handoff. Do not run npm publishing.
- Preserve unrelated local changes, especially users' .page documents. Never use broad add/reset/clean to absorb or discard their work.
- Product-facing label: HUANDENG Story. Existing story services, designIntent fields and huandeng_story_record MCP calls must remain compatible until a migration is tested.
- Keep checks focused on affected features.
- The inherited OpenSlide guide below is only reference. Its npm release instructions do not apply to the HUANDENG product.

See docs/RELEASE-POLICY.md and docs/STORY.md.

## Slide and example authoring

All agents changing HUANDENG slides follow Audit, Spec, Implement, Validate, Release in that order. Audit the user's original story, historical feedback, current project rules and actual reference images before making a page. Write the narrative and visual intent before implementation. Validate actual rendered pages and the teaching relationship, then export the reviewed source.

The author's story remains the authority. Add necessary explanations and teaching to that story; do not replace it with a feature list or an operation tour. Do not rewrite rules to justify an interpretation the user did not give. Title-only Section slides are real pages, with no watermark, page number or ornament. Visual evidence should carry explanatory pages; a UI detail must retain an intelligible place in the Editor. Use professional plotting tools for scientific figures. Do not turn visual judgement into an aesthetic score.

For this introduction comparison, ChatGPT, Claude Code and DeepSeek acquire their own active materials. Retained shared sources and historical versions are not an independent acquisition. See docs/INTRODUCTION-STORY-SPEC.md and the selected example's AGENTS.md for its exact scope and attribution.

---
# open-slide — Framework Repo Guide

You are working on the **open-slide framework** — the runtime, CLI, and tooling that ship to npm.

(Slide-authoring guidance lives in the `slide-authoring` / `create-slide` skills under `apps/demo/.claude/skills/`. Use those only when editing files inside `apps/demo/slides/`.)

## Layout

pnpm + Turbo monorepo.

| Path | Package | Role |
| --- | --- | --- |
| `packages/core` | `@open-slide/core` | Runtime (viewer, present mode, inspector), Vite plugin, `open-slide` dev/build CLI. |
| `packages/cli` | `@open-slide/cli` | `npx @open-slide/cli init` scaffolder + project template. |
| `apps/demo` | private | Local consumer of `@open-slide/core` via `workspace:*`. Dogfood target — run `pnpm dev` here to exercise the framework. |
| `apps/web` | private | Marketing site (Next.js). |

Shared config: `biome.json`, `turbo.json`, `pnpm-workspace.yaml`, `tsconfig` per package.

## Workflow

```bash
pnpm dev          # turbo: runs demo against local core
pnpm build        # build all packages
pnpm typecheck    # tsc across the graph
pnpm check        # biome (format + lint + organize imports)
pnpm check:fix    # auto-fix what biome can
pnpm test         # vitest
```

Filter to one package: `pnpm core <script>` / `pnpm cli <script>`.

## Hard rules

- **Biome must pass before commit.** Run `pnpm check` (or `pnpm check:fix`). CI and the user's review both expect a clean tree.
- **If `packages/core` or `packages/cli` changes, add a changeset.** Run `pnpm changeset`, pick the right package(s) and bump (`patch` for fixes/polish, `minor` for new public API, `major` for breaking). Apps (`demo`, `web`) and root tooling do **not** need one.
- **Changeset descriptions: short and direct.** One line, present-tense, what changed from a user's perspective. Match the tone of `.changeset/*.md` already in the repo. No paragraphs, no rationale, no "this PR…".
  - Good: `Replace spinner with a hairline + sliding bar for slide and presenter loading states.`
  - Bad: `This change introduces a new loading indicator because the previous spinner felt heavy and we wanted something more subtle for presentation contexts…`
- Don't bump versions or edit `CHANGELOG.md` by hand — `changeset version` owns that.
- Don't add dependencies casually. The `core` runtime ships to users; every dep inflates install size.
- `packages/core/src/app/components/ui` is shadcn-generated and biome-ignored — leave it alone unless regenerating.
- **Default to writing no comments.** Only add one when the WHY is non-obvious — a hidden constraint, a subtle invariant, a workaround for a specific bug, behavior that would surprise a reader. Don't explain WHAT the code does (well-named identifiers handle that), don't reference tasks/PRs/callers ("added for X", "used by Y"), don't write section-divider banners (`// ── Section ──`) or module-header descriptions, and don't leave commented-out code. If removing a comment wouldn't confuse a future reader, don't write it.

## Releasing (reference)

`pnpm release` builds `core` + `cli` and runs `changeset publish`. Triggered by the maintainer, not by agents.

<!-- BEGIN:turborepo-agent-rules -->

# This is NOT the Turborepo you know

Turborepo configuration, task behavior, and CLI commands can vary between installed versions and may differ from your training data. Resolve the `turbo` package from this file's directory or relevant workspace; in monorepos, it may not be visible from the repository root. For example, run `node -p "require.resolve('turbo/package.json')"` from a workspace that depends on `turbo`.

Read `docs/README.md` inside that installed package first, then read the relevant pages from its `docs/` directory before changing Turborepo configuration or commands. Heed deprecation notices. These bundled docs match the installed package version and are available without network access.

This block is written and re-added by `turbo` before repository-scoped commands when an AI agent is detected. In the Turborepo source repository, its template is defined in `crates/turborepo-cli/src/cli/agent_guidance.rs`. Removing the managed block while updates are enabled means a later qualifying invocation will add it again. Set `"agentGuidance": false` in the root `turbo.json` or `turbo.jsonc` to opt out; this does not remove an existing block. Keep the block committed with your work to avoid an uncommitted change on the next agent invocation.
<!-- END:turborepo-agent-rules -->
