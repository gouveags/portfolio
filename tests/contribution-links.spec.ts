import { test, expect, app, ready, noHorizontalOverflow, settledScreenshot } from './helpers';

test('Linux references distinguish the authored Terra fix from the Noctalia project', async ({ page }, info) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/open-source/#linux');
  await ready(page, '/open-source/');
  const linux = app(page, '/open-source/').locator('#linux');
  await expect(linux.getByRole('link', { name: /Terra Bluetooth fix:/ })).toHaveAttribute(
    'href', 'https://github.com/terrapkg/packages/pull/16215',
  );
  await expect(linux.getByRole('link', { name: 'Noctalia project', exact: true })).toHaveAttribute(
    'href', 'https://github.com/noctalia-dev/noctalia',
  );
  await expect(linux.getByRole('link', { name: /Omarchy: Omarchy project/ })).toHaveAttribute(
    'href', 'https://github.com/omacom/omarchy',
  );
  await linux.scrollIntoViewIfNeeded();
  await noHorizontalOverflow(page);
  await settledScreenshot(page, info.outputPath(`${info.project.name}-linux-contribution-links.png`));
});

test('contribution archives use public authored pull-request searches with the right scope', async ({ page }) => {
  await page.goto('/open-source/');
  await ready(page, '/open-source/');
  const source = app(page, '/open-source/');
  const groups = [
    { id: 'posthog', label: 'Public pull requests', scopes: ['org:PostHog'] },
    { id: 'langchain', label: 'Public pull requests', scopes: ['org:langchain-ai'] },
    { id: 'linux', label: 'Linux pull requests', scopes: ['repo:terrapkg/packages', 'repo:omacom/omarchy'] },
  ];
  for (const { id, label, scopes } of groups) {
    const href = await source.locator(`#${id}`).getByRole('link', { name: label, exact: true }).getAttribute('href');
    const url = new URL(href!);
    expect(url.origin).toBe('https://github.com');
    expect(url.pathname).toBe('/search');
    expect(url.searchParams.get('type')).toBe('pullrequests');
    expect(url.searchParams.get('q')!.split(/\s+/).sort()).toEqual(
      ['is:pr', 'is:public', 'author:gouveags', ...scopes].sort(),
    );
  }
  const footer = new URL((await source.getByRole('link', { name: 'View all public pull requests', exact: true }).getAttribute('href'))!);
  expect(footer.origin).toBe('https://github.com');
  expect(footer.pathname).toBe('/search');
  expect(footer.searchParams.get('type')).toBe('pullrequests');
  expect(footer.searchParams.get('q')!.split(/\s+/).sort()).toEqual(
    ['is:pr', 'is:public', 'author:gouveags'].sort(),
  );
});
