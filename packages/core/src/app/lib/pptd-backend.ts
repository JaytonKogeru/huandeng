import type { ActivityEvent, ActivitySnapshot } from '../../pptd/activity';
import type { AssetLibraryOptions, AssetLibraryResult } from '../../pptd/asset-library';
import type { ProjectFilePreview } from '../../pptd/project-file-preview';
import type { StoryBriefing, StoryBriefingOptions } from '../../pptd/project-insights';
import type {
  CreatePageCheckpointRequest,
  DeckSnapshot,
  DocumentEvent,
  HistorySummary,
  PageVersionSnapshot,
  PageVersionSummary,
  TransactionRequest,
  TransactionResult,
} from '../../pptd/types';
import type { VideoCapabilities } from '../../pptd/video-encoder';
import type { ExportJobStatus, ExportResult, VideoExportOptions } from '../../pptd/video-plan';

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
  getCommittedSnapshot?(): Promise<PptdSession>;
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
  if (!exportId && /^https?:\/\//i.test(path)) return path;
  const prefix = exportId ? `${API}/exports/${encodeURIComponent(exportId)}` : API;
  return `${prefix}/asset?path=${encodeURIComponent(path)}`;
}

export function pptdAssetPreviewUrl(path: string, size: 320 | 640 = 320): string {
  if (/^(?:https?:|data:|blob:)/i.test(path)) return path;
  return `${API}/asset-preview?path=${encodeURIComponent(path)}&size=${size}`;
}

export function pptdProjectFileImageUrl(path: string, revision: string): string {
  return `${API}${queryPath('/project-file-preview/image', { path, revision })}`;
}

export class PptdBackend implements PptdTransport {
  private token = '';

  activity(signal?: AbortSignal): Promise<ActivitySnapshot> {
    return this.request('/activity', undefined, signal);
  }

  subscribeActivity(
    listener: (event: ActivityEvent) => void,
    onConnection: (connected: boolean) => void,
  ): () => void {
    const stream = new EventSource(`${API}/activity/events`);
    stream.addEventListener('connected', () => onConnection(true));
    stream.addEventListener('activity', (event) => {
      try {
        listener(JSON.parse((event as MessageEvent).data) as ActivityEvent);
      } catch {
        onConnection(false);
      }
    });
    stream.onerror = () => onConnection(false);
    return () => stream.close();
  }

  private async request<T>(path: string, body?: unknown, signal?: AbortSignal): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${API}${path}`, {
        method: body === undefined ? 'GET' : 'POST',
        headers:
          body === undefined
            ? undefined
            : { 'content-type': 'application/json', 'x-huandeng-token': this.token },
        body: body === undefined ? undefined : JSON.stringify(body),
        cache: 'no-store',
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
    return payload as T;
  }

  async getSnapshot(): Promise<PptdSession> {
    return this.acceptSession(await this.request<PptdSession>('/session'));
  }

  async getCommittedSnapshot(): Promise<PptdSession> {
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
    this.token = session.sessionToken;
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

  cancelVideo(jobId: string): Promise<ExportJobStatus> {
    return this.request('/video/cancel', { jobId });
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
    const stream = new EventSource(`${API}/events`);
    const receive = (event: MessageEvent<string>) => {
      try {
        listener(JSON.parse(event.data) as DocumentEvent);
      } catch {
        onConnection(false);
      }
    };
    stream.onopen = () => onConnection(true);
    stream.onerror = () => onConnection(false);
    stream.onmessage = receive;
    stream.addEventListener('document', receive as EventListener);
    stream.addEventListener('change', receive as EventListener);
    return () => stream.close();
  }
}
