import AxeBuilder from "@axe-core/playwright";
import {
  test,
  expect,
  ready,
  noHorizontalOverflow,
  settledScreenshot,
} from "./helpers";
import wallpapers from "../src/data/wallpapers.json" with { type: "json" };

for (const width of [320, 390, 500]) {
  test(`mobile welcome is readable and usable on every wallpaper at ${width}px`, async ({
    page,
  }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "Mobile reading window");
    await page.setViewportSize({ width, height: 844 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await ready(page, "/");
    const welcome = page.getByRole("region", {
      name: "Gabriel Gouvêa",
      exact: true,
    });
    await expect(welcome.locator(".mobile-welcome-titlebar")).toHaveText(
      "welcome.md",
    );
    for (const photo of wallpapers) {
      await page.locator(`[data-wallpaper-id="${photo.id}"]:visible`).click();
      await expect(welcome).toHaveCSS("background-color", "rgb(0, 0, 0)");
      await expect(welcome).toHaveCSS("text-shadow", "none");
      for (const link of await welcome.getByRole("link").all()) {
        expect((await link.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      }
      expect(
        (await new AxeBuilder({ page }).include(".mobile-welcome").analyze())
          .violations,
      ).toEqual([]);
      await noHorizontalOverflow(page);
      await page
        .locator(".app-window.is-active .window-scroll")
        .evaluate((element) => (element.scrollTop = 0));
      await settledScreenshot(
        page,
        testInfo.outputPath(`${photo.id}-${width}-welcome.png`),
      );
    }
  });
}
