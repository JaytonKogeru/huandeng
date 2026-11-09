# Editor 0.13 — handoff

## Runtime and installation

The accepted and installed Editor is **0.13.0**, built at `2026-11-09T05:45:58.5461954Z` from clean runtime source **`886d6460cc3f690b2f153ba51a512e010d0dfb56`**, using Electron **38.7.2**. The later delivery commit contains documentation, selected synthetic evidence and the harness-only canonical-Project preflight correction; it does not replace or rebuild the accepted runtime.

The exact final package passed **14/14** native workspace checks with zero renderer errors and a normal exit. The accepted source gates include **82 distinct focused Vitest tests across 13 files**, plus five desktop recovery, 11 publisher and eight portable-client checks. Native PowerPoint opened, edited, saved and reopened the five-slide synthetic export described in [Validation](VALIDATION-V013.md). [Selected evidence](evidence/v013/README.md) keeps its artifact/module identities separate from the final desktop package identity.

The final ordinary-profile installation completed on 9 November 2026. It staged and hashed the accepted application before requesting normal close, retained the preceding package, verified the installed bytes, and reopened two configured Projects in one workspace using native secondary launches. Both new Project services were writable and had no diagnostics. The previously active Project was restored. Current Project sources and the unrelated canonical fixture remained unchanged after normal close. The installation did not discard drafts, force termination, restore historical Project content or rewrite preferences. Detailed receipts remain private.

## Client and document delivery

The existing account authoring plugin and native Codex, Claude Code and DeepSeek Harness adapters are **0.13.0**. Native client inventory and an independent stdio protocol doctor verified the expected **20 tools and two guides** against both configured Projects. Existing account binding is retained. An already-running chat can keep cached instructions; account publication is not a claim of a hot reload in that chat.

The supplied transparent icon is installed in the desktop/document association. Windows association resolution and Desktop/Start Menu shortcut targets were checked against the installed application. Ordinary numeric text is not converted heuristically: the requested private Position-field migration used an explicit shared-writer transaction and semantic before/after checks. Notes, Story and authored artwork were preserved; future position-only changes do not create content versions. Private publication and authoring evidence stay outside the repository.

The two configured Project PPTX outputs and their fixed shared copies were validated as byte-equal, including retained Notes. A real saved-content change exercised the automatic publishing trigger. A destination opened in PowerPoint initially rejected atomic replacement; its preceding file remained intact. A separately authorized, saved-only normal close/publish/reopen restored that document and its view. The publisher itself never closes Office or discards changes. OneDrive cloud upload completion has not been independently verified.

The final scheduled-task acceptance is recorded below after the installed application is in place.

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

The Windows isolated source worktree is `D:/_Proj/Huandeng-v013-20261109`; canonical is `D:/_Proj/Huandeng`. Preserve the unrelated modified canonical fixture. Push only a tested milestone to origin and retain upstream attribution.
