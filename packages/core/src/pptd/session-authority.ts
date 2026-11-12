import { randomBytes } from 'node:crypto';

export type SessionRole = 'agent' | 'ui' | 'export' | 'capture';

export interface SessionCapability {
  token: string;
  epoch: string;
  expiresAt: number;
  role: SessionRole;
  exportId?: string;
}

export interface ResourceRequest {
  route: string;
  path?: string;
  revision?: string;
  size?: string;
}

export interface ResourceTicket extends ResourceRequest {
  ticket: string;
  expiresAt: number;
}

const key = () => randomBytes(32).toString('base64url');
const browserLifetime = 12 * 60 * 60 * 1000;
const resourceLifetime = 15 * 60 * 1000;

export class SessionAuthority {
  readonly agentToken = key();
  readonly launcherToken = key();
  private capabilities = new Map<string, SessionCapability>();
  private launches = new Map<string, number>();
  private resources = new Map<string, ResourceTicket>();
  private resourceKeys = new Map<string, string>();
  private exportResources = new Map<string, Set<string>>();

  constructor(
    readonly epoch: string,
    private now: () => number = Date.now,
  ) {
    this.capabilities.set(this.agentToken, {
      token: this.agentToken,
      epoch,
      role: 'agent',
      expiresAt: Number.MAX_SAFE_INTEGER,
    });
  }

  authenticate(value: unknown): SessionCapability | undefined {
    if (typeof value !== 'string') return undefined;
    const capability = this.capabilities.get(value);
    if (!capability || capability.expiresAt <= this.now()) {
      this.capabilities.delete(value);
      return undefined;
    }
    return capability;
  }

  isLauncher(value: unknown): boolean {
    return typeof value === 'string' && value === this.launcherToken;
  }

  createUiCapability(): SessionCapability {
    this.prune();
    if (this.capabilities.size > 256) throw new Error('Too many active editor sessions.');
    const value: SessionCapability = {
      token: key(),
      epoch: this.epoch,
      role: 'ui',
      expiresAt: this.now() + browserLifetime,
    };
    this.capabilities.set(value.token, value);
    return value;
  }

  createLaunchTicket(): { ticket: string; expiresAt: number; epoch: string } {
    this.prune();
    if (this.launches.size >= 64) throw new Error('Too many pending editor launches.');
    const ticket = key();
    const expiresAt = this.now() + 60_000;
    this.launches.set(ticket, expiresAt);
    return { ticket, expiresAt, epoch: this.epoch };
  }

  exchangeLaunch(value: unknown): SessionCapability | undefined {
    if (typeof value !== 'string') return undefined;
    const expiresAt = this.launches.get(value);
    this.launches.delete(value);
    if (!expiresAt || expiresAt <= this.now()) return undefined;
    return this.createUiCapability();
  }

  createCaptureCapability(): SessionCapability {
    this.prune();
    if (this.capabilities.size > 256) throw new Error('Too many active editor sessions.');
    const value: SessionCapability = {
      token: key(),
      epoch: this.epoch,
      role: 'capture',
      expiresAt: this.now() + 60_000,
    };
    this.capabilities.set(value.token, value);
    return value;
  }

  createExportCapability(exportId: string): SessionCapability {
    this.prune();
    const value: SessionCapability = {
      token: key(),
      epoch: this.epoch,
      role: 'export',
      exportId,
      expiresAt: this.now() + browserLifetime,
    };
    this.capabilities.set(value.token, value);
    return value;
  }

  revoke(token: string): void {
    this.capabilities.delete(token);
    for (const ticket of this.exportResources.get(token) ?? []) this.resources.delete(ticket);
    this.exportResources.delete(token);
  }

  permits(capability: SessionCapability, route: string, method: string): boolean {
    if (capability.role === 'capture')
      return (
        method === 'GET' ||
        (method === 'POST' && ['/auth/resources', '/auth/capture/revoke'].includes(route))
      );
    if (capability.role !== 'export') return true;
    return (
      (method === 'POST' && route === '/auth/resources') ||
      (method === 'GET' && route === `/exports/${capability.exportId}/snapshot`)
    );
  }

  issueResource(request: ResourceRequest, capability: SessionCapability): ResourceTicket {
    this.prune();
    const resource = { ...request };
    const asset = resource.route === '/asset' || resource.route === '/asset-preview';
    const preview = resource.route === '/project-file-preview/image';
    const exported = /^\/exports\/[^/]+\/(?:asset|download|report)$/.test(resource.route);
    if (!asset && !preview && !exported) throw new Error('Unsupported resource purpose.');
    if (capability.role === 'export' && resource.route !== `/exports/${capability.exportId}/asset`)
      throw new Error('Export capability belongs to another resource.');
    if (
      (asset || preview || resource.route.endsWith('/asset')) &&
      typeof resource.path !== 'string'
    )
      throw new Error('A resource path is required.');
    if (asset || preview) {
      if (!resource.revision || !/^sha256:[a-f\d]{64}$/.test(resource.revision))
        throw new Error('A resource content revision is required.');
    }
    if (resource.route === '/asset-preview' && !['320', '640'].includes(resource.size ?? ''))
      throw new Error('Unsupported preview size.');
    const resourceKey = `${['export', 'capture'].includes(capability.role) ? capability.token : ''}:${JSON.stringify(resource)}`;
    const cached = this.resources.get(this.resourceKeys.get(resourceKey) ?? '');
    if (cached && cached.expiresAt > this.now() + 60_000) return cached;
    if (this.resources.size >= 8192) throw new Error('Too many active resource tickets.');
    const value = {
      ...resource,
      ticket: key(),
      expiresAt: Math.min(this.now() + resourceLifetime, capability.expiresAt),
    };
    this.resources.set(value.ticket, value);
    this.resourceKeys.set(resourceKey, value.ticket);
    if (capability.role === 'export' || capability.role === 'capture') {
      const tickets = this.exportResources.get(capability.token) ?? new Set<string>();
      tickets.add(value.ticket);
      this.exportResources.set(capability.token, tickets);
    }
    return value;
  }

  authorizeResource(route: string, params: URLSearchParams, method: string): boolean {
    if (method !== 'GET') return false;
    const resource = this.resources.get(params.get('ticket') ?? '');
    if (!resource || resource.expiresAt <= this.now() || resource.route !== route) return false;
    if ((params.get('path') ?? undefined) !== resource.path) return false;
    if ((params.get('size') ?? undefined) !== resource.size) return false;
    const revision = params.get('revision');
    if (revision && revision !== resource.revision) return false;
    if (resource.revision) params.set('revision', resource.revision);
    return true;
  }

  private prune(): void {
    const now = this.now();
    for (const [token, value] of this.capabilities) if (value.expiresAt <= now) this.revoke(token);
    for (const [token, expiresAt] of this.launches)
      if (expiresAt <= now) this.launches.delete(token);
    for (const [token, value] of this.resources)
      if (value.expiresAt <= now) this.resources.delete(token);
    for (const [resource, token] of this.resourceKeys)
      if (!this.resources.has(token)) this.resourceKeys.delete(resource);
  }
}
