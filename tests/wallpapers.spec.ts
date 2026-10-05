import AxeBuilder from "@axe-core/playwright";
import {
  test,
  expect,
  ready,
  noHorizontalOverflow,
  settledScreenshot,
} from "./helpers";

import wallpapers from "../src/data/wallpapers.json" with { type: "json" };

for (const id of ["ferrari", "spa", "hamilton-victory"]) {
  test(`${id} wallpaper fills the screen with grayscale only and readable controls`, async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await ready(page, "/");
    const picture = page.locator("#wallpaper-picture");
    const next = page.locator('[data-action="wallpaper-next"]:visible');
    for (
      let count = 0;
      count < wallpapers.length &&
      (await picture.getAttribute("data-wallpaper")) !== id;
      count++
    ) {
      await next.click();
    }
    await expect(picture).toHaveAttribute("data-wallpaper", id);
    const image = picture.locator("img");
    await expect
      .poll(() =>
        image.evaluate(
          (img) =>
            (img as HTMLImageElement).complete &&
            (img as HTMLImageElement).naturalWidth > 0,
        ),
      )
      .toBe(true);
    const presentation = await image.evaluate((img) => {
      const style = getComputedStyle(img);
      const bounds = img.getBoundingClientRect();
      return {
        fit: style.objectFit,
        filter: style.filter,
        transform: style.transform,
        animation: style.animationName,
        width: bounds.width,
        height: bounds.height,
        viewportWidth: innerWidth,
        viewportHeight: innerHeight,
      };
    });
    expect(presentation.fit).toBe("cover");
    expect(presentation.filter).toBe("grayscale(1)");
    expect(presentation.transform).toBe("none");
    expect(presentation.animation).toBe("none");
    expect(presentation.width).toBe(presentation.viewportWidth);
    expect(presentation.height).toBe(presentation.viewportHeight);
    await expect
      .poll(() =>
        page
          .locator(".wallpaper")
          .evaluate((element) => getComputedStyle(element, "::after").opacity),
      )
      .toBe("0");
    await noHorizontalOverflow(page);
    expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    await settledScreenshot(
      page,
      testInfo.outputPath(`${id}-${testInfo.project.name}.png`),
    );
    await page.reload();
    await ready(page, "/");
    await expect(picture).toHaveAttribute("data-wallpaper", id);
  });
}

test("all photographs fill tall desktop and wide phone viewports without letterboxing", async ({
  page,
}, testInfo) => {
  const mobile = testInfo.project.name === "mobile";
  const viewport = mobile
    ? { width: 500, height: 757 }
    : { width: 1080, height: 1950 };
  await page.setViewportSize(viewport);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await ready(page, "/");
  for (const photo of wallpapers) {
    await page.locator(`[data-wallpaper-id="${photo.id}"]:visible`).click();
    const image = page.locator("#wallpaper-picture img");
    await expect(image).toHaveCSS("object-fit", "cover");
    const bounds = await image.boundingBox();
    expect(bounds!.width).toBeGreaterThanOrEqual(viewport.width);
    expect(bounds!.height).toBeGreaterThanOrEqual(viewport.height);
    await noHorizontalOverflow(page);
    if (mobile)
      await page
        .locator(".app-window.is-active .window-scroll")
        .evaluate((element) => (element.scrollTop = 0));
    await settledScreenshot(
      page,
      testInfo.outputPath(
        `${photo.id}-${viewport.width}x${viewport.height}.png`,
      ),
    );
  }
});

test("Hamilton victory credits identify the historical race and reusable source", async ({
  page,
}) => {
  await page.goto("/credits/");
  await ready(page, "/credits/");
  const credit = page.locator("#hamilton-victory");
  await expect(credit.getByRole("heading")).toHaveText(
    "Lewis Hamilton · Chinese GP victory, 2014",
  );
  await expect(credit).toContainText("Drew Bates");
  await expect(credit).toContainText("20 April 2014");
  await expect(
    credit.getByRole("link", { name: "CC BY 2.0 license" }),
  ).toHaveAttribute("href", "https://creativecommons.org/licenses/by/2.0/");
  await expect(
    credit.getByRole("link", { name: "Original photograph and source" }),
  ).toHaveAttribute("href", /2014_Chinese_Grand_Prix/);
});
