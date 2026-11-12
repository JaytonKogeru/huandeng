# HUANDENG Editor 0.23.2 — DeepSeek Harness connection integration

Release date: 2026-11-12. Follows [0.23.1](RELEASE-V0231.md).
Specification and negative regression: [SPEC-DSH-NATIVE-0.23.2.md](SPEC-DSH-NATIVE-0.23.2.md).

## Why this patch exists

The DeepSeek Harness Desktop application already supports installing the HUANDENG native plugin. That plugin automatically discovers open Projects, creates independent project-scoped MCP tools and registers the shared authoring Skill. Presenting a second "compatibility patch" client and repeatedly instructing users to copy/pin connection settings was unnecessary and could duplicate MCP/Skill providers.

This release integrates the user's single-DeepSeek-entrance revision into the official HUANDENG Editor, with additional negative tests and correction of its original automatic-route heuristic.

## User-visible behavior

1. **One "DeepSeek Harness" option** in Assistant Setup.
2. An installed package in the active **Desktop** DSH profile takes the native route. Its bundled skill and per-Project MCP discovery are provided by DSH itself. The primary action is now **Copy first task**, which asks DeepSeek Harness to read back the exact Project path and deckId. No new MCP server or Skill provider needs to be configured.
3. The native configuration remains in Advanced only for users intentionally pinning a Project. Switching Editor tabs alone never silently rebinds an existing Agent conversation.
4. When the Desktop bundle is not present, the UI explains installation through DSH's own Plugins page. A standalone connection file for dsh --patch remains available for advanced/headless setup; it is **not** a separate client choice.
5. Automatic route selection checks only the selected profile, validates the installed package's name, native entry module and Skill, and never borrows stale dependencies from other profiles. Bundle detection is not falsely presented as a verified live connection.

**Compatibility:** Existing DSH bundle architecture, MCP protocol 2, all 24 tool definitions, project-scoped discovery, Codex/Claude/ChatGPT routes, Editor Project data and installed user profiles are unchanged. The standalone fallback is retained, not simultaneously enabled with the native route. No new proxy or public tunnel is required.

## Verification and distribution

The following source checks were completed before the release: standalone configuration tests including inactive/missing/incomplete-profile negatives; Assistant Setup UI unit tests; native MCP/writer contracts; Chromium UI flow including the single DeepSeek option, installed-profile guidance and out-of-order Project protection. The main regression and isolated Windows timing evidence are retained in `.verification` and in the source CI.

The versioned source commit and annotated tag are the authoritative release identity. The Windows package is built only from a clean, matching tag and includes an individual-file integrity manifest. The former manually modified installed 0.23.1 runtime must not be reused as a verified 0.23.2 distribution.

The public release is [editor-v0.23.2](https://github.com/JaytonKogeru/huandeng/releases/tag/editor-v0.23.2). Windows users should extract the complete Editor ZIP into a fresh directory and run its installer to update registered shortcuts. Install the corresponding HUANDENG native plugin bundle through DSH's official Plugins page rather than editing its node_modules or profile manifest by hand. Existing content remains in its original location.

Unsigned Windows binaries remain unsigned, as in 0.23.1. No npm product publication or external hosted runtime is involved.
