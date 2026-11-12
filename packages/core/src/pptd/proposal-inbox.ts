import { randomBytes, randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { assertProposalHash, proposalHash, validateTransactionRequest } from './proposal';
import type { openPptdStore, ReviewBaselineGuard } from './store';
import {
  type DeckSnapshot,
  PptdError,
  type TransactionPreview,
  type TransactionRequest,
  type TransactionResult,
} from './types';

export type ProposalStatus = 'pending' | 'needs-rebase' | 'applying' | 'accepted' | 'rejected';
export interface ProposalSummary {
  id: string;
  title: string;
  actor: string;
  createdAt: string;
  updatedAt: string;
  previewHash: string;
  epoch: string;
  status: ProposalStatus;
  pageCount: number;
  changeCount: number;
  operationId?: string;
}
export interface ProposalFrame {
  size: DeckSnapshot['size'];
  theme: unknown;
  pages: DeckSnapshot['pages'];
}
export interface ProposalDecision {
  decision: 'accept' | 'reject';
  previewHash: string;
  epoch: string;
  approvalNonce: string;
}
export interface ProposalDetail extends ProposalSummary {
  preview: TransactionPreview;
  before: ProposalFrame;
  after: ProposalFrame;
  approvalNonce?: string;
  selectablePageIds?: string[];
  failure?: string;
  receipt?: TransactionResult;
  approval?: { source: 'editor-ui'; at: string; epoch: string; proposalHash: string };
}
interface StoredProposal {
  schemaVersion: 1;
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  epoch: string;
  sequence: number;
  status: ProposalStatus;
  transaction: TransactionRequest;
  preview: TransactionPreview;
  guard?: ReviewBaselineGuard;
  before: ProposalFrame;
  after: ProposalFrame;
  failure?: string;
  receipt?: TransactionResult;
  approval?: ProposalDetail['approval'];
}
type Store = Pick<
  Awaited<ReturnType<typeof openPptdStore>>,
  'getSnapshot' | 'previewForReview' | 'commitReviewed'
>;
const recordLimit = 64;
const byteLimit = 32 * 1024 * 1024;
const frame = (snapshot: DeckSnapshot, ids: Set<string>): ProposalFrame => ({
  size: snapshot.size,
  theme: snapshot.manifest.theme ?? {},
  pages: snapshot.pages.filter((page) => ids.has(page.pageId)),
});

export class ProposalInbox {
  private records = new Map<string, StoredProposal>();
  private ready: Promise<void> | undefined;
  private nonces = new Map<string, { id: string; hash: string; epoch: string; expires: number }>();
  private submissions = Promise.resolve();

  constructor(
    private store: Store,
    private directory: string,
  ) {}

  private load() {
    if (this.ready) return this.ready;
    this.ready = (async () => {
      await fs.mkdir(this.directory, { recursive: true, mode: 0o700 });
      const names = (await fs.readdir(this.directory)).filter((name) =>
        /^[0-9a-f-]{36}\.json$/.test(name),
      );
      if (names.length > recordLimit)
        throw new PptdError('INVALID_REQUEST', 'The proposal inbox is full.');
      let bytes = 0;
      for (const name of names) {
        const file = path.join(this.directory, name);
        const stat = await fs.lstat(file);
        bytes += stat.size;
        if (!stat.isFile() || stat.isSymbolicLink() || bytes > byteLimit)
          throw new PptdError('INVALID_DOCUMENT', 'The proposal inbox contains an invalid record.');
        const record = JSON.parse(await fs.readFile(file, 'utf8')) as StoredProposal;
        validateTransactionRequest(record.transaction);
        assertProposalHash(record.transaction, record.preview?.previewHash);
        if (
          record.schemaVersion !== 1 ||
          `${record.id}.json` !== name ||
          record.transaction.deckId !== this.store.getSnapshot().deckId
        )
          throw new PptdError('INVALID_DOCUMENT', 'This proposal belongs to another project.');
        if (record.status === 'applying') {
          record.status = 'needs-rebase';
          record.failure =
            'Check the saved operation history before preparing this proposal again.';
        }
        this.records.set(record.id, record);
      }
    })();
    return this.ready;
  }

  private async persist(record: StoredProposal) {
    const serialized = `${JSON.stringify(record)}\n`;
    const total = [...this.records.values()].reduce(
      (sum, item) => sum + Buffer.byteLength(JSON.stringify(item)),
      0,
    );
    if (total > byteLimit)
      throw new PptdError('INVALID_REQUEST', 'The proposal inbox exceeds its size limit.');
    const target = path.join(this.directory, `${record.id}.json`);
    const temporary = `${target}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, serialized, { flag: 'wx', mode: 0o600 });
      await fs.rename(temporary, target);
    } finally {
      await fs.rm(temporary, { force: true });
    }
  }

  private summary(record: StoredProposal): ProposalSummary {
    const current = this.store.getSnapshot();
    const stale =
      !record.guard || record.epoch !== current.epoch || record.sequence !== current.sequence;
    return {
      id: record.id,
      title: record.title,
      actor: record.transaction.actor,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
      previewHash: record.preview.previewHash,
      epoch: current.epoch,
      status: record.status === 'pending' && stale ? 'needs-rebase' : record.status,
      pageCount: record.preview.totalPageCount,
      changeCount: record.preview.totalChangeCount,
      ...(record.receipt ? { operationId: record.receipt.operationId } : {}),
    };
  }

  private get(id: string) {
    const record = this.records.get(id);
    if (!record) throw new PptdError('TARGET_NOT_FOUND', 'This proposal is no longer available.');
    return record;
  }

  private selectablePages(record: StoredProposal) {
    if (
      record.transaction.operations.some(
        (operation) =>
          !['element.patch', 'page.notes.set'].includes(operation.op) || !('pageId' in operation),
      )
    )
      return [];
    return [
      ...new Set(
        record.transaction.operations.flatMap((operation) =>
          'pageId' in operation ? [operation.pageId] : [],
        ),
      ),
    ];
  }

  async subset(id: string, input: { pageIds: string[]; previewHash: string }, ui: boolean) {
    await this.load();
    const record = this.get(id);
    const available = this.selectablePages(record);
    if (
      !ui ||
      input.previewHash !== record.preview.previewHash ||
      this.summary(record).status !== 'pending' ||
      !Array.isArray(input.pageIds) ||
      !input.pageIds.length ||
      !available.length ||
      input.pageIds.some((pageId) => !available.includes(pageId))
    )
      throw new PptdError('INVALID_REQUEST', 'Select independent slides from a current proposal.');
    const selected = new Set(input.pageIds);
    const transaction = structuredClone(record.transaction);
    transaction.requestId = randomUUID();
    transaction.operations = transaction.operations.filter(
      (operation) => 'pageId' in operation && selected.has(operation.pageId),
    );
    return this.submit({
      transaction,
      previewHash: proposalHash(transaction),
      title: `${record.title} (${selected.size}/${available.length})`,
    });
  }

  async list(): Promise<ProposalSummary[]> {
    await this.load();
    return [...this.records.values()]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((item) => this.summary(item));
  }

  submit(input: {
    transaction: TransactionRequest;
    previewHash: string;
    title?: string;
  }): Promise<ProposalSummary> {
    const operation = this.submissions.then(async () => {
      await this.load();
      validateTransactionRequest(input?.transaction);
      assertProposalHash(input.transaction, input.previewHash);
      for (const existing of this.records.values())
        if (existing.transaction.requestId === input.transaction.requestId) {
          if (proposalHash(existing.transaction) !== input.previewHash)
            throw new PptdError(
              'REQUEST_ID_REUSE',
              'This request ID already belongs to a different proposal.',
            );
          return this.summary(existing);
        }
      const finished = [...this.records.values()]
        .filter((item) => ['accepted', 'rejected'].includes(item.status))
        .sort((a, b) => a.updatedAt.localeCompare(b.updatedAt));
      while (this.records.size >= recordLimit && finished.length) {
        const oldest = finished.shift();
        if (!oldest) break;
        await fs.rm(path.join(this.directory, `${oldest.id}.json`));
        this.records.delete(oldest.id);
      }
      if (this.records.size >= recordLimit)
        throw new PptdError('INVALID_REQUEST', 'Review the existing proposals before adding more.');
      const reviewed = await this.store.previewForReview(input.transaction);
      if (reviewed.preview.pagesTruncated)
        throw new PptdError(
          'INVALID_REQUEST',
          'Split this proposal into smaller groups so every affected slide can be reviewed.',
        );
      const pageIds = new Set(reviewed.preview.pages.map((page) => page.pageId));
      const now = new Date().toISOString();
      const record: StoredProposal = {
        schemaVersion: 1,
        id: randomUUID(),
        title:
          typeof input.title === 'string' && input.title.trim()
            ? input.title.trim().slice(0, 200)
            : input.transaction.actor,
        createdAt: now,
        updatedAt: now,
        epoch: reviewed.before.epoch,
        sequence: reviewed.before.sequence,
        status: 'pending',
        transaction: structuredClone(input.transaction),
        preview: reviewed.preview,
        guard: reviewed.guard,
        before: frame(reviewed.before, pageIds),
        after: frame(reviewed.after, pageIds),
      };
      this.records.set(record.id, record);
      try {
        await this.persist(record);
      } catch (error) {
        this.records.delete(record.id);
        throw error;
      }
      return this.summary(record);
    });
    this.submissions = operation.then(
      () => {},
      () => {},
    );
    return operation;
  }

  async detail(id: string, ui: boolean): Promise<ProposalDetail> {
    await this.load();
    const record = this.get(id);
    const summary = this.summary(record);
    const detail: ProposalDetail = {
      ...summary,
      preview: record.preview,
      before: record.before,
      after: record.after,
      failure: record.failure,
      receipt: record.receipt,
      approval: record.approval,
      selectablePageIds: this.selectablePages(record),
    };
    if (ui && ['pending', 'needs-rebase'].includes(summary.status)) {
      for (const [key, nonce] of this.nonces)
        if (nonce.id === id || nonce.expires <= Date.now()) this.nonces.delete(key);
      const approvalNonce = randomBytes(24).toString('base64url');
      this.nonces.set(approvalNonce, {
        id,
        hash: summary.previewHash,
        epoch: summary.epoch,
        expires: Date.now() + 5 * 60_000,
      });
      detail.approvalNonce = approvalNonce;
    }
    return structuredClone(detail);
  }

  async decide(id: string, decision: ProposalDecision, ui: boolean): Promise<ProposalDetail> {
    await this.load();
    const record = this.get(id);
    const nonce = this.nonces.get(decision?.approvalNonce);
    const current = this.store.getSnapshot();
    if (
      !ui ||
      !nonce ||
      nonce.id !== id ||
      nonce.hash !== decision.previewHash ||
      nonce.epoch !== decision.epoch ||
      nonce.epoch !== current.epoch ||
      nonce.expires <= Date.now() ||
      !['accept', 'reject'].includes(decision.decision) ||
      !['pending', 'needs-rebase'].includes(record.status)
    )
      throw new PptdError(
        'INVALID_REQUEST',
        'This decision requires a fresh review in the Editor.',
      );
    this.nonces.delete(decision.approvalNonce);
    if (decision.decision === 'accept' && this.summary(record).status !== 'pending')
      throw new PptdError(
        'REVISION_CONFLICT',
        'The project changed. Prepare and review a new proposal.',
      );
    record.status = decision.decision === 'accept' ? 'applying' : 'rejected';
    record.updatedAt = new Date().toISOString();
    record.approval = {
      source: 'editor-ui',
      at: record.updatedAt,
      epoch: current.epoch,
      proposalHash: record.preview.previewHash,
    };
    await this.persist(record);
    if (decision.decision === 'reject') return this.detail(id, false);
    try {
      if (!record.guard)
        throw new PptdError('REVISION_CONFLICT', 'Prepare and review this proposal again.');
      record.receipt = await this.store.commitReviewed(
        record.transaction,
        record.preview.previewHash,
        record.guard,
      );
      record.status = 'accepted';
      record.updatedAt = new Date().toISOString();
      await this.persist(record);
    } catch (error) {
      if (!record.receipt) record.status = 'needs-rebase';
      record.failure = error instanceof Error ? error.message : String(error);
      await this.persist(record);
      if (!record.receipt) throw error;
    }
    return this.detail(id, false);
  }
}
