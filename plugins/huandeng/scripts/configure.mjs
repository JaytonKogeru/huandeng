import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { options, reportError, resolveRuntime } from './runtime.mjs';

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
          id: 'skill-filesystem',
          config: {
            includeDefaultRoots: true,
            customSkillDirs: [path.join(runtime.pluginRoot, 'skills')],
          },
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
          'Use DC-WALT on this workstation. Run the command and argument arrays separately; follow the Story skill. This is not a newly installed ChatGPT MCP connection.',
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
  throw new Error('Choose --client codex, claude, deepseek, chatgpt, or mcp.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const values = options({ client: { type: 'string' } });
    if (values.help)
      process.stdout.write(
        'Usage: node configure.mjs --client codex|claude|deepseek|chatgpt|mcp --entry <absolute.pptd> [--cli <huandeng.js>] [--url <loopback-origin>] [--runtime-dir <absolute>]\nPrints a mergeable configuration fragment. Does not write client settings or connect to a model.\n',
      );
    else process.stdout.write(configuration(values.client, await resolveRuntime(values)));
  } catch (error) {
    reportError(error);
  }
}
