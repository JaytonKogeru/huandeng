# Client routing

## Local Codex, Claude Code and DeepSeek Harness

Use this computer's HUANDENG Editor. Do not route a local client to a different workstation merely because a ChatGPT account also has that workstation connected.

The local package starts the existing CLI stdio MCP through `scripts/launch-mcp.mjs`. Runtime resolution uses an explicit `--cli` / `HUANDENG_CLI`, explicit `--install-dir` / `HUANDENG_INSTALL_DIR`, the adjacent packaged/check-out core, a running Windows Editor, an explicitly registered local installation, then standard installation locations. An invalid explicit path fails without substitution. Multiple running or discovered installations require a choice. The generic launcher requires Node compatible with the installed core; Editor-generated configuration uses its own Electron executable with `ELECTRON_RUN_AS_NODE=1`.

`node <plugin>/scripts/discover.mjs` reports verified local Projects and the installed runtime without displaying document contents or session credentials. A copied plugin can use `register-runtime.mjs --install-dir <Editor directory>` to retain a local installation pointer. This stores only an application path, never a Project or token.

An explicit `--entry` / `HUANDENG_ENTRY` pins the Project. If absent, the launcher may bind the single verified active Project. Inspect its identity before any edit. Several active Projects require explicit selection; never choose the most recent file, current working directory, or first directory entry. A connection stays pinned until reconnected. Session records are only hints: discovery checks a loopback-only HTTP origin, forbids redirects, verifies the returned canonical `.pptd` entry and protocol, and omits stale records. It does not open a second writer.

Generate a native configuration with `configure.mjs --client codex|claude|deepseek|chatgpt --entry <absolute.pptd>`. It prints a fragment; it does not replace settings or authorize model tasks. Preserve unrelated client settings and skill roots. Use `doctor.mjs` to check the real MCP tool surface and guide, then use the actual client for a small requested task before claiming client acceptance.

## ChatGPT through an existing workstation

Use the account plugin's declared existing workstation app. Read its runtime identity/epoch first, and keep every operation on that machine. Use its direct command/file/process tools, not an external model delegation service. No reverse proxy, public listener or new tunnel is part of HUANDENG.

On Windows, discover the running Editor with `Get-Process -Name 'HUANDENG Editor' | Select-Object -ExpandProperty Path -Unique`. From the confirmed executable directory, the packaged plugin is `resources/app/plugins/huandeng`, and the CLI is `resources/app/node_modules/@open-slide/core/huandeng.js`. Run its `scripts/discover.mjs` with Node or the Editor executable plus `ELECTRON_RUN_AS_NODE=1`. For a closed application, use a user-specified installation or a previously registered local installation; do not guess a personal directory.

Use argument arrays where supported. If the workstation only exposes a shell command, quote each path for that shell; never concatenate user prose or JSON directly into executable shell syntax. Keep proposal JSON in a private Project working directory, then pass that file to `preview` / `apply`. Read UTF-8 explicitly when a PowerShell command reads text files. Keep returned process handles, epoch, request ID and actual exit status. Retrieve an uncertain result with the same receipt; do not repeat a mutation with a new ID.

The account plugin provides instructions and an existing app binding. Saving it to the account is distinct from a host installing/loading it; a CLI receipt is distinct from a completed or visually verified editing task.
