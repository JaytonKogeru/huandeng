import fs from 'node:fs/promises';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ProjectActivity } from './activity';
import { projectTestDirectory } from './project-directory.test-utils';

const roots: string[] = [];
afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
});
async function fixture(deckId = 'project-a') {
  const root = await projectTestDirectory('huandeng-activity-');
  roots.push(root);
  return ProjectActivity.open(path.join(root, 'activity.json'), deckId, 'epoch-a');
}
const report = (requestId: string) => ({
  deckId: 'project-a',
  requestId,
  taskId: 'revise-figures',
  sessionId: 'conversation-a',
  actor: 'Research assistant',
  status: 'running',
  summary: 'Reviewing the selected figure.',
});

describe('Project-scoped activity', () => {
  it('rejects another Project and unbounded or unknown fields without writing a log', async () => {
    const activity = await fixture();
    expect(() => activity.report({ ...report('one'), deckId: 'project-b' })).toThrow(
      'different Project',
    );
    expect(() => activity.report({ ...report('one'), command: 'arbitrary command' })).toThrow(
      'Unknown',
    );
    expect(() => activity.report({ ...report('one'), summary: 'x'.repeat(601) })).toThrow('600');
    expect(activity.snapshot().events).toEqual([]);
    await expect(fs.stat(activity.file)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('serializes different clients and persists idempotent receipts across restarts', async () => {
    const activity = await fixture();
    const events = await Promise.all([
      activity.report(report('one')),
      activity.report({
        ...report('two'),
        sessionId: 'conversation-b',
        summary: 'Checking another page.',
      }),
    ]);
    expect(events.map((event) => event.sequence)).toEqual([1, 2]);
    expect(await activity.report(report('one'))).toEqual(events[0]);
    await expect(
      activity.report({ ...report('one'), summary: 'Different payload' }),
    ).rejects.toMatchObject({ code: 'REQUEST_ID_REUSE' });
    await activity.close();
    const reopened = await ProjectActivity.open(activity.file, activity.deckId, 'epoch-b');
    expect(reopened.snapshot()).toMatchObject({ epoch: 'epoch-b', sequence: 2 });
    expect(await reopened.report(report('one'))).toEqual(events[0]);
    expect(reopened.snapshot().events.every((event) => event.epoch === 'epoch-a')).toBe(true);
  });

  it('distinguishes writer receipts from client reports and returns immutable snapshots', async () => {
    const activity = await fixture();
    await activity.report(report('writer:writer-epoch:7'));
    await activity.document({
      type: 'committed',
      epoch: 'writer-epoch',
      sequence: 7,
      operationId: 'saved-op',
      originClientId: 'gui',
      changedPages: { stable: { before: null, after: 'sha256:one' } },
      manifestChanged: false,
      metadataChanged: true,
      diagnostics: [],
    });
    const snapshot = activity.snapshot();
    expect(snapshot.events[0]).toMatchObject({
      source: 'writer',
      status: 'completed',
      operationId: 'saved-op',
      pageIds: ['stable'],
    });
    snapshot.events[0].summary = 'Reader changed this';
    expect(activity.snapshot().events[0].summary).toContain('Saved 1 Slide');
    expect(activity.snapshot().events).toHaveLength(2);
  });

  it('preserves a malformed existing log without blocking the Project', async () => {
    const activity = await fixture();
    const malformed = JSON.stringify({
      schemaVersion: 1,
      deckId: 'project-a',
      sequence: 1,
      events: [{ sequence: 1, timestamp: 'invalid' }],
      receipts: [],
    });
    await fs.writeFile(activity.file, malformed);
    const reopened = await ProjectActivity.open(activity.file, activity.deckId, 'epoch-b');
    expect(reopened.snapshot().storageError).toContain('preserved');
    await expect(reopened.report(report('one'))).rejects.toThrow('preserved');
    expect(await fs.readFile(activity.file, 'utf8')).toBe(malformed);
  });

  it('keeps malformed save-attempt identities from corrupting the writer log on restart', async () => {
    const activity = await fixture();
    const failure = await activity.failure(
      { requestId: '', originClientId: ' \u0000 ', actor: '' },
      'INVALID_REQUEST',
    );
    expect(failure).toMatchObject({
      source: 'writer',
      taskId: 'unidentified-request',
      sessionId: 'shared-writer',
      actor: 'Shared writer',
      status: 'failed',
    });
    expect(
      await activity.failure(
        { requestId: '', originClientId: ' \u0000 ', actor: '' },
        'INVALID_REQUEST',
      ),
    ).toEqual(failure);
    await activity.document({
      type: 'committed',
      epoch: 'writer-epoch',
      sequence: 8,
      operationId: 'saved-op',
      originClientId: '',
      changedPages: {},
      manifestChanged: true,
      metadataChanged: false,
      diagnostics: [],
    });
    await activity.close();
    const reopened = await ProjectActivity.open(activity.file, activity.deckId, 'epoch-b');
    expect(reopened.snapshot().storageError).toBeUndefined();
    expect(reopened.snapshot().events).toHaveLength(2);
    expect(reopened.snapshot().events.every((event) => event.sessionId === 'shared-writer')).toBe(
      true,
    );
  });

  it('bounds serialized events and idempotency receipts below the reopen limit', async () => {
    const activity = await fixture();
    const large = (index: number) => ({
      ...report(`${String(index).padStart(3, '0')}${'r'.repeat(157)}`),
      taskId: 't'.repeat(160),
      sessionId: 's'.repeat(160),
      actor: 'a'.repeat(100),
      summary: 'm'.repeat(600),
      pageIds: Array.from(
        { length: 40 },
        (_, page) => `${String(page).padStart(3, '0')}${'p'.repeat(97)}`,
      ),
      sequence: index,
      timestamp: '2026-11-09T00:00:00.000Z',
      epoch: 'epoch-a',
      source: 'client' as const,
    });
    const events: ReturnType<typeof large>[] = [];
    const stored = () => ({
      schemaVersion: 1,
      deckId: activity.deckId,
      sequence: events.length,
      events,
      receipts: events.map((event) => ({
        requestId: event.requestId,
        hash: 'seeded-receipt',
        event,
      })),
    });
    for (let index = 1; index <= 300; index++) {
      events.push(large(index));
      if (Buffer.byteLength(JSON.stringify(stored()), 'utf8') > 2 * 1024 * 1024) {
        events.pop();
        break;
      }
    }
    expect(events.length).toBeGreaterThan(100);
    expect(events.length).toBeLessThan(300);
    await fs.writeFile(activity.file, JSON.stringify(stored()));
    const opened = await ProjectActivity.open(activity.file, activity.deckId, 'epoch-b');
    expect(opened.snapshot().storageError).toBeUndefined();
    const {
      sequence: _sequence,
      timestamp: _timestamp,
      epoch: _epoch,
      source: _source,
      ...nextReport
    } = large(events.length + 1);
    const appended = await opened.report(nextReport);
    expect(appended.sequence).toBe(events.length + 1);
    expect(opened.snapshot().events.length).toBeLessThanOrEqual(events.length);
    expect((await fs.stat(activity.file)).size).toBeLessThanOrEqual(2 * 1024 * 1024);
    expect(opened.snapshot().retainedLimit).toBe(300);
    await opened.close();
    const reopened = await ProjectActivity.open(activity.file, activity.deckId, 'epoch-c');
    expect(reopened.snapshot().storageError).toBeUndefined();
    expect(await reopened.report(nextReport)).toEqual(appended);
  });
});
