# v0.13 — Workspace specification

## Project workspace

- Home is always reachable without closing Projects. Open/recent/file-association requests open or focus a canonical-entry Project tab.
- Each open Project retains its renderer, selection, drafts, Undo and service. Switching is visibility-only. Closing flushes only that Project; a failed flush preserves it. Application close flushes all open Projects before shutdown.
- All IPC, file/reveal/agent/native-edit operations and leave handshakes route by sender to its Project. CLI/MCP still require explicit canonical entry and retain one writer per Project.
- Central document tabs keep Slides available. File previews open read-only content in the center; scripts, Markdown and JSON are inert. Closing or switching preview does not lose slide/Story/Notes drafts or send file shortcuts to the canvas.

## Pages and Sections

- Pages exposes Thumbnails and Outline using the same Section grouping, slide identity, selection and drag/drop semantics. Outline presents title, Position, Slide ID and a short Story purpose.
- Section management opens from Pages/Section headings; Project exposes a compact route instead of every Section card. Keep one Project organization draft owner.
- New/edited Sections use first-Slide boundaries through the next Section. Legacy range/member metadata remains readable and converts only through an explicit validated operation. Stable Section and Slide IDs remain unchanged.
- Folded cards use modest shadows and offsets, with visible counts and stable scroll anchoring.

## Presentation

- Starting a desktop show enters fullscreen directly and restores the workspace correctly on exit. Fullscreen routing must identify the presenting view.
- Controls are hidden initially. Only approaching the bottom edge or explicitly focusing controls reveals them; leaving hides them after a short delay. Navigation works while controls are hidden. No permanent gradient or hint covers slide content.

## Activity and authoring

- A per-Project Activity view displays bounded, timestamped task status and actual writer results, identified by client/task/session. External clients can report a concise plan/stage/result through the existing local bridge.
- The UI never fabricates model thinking or activity from a conversation that did not report it. Multiple Projects and multiple clients stay explicitly scoped; concurrent mutations still use revision checks and the existing writer.
- Add an explicit derived Slide Position text field. Its displayed/exported value follows Main order without rewriting authored page content. Story/Notes edits remain meaningful history changes. Existing ordinary numeric text remains ordinary text until explicitly converted.
- Authoring guidance starts from the user's reference style and original evidence, reviews actual renders, and records named history only for meaningful changed-page milestones.

## Export, application identity and delivery

- Generate a single latest PPTX inside each configured Project first. Validate it, then atomically mirror a real file to the fixed Share Box destination; preserve the last valid destination on lock/failure. No symbolic links for OneDrive sync.
- Automatic publishing must not display a console, steal focus or close an Office document. Use change detection and one publisher lock; keep a quiet scheduled fallback for saved projects.
- Install the transparent supplied mark as application and document/shortcut icon. Register the intended .pptd handler through supported Windows mechanisms without overwriting unrelated application state.
- Report native PPTX support and raster/static fallbacks accurately; no claim of PPTX round-trip or Google Slides editing.
- Validate on synthetic Projects, including concurrent explicit-entry clients, dirty drafts, failures, Home, reopen, fullscreen, file previews, Sections, history and export. Inspect actual packaged screenshots before installation/release.
- Preserve private projects and unrelated repository changes. Publish only a tested Editor milestone to private origin with release notes and handoff; no upstream or npm publication.
