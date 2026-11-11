# EKZK Notes fact patch — 2026-11-12

Page: `EKZK` (`adf2f702-72d3-40bf-876c-bdd59f216edf`), Main position 20.

## Exact saved Notes

> This is the collaboration page. Codex and Claude Code use the local plugin; ChatGPT reaches the local editor through the authorized workstation route; DeepSeek Harness mounts the bundle. They share one writer, so different pages can be saved independently, but two edits to the same page conflict even if they touch different objects. Main page order is tracked by the manifest revision; Project Story, Sections, the Presentation configuration and the order of pages within a Presentation are tracked by the metadata revision. Activity shows declared stages and saved receipts, not live presence or an automatic section lock. A content-to-design handoff works through saved operations and revisions: read the saved state, then preview, apply and render the focused change.

The replaced sentence was: “Project Story, Sections and order share a metadata revision.” Only the version-boundary sentence changed; the rest of the Notes is verbatim.

## Receipt

- Request: `deepseek-en-2026-11-12-ekzk-notes-01`
- Operation: `78fc45b3-31d6-4b38-9e5c-6572eaa42c0d`
- Summary: `page.notes.set`
- Page revision before: `sha256:7f419cbb21e83c693d88218bd902431548300150e5762cd170be0a6e0a2a5889`
- Page revision after: `sha256:d6ebe9f946e371adcb0941fa060fa077fb0319a6a631866fe323e112bf8eedfc`
- Render revision after: `sha256:e78c9e1369395033b50036b9cbe09b3369ca7584aa5a19c8658b2a667d9db980`
- Review: the saved operation lists exactly one change, `Page → notes`. No element, asset, metadata or manifest change occurred; metadata remains `sha256:fe72aec7…` and the manifest remains `sha256:19298e72…`.
- No other page, asset, presentation item or rule was modified. README and `speaker-notes.md` were not edited in this turn.

## Affected outputs

- `Exports/deck.pdf`: 24 pages, 6,350,953 bytes, SHA-256 `91f0731c1760cb795cf97461449db28e0733865d7775291f4f9463167d5ce4ba`.
- `Exports/deck.pptx`: 24 slides, 6,589,973 bytes, SHA-256 `04b930e3d6757b42380f82baa19db1ea7ab251ad431ebece62f8005673c749a0`.
- The PPTX Notes for slide 20 were read back directly: the new text is present, the old “Project Story, Sections and order share a metadata revision” sentence is absent, and both “manifest revision” and “order of pages within a Presentation … metadata revision” are present.
- The EKZK page render was inspected; its visible slide content is unchanged because only Notes changed.

## Unaffected outputs and alias

`EKZK` is not in the existing six-slide `short-introduction` presentation. Therefore `Exports/brief.pdf` (`4e691ab3…`), `Exports/brief.pptx` (`bb995187…`), the writer's short-name outputs, and `Exports/brief-alias.json` are unchanged; they were not re-exported or rewritten.
