# HUANDENG Editor 0.23.2 — release validation

Date: 2026-11-12. Official source/tag: `ce7df0db60fd62bd5f67411056dd84e97b6604ae`, `editor-v0.23.2`.

## Problem reproduced and corrected

The earlier one-row DSH UI merged two selections but inferred a native installation from a huandeng dependency in **any** profile. A synthetic example with an inactive archive profile and a bare desktop manifest reproduced the incorrect native route. A stale dependency without actual package files was another false positive.

The new desktop route is scoped to `desktop` (or an explicitly requested alternate profile). The package name, native entry module and bundled Skill must exist before the UI calls it installed. An actual THUG desktop profile returned `deepseek-native / plugin / desktop`. Detection does not claim live DSH tool connectivity. For native profiles the UI no longer prompts a second MCP/Skill configuration; its primary action verifies the exact target Project via the first read-only task. DSH's own multi-Project discovery continues unchanged.

## Executed acceptance

| Gate | Observation |
| --- | --- |
| Scoped desktop setup tests | 9 passed, including inactive profile, stale manifest and incomplete installed bundle |
| UI unit tests | 9 passed |
| Browser interaction | 4 passed, including only one DeepSeek option and native profile path |
| Windows native contracts | 22 passed |
| Complete local Windows unit regression | 1,527 passed, 0 failed, 1 existing Windows POSIX-hook skip, 1,528 total (four-worker rerun) |
| One initial unrelated position-field 5-second timeout | Isolated unchanged fixture retest passed 5/5; the complete four-worker rerun then passed |
| Core TypeScript and release guard | Passed |
| Source formatter/linter | `pnpm check` passed |
| Production web/Editor bundle | Built successfully |
| Actual DSH desktop profile | Installed HUANDENG native 0.23.1 detected; running native MCP processes observed; no account/profile changes made |
| Official release CI | [Tag run 43211897926](https://github.com/JaytonKogeru/huandeng/actions/runs/43211897926): Ubuntu core and Windows package success, including installer, native smoke and workspace workflows |

The first unpublished 0.23.2 tag attempt failed the Ubuntu formatter because the versioning script reformatted a JSON keyword array. Its failed CI remains recorded at run 43211097302. The JSON was formatted, `pnpm check` rerun successfully, and the unpublished tag was replaced with the corrected clean source **before** creating the public release. The final release tag points at `ce7df0d`, not the discarded candidate.

## Source-matched distributions

The Windows Editor ZIP was downloaded directly from the successful tag CI artifact and its SHA-256 agreed with the runner-generated SHA256SUMS. Inspection of the ZIP's huandeng-build.json verified productVersion 0.23.2, sourceRevision ce7df0d, releaseTag editor-v0.23.2, channel release, sourceDirty false. It contains the versioned content manifest and new native setup module.

| Asset | Bytes | SHA-256 |
| --- | ---: | --- |
| HUANDENG-Editor-0.23.2-win32-x64.zip | 204,485,911 | `9c2271615596b2fad29199014b7a78a6ba27344895c86efa578f88421c27c319` |
| HUANDENG-Plugin-0.23.2-Claude-Codex.zip | 225,309 | `629e21514f5a30d08e6d970a42686ee834c5b44254f5b9f61cd9509a11498c22` |
| HUANDENG-Plugin-0.23.2-DeepSeek.zip | 405,804 | `16caaf28474ee8b25612c17c2785280572d71496cead3e1b307284e136704671` |

The installer and package are unsigned as before. Existing user PPTD Projects, the original uncommitted example pages, and unrelated tests/fixtures were not staged or changed. Existing live DSH sessions were not restarted, and this validation does not claim the 0.23.2 bundle is already installed into the user's running DSH profile. Install through DSH's Plugins page when upgrading that profile. No new reverse proxy or public endpoint is introduced.
