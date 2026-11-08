---
name: huandeng-story
description: Create, refine, organize or review Story-driven slides in a HUANDENG PPTD project. Use when the user requests HUANDENG, PPTD editing, Main Slides / Presentation Slides composition, slide Story, figure-preserving edits, or click-by-click presentation builds. Connects to the already open editor through its shared document tools or CLI.
---

# HUANDENG Story authoring

Use the user's conversation and the open project to make a concrete scientific presentation. Keep one document model, one writer, and the original evidence.

## Connect and learn the active contract

Use the supplied `huandeng_*` MCP tools (a client may prefix them with its server namespace). For an authorized ChatGPT workstation connection, use the same `huandeng.js` CLI through that workstation. Confirm the explicit `.pptd` entry; do not pick another project or create a second writer if connection fails.

Read the MCP resources `huandeng://guide/story` and `huandeng://guide/operations` for the running version's workflow and operation shapes. The equivalent CLI commands are `node <huandeng.js> guide story` and `node <huandeng.js> guide operations`. Use the installed executable/runtime indicated by the connection configuration; it may be the HUANDENG executable with `ELECTRON_RUN_AS_NODE=1` rather than a separate Node installation.

If disconnected, use the packaged `scripts/doctor.mjs --entry <absolute.pptd>` to diagnose the local bridge, or `scripts/configure.mjs --client codex|claude|deepseek|chatgpt --entry <absolute.pptd>` to print a configuration fragment. It does not install a client or authorize a model task. Preserve existing client settings. A copied plugin may need `--cli <absolute huandeng.js>`.

## Frame the story, then edit

1. Read context, selection when relevant, and the scoped Story briefing. Read the actual target pages and presentation sequence. Identify audience, question, supplied evidence and intended takeaway. Keep the Main, section, presentation and page Story layers consistent; do not create a parallel outline store.
2. Give a short concrete page/occurrence plan: title and purpose, existing evidence objects, notes, and what each presentation click reveals or emphasizes. Reuse existing assets and original figure pixels. Preserve scientific values, labels, crop, aspect ratio, author `keep` constraints and untouched layout. Flag missing evidence instead of inventing it. Let content determine layout; avoid repetitive cards, gratuitous decoration and generic AI slide templates.
3. Distinguish content identity from appearance: `pageId` is shared content; `occurrenceId` is one use; position is derived. Editing a live Main page affects all live references. A `versionId` in `usedBy` denotes a pinned use whose artwork is unaffected by live edits. Read pinned pages as historical content, never use their revisions for current Main writes. Presentation-local notes belong to the occurrence; independent artwork needs an explicit independent page or a named-version pin.
4. Prepare a focused transaction using the runtime operation reference and current revisions. Use stable IDs and dotted field patches. Record the interpreted request in `designIntent` in the same transaction where useful, retaining prior purpose/keep constraints. An agent interpretation never asserts author approval. If adding `recordedAt`, use an actual UTC clock result; omit this optional field if the clock is unavailable rather than inventing a time.
5. Preview that exact transaction with `huandeng_preview`. Inspect actual field/file/page changes, reused appearances, diagnostics, totals and truncation. This is a structural preview and does not save or render. New-page IDs are provisional; only the apply response's `createdPages` gives final identities.
6. Respect the task's authorization. A review-only request ends with the proposal. For authorized editing, apply the unchanged transaction with `previewHash` without inventing an extra approval gate. The hash binds the payload and does not represent approval. After a conflict, read again and create a fresh proposal preserving intervening edits. For an uncertain response, retry the identical request ID and payload.
7. Read changed pages and inspect an actual render when the client can view images. Check interactive click animation in the editor's build preview/live show; a static PNG does not verify it. State explicitly if the model cannot inspect images. Do not claim an installed client, visual validation or successful save solely from configuration generation.
8. Report the applied changes and material remaining work. Record a named version at a meaningful completed milestone. Do not make a checkpoint after every minor adjustment.

## Keep the product boundaries clear

- All mutations go through HUANDENG transactions or dedicated version tools. Do not edit `.page`, `.pptd` or `.huandeng/project.json` directly.
- Use entrance/emphasis/exit and click groups for live presentation animation. Video is an optional delivery path; static PPTX/PDF/PNG do not carry interactive builds.
- Honor bounded briefing/asset/preview output. Narrow a large proposal or inspect its exact JSON before applying. Do not silently ignore truncation.
- No extra model chat box, cloud copy or public endpoint is required. Client-specific adapters share this workflow and the existing writer.
