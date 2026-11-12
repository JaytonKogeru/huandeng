import { describe, expect, it } from 'vitest';
import { SessionAuthority } from './session-authority';

const revision = `sha256:${'a'.repeat(64)}`;

describe('local session capabilities', () => {
  it('separates launcher, Agent, UI and export authority', () => {
    const authority = new SessionAuthority('project-epoch');
    const agent = authority.authenticate(authority.agentToken);
    const ui = authority.createUiCapability();
    expect(agent?.role).toBe('agent');
    expect(authority.authenticate(ui.token)?.role).toBe('ui');
    expect(authority.isLauncher(authority.agentToken)).toBe(false);
    expect(authority.authenticate(authority.launcherToken)).toBeUndefined();
    const exported = authority.createExportCapability('job-1');
    expect(authority.permits(exported, '/transactions', 'POST')).toBe(false);
    expect(authority.permits(exported, '/session', 'GET')).toBe(false);
    expect(authority.permits(exported, '/exports/job-2/snapshot', 'GET')).toBe(false);
    expect(authority.permits(exported, '/exports/job-1/snapshot', 'GET')).toBe(true);
  });

  it('keeps capture credentials read-only and revokes their image tickets', () => {
    const authority = new SessionAuthority('epoch');
    const capture = authority.createCaptureCapability();
    expect(authority.permits(capture, '/session', 'GET')).toBe(true);
    expect(authority.permits(capture, '/auth/resources', 'POST')).toBe(true);
    for (const route of [
      '/transactions',
      '/recover',
      '/selection',
      '/auth/capture',
      '/proposals/p/decision',
    ])
      expect(authority.permits(capture, route, 'POST')).toBe(false);
    const resource = authority.issueResource(
      { route: '/asset', path: 'media/a.svg', revision },
      capture,
    );
    expect(resource.expiresAt).toBeLessThanOrEqual(capture.expiresAt);
    authority.revoke(capture.token);
    expect(authority.authenticate(capture.token)).toBeUndefined();
    expect(
      authority.authorizeResource(
        '/asset',
        new URLSearchParams({ path: 'media/a.svg', ticket: resource.ticket }),
        'GET',
      ),
    ).toBe(false);
  });

  it('consumes each launch atomically and rejects replay, other Projects and expiration', async () => {
    let now = 1000;
    const authority = new SessionAuthority('epoch-1', () => now);
    const other = new SessionAuthority('epoch-2', () => now);
    const launch = authority.createLaunchTicket();
    expect(other.exchangeLaunch(launch.ticket)).toBeUndefined();
    const results = await Promise.all(
      Array.from({ length: 8 }, async () => authority.exchangeLaunch(launch.ticket)),
    );
    expect(results.filter(Boolean)).toHaveLength(1);
    expect(authority.exchangeLaunch(launch.ticket)).toBeUndefined();
    const expired = authority.createLaunchTicket();
    now = expired.expiresAt;
    expect(authority.exchangeLaunch(expired.ticket)).toBeUndefined();
  });

  it('binds image tickets to path, content, method, size, purpose and owning writer', () => {
    let now = 1000;
    const authority = new SessionAuthority('epoch-1', () => now);
    const ui = authority.createUiCapability();
    const ticket = authority.issueResource(
      { route: '/asset-preview', path: 'media/plot.svg', revision, size: '320' },
      ui,
    );
    const params = () =>
      new URLSearchParams({ path: 'media/plot.svg', size: '320', revision, ticket: ticket.ticket });
    expect(authority.authorizeResource('/asset-preview', params(), 'GET')).toBe(true);
    expect(authority.authorizeResource('/asset', params(), 'GET')).toBe(false);
    expect(authority.authorizeResource('/asset-preview', params(), 'POST')).toBe(false);
    for (const [key, value] of [
      ['path', 'media/other.svg'],
      ['size', '640'],
      ['revision', `sha256:${'b'.repeat(64)}`],
    ]) {
      const swapped = params();
      swapped.set(key, value);
      expect(authority.authorizeResource('/asset-preview', swapped, 'GET')).toBe(false);
    }
    expect(
      new SessionAuthority('new-epoch').authorizeResource('/asset-preview', params(), 'GET'),
    ).toBe(false);
    expect(authority.authenticate(ticket.ticket)).toBeUndefined();
    now = ticket.expiresAt;
    expect(authority.authorizeResource('/asset-preview', params(), 'GET')).toBe(false);
  });

  it('revokes completed renderer credentials and its resources without revoking the UI download', () => {
    const authority = new SessionAuthority('epoch');
    const exported = authority.createExportCapability('job-1');
    const ui = authority.createUiCapability();
    expect(() =>
      authority.issueResource({ route: '/asset', path: 'media/a.svg', revision }, exported),
    ).toThrow();
    const image = authority.issueResource(
      { route: '/exports/job-1/asset', path: 'media/a.svg', revision },
      exported,
    );
    const download = authority.issueResource({ route: '/exports/job-1/download' }, ui);
    authority.revoke(exported.token);
    expect(authority.authenticate(exported.token)).toBeUndefined();
    expect(
      authority.authorizeResource(
        '/exports/job-1/asset',
        new URLSearchParams({ path: 'media/a.svg', ticket: image.ticket }),
        'GET',
      ),
    ).toBe(false);
    expect(
      authority.authorizeResource(
        '/exports/job-1/download',
        new URLSearchParams({ ticket: download.ticket }),
        'GET',
      ),
    ).toBe(true);
  });
});
