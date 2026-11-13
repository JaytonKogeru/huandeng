# HUANDENG Editor 0.23.3 — Validation and delivery evidence

Date: 2026-11-13. Official source revision `0c0308557c32b36c6106d69d502afdfb9ed722dd`; annotated tag `editor-v0.23.3`.

## Accepted changes

| User observation | Correction | Evidence |
| --- | --- | --- |
| Deleting a selected Slide jumps to the first Slide | Main Slide `page.remove` now resolves the former previous neighbor from the pre-operation snapshot, then navigates after successful apply. First-page deletion selects its successor; deleting an unrelated Slide does not move selection. | Four focused selection tests |
| Only straight lines can be drawn | An independent Curve tool creates a quadratic Bézier line; the Inspector switches Straight/Curve and edits signed Bend (%). Native PPTX emits `a:quadBezTo` or `a:cubicBezTo` for editable Office paths. | Line geometry, insertion, editable PPTX export and Chromium renderer |
| Ctrl+C exposes JSON, and pastes may fail inconsistently | Ctrl+C now writes an atomic standard image/png + namespaced editable HUANDENG JSON payload. Ctrl+Alt+C explicitly writes JSON text. Pasting in the same Project restores objects, while external destinations or different Projects receive PNG. Immediate paste awaits the most recent copy, and failures surface an error. | Electron clipboard contracts, Chromium pixel/image copy, hosted native Windows UI clipboard smoke |

## Executed checks

- Focused editor/curve/export/keyboard tests: 46 passed.
- New standalone native clipboard contracts: 4/4 passed, including malformed payload rejection and no plain-text JSON leakage from rich copy.
- Chromium rich clipboard browser: 3/3 passed. Its test examines real pixels of selected shapes and imported PNG media; cropped PNGs have transparent margins and opaque selected content. An initially discovered all-transparent image bug in off-screen cloning was corrected before acceptance.
- Full Windows core unit suite: 1,538 passed, 0 failed, 1 existing Windows skip (1,539 total).
- Desktop Vitest: 68/68 passed.
- Native contracts: 26/26 passed.
- Source quality (Biome `pnpm check`), typecheck, product private-release guard and production Editor build all passed.
- Hosted [official tag CI](https://github.com/JaytonKogeru/huandeng/actions/runs/43348521750): Ubuntu core and Windows package jobs completed successfully, including clean-source Official packaging, local current-user installer contracts, relocated Windows Editor smoke, independent workspace workflow acceptance, archives and checksums. The hosted Windows test expressly set `HUANDENG_CI_CLIPBOARD_SMOKE=1`, using a synthetic selected object and the system clipboard **inside the isolated GitHub runner only**. The test required a real UI Ctrl+C to yield editable JSON, a valid nonempty PNG signature and visible alpha pixels.
- The first *unpublished* candidate tag run 43348178407 was cancelled after a formatter error was found in the last added CI script; its main run 43348173329 failed source format. The script was corrected and `pnpm check` rerun before the official tag was redirected to the clean current revision. Neither failed candidate was distributed.

## Distribution provenance

The Windows Editor ZIP came directly from the successful official GitHub tag CI artifact. Its runner-generated SHA256SUMS matched the ZIP downloaded back to THUG. Inspection of the archive's `huandeng-build.json` read `productVersion=0.23.3`, `sourceRevision=0c0308557c32b36c6106d69d502afdfb9ed722dd`, `releaseTag=editor-v0.23.3`, `channel=release`, and `sourceDirty=false`. The packaged native clipboard module `resources/app/clipboard-rich.cjs` and individual-file content manifest were present.

| Release archive | Bytes | SHA-256 |
| --- | ---: | --- |
| HUANDENG-Editor-0.23.3-win32-x64.zip | 204,496,215 | `a286220b6440814e7bc815cdd629fb6f6d6ed29c5c00cf35fb49d40618081023` |
| HUANDENG-Plugin-0.23.3-Claude-Codex.zip | 225,313 | `5defbb60f226e1b2a5e5bc82af5e0b842516eed25323d1f8d9631639874000d1` |
| HUANDENG-Plugin-0.23.3-DeepSeek.zip | 405,805 | `0af4b7959bfcb52746a46effff2ae2784eb97926b14bc994d753571b6e95cb77` |

The release's combined SHA256SUMS.txt lists these three files. A SHA-256 match proves archive identity, not a Windows digital signature; the executable remains unsigned.

## User environment and remaining boundaries

- HUANDENG's **running** Desktop application and DeepSeek Harness client were left untouched; no forced exit, replacement or restart. New Editor behavior becomes available only after the user upgrades the Editor to v0.23.3.
- All previously modified example Slides and unrelated `tests/fixtures` edits remain uncommitted and were not staged; actual authored PPTD Projects were not opened or modified for these tests.
- Hosted clipboard smoke ran against a synthetic GitHub runner desktop, not the author's Windows clipboard, so Windows clipboard and RustDesk interoperability may still vary in real sessions. The new standard PNG format substantially improves interop, but RustDesk's end-to-end clipboard relay is outside HUANDENG's direct control.
- The rich copy preserves editability inside the **same** Project. Cross-Project paste intentionally imports the rasterized PNG because the source JSON can contain paths relative to its original Project.
- No second MCP/Skill connection and no reverse proxy were created.
