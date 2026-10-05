import { test, expect, routes, noHorizontalOverflow } from './helpers';

test.use({ javaScriptEnabled: false });

for (const route of routes) {
  test(`usable without JavaScript: ${route}`, async ({ page }) => {
    const response = await page.goto(route);
    expect(response?.status()).toBe(200);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('main h1:visible')).toHaveCount(1);
    await expect(page.locator('html')).not.toHaveClass(/\benhanced\b/);
    await expect(page.locator('.js-only:visible')).toHaveCount(0);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://gouveagsportfolio.vercel.app${route}`);
    await noHorizontalOverflow(page);
    expect(await page.locator('#wallpaper-picture img').evaluate((image) => getComputedStyle(image).animationName)).toBe('none');
    expect(await page.locator('.app-window').evaluate((window) => getComputedStyle(window).animationName)).toBe('none');
  });
}

test('native links load real pages and original projects remain visible', async ({ page }, testInfo) => {
  await page.goto('/');
  const link = page.locator(testInfo.project.name === 'mobile'
    ? '.app-grid a[href="/about/"]' : '.dock a[href="/about/"]');
  await link.click();
  await expect(page).toHaveURL(/\/about\/$/);
  await page.getByRole('link', { name: 'Explore my open-source work' }).click();
  await expect(page).toHaveURL(/\/open-source\/$/);
  await expect(page.locator('#bend')).toBeVisible();
  await expect(page.locator('#posthog')).toBeVisible();
  await page.goto('/about/');
  const download = page.getByRole('link', { name: /Download résumé/ });
  await expect(download).toHaveAttribute('href', '/assets/CV_Gabriel_Silva_Gouvea_en-US.pdf');
  await expect(download).toHaveAttribute('download', '');
});
