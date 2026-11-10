import type { UiTranslator } from '../../../locale/huandeng';

export type AgentClient = 'deepseek' | 'codex' | 'claude' | 'chatgpt';
export type AgentSetup = {
  client: string;
  entryPath: string;
  pluginPath: string;
  configuration: string;
};

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
  deepseek: [
    'Save the configuration as a separate JSON patch. Keep your model and account settings.',
    'Start DeepSeek Harness with dsh --patch and the saved file, then check that HUANDENG tools are available.',
    'Send the first task below to confirm this Project and read its Story briefing.',
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
