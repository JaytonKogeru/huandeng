import { describe, expect, it } from 'vitest';
import type { ActivityEvent, ActivitySnapshot } from './activity';
import {
  activityFreshnessMs,
  activityStaleDisplayMs,
  activityTerminalDisplayMs,
  projectPageActivity,
} from './activity-presence';
import { agentFamilies, inferAgentFamily } from './agent-identity';

const now = Date.parse('2026-11-12T01:00:00Z');
const report = (sequence: number, values: Partial<ActivityEvent> = {}): ActivityEvent => ({
  deckId: 'deck-a',
  requestId: `request-${sequence}`,
  sessionId: 'conversation-a',
  taskId: 'change-page',
  actor: 'ChatGPT 6 Astra',
  status: 'running',
  summary: 'Preparing the requested change.',
  pageIds: ['page-a'],
  epoch: 'writer-a',
  sequence,
  timestamp: new Date(now - 1000).toISOString(),
  source: 'client',
  ...values,
});
const snapshot = (events: ActivityEvent[], epoch = 'writer-a'): ActivitySnapshot => ({
  deckId: 'deck-a',
  epoch,
  sequence: Math.max(0, ...events.map((event) => event.sequence)),
  events: [...events].reverse(),
  retainedLimit: 300,
});
const atAge = (age: number, status: ActivityEvent['status'] = 'running') =>
  snapshot([report(1, { status, timestamp: new Date(now - age).toISOString() })]);

describe('Page activity reports', () => {
  it('keeps distinct same-family tasks and simultaneous authors on one page', () => {
    const value = projectPageActivity(
      snapshot([
        report(1),
        report(2, { taskId: 'check-plot' }),
        report(3, { sessionId: 'conversation-b', actor: 'Codex' }),
        report(4, { sessionId: 'conversation-c', actor: 'Claude Code', phase: 'validate' }),
      ]),
      { now },
    );
    expect(value.byPage['page-a']).toHaveLength(4);
    expect(new Set(value.byPage['page-a'].map((entry) => entry.key)).size).toBe(4);
    expect(value.activeTaskCount).toBe(4);
    expect(value.byPage['page-a'].filter((entry) => entry.family === 'chatgpt')).toHaveLength(3);
  });

  it('retains explicit scope through stage updates and clears it with an empty list', () => {
    const events = [
      report(1, { phase: 'spec' }),
      report(2, { pageIds: ['page-b'], phase: 'implement' }),
      report(3, { pageIds: undefined, status: 'waiting' }),
    ];
    const value = projectPageActivity(snapshot(events), { now });
    expect(value.byPage['page-a']).toBeUndefined();
    expect(value.byPage['page-b'][0].status).toBe('waiting');
    expect(value.byPage['page-b'][0].phase).toBeUndefined();
    expect(
      projectPageActivity(snapshot([...events, report(4, { pageIds: [] })]), { now }).byPage,
    ).toEqual({});
  });

  it('finishes the scoped task even when its final report omits page IDs', () => {
    const value = projectPageActivity(
      snapshot([report(1), report(2, { pageIds: undefined, status: 'completed' })]),
      { now },
    );
    expect(value.byPage['page-a'][0].status).toBe('completed');
    expect(value.activeTaskCount).toBe(0);
    expect(value.byPage['page-a'][0].savedOperationIds).toEqual([]);
  });

  it('expires without receiving another event and eventually removes the badge', () => {
    expect(
      projectPageActivity(atAge(activityFreshnessMs - 1), { now }).byPage['page-a'][0].status,
    ).toBe('running');
    const stale = projectPageActivity(atAge(activityFreshnessMs), { now });
    expect(stale.byPage['page-a'][0].status).toBe('stale');
    expect(stale.activeTaskCount).toBe(0);
    expect(stale.staleTaskCount).toBe(1);
    expect(
      projectPageActivity(atAge(activityStaleDisplayMs - 1), { now }).byPage['page-a'][0].status,
    ).toBe('stale');
    expect(projectPageActivity(atAge(activityStaleDisplayMs), { now }).byPage).toEqual({});
  });

  it.each(['completed', 'failed', 'cancelled'] as const)(
    'shows %s briefly without occupying the page indefinitely',
    (status) => {
      expect(
        projectPageActivity(atAge(activityTerminalDisplayMs - 1, status), { now }).byPage[
          'page-a'
        ][0].status,
      ).toBe(status);
      expect(projectPageActivity(atAge(activityTerminalDisplayMs, status), { now }).byPage).toEqual(
        {},
      );
    },
  );

  it('does not count planned work as running and expires waiting reports', () => {
    const planned = projectPageActivity(atAge(1, 'planned'), { now });
    expect(planned.byPage['page-a'][0].status).toBe('planned');
    expect(planned.activeTaskCount).toBe(0);
    expect(
      projectPageActivity(atAge(activityFreshnessMs, 'waiting'), { now }).byPage['page-a'][0]
        .status,
    ).toBe('stale');
  });

  it('marks an old writer session stale and never inherits its scope into a new epoch', () => {
    const previous = projectPageActivity(snapshot([report(1)], 'writer-b'), { now });
    expect(previous.byPage['page-a'][0]).toMatchObject({ status: 'stale', previousSession: true });
    expect(previous.activeTaskCount).toBe(0);
    const events = [report(1), report(2, { epoch: 'writer-b', pageIds: undefined })];
    expect(projectPageActivity(snapshot(events, 'writer-b'), { now }).byPage).toEqual({});
    events.push(report(3, { epoch: 'writer-b', pageIds: ['page-b'] }));
    expect(
      projectPageActivity(snapshot(events, 'writer-b'), { now }).byPage['page-b'][0],
    ).toMatchObject({ status: 'running', previousSession: false });
  });

  it('filters foreign projects and deleted pages and counts a multi-page task once', () => {
    const value = projectPageActivity(
      snapshot([
        report(1, { pageIds: ['page-a', 'page-b', 'deleted'] }),
        report(2, { deckId: 'deck-b', sessionId: 'foreign' }),
      ]),
      { now, pageIds: ['page-a', 'page-b'] },
    );
    expect(Object.keys(value.byPage).sort()).toEqual(['page-a', 'page-b']);
    expect(value.activeTaskCount).toBe(1);
    expect(projectPageActivity(snapshot([report(1)]), { now, pageIds: [] }).byPage).toEqual({});
  });

  it('resolves only exact actual writer receipts affecting the displayed page', () => {
    const value = projectPageActivity(
      snapshot([
        report(1, {
          operationIds: ['exact', 'wrong-page', 'failed', 'client-claim', 'foreign', 'absent'],
        }),
        report(2, { source: 'writer', status: 'completed', operationId: 'exact' }),
        report(3, {
          source: 'writer',
          status: 'completed',
          operationId: 'wrong-page',
          pageIds: ['page-b'],
        }),
        report(4, { source: 'writer', status: 'failed', operationId: 'failed' }),
        report(5, {
          source: 'client',
          taskId: 'unrelated',
          operationId: 'client-claim',
          pageIds: [],
        }),
        report(6, {
          source: 'writer',
          deckId: 'deck-b',
          status: 'completed',
          operationId: 'foreign',
        }),
      ]),
      { now },
    );
    expect(value.byPage['page-a'][0].savedOperationIds).toEqual(['exact']);
    expect(value.byPage['page-a'][0].status).toBe('running');
    expect(value.activeTaskCount).toBe(1);
  });

  it('does not equate a coincident writer save or client summary with completion or saving', () => {
    const value = projectPageActivity(
      snapshot([
        report(1, { summary: 'Everything was saved.' }),
        report(2, { source: 'writer', status: 'completed', operationId: 'same-time-save' }),
      ]),
      { now },
    );
    expect(value.byPage['page-a'][0]).toMatchObject({ status: 'running', savedOperationIds: [] });
    expect(
      projectPageActivity(
        snapshot([report(1, { source: 'writer', status: 'completed', operationId: 'alone' })]),
        { now },
      ).byPage,
    ).toEqual({});
  });

  it('is immutable, handles safe identity keys and rejects unusable or future reports', () => {
    const input = snapshot([
      report(1, { pageIds: ['__proto__'], sessionId: 'a:b', taskId: 'c' }),
      report(2, { sessionId: 'a', taskId: 'b:c' }),
    ]);
    const before = JSON.stringify(input);
    const value = projectPageActivity(input, { now });
    expect(Object.entries(value.byPage).find(([id]) => id === '__proto__')?.[1]).toHaveLength(1);
    expect(value.activeTaskCount).toBe(2);
    expect(JSON.stringify(input)).toBe(before);
    expect(projectPageActivity({ ...input, storageError: 'unavailable' }, { now }).byPage).toEqual(
      {},
    );
    expect(
      projectPageActivity(
        snapshot([
          report(1, { timestamp: 'invalid' }),
          report(2, { timestamp: new Date(now + 120_000).toISOString() }),
        ]),
        { now },
      ).byPage,
    ).toEqual({});
    expect(projectPageActivity(null, { now }).byPage).toEqual({});
  });
});

describe('Declared and legacy agent family', () => {
  it('prefers an explicit family and recognizes only clear client aliases', () => {
    expect(inferAgentFamily('ChatGPT 6 Astra')).toBe('chatgpt');
    expect(inferAgentFamily('Codex / root')).toBe('chatgpt');
    expect(inferAgentFamily('ClaudeCode')).toBe('claude');
    expect(inferAgentFamily('DeepSeek Harness')).toBe('deepseek');
    expect(inferAgentFamily('GPT-6')).toBe('other');
    expect(inferAgentFamily('Research assistant using Claude results')).toBe('other');
    expect(inferAgentFamily('NotChatGPT')).toBe('other');
    expect(inferAgentFamily('ChatGPT', 'other')).toBe('other');
    expect(inferAgentFamily('Custom actor', 'gemini')).toBe('gemini');
  });

  it('keeps extension identities explicitly reserved rather than connected', () => {
    expect(
      agentFamilies
        .filter((family) => family.availability === 'supported')
        .map((family) => family.id),
    ).toEqual(['chatgpt', 'claude', 'deepseek']);
    expect(
      agentFamilies
        .filter((family) => family.availability === 'reserved')
        .map((family) => family.id),
    ).toEqual(['pi', 'zcode', 'workbuddy', 'grok', 'gemini', 'antigravity', 'hermes']);
  });
});
