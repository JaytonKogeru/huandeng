# Editor 0.13 — handoff

## Runtime and installation

The accepted and installed Editor is **0.13.0**, built at `2026-11-09T06:18:33.3911264Z` from clean runtime source **`0a30f1e40b2b619bd04a9fac6cc63c30a0e84a70`**, using Electron **38.7.2**. The later delivery commit contains documentation and selected synthetic evidence; it does not replace or rebuild the accepted runtime.

The exact final package passed **14/14** native workspace checks with zero renderer errors and a normal exit. The accepted source gates include **82 distinct focused Vitest tests across 13 files**, plus five desktop recovery, 17 publisher and eight portable-client checks. Native PowerPoint opened, edited, saved and reopened the five-slide synthetic export described in [Validation](VALIDATION-V013.md). [Selected evidence](evidence/v013/README.md) keeps its artifact/module identities separate from the final desktop package identity.

The final ordinary-profile installation completed on 9 November 2026. It staged and hashed the accepted application before requesting normal close, retained the preceding package, verified the installed bytes, and reopened two configured Projects in one workspace using native secondary launches. Both new Project services were writable and had no diagnostics. The previously active Project was restored. Current Project sources and the unrelated canonical fixture remained unchanged after normal close. The installation did not discard drafts, force termination, restore historical Project content or rewrite preferences. Detailed receipts remain private.

## Client and document delivery

The existing account authoring plugin and native Codex, Claude Code and DeepSeek Harness adapters are **0.13.0**. Native client inventory and an independent stdio protocol doctor verified the expected **20 tools and two guides** against both configured Projects. Existing account binding is retained. An already-running chat can keep cached instructions; account publication is not a claim of a hot reload in that chat.

The supplied transparent icon is installed in the desktop/document association. Windows association resolution and Desktop/Start Menu shortcut targets were checked against the installed application. Ordinary numeric text is not converted heuristically: the requested private Position-field migration used an explicit shared-writer transaction and semantic before/after checks. Notes, Story and authored artwork were preserved; future position-only changes do not create content versions. Private publication and authoring evidence stay outside the repository.

The two configured Project PPTX outputs and their fixed shared copies were validated, including retained Notes. A real saved-content change exercised the automatic publishing trigger. A destination opened in PowerPoint initially rejected atomic replacement; its preceding file remained intact. A separately authorized, saved-only normal close/publish/reopen restored that document and its view. Subsequent Office/OneDrive use changed ZIP timestamps while every entry payload remained identical, exposing a raw-hash-only false positive. The final publisher recognizes this fully validated content equivalence without replacing the open file. It never closes Office or discards changes. OneDrive cloud upload completion has not been independently verified.

The reviewed **HUANDENG-ShareBox-Slides** task is installed and enabled, using `wscript.exe` with a windowless child, a ten-minute trigger, Interactive/Limited identity and overlap prevention. An actual `Start-ScheduledTask` run at **2026-11-09 06:27:08 UTC** completed with **LastTaskResult 0** and returned to Ready. Both configured Projects reported `current`: one shared output was byte-identical; the other had distinct recorded raw hashes and an identical validated all-entry content hash. The task did not modify either Project source or either output, and the open PowerPoint document's saved/view/window state remained unchanged. The prior task configuration and private acceptance receipts are retained outside this repository.

## Invariants for subsequent work

- Project identity follows the explicit canonical entry and sender renderer, never the visible tab.
- Home/tab switches keep mounted document state. Close requests use existing draft/recovery guards; never force-close production to install.
- Keep one shared Project organization draft and one document writer. Normal Sections use first-Slide boundaries; do not silently rewrite legacy membership.
- File previews are inert/read-only and central. Preserve focus isolation and mounted Notes/Inspector drafts.
- Native fullscreen has a serialized transition controller. Presenter focus must not be stolen by a delayed canvas-selection intent.
- Activity client reports and writer receipts are separate, bounded and local. A reporting failure cannot corrupt or delay document writes.
- Only explicit `main-position` fields are derived; arbitrary numeric text remains authored. History display context must not alter content integrity or reuse a historical revision for a current write.
- Publisher validates Project output before an ordinary-file atomic shared copy. Preserve old valid output on failure/lock. Keep the v3 stale-lock retirement mechanism; deleting retirement directories while another publisher may be running reintroduces an ABA race.
- Keep `.pptd` registration, installed-runtime discovery and client configuration separate from account-plugin availability. Do not broaden permissions or add a public tunnel.
- Use current read/preview/apply and meaningful changed-page versions for private work; never copy research Projects into Editor fixtures, docs, plugin archives or Git history.

## Remaining product work

Prioritize PPTX import/round-trip, a true presenter display, native animation export, reusable master/layout semantics and richer source/reference management as separate designs. The current Activity surface is enough for explicit parallel client tasks; a built-in autonomous model runner is not implied. [Workspace UX](WORKSPACE-UX.md) records the PowerPoint feature audit and design rationale.

The Windows isolated source worktree is `<workspace-checkout>`; canonical is `<editor-checkout>`. Preserve the unrelated modified canonical fixture. Push only a tested milestone to origin and retain upstream attribution.

## Origin milestone

The release target is origin `main` and annotated tag **`editor-v0.13.0`**. The tag identifies the final documentation/evidence delivery commit; the installed runtime source remains the clean commit recorded above. The delivery procedure fast-forwards canonical main while preserving the unrelated fixture, pushes main and the tag together, and verifies both remote refs. Repository visibility and existing historical commits are unchanged. Public visibility still requires the separately scoped historical-data cleanup described in `WEBCHAT.md`.
