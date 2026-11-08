# HUANDENG client delivery — plugin 0.12.1

## Audit and scope

The pre-existing 0.9 package already offered a shared Story skill, the existing 18-tool stdio bridge, native configuration fragments and a protocol doctor. A copied plugin required an explicit core CLI path and an explicit Project; there was no HUANDENG private account plugin. Those limitations made local clients unnecessarily dependent on the original checkout and made account packaging easy to confuse with local configuration generation.

This change owns only `plugins/huandeng/**`. It adds no document writer, model service, arbitrary editor plugin loader, reverse proxy, public listener or tunnel. Account bindings are generated from a verified app ID during private packaging and are absent from the portable source. Personal Project data, host paths, account receipts and native client configuration are excluded from the package and this repository.

## Specification and implementation

- Resolve an explicit CLI or installation first and fail on an invalid explicit choice. Otherwise use the adjacent packaged/source runtime, a running Windows Editor, a registered local installation, or standard installation locations. Ambiguous installations require a choice.
- Pin an explicit Project, or bind the single verified active Project when the user's task targets the current Project. Multiple active Projects require selection. A connection does not retarget itself during a task.
- Treat local session records as discovery hints. Verify loopback origin, forbid redirects, check the returned canonical entry and protocol, ignore stale records, bound discovery and omit session credentials from results.
- Provide `discover.mjs`, `register-runtime.mjs`, existing native fragment generation and `doctor.mjs`. Registration stores only a machine-local application pointer. The generic launcher requires compatible Node; Editor-generated connection fragments can use the bundled Electron executable.
- Add `--auto-project` for reusable local-client fragments. The DeepSeek adapter inserts its own MCP client and a separately named filesystem skill provider, preserving existing profile entries and skill roots.
- Preserve exact preview/apply payloads, revisions, stable IDs, idempotent retries, original scientific evidence, and the shared GUI/CLI/MCP writer. The Story skill now explicitly separates local-client routing from the authorized ChatGPT workstation route and records the minimal scientific slide style.
- Use an explicit packaging allowlist. The local package contains 19 files; the private ChatGPT package contains 16 files. Both include the supplied logo and upstream MIT license. Neither contains a Project, source slide, export, credential, node_modules directory or test fixture. ChatGPT binds an existing authorized app and omits local stdio MCP configuration; local packages contain no account app binding.

## Validation observed on 2026-11-08

| Surface | Observed result | Boundary |
| --- | --- | --- |
| Linux Node tests | 8 passed | Resolver, native fragments, independent DSH provider and reusable Project discovery |
| Windows Node tests | 8 passed, 0 failed; 554.53 ms | Same source tests on the target OS |
| Biome | 17 JS/JSON files checked; safe formatting applied; no remaining error | Plugin-owned source only |
| Copied local package | Discovered the running Editor and verified active Project identity | A different computer was not available for a live acceptance run |
| Shared bridge doctor | 18 tools, two guide resources, writable current Editor connection | Read-only protocol check; no Project mutation |
| Codex CLI 0.153.1 | Native local marketplace registration and plugin 0.12.1 installation; installed/enabled listing | No full Codex model editing task is claimed |
| Claude Code | Native manifest validation passed; plugin 0.12.1 installed; component inventory lists one Story skill and one HUANDENG MCP server | No full Claude model editing task is claimed |
| Official DeepSeek Harness 0.2.1-rc.2 | Real headless read-only task completed with exit 0 in 20.191 s; loaded Story skill, both runtime guides, context and briefing | Synthetic two-slide fixture, no apply or visual-quality claim |
| Private ChatGPT account package | Created, then updated to 0.12.1; source read-back confirms skill, binding, icon, license and current helpers | Saving a release does not prove the current ChatGPT conversation installed or loaded it |

Native bridge and model checks used the then-installed Editor 0.11 runtime. The final Editor 0.12 installation should repeat the doctor against its own installed bytes. The existing document contract is unchanged by this plugin change.

The DeepSeek task used exactly five calls: `skill`, `read_mcp_resource` twice, `mcp__huandeng__huandeng_context`, and `mcp__huandeng__huandeng_story_briefing`. A first model launch reported `MISSING_CREDENTIAL` because the background process had not inherited the existing native user environment; the successful retry supplied that already configured environment only to the child process. No credential was printed, packaged or stored by HUANDENG. An earlier Windows directory-copy failure was replaced with explicit copying of the three synthetic fixture files; no ACL was changed.

The account service initially rejected an obsolete optional-app field. The corrected verified app mapping created one private plugin successfully. The final archive preserves account identity, metadata, default prompt and audience. Account installation remains a distinct host action: the current session could not load the new skill, search had not indexed it, and the browser action tool reported missing originating browser context. Use the returned private plugin link to finish host installation if it is not already present; do not create another plugin.

## Client operation

Codex and Claude use their native local plugin installation. DeepSeek uses the generated Cordis patch with its native `--patch` option; the dedicated local launcher retains the existing native profile and authentication. All clients confirm the intended Project before editing. No permissions are broadened and unrelated client configuration is preserved.

After changing source, rebuild the allowlisted package, inspect JSON/YAML and referenced assets, install/update through the native host, and verify the installed result. Do not edit client caches directly. Private account updates retain the backend plugin and release identity; a source release and account installation are separate outcomes.

## Primary references

- [OpenAI plugin package and marketplace format](https://developers.openai.com/plugins/build/plugins)
- [Claude native marketplace installation](https://code.claude.com/docs/en/plugin-marketplaces)
- Official installed DeepSeek Harness CLI help and `dsh-skill-filesystem` source: separate `providerName` and additive provider registration support the non-overwriting adapter.
- Current repository and installed runtime `guide story` / `guide operations` remain the authority for authoring operations.
