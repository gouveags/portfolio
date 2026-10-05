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

async function homeWithGestureRoom(page: import("@playwright/test").Page) {
  await dock(page, "/");
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
  const home = app(page, "/");
  const area = (await page.locator("#workspace").boundingBox())!;
  const resize = home.getByRole("button", { name: "Resize Home", exact: true });
  await resize.focus();
  // Home's natural height follows its copy. Reserve real movement/resize room
  // through the public control so these tests exercise unconstrained gestures.
  const room = 160;
  for (const [size, position, key, minimum] of [
    ["width", "x", "Shift+ArrowLeft", 240],
    ["height", "y", "Shift+ArrowUp", 120],
  ] as const) {
    const before = (await home.boundingBox())!;
    const available =
      area[position] + area[size] - before[position] - before[size];
    const steps = Math.max(0, Math.ceil((room - available) / 64));
    for (let step = 0; step < steps; step++) await page.keyboard.press(key);
    const fitted = (await home.boundingBox())!;
    expect(
      area[position] + area[size] - fitted[position] - fitted[size],
      `Home fixture must leave ${room}px of ${size} for the gesture`,
    ).toBeGreaterThanOrEqual(room);
    expect(
      fitted[size],
      `Home fixture must also have room to shrink its ${size}`,
    ).toBeGreaterThan(minimum + 20);
  }
  return home;
}

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

test("titlebar drag previews a half, cancels safely, and snaps with keyboard/history support", async ({
  page,
}) => {
  const window = app(page, "/projects/");
  const title = window.locator(".window-titlebar");
  const start = (await title.boundingBox())!;
  const area = (await page.locator("#workspace").boundingBox())!;
  const before = await boxes(page);
  const drag = async () => {
    await page.mouse.move(start.x + 100, start.y + 22);
    await page.mouse.down();
    await page.mouse.move(area.x + area.width - 2, area.y + area.height / 2, {
      steps: 5,
    });
  };
  await drag();
  await expect(
    page.locator('.window-snap-preview[data-snap-zone="right"]'),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect(await boxes(page)).toEqual(before);
  await drag();
  await page.mouse.up();
  const snapped = (await window.boundingBox())!;
  expect(snapped.x).toBeCloseTo(area.x + area.width / 2, 0);
  expect(snapped.width).toBeCloseTo(area.width / 2, 0);
  await title.focus();
  await page.keyboard.press("Alt+ArrowLeft");
  expect((await window.boundingBox())!.x).toBeCloseTo(snapped.x - 24, 0);
  await page.goBack();
  expect(await window.boundingBox()).toEqual(snapped);
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

test("pointer cancellation and viewport resize cancel a titlebar drag safely", async ({
  page,
}) => {
  const title = app(page, "/projects/").locator(".window-titlebar");
  const grip = (await title.boundingBox())!;
  const before = await boxes(page);
  await page.mouse.move(grip.x + 100, grip.y + 22);
  await page.mouse.down();
  await page.mouse.move(5, 5);
  await title.dispatchEvent("pointercancel");
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

test("titlebar follows the pointer into empty space and retains floating geometry", async ({
  page,
}) => {
  const home = await homeWithGestureRoom(page);
  const title = home.locator(".window-titlebar");
  const before = (await home.boundingBox())!;
  await page.mouse.move(before.x + 100, before.y + 22);
  await page.mouse.down();
  await page.mouse.move(before.x + 220, before.y + 102, { steps: 5 });
  const during = (await home.boundingBox())!;
  expect(during.x).toBeCloseTo(before.x + 120, 0);
  expect(during.y).toBeCloseTo(before.y + 80, 0);
  await page.mouse.up();
  expect(await home.boundingBox()).toEqual(during);
  await title.focus();
  await page.keyboard.press("Alt+ArrowLeft");
  expect((await home.boundingBox())!.x).toBeCloseTo(during.x - 24, 0);
});

for (const zone of [
  "left",
  "right",
  "top",
  "bottom",
  "top-left",
  "top-right",
  "bottom-left",
  "bottom-right",
]) {
  test(`pointer previews and snaps the ${zone} workspace rectangle`, async ({
    page,
  }) => {
    await dock(page, "/");
    const window = app(page, "/");
    const start = (await window.boundingBox())!;
    const area = (await page.locator("#workspace").boundingBox())!;
    const left = zone.includes("left"),
      right = zone.includes("right"),
      top = zone.includes("top"),
      bottom = zone.includes("bottom");
    const x = left
      ? area.x + 2
      : right
        ? area.x + area.width - 2
        : area.x + area.width / 2;
    const y = top
      ? area.y + 2
      : bottom
        ? area.y + area.height - 2
        : area.y + area.height / 2;
    const expected = {
      x: area.x + (right ? area.width / 2 : 0),
      y: area.y + (bottom ? area.height / 2 : 0),
      width: left || right ? area.width / 2 : area.width,
      height: top || bottom ? area.height / 2 : area.height,
    };
    await page.mouse.move(start.x + 100, start.y + 22);
    await page.mouse.down();
    await page.mouse.move(x, y, { steps: 5 });
    const preview = page.locator(".window-snap-preview");
    await expect(preview).toBeVisible();
    const previewBox = (await preview.boundingBox())!;
    for (const key of ["x", "y", "width", "height"] as const)
      expect(previewBox[key]).toBeCloseTo(expected[key], 0);
    await page.mouse.up();
    const actual = (await window.boundingBox())!;
    for (const key of ["x", "y", "width", "height"] as const)
      expect(actual[key]).toBeCloseTo(expected[key], 0);
    await expect(preview).toHaveCount(0);
  });
}

test("floating window retains all eight anchored resize directions and Escape restores geometry", async ({
  page,
}) => {
  const window = await homeWithGestureRoom(page);
  const title = window.locator(".window-titlebar");
  await title.focus();
  await page.keyboard.press("Alt+Shift+ArrowRight");
  await page.keyboard.press("Alt+Shift+ArrowDown");
  for (const edge of ["n", "s", "e", "w", "ne", "nw", "se", "sw"]) {
    const before = (await window.boundingBox())!;
    const handle = window.locator(`[data-resize-edge="${edge}"]`);
    const grip = (await handle.boundingBox())!;
    await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      grip.x + grip.width / 2 + 20,
      grip.y + grip.height / 2 + 20,
    );
    const changed = (await window.boundingBox())!;
    expect(
      Math.abs(changed.width - before.width) +
        Math.abs(changed.height - before.height),
    ).toBeGreaterThan(15);
    const expected = {
      x: before.x + (edge.includes("w") ? 20 : 0),
      y: before.y + (edge.includes("n") ? 20 : 0),
      width:
        before.width + (edge.includes("e") ? 20 : edge.includes("w") ? -20 : 0),
      height:
        before.height +
        (edge.includes("s") ? 20 : edge.includes("n") ? -20 : 0),
    };
    for (const key of ["x", "y", "width", "height"] as const)
      expect(
        changed[key],
        `${edge} resize must preserve its anchored ${key}`,
      ).toBeCloseTo(expected[key], 0);
    await page.keyboard.press("Escape");
    await page.mouse.up();
    expect(await window.boundingBox()).toEqual(before);
  }
});

test("a sole full-page app detaches to a movable bounded window", async ({
  page,
}) => {
  await page.goto("/projects/");
  await ready(page, "/projects/");
  const window = app(page, "/projects/");
  const before = (await window.boundingBox())!;
  await page.mouse.move(before.x + 100, before.y + 22);
  await page.mouse.down();
  await page.mouse.move(before.x + 220, before.y + 102, { steps: 5 });
  await page.mouse.up();
  const after = (await window.boundingBox())!;
  expect(after.x).toBeGreaterThan(before.x + 80);
  expect(after.y).toBeGreaterThan(before.y + 60);
  expect(after.width).toBeLessThan(before.width);
  expect(after.height).toBeLessThan(before.height);
  expect(after.x + after.width).toBeLessThanOrEqual(before.x + before.width);
  expect(after.y + after.height).toBeLessThanOrEqual(before.y + before.height);
});

test("cancelling a drag preserves a previously resized welcome window", async ({
  page,
}) => {
  await dock(page, "/");
  const home = app(page, "/");
  await home.getByRole("button", { name: "Resize Home", exact: true }).focus();
  await page.keyboard.press("ArrowLeft");
  const before = (await home.boundingBox())!;
  await page.mouse.move(before.x + 100, before.y + 22);
  await page.mouse.down();
  await page.mouse.move(before.x + 240, before.y + 110);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  expect(await home.boundingBox()).toEqual(before);
});

test("native touch dragging follows the pointer and losing capture rolls back", async ({
  page,
}) => {
  await dock(page, "/");
  const home = app(page, "/");
  const title = home.locator(".window-titlebar");
  const before = (await home.boundingBox())!;
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setTouchEmulationEnabled", { enabled: true });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: before.x + 100, y: before.y + 22 }],
  });
  await session.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: before.x + 240, y: before.y + 110 }],
  });
  expect((await home.boundingBox())!.x).toBeGreaterThan(before.x + 100);
  await session.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  const floated = (await home.boundingBox())!;
  await session.send("Emulation.setTouchEmulationEnabled", { enabled: false });
  await page.mouse.move(floated.x + 100, floated.y + 22);
  await page.mouse.down();
  await page.mouse.move(floated.x + 200, floated.y + 82);
  await title.evaluate((node) => {
    for (let id = 1; id < 10; id++)
      if (node.hasPointerCapture(id)) node.releasePointerCapture(id);
  });
  await page.mouse.up();
  expect(await home.boundingBox()).toEqual(floated);
  await session.detach();
});
