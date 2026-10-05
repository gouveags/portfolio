import { test, expect, ready, app, dock, settledScreenshot } from "./helpers";

import wallpapers from "../src/data/wallpapers.json" with { type: "json" };

for (const { id: wallpaper } of wallpapers) {
  test(`${wallpaper} floating copy stays transparent while app surfaces stay black`, async ({
    page,
  }, testInfo) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await ready(page, "/");
    await page.locator(`[data-wallpaper-id="${wallpaper}"]:visible`).click();
    await expect(page.locator("#wallpaper-picture")).toHaveAttribute(
      "data-wallpaper",
      wallpaper,
    );

    const mobile = testInfo.project.name === "mobile";
    const floating = page.locator(
      mobile
        ? ".mobile-header, .app-grid a > span:last-child, .mobile-home-credit"
        : ".home-whisper, .wallpaper-credit, .wallpaper-controls",
    );
    expect(await floating.count()).toBeGreaterThan(0);
    for (const element of await floating.all()) {
      await expect(element).toBeVisible();
      await expect(element).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(element).toHaveCSS("background-image", "none");
      await expect(element).toHaveCSS("box-shadow", "none");
    }

    const blackSurface = page.locator(mobile ? ".home-search" : ".desktop-bar");
    await expect(blackSurface).toHaveCSS("background-color", "rgb(0, 0, 0)");
    if (mobile) {
      await expect(page.locator(".mobile-welcome")).toHaveCSS(
        "background-color",
        "rgb(0, 0, 0)",
      );
      await expect(page.locator(".mobile-welcome")).toHaveCSS(
        "text-shadow",
        "none",
      );
      for (const icon of await page.locator(".app-icon").all()) {
        await expect(icon).toHaveCSS("background-color", "rgb(3, 3, 3)");
      }
    }
    if (["ferrari", "spa", "hamilton-victory"].includes(wallpaper)) {
      await expect(page.locator("#wallpaper-picture img")).toHaveCSS(
        "filter",
        "grayscale(1)",
      );
    }
    if (mobile)
      await page
        .locator(".app-window.is-active .window-scroll")
        .evaluate((element) => (element.scrollTop = 0));
    await settledScreenshot(
      page,
      testInfo.outputPath(
        `${wallpaper}-${testInfo.project.name}-transparent.png`,
      ),
    );
  });
}

test("desktop note persists independently of welcome windows and navigation", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Persistent desktop decoration",
  );
  await page.goto("/");
  await ready(page, "/");
  const note = page.locator(".home-whisper");
  const expectNote = async () => {
    await expect(note).toBeVisible();
    await expect(note).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(note).toHaveCSS("background-image", "none");
  };
  await expectNote();
  for (const action of ["Minimize Home", "Close Home"]) {
    await app(page, "/")
      .getByRole("button", { name: action, exact: true })
      .click();
    await expect(app(page, "/")).toBeHidden();
    await expectNote();
    await page.reload();
    await expectNote();
    await page.locator('.desktop-bar a[href="/"]').click();
    await ready(page, "/");
  }
  await app(page, "/")
    .getByRole("button", { name: "Focus Home", exact: true })
    .click();
  await expect(page.locator("body")).toHaveClass(/focus-mode/);
  await expectNote();
  await dock(page, "/blog/");
  await expectNote();
  await page.reload();
  await ready(page, "/blog/");
  await expectNote();
  await dock(page, "/projects/");
  await expectNote();
  await page.goBack();
  await ready(page, "/blog/");
  await expectNote();
});

test("mobile welcome stays on Home without covering app content", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "Phone welcome placement");
  await page.goto("/");
  await ready(page, "/");
  await expect(page.locator(".home-whisper")).toBeHidden();
  await expect(page.locator(".mobile-welcome")).toBeVisible();
  await page.locator('.app-grid a[href="/blog/"]').click();
  await ready(page, "/blog/");
  await expect(page.locator(".home-whisper")).toBeHidden();
  await expect(page.locator(".mobile-welcome")).toBeHidden();
  await page.goBack();
  await ready(page, "/");
  await expect(page.locator(".mobile-welcome")).toBeVisible();
});
