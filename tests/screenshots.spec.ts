// Independent evidence capture: these tests still run when behavior/axe tests fail.
// Screenshots are build artifacts under test-results, never committed baselines.
import { test, expect, ready, app, dock, articlePath } from './helpers';

for (const route of ['/', '/open-source/', '/blog/', articlePath]) {
  test(`capture visual evidence: ${route}`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: testInfo.outputPath(`${testInfo.project.name}-${route.replace(/\//g, '-') || 'home'}.png`) });
    await ready(page, route);
  });
}

test('capture desktop tiling or phone recents', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await ready(page, '/');
  if (testInfo.project.name === 'desktop') {
    await dock(page, '/open-source/');
    await dock(page, '/blog/');
    await page.screenshot({ path: testInfo.outputPath('desktop-tiled-workspace.png') });
    await expect(page.locator('#workspace')).toHaveAttribute('data-layout', 'tiled');
  } else {
    await page.locator('.app-grid a[href="/blog/"]').click();
    await ready(page, '/blog/');
    await app(page, '/blog/').locator(`h2 a[href="${articlePath}"]`).click();
    await ready(page, articlePath);
    await page.locator('.mobile-nav [data-action="recents"]').click();
    await page.screenshot({ path: testInfo.outputPath('mobile-recents.png') });
    await expect(page.locator('#recents')).toBeVisible();
  }
});
