# v0.10 Project organisation implementation

Date: 2026-11-08. Implements the Project/Section/Presentation findings in [independent audit A](../AUDIT-V010-A.md). Source implementation is complete; the release owner records Windows typecheck, tests and live acceptance separately.

## User-facing changes

The Presentation organiser opens a visual source picker for the selected Presentation. A source shows its title, thumbnail, current Main Slides Position and stable Slide ID. Hover or keyboard focus opens a larger preview; clicking appends a reference and reports what was added. Search covers content title, Position, Slide ID, legacy label and file path. Thumbnails mount only near the visible viewport, with a separately mounted hover preview. Sections can be appended as one live reference. Existing repeated references, reorder/remove controls, named-version selection and occurrence notes remain available. Reference options and Story are collapsed initially.

Main Slides now shows Section groups with their member slides and Start/End Position controls. Setting a range is explicit. The old per-slide assignment table and independent per-Section order buttons are removed. Legacy custom membership is displayed with its original order until the user explicitly chooses a continuous range. Section names are editable and deletion retains the Main Slides.

Saving Project only selects another collection when the collection actually changes. Saving the current collection no longer invokes the route's selection reset. The route also needs the release owner's same-collection guard. Empty Presentation guidance points to arranging slides rather than showing a premature red export diagnostic.

## Persistence and range rules

`ProjectSection` adds optional `range: {startPageId, endPageId}` under schemaVersion 1. When range exists, the current active Main Slides order between those stable boundaries is authoritative. `pageIds` is a compatibility snapshot. Without range, the explicit legacy `pageIds` sequence remains authoritative, including custom ordering.

`resolveProjectSections(snapshot, project?)` returns each Section, resolved IDs, derived Start/End Positions, a contiguous flag and diagnostics. It does not write metadata. Inserting a slide between valid boundaries includes it immediately; inserting outside does not. Moving an interior slide outside removes it from that range. The boundary slides themselves retain identity, so moving one changes the extent. Missing boundaries, start-after-end, or overlaps require explicit repair. Invalid ranges retain their compatibility list for visible recovery; they are never silently normalised or reversed.

`resolvePresentation` incorporates diagnostics only from Sections actually referenced by that Presentation. Main Slides and unrelated Presentations remain usable. Shared boundaries count as overlap because one Main Slide belongs to at most one Section. New invalid range edits are rejected. An existing invalid range does not prevent unrelated Story edits; the fault stays visible. On an explicit valid Project save, range `pageIds` caches are refreshed. Old data is not rewritten merely by opening or previewing it.

Story briefing resolves range membership too, so newly inserted slides receive the correct Section story and usage information. The Agent guide documents range precedence and preserving the optional field in `project.replace`.

## Integration surface

No ProjectPanel prop change is required. The root route still provides the existing snapshot/apply/selection callbacks. Thumbnail Section headers can consume `resolveProjectSections` to use the same derived membership and diagnostics.

New UI message keys are listed in `.verification/v010-project-locale-keys.json` for the release owner's shared catalog. Core nouns stay in English as requested. No locale catalog, route, asset library, inspector or desktop source was edited by this implementation task.

New source files:

- `packages/core/src/app/lib/pptd-project-source.ts`
- `packages/core/src/app/components/pptd/project-source-picker.tsx`
- `packages/core/src/app/components/pptd/project-section-editor.tsx`

Existing source files changed: `project-panel.tsx`, `project-overview.tsx`, `pptd/project-model.ts`, `pptd/project-insights.ts`, `pptd/agent-guide.ts`, and the two adjacent model/insight test files.

## Focused verification

A Node 24 source smoke run passed for insertion-derived membership, read purity, current Positions, legacy order preservation, missing/reversed boundaries, unaffected Presentation access, overlap rejection and unrelated edits on existing broken ranges. It loaded the real TypeScript model with Node's type stripping; this is not a substitute for the full TypeScript/build or live UI checks.

The added Vitest cases exercise range insertion, explicit legacy conversion, missing/reversed boundaries, overlap after reorder, rejection of newly invalid ranges, boundary ID validation, durable insert/reopen behaviour, and correct Story context for inserted slides. Run the two focused files:

```powershell
& .\node_modules\.bin\vitest.cmd run --project unit packages/core/src/pptd/project-model.test.ts packages/core/src/pptd/project-insights.test.ts
```

The local source mirror has no dependencies; the Windows worktree owns formatting, typecheck and packaged acceptance. Required live checks: source preview by pointer and keyboard; append more than one slide and a Section; repeated occurrence note/version controls; Set range and insertion inside it; visible legacy membership until explicit conversion; save from a middle occurrence without navigation; and save/reopen/present/export the Drug Design example.
