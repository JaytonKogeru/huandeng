# HUANDENG v0.12 specification

## Sections and navigation

1. Persist an optional `frontMatter: true` on one leading Section. Resolve its visible Section Position to 00. Resolve ordinary Section Positions from current Main order starting at 01. Preserve `section.id` independently and expose it for inspection/copying.
2. Folding or expanding a Section retains the rail's local heading position. Explicit selection changes can reveal the selected Slide. Structural changes alone must not jump to an unrelated selected Slide. Folding never changes playback or export order.
3. Offer Create Section at a valid page gap. Show the existing first Slide and resulting range in a small title dialog. Use the following Slide's stable ID through the next boundary, without adding a cover. Flush pending edits and revalidate adjacency. Preserve unsaved Project arrangement drafts instead of replacing them from an old snapshot.
4. Dragging shows before/after drop locations and accepts gaps, including folded Section boundaries. Support rail-edge scrolling. Resolve the requested position by neighboring stable IDs and reject stale targets after flushing.

## Canvas and text

5. Ctrl-wheel changes canvas zoom within existing bounds and retains the cursor's document point. Ordinary wheel scrolling and Shift horizontal scrolling retain their behavior. Text fields and unrelated panels retain native input semantics.
6. During text editing, a scoped context menu offers foreground color and highlight alongside existing emphasis. Formatting applies to the retained selected range and uses the existing commit/Undo boundary. Closing menus and changing focus must not accidentally style the whole object or lose the selected range.

## External clients

7. Portable adapters discover an explicitly selected CLI/install directory, a verified running Editor, or supported local installation locations. Invalid explicit choices fail visibly. Multiple candidates require a choice. A unique verified active Project may be selected for a request scoped to that open Project, and the connection remains pinned.
8. Validate discovery using the existing loopback service, prevent redirects, and exclude tokens from summaries. Preserve the shared writer, revision checks, exact preview payloads, idempotent requests, and recovery semantics.
9. Produce separate local-client and private ChatGPT packages. The local archive contains no workstation account binding. The ChatGPT archive contains the shared skill and existing authorized app binding, without pretending that the web host can start local stdio processes.
10. Use an explicit archive allowlist. Source code, generic examples and licensed product assets may ship. Project data, personal configuration, credentials, authoring receipts and private screenshots may not.

## Validation and release

Run focused model, range-formatting, drag/navigation and discovery tests. Exercise the six authoring behaviors in an isolated synthetic Project in the Windows application, then package and verify the matching runtime. Preserve existing writer/recovery and export contracts. Record failures and subsequent corrections without presenting a different binary's result as acceptance.

Install through normal save/close guards and preserve all current user files. Retain the previous working application. Publish a coherent tested milestone only to the private origin with release notes, handoff and an annotated editor tag. Private authoring uses the installed CLI/shared writer and remains in the user's chosen Project destination.
