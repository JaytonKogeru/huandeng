import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { PageSnapshot } from '../../../pptd/types';
import { setUiLocale } from '../../lib/huandeng-locale';
import { TechnicalQaPanel } from './technical-qa-panel';

afterEach(async () => {
  vi.stubGlobal('localStorage', { setItem: () => {} });
  await setUiLocale('en');
  vi.unstubAllGlobals();
});

describe('Checks author review evidence', () => {
  it('presents current, stale and unverified as version evidence with occurrence and pinned limits in both languages', async () => {
    vi.stubGlobal('localStorage', { setItem: () => {} });
    const page: PageSnapshot = {
      pageId: 'synthetic',
      shortCode: null,
      path: 'synthetic.page',
      state: 'active',
      pageRevision: 'sha256:p',
      renderRevision: 'sha256:r',
      metadata: { shortCode: null, path: 'synthetic.page', state: 'active' },
      data: { elements: [], notes: 'Authored 中文 note' },
    };
    for (const status of ['current', 'stale', 'unverified'] as const) {
      page.authorReview = {
        status,
        recordedRenderRevision: status === 'unverified' ? null : 'sha256:recorded',
        currentRenderRevision: page.renderRevision,
        approvalVerified: false,
      };
      const before = JSON.stringify(page);
      const render = () =>
        renderToStaticMarkup(
          <TechnicalQaPanel
            page={page}
            projected={false}
            size={[960, 540]}
            diagnostics={[]}
            onSelect={() => {}}
          />,
        );
      await setUiLocale('en');
      const en = render();
      expect(en).toContain(`data-hd-author-review-state="${status}"`);
      expect(en).toContain(
        status === 'current'
          ? 'Recorded version matches'
          : status === 'stale'
            ? 'Recorded version is stale'
            : 'No verifiable recorded version',
      );
      expect(en).toContain('Version match only');
      expect(en).toContain('Occurrence order, notes and pinned versions are outside this evidence');
      expect(en).not.toContain('Approved');
      await setUiLocale('zh-CN');
      expect(render()).toContain('仅核对版本');
      expect(render()).toContain('放映顺序、演讲备注及固定版本');
      expect(JSON.stringify(page)).toBe(before);
    }
    delete page.authorReview;
    await setUiLocale('en');
    expect(
      renderToStaticMarkup(
        <TechnicalQaPanel
          page={page}
          projected={false}
          size={[960, 540]}
          diagnostics={[]}
          onSelect={() => {}}
        />,
      ),
    ).toContain('data-hd-author-review-state="unverified"');
  });

  it('separates unsaved artwork from each saved evidence state in both languages without changing the record', async () => {
    vi.stubGlobal('localStorage', { setItem: () => {} });
    const page: PageSnapshot = {
      pageId: 'synthetic',
      shortCode: null,
      path: 'synthetic.page',
      state: 'active',
      pageRevision: 'sha256:p',
      renderRevision: 'sha256:r',
      metadata: { shortCode: null, path: 'synthetic.page', state: 'active' },
      data: { elements: [], notes: 'Local unsaved 中文' },
    };
    for (const status of ['current', 'stale', 'unverified'] as const) {
      page.authorReview = {
        status,
        recordedRenderRevision: status === 'unverified' ? null : 'sha256:recorded',
        currentRenderRevision: page.renderRevision,
        approvalVerified: false,
      };
      const before = JSON.stringify(page);
      const render = () =>
        renderToStaticMarkup(
          <TechnicalQaPanel
            page={page}
            projected
            size={[960, 540]}
            diagnostics={[]}
            onSelect={() => {}}
          />,
        );
      await setUiLocale('en');
      const en = render();
      expect(en).toContain('data-hd-author-review-state="projected"');
      expect(en).toContain(`data-hd-author-review-saved-state="${status}"`);
      expect(en).not.toContain('Recorded version matches');
      expect(en).toContain('Displayed changes are outside saved review evidence');
      expect(en).toContain(
        'Unsaved or pending artwork is shown. Recorded evidence applies only to the saved base.',
      );
      if (status !== 'unverified') expect(en).toContain('sha256:recorded');
      await setUiLocale('zh-CN');
      const zh = render();
      expect(zh).toContain('当前显示的改动不在已保存的审阅证据范围内');
      expect(zh).toContain('审阅证据仅适用于已保存的基础版本');
      expect(zh).not.toContain('已记录的版本一致');
      expect(JSON.stringify(page)).toBe(before);
    }
  });
});
