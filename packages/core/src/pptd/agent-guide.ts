export const agentGuides = [
  {
    uri: 'huandeng://guide/story',
    name: 'HUANDENG Story workflow',
    mimeType: 'text/markdown',
    text: `# HUANDENG Story workflow

Work on the explicitly selected, already open PPTD through the HUANDENG tools or CLI. Human edits and agent edits share one writer. Do not edit .page, .pptd or .huandeng/project.json with a filesystem tool.

1. Read huandeng_context. Confirm the deck and writable status. Read huandeng_selection_read when the request refers to selected objects. Read huandeng_story_briefing for the intended Main, presentation or exact occurrence. Read huandeng_page_read before editing a page. Use huandeng_presentation_read for a complete sequence; honor briefing truncation.
2. Explain the intended audience, question, supplied evidence and takeaway. Use the existing four Story layers rather than creating another outline database. Preserve author keep constraints, original figure pixels/aspect ratios, labels, scientific values and untouched layout. Identify missing evidence; do not manufacture results. A page UUID identifies shared content. An occurrence identifies one use, and its position can change. A pinned occurrence is read-only and its revision is not the current Main revision.
3. Form a concrete plan appropriate to the request: existing page/occurrence IDs, intended title and purpose, evidence objects, speaker notes and click steps. Explain the effect of changing shared Main content. Reuse valid assets from huandeng_assets_list. Pages and pictures without an authorized change stay intact. Do not invent a visual-variant feature: use explicit independent pages or named-version pins when needed.
4. Read huandeng://guide/operations before constructing operations. Prepare one TransactionRequest with a unique requestId, deckId, actor, current expected revisions and focused operations. Record the understood request in designIntent via metadata.patch in the same proposal where appropriate; preserve existing purpose and keep. Agent Story records are interpretations, never human approval. If huandeng_story_record is used separately, read its new metadata revision before preparing the content transaction.
5. Call huandeng_preview with that transaction. Inspect changes, file/page impact, reused occurrences, diagnostics and all truncation flags. A usedBy entry with versionId is a pinned appearance whose artwork is unaffected by a live Main content edit. The preview does not save. New-page IDs and paths in a preview are provisional; use the apply result's createdPages for future work. For a review-only request, present the proposal and stop before applying. For already authorized edits, continue without inventing another permission gate.
6. Apply the unchanged transaction with huandeng_apply and the returned previewHash. That hash binds the payload; it is not approval. On an uncertain result retry the identical requestId and payload. On REVISION_CONFLICT, re-read the changed source and create a fresh proposal that preserves the intervening work. Do not replace the user's revision with a freshly read hash while keeping an unreviewed stale payload.
7. Read changed pages and their current revisions. Render the actual changed page or exact presentation occurrence with huandeng_render and inspect it when the client supports images. If images are unavailable, report that limitation and ask the editor/user's visual surface to inspect; do not claim visual verification. For animation, a static render shows only the base state: check the click sequence in the editor's preview/live show.
8. Report applied content, scope and material limits. Record a named page milestone with huandeng_version_record only for a meaningful completed version. Undo/history, automatic saves and named versions serve different purposes.

CLI uses the same service: node <huandeng.js> --entry <absolute deck.pptd> inspect|selection|brief|presentation|assets|preview|apply|render. Preview takes a transaction JSON path. Apply takes the same path and --preview-hash <hash>. Guide commands require no open project: guide story or guide operations. Keep private paths and credentials out of shared reports.
`,
  },
  {
    uri: 'huandeng://guide/operations',
    name: 'HUANDENG transaction operations',
    mimeType: 'text/markdown',
    text: `# HUANDENG transaction reference

Every write is a TransactionRequest:

    {"requestId":"unique-request-id","deckId":"from context","actor":"your-client","expected":{"pages":{"PAGE_UUID":"sha256:..."},"metadata":"sha256:...","manifest":"sha256:..."},"operations":[...]}

Use actual values returned by the service, not these placeholders. expected.pages keys are canonical page UUIDs even when an operation accepts a short code. Missing preconditions reject a write. Include the current page revision for any edited page, metadata for Story/project/identity changes, and manifest for page-order changes. Metadata may be null only when that is the actual baseline. Extra stale unrelated page preconditions do not constrain untouched pages.

## Existing page content

- element.patch: {op, pageId, elementId, set: {"content.text":"...", "bounds":[x,y,w,h]}, unset?: ["field"]}. Use actual schema fields read from the object; set/unset use dotted paths. Do not replace an entire object to change one property. Do not set elementId or elementType through patch.
- element.add: {op, pageId, element: {elementId:"unique-id", elementType:"text", bounds:[x,y,w,h], content:{text:"...",fontSize:24}}, afterElementId?: string|null}. Native image objects use top-level src, sourceName and bounds. Reuse a project-relative media/assets path returned by the asset tool.
- element.remove: {op, pageId, elementId}. Removing a group follows the editor's group rules and removes applicable animation targets.
- element.reorder: {op, pageId, elementIds:[every element ID in page.data.elements in the desired complete order, including flat group members]}. Read the existing order first.
- page.notes.set: {op, pageId, text}. This changes Main notes, not occurrence-specific notes.
- metadata.patch: {op, pageId, set:{"designIntent.requestedChange":"...","designIntent.actor":"your-client","designIntent.source":"task reference","designIntent.recordedAt":"actual UTC ISO timestamp"}, unset?:["field"]}. Include metadata CAS. Preserve existing purpose and keep unless the task changes them. recordedAt is optional here: omit it when a real clock is unavailable; do not invent a time or format local time with a misleading Z suffix. Author-review fields cannot be written by an agent.

## Click-driven presentation animation

page.timeline.set takes {op, pageId, timeline}. New BuildTimeline format:

    {"schemaVersion":2,"effects":[{"id":"reveal-a","targetId":"FIGURE_ID","kind":"fade-in","trigger":"click","durationMs":400,"delayMs":0,"label":"Introduce Figure A"}]}

Read the page's actual timeline before editing. Supported effects: appear, fade-in, fade-out, disappear, pulse, move. Triggers: click, with-previous, after-previous. Move uses dx/dy relative to base geometry. Use durationMs 0 for appear/disappear; pulse needs at least 2 ms. Effects max 256, each timed duration <=60000 ms, delay and compiled page <=600000 ms. The first effect must start a click group. Preserve valid existing effects and their scheduling. Do not mix schema 1 keyframe tracks with schema 2 effects or silently convert an existing advanced timeline. timeline:null explicitly removes animation.

page.transition.set takes {op, pageId, transition:{schemaVersion:1,kind:"fade",durationMs:300}}; kind none uses 0. This changes live display. Static PDF/PPTX/PNG do not preserve click animation, and MP4 is timed compatibility output, not interactive presentation.

## Story and presentation composition

project.replace takes {op:"project.replace", project: COMPLETE_CURRENT_PROJECT_WITH_EDITS}. Read context.project first and preserve all unrelated sections/presentations. The project schema is {schemaVersion:1,mainStory:{purpose,audience,takeaway},sections:[{id,title,story:{purpose,audience,takeaway},pageIds:[...]}],presentations:[{id,title,story:{purpose,audience,takeaway},items:[...],notes?:string}]}. A Section may have startPageId:"FIRST_SLIDE_UUID" or range:{startPageId,endPageId}, never both. With startPageId, its stable first Slide anchors a continuous Section through the Slide before the next Section start in current Main order; the final Section extends to the end. The next start can come from another first-Slide Section, a fixed range start, or the first saved legacy member. With range, both stable boundaries define the continuous range. In either mode pageIds is a compatibility snapshot, not the authoritative membership. New slides inside these boundaries join automatically. Without either field, saved pageIds membership and order remain authoritative. Preserve the existing mode unless explicitly changing it. An unavailable first Slide prevents automatic ends from being resolved; missing/reversed boundaries and overlapping Sections require explicit repair before presenting affected references. Never substitute position numbers for stable IDs.

Presentation items are {id,kind:"page",pageId,notes?:string,versionId?:string} or {id,kind:"section",sectionId}. Each repeated page needs its own item ID. Occurrence-specific notes belong to the page item, not the Main page. Keep existing item IDs when reordering. Dynamic sections must be explicitly expanded into page items before giving each appearance its own notes/pin. Never use position numbers as identity. Use a valid named versionId returned by history; do not manufacture one.

## Page organization

- page.add: {op, page?:{elements:[...]}, afterPageId?:string|null, section?:{id,title,frontMatter?:boolean}}. Supply desired initial objects in page; omit the page for a blank page. Optional section creates a first-Slide Section anchored to the new page atomically, through the next Section boundary; following Sections retain their boundaries. This also works at the end. Include current manifest and metadata revisions.
- page.duplicate: {op, pageId, afterPageId?:string|null}. Creates independent content with a new page ID.
- page.move: {op, pageId, afterPageId?:string|null}. Changes Main order, not presentation order.
- page.remove / page.restore: {op, pageId, afterPageId?:string|null}. Restore keeps the original identity.
- page.relink: {op, pageId, path}. Explicitly reconnect a moved page file inside the project.
- metadata.patch with set:{hidden:true} hides a Slide from playback and collection exports while retaining its content, Main position and history. Set hidden:false or unset hidden to show it. Include metadata CAS. Visibility belongs to current Main organization and also controls live and pinned Presentation appearances; restoring artwork does not change visibility. Collection exports default to skipping hidden Slides; includeHidden:true (CLI --include-hidden) includes them. Explicit single-page PNG/MP4 exports remain available.

Page add/duplicate/remove/restore/relink require manifest and metadata CAS; operations that target an existing page also require that page's revision, except page.move needs only manifest and page.relink needs the hash of the new page file. Read exact current revisions before planning. Creation IDs shown by preview are provisional and cannot be referenced in that same proposal. Read createdPages from apply, then form a new transaction to place those actual IDs into a section/presentation. Creation preview is useful for content/impact inspection; its generated identity is not reserved.

The writer also supports recipe.apply, recipe.reset, page.version.restore and history.revert. Prefer the dedicated version_restore/revert tools for recovery workflows. A history.revert operation must be the only operation in its transaction. Recipe resets are explicit; ordinary layout editing should preserve existing manual overrides.

## Preview limits and application

huandeng_preview returns up to 200 changes/files/diagnostics, 100 page impacts and 50 uses per page. It reports totals and truncation. Values above 2000 serialized characters are clipped for review and marked truncated; the original transaction is never clipped or modified. Narrow an overlarge proposal or inspect its exact source JSON before applying it. Structural preview is not a rendered slide and does not establish visual quality.

huandeng_apply accepts {transaction,previewHash?}. When previewHash is present, all transaction fields must match the preview. The writer still performs CAS and ordinary idempotency/recovery. An existing valid apply call without the optional hash remains supported.
`,
  },
] as const;

export function agentGuide(topic: string) {
  const guide = agentGuides.find((item) => item.uri === topic || item.uri.endsWith(`/${topic}`));
  if (!guide) throw new Error('Choose the story or operations HUANDENG guide.');
  return guide;
}
