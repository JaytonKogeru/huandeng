# HUANDING Plugin

External MCP bridge for HUANDING Editor. Open the intended project in the desktop app before starting this bridge. All writes go through that editor's current document service. The editor contains no AI chat or embedded model runner.

Advertised tools: `huanding_context`, `huanding_page_read`, `huanding_selection_read`, `huanding_project`, `huanding_frame_record`, `huanding_apply`, `huanding_render`, `huanding_history`, `huanding_version_restore`, `huanding_revert`, `huanding_export`. Legacy `huandeng_*` calls remain accepted; tools are listed once under the current name.

The example configuration is for stdio-capable clients. ChatGPT Web uses the existing authorized workstation connection to call the same CLI. This folder does not install or publish a ChatGPT connector.

HUANDING Frame carries page purpose, preservation constraints, the requested change and its source. Existing external ArgFrame/FSS integrations retain their protocol names.

## Agent editing sequence

1. Read `huanding_context` and the target page by its stable short code or UUID.
2. Summarize the user's request with `huanding_frame_record`. Preserve prior `purpose` and `keep` unless the user changed them. Record the agent as actor and the conversation/task as source. This record is the agent's interpretation, not human approval.
3. Use the returned metadata revision and current page revision for the focused `huanding_apply` transaction. Do not recreate the deck or renumber stable IDs.
4. Render the changed page and inspect it. Report actual changes and unresolved issues.

Frame request example (replace revisions and timestamp with current values):

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

Retry an uncertain write with the identical request ID and payload. Read again after a revision conflict. `huanding_history({pageId})` lists versions; add `versionId` to inspect one, then use `huanding_version_restore` with current expected revisions to restore it as a new version. Historical previews use current project media.

CLI equivalents are `huanding --entry <deck> frame <pageId> intent.json`, `history <pageId> [versionId]` and `restore <pageId> <versionId> request.json`. Existing `huandeng` executable entry remains an alias.
