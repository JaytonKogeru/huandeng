# Editor 0.13 — implementation

## Workspace and document identity

The desktop hosts a workspace shell and one `WebContentsView` per open Project. Each Project owns its renderer, document service, pending drafts and presentation state. Home and recent Projects remain available while documents stay open. Opening the same canonical entry activates its existing tab. Project tabs persist in ordinary desktop preferences.

IPC resolves the sender's Project. Agent configuration, file reveal, native edits, downloads and layout persistence no longer depend on the visible tab. A connection remains bound to its explicit PPTD entry. Closing a tab requests its normal leave/save guard and disposes only its own view and service. A lost renderer is marked immediately; recovery reloads the same connection and distinguishes potentially lost in-memory drafts from unchanged saved files.

Within each Project, the permanent **Slides** document sits beside closable file tabs. Files uses the center; choosing a Slide or placeable Asset returns to Slides. Canvas, Inspector and Notes stay mounted, preserving drafts. Previews remain read-only, with existing path/type/size/realpath/revision checks. Their keyboard/native edit events cannot modify the obscured Slide. Ctrl+W closes a file before the Project.

## Navigation and presenting

Pages has **Thumbnails** and **Outline** over the same Slide/Section model. Outline shows title, Position, stable Slide ID and a short Story or Slide summary. Search exposes matching folded members without changing the current folding state. Section controls live in Pages; Project has a compact entry to the same manager and draft owner.

Normal Section editing chooses a first Slide, continuing in Main order to the next first Slide or deck end. Older range/member definitions remain readable and can be explicitly converted after validation. They are not silently rewritten. Shared revisions, Save and Undo remain. Folded covers gain restrained stack shadows and preserve the clicked heading's viewport anchor.

Present requests native fullscreen, hides the Project strip and restores the preceding fullscreen state on exit. Transitions are serialized, including rapid enter/exit and renderer loss. Controls start hidden; the bottom 28 pixels or keyboard focus reveals them. Leaving the edge hides them after 600 ms. Clicking a control does not pin the bar open.

## Project Activity

`huandeng_activity_report` and `huandeng_activity_read` extend CLI/MCP to 20 advertised tools. The authenticated local API provides bounded reads, reports and an event stream. Reports identify deck, client session, task, request, actor and stage. Service-generated writer receipts are labeled separately; clients cannot choose that source label.

Activity displays reported stages and save outcomes, not a terminal emulator, model runner or hidden-reasoning feed. Two conversations bind explicitly to separate Projects. The existing single writer, revisions and idempotent transactions still govern all changes. Runtime storage is bounded to 300 events and 2 MiB including receipts. A malformed old log is preserved; an Activity error does not disable editing or delay a failed save response.

## Position and history

Opt-in `content.field: main-position` resolves Main Position in canvas, thumbnails, show and exports. Stored text is a fallback. Reordering or changing preceding Slides updates the display without changing this page's source revision. Ordinary numbers are never inferred to be Position fields.

The Inspector offers **Use Slide Position**. Turning it off freezes the displayed value; styling remains editable while enabled. History stores the then-current display Position separately from content integrity. Restoring artwork uses its current Main Position. Notes, Story, actual text and artwork remain meaningful history. See [Position fields](POSITION-FIELDS.md).

## Export, Windows and clients

Publishing exports saved PPTD to Project `Exports/deck.pptx`, validates package/page/notes/diagnostics, then atomically mirrors those bytes to a configured fixed shared filename. Saved-source fingerprints skip unchanged Projects and detect changes during rendering. Failed export or locked destination retains the preceding valid file. Save events debounce publishing; an inspectable Task Scheduler entry uses `wscript.exe` and a windowless wrapper as closed-editor fallback. The process lock handles simultaneous triggers and delayed stale-owner recovery. See [PPTX publishing](PPTX-PUBLISHING.md).

Windows registration names **HUANDENG Editor**, sets the `.pptd` open command and refreshes desktop/document icons while preserving protected UserChoice. The supplied black mark has transparent surrounding pixels in desktop PNG/ICO and app SVG/favicon assets. Account-plugin presentation metadata is preserved.

The 0.13.0 authoring plugin requires approved-page inspection, concrete typography/spacing, original evidence, content-specific composition and rendered review. It rejects decorative card/rule repetition as a default and records only meaningful changed-page milestones. Explicit Project routing and optional Activity reports are part of that workflow.

PPTD remains the editable source. PPTX export uses supported native objects and declared per-element fallbacks; arbitrary PPTX import and live Google Slides editing are not implemented. See [Workspace UX](WORKSPACE-UX.md) for the product audit and remaining PowerPoint gaps.

## Privacy

This repository contains Editor source, synthetic fixtures and selected validation evidence. Private Projects, figures, inventories, client paths, publisher configuration, operational receipts and installation backups stay on the workstation. No public endpoint, reverse proxy, new remote executor or research-data upload was added.
