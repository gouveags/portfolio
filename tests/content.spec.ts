import { test, expect, app, active, ready, articlePath, openSearch } from './helpers';

test('filter controls and a direct #bend route reveal the matching content', async ({ page }, testInfo) => {
  await page.goto('/open-source/');
  await ready(page, '/open-source/');
  const window = app(page, '/open-source/');
  await expect(window.locator('[data-category="contributions"]:visible')).toHaveCount(3);
  await expect(window.locator('[data-category="original"]:visible')).toHaveCount(0);
  await window.getByRole('button', { name: 'Original projects', exact: true }).click();
  await expect(window.locator('[data-category="original"]:visible')).toHaveCount(3);
  await expect(window.getByRole('link', { name: 'View bend-grammar on GitHub (opens in a new tab)', exact: true })).toHaveAttribute('href', 'https://github.com/gouveags/bend-grammar');
  await expect(window.locator('[data-category="contributions"]:visible')).toHaveCount(0);
  await window.getByRole('button', { name: 'Contributions', exact: true }).click();
  if (testInfo.project.name === 'desktop') {
    await window.getByRole('link', { name: 'Bend', exact: true }).click();
    await expect(page).toHaveURL(/\/open-source\/#bend$/);
    await expect(window.locator('#bend')).toBeVisible();
    await expect(window.getByRole('button', { name: 'Original projects' })).toHaveAttribute('aria-pressed', 'true');
  }
  await page.goto('/open-source/#bend');
  await ready(page, '/open-source/');
  await expect(window.locator('#bend')).toBeVisible();
  await expect(window.getByRole('button', { name: 'Original projects' })).toHaveAttribute('aria-pressed', 'true');
  await expect(window.locator('#posthog')).toBeHidden();
});

test('article TOC deep links survive reload and Back, and copy the article URL', async ({ page, context }, testInfo) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write']);
  await page.goto(articlePath);
  await ready(page, articlePath);
  const article = app(page, articlePath);
  if (testInfo.project.name === 'mobile') await article.locator('.mobile-contents summary').click();
  const toc = article.locator(testInfo.project.name === 'mobile' ? '.mobile-contents nav' : '.reader-sidebar nav');
  const link = toc.getByRole('link', { name: 'What I brought to the web', exact: true });
  await link.click();
  await expect(page).toHaveURL(/#what-i-brought-to-the-web$/);
  await expect(article.locator('#what-i-brought-to-the-web')).toBeInViewport();
  await page.reload();
  await ready(page, articlePath);
  await expect(article.locator('#what-i-brought-to-the-web')).toBeInViewport();
  await article.getByRole('button', { name: 'Copy link', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(new URL(articlePath, page.url()).href);
  await expect(page.locator('#announcement')).toHaveText('Link copied');
  await page.goBack();
  await active(page, articlePath);
  await expect(page).toHaveURL(new RegExp(`${articlePath}$`));
});

test('search handles no matches, resets, navigates by keyboard, and restores focus', async ({ page }, testInfo) => {
  await page.goto('/');
  await ready(page, '/');
  const trigger = await openSearch(page, testInfo.project.name === 'mobile');
  const input = page.locator('#search-input');
  await input.fill('there-is-no-such-portfolio-page-82931');
  await expect(page.locator('#search-empty')).toBeVisible();
  await expect(page.locator('#search-results a:visible')).toHaveCount(0);
  await input.press('Enter');
  await expect(page.locator('#launcher')).toBeVisible();
  await input.press('Escape');
  await expect(page.locator('#launcher')).toBeHidden();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await expect(input).toHaveValue('');
  await expect(page.locator('#search-empty')).toBeHidden();
  await input.fill('why this desktop');
  await expect(page.locator('#search-results a:visible')).toHaveCount(1);
  await input.press('ArrowDown');
  await expect(page.locator('#search-results [aria-selected="true"]')).toHaveCount(1);
  await input.press('Enter');
  await active(page, articlePath);
  await expect(page.locator('#launcher')).toBeHidden();
  await expect(app(page, articlePath).locator('h1')).toBeFocused();
});

test('single-key shortcuts require opt-in, persist, and stay out of inputs', async ({ page }) => {
  await page.goto('/guide/');
  await ready(page, '/guide/');
  const toggle = page.getByRole('checkbox', { name: /Enable site shortcuts/ });
  await expect(toggle).not.toBeChecked();
  await page.keyboard.press('/');
  await expect(page.locator('#launcher')).toBeHidden();
  await page.keyboard.press('?');
  await expect(page).toHaveURL(/\/guide\/$/);
  await toggle.check();
  await toggle.press('Tab');
  await page.keyboard.press('/');
  await expect(page.locator('#launcher')).toBeVisible();
  await page.locator('#search-input').pressSequentially('/?');
  await expect(page.locator('#search-input')).toHaveValue('/?');
  await page.keyboard.press('Escape');
  await page.reload();
  await ready(page, '/guide/');
  await expect(toggle).toBeChecked();
  await page.keyboard.press('/');
  await expect(page.locator('#launcher')).toBeVisible();
  await page.keyboard.press('Escape');
  await toggle.uncheck();
  await toggle.press('Tab');
  await page.keyboard.press('/');
  await expect(page.locator('#launcher')).toBeHidden();
  expect(await page.evaluate(() => localStorage.getItem('portfolio:shortcuts'))).toBe('false');
});

test('legacy inbound links resolve to real pages and their fragment', async ({ page }) => {
  await page.goto('/#experience');
  await ready(page, '/about/');
  await expect(page).toHaveURL(/\/about\/#experience$/);
  await expect(app(page, '/about/').locator('#experience')).toBeInViewport();
});

test('reduced motion stops wallpaper animation and automatic rotation', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.clock.install();
  await page.goto('/');
  await ready(page, '/');
  await expect(page.locator('body')).toHaveClass(/motion-paused/);
  const selected = await page.locator('#wallpaper-picture').getAttribute('data-wallpaper');
  const animation = await page.locator('#wallpaper-picture img').evaluate((image) => getComputedStyle(image).animationName);
  expect(animation).toBe('none');
  await page.clock.fastForward(70_000);
  await expect(page.locator('#wallpaper-picture')).toHaveAttribute('data-wallpaper', selected!);
});
