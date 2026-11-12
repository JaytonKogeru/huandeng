import type { ActivityEvent, ActivitySnapshot } from '../../pptd/activity';
import type { AssetLibraryOptions, AssetLibraryResult } from '../../pptd/asset-library';
import type { DesignAuditOptions, DesignAuditReport } from '../../pptd/design-audit';
import type { ProjectFilePreview } from '../../pptd/project-file-preview';
import type { StoryBriefing, StoryBriefingOptions } from '../../pptd/project-insights';
import type { ProposalDecision, ProposalDetail, ProposalSummary } from '../../pptd/proposal-inbox';
import { applySnapshotUpdate, type SnapshotUpdate } from '../../pptd/snapshot-delta';
import type {
  CreatePageCheckpointRequest,
  DeckSnapshot,
  DocumentEvent,
  HistorySummary,
  OperationReview,
  PageVersionSnapshot,
  PageVersionSummary,
  TransactionRequest,
  TransactionResult,
} from '../../pptd/types';
import type { VideoCapabilities } from '../../pptd/video-encoder';
import type { ExportJobStatus, ExportResult, VideoExportOptions } from '../../pptd/video-plan';
import {
  prepareResources,
  resourceUrl,
  sessionHeaders,
  subscribeAuthenticated,
} from './pptd-session';

export type PptdSession = DeckSnapshot & { sessionToken: string };

export interface ProjectTreeNode {
  path: string;
  name: string;
  kind: 'file' | 'directory';
  role?: 'manifest' | 'page' | 'media' | 'metadata' | 'export' | 'other';
  pageId?: string;
  children?: ProjectTreeNode[];
}

export interface ProjectTree {
  entry: string;
  root: string;
  nodes: ProjectTreeNode[];
  truncated?: boolean;
}

export class PptdClientError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 0,
    readonly details: Record<string, unknown> = {},
  ) {
    super(message);
    this.name = 'PptdClientError';
  }
}

export interface PptdTransport {
  getSnapshot(): Promise<PptdSession>;
  getCommittedSnapshot?(base?: PptdSession): Promise<PptdSession>;
  recoverPending(): Promise<PptdSession>;
  commit(request: TransactionRequest): Promise<TransactionResult>;
  revert(
    kind: 'undo' | 'redo',
    operationId: string,
    requestId: string,
    clientId: string,
  ): Promise<TransactionResult>;
  subscribe(
    listener: (event: DocumentEvent) => void,
    onConnection: (connected: boolean) => void,
  ): () => void;
}

const API = `${(import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')}/__pptd`;

function queryPath(endpoint: string, options: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) {
    if (value !== undefined && value !== null) params.set(key, String(value));
  }
  return `${endpoint}${params.size ? `?${params}` : ''}`;
}

export function pptdAssetUrl(path: string, exportId?: string): string {
  if (/^data:/i.test(path) || (!exportId && /^(?:https?:|blob:)/i.test(path))) return path;
  const prefix = exportId ? `${API}/exports/${encodeURIComponent(exportId)}` : API;
  return resourceUrl(`${prefix}/asset?path=${encodeURIComponent(path)}`);
}

export function pptdAssetPreviewUrl(path: string, size: 320 | 640 = 320): string {
  if (/^(?:https?:|data:|blob:)/i.test(path)) return path;
  return resourceUrl(`${API}/asset-preview?path=${encodeURIComponent(path)}&size=${size}`);
}

export function pptdProjectFileImageUrl(path: string, revision: string): string {
  return resourceUrl(
    `${API}${queryPath('/project-file-preview/image', { path, revision })}`,
    revision,
  );
}

export class PptdBackend implements PptdTransport {
  proposals(): Promise<ProposalSummary[]> {
    return this.request('/proposals');
  }

  proposal(id: string): Promise<ProposalDetail> {
    return this.request('/proposals/' + encodeURIComponent(id));
  }

  decideProposal(id: string, decision: ProposalDecision): Promise<ProposalDetail> {
    return this.request('/proposals/' + encodeURIComponent(id) + '/decision', decision);
  }

  selectProposalPages(
    id: string,
    body: { pageIds: string[]; previewHash: string },
  ): Promise<ProposalSummary> {
    return this.request('/proposals/' + encodeURIComponent(id) + '/subset', body);
  }

  operationReview(
    operationId: string,
    pageId?: string,
    signal?: AbortSignal,
  ): Promise<OperationReview> {
    return this.request(
      queryPath(`/reviews/${encodeURIComponent(operationId)}`, { pageId }),
      undefined,
      signal,
    );
  }

  activity(signal?: AbortSignal): Promise<ActivitySnapshot> {
    return this.request('/activity', undefined, signal);
  }

  designAudit(options: DesignAuditOptions = {}, signal?: AbortSignal): Promise<DesignAuditReport> {
    return this.request(queryPath('/design-audit', options), undefined, signal);
  }

  subscribeActivity(
    listener: (event: ActivityEvent) => void,
    onConnection: (connected: boolean) => void,
  ): () => void {
    return subscribeAuthenticated(
      API,
      '/activity/events',
      (event, data) => {
        if (event === 'activity') listener(JSON.parse(data) as ActivityEvent);
      },
      onConnection,
    );
  }

  private async request<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${API}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers: { 'content-type': 'application/json', ...(await sessionHeaders(API)) },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
        redirect: 'error',
        signal,
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new PptdClientError(
        'NETWORK_ERROR',
        error instanceof Error ? error.message : '无法连接本地编辑服务',
      );
    }
    const payload = await response.json().catch(() => {
      throw new PptdClientError(
        'SERVICE_UNAVAILABLE',
        '尚未打开 PPTD 项目。请使用 huandeng open 启动本地项目。',
        response.status || 503,
      );
    });
    if (!response.ok || payload.ok === false) {
      const failure = payload.error ?? payload;
      throw new PptdClientError(
        failure.code ?? 'SERVICE_ERROR',
        failure.message ?? '本地编辑服务暂时不可用',
        response.status,
        failure.details ?? {},
      );
    }
    const exportId = /^\/exports\/([^/]+)\/snapshot$/.exec(path)?.[1];
    await prepareResources(API, payload, exportId);
    return payload as T;
  }

  async getSnapshot(): Promise<PptdSession> {
    return this.acceptSession(await this.request<PptdSession>('/session'));
  }

  async getCommittedSnapshot(base?: PptdSession): Promise<PptdSession> {
    if (base) {
      const update = await this.request<SnapshotUpdate & { sessionToken: string }>(
        queryPath('/changes', {
          epoch: base.epoch,
          sequence: base.sequence,
          manifestRevision: base.manifestRevision,
          metadataRevision: base.metadataRevision ?? 'null',
        }),
      );
      try {
        return this.acceptSession({
          ...applySnapshotUpdate(base, update),
          sessionToken: update.sessionToken,
        });
      } catch {}
    }
    return this.acceptSession(await this.request<PptdSession>('/current'));
  }

  async recoverPending(): Promise<PptdSession> {
    return this.acceptSession(await this.request<PptdSession>('/recover', {}));
  }

  private acceptSession(session: PptdSession): PptdSession {
    if (session.kind !== 'pptd' || !Array.isArray(session.pages) || !session.metadata) {
      throw new PptdClientError(
        'INVALID_SESSION',
        '本地服务没有返回有效的 PPTD 项目。请重新打开项目。',
        503,
      );
    }
    return session;
  }

  commit(request: TransactionRequest): Promise<TransactionResult> {
    return this.request('/transactions', request);
  }

  revert(
    kind: 'undo' | 'redo',
    operationId: string,
    requestId: string,
    clientId: string,
  ): Promise<TransactionResult> {
    return this.request(`/${kind}`, {
      operationId,
      requestId,
      actor: `huandeng-ui:${clientId}`,
      originClientId: clientId,
    });
  }

  history(): Promise<HistorySummary[]> {
    return this.request('/history');
  }

  project(): Promise<ProjectTree> {
    return this.request('/project');
  }

  filePreview(path: string, signal?: AbortSignal): Promise<ProjectFilePreview> {
    return this.request(queryPath('/project-file-preview', { path }), undefined, signal);
  }

  assets(options: AssetLibraryOptions = {}): Promise<AssetLibraryResult> {
    return this.request(queryPath('/assets', options));
  }

  briefing(options: StoryBriefingOptions = {}): Promise<StoryBriefing> {
    return this.request(queryPath('/story-briefing', options));
  }

  presentation(presentationId: string): Promise<DeckSnapshot> {
    return this.request(`/presentations/${encodeURIComponent(presentationId)}`);
  }

  pageHistory(
    pageId: string,
    view: 'checkpoints' | 'operations' = 'checkpoints',
  ): Promise<PageVersionSummary[]> {
    return this.request(`/pages/${encodeURIComponent(pageId)}/versions?view=${view}`);
  }

  recordPageVersion(request: CreatePageCheckpointRequest): Promise<PageVersionSummary> {
    return this.request(`/pages/${encodeURIComponent(request.pageId)}/checkpoints`, request);
  }

  async importImage(
    file: File,
  ): Promise<{ path: string; name: string; width: number; height: number }> {
    if (file.size > 32 * 1024 * 1024) throw new Error('请选择小于 32 MiB 的图片。');
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('无法读取所选图片。'));
      reader.onload = () => resolve(String(reader.result).split(',')[1] ?? '');
      reader.readAsDataURL(file);
    });
    return this.request('/assets/import', { name: file.name, base64 });
  }

  pageVersion(pageId: string, versionId: string): Promise<PageVersionSnapshot> {
    return this.request(
      `/pages/${encodeURIComponent(pageId)}/versions/${encodeURIComponent(versionId)}`,
    );
  }

  selection(
    pageId: string | null,
    elementIds: string[],
    clientId: string,
    context?: { presentationId: string; occurrenceId?: string; versionId?: string },
  ): Promise<unknown> {
    return this.request('/selection', { pageId, elementIds, clientId, ...context });
  }

  export(
    format: 'pptx' | 'pdf',
    presentationId: string | null = null,
    includeHidden = false,
  ): Promise<{
    url: string;
    reportUrl: string;
    report: unknown;
    fileName: string;
  }> {
    return this.request('/export', { format, presentationId, includeHidden });
  }

  startProjectArchive(): Promise<ExportJobStatus> {
    return this.request('/export', { format: 'zip' });
  }

  exportSnapshot(exportId: string): Promise<DeckSnapshot> {
    return this.request(`/exports/${encodeURIComponent(exportId)}/snapshot`);
  }

  videoCapabilities(): Promise<VideoCapabilities> {
    return this.request('/video/capabilities');
  }

  startVideo(
    options: VideoExportOptions & { presentationId?: string | null },
  ): Promise<ExportJobStatus> {
    return this.request('/video', options);
  }

  exportStatus(id: string): Promise<ExportJobStatus> {
    return this.request(`/exports/${encodeURIComponent(id)}/status`);
  }

  cancelExport(jobId: string): Promise<ExportJobStatus> {
    return this.request('/exports/cancel', { jobId });
  }

  cancelVideo(jobId: string): Promise<ExportJobStatus> {
    return this.cancelExport(jobId);
  }

  render(
    pageId: string,
    occurrenceId?: string,
    presentationId?: string | null,
  ): Promise<ExportResult> {
    return this.request('/render', { pageId, occurrenceId, presentationId });
  }

  subscribe(
    listener: (event: DocumentEvent) => void,
    onConnection: (connected: boolean) => void,
  ): () => void {
    return subscribeAuthenticated(
      API,
      '/events',
      (event, data) => {
        if (['message', 'document', 'change'].includes(event))
          listener(JSON.parse(data) as DocumentEvent);
      },
      onConnection,
    );
  }
}
