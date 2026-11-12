import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { translateUi } from '../../../locale/huandeng';
import { connectionChinese } from '../../../locale/huandeng-connection-messages';
import { AgentSetupInstructions } from './agent-connection-dialog';
import {
  type AgentClient,
  agentConnectionSteps,
  agentFirstTask,
  agentProjectName,
  agentSetupClient,
} from './agent-connection-steps';

describe('Assistant connection instructions', () => {
  it.each(Object.keys(agentConnectionSteps) as AgentClient[])(
    'shows actionable %s instructions before a closed advanced disclosure',
    (client) => {
      const onCopy = vi.fn();
      const html = renderToStaticMarkup(
        <AgentSetupInstructions
          client={client}
          setup={{
            client,
            entryPath: 'D:/Demo/deck.pptd',
            pluginPath: 'D:/plugins/huandeng',
            configuration: 'exact configuration',
          }}
          projectTitle="My authored title"
          deckId="deck-1"
          copied={null}
          onCopy={onCopy}
        />,
      );
      expect(html).toContain('My authored title');
      expect(html).toContain('D:/Demo/deck.pptd');
      expect(html).toContain('switch editor tabs');
      expect(html.indexOf('data-hd-agent-next-steps')).toBeLessThan(html.indexOf('<details'));
      expect(html.indexOf('data-hd-copy-agent-config')).toBeLessThan(html.indexOf('<details'));
      expect(html.match(/<details[^>]*>/)?.[0]).not.toContain('open');
      expect(html).toContain('connection not verified here');
      expect(onCopy).not.toHaveBeenCalled();
    },
  );

  it('describes one DeepSeek Harness client with a route that matches the machine', () => {
    const plugin = agentConnectionSteps['deepseek-native'].join(' ');
    const direct = agentConnectionSteps.deepseek.join(' ');
    expect(plugin).toContain('discovers open Projects automatically');
    expect(plugin).toContain('Do not add another MCP server');
    expect(plugin).not.toContain('dsh --patch');
    expect(direct).toContain('Install the bundle');
    expect(direct).toContain('dsh --patch');
    expect(direct).not.toContain('compatibility patch');
    expect(agentSetupClient('deepseek', 'plugin')).toBe('deepseek-native');
    expect(agentSetupClient('deepseek', 'direct')).toBe('deepseek');
    expect(agentSetupClient('codex', undefined)).toBe('codex');
  });

  it('identifies the exact project and asks for a read-only first task in both languages', () => {
    for (const locale of ['en', 'zh-CN'] as const) {
      const prompt = agentFirstTask(
        (message, values) => translateUi(locale, message, values),
        'D:\\研究 Project\\deck.pptd',
        'expected-deck-id',
      );
      expect(prompt).toContain('D:\\研究 Project\\deck.pptd');
      expect(prompt).toContain('expected-deck-id');
      expect(prompt).toContain(locale === 'en' ? 'If it differs, stop' : '不一致时请停止');
      expect(prompt).toContain(locale === 'en' ? 'Do not modify anything yet' : '暂不修改内容');
    }
  });

  it('preserves authored project titles and only derives a fallback from its path', () => {
    expect(agentProjectName('研究 Title', 'D:/Folder/deck.pptd')).toBe('研究 Title');
    expect(agentProjectName('', 'D:\\Folder\\deck.pptd')).toBe('Folder');
    expect(agentProjectName(undefined, '/projects/talk.pptd')).toBe('talk');
  });

  it('localizes every new instruction and uses a translated close action', () => {
    for (const [english, chinese] of Object.entries(connectionChinese)) {
      expect(translateUi('zh-CN', english)).toBe(chinese);
      expect(translateUi('en', english)).toBe(english);
    }
    expect(translateUi('zh-CN', '关闭')).toBe('关闭');
    expect(translateUi('en', '关闭')).toBe('Close');
  });
});
