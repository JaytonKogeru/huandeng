# Contributing to HUANDENG

HUANDENG contains a desktop slide editor, a PPTD document service and CLI, agent integrations, and public examples. Issues and pull requests are welcome in English or Chinese.

This is the [HUANDENG repository](https://github.com/JaytonKogeru/huandeng). [OpenSlide](https://github.com/open-slide/open-slide) is the upstream project on which it is based. Preserve its MIT license and attribution, and send HUANDENG changes to this repository.

## Start with the task

- Report a reproducible problem through the [bug report form](https://github.com/JaytonKogeru/huandeng/issues/new?template=bug_report.yml).
- Describe a proposed improvement through the [feature request form](https://github.com/JaytonKogeru/huandeng/issues/new?template=feature_request.yml).
- Ask a usage question through the [question form](https://github.com/JaytonKogeru/huandeng/issues/new?template=question.yml).
- Follow [SECURITY.md](SECURITY.md) for a possible vulnerability. Keep exploit details out of public issues.
- For a substantial change, open an issue first to agree on the problem and scope.

Contributors are expected to follow the [Code of Conduct](CODE_OF_CONDUCT.md).

## Repository layout

| Path | Role |
| --- | --- |
| `packages/core` | Editor UI, PPTD document service, runtime and `huandeng` CLI; retains the `@open-slide/core` package name |
| `packages/desktop` | Electron shell, native menus, project windows and desktop integration |
| `packages/cli` | The inherited `@open-slide/cli` scaffolder |
| `plugins/huandeng` | Shared authoring skill, MCP launcher and client adapters |
| `examples/huandeng-introduction` | Public, editable introduction projects and their evidence assets |
| `tests` | Public fixtures and integration checks |
| `docs` | Architecture, document contracts, workflows, validation and release records |
| `scripts` | Packaging, installation and development utilities |
| `apps/demo`, `apps/web` | Upstream framework demo and website workspaces |

## Development setup

Use Node.js 22.12 or newer and pnpm 10.17.0, as pinned in `package.json`. The packaged desktop workflow is currently documented for Windows.

```sh
git clone https://github.com/JaytonKogeru/huandeng.git
cd huandeng
corepack pnpm install --frozen-lockfile
corepack pnpm --filter @open-slide/core build
corepack pnpm desktop
```

The core build produces the Editor frontend. For frontend development, set `HUANDENG_DEV_SERVER=1` in your shell before starting the desktop or CLI. See the [desktop guide](packages/desktop/README.md) for build and installation details.

## Make a focused change

Create a branch in your fork and keep the pull request focused on one problem. Match the surrounding code style, preserve unrelated local changes, and avoid repository-wide formatting.

Keep document editing inside the shared Editor/CLI/MCP writer. When changing a public example, do not bypass that service by directly rewriting `.page`, `.pptd` or `.huandeng/project.json`. Read the current revision, preview the intended transaction, apply that same transaction, then check the saved result and actual rendering. See the [document specification](docs/SPEC.md) and [Story guide](docs/STORY.md).

The files under `packages/core/src/app/components/ui` are generated UI components. Change their generation source or regeneration workflow when needed. Add a dependency only when its cost and purpose are justified.

## Check the affected behavior

The current core CI runs:

```sh
corepack pnpm check
corepack pnpm --filter @open-slide/core typecheck
corepack pnpm exec vitest run --project unit
corepack pnpm --filter @open-slide/core build
```

Run the relevant checks before submitting code. Add a focused regression test when a bug or new behavior needs one. For a documentation-only change, check the changed links, examples and formatting.

For Editor changes, exercise the affected workflow in the actual app. For visual changes, inspect the rendered pages and include useful before/after images. For an export change, open the relevant output in its target viewer; state whether native PowerPoint objects were actually checked in PowerPoint. Successful JSON validation or export generation alone does not establish visual quality.

Describe what you checked and what remains unverified. Keep release or author approval claims tied to explicit evidence.

## Public examples and assets

Use public or synthetic fixtures. Do not include private presentations, unpublished figures, credentials, account bindings, local session records or screenshots containing private information.

Keep each asset's source, license and attribution. Preserve the original image and make display crops through native image properties where possible. Check that a project remains usable with its local assets when copied to another directory.

Include generated exports only when they are part of the proposed example or needed to review an export change. Keep author/model watermarks accurate for the edition being edited.

## Agent plugin changes

Keep the plugin manifests, launcher and shared `huandeng-story` skill consistent. Build client packages from repository sources; do not treat edits to an installed client cache as the implementation.

Verify a changed adapter inside its actual host when the change affects loading, configuration, lifecycle or tool access. Configuration generation and host discovery are separate from a successful model task.

See the [plugin guide](plugins/huandeng/README.md) and [DeepSeek adapter guide](plugins/huandeng/adapters/deepseek/README.md). Plugin packages must not contain credentials, machine-specific project bindings or conversation history.

## Pull requests and releases

Explain the problem, the change and its resulting behavior. Include the affected components, relevant issue links, validation evidence and any material limitation. The [pull request template](.github/pull_request_template.md) provides this structure.

External contributors should open a pull request from their fork. Maintainers handle release branches, version metadata and milestone tags under the [release policy](docs/RELEASE-POLICY.md). The HUANDENG Editor and plugin versions are distinct from the inherited npm package versions.

**Do not run `pnpm release`, `npm publish` or `changeset publish` for HUANDENG.** The inherited release script publishes the OpenSlide-scoped packages and is not the HUANDENG release path. Never push this product's changes to the upstream OpenSlide remote.

## License and attribution

Contributions are made under the repository's [MIT license](LICENSE). Submit only material you have the right to contribute. Retain original copyright statements and relevant third-party notices.

HUANDENG is an independent derivative of OpenSlide, not an official upstream release. See the [preserved upstream README](docs/UPSTREAM_README.md) and [desktop third-party notices](packages/desktop/NOTICE.md).
