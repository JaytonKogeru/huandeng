# Native assistant integration: the 0.20 candidate and current author runs

The 0.20.0 packages are built in this repository. The completed example revisions also exercised real native clients, but their installed packages and runtime routes were not all 0.20. This record separates the candidate from those actual runs. The [0.19 integration record](NATIVE-INTEGRATION-0.19.md) remains a dated account of earlier installations, trials and failures.

## What was actually running

| Layer | Claude Code author runs | DeepSeek Harness author runs |
| --- | --- | --- |
| Installed HUANDENG plugin | `huandeng@huandeng-local`, version 0.19.0 | Native Cordis bundle, version 0.19.0 |
| CLI used for this revision | Packaged 0.19.0 CLI | Repository `packages/core/huandeng.js`, built as the 0.20.0, 24-tool MCP surface |
| Project writer | Existing 0.19 writer | Existing 0.19 writer |
| Host observation | Native initialization reported the HUANDENG plugin connected | Native model sessions made project-bound HUANDENG calls |
| Actual authoring evidence | Official CLI operations against the same project writer | Successful context, capture, apply and export calls in the model sessions |

Claude Code's connected state proves transport initialization. It does not prove that a model may call every tool. In the Chinese task, the host denied a model `huandeng_context` MCP request. Subsequent editing through the official CLI is separate evidence; it is not recorded as a successful MCP request. The English task's empty permission-denial list likewise does not establish model MCP writes. Both native CLI author jobs completed and saved their revisions.

DeepSeek's model calls were observed directly, rather than inferred from a manifest or a connected label. Its authors also acquired their own public scientific sources and produced professional plots through their available native tools. The installed adapter identity stayed at 0.19 while its explicit per-project CLI route used the newer compatible tool surface.

These runs did not install the new candidate over the existing clients, switch the canonical writers, change account settings or expand permissions.

## Packages maintained inside the engineering project

The maintained source is [`plugins/huandeng`](../plugins/huandeng/README.md), including the [native DeepSeek adapter](../plugins/huandeng/adapters/deepseek/README.md). Current local build outputs are:

- Desktop: `dist/HUANDENG-v0.20.0-win32-x64`
- Claude Code/Codex: `dist/plugin-packages/0.20.0/portable-claude-codex/huandeng`
- DeepSeek Harness: `dist/plugin-packages/0.20.0/deepseek-native/huandeng`

The final packaged 0.20 CLI independently passed its initialization and 24-tool checks, real Editor capture and original-image acquisition against an unchanged compatible 0.19 writer. The [candidate notes](RELEASE-V020.md) describe the Project Rules view, capture behavior, checks and limitations. Building and testing these packages does not install them or publish a release.

## Saved examples and output verification

| Native edition | Main | Full Presentation | Short Presentation | Short occurrence Notes |
| --- | ---: | ---: | ---: | --- |
| [Claude Code English](../examples/huandeng-introduction/claude-en/README.md) | 26 | 26 | 9 | Four overrides |
| [Claude Code Chinese](../examples/huandeng-introduction/claude-zh/README.md) | 27 | 27 | 9 | Four overrides |
| [DeepSeek English](../examples/huandeng-introduction/deepseek-en/README.md) | 24 | Main is the full introduction | 6 | Inherits Main Notes |
| [DeepSeek Chinese](../examples/huandeng-introduction/deepseek-zh/README.md) | 22 | 22 | 12 | Inherits Main Notes |

These counts and Notes come from the saved Main and the Editor's formal resolution of each existing Presentation. All current Presentation references are live, with no pinned versions. DeepSeek Chinese additionally retains presentation-level Notes for its full and short talks; those are distinct from occurrence overrides.

The four native sequences and their changed key pages completed internal visual review. An independent **14-file Office baseline** opened read-only in PowerPoint with repair disabled and unchanged SHA-256 values: four Main files, two Claude Full files, four named short files and four brief aliases. Actual slide counts matched the table. DeepSeek Chinese Full equals Main and has no separate Full export file.

The final corrections changed only a Claude Chinese line break, DeepSeek's manifest/metadata explanation in Notes, and the Chinese account of recognizing AI style. Incremental checks reopened the final Claude Chinese Main (27) and DeepSeek Chinese Main (22) in Office, inspected the changed pages and verified unchanged file contents. Direct PPTX Notes XML checks confirmed the English Main page 20 and Chinese Main pages 4/19 and short pages 3/11. The three affected editions' brief aliases matched their named short files byte for byte. The final short files, Claude Chinese Full and the Notes-only English Main update did not receive another Office opening; their earlier baseline and the specific incremental checks remain distinct.

Actual rendering, source acquisition, saved content and output compatibility answer different questions. The [collection](../examples/huandeng-introduction/README.md) links the editable projects, current previews, saved Notes and each author's source records. Internal review and a successful Office open do not assert the user's final acceptance.
