# HUANDENG Plugin

HUANDENG exposes the open editor's document service through MCP and CLI. The editor, Codex, Claude Code and an authorized ChatGPT workstation connection all read the same PPTD project and send edits to the same writer. Main Slides, sections, presentations, Story and assets remain in that project.

## Available connections

| Client | Connection supplied here | Status |
| --- | --- | --- |
| Codex / another local stdio MCP client | `codex.mcp.example.toml` or `mcp.example.json` | Uses the existing `huandeng mcp` bridge |
| Claude Code | Local plugin manifest, `.mcp.json`, portable launcher | Ready for local loading against an installed HUANDENG CLI |
| ChatGPT Web through DC-WALT | Run the same CLI on the authorized workstation | Existing workstation channel; no extra document writer |
| ChatGPT private MCP | Official Secure MCP Tunnel can target this stdio command | Configuration path documented below; no tunnel or ChatGPT connector is installed by this repository |

The MCP bridge attaches to an already open project. It does not open a second editor or choose a project on the user's behalf. The editor's `http://127.0.0.1:PORT/__pptd` API is a local document API, not a Streamable HTTP MCP endpoint.

## Local setup

Open the intended PPTD project in HUANDENG. Use a built checkout or installed CLI with its dependencies present. Node must meet the core package's supported version range.

Set these environment variables for the client process:

- `HUANDENG_ENTRY`: absolute path to that project's `.pptd` file. Required.
- `HUANDENG_CLI`: absolute path to `packages/core/huandeng.js`. Optional when this plugin is still inside the HUANDENG checkout; required when the plugin folder is copied elsewhere.
- `HUANDENG_URL`: optional explicit local editor address. The bridge still checks that its project matches `HUANDENG_ENTRY`.

`scripts/launch-mcp.mjs` forwards stdio directly to the CLI using separate process arguments, so paths with spaces work. It keeps diagnostics on stderr and inherits the client's existing environment. It creates no project copy and writes no configuration or credentials.

### Codex

Adapt `codex.mcp.example.toml` to the actual absolute paths and add its server entry to the client's MCP configuration. The example uses the ordinary `[mcp_servers.huandeng]` command/args/env configuration from the [official MCP documentation](https://learn.chatgpt.com/docs/extend/mcp?surface=cli). Client tool approval settings remain under the user's control.

### Claude Code

This directory contains `.claude-plugin/plugin.json` and the default `.mcp.json`. After setting the environment above, a local development load is:

```sh
claude --plugin-dir /absolute/path/to/huandeng/plugins/huandeng
```

Inspect the client's MCP status and run `huandeng_context` to confirm the intended deck. The plugin paths and `${CLAUDE_PLUGIN_ROOT}` launcher argument follow the [official plugin reference](https://code.claude.com/docs/en/plugins-reference). `claude plugin validate /absolute/path/to/huandeng/plugins/huandeng` checks the manifest with the installed client's schema. A successful repository test does not claim that a particular user's Claude Code session has loaded the plugin.

### ChatGPT Web and private MCP

With the existing authorized DC-WALT connection, call the workstation CLI with an explicit `--entry`. It reaches the same service used by the local MCP bridge.

A direct private ChatGPT connection can use OpenAI's [Secure MCP Tunnel](https://developers.openai.com/api/docs/guides/secure-mcp-tunnels). The official client supports a local stdio MCP command and makes an outbound connection. A future setup should:

1. Identify the intended Platform organization, ChatGPT workspace and workstation, then check their actual tunnel permissions.
2. Use the supported tunnel client and its current `help quickstart`; point its local stdio profile at `node /absolute/path/plugins/huandeng/scripts/launch-mcp.mjs` with the same project environment.
3. Keep credentials in the host's secure environment and run the client's doctor/readiness checks.
4. In ChatGPT's custom MCP connection flow, choose the matching private tunnel and verify `huandeng_context` and `huandeng_story_briefing` against the intended project.

This work adds no public listener, account resource, tunnel, OAuth service or marketplace submission. Direct ChatGPT availability is established only after an actual client tool call succeeds. A future remote transport should adapt to this tool implementation and writer rather than implement a second save path.

## Tool surface

The bridge advertises 17 tools. Legacy `huanding_*` names and `huandeng_frame_record` still dispatch to their current counterparts; they are not advertised twice.

| Tool | Purpose |
| --- | --- |
| `huandeng_context` | Deck identity, Main page identities, revisions, project organization and diagnostics |
| `huandeng_story_briefing` | Main, section, presentation and page Story; exact occurrence, neighbors, used-by links, assets and revisions |
| `huandeng_presentation_read` | Resolved presentation with occurrence IDs, repeated pages, local notes and pinned page snapshots |
| `huandeng_assets_list` | Search media/assets, original image names, Main usages and missing references |
| `huandeng_page_read` | One current Main page, editable elements and current revision |
| `huandeng_selection_read` | Human selection including presentation/occurrence context |
| `huandeng_story_record` | Record the Agent's interpretation of the request and preservation constraints |
| `huandeng_apply` | Focused transaction through the shared writer with expected revisions |
| `huandeng_render` | Committed page PNG, optionally for a particular presentation occurrence |
| `huandeng_history` | Named page checkpoints or granular operations; inspect a specific historical version |
| `huandeng_version_record` | Named milestone with archived local assets |
| `huandeng_version_restore` | Restore a page version through a new transaction |
| `huandeng_revert` | Conflict-checked undo of an operation |
| `huandeng_project` | Actual file tree; honor its `truncated` flag |
| `huandeng_export` | Static PDF/PPTX or an asynchronous deterministic MP4 video job |
| `huandeng_export_status` | Video progress and completed file/report URLs |
| `huandeng_export_cancel` | Cancel an active video before publication, preserving previous exports |

## Story-driven editing

1. Read `huandeng_context`, then `huandeng_selection_read` if the user refers to their selection. Read `huandeng_story_briefing` for the intended scope before proposing layout or narrative changes.
2. Read the target page with `huandeng_page_read`. For a presentation, inspect its `occurrenceId` and `versionId` through `huandeng_presentation_read` or the briefing. A page UUID identifies content; an occurrence identifies a particular use; position is a derived number that changes with ordering.
3. Record the understood request with `huandeng_story_record`, preserving existing `purpose` and `keep` unless the user changes them. This is an Agent summary, not human approval. Use the actual conversation/task as `source`.
4. Apply the authorized, focused change using the returned metadata revision and freshly read current page revisions. Editing a live Main page changes all its live references. A pinned occurrence remains read-only; choose an intentional new Main variant or restore/version workflow when different artwork is needed. Occurrence notes can differ without duplicating the page.
5. Render and inspect the changed Main page and a relevant presentation occurrence. Report actual changes and unresolved issues. Record a named page checkpoint after a meaningful milestone, rather than after each small edit.

The briefing's Main, section and presentation stories describe the current project organization. For a pinned occurrence, `page.story`, `page.assets` and `page.pageRevision` come from the archived version; `revisions.currentMainPage` is separately labeled. Never use a historical page revision as the expected revision for a current-page write.

If a repeated page is requested with only `pageId` and `presentationId`, `huandeng_story_briefing` returns `AMBIGUOUS_ID` with candidate occurrences. Choose the intended occurrence from the user context, or present those choices when that context is insufficient. Do not silently use the first position.

The briefing includes up to 500 sequence entries and explicitly reports `sequence.total` and `sequence.truncated`. The selected occurrence and its immediate neighbors remain exact even beyond that preview. `huandeng_presentation_read` supplies the complete resolved presentation.

### Story request

Replace the example IDs, timestamp and revision with values from the current session:

```json
{
  "pageId": "Q9R4",
  "requestId": "unique-id-for-this-intent-record",
  "expectedMetadataRevision": "sha256:CURRENT_METADATA_HASH",
  "actor": "claude-code",
  "source": "user conversation / task reference",
  "recordedAt": "2026-11-08T00:00:00Z",
  "requestedChange": "Clarify the caption and retain the figure positions.",
  "keep": ["Keep the original figures in their existing positions"]
}
```

Retry an uncertain write with the identical request ID and payload. After a revision conflict, read again and preserve intervening user edits. Named checkpoints archive assets; granular operation previews can still depend on current project media. This distinction is returned by the version API.

## Asset workflow

`huandeng_assets_list` accepts `query`, `filter` (`all`, `used`, `unused`, `missing`), optional stable `pageId`, `offset` and `limit` (1–200, default 100). Follow `hasMore` for pagination. `truncated` means the directory scan reached its entry/depth limit; referenced Main assets are checked separately. Symlinked directories are skipped.

Each usage names the page, element if applicable, exact source field, original source string and current page revision. Reuse a valid `path` through an `element.add` operation instead of duplicating asset bytes. To repair an image, import the replacement using the existing image import service, then patch only that image's top-level `src` and `sourceName` with the expected page revision. Preserve its position, size, crop and unrelated content.

`unused` means **unreferenced by current Main pages**. Archived versions, other projects or source material can still depend on it. This tool does not infer deletion safety or delete assets.

## CLI equivalents

```sh
huandeng --entry /path/to/deck.pptd brief
huandeng --entry /path/to/deck.pptd brief S18A
huandeng --entry /path/to/deck.pptd brief S18A --presentation talk --occurrence talk:return:PAGE_UUID
huandeng --entry /path/to/deck.pptd presentation talk
huandeng --entry /path/to/deck.pptd assets --query figure --filter used --limit 100
huandeng --entry /path/to/deck.pptd assets --filter missing
huandeng --entry /path/to/deck.pptd render S18A --presentation talk --occurrence talk:return:PAGE_UUID
```

The `story`, `history`, `record-version` and `restore` commands retain their existing JSON request formats. The old `frame` subcommand remains a compatibility alias.

Protocol checks use the installed MCP SDK's actual client/server transport, alongside project and asset tests. Desktop integration must separately confirm the active service, stdio discovery, visual changes and persistence. See [project/Agent audit](../../docs/AUDIT-V06-PROJECT-AGENT.md).

## Video delivery

Use `huandeng_export` with `format: "mp4"`, an optional `presentationId` and exact `occurrenceId`, then poll `huandeng_export_status` with the returned `id` as `jobId`. Video is silent H.264 at 720p/1080p and 24/30 fps. Static pages default to 3000 ms, animation endpoints to 1000 ms, and extra cue holds to 0 ms; set `staticDurationMs`, `endHoldMs`, and `cueHoldMs` explicitly when delivery pacing matters. An installed FFmpeg with libx264 is required (`HUANDENG_FFMPEG` or PATH). GIF, animated WebP and self-animated SVG are rejected explicitly. PDF/PPTX retain the base pose and their existing static-animation report. Protocol availability does not certify installation into an actual Agent client.
