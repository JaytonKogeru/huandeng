import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { proposalHash } from './proposal';
import { type ProposalDecision, ProposalInbox } from './proposal-inbox';
import { openPptdStore } from './store';
import type { TransactionRequest } from './types';

describe('optional proposal review', () => {
  let root: string;
  let store: Awaited<ReturnType<typeof openPptdStore>>;
  let inbox: ProposalInbox;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-proposals-'));
    await fs.mkdir(path.join(root, 'pages'));
    await fs.writeFile(
      path.join(root, 'deck.pptd'),
      'title: Proposal test\nsize: [960, 540]\npages: [pages/one.page]\n',
    );
    await fs.writeFile(path.join(root, 'pages/one.page'), 'elements: []\nnotes: original\n');
    for (let attempt = 0; ; attempt++) {
      try {
        store = await openPptdStore({
          entryPath: path.join(root, 'deck.pptd'),
          stateDir: path.join(root, 'state'),
        });
        break;
      } catch (error) {
        const failure = error as { code?: string; details?: { causeCode?: string } };
        if (
          attempt >= 31 ||
          failure.code !== 'WRITER_LOCKED' ||
          !['EACCES', 'EADDRINUSE', 'EPERM'].includes(failure.details?.causeCode ?? '')
        )
          throw error;
        const replacementRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'huandeng-proposals-'));
        await fs.cp(root, replacementRoot, { recursive: true });
        await fs.rm(root, { recursive: true, force: true });
        root = replacementRoot;
      }
    }
    inbox = new ProposalInbox(store, path.join(root, 'proposals'));
  });
  afterEach(async () => {
    await store?.close();
    await fs.rm(root, { recursive: true, force: true });
  });
  const request = (notes = 'proposed'): TransactionRequest => {
    const snapshot = store.getSnapshot();
    return {
      requestId: randomUUID(),
      deckId: snapshot.deckId,
      actor: 'test-agent',
      expected: {
        pages: { [snapshot.pages[0].pageId]: snapshot.pages[0].pageRevision },
        metadata: snapshot.metadataRevision,
      },
      operations: [{ op: 'page.notes.set', pageId: snapshot.pages[0].pageId, text: notes }],
    };
  };
  const submit = async () => {
    const transaction = request();
    return inbox.submit({
      transaction,
      previewHash: proposalHash(transaction),
      title: 'Change notes',
    });
  };
  const decision = async (
    id: string,
    action: 'accept' | 'reject' = 'accept',
  ): Promise<ProposalDecision> => {
    const detail = await inbox.detail(id, true);
    return {
      decision: action,
      previewHash: detail.previewHash,
      epoch: detail.epoch,
      approvalNonce: detail.approvalNonce ?? '',
    };
  };

  it('persists a preview without writing the slide and does not give Agent tokens approval nonces', async () => {
    const before = await fs.readFile(path.join(root, 'pages/one.page'), 'utf8');
    const item = await submit();
    const detail = await inbox.detail(item.id, false);
    expect(detail.approvalNonce).toBeUndefined();
    expect(detail.before.pages[0].data.notes).toBe('original');
    expect(detail.after.pages[0].data.notes).toBe('proposed');
    expect(await fs.readFile(path.join(root, 'pages/one.page'), 'utf8')).toBe(before);
    expect(await new ProposalInbox(store, path.join(root, 'proposals')).list()).toHaveLength(1);
  });
  it('requires UI authority even when a valid nonce is copied', async () => {
    const item = await submit();
    const accepted = await decision(item.id);
    await expect(inbox.decide(item.id, accepted, false)).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
    });
    expect(store.getSnapshot().pages[0].data.notes).toBe('original');
    expect((await inbox.decide(item.id, accepted, true)).status).toBe('accepted');
  });
  it('atomically consumes approval and commits once under concurrent replay', async () => {
    const item = await submit();
    const accepted = await decision(item.id);
    const results = await Promise.allSettled([
      inbox.decide(item.id, accepted, true),
      inbox.decide(item.id, accepted, true),
    ]);
    expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
    expect(store.getSnapshot().pages[0].data.notes).toBe('proposed');
    await expect(inbox.decide(item.id, accepted, true)).rejects.toMatchObject({
      code: 'INVALID_REQUEST',
    });
    const detail = await inbox.detail(item.id, true);
    expect(detail.approval).toMatchObject({ source: 'editor-ui', proposalHash: item.previewHash });
    expect(detail.receipt?.operationId).toBeTruthy();
  });
  it('rejects hash and epoch substitution, and rejects a stale proposal after an ordinary authorized edit', async () => {
    const item = await submit();
    const accepted = await decision(item.id);
    await expect(
      inbox.decide(item.id, { ...accepted, previewHash: 'other' }, true),
    ).rejects.toThrow();
    await expect(inbox.decide(item.id, { ...accepted, epoch: 'other' }, true)).rejects.toThrow();
    await store.commit(request('saved separately'));
    expect((await inbox.list())[0].status).toBe('needs-rebase');
    await expect(inbox.decide(item.id, accepted, true)).rejects.toMatchObject({
      code: 'REVISION_CONFLICT',
    });
    expect(store.getSnapshot().pages[0].data.notes).toBe('saved separately');
  });
  it('rejects without touching the document and does not allow the receipt to approve another proposal', async () => {
    const a = await submit();
    const b = await submit();
    const rejection = await decision(a.id, 'reject');
    await expect(inbox.decide(b.id, rejection, true)).rejects.toThrow();
    expect((await inbox.decide(a.id, rejection, true)).status).toBe('rejected');
    expect(store.getSnapshot().pages[0].data.notes).toBe('original');
  });

  it('creates an independent page subset with a new hash, new review and preserved read dependencies', async () => {
    const initial = store.getSnapshot();
    await store.commit({
      ...request(),
      expected: { metadata: initial.metadataRevision, manifest: initial.manifestRevision },
      operations: [{ op: 'page.add', page: { elements: [], notes: 'second original' } }],
    });
    const snapshot = store.getSnapshot();
    const transaction = request('first proposed');
    transaction.expected.pages = Object.fromEntries(
      snapshot.pages.map((page) => [page.pageId, page.pageRevision]),
    );
    transaction.operations.push({
      op: 'page.notes.set',
      pageId: snapshot.pages[1].pageId,
      text: 'second proposed',
    });
    const original = await inbox.submit({ transaction, previewHash: proposalHash(transaction) });
    const chosen = await inbox.subset(
      original.id,
      { pageIds: [snapshot.pages[0].pageId], previewHash: original.previewHash },
      true,
    );
    expect(chosen.id).not.toBe(original.id);
    expect(chosen.previewHash).not.toBe(original.previewHash);
    expect(store.getSnapshot().pages[0].data.notes).toBe('original');
    await expect(inbox.decide(chosen.id, await decision(original.id), true)).rejects.toThrow();
    await inbox.decide(chosen.id, await decision(chosen.id), true);
    expect(store.getSnapshot().pages[0].data.notes).toBe('first proposed');
    expect(store.getSnapshot().pages[1].data.notes).toBe('second original');
    expect((await inbox.detail(original.id, true)).status).toBe('needs-rebase');
  });
  it('does not accept an older persisted review without its authoritative render baseline', async () => {
    const item = await submit();
    const file = path.join(root, 'proposals', `${item.id}.json`);
    const saved = JSON.parse(await fs.readFile(file, 'utf8'));
    delete saved.guard;
    await fs.writeFile(file, JSON.stringify(saved));
    const reopened = new ProposalInbox(store, path.join(root, 'proposals'));
    const detail = await reopened.detail(item.id, true);
    expect(detail.status).toBe('needs-rebase');
    await expect(
      reopened.decide(
        item.id,
        {
          decision: 'accept',
          previewHash: detail.previewHash,
          epoch: detail.epoch,
          approvalNonce: detail.approvalNonce ?? '',
        },
        true,
      ),
    ).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(store.getSnapshot().pages[0].data.notes).toBe('original');
  });
});
