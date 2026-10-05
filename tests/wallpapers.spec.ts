import AxeBuilder from "@axe-core/playwright";
import {
  test,
  expect,
  ready,
  noHorizontalOverflow,
  settledScreenshot,
} from "./helpers";

for (const id of ["ferrari", "spa"]) {
  test(`${id} wallpaper fills the screen with grayscale only and readable controls`, async ({
    page,
  }, testInfo) => {
    await page.goto("/");
    await ready(page, "/");
    const picture = page.locator("#wallpaper-picture");
    const next = page.locator('[data-action="wallpaper-next"]:visible');
    for (
      let count = 0;
      count < 4 && (await picture.getAttribute("data-wallpaper")) !== id;
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

test("the tall narrow desktop fills the viewport without letterboxing", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== "desktop",
    "Desktop breakpoint regression",
  );
  await page.setViewportSize({ width: 1082, height: 1949 });
  await page.goto("/");
  await ready(page, "/");
  await page
    .getByRole("button", { name: "Next wallpaper", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Next wallpaper", exact: true })
    .click();
  await expect(page.locator("#wallpaper-picture")).toHaveAttribute(
    "data-wallpaper",
    "ferrari",
  );
  await expect(page.locator("#wallpaper-picture img")).toHaveCSS(
    "object-fit",
    "cover",
  );
  await noHorizontalOverflow(page);
  await settledScreenshot(
    page,
    testInfo.outputPath("ferrari-narrow-desktop.png"),
  );
});
