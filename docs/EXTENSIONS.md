# Extension interfaces

HUANDENG v0.10 exposes its existing document service and bundled Agent bridge. An external material library can supply assets to the same document writer. A general provider registry and plugin marketplace remain future work.

## Available interfaces

| Task | Existing interface | Contract |
| --- | --- | --- |
| Read document and selection | `huandeng_context`, `huandeng_page_read`, `huandeng_selection_read` | Discover actual IDs and current revisions before editing |
| Read organization and Story | `huandeng_presentation_read`, `huandeng_story_briefing`, `huandeng_project` | Preserve occurrence identity, live/pinned content, notes and truncation |
| Search project Assets | `huandeng_assets_list`; local `GET /__pptd/assets` | Respect pagination, usages, missing references and scan truncation |
| Filter placeable images | `GET /__pptd/assets?kind=image` | Filter before counts and pagination; omitted kind retains the all-files API behavior |
| Import an image | Local `POST /__pptd/assets/import` with `name` and `base64` | Store supported source bytes; importing and placing an object are distinct operations |
| Propose an edit | `huandeng_preview` / CLI `preview` | Validate and report bounded impact without document writes |
| Apply an edit | `huandeng_apply` / CLI `apply`; local `POST /__pptd/transactions` | Shared writer, expected revisions, idempotent request ID, optional exact preview hash |
| Inspect output | `huandeng_render`, `huandeng_export` | Inspect committed content or the exact requested occurrence |

The desktop service is bound to loopback. The SDK discovers the session for the explicitly selected entry and uses session authentication. `/__pptd` is not a Streamable HTTP MCP server. The bundled bridge exposes local stdio MCP; ChatGPT uses the user's existing workstation connection.

Implementation references: [`pptd/mcp.ts`](../packages/core/src/pptd/mcp.ts), [`pptd/asset-library.ts`](../packages/core/src/pptd/asset-library.ts), [`app/lib/pptd-backend.ts`](../packages/core/src/app/lib/pptd-backend.ts), [`vite/routes/pptd.ts`](../packages/core/src/vite/routes/pptd.ts), and [Plugin documentation](../plugins/huandeng/README.md).

## Proposed asset-provider boundary

This is a design contract, not an installed provider API:

1. **Search** returns bounded, paginated records with provider ID, stable asset ID, title, media type, preview, original dimensions, attribution and usage rights when known.
2. **Resolve** obtains the selected original bytes and source metadata. Credentials stay with the authorized provider/client. A preview does not replace original-resolution content.
3. **Import** stores bytes through the existing import path and returns a Project-relative path. Supporting documents and scripts remain supporting files.
4. **Place** applies an ordinary `element.add` image operation against the selected page and expected revision. Manual and external placement share Undo, save, rendering and export.
5. **Reopen** resolves imported assets from the Project, so a provider outage does not break saved slides. Remote search state belongs to the provider; authored objects and imported originals belong to the Project.

Provider failures retain the user's draft, report whether import occurred, and avoid duplicate placement on an identical retry. A library integration should expose Search and Import/Place within Assets, rather than adding another competing toolbar.

Arbitrary plugin code execution, a marketplace, provider credential management and public network hosting need separate product contracts and validation. They are not implied by this release.
