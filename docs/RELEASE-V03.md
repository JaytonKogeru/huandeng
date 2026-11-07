# HUANDENG Editor v0.3.0 — Release Notes

Release date: 2026-11-07 (Australia/Sydney)
Source revision packaged in Windows executable: `ddd250d3353c78355a7dd703b14b8952827691ae`
Release branch: `main`, annotated milestone tag: `editor-v0.3.0`.

## Product changes

- Public product names are **HUANDENG Editor**, **HUANDENG Story**, **HUANDENG Plugin**. Windows title begins with HUANDENG Editor; the incorrect DING spelling and Chinese product-name suffix have been removed from visible application labels.
- Story becomes the main agent intent workflow. MCP advertises `huandeng_story_record`, CLI `huandeng story`, HTTP `/__pptd/story`; old Frame/incorrect-spelling protocol calls remain backward-compatible aliases. Existing `designIntent` metadata remains intact.
- PPTD editing retains separate `.page` files, stable identities, object layers, per-page history, project tree, and external MCP/CLI operations.
- Merged tables now render and can be edited cell-by-cell in the Inspector; merged owner position and unknown source fields are preserved.
- Inline and block LaTeX formulas render with KaTeX MathML. Original LaTeX text stays editable in the PPTD source.
- Desktop and Start Menu install scripts now create **HUANDENG Editor** shortcuts and remove only matching legacy shortcuts for this repository.

## Verification completed on THUG

- Biome, core TypeScript check, core build: passed.
- PPTD unit tests: 75 passed, 1 skipped (7 test files).
- Official installed binary `dist/HUANDENG-win32-x64/HUANDENG Editor.exe` passed all six native desktop workflow scenarios, including MCP, Story, page history, restart persistence, project tree, and New/Open dialogs.
- Official binary passed eight scientific scenarios: merged cells, inline/display formula rendering, cell edits with merge preservation, raw LaTeX persistence, unaffected sibling file, and actual PNG/PDF signature-checked exports.
- Desktop and scientific automation each ended with **zero remaining HUANDENG Editor processes**. Optional screenshot collection is non-blocking and reports only successful images.
- The user's modified fixture `tests/fixtures/studio/pages/identities.page` was excluded from commits and preserved (SHA256 `FE378A48E57B63F2B9E7286578F68EEFE856A381422930A6615F920B02622832`).
- Release evidence is in the local `.verification` directory and is intentionally not tracked in Git.

## Limitations and future work

- PNG/PDF output was tested. Native editable PowerPoint tables and OMML/LaTeX fidelity were **not** verified and should not be promised.
- The table editor supports basic cells and merges, not the full legacy advanced table formatting surface.
- Per-page version history does not archive old media binaries or automatically sync histories across machines.
- Multiple external agents still need coordinated transactions for overlapping edits; a full Story narrative/branching model remains future work.

## Version management

Commit coherent edits locally; push to private origin only for verified product milestones. Do not publish npm and do not push to the OpenSlide upstream repository. The `editor-v0.3.0` tag is the product release milestone, distinct from workspace npm package versions.
