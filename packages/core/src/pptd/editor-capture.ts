import type { Browser, Page } from 'playwright';
import { connectClient } from './client';
import { captureViewports, editorCaptureOptions } from './editor-capture-options';
import { openBrowser } from './export-environment';
import type { SessionCapability } from './session-authority';
import { type DeckSnapshot, PptdError } from './types';

async function identityControl(
  page: Page,
  attribute: 'data-hd-version' | 'data-hd-review-operation',
  id: string,
) {
  await page.waitForFunction(
    ({ attribute, id }) =>
      [...document.querySelectorAll(`[${attribute}]`)].some(
        (element) => element.getAttribute(attribute) === id,
      ),
    { attribute, id },
  );
  const controls = page.locator(`[${attribute}]`);
  const index = await controls.evaluateAll(
    (elements, { attribute, id }) =>
      elements.findIndex((element) => element.getAttribute(attribute) === id),
    { attribute, id },
  );
  if (index < 0)
    throw new PptdError(
      'INVALID_REQUEST',
      'The requested saved state is not visible in this Editor.',
    );
  return controls.nth(index);
}

export async function captureEditor(
  serverUrl: string,
  input: Record<string, unknown>,
  snapshot: DeckSnapshot,
) {
  const options = editorCaptureOptions(input, snapshot);
  const origin = new URL(serverUrl).origin;
  const url = new URL('/huandeng', origin);
  url.searchParams.set('page', options.pageId);
  let browser: Browser | undefined;
  let capability: SessionCapability | undefined;
  const timeout = setTimeout(() => {
    void browser?.close();
  }, 45000);
  timeout.unref();
  try {
    const client = await connectClient({ entry: snapshot.entry, url: serverUrl });
    capability = await client.request<SessionCapability>('/auth/capture', {});
    if (capability.role !== 'capture' || capability.epoch !== snapshot.epoch)
      throw new PptdError(
        'REVISION_CONFLICT',
        'Reconnect to the current Project before capturing.',
      );
    browser = await openBrowser();
    const context = await browser.newContext({
      viewport: captureViewports[options.viewport],
      deviceScaleFactor: 2,
      serviceWorkers: 'block',
    });
    await context.addInitScript((value) => {
      (
        window as Window & { __HUANDENG_EXPORT_AUTH__?: SessionCapability }
      ).__HUANDENG_EXPORT_AUTH__ = value;
    }, capability);
    await context.addInitScript((locale) => {
      localStorage.setItem('huandeng:ui-locale', locale);
    }, options.locale);
    const blocked: string[] = [];
    let preventedSelectionWrites = 0;
    await context.route('**/*', async (route) => {
      const request = route.request();
      const target = new URL(request.url());
      if (
        target.origin === origin &&
        (['GET', 'HEAD'].includes(request.method()) ||
          (request.method() === 'POST' && target.pathname === '/__pptd/auth/resources'))
      ) {
        await route.continue();
      } else {
        if (target.origin === origin && target.pathname === '/__pptd/selection')
          preventedSelectionWrites++;
        else blocked.push(target.origin + target.pathname);
        await route.abort('blockedbyclient');
      }
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.locator('[data-hd-editor-canvas]').waitFor({ state: 'visible' });
    if (options.objectId) {
      await page.locator('[data-hd-inspector-tab="layers"]').click();
      const rows = page.locator('[data-hd-layer]');
      const index = await rows.evaluateAll(
        (items, id) => items.findIndex((item) => item.getAttribute('data-hd-layer') === id),
        options.objectId,
      );
      if (index < 0)
        throw new PptdError('INVALID_REQUEST', 'The requested object is not shown in Layers.');
      await rows.nth(index).click();
    }
    await page.locator(`[data-hd-inspector-tab="${options.inspector}"]`).click();
    await page.locator(`[data-hd-workspace-view="${options.view}"]`).click();
    const sidebarIndex = { project: 0, pages: 1, assets: 2, files: 3 }[options.sidebar];
    await page.locator('.hd-navigation-tabs > button').nth(sidebarIndex).click();
    await page.waitForFunction(
      (view) =>
        document
          .querySelector('[data-hd-current-workspace-view]')
          ?.getAttribute('data-hd-current-workspace-view') === view,
      options.view,
    );
    if (options.sidebar === 'files') {
      const tree = page.locator('[data-hd-project-tree]');
      await tree.waitFor({ state: 'visible' });
      await tree.locator('[data-hd-project-root]').waitFor({ state: 'visible' });
    }
    if (options.sidebar === 'assets') {
      await page
        .locator('[data-hd-asset-library][aria-busy="false"]')
        .waitFor({ state: 'visible' });
    }
    if (options.historyVersionId) {
      const control = await identityControl(page, 'data-hd-version', options.historyVersionId);
      if ((await control.getAttribute('aria-pressed')) !== 'true') {
        await Promise.all([
          page.waitForResponse(
            (response) =>
              new URL(response.url()).pathname ===
              `/__pptd/pages/${encodeURIComponent(options.pageId)}/versions/${encodeURIComponent(options.historyVersionId as string)}`,
          ),
          control.click(),
        ]);
      }
      await page
        .locator('[data-hd-history-preview] [data-pptd-page]')
        .waitFor({ state: 'visible' });
    }
    if (options.reviewOperationId) {
      await page.locator('[data-hd-open-activity]').click();
      await (
        await identityControl(page, 'data-hd-review-operation', options.reviewOperationId)
      ).click();
      const review = page.locator('[data-hd-operation-review]');
      await review.waitFor({ state: 'visible' });
      if ((await review.getAttribute('data-hd-operation-review')) !== options.reviewOperationId)
        throw new PptdError(
          'INVALID_REQUEST',
          'The visible Review does not match the requested receipt.',
        );
      const affectedPage = review.locator('[data-hd-review-page]');
      await affectedPage.waitFor({ state: 'visible' });
      if ((await affectedPage.inputValue()) !== options.pageId)
        await affectedPage.selectOption(options.pageId);
      await page.waitForFunction(
        (pageId) =>
          document
            .querySelector('[data-hd-review-canvas="after"] [data-pptd-page]')
            ?.getAttribute('data-pptd-page') === pageId,
        options.pageId,
      );
    }
    if (options.dialog === 'export') {
      await Promise.all([
        page.waitForResponse(
          (response) => new URL(response.url()).pathname === '/__pptd/video/capabilities',
        ),
        page.locator('[data-hd-export]').click(),
      ]);
      await page.locator('[data-hd-export-dialog]').waitFor({ state: 'visible' });
    }
    await page.evaluate(async () => {
      await document.fonts.ready;
    });
    await page.waitForFunction(() =>
      [...document.images].every((image) => {
        const style = getComputedStyle(image);
        if (style.display === 'none' || style.visibility === 'hidden') return true;
        const rect = image.getBoundingClientRect();
        const region =
          rect.width && rect.height ? rect : image.parentElement?.getBoundingClientRect();
        if (
          !region?.width ||
          !region.height ||
          region.bottom <= 0 ||
          region.right <= 0 ||
          region.top >= innerHeight ||
          region.left >= innerWidth
        )
          return true;
        return image.complete && image.naturalWidth > 0;
      }),
    );
    if (blocked.length)
      throw new PptdError(
        'INVALID_REQUEST',
        'Editor capture blocked external or mutating requests. Import remote images before capturing.',
        { blocked: [...new Set(blocked)].slice(0, 10) },
      );
    if (errors.length)
      throw new PptdError('INVALID_REQUEST', 'The Editor could not render cleanly.', { errors });
    const bytes = await page.screenshot({ type: 'png', animations: 'disabled' });
    return {
      bytes,
      state: options,
      preventedSelectionWrites,
      capturedAt: new Date().toISOString(),
      source: 'real-web-editor' as const,
    };
  } finally {
    clearTimeout(timeout);
    await browser?.close();
    if (capability)
      await fetch(`${origin}/__pptd/auth/capture/revoke`, {
        method: 'POST',
        headers: { 'x-huandeng-token': capability.token },
        redirect: 'error',
        signal: AbortSignal.timeout(2000),
      }).catch(() => {});
  }
}
