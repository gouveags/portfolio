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

/** Capture painted application evidence, rather than an intermediate load frame. */
export async function settledScreenshot(page: Page, path: string) {
  await expect(page.locator('html')).toHaveClass(/\benhanced\b/);
  await expect(page.locator('#workspace')).not.toHaveAttribute('aria-busy', 'true');
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = Array.from(document.images).filter((image) => {
      const box = image.getBoundingClientRect();
      const style = getComputedStyle(image);
      // Closed dialogs and hidden cached windows may intentionally contain an
      // empty image placeholder. Only decode images that can actually paint.
      if (box.width === 0 || box.height === 0 || style.visibility === 'hidden') return false;
      if (image.loading !== 'lazy') return true;
      return box.bottom > 0 && box.right > 0 && box.top < innerHeight && box.left < innerWidth;
    });
    await Promise.all(images.map(async (image) => {
      // decode() also waits for the selected responsive picture source to load.
      // A broken relevant image must fail evidence capture, not be silently ignored.
      await image.decode();
      if (!image.complete || image.naturalWidth === 0) {
        throw new Error(`Image did not finish loading: ${image.currentSrc || image.src}`);
      }
    }));
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await page.screenshot({ path, animations: 'disabled' });
}

export async function openSource(page: Page) {
  await openSearch(page, false);
  await page.locator('#search-input').fill('Open source');
  await page.locator('#search-results a[href="/open-source/"]').click();
  await active(page, '/open-source/');
}
