# Native assistant integration — 0.19.0

> Portable reference adaptation by the coordinator: this copy preserves the reference prose and replaces its six repository-relative links with fixed editor-v0.19.0 GitHub URLs. Original location: docs/NATIVE-INTEGRATION-0.19.md. Original SHA-256: 635a90ff4b83e02a92575345256e88a268b14d7de250d723cf711adc7e65952e. This note and link normalization do not change authored slides, Story, Notes or exports.

This milestone incorporates the user's DeepSeek Harness prototype into the canonical HUANDENG repository. Claude Code, Codex and DeepSeek Harness receive the same authoring skill and shared-writer launcher. DeepSeek also receives a native Host adapter that discovers Projects and manages their tool transports. The adapter source lives in [plugins/huandeng/adapters/deepseek](https://github.com/JaytonKogeru/huandeng/blob/editor-v0.19.0/plugins/huandeng/adapters/deepseek/README.md); a locally installed bundle is a generated distribution.

The public evidence separates installation, protocol connectivity, native model execution and visual acceptance. [Installation evidence](https://github.com/JaytonKogeru/huandeng/blob/editor-v0.19.0/docs/evidence/native-integration/installation.json), [real collaboration evidence](https://github.com/JaytonKogeru/huandeng/blob/editor-v0.19.0/docs/evidence/native-integration/collaboration.json) and the [native JSON failure diagnosis](https://github.com/JaytonKogeru/huandeng/blob/editor-v0.19.0/docs/evidence/native-integration/invalid-json-diagnostic.json) contain no account bindings, credentials, raw session prompts or private profile paths.

## Packages and identities

| Distribution | Contents | Identity |
| --- | --- | --- |
| Portable Claude Code / Codex plugin | 24 allowlisted files: manifests, shared skill, references, launcher, configuration and diagnostic scripts, license and icon | `huandeng@huandeng-local` in the existing local catalog |
| Native DeepSeek Harness bundle | 36 files, including the complete 24-file portable plugin under `vendor/`, native adapter, locales, license, source provenance and content manifests | npm package and Cordis row `huandeng` |
| Private ChatGPT account plugin | Account-specific wrapper with the existing app binding and shared guidance | Updated by the account owner in place; its binding is excluded from public packages |

Build from a clean checkout into new absolute output directories:

```sh
node plugins/huandeng/scripts/build-package.mjs --target local --output <new-absolute-directory>
node plugins/huandeng/scripts/build-deepseek.mjs --output <another-new-absolute-directory>
```

Both builders use Node's built-in modules, explicit file lists and generated SHA-256 manifests. They do not install dependencies, modify source or lockfiles, write client settings or start a document writer. The native bundle's `vendor/` is also a complete portable plugin. The plugin-local Git attributes preserve the reviewed guidance bytes; those attributes are not packaged.

The final portable content-manifest SHA-256 is `91e6590712b601544e6bdb2aad4b8e4443c6fa7756fd908f4c78c762a0eecfa9`. The final native manifest is `aacc8106c15e5970999181ae23783686b0a5f5297fbe1a75a409c9edf696d4b8`. The shared `SKILL.md` is `f4188e0934e7846346e286286041f49592bec3231747caa99d0b7b32dd9d016b`.

The default Claude Code and Codex/Windows-host marketplace registrations point to the maintained per-user 0.19.0 HUANDENG distribution. Both catalogs use the relative plugin source `./huandeng`; each client then maintains its own installed cache. The round's verification marketplace is a build/portable-packaging input, not a default catalog dependency. Explicit native trials retain their separately recorded immutable candidate path; that provenance does not turn the candidate into another maintained source repository.

## Current ChatGPT host and account identities

The [current identity receipt](https://github.com/JaytonKogeru/huandeng/blob/editor-v0.19.0/docs/evidence/native-integration/host-plugin-identities.json) separates three layers. The local catalog plugin is `huandeng@huandeng-local`. The owned private account plugin is a distinct identity, updated in place to 0.19.0 with its existing bound app retained. That bound app is a connector layer; it does not make the two plugin identities identical.

The fresh November 11 read-only default-configuration inventory found exactly one enabled HUANDENG entry, the local plugin, with its installed 0.19.0 manifest matching the final portable distribution. The account metadata independently confirms the existing private 0.19.0 release and preserved binding. The duplicate owned-account installation had been removed from this Windows host through its native **Uninstall** action on November 10; the account record remained available separately. The installed sidebar count of one belongs to that dated UI observation.

This inventory makes no claim about the current composer or picker, or which skill version is already cached in this conversation. It performed no new uninstall, deletion, rename or account release.

## Install and update through the native host

Use DeepSeek Harness's official **Plugins** page for a running Desktop. Inspect the current `huandeng` bundle, prepare a complete candidate and preserve unique prototype changes before replacing its distribution. In the tested DSH 0.2.2-rc.1 host, replacing an already installed local bundle uses remove, install and enable. HMR can rebuild its transports without restarting the Desktop conversation process or document writers. A selected bundle or successful package installation alone does not establish that its component started: check the component's actual running state and then its tools.

For a native headless profile, the supported CLI is:

```sh
dsh plugin --profile headless add <absolute-built-huandeng-directory>
dsh --profile headless --patch <existing-row-override.json> --json -
```

The override changes the existing `huandeng` row. It must not insert another raw MCP client or skill provider. Keep the existing DSH home, session store, account and model. The Desktop CLI requires its reserved Desktop profile to be stopped before package management; it is not a substitute for the live Plugins page.

The tested local upgrade retained one package/row identity. Unique prototype bytes were inventoried and retained before replacement; unchanged bytes were mapped to existing source objects. The old prototype is not an additional active source checkout. The dedicated **HUANDENG DeepSeek** shortcut now opens the official Desktop executable with the activated native bundle. The same shortcut was updated; its historical TUI launcher and alternate store were not edited, and the ordinary DSH shortcut/settings were untouched.

## Multiple Projects and route identity

The default adapter discovers open Projects every five seconds. It uses the canonical `.pptd` entry as identity, with a short folder fragment and path digest in each tool namespace. Opening, closing or reordering another Project does not rename an existing route. Windows case aliases are deduplicated. Moving the Project changes its identity; upgrading from the prototype also causes one deliberate namespace change.

A failed discovery scan retains existing routes. Three consecutive missing observations remove an automatically discovered route. A changed writer origin or epoch replaces only that Project's transport. The controller disposes transports and its timer through the host lifecycle. These refresh, removal and disposal rules have focused unit coverage. The real Desktop acceptance observed routes to all six existing demonstration writers plus the disposable collaboration fixture. After that fixture's owned writer was stopped normally, the Desktop automatically removed only its route; all six other transport processes and writer epochs remained unchanged. The [lifecycle receipt](https://github.com/JaytonKogeru/huandeng/blob/editor-v0.19.0/docs/evidence/native-integration/routing-lifecycle.json) records this observation without claiming an exact timing bound. No temporary fixture writer remains running.

For a bounded authoring task, pin the intended entry or entries in the existing row. Read `huandeng_context`, check `deckId`, and read `huandeng_selection_read` before editing. The active GUI tab is not an implicit routing instruction. One Editor window can hold several Project tabs, each with its own writer.

The actual host normalizes an omitted array setting to `entries: []`. Validation found that the first candidate rejected this valid default. The final adapter accepts it as automatic discovery, and accepts a single `entry` alongside the host's empty array default. A nonempty `entries` list still conflicts with a single `entry`. This is an adapter initialization fix; it does not change the guide or pinned-entry authoring protocol.

When several Editor installations are running, runtime discovery asks for an explicit `installDir` or `cli`. It does not silently choose a different installation. The configured discovery directory is shared by the controller and launcher.

## What collaboration actually means

All clients submit to one Project writer. The writer serializes commits and checks expected revisions. Independent page edits can both succeed when each transaction declares only its touched page revisions. Two edits to the same page conflict even when they target different elements. Story, Project and section edits share a metadata revision, so separate section assignments do not themselves prevent conflicts. After a conflict, read the current state and prepare a new focused proposal.

Activity actor, session and task labels are client declarations. A writer receipt establishes a saved operation. Neither configuration, anonymous event streams nor those labels prove that an assistant is online. This milestone adds no section locks, scheduling, live cursors or automatic team orchestration.

A content-to-design handoff should name the saved operation, page and revision, and describe what the next editor may change. The next assistant reads the saved result, previews a focused change, applies it with the current expectations, and renders the affected page. An agent's visual review remains distinct from the author's acceptance.

### Real two-client acceptance

An actual native DSH session and ChatGPT worked through one disposable three-page writer. DSH completed with exit code 0 and 48 tool calls. The test preserved the configured account/model and used the officially installed native bundle, not a raw MCP substitute.

| Step | Writer evidence | Result |
| --- | --- | --- |
| ChatGPT saved its page while DSH held another page's original preview | `0897ddda-be59-45be-b425-ca80a511d89a` | The independent edit remained intact. |
| DSH applied the unchanged preview and its one-page expectation | `7ab608e3-392a-46b2-8713-7caa882a1413` | Both page edits survived. |
| ChatGPT changed shared-page content after DSH previewed a style edit | `c2249c4c-0023-4108-80b6-3855dbbcc40f` | DSH's stale apply was rejected once with `REVISION_CONFLICT`. |
| DSH read the peer's saved operation, then applied fresh font-size/color changes | `c1613b3b-2050-4078-a01f-bc9c565569f9` | Content was preserved; native render/review completed. |

The final source and all four saved-operation reviews were checked independently, along with the writer's failure event. The public receipt includes fixture source hashes. This proves overlapping client proposals and conflict-safe serialized saves. It is not a claim of simultaneous filesystem writes or native Claude Code collaboration; that client had reached its existing account quota during this acceptance window.

The actual native test used the first immutable 0.19.0 candidate, whose manifest is recorded in the evidence. The final distribution subsequently changed README references and fixed the host's empty-array default. The shared guidance bytes stayed unchanged. Trial history is not relabelled as a run against the later full-package hash.

## Native authoring JSON failure: diagnosis and recovery boundary

A separate native author session made real context, preview, apply and render calls, then failed three times with `MALFORMED_RESPONSE: DeepSeek Messages stream: tool input is invalid JSON`. These were incomplete author attempts. They are not reported as completed slides or successful visual acceptance.

The installed official provider parser was inspected read-only. This exact error occurs at `message_stop`, after every content block is closed and a stop reason is present, when `JSON.parse` rejects a tool-call argument string. Its recognized `max_tokens` branch skips this check; premature stream closure has a different error. The provider always requests streaming on this route, so a documented nonstream switch was not available.

The three persisted failed attempts each contained one `huandeng_preview` tool block:

| Attempt | Argument bytes | Invalid character offset, zero-based | Characters remaining after that point |
| --- | ---: | ---: | ---: |
| First author run | 19,420 | 7,702 | 11,714 |
| Same-session continuation | 17,561 | 3,205 | 14,354 |
| Smaller-call technical continuation | 6,091 | 1,484 | 4,607 |

All three failed with an expected-comma syntax error near an object boundary. The persisted deltas concatenate exactly to the closed block's argument string. The evidence establishes invalid JSON in the middle of complete arguments, with no indication of cross-block mixing in these attempts. It does not identify which upstream component generated the invalid syntax. No failed argument body, prompt, hidden reasoning or full native session log is published; the diagnostic retains only lengths, hashes, error positions and an anonymized punctuation outline.

The installed HUANDENG CLI already accepts a plain JSON transaction file through `preview <transaction>` and `apply <transaction> --preview-hash <hash>`. An author can normally construct a language object, serialize and parse it locally, then submit the file to the same writer. However, the actual DSH author session's native `pwsh` call also failed with a Windows sandbox ACL error in the current round. An interface existing on disk does not establish that the native agent can execute it. No permission, account or model change was made to bypass that limitation.

The supervised recovery therefore uses strictly one small operation per MCP call, including adding page elements separately when necessary. A smaller page count or one page per call would still permit a large nested operations array and would not address the demonstrated failure. Preserve every successful earlier write and each failed-attempt lineage. The authoring supervisor owns the eventual completion and visual acceptance record.

## Validation scope

The canonical adapter/configuration/discovery test command passed all 18 tests:

```sh
node --test plugins/huandeng/scripts/configure.test.mjs plugins/huandeng/scripts/discovery.test.mjs plugins/huandeng/adapters/deepseek/adapter.test.mjs
```

The common installation root and default Claude Code/Codex installations each matched all 24 packaged files. Claude Code's own `mcp list` reported a connected HUANDENG server. After the first author task stopped, the headless profile was upgraded through the official CLI to the final 36-file bundle, with every file verified and the original trial candidate retained. The final Desktop native installation also matched all 36 files; the official UI showed both bundle and component enabled and the component running. The Desktop main/backend processes and the six existing document writers were preserved, and unrelated profile fields and the profile patch were unchanged.

The protocol doctor verified 22 tools against the installed Editor 0.18.0 runtime. Its runtime guide digest identifies that Editor's built-in guide; it is not the packaged 0.19.0 `SKILL.md` digest. Package byte validation, protocol checks and actual native model calls are separate evidence. This compatibility test does not establish acceptance of a later Editor build.

The evidence files are compact public records. Full installer diagnostics, prototype retention maps and native execution traces remain outside the published documentation. Future updates should retain the same distinctions: build bytes, host activation, tool execution, saved source, exported rendering and author acceptance each answer a different question.

## Portable project folder decoration

Release project ZIPs intentionally omit `desktop.ini` and `.huandeng/project.ico`, the Windows folder decoration pair. The installed source folders retain their originals; this packaging choice does not alter a page, scientific icon, original image, Notes, Story, stable identity or named-version checkpoint. Authored icons and figures under `media/`, `assets/` and `sources/` are included unchanged. After extracting a project on Windows, use the Editor's File action to mark that folder if a branded Explorer icon is wanted. The marker uses a project-relative icon path, so folder appearance does not depend on a private installation path.
