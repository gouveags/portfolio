import AxeBuilder from '@axe-core/playwright';
import { test, expect, app, ready, routes, noHorizontalOverflow, openSearch } from './helpers';

for (const route of routes) {
  test(`accessible server route and screenshot: ${route}`, async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route);
    await ready(page, route);
    await expect(app(page, route).locator('h1:visible')).toHaveCount(1);
    await noHorizontalOverflow(page);
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
    await page.screenshot({ path: testInfo.outputPath(`${route.replace(/\//g, '-') || 'home'}.png`) });
  });
}

test('launcher has no accessibility violations and traps keyboard focus', async ({ page }, testInfo) => {
  await page.goto('/');
  await ready(page, '/');
  await openSearch(page, testInfo.project.name === 'mobile');
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
  expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
  const tabbables = await page.locator('#launcher a[href], #launcher button, #launcher input').count();
  for (let i = 0; i < tabbables + 2; i++) {
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => Boolean(document.activeElement?.closest('#launcher')))).toBe(true);
  }
});

test('keyboard skip link reaches the main content', async ({ page }) => {
  await page.goto('/about/');
  await ready(page, '/about/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content', exact: true });
  await expect(skip).toBeFocused();
  await expect(skip).toBeInViewport();
  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();
});
