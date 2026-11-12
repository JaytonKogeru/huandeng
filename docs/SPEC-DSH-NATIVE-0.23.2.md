# HUANDENG 0.23.2 — DeepSeek Harness native integration

Date: 2026-11-12. Scope: unify a user-facing DeepSeek Harness connection option, reuse the already-installed native DSH package without introducing another MCP server, and preserve the standalone connector as an advanced fallback.

## Observed failure and corrected contract

The 0.23.1 Assistant Setup presented both "DeepSeek Harness" and "DeepSeek Harness (legacy patch)" despite representing one client. An uncommitted simplification merged the menu, but selected the native route when **any** DSH profile had a package.json dependency named huandeng. This was reproduced using a synthetic inactive archive profile with an installed dependency and a clean Desktop profile. An installed manifest entry can also outlive the actual package files.

- Show one client: **DeepSeek Harness**.
- HUANDENG's native DSH adapter owns project discovery, individual MCP routes and bundled Skill registration. The Editor never creates another MCP server for a profile using the native bundle.
- In the Desktop app, check only the **desktop** profile by default. An explicitly selected other profile is checked separately, never borrowed across profiles.
- A package.json declaration is not enough: verify the package name, the native adapter and bundled HUANDENG Skill actually exist in that profile's node_modules.
- With the bundle installed, the default action is **Copy first task** (read-only project and deckId verification); no copy/merge of configuration or Project pinning is required. The generated native fragment remains under Advanced for intentional pinning.
- Without the native bundle, recommend installation in the DSH Plugins page first; retain one standalone dsh --patch connection file as an advanced alternative, without describing that alternate mechanism as a separate client.
- The Editor may report bundle presence, **not** that a particular DSH session/Project is connected until the assistant reads back its intended deckId.
- Do not modify DSH account/model/profile/session settings or user-authored PPTD Projects. Preserve the five other clients' existing semantics and DSH's default multi-Project discovery.

## Regression and release gates

Tests cover active-profile isolation; stale declarations and incomplete bundle files; explicit profile overrides; native-versus-direct generated configuration; one DeepSeek menu option; native guidance without a configuration-copy call to action; fallback guidance; read-only first task; out-of-order Project responses; the native bridge and actual DSH installation separately.

A tag-aligned, clean official package must replace the hot-edited 0.23.1 runtime. Bump all four version manifests together. Before release, run unit/browser/typecheck/native/packaging and verify the official content manifest. Publish the source commit and annotated editor-v0.23.2 tag, followed by verifiable distribution archives and hashes. A package install/repair must preserve existing projects, shortcuts/default-app choices and user settings.
