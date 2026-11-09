import assert from 'node:assert/strict';

async function eventually(read, timeout = 15000) {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await read()) return;
    await new Promise((resolve) => setTimeout(resolve, 75));
  }
  throw new Error('Navigation acceptance timed out.');
}

export async function verifyNavigation({ app, page, api, check, capture }) {
  const before = await api('/session');
  const section = before.metadata.project.sections.find(
    (item) => item.startPageId && item.pageIds.length >= 3,
  );
  assert.ok(section, 'Use a synthetic first-Slide Section containing at least three Slides.');
  const detailId = section.pageIds[1];
  const detail = before.pages.find((item) => item.pageId === detailId);
  const toggle = () => page.locator(`[data-hd-section-toggle="${section.id}"]`);
  const canvas = () => page.locator('[data-hd-editor-canvas]');
  const revisions = (snapshot) => snapshot.pages.map((item) => [item.pageId, item.pageRevision]);
  await page.getByRole('button', { name: 'Slide thumbnails', exact: true }).click();
  await check('Outline searches folded Sections and preserves Slide identity', async () => {
    await page.locator('[data-hd-pages-outline]').click();
    await page.locator(`[data-hd-outline-row="${detailId}"]`).click();
    await canvas().locator(`[data-pptd-page="${detailId}"]`).waitFor();
    await toggle().click();
    assert.equal(await page.locator(`[data-hd-outline-row="${detailId}"]`).count(), 0);
    const search = page.getByRole('textbox', { name: 'Search the outline', exact: true });
    await search.fill(detail.shortCode);
    await page.locator(`[data-hd-outline-row="${detailId}"]`).waitFor();
    await page.locator(`[data-hd-outline-row="${section.startPageId}"]`).waitFor();
    await search.fill('');
    assert.equal(await page.locator(`[data-hd-outline-row="${detailId}"]`).count(), 0);
    await capture('outline-section-navigation.png');
    await page.locator('[data-hd-pages-thumbnails]').click();
    const stack = page.locator(`[data-hd-section-stack="${section.id}"]`);
    const shadows = await stack.evaluate((node) => [
      getComputedStyle(node, '::before').boxShadow,
      getComputedStyle(node, '::after').boxShadow,
      getComputedStyle(node.querySelector('[data-hd-thumbnail-preview]')).boxShadow,
    ]);
    assert.ok(shadows.every((shadow) => shadow !== 'none'));
    await capture('section-card-shadows.png');
    await toggle().click();
    assert.deepEqual(revisions(await api('/session')), revisions(before));
  });
  await check(
    'Pages manages one Section with first-Slide boundaries and shared Save/Undo',
    async () => {
      await page.locator(`[data-hd-section-manage="${section.id}"]`).click();
      const manager = page.locator('[data-hd-section-manager]');
      await manager.waitFor();
      assert.equal(await manager.locator('[data-hd-project-section]').count(), 1);
      assert.equal(await manager.locator('[data-hd-section-membership]').count(), 0);
      assert.equal(await manager.locator('[data-hd-section-first-slide]').count(), 1);
      const title = `${section.title} reviewed`;
      await manager.getByRole('textbox', { name: 'Section name', exact: true }).fill(title);
      await manager.getByRole('button', { name: /^Save Project$/i }).click();
      await eventually(
        async () =>
          (await api('/session')).metadata.project.sections.find((item) => item.id === section.id)
            ?.title === title,
      );
      await capture('section-manager-first-slide.png');
      await manager.getByRole('button', { name: 'Done', exact: true }).click();
      await canvas().focus();
      await page.keyboard.press(process.platform === 'darwin' ? 'Meta+z' : 'Control+z');
      await eventually(
        async () =>
          (await api('/session')).metadata.project.sections.find((item) => item.id === section.id)
            ?.title === section.title,
      );
      assert.deepEqual(revisions(await api('/session')), revisions(before));
    },
  );
  await check('Present enters fullscreen with a clean Slide and bottom-edge controls', async () => {
    const wasFullscreen = await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0].isFullScreen(),
    );
    await page.getByRole('button', { name: 'Present', exact: true }).click();
    const presenter = page.locator('[data-hd-presenter]');
    await presenter.waitFor();
    await eventually(() =>
      app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isFullScreen()),
    );
    const bounds = await presenter.boundingBox();
    assert.ok(bounds);
    await page.mouse.move(bounds.width / 2, bounds.height / 2);
    const controls = page.locator('[data-hd-presenter-controls]');
    const opacity = () => controls.evaluate((node) => Number(getComputedStyle(node).opacity));
    await eventually(async () => (await opacity()) === 0);
    await page.keyboard.press('Home');
    await page.keyboard.press('ArrowRight');
    assert.equal(await presenter.getAttribute('data-hd-presenter-controls-visible'), 'false');
    await capture('fullscreen-clean-slide.png');
    await page.mouse.move(bounds.width / 2, bounds.height - 2);
    await eventually(async () => (await opacity()) === 1);
    await controls.getByRole('button', { name: 'Next slide', exact: true }).click();
    await page.mouse.move(bounds.width / 2, bounds.height / 2);
    await eventually(async () => (await opacity()) === 0);
    assert.equal(
      await page.evaluate(() =>
        Boolean(document.activeElement?.closest('[data-hd-presenter-controls]')),
      ),
      false,
    );
    await page.keyboard.press('Escape');
    await presenter.waitFor({ state: 'hidden' });
    await eventually(
      async () =>
        (await app.evaluate(({ BrowserWindow }) =>
          BrowserWindow.getAllWindows()[0].isFullScreen(),
        )) === wasFullscreen,
    );
  });
}
