# HUANDENG Editor 0.20.0 candidate

This candidate adds visible Project rules and aligns the built-in authoring guidance with the author's story. It is prepared for review; packaging does not establish acceptance of the example slides or publication of a release.

## Project rules in the Editor

The Project tab now displays the current root `AGENTS.md` supplied by the existing `projectGuidance` snapshot. It preserves the author's text and shows its source, missing/unavailable states and truncation. Open AGENTS.md opens the canonical file in the existing read-only workspace preview. Refresh Project rules rereads the snapshot and updates an already-open full preview. There is no second rules store or generated summary.

## Authoring guidance

The canonical HUANDENG skill, its references, runtime agent guide and newly initialized Project guidance use Audit, Spec, Implement, Validate and Release. Framing belongs in Spec. Agents must preserve user intent and must not rewrite rules to justify their own plan.

The guidance keeps tutorials inside the story, requires spatial context around instructional screenshots, preserves genuine title-only chapter pages, calls for professional scientific figures from retained data and scripts, and protects necessary acknowledgements. Independent author trials require independent active asset acquisition. Bilingual editions follow the user's alignment request. Project-specific visual prohibitions remain project-specific; no aesthetic score is introduced.

MCP initialization now reports the canonical plugin version instead of the stale `0.9.0` literal. Existing operation schemas remain compatible. The MCP surface adds two project-bound acquisition tools, for 24 tools in total.

## Independent image acquisition

`huandeng_asset_import` acquires an original public HTTPS image or supplied base64 bytes and imports it through the existing writer. It validates project identity and writability before acquisition. Public downloads reject credentials, private/reserved destinations and unsafe redirects, pin validated DNS addresses, and limit type, size and total time. Image validation, SVG safety and content-addressed storage remain with the existing writer import implementation.

`huandeng_editor_capture` captures the real complete web Editor in an isolated browser using existing page/object IDs and fixed workspace, sidebar, Inspector, language and viewport choices. It accepts no arbitrary script, URL, output path or click sequence. All browser writes and global human-selection broadcasts are prevented. It verifies the source revisions are unchanged before importing the PNG. Files and Assets wait for their real asynchronous content. Optional states open the existing Export dialog without exporting, select an existing named page version without restoring, or open an actual saved receipt already present in this Project Activity. Review verifies the receipt belongs to the captured Project and page; absent or mismatched records fail. Native Electron dialogs such as Agent setup remain outside this interface; management views keep their actual Inspector visibility. The operation guide documents existing non-destructive image-instance crops with normalized edge fractions and proportional bounds.

These tools work from an updated MCP CLI against an existing compatible 0.19 writer. They require no change to shell permissions, account ACLs or a running canonical writer. Each author chooses its own original source and capture state; no prepared asset pool is supplied.

## Versions and candidates

- Editor milestone: `0.20.0`; canonical and client plugin manifests: `0.20.0`.
- Core npm package: `2.3.1`, with the Rules/version fix recorded as a patch in `.changeset/project-rules-guidance.md` and the new public tools recorded as a minor change in `.changeset/native-asset-acquisition.md`. The Editor milestone does not consume unrelated pending changesets.
- Self-contained Windows candidate: `dist/HUANDENG-v0.20.0-win32-x64`.
- Portable Claude Code/Codex plugin: `dist/plugin-packages/0.20.0/portable-claude-codex/huandeng`.
- Native DeepSeek Harness plugin: `dist/plugin-packages/0.20.0/deepseek-native/huandeng`.

## Verification and handoff

41 focused tests passed, including the real MCP initialization handshake over an in-memory transport. Core TypeScript, full `pnpm check` and the production build passed. The full check reports only the existing DeepSeek adapter informational style suggestions.

The final packaged Editor passed self-containment checks before and after staging. A separate fixture writer served real browser checks in English and Chinese: exact root rules, complete file access, visible refresh updating both views, correct Project selection and no browser errors. Screenshots were inspected. The first packaged stdio MCP process independently reported `HUANDENG Plugin` version `0.20.0`. The subsequent acquisition addition passed 94 focused tests, Core TypeScript, the full check and production build. A new 24-tool MCP process was tested against an unchanged isolated 0.19 writer: private-address rejection, an actual public HTTPS original-image import, three real EN/ZH Editor states, and unchanged source page revisions and global human selection. The 0.20.0 desktop candidate and both plugin layouts were rebuilt from that tested source. The final self-contained executable independently passed the 24-tool/0.20.0 stdio handshake, a real Editor PNG capture and public HTTPS image acquisition against the unchanged 0.19 fixture writer; page revisions and global selection stayed unchanged.

The final capture-state update passed 42 focused tests and two real-browser readiness tests with deliberately delayed Files and Assets responses. Five actual UI states were captured against the unchanged 0.19 fixture, including Export, a named History version and saved receipt Review. Source revisions and human selection remained unchanged. The final Core build, both plugin layouts and the desktop candidate include this update and the current crop guide. The final packaged executable independently returned its own current operation resource, advertised all three capture parameters within the same 24-tool surface, and captured the real Export dialog without starting export. The resulting screenshots were inspected.

The candidate build marker records the source revision and `sourceDirty: true` at packaging time. Packaging left existing 0.19 runtimes and canonical project writers running. Packaging itself does not install the candidate, switch a runtime or publish a release. Final source review and the user's slide acceptance remain separate release decisions.
