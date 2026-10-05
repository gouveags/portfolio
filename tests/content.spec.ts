import { test, expect, app, active, ready, articlePath, openSearch, settledScreenshot } from './helpers';

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
  const link = toc.getByRole('link', { name: 'Borrowing the parts I enjoy', exact: true });
  await link.click();
  await expect(page).toHaveURL(/#borrowing-the-parts-i-enjoy$/);
  await expect(article.locator('#borrowing-the-parts-i-enjoy')).toBeInViewport();
  await page.reload();
  await ready(page, articlePath);
  await expect(article.locator('#borrowing-the-parts-i-enjoy')).toBeInViewport();
  await article.getByRole('button', { name: 'Copy link', exact: true }).click();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(new URL(articlePath, page.url()).href);
  await expect(page.locator('#announcement')).toHaveText('Link copied');
  await page.goBack();
  await active(page, articlePath);
  await expect(page).toHaveURL(new RegExp(`${articlePath}$`));
});

test('four published notes filter into three engineering articles and one site essay', async ({ page }, testInfo) => {
  await page.goto('/blog/');
  await ready(page, '/blog/');
  const blog = app(page, '/blog/');
  await expect(blog.locator('.blog-entry:visible')).toHaveCount(4);
  await blog.getByRole('button', { name: 'This site', exact: true }).click();
  await expect(blog.locator('.blog-entry:visible')).toHaveCount(1);
  await expect(blog.locator(`h2 a[href="${articlePath}"]`)).toBeVisible();
  await blog.getByRole('button', { name: 'Engineering', exact: true }).click();
  await expect(blog.locator('.blog-entry:visible')).toHaveCount(3);
  await expect(blog.locator(`h2 a[href="${articlePath}"]`)).toBeHidden();

  const path = '/blog/let-the-agent-see-what-broke/';
  await blog.locator(`h2 a[href="${path}"]`).click();
  await active(page, path);
  const article = app(page, path);
  await expect(article.locator('h1')).toHaveText('Let the agent see what broke');
  await expect(article.locator('.article-source')).toHaveText('AI-assisted writing approved for publication by Gabriel Gouvêa.');
  // Opening from the archive tiles the desktop reader: its sidebar is replaced
  // by the same compact contents control used on a phone.
  const contents = article.locator('.mobile-contents');
  await expect(contents).toBeVisible();
  await contents.locator('summary').click();
  await settledScreenshot(page, testInfo.outputPath(`${testInfo.project.name}-article-compact-contents.png`));
  await contents.getByRole('link', { name: 'Test the path people actually use', exact: true }).click();
  await expect(page).toHaveURL(/#test-the-path-people-actually-use$/);
  await expect(article.locator('#test-the-path-people-actually-use')).toBeInViewport();
  if (testInfo.project.name === 'desktop') {
    await article.locator('.window-actions [data-action="focus"]').click();
    await expect(article).toHaveClass(/is-focused/);
    await expect(contents).toBeVisible();
    await expect(contents.getByRole('link', { name: 'Test the path people actually use', exact: true })).toBeVisible();
    await contents.scrollIntoViewIfNeeded();
    await settledScreenshot(page, testInfo.outputPath('desktop-article-focused-contents.png'));
  }
  await article.locator('.article-footer').getByRole('link', { name: 'Blog', exact: true }).click();
  await active(page, '/blog/');
  await expect(blog.getByRole('button', { name: 'Engineering', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(blog.locator('.blog-entry:visible')).toHaveCount(3);
  await blog.getByRole('button', { name: 'All notes', exact: true }).click();
  await expect(blog.locator('.blog-entry:visible')).toHaveCount(4);
});

for (const post of [
  { slug: 'the-field-i-almost-threw-away', title: 'The field I almost threw away', query: 'field almost threw away', minutes: 4 },
  { slug: 'let-the-agent-see-what-broke', title: 'Let the agent see what broke', query: 'agent see broke', minutes: 3 },
]) {
  test(`search opens the published essay: ${post.title}`, async ({ page }, testInfo) => {
    await page.goto('/');
    await ready(page, '/');
    await openSearch(page, testInfo.project.name === 'mobile');
    const input = page.locator('#search-input');
    await input.fill(post.query);
    const results = page.locator('#search-results a:visible');
    await expect(results).toHaveCount(1);
    const path = `/blog/${post.slug}/`;
    await expect(results).toHaveAttribute('href', path);
    await input.press('ArrowDown');
    await input.press('Enter');
    await active(page, path);
    await expect(page.locator('#launcher')).toBeHidden();
    await expect(app(page, path).locator('h1')).toHaveText(post.title);
    await expect(app(page, path).locator('h1')).toBeFocused();
    await page.reload();
    await ready(page, path);
    await expect(app(page, path).locator('.article-meta')).toContainText(`5 October 2026 · ${post.minutes} min read`);
  });
}

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
