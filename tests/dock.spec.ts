import { test, expect, ready } from "./helpers";

for (const width of [1180, 800]) {
  test(`dock labels remain readable and links reachable at ${width}px`, async ({
    page,
  }, info) => {
    test.skip(info.project.name !== "desktop");
    await page.setViewportSize({ width, height: 757 });
    await page.goto("/");
    await ready(page, "/");
    const dock = page.locator(".dock");
    await expect(dock.locator("a")).toHaveCount(8);
    const geometry = await dock.evaluate((node) => ({
      scroll: node.scrollWidth,
      client: node.clientWidth,
    }));
    if (width === 1180)
      expect(geometry.scroll).toBeLessThanOrEqual(geometry.client);
    const labels = await dock
      .locator("a > span:not(.icon)")
      .evaluateAll((nodes) =>
        nodes.map((node) => {
          const rect = node.getBoundingClientRect();
          const anchor = node.parentElement!.getBoundingClientRect();
          return {
            height: rect.height,
            scroll: node.scrollHeight,
            client: node.clientHeight,
            top: rect.top,
            bottom: rect.bottom,
            anchorTop: anchor.top,
            anchorBottom: anchor.bottom,
          };
        }),
      );
    for (const label of labels) {
      expect(label.height).toBeGreaterThanOrEqual(14);
      expect(label.scroll).toBeLessThanOrEqual(label.client);
      expect(label.top).toBeGreaterThanOrEqual(label.anchorTop);
      expect(label.bottom).toBeLessThanOrEqual(label.anchorBottom);
    }
    await dock.locator("a").last().focus();
    const last = (await dock.locator("a").last().boundingBox())!;
    const bounds = (await dock.boundingBox())!;
    expect(last.x).toBeGreaterThanOrEqual(bounds.x);
    expect(last.x + last.width).toBeLessThanOrEqual(bounds.x + bounds.width);
  });
}

test("opened articles keep dock labels and controls clear with reachable overflow", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.setViewportSize({ width: 1180, height: 757 });
  await page.goto("/");
  await ready(page, "/");
  for (const path of [
    "/blog/why-this-desktop/",
    "/blog/vision-design-and-tech-choices/",
  ]) {
    await page.locator('.desktop-bar [data-action="search"]').click();
    await page.locator(`#search-results a[href="${path}"]`).click();
    await ready(page, path);
  }
  const dock = page.locator(".dock");
  await expect(dock.locator("a")).toHaveCount(10);
  expect(
    await dock.evaluate((node) => node.scrollWidth > node.clientWidth),
  ).toBeTruthy();
  await dock.locator("a").last().focus();
  const last = (await dock.locator("a").last().boundingBox())!;
  const bounds = (await dock.boundingBox())!;
  const controls = (await page.locator(".wallpaper-controls").boundingBox())!;
  expect(last.x).toBeGreaterThanOrEqual(bounds.x);
  expect(last.x + last.width).toBeLessThanOrEqual(bounds.x + bounds.width);
  expect(bounds.x + bounds.width).toBeLessThan(controls.x);
  const articleLabels = await dock
    .locator("[data-window-link] > span:not(.icon)")
    .evaluateAll((nodes) =>
      nodes.map((node) => {
        const label = node.getBoundingClientRect();
        const anchor = node.parentElement!.getBoundingClientRect();
        return {
          left: label.left,
          right: label.right,
          anchorLeft: anchor.left,
          anchorRight: anchor.right,
        };
      }),
    );
  for (const label of articleLabels) {
    expect(label.left).toBeGreaterThanOrEqual(label.anchorLeft);
    expect(label.right).toBeLessThanOrEqual(label.anchorRight);
  }
  const label = dock.locator("a").last().locator("span:not(.icon)");
  expect((await label.boundingBox())!.height).toBeGreaterThanOrEqual(14);
  expect(
    await label.evaluate((node) => node.scrollHeight <= node.clientHeight),
  ).toBeTruthy();
  await page.screenshot({
    path: info.outputPath("dock-article-overflow.png"),
    animations: "disabled",
  });
});

test("Home titlebar drag cannot select decorative text", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  await ready(page, "/");
  const title = page.locator('.app-window[data-path="/"] .window-titlebar');
  await expect(title).toHaveCSS("user-select", "none");
  const bounds = (await title.boundingBox())!;
  await page.mouse.move(bounds.x + 80, bounds.y + 20);
  await page.mouse.down();
  await page.mouse.move(bounds.x + 220, bounds.y + 20, { steps: 5 });
  await page.mouse.up();
  expect(await page.evaluate(() => getSelection()?.toString())).toBe("");
});
