import { test as base, expect, type Locator, type Page } from '@playwright/test';

export const test = base.extend<{ runtimeErrors: string[] }>({
  runtimeErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await use(errors);
    expect(errors, 'No uncaught JavaScript exceptions').toEqual([]);
  }, { auto: true }],
});
export { expect };

export const routes = [
  '/', '/open-source/', '/projects/', '/blog/', '/about/', '/contact/', '/guide/', '/credits/',
  '/blog/why-this-desktop/', '/blog/vision-design-and-tech-choices/',
];
export const articlePath = '/blog/why-this-desktop/';
export const app = (page: Page, path: string): Locator => page.locator(`.app-window[data-path="${path}"]`);
export const visibleApps = (page: Page): Locator => page.locator('#workspace > .app-window:visible');

export async function ready(page: Page, path: string) {
  await expect(page.locator('html')).toHaveClass(/\benhanced\b/);
  await active(page, path);
}

export async function active(page: Page, path: string) {
  await expect(page).toHaveURL(new RegExp(`${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:[?#].*)?$`));
  await expect(page.locator('body')).toHaveAttribute('data-active-path', path);
  await expect(app(page, path)).toBeVisible();
  await expect(app(page, path)).toHaveClass(/\bis-active\b/);
  await expect(page.locator('#workspace')).not.toHaveAttribute('aria-busy', 'true');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `https://gouveagsportfolio.vercel.app${path}`);
}

export async function dock(page: Page, path: string) {
  await page.locator(`.dock a[href="${path}"]`).click();
  await active(page, path);
}

export async function openSearch(page: Page, mobile: boolean) {
  const button = page.locator(mobile ? '.mobile-header [data-action="search"]' : '.desktop-bar [data-action="search"]');
  await button.click();
  await expect(page.locator('#launcher')).toBeVisible();
  await expect(page.locator('#search-input')).toBeFocused();
  return button;
}

export async function noHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(dimensions.document, 'Document must not overflow horizontally').toBeLessThanOrEqual(dimensions.viewport + 1);
  const scrollers = await page.locator('.app-window:visible .window-scroll').evaluateAll((elements) =>
    elements.map((element) => ({ scroll: element.scrollWidth, client: element.clientWidth })));
  for (const dimensions of scrollers) expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
}

export async function scrollPosition(scroller: Locator, desired = 180) {
  await scroller.evaluate((element, top) => { element.scrollTo({ top, behavior: 'instant' }); }, desired);
  const top = await scroller.evaluate((element) => element.scrollTop);
  expect(top, 'Fixture content must really scroll, otherwise preservation is untested').toBeGreaterThan(20);
  return top;
}
