# HUANDENG Plugin

External MCP bridge for HUANDENG Editor. Open the intended project in the desktop app before starting this bridge. All writes go through that editor's current document service. The editor contains no AI chat or embedded model runner.

Advertised tools: `huandeng_context`, `huandeng_page_read`, `huandeng_selection_read`, `huandeng_project`, `huandeng_story_record`, `huandeng_apply`, `huandeng_render`, `huandeng_history`, `huandeng_version_restore`, `huandeng_revert`, `huandeng_export`. Legacy `huandeng_*` calls remain accepted; tools are listed once under the current name.

The example configuration is for stdio-capable clients. ChatGPT Web uses the existing authorized workstation connection to call the same CLI. This folder does not install or publish a ChatGPT connector.

HUANDENG Story carries page purpose, preservation constraints, the requested change and its source. Existing external ArgFrame/FSS integrations retain their protocol names.

## Agent editing sequence

1. Read `huandeng_context` and the target page by its stable short code or UUID.
2. Summarize the user's request with `huandeng_story_record`. Preserve prior `purpose` and `keep` unless the user changed them. Record the agent as actor and the conversation/task as source. This record is the agent's interpretation, not human approval.
3. Use the returned metadata revision and current page revision for the focused `huandeng_apply` transaction. Do not recreate the deck or renumber stable IDs.
4. Render the changed page and inspect it. Report actual changes and unresolved issues.

Story request example (replace revisions and timestamp with current values):

```json
{
  "pageId": "Q9R4",
  "requestId": "unique-id-for-this-intent-record",
  "expectedMetadataRevision": "sha256:CURRENT_METADATA_HASH",
  "actor": "claude-code",
  "source": "user conversation / task reference",
  "recordedAt": "2026-11-07T10:00:00Z",
  "requestedChange": "Clarify the caption and retain the figure positions.",
  "keep": ["Keep the two figures in their existing positions"]
}
```

Retry an uncertain write with the identical request ID and payload. Read again after a revision conflict. `huandeng_history({pageId})` lists versions; add `versionId` to inspect one, then use `huandeng_version_restore` with current expected revisions to restore it as a new version. Historical previews use current project media.

CLI equivalents are `huandeng --entry <deck> story <pageId> intent.json`, `history <pageId> [versionId]` and `restore <pageId> <versionId> request.json`. The old `frame` subcommand remains available as a compatibility alias.
