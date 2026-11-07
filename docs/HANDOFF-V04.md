# HUANDENG Editor v0.4 — Engineering handoff

Updated 2026-11-07 (UTC). Product scope is the scientific static-editing core plus shared-project narrative organization. See [Master SPEC](SPEC.md), [v0.4 contract](SPEC-V04.md), [audit](AUDIT-V04.md) and [release notes](RELEASE-V04.md).

## Source and package

- Main implementation: `d82869d5fc2a750f15e60de5e1931f77de7da021`.
- Final runtime: `c2fede5f45aa7a41e853304f9907c2d17e6bf8a2`.
- Product version `0.4.0` is separate from npm workspace versions, stored in `packages/desktop/release.json` and shown in About.
- Windows uses Electron 38.7.2, Node 22.21.0 and pnpm 10.17.0.
- Candidate built at `2026-11-07T10:03:16.5150028Z`, with `sourceDirty: false`.
- Initial and relocated self-contained checks passed: 2,393 package directories and no external executable links. After runtime caches were created, the formal installation contained 2,395 directories and still no external executable links.

Installed at `2026-11-07T10:08:03.0884457Z` to the established executable path. The actual candidate passed six desktop workflows; the relocated formal EXE then opened an isolated temporary project, connected to its service, showed About version `0.4.0`, and produced no renderer errors. Desktop and Start Menu shortcuts were read back and verified. [Installation receipt](evidence/ui-v04/install-acceptance.json) records the previous-build backup and unchanged user fixture.

The release milestone is `editor-v0.4.0` in the private HUANDENG origin. Its final documentation commit follows the runtime commit above. Packaging is not repeated for documentation-only changes; `huandeng-build.json` remains the authoritative executable source identity.

## Implementation map

- `project-model.ts`, `presentation-snapshot.ts`, `project-panel.tsx`: protected Main/Section/Presentation editing, ordered occurrences, version pins and notes.
- `page-checkpoints.ts`, `page-history-dialog.tsx`, `store.ts`: portable checkpoints, immutable asset archives, restore and separate operation history.
- `identity.ts`: permanent UUIDs, compatible short codes and stable S aliases.
- `science-model.ts`, `chart-options.ts`, `science-renderer.tsx`, `science-inspector.tsx`: scientific data, rendering and controls.
- `asset-import.ts`, `grouping.ts`, `table-edit.ts`: original-byte image import, nested group references and merged table structure.
- `export-*.ts`, `runtime-export.ts`: native PPTX mapping, frozen assets, occurrence-aware rendering, isolated transparent object fallback and PDF pagination.
- `technical-diagnostics.ts`, `technical-qa-panel.tsx`: geometry, crop and confirmed missing-asset findings.
- `use-pptd-document.ts` and the editor route: retained drafts, conflicts and desktop/browser leave protection.

Old source formats and CLI/MCP aliases remain compatible. All document writes use the original single-writer revision, idempotency and recoverable persistence protocol.

## Verification

Reusable gates: `verify-huandeng-desktop.mjs`, `verify-project-v04.mjs`, `verify-science-v04.mjs`, `verify-background-export.mjs`, `generate-native-pptx-acceptance.mjs`, `verify-native-pptx-office.ps1`, `verify-real-project-v04.mjs` and `verify-real-pptx-office.ps1`.

Use temporary projects and isolated runtime/profile directories. Wait for the actual UI save and focus state before keyboard actions; disk transaction completion alone does not prove client acknowledgement. Scientific asynchronous components must settle before screenshots. Lazy scientific dependencies are predeclared so first-use optimization does not reload the application.

Real validation found and corrected a trailing blank PDF page, native chart zero values turning blank, invalid chart category caches and mixed-chart labels, tall formula overlap, Office accent compatibility, and parent backgrounds leaking into object images. The complete Office review then found clipped text on slides 16 and 17. Object rasterization now isolates the object on a transparent page, crops the actual visible alpha bounds with a border, restores page coordinates at the correct pixel ratio, and restores DOM styles in `finally`.

Final acceptance: Linux 732/732 unit tests; Windows 731 passed plus one POSIX-only skip; core TypeScript/build passed; packaged desktop 6/6; Project 11/11; Science 22/22; native Office five-slide sample; current/pinned overflow regression; complete real-deck seven groups. The final 80-page PDF was independently counted with PyMuPDF; the final 80-page PPTX was opened by PowerPoint with repair disabled and all 80 rendered pages were visually inspected. All 100 object-image fallbacks have transparent padding and no unexpected opaque boundary. Checkpoint restoration preserved the other 79 pages. All 970 original files retained their hashes.

Source provenance matters: Project and Science receipts precede the last export-specific patch; their relevant runtime modules did not change afterward. Windows tests ran on `7c3f04c` with the test-only `.cmd` fixture adjustment later committed in `c2fede5`; serial execution avoids artificial lock-port contention between test fixtures. Final Linux checks, expanded fallback checks, full-deck/Office validation and packaged desktop checks cover `c2fede5`. Do not rewrite old receipts to claim they ran on the final commit. The inherited TSX browser E2E suite was not rerun and is not included in these passed counts.

Receipts record the actual source revision. Real research output stays ignored; committed summaries contain no research text, images or original directory listing. Do not infer full fidelity from unit tests, a successful RPC or a file merely opening in PowerPoint.

## Preservation and operation

Preserve the pre-existing modified THUG fixture `tests/fixtures/studio/pages/identities.page`, SHA-256 `FE378A48E57B63F2B9E7286578F68EEFE856A381422930A6615F920B02622832`. It is excluded from editor commits. Formal research inputs are read and hash-checked; all test changes and exports use temporary copies.

Canonical repository: `D:/_Proj/Huandeng`. Build in isolated verification worktrees. Established executable: `D:/_Proj/Huandeng/dist/HUANDENG-win32-x64/HUANDENG Editor.exe`. Desktop and Start Menu shortcuts target that path. Previous build: `D:/_Proj/Huandeng/.verification/installed-v03-backup-20261107`. Refuse replacement while the application is running; preserve this backup for a deliberate rollback.

Final runtime worktree: `.verification/v04-release`. Full private research-copy evidence is under its `.verification/real-project-v04/runs/2026-11-07T09-58-31-388Z-1a857588`. Actual PowerPoint PNGs and the source-preserving COM receipt are at canonical `.verification/native-v04/real-final-c2`. The prior `real-final-7c3` retains the failed visual baseline. These ignored directories contain research content and must not be committed.

Push the accepted milestone only to private `origin`, with annotated tag `editor-v0.4.0`. Do not publish npm, push OpenSlide upstream, change visibility or stage user slides.

## Remaining scope

[PowerPoint comparison](POWERPOINT-COMPARISON.md) and [scientific guide](SCIENTIFIC-OBJECTS.md) define native/fallback limits. Later work may address full PPTX round-tripping, advanced statistical charts, master layouts/SmartArt, multimedia/animation, full dual-screen presentation, reliable font/overflow detection and deeper narrative hierarchies. Keep the original Master SPEC as the product contract.
