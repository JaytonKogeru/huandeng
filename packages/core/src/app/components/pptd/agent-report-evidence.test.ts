import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ActivityEvent } from '../../../pptd/activity';
import {
  AgentEvidenceRows,
  latestClientReport,
  mergeActivityEvents,
  mergeReportEvidence,
  recentClientReports,
} from './agent-report-evidence';

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
  it('keeps multiple assistant sessions visible and never upgrades reports into presence', () => {
    const first = { ...event(1, 'client'), actor: 'Claude', sessionId: 'one' };
    const newer = { ...first, sequence: 4, summary: 'Updated report' };
    const second = { ...event(2, 'client'), actor: 'DeepSeek', sessionId: 'two' };
    const another = { ...event(3, 'client'), actor: 'Claude', sessionId: 'three' };
    const events = [first, newer, second, another, event(5, 'writer'), event(6, 'client', 'other')];
    expect(recentClientReports(events, 'test-project')).toEqual([newer, another, second]);
    expect(mergeActivityEvents([newer], [first, newer], 'test-project')).toEqual([newer, first]);
    const html = renderToStaticMarkup(
      createElement(AgentEvidenceRows, { events, deckId: 'test-project' }),
    );
    expect(html).toContain('DeepSeek');
    expect(html.match(/data-hd-client-report/g)).toHaveLength(3);
    expect(html).toContain('Reported: running');
    expect(html).toContain('not a live connection or execution check');
    expect(html).not.toContain('Connected clients');
  });

  it('keeps exact reported and saved receipt actions separate and avoids absence claims on storage error', () => {
    const reported = {
      ...event(1, 'client'),
      operationIds: ['client-claim'],
      pageIds: ['page-id'],
    };
    const saved = {
      ...event(2, 'writer'),
      operationId: 'actual-save',
      status: 'completed' as const,
    };
    const html = renderToStaticMarkup(
      createElement(AgentEvidenceRows, {
        events: [reported, saved, { ...event(3, 'writer'), status: 'failed' }],
        deckId: 'test-project',
        pageLabels: { 'page-id': 'AB2C' },
        onReview: () => {},
      }),
    );
    expect(html).toContain('data-hd-reported-receipt="client-claim"');
    expect(html).toContain('data-hd-saved-receipt="actual-save"');
    expect(html).toContain('AB2C');
    expect(html).toContain('Save completed');
    expect(html).toContain('Save failed');
    const unavailable = renderToStaticMarkup(
      createElement(AgentEvidenceRows, {
        events: [],
        deckId: 'test-project',
        historyUnavailable: true,
      }),
    );
    expect(unavailable).not.toContain('No client report recorded yet');
    expect(unavailable).not.toContain('No saved change recorded yet');
  });

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
  it('distinguishes unreadable retained history from confirmed absence and retains observed reports', () => {
    const error = 'The previous activity log could not be read.';
    expect(mergeReportEvidence(null, [], 'test-project', error)).toEqual({ report: null, error });
    const report = event(20, 'client');
    const observed = mergeReportEvidence({ report }, [], 'test-project', error);
    expect(observed).toEqual({ report, error });
    expect(mergeReportEvidence(observed, [event(30, 'writer')], 'test-project')).toEqual(observed);
    expect(mergeReportEvidence(observed, [], 'test-project', null)).toEqual({ report });
    expect(mergeReportEvidence(null, [], 'test-project', null)).toEqual({ report: null });
  });
});
