# Product introduction, native clients and project entry — 0.19 specification

Status: implementation and final package/installation checks complete. Native-author correspondence and retained findings are recorded in the validation report. Author acceptance remains pending. Baseline: main at 6e6dd10872d0eb501562bb6051640c15585d70c5, Editor 0.18.0, plugin 0.18.3. This document supersedes the introduction objective in INTRODUCTION-STORY-SPEC.md for the current revision.

## Audit and cause

The owner prefers the current Claude English introduction because it interprets the founder's account and uses that reasoning to explain the product. The other editions over-weight the origin story. At that baseline, project AGENTS explicitly asked for an account of making the tool, and review emphasized narrative causality without a separate audience-usefulness gate. A technically valid, coherent retelling therefore passed the wrong test.

The selected screenshot is deepseek-zh XZJN: six ordinary prose objects and two separators imitate a three-row structure. This violates the existing object rule. The rule exists, but neither loading a guide nor a clean geometry report proves compliance. ChatGPT's own editions must be inspected by the same standard. Product marks, useful original visuals and acknowledgments need an explicit preservation inventory so that a rewrite does not silently discard them.

At the audit baseline, the new-project AGENTS template still defaulted to white backgrounds while plugin guidance did not. That conflict was an inconsistent source of aesthetic instructions, not evidence that whiteness produces human authorship.

The DSH prototype deliberately uses package name huandeng and directory D:/_Proj/dsh-huandeng. Its native bundle and official host integration are valuable. Audit found load-time-only discovery, unstable server names and a collision-loop risk; the formal adapter will retain the host-native approach and shared HUANDENG contract.

At the audit baseline, Desktop accepted .pptd files but not project folders. Assistant setup showed configuration instructions, not proof of an active assistant. The shared writer already serializes saves, accepts independent page revisions and rejects stale same-page edits; project/section/Story metadata can still conflict.

## Product and presentation mission

The audience should leave able to explain what HUANDENG is, open a project, find a page, reuse original material, ask for a scoped edit, inspect the result/history, compose a talk and deliver it. The founder's story selects and motivates that explanation; it does not dictate the literal order or wording of every slide.

Use the author's meaning as source material. Reorganize repetition and weak transitions, add verified product details needed by the audience, and retain personal observations as personal observations. Neither a transcript nor an exhaustive feature catalogue is the target.

Preserve CC English's effective content structure and its current user edit on AVNM. CC Chinese must cover the same substantive claims, demonstrations and steps. ChatGPT and DSH pairs also use a semantic topic map: language-specific reflow is allowed, missing functionality or contradictory claims is not. Each author retains an independent visual direction. Do not use Claude artwork as the style template for ChatGPT or DSH.

## Frame before expansion

For each revised pair, establish the explanation in prose, a topic/claim/use-step map, a preservation list and three representative rendered pages: a practical product action, an evidence-led scientific page and a reusable-project/collaboration explanation. The sequence follows audience questions rather than imposing a fixed slide count. CC English is a maintenance exception: preserve its reviewed composition and user edits, and render changed pages for focused inspection instead of rebuilding three frames or forcing a new sequence. The Chinese counterpart must still cover the same content.

Each topic records the audience question, concrete takeaway, evidence, usable action when relevant, and transition. Review the proposed sequence for product coverage before writing the final notes. Notes carry the spoken reasoning; Story records purpose and preservation constraints.

Use original HUANDENG/client marks, real localized high-resolution UI captures, actual page previews, original scientific evidence, editable plots/tables/equations and meaningful diagrams as appropriate. Add acknowledgments with accurate scope: OpenSlide foundation, OpenPPTD formula conversion, PptxGenJS export and the PPTD inspiration context. Preserve sources and exact scientific values. Never fill missing evidence with invented UI, metrics or testimonials.

A semantic prose list stays in one rich-text object where practical. Genuine two-dimensional comparisons use a native table. Separate objects are justified by actual spatial relationships, scientific panels, evidence annotations or interaction. Repeating label/description pairs separated by rules does not make ordinary prose a diagram. Inspect editable objects as well as rendered pixels.

## Editor scope

Implement one read-only entry resolver for a .pptd file or a folder. Scan only direct folder children: exactly one .pptd resolves, zero gives a useful error, multiple require explicit file selection and list candidates. Do not guess from recency, filename or directory order. Desktop launch/open and CLI entry paths share this rule.

Provide a distinct Open folder action, since Windows file and folder selection have different native dialogs. A folder may have a descriptive suffix such as .huandeng without requiring it; no bulk rename and no association that hijacks every folder. Preserve the existing Windows project-folder icon mechanism, expose explicit marking for existing projects, preserve custom desktop.ini and use the actual entry name. Verify the real visible desktop route: the ordinary C2 installation exposed a hidden File menu even though its internal action had passed. A programmatic menu action is insufficient evidence that a person can reach it.

Assistant UI distinguishes setup instructions, reported task activity and saved operation receipts. Display recent activity scoped to the chosen project and preserve the distinction between a client report and a verified saved operation. Do not label a configured client as online or invent a heartbeat/scheduler protocol.

Synchronize the new-project authoring template with the corrected design contract. Do not overwrite user guidance or slide source files outside the authorized six introduction projects.

Validation established navigation races during restoration and asynchronous opening. Multi-project restore and late open results must honor a later explicit tab or Home choice; background shell updates must preserve focus in a page. A confirmed defect needs a focused isolated regression and an exact-source package rebuild. Display-startup measurement must separate real user foreground activation, background launch and any capture helper's own foreground intervention. A blank image after forced native focus changes does not by itself establish an unassisted startup defect; passive pixels and renderer state are required. Arbitrary sleeps or reloading the user's documents do not establish a fix.

## Native clients and collaboration

Formalize the DSH bundle inside canonical plugins/huandeng source; keep package name huandeng and the intentional local install-directory exception. Reuse shared scripts/skills, produce a complete manifest/license package, stable entry-derived server names and lifecycle-safe discovery reconciliation. Use the actual installed official host API for installation/update. Preserve profile settings, credentials, sessions and current writers. Improve CC integration where a concrete failure warrants it.

Run actual CC and DSH acceptance calls. Test different-page edits on one shared project, stale same-page conflict handling and a sequential content-to-visual handoff with retained intent/evidence. Scope expected revisions to the touched resources; broad unnecessary preconditions should not fabricate concurrency failures. Reported activity and actual operation IDs must agree.

The demonstrated claim is shared-project collaboration with protected saves and coordinated scope. It is not automatic section locking, live co-editing cursors, autonomous scheduling or guaranteed conflict-free metadata edits.

## Implementation ownership and invariants

Root owns the integrated specification, shared authoring guides, six project briefs, ChatGPT pair and final integration. The Editor agent owns entry resolution, folder UI/identity, activity presentation and the initializer. The adapter agent owns DSH/CC integration and native connectivity/concurrency verification. Independent review audits the content and visuals.

All page/manifest/project metadata mutations use the active shared writer, current revisions, exact preview/apply and receipt readback. Preserve stable page identity, unknown fields, useful named history and intervening user changes. No parallel dated project copies. Use the six existing example directories. Keep unrelated tests/fixtures/studio/pages/identities.page unstaged and unchanged.

## Validation and release

First evaluate mission coverage, bilingual semantic correspondence, evidence usefulness and human editability. Then inspect every affected page at presentation size, the full sequence and localized screenshots. Confirm product/client icons and acknowledgment content; inspect native table/prose objects, not just overlap warnings.

Validate folder/file/ambiguity cases, actual Desktop interaction, scoped Activity behavior, adapter lifecycle and real native-client operations. Add a changeset for core changes. Run focused tests, type/build gates appropriate to changed code, pnpm check before commit, and the installed package smoke workflow. Record exact receipts, final source/export hashes and native job results.

Release one coherent milestone with source, package, release notes and handoff. Keep historical evidence historical. Technical checks and agent review do not establish owner approval. Deliver the exact six .pptd entries and containing directories first; editable PPTX/PDF and GitHub artifacts are secondary outputs.
