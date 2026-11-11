# Public source audit

This document records the source audit and de-identification work for the final HUANDENG 0.19 examples and open-source candidate. It describes a static check of the current candidate, with the history boundary below kept explicit.

## Scope

The audit started from Git-tracked paths and then included the newly prepared public READMEs, documentation images, previous-version documents, and the marked example evidence archives. Dependency installations, generated desktop builds, and private verification workspaces were excluded.

The checks covered:

- Machine-specific workspace, delivery, temporary, and user-profile paths.
- Account-specific app bindings and native assistant session identifiers.
- Common provider credential prefixes, private-key headers, JWTs, embedded URL credentials, and literal authentication fields.
- Internal run-record fields, project licenses, and third-party notices.

The two new README screenshots were inspected individually. They show the actual Editor interface and public introduction content; no visible credential, private app binding, or machine-specific absolute path was found in those captures.

## Findings and changes

The credential-shaped text matches were six explicit test fixtures and one environment-variable example. No unresolved credential literal or high-confidence provider-key, private-key, or JWT match remained in the inspected text. No matched value was used to authenticate to a service.

Public maintenance documents and evidence use role-based placeholders for machine-specific locations. Account bindings use a generic authorized-app placeholder. Native session identifiers use consistent replacement labels. The configuration examples use generic absolute paths such as `C:/path/to/huandeng` and `C:/path/to/project/deck.pptd`.

The unmodified files were backed up privately with a SHA-256 manifest before editing. Historical documents and evidence in the public candidate are therefore **sanitized copies**; they should not be described as byte-identical to the private unredacted originals.

Sanitization preserves the recorded outcomes, failure and permission-denial facts, tool counts, and intentional saved-operation references. It does not turn an incomplete native run into a completed task. Page files, authored Notes, page identities, presentation organization, chart values, images, and licenses were outside this de-identification edit.

Standard operating-system lookup paths, test fixtures, and explicit documentation examples are classified separately. A Home/End shortcut and an XML regular expression were excluded as scanner false positives. Those distinctions prevent path-shaped source syntax from being treated as private data.

## Private history and the intended public artifact

A separate read-only check of the known historical handoff records found earlier account-specific bindings in the **private Git history**. Cleaning current files does not remove earlier Git objects.

The intended public delivery is a cleaned source snapshot **without `.git`**. This preparation does not rewrite the existing repository history or change its visibility. The current-tree audit must not be presented as clearance to publish that private history.

A release candidate should be scanned again after its final file selection. Files intentionally retained as operating-system defaults, fixtures, or examples should remain distinguishable from actual account or workstation data.

## Binary and screenshot boundary

The text scan did not perform OCR over the older binary assets or audit all metadata inside every historical binary. The review of the two new README captures does not establish that all older screenshots are free of identifying information.

Existing source and verification records remain useful evidence, but they need their own provenance and publication scope. Raw private workspaces, backups, account settings, and internal session logs are excluded from the public snapshot.

## License and provenance locations

- [Project MIT license](../LICENSE): retains the upstream OpenSlide copyright and permission notice.
- [Desktop third-party notices](../packages/desktop/NOTICE.md): records the editor foundation and bundled rendering components.
- [OpenPPTD converter provenance](../packages/core/src/pptd/vendor/open-pptd/NOTICE.md) and [MIT terms](../packages/core/src/pptd/vendor/open-pptd/LICENSE): cover the separately attributed MathML-to-OMML conversion modules.
- [Frontend design skill license](../.agents/skills/frontend-design/LICENSE.txt): retains the Apache-2.0 terms for that third-party skill.
- Each introduction project carries its applicable notices under `notices/`.

The OpenPPTD notice identifies the pinned source and the upstream MIT declarations used for the local record. It explicitly explains that the source snapshot did not include a separate upstream LICENSE file; the local terms file does not invent an upstream copyright statement.

This source audit verified the local notice files, the converter import, and the copied notices. It did not independently re-verify upstream Git history or the complete license inventory of generated dependency installations and desktop packages. Distribution packaging has its own validation.

## 中文说明

本轮清理面向准备公开的当前源码快照。维护者本机路径、私人 app 绑定和原生会话标识使用通用占位；操作结果、失败事实、工具计数和有意公开的保存回执继续保留。原始文件在私有位置完整备份，公开的历史说明属于去标识化副本。

已知旧绑定仍存在于私有 Git 历史中。计划交付不含 `.git` 的干净源码快照；本轮没有重写历史或修改仓库可见性。当前树静态扫描、两张新界面图的检查，以及旧二进制材料的 OCR/隐私检查，是不同范围的结果。
