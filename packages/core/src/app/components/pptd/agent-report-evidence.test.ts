import { describe, expect, it } from 'vitest';
import type { ActivityEvent } from '../../../pptd/activity';
import { latestClientReport } from './agent-report-evidence';

function event(
  sequence: number,
  source: ActivityEvent['source'],
  deckId = 'test-project',
): ActivityEvent {
  return {
    sequence,
    source,
    deckId,
    actor: 'Synthetic client',
    epoch: 'test-epoch',
    requestId: `request-${sequence}`,
    sessionId: 'test-session',
    taskId: 'test-task',
    timestamp: '2026-11-09T00:00:00Z',
    status: 'running',
    summary: 'Explicit report',
  };
}

describe('Agent setup observed report', () => {
  it('never treats a writer receipt or another Project report as a client connection observation', () => {
    expect(
      latestClientReport(
        [event(30, 'writer'), event(40, 'client', 'other-project')],
        'test-project',
      ),
    ).toBeNull();
    const report = event(20, 'client');
    expect(
      latestClientReport(
        [event(30, 'writer'), report, event(40, 'client', 'other-project')],
        'test-project',
      ),
    ).toBe(report);
  });
  it('retains the newer event when an older initial read completes after the stream, without mutating inputs', () => {
    const newer = event(20, 'client');
    const older = event(10, 'client');
    const events = [older, newer];
    expect(latestClientReport(events, 'test-project')).toBe(newer);
    expect(events).toEqual([older, newer]);
  });
});
