import { test, expect, app, active, ready, visibleApps, scrollPosition, noHorizontalOverflow, settledScreenshot } from './helpers';

test.beforeEach(async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile', 'Phone navigation behavior');
  await page.goto('/');
  await ready(page, '/');
});

test('Home app grid, Back, and Recents preserve a filtered blog and article scroll', async ({ page }, testInfo) => {
  const articlePath = '/blog/vision-design-and-tech-choices/';
  await expect(page.getByRole('navigation', { name: 'Apps', exact: true })).toBeVisible();
  await page.locator('.app-grid a[href="/blog/"]').click();
  await active(page, '/blog/');
  await expect(visibleApps(page)).toHaveCount(1);
  const blog = app(page, '/blog/');
  await blog.getByRole('button', { name: 'Engineering', exact: true }).click();
  await expect(blog.locator('.blog-entry:visible')).toHaveCount(1);
  await blog.locator(`h2 a[href="${articlePath}"]`).click();
  await active(page, articlePath);
  await expect(app(page, articlePath).locator('h1')).toBeFocused();
  const scroller = app(page, articlePath).locator('.window-scroll');
  const before = await scrollPosition(scroller, 250);
  await page.locator('.mobile-nav').getByRole('link', { name: 'Home', exact: true }).click();
  await active(page, '/');
  await page.locator('.mobile-nav').getByRole('button', { name: 'Recents', exact: true }).click();
  await expect(page.locator('#recents')).toBeVisible();
  await expect(page.locator('.recent-card')).toHaveCount(2);
  await settledScreenshot(page, testInfo.outputPath('mobile-recents.png'));
  await page.locator(`.recent-card[data-recent-path="${articlePath}"] [data-resume-path]`).click();
  await active(page, articlePath);
  await expect.poll(() => scroller.evaluate((element) => element.scrollTop)).toBeCloseTo(before, 0);
  await expect(visibleApps(page)).toHaveCount(1);
  await noHorizontalOverflow(page);

  // Back retraces real navigation, including the deliberate trip through Home.
  await page.locator('.mobile-nav').getByRole('button', { name: 'Back', exact: true }).click();
  await active(page, '/');
  await page.locator('.mobile-nav').getByRole('button', { name: 'Back', exact: true }).click();
  await active(page, articlePath);
  await page.locator('.mobile-nav').getByRole('button', { name: 'Back', exact: true }).click();
  await active(page, '/blog/');
  await expect(blog.getByRole('button', { name: 'Engineering', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(blog.locator('.blog-entry:visible')).toHaveCount(1);
});

test('closing a recent app keeps the picker open and does not accidentally resume it', async ({ page }) => {
  await page.locator('.app-grid a[href="/projects/"]').click();
  await active(page, '/projects/');
  await page.locator('.mobile-nav').getByRole('link', { name: 'Home', exact: true }).click();
  await active(page, '/');
  await page.locator('.app-grid a[href="/blog/"]').click();
  await active(page, '/blog/');
  await page.locator('.mobile-nav').getByRole('button', { name: 'Recents', exact: true }).click();
  await page.locator('[data-close-path="/projects/"]').click();
  await expect(page).toHaveURL(/\/blog\/$/);
  await expect(page.locator('body')).toHaveAttribute('data-active-path', '/blog/');
  await expect(app(page, '/blog/')).toHaveClass(/\bis-active\b/);
  await expect(page.locator('#main-content')).toBeHidden();
  await expect(page.locator('#recents')).toBeVisible();
  await expect(app(page, '/projects/')).toHaveCount(0);
  await expect(page.locator('[data-recent-path="/projects/"]')).toHaveCount(0);
  await page.locator('[data-close-path="/blog/"]').click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator('body')).toHaveAttribute('data-active-path', '/');
  await expect(app(page, '/')).toHaveClass(/\bis-active\b/);
  await expect(page.locator('#recents')).toBeVisible();
  await expect(page.locator('.recent-empty')).toBeVisible();
  await page.getByRole('button', { name: 'Close recents' }).click();
  await expect(page.locator('#recents')).toBeHidden();
  await active(page, '/');
  await expect(page.locator('.mobile-nav').getByRole('button', { name: 'Recents', exact: true })).toBeFocused();
});

test('Recents provides working Home and Back controls inside the modal', async ({ page }) => {
  await page.locator('.app-grid a[href="/blog/"]').click();
  await active(page, '/blog/');
  await page.locator('.mobile-nav [data-action="recents"]').click();
  await expect(page.locator('#main-content')).toBeHidden();
  for (const control of await page.locator('.recents-nav a, .recents-nav button').all()) {
    await expect(control).toBeVisible();
    await expect(control).toBeInViewport();
  }
  await page.locator('.recents-nav').getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('#recents')).toBeHidden();
  await active(page, '/blog/');
  await page.locator('.mobile-nav [data-action="recents"]').click();
  await page.locator('.recents-nav').getByRole('link', { name: 'Home', exact: true }).click();
  await expect(page.locator('#recents')).toBeHidden();
  await active(page, '/');
});
