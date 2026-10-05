import { test, expect, app, dock, ready, visibleApps, routes } from "./helpers";

test("all available apps tile within the desktop and recover from focus, close and history", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  await ready(page, "/");
  for (const path of ["/open-source/", "/blog/", "/projects/"])
    await dock(page, path);
  await expect(visibleApps(page)).toHaveCount(3);
  await app(page, "/projects/").locator('[data-action="focus"]').click();
  await expect(visibleApps(page)).toHaveCount(1);
  await app(page, "/projects/").locator('[data-action="focus"]').click();
  await expect(visibleApps(page)).toHaveCount(3);
  await app(page, "/projects/").locator('[data-action="close"]').click();
  await expect(visibleApps(page)).toHaveCount(2);
  await page.goBack();
  await expect(visibleApps(page)).toHaveCount(3);
  for (const path of routes.filter((path) => path !== "/")) {
    await page.locator('.desktop-bar [data-action="search"]').click();
    await page.locator(`#search-results a[href="${path}"]`).first().click();
  }
  await expect(visibleApps(page)).toHaveCount(routes.length - 1);
  const resize = visibleApps(page).first().locator(".window-resize");
  await resize.focus();
  for (let i = 0; i < 20; i++) await page.keyboard.press("ArrowLeft");
  await page.setViewportSize({ width: 800, height: 700 });
  const controlsFit = await visibleApps(page).evaluateAll((nodes) =>
    nodes.every((node) => {
      const window = node.getBoundingClientRect();
      return Array.from(node.querySelectorAll(".window-actions button")).every(
        (button) => {
          const bounds = button.getBoundingClientRect();
          return bounds.left >= window.left && bounds.right <= window.right;
        },
      );
    }),
  );
  expect(controlsFit).toBeTruthy();
  const boxes = await visibleApps(page).evaluateAll((nodes) =>
    nodes.map((node) => {
      const { x, y, width, height } = node.getBoundingClientRect();
      return { x, y, width, height };
    }),
  );
  for (const box of boxes) {
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(800);
    expect(box.y + box.height).toBeLessThanOrEqual(700);
    for (const other of boxes.filter((other) => other !== box)) {
      expect(
        box.x + box.width <= other.x + 1 ||
          other.x + other.width <= box.x + 1 ||
          box.y + box.height <= other.y + 1 ||
          other.y + other.height <= box.y + 1,
      ).toBeTruthy();
    }
  }
});

test("pointer and keyboard resizing reallocates neighboring tiles and survives viewport changes", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  await ready(page, "/");
  await dock(page, "/open-source/");
  await dock(page, "/blog/");
  const first = app(page, "/open-source/");
  const handle = first.getByRole("button", { name: "Resize Open source" });
  await expect(handle).toBeVisible();
  const before = (await first.boundingBox())!;
  const grip = (await handle.boundingBox())!;
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(
    grip.x + grip.width / 2 + 100,
    grip.y + grip.height / 2,
  );
  await page.mouse.up();
  expect((await first.boundingBox())!.width).toBeGreaterThan(before.width + 80);
  await handle.focus();
  await page.keyboard.press("ArrowLeft");
  expect((await first.boundingBox())!.width).toBeLessThan(before.width + 100);
  await page.setViewportSize({ width: 1000, height: 700 });
  const last = (await app(page, "/blog/").boundingBox())!;
  expect(last.x + last.width).toBeLessThanOrEqual(1000);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(visibleApps(page)).toHaveCount(1);
  await expect(page.locator(".window-resize:visible")).toHaveCount(0);
});

test("welcome window can be resized using its keyboard control", async ({
  page,
}, info) => {
  test.skip(info.project.name !== "desktop");
  await page.goto("/");
  await ready(page, "/");
  const home = app(page, "/");
  const before = (await home.boundingBox())!;
  await home.getByRole("button", { name: "Resize Home" }).focus();
  await page.keyboard.press("ArrowLeft");
  expect((await home.boundingBox())!.width).toBeLessThan(before.width);
  for (let i = 0; i < 12; i++) await page.keyboard.press("Shift+ArrowRight");
  await page.setViewportSize({ width: 800, height: 700 });
  const after = (await home.boundingBox())!;
  expect(after.x + after.width).toBeLessThanOrEqual(800);
});
