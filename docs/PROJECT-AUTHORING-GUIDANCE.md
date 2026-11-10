# Project authoring guidance: audit and bounded specification

## Audit

The shared writer currently exposes Project Story and designIntent, but does not discover a root authoring-policy file. The MCP context projection, scoped Story briefing and transaction preview therefore depend on the client remembering instructions from an earlier conversation. Runtime/plugin guides are generic and cannot carry each Project's private style rules.

The existing runtime already resolves an explicit PPTD entry and has a single Project root. Session/Story reads and previews refresh files, while cached current-snapshot reads avoid disk scans. A guidance file can be read at those existing refresh boundaries without a second writer, new outline store or required transaction field.

## Contract

- The canonical, human-editable source is exactly `AGENTS.md` in the selected PPTD root. Do not discover `agent.md`, JSONL, parent-directory policies or nested files. JSONL can record feedback/history; it is not a competing policy source.
- Add optional `projectGuidance` to snapshots, MCP context, Story briefings and transaction previews. Real runtime responses include sourcePath (`AGENTS.md` only), role (`authoring-context`), status, full-file SHA-256 revision when available, bounded text, byteLength, truncation and explicit limits. Missing and unreadable sources have distinguishable states and no raw filesystem error or absolute path.
- Read regular, exact-name UTF-8 files only. Reject symlinks/junctions, escaping/changing paths, non-files, invalid UTF-8 and files over 64 KiB. Read at most 64 KiB + one sentinel byte. Return at most 12,000 UTF-16 code units without splitting a surrogate pair; a shorter returned text retains the full-file revision and `truncated: true`.
- Recheck file identity and stats after opening/reading. A failure returns a bounded unavailable result; it must not prevent opening or editing an otherwise valid presentation. Guidance-only changes refresh exposed context without fabricating slide history or changing page/manifest/metadata revisions.
- The file is scoped authoring context, never executable instructions or authority to override system/developer instructions or the user's current request. Runtime/plugin guidance tells clients to inspect it before editing, honor current user instructions and explicitly handle truncation/unavailability. Exposure improves discovery; it cannot force every model to obey.
- Preview includes the guidance observed during that read. The existing previewHash binds only the transaction; guidance revision is informational and adds no mandatory precondition or new apply parameter. Clients reread/review when the guidance changes.

## Acceptance

Synthetic tests cover precise discovery, missing/empty/error states, text/byte limits, full-file hashes, UTF-8, symlink/path identity guards, updates/removal, automatic context/briefing/preview propagation, no policy execution, and compatibility of existing transaction replay/revisions. No private Project policy or authored slide is copied into the repository fixtures.
