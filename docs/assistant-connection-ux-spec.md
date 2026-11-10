# Assistant connection: project-first setup

## Observed problem

The connection dialog puts a large configuration fragment ahead of the action a person should take. The project appears only as a path. Configuration generation and client activity have separate meanings, but the layout makes that distinction hard to scan. The dialog's default close control remains English in Chinese mode.

## Intended behavior

- Lead with the current project's authored title and the exact path used by the generated configuration. Explain that an existing Agent session stays bound to that project when an editor tab changes; switching projects requires explicitly updating the client setup.
- Show three short next steps specific to Codex, Claude Code, DeepSeek Harness, or ChatGPT with an existing DC-WALT workstation. Keep a copy-configuration action visible. Offer a copyable, read-only first task that names the exact project and asks the assistant to confirm it before reading the Story briefing.
- Collapse the raw configuration in an Advanced disclosure by default. Opening the disclosure, copying text, or generating configuration never changes client settings or implies a connection.
- Label setup readiness and explicit client reports separately. Keep report loading/error/absence visible and keep the existing warning that a report is not a live connection or execution check.
- Translate all new interface text and the local dialog close control. Do not translate project titles, paths, or configuration text.

## Acceptance

1. All four clients show their appropriate next action without opening Advanced.
2. Configuration copies byte-for-byte; first-task text identifies the same project, requires identity confirmation, and requests no changes.
3. Advanced starts closed and remains keyboard accessible. Switching client or project discards stale setup responses; late async results cannot expose another client's/project's fragment.
4. Generation failure remains retryable. A copy failure does not discard the configuration. Neither copying nor a client report produces a misleading Connected/verified state.
5. In Chinese mode, instructions and the close control are Chinese while authored names and configuration remain untouched.

## Scope

Connection UI, localized instructions, regression tests, and a core patch changeset. No client configuration writes, automatic rebinding, service/protocol changes, product restart, release, or changes to slide documents.
