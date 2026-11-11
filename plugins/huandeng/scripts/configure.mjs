import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { options, pluginRoot, reportError, resolveRuntime } from './runtime.mjs';

export function configuration(client, runtime) {
  const server = { command: runtime.node, args: [runtime.launcher], env: runtime.env };
  if (client === 'codex') {
    return [
      '# Merge this server into the existing Codex config; do not replace other settings.',
      '[mcp_servers.huandeng]',
      `command = ${JSON.stringify(server.command)}`,
      `args = ${JSON.stringify(server.args)}`,
      'startup_timeout_sec = 30',
      '',
      '[mcp_servers.huandeng.env]',
      ...Object.entries(server.env).map(([key, value]) => `${key} = ${JSON.stringify(value)}`),
      '',
      '# Load the huandeng-story skill through the plugin, or copy its folder to an existing supported skill root.',
      `# Packaged skill: ${JSON.stringify(path.join(runtime.pluginRoot, 'skills/huandeng-story/SKILL.md'))}`,
      '',
    ].join('\n');
  }
  if (client === 'claude' || client === 'mcp')
    return `${JSON.stringify({ mcpServers: { huandeng: server } }, null, 2)}\n`;
  if (client === 'deepseek-native') {
    const config = {};
    const mapping = {
      HUANDENG_CLI: 'cli',
      HUANDENG_INSTALL_DIR: 'installDir',
      HUANDENG_RUNTIME_DIR: 'runtimeDir',
      HUANDENG_URL: 'url',
    };
    if (runtime.env.HUANDENG_ENTRY) config.entries = [runtime.env.HUANDENG_ENTRY];
    for (const [key, field] of Object.entries(mapping))
      if (runtime.env[key]) config[field] = runtime.env[key];
    return JSON.stringify([{ id: 'huandeng', config }], null, 2) + '\n';
  }
  if (client === 'deepseek') {
    // JSON is a YAML subset accepted by DSH's --patch. These are actual Cordis rows, not generic MCP config.
    return `${JSON.stringify(
      [
        {
          insert: [
            {
              id: 'mcp-huandeng',
              name: '@deepseek-ai/dsh-mcp-client',
              config: {
                serverName: 'huandeng',
                transport: 'stdio',
                ...server,
                failOnStartupError: true,
              },
            },
          ],
        },
        {
          insert: [
            {
              id: 'skill-filesystem-huandeng',
              name: '@deepseek-ai/dsh-skill-filesystem',
              config: {
                providerName: 'huandeng',
                includeDefaultRoots: false,
                customSkillDirs: [path.join(runtime.pluginRoot, 'skills')],
              },
            },
          ],
        },
      ],
      null,
      2,
    )}\n`;
  }
  if (client === 'chatgpt') {
    return `${JSON.stringify(
      {
        connection: 'existing-authorized-workstation',
        instructions:
          'Use the HUANDENG ChatGPT plugin with the existing authorized DC-WALT connection for this workstation. Run command and argument arrays separately. This fragment describes the local route; it does not create or install an account plugin.',
        skill: path.join(runtime.pluginRoot, 'skills/huandeng-story/SKILL.md'),
        command: runtime.node,
        environment: runtime.env,
        arguments: {
          storyGuide: [runtime.cli, 'guide', 'story'],
          operationGuide: [runtime.cli, 'guide', 'operations'],
          context: [
            runtime.cli,
            '--entry',
            runtime.entry,
            ...(runtime.env.HUANDENG_URL ? ['--url', runtime.env.HUANDENG_URL] : []),
            'inspect',
          ],
        },
      },
      null,
      2,
    )}\n`;
  }
  throw new Error('Choose --client codex, claude, deepseek-native, deepseek, chatgpt, or mcp.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const values = options({ client: { type: 'string' }, 'auto-project': { type: 'boolean' } });
    if (values.help)
      process.stdout.write(
        'Usage: node configure.mjs --client codex|claude|deepseek-native|deepseek|chatgpt|mcp [--entry <absolute.pptd>] [--cli <huandeng.js>] [--install-dir <Editor directory>] [--url <loopback-origin>] [--runtime-dir <absolute>] [--auto-project]\nPrints a mergeable configuration fragment. Does not write client settings or connect to a model.\nFor DSH, install the native bundle first and use deepseek-native for its existing row. deepseek is the compatibility --patch route; do not combine both in one profile.\n',
      );
    else {
      if (
        values['auto-project'] &&
        (values.client === 'chatgpt' ||
          ['entry', 'cli', 'install-dir', 'url', 'runtime-dir'].some((name) => values[name]))
      ) {
        throw new Error(
          '--auto-project is a reusable local-client configuration; omit explicit Project/runtime options and use a local client.',
        );
      }
      const runtime = values['auto-project']
        ? {
            node: process.execPath,
            pluginRoot,
            launcher: path.join(pluginRoot, 'scripts/launch-mcp.mjs'),
            env: {},
          }
        : await resolveRuntime(values);
      process.stdout.write(configuration(values.client, runtime));
    }
  } catch (error) {
    reportError(error);
  }
}
