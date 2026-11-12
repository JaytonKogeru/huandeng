import type { UiTranslator } from '../../../locale/huandeng';

export type AgentClient = 'deepseek-native' | 'deepseek' | 'codex' | 'claude' | 'chatgpt';
// How DeepSeek Harness receives this Project: through an installed HUANDENG plugin bundle, or
// through a connection file. The editor shows one DeepSeek Harness row and the desktop host
// reports which route matches the machine.
export type AgentRoute = 'plugin' | 'direct';
export type AgentSetup = {
  client: string;
  entryPath: string;
  pluginPath: string;
  configuration: string;
  route?: AgentRoute;
};

export function agentSetupClient(client: AgentClient, route?: AgentRoute): AgentClient {
  if (route === 'plugin') return 'deepseek-native';
  if (route === 'direct') return 'deepseek';
  return client;
}

export const agentConnectionSteps: Record<AgentClient, readonly string[]> = {
  codex: [
    'Copy the configuration into Codex’s MCP settings, keeping your existing settings.',
    'Reload the MCP connection or start a new Codex session, then check that HUANDENG tools are available.',
    'Send the first task below to confirm this Project and read its Story briefing.',
  ],
  claude: [
    'Merge the configuration into Claude Code’s MCP settings, keeping your existing servers.',
    'Start a new Claude Code session and check that the HUANDENG MCP server is available.',
    'Send the first task below to confirm this Project and read its Story briefing.',
  ],
  'deepseek-native': [
    'HUANDENG is installed in the DeepSeek Harness Desktop profile. It discovers open Projects automatically.',
    'Open a DeepSeek Harness chat and send the read-only first task below to confirm the exact Project connection.',
    'Do not add another MCP server or skill provider. The advanced configuration is only for deliberately pinning a Project.',
  ],
  deepseek: [
    'HUANDENG is not installed in the DeepSeek Harness Desktop profile. Install the bundle from its Plugins page for automatic Project discovery.',
    'For a setup without the native bundle, the connection file below is an advanced alternative for dsh --patch.',
    'After setup, send the read-only first task below to verify the selected Project.',
  ],
  chatgpt: [
    'In ChatGPT, select your existing DC-WALT workstation that can access this Project.',
    'Send the configuration to ChatGPT and ask it to run the listed commands on that workstation.',
    'Send the first task below to confirm this Project and read its Story briefing.',
  ],
};

export function agentProjectName(title: string | undefined, entryPath: string): string {
  if (title?.trim()) return title;
  const parts = entryPath.replace(/\\/g, '/').split('/').filter(Boolean);
  const filename = parts.at(-1) ?? entryPath;
  return filename.toLowerCase() === 'deck.pptd'
    ? (parts.at(-2) ?? filename)
    : filename.replace(/\.pptd$/i, '');
}

export function agentFirstTask(t: UiTranslator, entryPath: string, deckId?: string): string {
  return [
    t('Use the HUANDENG tools to inspect this Project: {path}', { path: entryPath }),
    ...(deckId ? [t('Expected Project ID: {id}', { id: deckId })] : []),
    t(
      'First confirm the connected Project matches this path and ID. If it differs, stop and tell me; do not switch or edit another Project.',
    ),
    t(
      'Then read its Story briefing and summarize the title, slide count, and main story. Do not modify anything yet.',
    ),
  ].join('\n');
}
