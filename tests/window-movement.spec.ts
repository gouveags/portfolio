import { test, expect, app, dock, ready, active } from "./helpers";

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await ready(page, "/");
  await dock(page, "/projects/");
  await dock(page, "/blog/");
});
const boxes = async (page: import("@playwright/test").Page) =>
  Promise.all(
    ["/projects/", "/blog/"].map((path) => app(page, path).boundingBox()),
  );

test("open apps focus without changing geometry through dock and search", async ({
  page,
}) => {
  const grip = app(page, "/projects/").getByRole("button", {
    name: "Resize Projects",
    exact: true,
  });
  await grip.focus();
  await page.keyboard.press("ArrowRight");
  const before = await boxes(page);
  await dock(page, "/projects/");
  expect(await boxes(page)).toEqual(before);
  await expect(app(page, "/projects/")).toHaveClass(/is-highlighted/);
  await page.locator('.desktop-bar [data-action="search"]').click();
  await page.locator('#search-results a[href="/blog/"]').click();
  await active(page, "/blog/");
  expect(await boxes(page)).toEqual(before);
});

test("titlebar drag previews a destination, cancels safely, and docks with keyboard/history support", async ({
  page,
}) => {
  const title = app(page, "/projects/").locator(".window-titlebar");
  const start = (await title.boundingBox())!;
  const target = (await app(page, "/blog/").boundingBox())!;
  const before = await boxes(page);
  await page.mouse.move(start.x + 100, start.y + 22);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + 80, {
    steps: 5,
  });
  await expect(app(page, "/blog/")).toHaveClass(/is-snap-target/);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect(await boxes(page)).toEqual(before);
  await page.mouse.move(start.x + 100, start.y + 22);
  await page.mouse.down();
  await page.mouse.move(target.x + target.width / 2, target.y + 80, {
    steps: 5,
  });
  await page.mouse.up();
  expect((await app(page, "/projects/").boundingBox())!.x).toBeGreaterThan(
    (await app(page, "/blog/").boundingBox())!.x,
  );
  await title.focus();
  await page.keyboard.press("Alt+ArrowLeft");
  expect((await app(page, "/projects/").boundingBox())!.x).toBeLessThan(
    (await app(page, "/blog/").boundingBox())!.x,
  );
  await page.goBack();
  expect((await app(page, "/projects/").boundingBox())!.x).toBeGreaterThan(
    (await app(page, "/blog/").boundingBox())!.x,
  );
});

test("every edge and corner exposes directional resize and cancellation restores tracks", async ({
  page,
}) => {
  await expect(
    app(page, "/projects/").locator("[data-resize-edge]"),
  ).toHaveCount(8);
  const edge = app(page, "/blog/").locator('[data-resize-edge="w"]');
  const grip = (await edge.boundingBox())!;
  const before = await boxes(page);
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2 + 70, grip.y + grip.height / 2);
  expect((await boxes(page))[0]!.width).toBeGreaterThan(before[0]!.width + 50);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect(await boxes(page)).toEqual(before);
});

test("dock includes all main pages and opened articles and restores lifecycle", async ({
  page,
}) => {
  for (const path of [
    "/",
    "/about/",
    "/open-source/",
    "/projects/",
    "/blog/",
    "/contact/",
    "/guide/",
    "/credits/",
  ])
    await expect(page.locator(`.dock a[href="${path}"]`)).toHaveCount(1);
  const article = "/blog/why-this-desktop/";
  await app(page, "/blog/").locator(`h2 a[href="${article}"]`).click();
  await active(page, article);
  await expect(page.locator(`.dock a[href="${article}"]`)).toHaveCount(1);
  await app(page, article).locator('[data-action="minimize"]').click();
  await dock(page, article);
  await expect(app(page, article)).toHaveCount(1);
  await app(page, article).locator('[data-action="close"]').click();
  await expect(page.locator(`.dock a[href="${article}"]`)).toHaveCount(0);
  await dock(page, "/projects/");
  await app(page, "/projects/").locator('[data-action="close"]').click();
  await dock(page, "/projects/");
  await expect(app(page, "/projects/")).toHaveCount(1);
});

test("all eight resize directions adjust shared boundaries and pointer cancellation rolls back", async ({
  page,
}) => {
  await dock(page, "/about/");
  await dock(page, "/contact/");
  const paths = ["/projects/", "/blog/", "/about/", "/contact/"];
  for (const [edge, index] of [
    ["e", 0],
    ["s", 0],
    ["se", 0],
    ["w", 1],
    ["sw", 1],
    ["n", 2],
    ["ne", 2],
    ["nw", 3],
  ] as const) {
    const window = app(page, paths[index]!);
    const handle = window.locator(`[data-resize-edge="${edge}"]`);
    const before = (await window.boundingBox())!;
    const grip = (await handle.boundingBox())!;
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      grip.x + grip.width / 2 + 25,
      grip.y + grip.height / 2 + 25,
    );
    const after = (await window.boundingBox())!;
    expect(
      Math.abs(after.width - before.width) +
        Math.abs(after.height - before.height),
    ).toBeGreaterThan(20);
    await handle.dispatchEvent("pointercancel");
    await page.mouse.up();
    expect(await window.boundingBox()).toEqual(before);
  }
});

test("crowded pages offer a readable focused view and restore exact tile geometry", async ({
  page,
}) => {
  await dock(page, "/contact/");
  const read = app(page, "/contact/").getByRole("button", {
    name: "Read full page",
    exact: true,
  });
  await expect(read).toBeVisible();
  const grip = app(page, "/projects/").getByRole("button", {
    name: "Resize Projects",
    exact: true,
  });
  await grip.focus();
  await page.keyboard.press("ArrowRight");
  await dock(page, "/contact/");
  const before = await boxes(page);
  await read.click();
  await expect(
    app(page, "/contact/")
      .getByRole("link", { name: /gabriel/ })
      .first(),
  ).toBeVisible();
  await app(page, "/contact/")
    .getByRole("button", { name: "Restore tiled view", exact: true })
    .click();
  expect(await boxes(page)).toEqual(before);
});

test("a titlebar drop outside the workspace and viewport resize cancel safely", async ({
  page,
}) => {
  const title = app(page, "/projects/").locator(".window-titlebar");
  const grip = (await title.boundingBox())!;
  const before = await boxes(page);
  await page.mouse.move(grip.x + 100, grip.y + 22);
  await page.mouse.down();
  await page.mouse.move(5, 5);
  await page.mouse.up();
  expect(await boxes(page)).toEqual(before);
  await page.mouse.move(grip.x + 100, grip.y + 22);
  await page.mouse.down();
  await page.mouse.move(1000, 200);
  await page.setViewportSize({ width: 1180, height: 757 });
  await page.mouse.up();
  await expect(page.locator(".is-snap-target, .is-moving")).toHaveCount(0);
  expect((await app(page, "/projects/").boundingBox())!.x).toBeLessThan(
    (await app(page, "/blog/").boundingBox())!.x,
  );
});

test("single-window west and north edges keep opposite sides anchored", async ({
  page,
}) => {
  await dock(page, "/");
  const home = app(page, "/");
  for (const edge of ["w", "n"]) {
    const before = (await home.boundingBox())!;
    const handle = home.locator(`[data-resize-edge="${edge}"]`);
    const grip = (await handle.boundingBox())!;
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      grip.x + grip.width / 2 + 30,
      grip.y + grip.height / 2 + 30,
    );
    await page.mouse.up();
    const after = (await home.boundingBox())!;
    if (edge === "w") {
      expect(after.x).toBeCloseTo(before.x + 30, 0);
      expect(after.x + after.width).toBeCloseTo(before.x + before.width, 0);
    } else {
      expect(after.y).toBeCloseTo(before.y + 30, 0);
      expect(after.y + after.height).toBeCloseTo(before.y + before.height, 0);
    }
  }
});

test("keyboard Read full page transfers focus into content and restore keeps a visible control focused", async ({
  page,
}) => {
  await dock(page, "/contact/");
  const read = app(page, "/contact/").getByRole("button", {
    name: "Read full page",
    exact: true,
  });
  await read.focus();
  await page.keyboard.press("Enter");
  await expect(app(page, "/contact/").locator("h1")).toBeFocused();
  const restore = app(page, "/contact/").getByRole("button", {
    name: "Restore tiled view",
    exact: true,
  });
  await restore.focus();
  await page.keyboard.press("Enter");
  await expect(
    app(page, "/contact/").getByRole("button", {
      name: "Focus Contact",
      exact: true,
    }),
  ).toBeFocused();
});
