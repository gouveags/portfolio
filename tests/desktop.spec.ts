import { test, expect, app, active, ready, dock, visibleApps, noHorizontalOverflow } from './helpers';

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Desktop window behavior');
  await page.goto('/');
  await ready(page, '/');
});

test('real navigation tiles at most two windows, selects, focuses, and restores', async ({ page }, testInfo) => {
  await expect(page.locator('.desktop-welcome h1')).toBeVisible();
  await dock(page, '/open-source/');
  await dock(page, '/blog/');
  await expect(visibleApps(page)).toHaveCount(2);
  await expect(page.locator('#workspace')).toHaveAttribute('data-layout', 'tiled');
  const left = await app(page, '/open-source/').boundingBox();
  const right = await app(page, '/blog/').boundingBox();
  expect(left).not.toBeNull(); expect(right).not.toBeNull();
  expect(left!.x + left!.width).toBeLessThanOrEqual(right!.x);
  await noHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath('desktop-tiled.png') });

  await app(page, '/open-source/').locator('h1').click();
  await active(page, '/open-source/');
  await app(page, '/open-source/').locator('[data-action="focus"]').click();
  await expect(visibleApps(page)).toHaveCount(1);
  await expect(page.locator('body')).toHaveClass(/focus-mode/);
  await expect(app(page, '/open-source/').locator('[data-action="focus"]')).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Restore tiled view', exact: true }).click();
  await expect(visibleApps(page)).toHaveCount(2);
  await expect(page.locator('body')).not.toHaveClass(/focus-mode/);

  await dock(page, '/projects/');
  await expect(visibleApps(page)).toHaveCount(2);
  await expect(app(page, '/blog/')).toBeHidden();
  await expect(app(page, '/open-source/')).toBeVisible();
  await expect(app(page, '/projects/').locator('h1')).toBeFocused();
});

test('minimize preserves an app, recents resumes it, close removes it', async ({ page }) => {
  await dock(page, '/open-source/');
  await dock(page, '/blog/');
  await app(page, '/blog/').getByRole('button', { name: 'Minimize Blog', exact: true }).click();
  await active(page, '/open-source/');
  await expect(app(page, '/blog/')).toBeHidden();
  await page.getByRole('button', { name: 'Recent windows' }).click();
  const recent = page.locator('.recent-card[data-recent-path="/blog/"]');
  await expect(recent).toContainText('Minimized');
  await recent.locator('[data-resume-path]').click();
  await active(page, '/blog/');
  await expect(page.locator('#recents')).not.toBeVisible();

  await app(page, '/blog/').getByRole('button', { name: 'Close Blog', exact: true }).click();
  await active(page, '/open-source/');
  await expect(app(page, '/blog/')).toHaveCount(0);
  await page.getByRole('button', { name: 'Recent windows' }).click();
  await expect(page.locator('[data-recent-path="/blog/"]')).toHaveCount(0);
  await page.locator('#recents').getByRole('button', { name: 'Close Open source', exact: true }).click();
  await active(page, '/');
  await expect(page.locator('#recents')).toBeVisible();
  await expect(page.locator('.recent-empty')).toHaveText(/No recent apps yet/);
  await expect(page.getByRole('button', { name: 'Close recents' })).toBeFocused();
});

test('Back and Forward restore routes, filters, focus, and a closed page', async ({ page }) => {
  await dock(page, '/open-source/');
  await app(page, '/open-source/').getByRole('button', { name: 'Original projects' }).click();
  await dock(page, '/blog/');
  await app(page, '/blog/').getByRole('button', { name: 'Focus Blog', exact: true }).click();
  await page.goBack();
  await active(page, '/open-source/');
  await expect(app(page, '/open-source/').getByRole('button', { name: 'Original projects' })).toHaveAttribute('aria-pressed', 'true');
  await expect(app(page, '/open-source/').locator('#bend')).toBeVisible();
  await expect(page.locator('body')).not.toHaveClass(/focus-mode/);
  await page.goForward();
  await active(page, '/blog/');
  await expect(page.locator('body')).toHaveClass(/focus-mode/);
  await expect(visibleApps(page)).toHaveCount(1);
  await app(page, '/blog/').getByRole('button', { name: 'Close Blog', exact: true }).click();
  await active(page, '/open-source/');
  await page.goBack();
  await active(page, '/blog/');
  await expect(app(page, '/blog/')).toHaveCount(1);
  await expect(app(page, '/blog/').locator('h1')).toBeFocused();
});

test('repeated navigation does not duplicate windows or history entries', async ({ page }) => {
  await dock(page, '/open-source/');
  const length = await page.evaluate(() => history.length);
  for (let i = 0; i < 4; i++) await dock(page, '/open-source/');
  await expect(app(page, '/open-source/')).toHaveCount(1);
  expect(await page.evaluate(() => history.length)).toBe(length);
  await dock(page, '/blog/');
  for (let i = 0; i < 3; i++) await dock(page, '/blog/');
  await expect(app(page, '/blog/')).toHaveCount(1);
  await expect(visibleApps(page)).toHaveCount(2);
  await page.goBack();
  await active(page, '/open-source/');
  await page.goBack();
  await active(page, '/');
});

test('a newer navigation wins over a delayed earlier real route response', async ({ page }) => {
  let release!: () => void;
  let requestStarted!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const started = new Promise<void>((resolve) => { requestStarted = resolve; });
  let routeFinished!: () => void;
  const finished = new Promise<void>((resolve) => { routeFinished = resolve; });
  await page.route('**/open-source/', async (route) => {
    const response = await route.fetch(); // The actual production HTML, not a fixture.
    requestStarted();
    await gate;
    try { await route.fulfill({ response }); } finally { routeFinished(); }
  });
  await page.locator('.dock a[href="/open-source/"]').click();
  await started;
  await dock(page, '/blog/');
  release();
  await finished;
  await active(page, '/blog/');
  await expect(app(page, '/blog/')).toHaveCount(1);
  await expect(page.locator('#workspace')).not.toHaveAttribute('aria-busy', 'true');
  await page.goBack();
  await active(page, '/');
});

test('a current-page fragment cancels an older in-flight app navigation', async ({ page }) => {
  await dock(page, '/open-source/');
  let release!: () => void;
  let requestStarted!: () => void;
  let routeFinished!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const started = new Promise<void>((resolve) => { requestStarted = resolve; });
  const finished = new Promise<void>((resolve) => { routeFinished = resolve; });
  await page.route('**/blog/', async (route) => {
    const response = await route.fetch();
    requestStarted();
    await gate;
    try { await route.fulfill({ response }); } finally { routeFinished(); }
  });
  await page.locator('.dock a[href="/blog/"]').click();
  await started;
  await app(page, '/open-source/').getByRole('link', { name: 'Bend', exact: true }).click();
  release();
  await finished;
  await active(page, '/open-source/');
  await expect(page).toHaveURL(/\/open-source\/#bend$/);
  await expect(app(page, '/open-source/').locator('#bend')).toBeVisible();
  await expect(app(page, '/blog/')).toHaveCount(0);
});

test('opening both real articles preserves unique IDs and accessible article names', async ({ page }) => {
  const first = '/blog/why-this-desktop/';
  const second = '/blog/vision-design-and-tech-choices/';
  await dock(page, '/blog/');
  await app(page, '/blog/').locator(`h2 a[href="${first}"]`).click();
  await active(page, first);
  await dock(page, '/blog/');
  await app(page, '/blog/').locator(`h2 a[href="${second}"]`).click();
  await active(page, second);
  const ids = await page.locator('[id]').evaluateAll((elements) => elements.map((element) => element.id));
  expect(ids.length).toBe(new Set(ids).size);
  for (const path of [first, second]) {
    const article = app(page, path).locator('.article-body');
    const heading = (await article.locator('h1').textContent())?.trim();
    await expect(article).toHaveAccessibleName(heading!);
  }
});
