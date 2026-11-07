import type {
  DeckSnapshot,
  DocumentEvent,
  HistorySummary,
  TransactionRequest,
  TransactionResult,
} from '../../pptd/types';

export type PptdSession = DeckSnapshot & { sessionToken: string };

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

export function pptdAssetUrl(path: string, exportId?: string): string {
  if (!exportId && /^https?:\/\//i.test(path)) return path;
  const prefix = exportId ? `${API}/exports/${encodeURIComponent(exportId)}` : API;
  return `${prefix}/asset?path=${encodeURIComponent(path)}`;
}

export class PptdBackend implements PptdTransport {
  private token = '';

  private async request<T>(path: string, body?: unknown): Promise<T> {
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
      });
    } catch (error) {
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
    const session = await this.request<PptdSession>('/session');
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

  selection(pageId: string | null, elementIds: string[], clientId: string): Promise<unknown> {
    return this.request('/selection', { pageId, elementIds, clientId });
  }

  export(format: 'pptx' | 'pdf'): Promise<{
    url: string;
    reportUrl: string;
    report: unknown;
    fileName: string;
  }> {
    return this.request('/export', { format });
  }

  exportSnapshot(exportId: string): Promise<DeckSnapshot> {
    return this.request(`/exports/${encodeURIComponent(exportId)}/snapshot`);
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
