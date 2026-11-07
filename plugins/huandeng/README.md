# Huandeng Plugin

Local MCP bridge for Huandeng Editor. Start the editor for the intended document before starting this bridge. All writes go through that editor's current document service.

Tools: huandeng_context, huandeng_page_read, huandeng_selection_read, huandeng_apply, huandeng_render, huandeng_history, huandeng_revert, huandeng_export.

The example configuration is for stdio-capable clients. ChatGPT Web uses the existing authorized workstation connection to call the same CLI. This folder does not install or publish a ChatGPT connector.

Huandeng Frame metadata carries the page purpose, things to preserve, evidence/caption/annotation roles, recipe overrides, and genuine author feedback. Existing external ArgFrame/FSS integrations retain their old protocol names until an explicit migration.
