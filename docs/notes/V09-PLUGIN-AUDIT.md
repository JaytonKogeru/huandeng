# v0.9 Plugin specialist audit

Date: 2026-11-08 (Australia/Sydney). This is the specialist's proposal for root review, not an accepted implementation or a client installation receipt.

## Findings

The document channel already works: the 17 advertised tools in `packages/core/src/pptd/mcp.ts` use `HuandengClient` and the same open writer as the editor. `project-insights.ts` supplies the four Story levels, exact occurrence, neighbors, live/pinned source, assets and revisions. `client.ts` verifies the requested PPTD against the running service. Keep these contracts.

`plugins/huandeng` currently contains a launcher, a Claude 0.6.0 compatibility manifest, `.mcp.json`, two configuration examples and a README. It has no discoverable Story skill, no portable/Codex plugin manifest, no DeepSeek adapter, no connection generator/doctor, and no non-writing transaction preview. The existing generic `huandeng_apply` schema describes only the envelope; an agent must learn operation shapes elsewhere. The README workflow is useful but is not automatically available as a skill in a client.

The highest-value next step is a usable Story workflow around the existing tools, with one reviewable transaction format and a real client round trip. A second editor writer or embedded model executor would duplicate working infrastructure.

## Learning before design

The local plugin and component guidance from the available `plugin-creator` skills fits this repository-owned, local-file product. Personal-skill account installation is a different operation and is not needed to author plugin components here. No account upload or public endpoint is proposed.

| Primary source | Relevant supported behavior |
| --- | --- |
| [OpenAI plugin packaging](https://developers.openai.com/plugins/build/plugins) | Portable `plugin.json`, `mcp.json` and `skills/`; a Codex compatibility manifest can coexist. The client/runtime must actually have access to local executables. |
| [OpenAI skills concept](https://developers.openai.com/plugins/concepts/skills) | A skill teaches when and how to combine server tools; this fits the Story workflow. |
| [Claude plugin reference](https://code.claude.com/docs/en/plugins-reference) | `.claude-plugin/plugin.json`, `skills/`, `.mcp.json` and `${CLAUDE_PLUGIN_ROOT}` can package a local command without duplicating the server. |
| [Official DeepSeek Harness MCP client](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/mcp/mcp-client/README.md) | One configured `dsh-mcp-client` entry per server, stdio or Streamable HTTP. It registers namespaced tools and supports server instructions and on-demand resources; MCP prompts are unsupported. |
| [DeepSeek filesystem skills](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/skill/skill-filesystem/README.md) | Discovers immediate `name/SKILL.md` bundles from project/custom/user roots. An isolated custom-root provider can use the same packaged skill. |
| [DeepSeek CLI reference](https://github.com/deepseek-ai/deepseek-harness/blob/master/apps/cli/reference/README.md) | `--patch` adds a profile overlay. Headless mode runs a task without a browser or HTTP listener. Profiles and defaults are versioned runtime details. |

The current DeepSeek documentation is a fast-moving developer preview. Implementation must use the installed version's own CLI and package schema rather than assume master matches the user's machine.

## Actual local-client evidence

Read-only THUG inspection found the official npm installation at `%LOCALAPPDATA%/Programs/DeepSeek-Harness-Official/node_modules/@deepseek-ai/dsh`. Its `package.json` says `0.2.1-rc.2`, MIT, official `deepseek-ai/deepseek-harness` repository, entry `lib/bin.js`.

Running that exact CLI with `--help`, then `headless --help` and `--version`, returned exit 0 and confirmed `--patch`, `--profile`, headless stdin (`-`), `--json`, and `--session-id`. This proves a callable installed launcher, not that HUANDENG tools are loaded or that a model task succeeded.

The installed shipped `dsh-base/cordis.patch.yml` already has `skill`, `skill-filesystem`, `tool-skill`, and the MCP packages are installed. The shipped headless bundle disables interactive credential/authorization providers and uses launch-time credentials. The existing configured model route should be inherited locally, without copying or printing credentials. A dedicated `DSH_HOME`, synthetic PPTD workspace, and explicit HUANDENG overlay can isolate validation from user sessions.

AgentVault status confirmed THUG. Its project registry does not contain HUANDENG, so this audit did not register a project, synchronize memory, launch a Vault job or forward the user's full request. The old PATH `deepseek` command is not evidence for the official `dsh` runtime.

## Recommended v0.9 implementation

1. One `huandeng-story` skill: read exact target/selection; read Story/occurrence/assets; form a short question–evidence–takeaway outline using supplied facts; preserve figures and author constraints; create a transaction proposal; preview; apply when authorized; read/render actual changed output. Client-facing documentation must distinguish automatic authorization from an explicit review-only request. Story metadata remains agent interpretation, never fabricated human approval.
2. A compact operation reference and an MCP resource expose the current supported transaction shape, example Story/notes/presentation/build-step changes, stable IDs and CAS rules. Do not add a separate high-level save language.
3. `huandeng_preview` and CLI `preview` run the existing operation planner without persistence. Refactor preparation out of the current store's `applyOperations` path so preview and commit share all validation. Preview does not capture external versions, publish events, consume undo/history entries, create files or update document revisions.
4. Return a proposal hash over the normalized complete transaction, affected pages/files, operation summary, before/after data and reused-page impact. Clearly mark newly allocated page identifiers as provisional if creation is allowed; the applied response remains the authority for created IDs.
5. `huandeng_apply` accepts optional `previewHash`; hash mismatch rejects before commit, then the existing writer re-reads and applies ordinary CAS. Identical retry keeps the original request ID. The hash identifies a concrete proposal, not approval. Existing direct apply callers stay compatible.
6. Portable, Codex and Claude manifests share the skill and launcher. A Node setup generator prints or writes a new explicitly selected configuration artifact for Codex/Claude/DeepSeek; it does not overwrite client-wide configuration. A doctor checks entry, active service identity and tool availability without revealing tokens.
7. Complete one real DeepSeek headless Story task on a synthetic project with isolated state. Capture visible tool use and final outcome; inspect resulting files/revisions and reopen through the editor. Tool discovery alone is not the end-to-end gate.

ChatGPT in this environment can keep using the authorized DC-WALT workstation channel and the same CLI. A separate direct ChatGPT account plugin/tunnel is not established by a portable manifest and is outside this local milestone.

## File ownership proposal

- `plugins/huandeng/**`: skill, manifests, shared launch/setup/doctor, client instructions and examples.
- `packages/core/src/pptd/{proposal,mcp,client,cli,types}.ts` and focused tests: shared preview result, transport, resource and CLI.
- `packages/core/src/pptd/store.ts`: small preparation/commit separation; preserve the persistence/journal/recovery implementation.
- `packages/core/src/vite/routes/pptd.ts`: preview and hash-bound apply routes.
- Root-owned UI can load a proposal JSON, show the returned impact, and call the same apply route. It is useful but not required for the protocol: the agent conversation is also a review surface. Do not claim a rendered before/after screenshot if the first version returns structural diffs only.

## Focused acceptance

- Preview changes no source bytes, journal, version index, event sequence or receipts; invalid operations/conflicts fail using the same checks as commit.
- The exact previewed payload applies once; tampered hash fails; stale touched-page or metadata revisions fail; identical retry returns the original result; Undo restores it.
- A proposal changing Story, notes, build steps or presentation order preserves unrelated pages/figures/metadata and repeated occurrence identities.
- Config generation handles spaces/Unicode paths, contains no credentials, preserves existing configuration, and never points a copied plugin silently at a different project.
- The real DeepSeek task loads the packaged skill/tools, reads briefing, previews, applies an authorized bounded change, and reads the resulting revision. Rendering is an independent visual inspection; inability of a model route to ingest an image must remain explicit.

Do not add an exhaustive new model test harness, broad snapshot suite or repeated whole-project soak for this bounded feature. The shared writer change needs focused integrity tests plus the normal milestone suite once.
