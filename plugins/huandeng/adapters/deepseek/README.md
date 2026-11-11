# HUANDENG for DeepSeek Harness

This native DSH bundle installs the same authoring skill and MCP launcher as the Claude Code and Codex plugins. It manages one tool namespace per Project and uses the existing shared writer.

Source lives in plugins/huandeng/adapters/deepseek in the HUANDENG repository. A built bundle is a distribution, not another source checkout. Its package name and Cordis row remain huandeng. On Windows a local installation directory may intentionally be named dsh-huandeng to avoid colliding with the Huandeng source directory.

## Install or update

Build an allowlisted bundle from the repository:

    node plugins/huandeng/scripts/build-deepseek.mjs --output <new-absolute-directory>

The output includes a complete vendor plugin with license, icon, guides, scripts and a content manifest. No account app binding, credentials, profile, model settings, session history or Project files are bundled.

For a native headless profile, use the installed DSH CLI:

    dsh plugin --profile headless add <absolute-built-huandeng-directory>
    dsh --profile headless --patch <huandeng-config-override.json> --json -

The override targets the existing `huandeng` row; it must not insert another MCP or skill provider. Keep the current DSH home, account, model and session store. Desktop's CLI requires Desktop to be fully stopped before managing its reserved profile. For a running Desktop, use its official Plugins page or plugin_manager:

    {"action":"install_bundle","target":"<absolute-built-huandeng-directory>"}

First read list_bundles and list_plugins. On DSH 0.2.2-rc.1, installing an existing local package with HMR returns already-installed. A local replacement uses remove_bundle followed by install_bundle, preserving its enabled selection and unrelated settings. Prepare and verify the candidate first; retain the previous distribution until verification succeeds. Registry updates use a different manager operation. Do not edit the profile manifest or install into node_modules by hand.

Read application in each result. applied permits capability verification; restart-required is not a live update; failed requires diagnosis. HMR depends on the host/profile. Replacing code may rebuild HUANDENG transports briefly, without restarting conversations or document writers. Then call huandeng_context and huandeng_selection_read and verify the intended deckId. A successful installation is not an end-to-end test.

## Project routing

The default discovers open Projects every five seconds. A Project opened after DSH starts gets a route. Three consecutive missing observations remove a closed Project's route. A failed scan retains existing routes. A changed writer origin or epoch replaces only that Project's transport.

A Project is the folder containing its .pptd launch entry and assets. One Editor window can contain several Project tabs; each open Project has its own writer. This bundle never treats the active GUI tab as the intended editing target.

Every namespace contains a folder fragment and a short digest of the canonical entry path. It remains stable as other Projects open, close or reorder. Windows case aliases are deduplicated. Moving a Project changes the route identity. An upgrade from the prototype causes one deliberate namespace change.

Pin entries for a bounded authoring task:

    - id: huandeng
      config:
        entries:
          - 'D:/presentations/example/deck.pptd'

Use DSH's config editor for the existing row. An override replaces its complete config, so preserve required settings. Do not add a second raw MCP/skill patch in a profile that already loads this bundle.

| Field | Default | Meaning |
| --- | --- | --- |
| entries / entry | omitted or empty list | Absolute .pptd entries; a nonempty list and a single entry are mutually exclusive. An empty list uses discovery. |
| bindAllOpen | true | Discover all open Projects when no entry is pinned. |
| refreshIntervalMs | 5000 | Scan interval, 1000–60000 ms. |
| missingPolls | 3 | Missing observations before an automatic route is removed. |
| runtimeDir | standard state directory | Shared discovery directory for controller and launcher. |
| installDir / cli | runtime discovery | Explicit runtime, never a second writer. |
| url | omitted | Loopback origin; requires one explicit entry. |
| serverName | huandeng | Prefix of stable Project namespaces. |
| skillProviderName | huandeng | Bundled skill provider identity. |
| includeDefaultSkillRoots | false | Host providers retain user/project skills; avoid duplicate providers. |
| toolCallTimeoutMs | 240000 | Per-call MCP timeout. |
| reconnectMaxAttempts | 240 | Same-route transport recovery budget. |
| failOnStartupError / strictDiscovery | false | Fatal initial failures for deliberate preflight tests. |

bindAllOpen:false without an entry retains the earlier single-Project discovery route. It refuses ambiguity. Explicit entries are clearer for production authoring.

## Guidance and collaboration

Skill discovery makes guidance available; the model must still load and use it. Context and previews expose root AGENTS.md with revision/truncation status. Installation or exposure alone does not prove compliance. Verify actual reads, edits, rendered output and author acceptance separately.

Several assistants can use one Project writer. Independent page edits can succeed when each transaction declares only revisions it touches. Two edits to one page conflict even if they touch different objects. Story, Project and section changes share a metadata revision and may conflict across sections. Re-read after a conflict; do not remove required expectations to force a write.

Activity task labels are client declarations. Writer receipts prove saved operations. Neither is live presence, a section lock, an automatic scheduler or a real-time cursor. For content-to-design handoff, identify saved operations, pages and revisions; the next assistant reads that state, then previews, applies and renders its focused change. Human acceptance remains separate from an agent's review.

## Compatibility and provenance

This adapter targets DSH 0.2.2-rc.1 and Cordis 4.1.0 Host APIs: the official MCP client, skill filesystem provider, context effects and plugin manager. It does not change login or model routing.

It incorporates the user's huandeng prototype and fixes one-shot discovery and count-dependent naming. Preserve the prototype inventory before replacing its local installation. SOURCE.json and both content manifests identify packaged source bytes.

English/Chinese metadata and the existing HUANDENG icon are exported. Installed-resource validation and actual rendered host UI checks are separate evidence.
