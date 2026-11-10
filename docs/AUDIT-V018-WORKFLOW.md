# v0.18 workflow and plugin audit

Date: 2026-11-10. Baseline: main `376e6b4`.

## Findings

| Priority | Observed issue | Consequence | Decision |
| --- | --- | --- | --- |
| P1 | The repository and packaged Editor's Story skill contain Project guidance, while all three native client distributions and the account package still contain the earlier skill under the same 0.17.0 version. | Agents can follow different instructions despite reporting the same plugin version. | Ship a new version and compare content hashes for source, package and installed copies. |
| P1 | Existing design guidance favors white backgrounds, evidence and whitespace, but gives no bilingual type scale, page-role capacity or screenshot sampling requirement. | Every model independently guesses font sizes, background choices and image scale. | Extend the single Project AGENTS.md policy with concrete design decisions and a shared reference workflow. |
| P1 | Technical QA checks geometry, missing files and crop validity. It does not summarize deck typography, background changes or raster sampling at actual use size. | Mechanically valid pages can still look heavy or contain unreadable screenshots. | Add a read-only design audit, separate from writer validation and visual approval. |
| P1 | Native DSH configuration is an explicit Cordis patch; the independent AgentVault job runner does not load it automatically. | Delegating a task through a generic runner does not prove HUANDENG tools were available. | Launch the native task with its actual scoped plugin patch; retain preflight/tool evidence. Do not replace global profiles. |
| P2 | A Section anchors a contiguous collection, but creates no divider slide. Existing instructions intentionally distinguish them. | A model may organize Sections without creating the visible pauses requested for this presentation. | Make title-only divider requirements explicit in the production brief and audit section starts. |
| P2 | Asset inventory contains names, types, size and Main usages, but no locale, view purpose, capture dimensions or source provenance. | Low resolution or wrong-language screenshots can be selected by filename alone. | Maintain a public asset index for this introduction and require capture verification. |
| P2 | The native and account HUANDENG packages have identical names but different connection routes. Both are current 0.17.0. | Two visible entries look like competing versions. | Use one account entry for ChatGPT and preserve native client adapters under clearly described delivery routes. Do not remove a working local route merely because it shares the name. |

## Source evidence

- `plugins/huandeng/skills/huandeng-story/SKILL.md` and the installed Editor copy: SHA-256 `5dbe1f4c6f1a8cbf985ca3978665cbffc6c1fcfb9c6b88f67fd0f9358d8f1bd6`.
- Existing native Codex, Claude and DSH distribution skill: SHA-256 `3715e902532df525054cf8e0ecaa1388e74f1dcfa1e76ea6f6794392133f7b20`. The current account package also lacks the Project guidance addition.
- `docs/PROJECT-AUTHORING-GUIDANCE.md`: exact root AGENTS.md, bounded and subordinate to the current user request. Its exposure is already implemented.
- `packages/core/src/pptd/technical-diagnostics.ts`: geometry, missing asset, crop and requested-font checks.
- `packages/core/src/pptd/asset-library.ts`: paginated current-Main asset inventory.
- `packages/core/src/pptd/agent-guide.ts`: first-Slide Section semantics, page creation and preview/apply contract.
- `plugins/huandeng/scripts/configure.mjs`: separate DSH skill provider and stdio MCP patch.
- `docs/AUDIT-V015-OPEN-SOURCE.md`: reference design, capacity constraints and version-bound review were already recommended; typography and screenshot diagnostics remain incomplete.
- `docs/SPEC-V017.md`: central Sections and History are implemented; this release should improve their use, rather than add parallel modal flows.

## Scope for this release

Create an executable review aid and stronger reusable authoring guidance. Keep the document model, writer, CAS, preview hashes, stable page identities and historical pins unchanged. A design warning is advisory: it neither blocks editing nor rewrites an intentional design. A clean audit is not proof of visual quality, genuine screenshot provenance, readable Office export or human approval.

The four introduction presentations are public product material authorized for release. Use public/synthetic demo content and a clean Editor capture. Existing private research projects, personal paths and account configuration do not belong in public examples or plugin archives.

## Release gate

Build the local and account packages from the same source revision. Verify manifest versions and shared authoring-file hashes. Native client tests must record the plugin path and tool inventory they actually loaded. Preserve the original external-agent outputs for comparison; do not silently replace a poor test result with a ChatGPT edit.
