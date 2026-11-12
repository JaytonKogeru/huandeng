# HUANDENG 0.21: page actions and visible agent work

Date: 2026-11-12 (Australia/Sydney). Baseline: `9a813426dfd55feb29d09ac60aa7893929ae410d`.

## Scope and author decision

The author accepted the introduction's narrative, structure and visual style in this round and asked to freeze them. Preserve all six sequences and their original Story. Only complete missing identity marks and reference destinations on the relevant cover, architecture and acknowledgment pages; retain title-only Section pages without logos, page numbers or watermarks. Preserve earlier named versions as historical records. The History screenshot supplied by the author shows an older selected checkpoint, not a rollback of current Main.

The Editor work follows Audit, Spec/Frame, Implement, Validate, Release. Framing is part of specification. This specification covers the new work; previous 0.20 test results do not certify it.

## Audit findings

- `section-browser.tsx` serves both Browse and Outline but offers only History and movement. `thumbnail-rail.tsx` already has safe page actions. Reuse those document operations.
- `.hd-browser-moves` right-aligns actions across the full Outline row, separating them from its title. `pptd-outline.ts` can repeat the title as its purpose summary.
- Current presentation launch reads the selected page from a closure. A context action must carry its actual target rather than select another page and immediately launch using stale state.
- `ProjectActivity` already records explicit client reports, actual writer receipts, task/session identity and stable page IDs. It does not observe an external model process. Its SSE heartbeat describes the Editor/writer stream, not agent liveness.
- The inherited non-PPTD `AgentPresence` belongs to an internal runner and cannot establish ChatGPT, Claude Code or DeepSeek activity on PPTD pages.
- Current credit tables identify contributions but the ChatGPT tables omit destinations and identity marks. Rich-text rendering and native PowerPoint link export need separate verification before claiming clickable delivery.

## Frame: page actions

Place a discoverable More button beside each Browse card's identity and beside the title/summary area in Outline. Right-click and the keyboard context-menu command open the same actions. Keep the preview as the dominant card content. In Outline, keep actions and status adjacent to the text rather than at the viewport's far right. Omit an identical repeated title in the summary without editing Story.

| Context | Actions |
| --- | --- |
| All current appearances | Open Normal, present from this appearance, Story, Notes, page History, copy Slide code, show source in Files |
| Main | Insert blank before/after, duplicate, move up/down, hide/show, remove from Main through the existing recoverable path |
| Presentation | Go to Main and arrange this Presentation; preserve the exact occurrence identity |
| Pinned appearance | View the recorded artwork and inspect Main identity/history; retain read-only behavior |

Use existing draft/composition/history guards and revision-aware writer operations. Do not silently save or discard drafts to execute a menu action. Search/collapsed-group movement restrictions remain. Main deletion is never substituted for removing a Presentation appearance. The explicit target includes pageId, occurrenceId and versionId where present. Menus support keyboard focus, Escape and normal focus return. A real browser test must verify launching page B while A was previously selected.

## Frame: page-level agent reports

Show a small identity/status row below the page identity in Browse/Outline and a compact indicator in the thumbnail rail. Show fuller details near the selected page's workspace heading. These are Editor decorations; never place them inside slide content or export them.

Use a single pure projection of existing Activity, not another task store or locking service. Group by sessionId and taskId, keep different tasks distinct even when their agent family matches, and filter by current project/page identities. A page may show multiple concurrent reports. Clicking a status opens the existing Activity evidence, with the relevant page in context.

- Add optional `agentFamily` and `phase` to explicit Activity reports. Phase is audit, spec, implement, validate or release. Existing status values remain compatible.
- The family catalog groups ChatGPT/Codex, Claude/Claude Code, and DeepSeek Harness. Reserve pi, Zcode/GLM, WorkBuddy, Grokbot/Grok, Gemini, Antigravity and Hermes as extension identities. Reserved entries are visibly unconfigured, not claims of installed or verified connectors. Preserve an Other/unknown identity.
- Prefer an explicit family. Infer a legacy family only from an unambiguous known actor alias. Never infer model identity from a filename or last writer.
- The latest report sets task status. An omitted pageIds field inherits that task's latest explicit scope; an empty list clears it.
- Only reports from the current writer epoch can be current. Running/waiting reports expire after five minutes without an update; label stale reports as not recently updated, never online or editing. Stop showing stale page badges after thirty minutes. Completed/failed/cancelled reports remain briefly visible for two minutes, then remain only in Activity.
- Show the report time and stage. A running report without a phase says Working rather than Editing. Completion remains an explicit task report; a successful save is a separate fact.
- Associate saved operations only by exact IDs resolved to actual writer events for the relevant page. A matching timestamp is insufficient.
- Do not lock pages, block the human editor, expose reasoning or show private commands. Existing revision conflicts remain the write-safety mechanism.
- The CLI/MCP advertises the optional report capability. With an old writer, send the legacy payload and return explicit information about omitted unsupported fields. Do not claim the new page-status UI exists in an old running Editor.

The shared skill tells agents to name their page scope, report stage transitions and report completed/failed/cancelled truthfully. Periodic updates are useful while work continues; a background timer must not keep a stopped agent looking active. The interface acknowledges that it displays reports, not independent process monitoring.

## Connection workflow adjustment

Desktop Agent setup presents the existing DeepSeek native-bundle route as the normal DeepSeek choice. Generate `deepseek-native` configuration for the installed `huandeng` plugin entry; do not automatically install the bundle, start a model, change an account or replace unrelated settings. Retain the separately labelled `deepseek` legacy patch route for profiles without the native bundle and explain that both routes must not be enabled together. The desktop bridge, generator allowlist, instructions and native-copy tests must agree on the client ID. The three supported identity families and future reserved entries remain distinct from a particular user's installation or connection status.

Canonical progress guidance and the running Story/operations resources specify family, phase, stable conversation/task/page scope, meaningful ongoing reports, exact save receipts and truthful terminal outcomes. Five-minute expiry marks an old report; it does not monitor an external process. An unattended heartbeat must not keep stopped work visible as active. Older writers retain their legacy report shape with unsupported optional fields reported explicitly.

## Credits, identity and destinations

Keep the approved native tables and their contribution wording. Add readable destination text and, where verified, real official identity marks. Open-source references use their actual repository host; closed products use their official website. A project with no verified official mark keeps its name rather than receiving an invented logo. A website's ambiguous source link must be checked against the destination project's identity.

Use this author's own existing assets or independently acquire originals into its project. Do not transfer assets between ChatGPT, Claude or DeepSeek editions. Same-author bilingual use remains documented. Add the genuine HUANDENG mark where it establishes the project's identity; keep title-only Section slides untouched.

If native link export is implemented, support safe public web URLs in rich-text runs and table cells, retain surrounding formatting, and verify the PowerPoint relationship and PDF annotation. The ordinary editor must not navigate away when a text object is selected. Do not add invisible overlays or flatten an editable table to imitate linked text.

## Validation and release

Validate the meaningful risks: exact menu target and occurrence, keyboard operation, draft/readonly protection, safe Main mutations, multiple agent tasks, expiry/terminal/old-epoch behavior, legacy compatibility, exact receipt association, scoped project isolation and source/export link fidelity. Inspect real English/Chinese UI at ordinary and narrower window widths. Review only changed slide pages plus their export and verify the frozen sequence/Section content stays unchanged.

Run the required repository check and affected type/build tests, with a Changeset for core public changes. Keep existing user fixture changes and the original founder account untouched. Package a self-contained Editor and native plugin candidates inside this repository and document actual runtime/client versions. Use a tested milestone commit/push and the existing release policy; no npm publication or repository-visibility change is implied.

## Native DeepSeek setup refinement

The connection guide defaults to `deepseek-native`, generating the existing native `huandeng` plugin override. The previous `deepseek` patch remains an explicit compatibility option for profiles without the native bundle. Never enable both routes in one profile. Configuration generation retains model/account settings and does not start a writer or agent. The first task verifies the exact Project and reads its guidance before editing.
