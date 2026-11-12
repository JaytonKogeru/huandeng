import { describe, expect, it, vi } from 'vitest';
import type { ActivityEvent } from './activity';
import { reportActivity } from './activity-client';
import type { HuandengClient } from './client';

const report = {
  deckId: 'deck-a',
  requestId: 'stage-1',
  sessionId: 'conversation-a',
  taskId: 'edit-page',
  actor: 'ChatGPT',
  status: 'running',
  summary: 'Preparing the selected page.',
  pageIds: ['page-a'],
};
const saved = (value = report): ActivityEvent => ({
  ...value,
  status: 'running',
  source: 'client',
  epoch: 'writer-a',
  sequence: 1,
  timestamp: '2026-11-12T01:00:00Z',
});
const connection = () => {
  const mock = vi.fn<HuandengClient['request']>();
  return {
    request: <T>(...args: Parameters<HuandengClient['request']>): Promise<T> =>
      mock(...args) as Promise<T>,
    mock,
  };
};

describe('Activity report writer compatibility', () => {
  it('preserves the original legacy request path without a capability read', async () => {
    const client = connection();
    client.mock.mockResolvedValueOnce(saved());
    expect(await reportActivity(client, report)).toEqual(saved());
    expect(client.mock).toHaveBeenCalledTimes(1);
    expect(client.mock).toHaveBeenCalledWith('/activity', report);
  });

  it('sends the new fields only to a writer advertising them', async () => {
    const client = connection();
    const input = { ...report, agentFamily: 'chatgpt', phase: 'spec' };
    client.mock.mockResolvedValueOnce({
      deckId: 'deck-a',
      reportCapabilities: { agentFamily: true, phase: true },
    });
    client.mock.mockResolvedValueOnce({ ...saved(), agentFamily: 'chatgpt', phase: 'spec' });
    const result = await reportActivity(client, input);
    expect(client.mock).toHaveBeenNthCalledWith(1, '/activity');
    expect(client.mock).toHaveBeenNthCalledWith(2, '/activity', input);
    expect(result).toMatchObject({ agentFamily: 'chatgpt', phase: 'spec' });
    expect(result.compatibility).toBeUndefined();
  });

  it('explicitly returns unsupported fields when using an old writer', async () => {
    const client = connection();
    const input = { ...report, agentFamily: 'claude', phase: 'validate' };
    client.mock.mockResolvedValueOnce({ deckId: 'deck-a' });
    client.mock.mockResolvedValueOnce(saved());
    const result = await reportActivity(client, input);
    expect(client.mock).toHaveBeenLastCalledWith('/activity', report);
    expect(result.compatibility).toEqual({ omittedFields: ['agentFamily', 'phase'] });
    expect(result).not.toHaveProperty('agentFamily');
    expect(result).not.toHaveProperty('phase');
    expect(input).toMatchObject({ agentFamily: 'claude', phase: 'validate' });
  });

  it('does not remove a supported field when only the other field is unsupported', async () => {
    const client = connection();
    client.mock.mockResolvedValueOnce({
      deckId: 'deck-a',
      reportCapabilities: { agentFamily: true },
    });
    client.mock.mockResolvedValueOnce({ ...saved(), agentFamily: 'deepseek' });
    const result = await reportActivity(client, {
      ...report,
      agentFamily: 'deepseek',
      phase: 'release',
    });
    expect(client.mock).toHaveBeenLastCalledWith('/activity', {
      ...report,
      agentFamily: 'deepseek',
    });
    expect(result.compatibility).toEqual({ omittedFields: ['phase'] });
  });

  it('rejects invalid optional values before contacting even a legacy writer', async () => {
    const client = connection();
    await expect(reportActivity(client, { ...report, phase: 'thinking' })).rejects.toThrow('phase');
    await expect(
      reportActivity(client, { ...report, agentFamily: 'invented-model' }),
    ).rejects.toThrow('family');
    await expect(reportActivity(client, { ...report, phase: null })).rejects.toThrow('phase');
    expect(client.mock).not.toHaveBeenCalled();
  });

  it('does not post to a mismatched or unavailable writer or fall back after a failed read', async () => {
    const client = connection();
    client.mock.mockResolvedValueOnce({ deckId: 'deck-b' });
    await expect(reportActivity(client, { ...report, phase: 'audit' })).rejects.toThrow(
      'different Project',
    );
    expect(client.mock).toHaveBeenCalledTimes(1);
    client.mock.mockRejectedValueOnce(new Error('Network failed'));
    await expect(reportActivity(client, { ...report, phase: 'audit' })).rejects.toThrow(
      'Network failed',
    );
    expect(client.mock).toHaveBeenCalledTimes(2);
  });
});
