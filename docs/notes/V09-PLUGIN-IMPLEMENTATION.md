# v0.9 Plugin implementation and focused acceptance

Date: 2026-11-08. Implements the approved `SPEC-V09.md` Plugin scope. The product lead owns integration, final package verification and the release. This note does not certify a package installation.

## What changed

The existing writer now separates transaction preparation from persistence. `PptdStore.preview` reads current source bytes, validates the same operations and revisions as commit, and returns before timestamps, persistence, external-version capture, history/checkpoint/receipt creation or document events. The preparation path remains the writer's single operation implementation. The commit path still performs its previous external observation, CAS, recovery, idempotence, journal and document replacement behavior.

`proposal.ts` computes a canonical SHA-256 over the complete transaction and returns bounded actual field/file/page differences, revision baselines, operation counts and page reuse. New-page identities are marked provisional because only apply allocates the authoritative saved identity. The result deliberately has no `operationId` and does not claim to be a rendered before/after image. It caps changes/files/diagnostics at 200, pages at 100, uses per page at 50 and review values at 2000 serialized characters, with explicit totals/truncation.

The client, CLI, MCP and HTTP service share this protocol:

- `huandeng_preview({transaction})`, CLI `preview <file>`, HTTP `POST /proposals/preview`.
- `huandeng_apply({transaction,previewHash?})`, CLI `apply <file> --preview-hash <hash>`, HTTP `POST /proposals/apply` requires the hash.
- Hash mismatch rejects before writer execution. A hash identifies the exact payload, not approval. Ordinary CAS still rejects an intervening edit. Legacy `/transactions` and hashless MCP/CLI apply remain compatible.

The MCP surface now advertises 18 tools and two read-only resources, `huandeng://guide/story` and `huandeng://guide/operations`. `guide story|operations` exposes the same guide text through CLI without requiring an open project. Server instructions and `plugins/huandeng/skills/huandeng-story/SKILL.md` organize authoring around audience/question/evidence/takeaway, four existing Story layers, preserved source figures, exact occurrence identity, click builds, preview, authorized apply and actual read/render checks. Pinned uses are explicitly distinguished from live Main references. Review-only requests stop before apply; authorized editing does not acquire a new permission gate.

The repository-owned plugin contains portable, Codex and Claude manifests; a shared launcher; one Story skill; a small synthetic example/task; client-specific configuration generation; and an MCP SDK doctor. There is no second model executor or GUI approval queue. The desktop connection entry is product-lead-owned integration and calls the same generator.

## Runtime and client boundaries

`scripts/runtime.mjs` finds the core beside a checkout or beside an installed `resources/app/plugins/huandeng` folder. A copied/cached plugin must explicitly select its installed core. The generator preserves Unicode/space paths as separate arguments and returns only a native fragment: Codex TOML, Claude/generic MCP JSON, actual DeepSeek Cordis overlay, or ChatGPT workstation CLI argument arrays. It does not write client settings or expose ambient credentials. Electron-generated configurations include `ELECTRON_RUN_AS_NODE=1`, so the installed executable can provide the runtime without a separate Node installation.

Portable/compatibility MCP launchers use a relative script with an explicit plugin-root working directory; the Codex compatibility configuration lists only the intended environment variable names to forward. Portable hosts may sanitize ambient variables, so explicit client-native configuration remains the reliable setup path. The Claude manifest retains its documented root placeholder. No account-level plugin, public listener, tunnel or marketplace publication was installed.

The official DeepSeek adapter was checked against the installed `@deepseek-ai/dsh` 0.2.1-rc.2 package, its native MCP/skill schemas and shipped headless reference. Its effective command is `dsh --profile headless --patch <path> --json -`. A first attempt using a positional profile after `--patch` failed before a model request; the documented command was corrected. The generated overlay contains only actual supported MCP fields; a presumed `startupTimeoutMs` option was removed after checking the installed Config schema. The shared skill is discovered through `skill-filesystem.customSkillDirs`.

## Focused integrity checks

The writer/proposal/MCP/real HTTP group passed 41 tests before adding one explicit no-op case; the updated proposal file passed 8/8 including that no-op. The group covers:

- Exact project/state byte equality, metadata, history and document events before/after preview.
- Invalid operations, missing preconditions and stale external source without preview-created observations.
- Precise payload hash binding, intervening edits/CAS, identical request retries, Undo and reopen.
- Provisional page creation, repeated occurrence impact and bounded values/change counts.
- MCP resources and legacy apply routing, HTTP token requirements and mandatory proposal-route hash.

Three standalone Node tests passed for repository/installed runtime discovery, Unicode/space paths, native client fragments, Electron environment forwarding, absence of unrelated environment values and loopback/credential-bearing URL rejection. Biome passed on owned source/package files. A real locally built CLI opened a copied example and the SDK doctor confirmed server 0.9.0, 18 tools, two guides and the matching writable two-page project. The example's read-only document check reported no diagnostics. Generated TOML was parsed by Python `tomllib`.

The final project-wide suite/typecheck/build is owned by the product lead, avoiding a duplicate exhaustive pass while other agents are still integrating.

## Actual DeepSeek task

A real native headless client completed the synthetic task with exit 0 in 72.40 seconds. It loaded `huandeng-story`, read the two runtime resources and Story/page context, called preview, applied the identical payload with its returned hash, read the page, and called render. The independent script checked the specific title, Main notes, 300 ms click fade, Story preservation constraints, unchanged first page and four original objects, exactly one history record, and identical page/Story data after a service close and reopen.

The run used a separate `DSH_HOME`, a copied synthetic project, explicit configuration overlay and packaged skill directory. Existing native host authentication was used only inside the workstation process; no value was output, saved to fixture/artifacts or transferred. No AgentVault registration, user-task relay, user configuration edit or original scientific document was involved. The test service was closed normally afterward.

The render call returned a complete base-state PNG report with the expected `TIMELINE_STATIC_EXPORT` warning. DSH persisted the returned 1920×1080 PNG attachment (43,778 bytes), and the installed `deepseek-flash` model catalog declares text/image input. Those facts establish render generation and client image receipt. They do not independently establish the model's visual-quality assertion or interactive animation behavior. The product lead's editor screenshots/playback provide that separate acceptance; the model's final prose is not substituted for it.

One ancillary shell clock request was denied by DSH's Windows ACL sandbox. The document operations continued entirely through MCP and passed. No permissions were weakened. The model supplied an optional `recordedAt` without a verified UTC clock source, so the shared guidance now explicitly says to use a real UTC result or omit that optional field. The task was not rerun merely to obtain a different final sentence.

The sanitized machine-readable result is `docs/evidence/v09/plugin-acceptance.json`. Raw test logs and the copied fixture remain on the workstation and are not committed. The evidence omits user paths, session IDs, credentials and the model's full final answer.

## Other client checks and remaining gates

Installed Codex 0.153.1 parsed the generated stdio configuration through an ephemeral `-c` override and `mcp get`; executable, arguments and project entry matched. It wrote no user configuration and did not run a model task. Installed Claude Code 2.1.318 passed native `plugin validate` with exit 0. Its optional directory check reported no marketplace listing icon; a marketplace release is not part of this local milestone. These checks are deliberately narrower than the completed DeepSeek task.

ChatGPT continues through the existing authorized DC-WALT workstation channel and the same CLI. A new account connector or private tunnel is not claimed. Formal packaged Electron doctor, UI connection discovery, independent visual review and normal release synchronization remain the product lead's final gates.

## Files to include

- `packages/core/src/pptd/{proposal,agent-guide}.ts` and proposal tests; narrow store/types/client/CLI/MCP changes and MCP tests.
- `packages/core/src/vite/routes/pptd.ts` and the focused static-server HTTP test.
- `plugins/huandeng/**`, including the repository-owned skill, package identity, adapters, examples and scripts.
- This note and the sanitized evidence JSON. Root's milestone changeset covers the new core API.

The final post-transfer touch-ups are the generator's schema correction, operation-guide wording, both portable/Codex MCP cwd/env declarations, README command explanation, and the skill's clock-source rule. No additional transaction-engine or persistence changes followed the successful focused checks.
