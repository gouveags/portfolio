import { test, expect, app, dock, ready, settledScreenshot } from "./helpers";
import type { Page } from "@playwright/test";

test.beforeEach(async ({ page }, info) => {
  test.skip(info.project.name !== "desktop");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/projects/");
  await ready(page, "/projects/");
});

async function move(page: Page) {
  await app(page, "/projects/").locator(".window-titlebar").focus();
  await page.keyboard.press("Control+Alt+1");
  await page.keyboard.press("Alt+ArrowRight");
  await page.keyboard.press("Alt+ArrowDown");
}

async function bounded(page: Page) {
  const area = (await page.locator("#workspace").boundingBox())!;
  const box = (await app(page, "/projects/").boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(area.x - 1);
  expect(box.y).toBeGreaterThanOrEqual(area.y - 1);
  expect(box.x + box.width).toBeLessThanOrEqual(area.x + area.width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(area.y + area.height + 1);
  return box;
}

test("floating placement survives focus, minimize and dock restore", async ({
  page,
}) => {
  await move(page);
  const before = await bounded(page);
  await dock(page, "/blog/");
  await dock(page, "/projects/");
  expect(await app(page, "/projects/").boundingBox()).toEqual(before);
  await app(page, "/projects/")
    .getByRole("button", { name: "Minimize Projects", exact: true })
    .click();
  await expect(app(page, "/projects/")).toBeHidden();
  await dock(page, "/projects/");
  expect(await app(page, "/projects/").boundingBox()).toEqual(before);
});

for (const restore of ["dock", "browser Back"] as const) {
  test(`bottom-right floating placement survives Home and ${restore} restore`, async ({
    page,
  }) => {
    const projects = app(page, "/projects/");
    await projects.locator(".window-titlebar").focus();
    await page.keyboard.press("Control+Alt+4");
    await page.keyboard.press("Alt+ArrowLeft");
    await page.keyboard.press("Alt+ArrowRight");
    await expect(projects).toHaveAttribute("data-window-mode", "floating");
    const before = await bounded(page);
    const workspace = (await page.locator("#workspace").boundingBox())!;
    expect(before.x + before.width).toBeCloseTo(
      workspace.x + workspace.width,
      0,
    );
    expect(before.y + before.height).toBeCloseTo(
      workspace.y + workspace.height,
      0,
    );

    await dock(page, "/");
    await expect(projects).toBeHidden();
    const homeWorkspace = (await page.locator("#workspace").boundingBox())!;
    expect(homeWorkspace.width).toBeLessThan(workspace.width);
    expect(homeWorkspace.height).toBeLessThan(workspace.height);

    if (restore === "dock") {
      await dock(page, "/projects/");
    } else {
      await page.goBack();
      await ready(page, "/projects/");
    }
    await expect(projects).toHaveAttribute("data-window-mode", "floating");
    expect(await bounded(page)).toEqual(before);
  });
}

for (const [detachedPath, remainingPath] of [
  ["/projects/", "/blog/"],
  ["/blog/", "/projects/"],
] as const) {
  test(`detaching ${detachedPath} expands the remaining tile and keyboard tiling restores the grid`, async ({
    page,
  }, info) => {
    await dock(page, "/blog/");
    const detached = app(page, detachedPath);
    const remaining = app(page, remainingPath);
    const before = {
      detached: (await detached.boundingBox())!,
      remaining: (await remaining.boundingBox())!,
    };
    const workspace = (await page.locator("#workspace").boundingBox())!;
    expect(before.detached.width).toBeLessThan(workspace.width);
    expect(before.remaining.width).toBeLessThan(workspace.width);

    await detached.locator(".window-titlebar").focus();
    await page.keyboard.press("Alt+ArrowDown");
    await expect(detached).toHaveAttribute("data-window-mode", "floating");
    await expect(remaining).toHaveAttribute("data-window-mode", "tiled");
    const expanded = (await remaining.boundingBox())!;
    for (const key of ["x", "y", "width", "height"] as const) {
      expect(expanded[key]).toBeCloseTo(workspace[key], 0);
    }
    if (detachedPath === "/projects/") {
      await settledScreenshot(
        page,
        info.outputPath("mixed-floating-tiled.png"),
      );
    }

    await detached.locator(".window-titlebar").focus();
    await page.keyboard.press("Control+Alt+Home");
    await expect(detached).toHaveAttribute("data-window-mode", "tiled");
    await expect(remaining).toHaveAttribute("data-window-mode", "tiled");
    expect(await detached.boundingBox()).toEqual(before.detached);
    expect(await remaining.boundingBox()).toEqual(before.remaining);
    if (detachedPath === "/projects/") {
      await settledScreenshot(page, info.outputPath("restored-tiled-grid.png"));
    }
  });
}

test("floating placement stays bounded after viewport shrink and returns from mobile", async ({
  page,
}) => {
  await move(page);
  await page.setViewportSize({ width: 900, height: 650 });
  await bounded(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(app(page, "/projects/")).toHaveAttribute(
    "data-window-mode",
    "tiled",
  );
  const phone = (await app(page, "/projects/").boundingBox())!;
  expect(phone.x).toBeGreaterThanOrEqual(0);
  expect(phone.x + phone.width).toBeLessThanOrEqual(391);
  await expect(app(page, "/projects/")).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 900 });
  await expect(app(page, "/projects/")).toHaveAttribute(
    "data-window-mode",
    "floating",
  );
  await bounded(page);
  await expect(app(page, "/projects/")).toHaveAttribute(
    "data-window-mode",
    "floating",
  );
});

test("history restores placement and accepts legacy snapshots without geometry", async ({
  page,
}) => {
  await move(page);
  const before = await app(page, "/projects/").boundingBox();
  await dock(page, "/blog/");
  await page.goBack();
  await ready(page, "/projects/");
  expect(await app(page, "/projects/").boundingBox()).toEqual(before);
  await page.evaluate(() => {
    const state = { ...history.state };
    delete state.placements;
    window.dispatchEvent(new PopStateEvent("popstate", { state }));
  });
  await expect(app(page, "/projects/")).not.toHaveAttribute(
    "data-window-mode",
    "floating",
  );
  await bounded(page);
});

test("malformed history geometry cannot strand or corrupt windows", async ({
  page,
}) => {
  for (const placement of [
    { mode: "floating", rect: { x: NaN, y: 0, width: 500, height: 300 } },
    { mode: "floating", rect: { x: 0, y: 0, width: -1, height: 300 } },
    { mode: "snapped", zone: "unknown" },
    {
      mode: "floating",
      rect: { x: 999999, y: 999999, width: 999999, height: 999999 },
    },
  ]) {
    await page.evaluate((value) => {
      window.dispatchEvent(
        new PopStateEvent("popstate", {
          state: { ...history.state, placements: { "/projects/": value } },
        }),
      );
    }, placement);
    await expect(page.locator("#workspace")).not.toHaveAttribute(
      "aria-busy",
      "true",
    );
    await bounded(page);
    await expect(
      app(page, "/projects/").getByRole("button", {
        name: "Minimize Projects",
        exact: true,
      }),
    ).toBeInViewport();
  }
});

test("overlapping windows raise on focus and restore exact floating geometry after focus view", async ({
  page,
}) => {
  await move(page);
  const original = (await app(page, "/projects/").boundingBox())!;
  await dock(page, "/blog/");
  const blogTitle = app(page, "/blog/").locator(".window-titlebar");
  await blogTitle.focus();
  await page.keyboard.press("Control+Alt+1");
  const overlap = { x: original.x + 70, y: original.y + 90 };
  const topPath = () =>
    page.evaluate(
      ({ x, y }) =>
        document.elementFromPoint(x, y)?.closest<HTMLElement>(".app-window")
          ?.dataset.path,
      overlap,
    );
  expect(await topPath()).toBe("/blog/");
  await dock(page, "/projects/");
  expect(await topPath()).toBe("/projects/");
  expect(await app(page, "/projects/").boundingBox()).toEqual(original);
  await app(page, "/projects/")
    .getByRole("button", { name: "Focus Projects", exact: true })
    .click();
  await expect(app(page, "/blog/")).toBeHidden();
  const expanded = (await app(page, "/projects/").boundingBox())!;
  expect(expanded.width).toBeGreaterThan(original.width);
  await app(page, "/projects/")
    .getByRole("button", { name: "Restore tiled view", exact: true })
    .click();
  expect(await app(page, "/projects/").boundingBox()).toEqual(original);
  await expect(app(page, "/blog/")).toBeVisible();
});
