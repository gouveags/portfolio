import AxeBuilder from "@axe-core/playwright";
import type { Locator, Page } from "@playwright/test";
import { personalPhotos } from "../src/data/personal-photos";
import {
  test,
  expect,
  app,
  active,
  ready,
  noHorizontalOverflow,
  settledScreenshot,
} from "./helpers";

const personalPath = "/about/#personal";
const portrait = personalPhotos[1];
const photoLink = (page: Page, index: number) =>
  app(page, "/about/").locator("[data-photo-viewer]").nth(index);

async function loadedImage(image: Locator) {
  await expect(image).toBeVisible();
  await expect
    .poll(() =>
      image.evaluate(
        (element: HTMLImageElement) =>
          element.complete && element.naturalWidth > 0,
      ),
    )
    .toBe(true);
}

async function personalFromHome(page: Page) {
  await page.goto("/");
  await ready(page, "/");
  await expect(app(page, "/about/")).toHaveCount(0);
  // Preserve a witness on the existing document to distinguish shell fetching
  // from a full-page navigation that would hide missing fragment styles.
  await page.evaluate(() => {
    document.documentElement.dataset.personalNavigationWitness = "home";
  });
  const more = page
    .getByRole("link", { name: "More about me", exact: true })
    .filter({ visible: true });
  await expect(more).toHaveAttribute("href", personalPath);
  const fetched = page.waitForResponse(
    (response) =>
      new URL(response.url()).pathname === "/about/" &&
      response.request().resourceType() === "fetch",
  );
  await more.click();
  expect((await fetched).ok()).toBe(true);
  await active(page, "/about/");
  await expect(page).toHaveURL(/\/about\/#personal$/);
  await expect(page.locator("html")).toHaveAttribute(
    "data-personal-navigation-witness",
    "home",
  );
  await expect(
    app(page, "/about/").locator("#personal-title"),
  ).toBeInViewport();
  await expect(app(page, "/about/").locator("#personal")).toBeFocused();
}

async function expectPhotoViewer(page: Page, index: number) {
  const photo = personalPhotos[index]!;
  const viewer = page.locator("#photo-viewer");
  await expect(viewer).toBeVisible();
  await expect(viewer).toHaveAccessibleName(photo.title);
  await expect(viewer).toHaveAccessibleDescription(photo.caption);
  await expect(page.locator("#photo-viewer-title")).toHaveText(photo.title);
  await expect(page.locator("#photo-viewer-caption")).toHaveText(photo.caption);
  const image = page.locator("#photo-viewer-image");
  await expect(image).toHaveAttribute(
    "src",
    new URL(photo.fullSrc, page.url()).href,
  );
  await expect(image).toHaveAttribute("alt", photo.alt);
  await loadedImage(image);
  await expect(image).toHaveCSS("object-fit", "contain");
  await expect(viewer.locator(".photo-viewer-frame")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.locator("#photo-viewer-status")).toBeHidden();
  await expect(page.locator("#photo-viewer-file")).toHaveAttribute(
    "href",
    new URL(photo.fullSrc, page.url()).href,
  );
  await expect(page).toHaveURL(/\/about\/#personal$/);
}

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("Home fetches the styled personal chapter with five responsive, uncropped photographs", async ({
  page,
}) => {
  const fullPaths = new Set<string>(
    personalPhotos.map((photo) => photo.fullSrc),
  );
  const fullRequests: string[] = [];
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (fullPaths.has(path)) fullRequests.push(path);
  });
  await personalFromHome(page);
  const chapter = app(page, "/about/").locator("#personal");
  const gallery = chapter.getByRole("group", {
    name: "A few personal photographs",
  });
  await expect(chapter).toHaveCSS("container-type", "inline-size");
  await expect(chapter).toHaveCSS("border-top-width", "1px");
  await expect(gallery).toHaveCSS("display", "grid");
  await expect(gallery).toHaveCSS("max-width", "680px");
  await expect(gallery.locator("figure")).toHaveCount(5);
  await expect(gallery.locator("figcaption")).toHaveCount(5);
  const layout = await gallery.evaluate((element) => ({
    columns: getComputedStyle(element).gridTemplateColumns.split(" ").length,
    narrow:
      innerWidth < 800 || element.closest("#personal")!.clientWidth <= 480,
  }));
  expect(layout.columns).toBe(layout.narrow ? 1 : 2);

  for (const [index, photo] of personalPhotos.entries()) {
    const figure = gallery.locator("figure").nth(index);
    const link = photoLink(page, index);
    const image = figure.locator("img");
    await expect(figure.locator(".personal-photo-title")).toHaveText(
      photo.title,
    );
    await expect(figure.locator(".personal-photo-caption")).toHaveText(
      photo.caption,
    );
    await expect(link).toHaveAccessibleName(
      `View larger photo: ${photo.title}`,
    );
    await expect(link).toHaveAttribute("href", photo.fullSrc);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", /noopener/);
    await expect(link).toHaveAttribute("data-photo-title", photo.title);
    await expect(link).toHaveAttribute("data-photo-caption", photo.caption);
    await expect(link).toHaveAttribute("data-photo-alt", photo.alt);
    await expect(image).toHaveAttribute("alt", photo.alt);
    await expect(image).toHaveAttribute("loading", "lazy");
    await expect(image).toHaveAttribute("decoding", "async");
    await expect(image).toHaveAttribute("src", photo.src);
    await expect(image).toHaveAttribute("srcset", photo.srcSet);
    await expect(image).toHaveAttribute(
      "sizes",
      /\(max-width: 799px\) calc\(100vw - 50px\), (?:680|330)px/,
    );
    await expect(image).toHaveAttribute("width", String(photo.width));
    await expect(image).toHaveAttribute("height", String(photo.height));
    await figure.scrollIntoViewIfNeeded();
    await loadedImage(image);
    const geometry = await image.evaluate((element: HTMLImageElement) => ({
      width: element.getBoundingClientRect().width,
      height: element.getBoundingClientRect().height,
      naturalRatio: element.naturalWidth / element.naturalHeight,
      selected: new URL(element.currentSrc).pathname,
      objectFit: getComputedStyle(element).objectFit,
    }));
    expect(geometry.selected).toMatch(
      new RegExp(`/photos/about/${photo.id}-(480|800)\\.webp$`),
    );
    expect(geometry.objectFit).not.toBe("cover");
    expect(
      Math.abs(geometry.width / geometry.height / geometry.naturalRatio - 1),
      `${photo.title} keeps its original aspect ratio`,
    ).toBeLessThan(0.01);
  }
  expect(
    fullRequests,
    "Larger files must only load after opening a photograph",
  ).toEqual([]);
  await noHorizontalOverflow(page);
});

test("all five larger photographs open and repeatedly close back to their own link", async ({
  page,
  context,
}) => {
  await personalFromHome(page);
  for (const [index] of personalPhotos.entries()) {
    const link = photoLink(page, index);
    await link.click();
    await expectPhotoViewer(page, index);
    expect(
      context.pages(),
      "Enhanced photo clicks must not open a native tab",
    ).toHaveLength(1);
    await expect(
      page.getByRole("button", { name: "Close photo", exact: true }),
    ).toBeFocused();
    if (index % 2 === 0)
      await page
        .getByRole("button", { name: "Close photo", exact: true })
        .click();
    else await page.keyboard.press("Escape");
    await expect(page.locator("#photo-viewer")).toBeHidden();
    await expect(page.locator("#photo-viewer-image")).not.toHaveAttribute(
      "src",
    );
    await expect(link).toBeFocused();
  }
  // Reopening an earlier portrait must replace the final landscape cleanly.
  await photoLink(page, 1).click();
  await expectPhotoViewer(page, 1);
  await page.keyboard.press("Escape");
  await expect(photoLink(page, 1)).toBeFocused();
});

test("direct personal deep link and portrait viewer support keyboard navigation and axe", async ({
  page,
}) => {
  await page.goto(personalPath);
  await ready(page, "/about/");
  await expect(page.locator("#personal-title")).toBeInViewport();
  await page.reload();
  await ready(page, "/about/");
  await expect(page.locator("#personal-title")).toBeInViewport();
  const chapterResults = await new AxeBuilder({ page })
    .include("#personal")
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    chapterResults.violations,
    JSON.stringify(chapterResults.violations, null, 2),
  ).toEqual([]);
  const link = photoLink(page, 1);
  await link.scrollIntoViewIfNeeded();
  await link.focus();
  await page.keyboard.press("Enter");
  await expectPhotoViewer(page, 1);
  const close = page.getByRole("button", { name: "Close photo", exact: true });
  const file = page.locator("#photo-viewer-file");
  await expect(close).toBeFocused();
  for (const key of ["Tab", "Shift+Tab"]) {
    for (let turn = 0; turn < 3; turn++) {
      await page.keyboard.press(key);
      await expect(file).toBeFocused();
      await page.keyboard.press(key);
      await expect(close).toBeFocused();
    }
  }
  const viewerResults = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  expect(
    viewerResults.violations,
    JSON.stringify(viewerResults.violations, null, 2),
  ).toEqual([]);
  const bounds = await page.locator("#photo-viewer").boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.y).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height,
  );
  await noHorizontalOverflow(page);
  await page.keyboard.press("Escape");
  await expect(page.locator("#photo-viewer")).toBeHidden();
  await expect(link).toBeFocused();
});

test("loading failures announce a usable image-file fallback and allow a successful retry", async ({
  page,
}) => {
  await page.goto(personalPath);
  await ready(page, "/about/");
  let releaseFailure!: () => void;
  const pendingFailure = new Promise<void>((resolve) => {
    releaseFailure = resolve;
  });
  const pattern = `**${portrait.fullSrc}`;
  await page.route(pattern, async (route) => {
    await pendingFailure;
    await route.abort("failed");
  });
  try {
    await photoLink(page, 1).click();
    await expect(page.locator("#photo-viewer")).toBeVisible();
    await expect(page.locator("#photo-viewer-status")).toHaveText(
      "Loading photo…",
    );
    await expect(page.locator(".photo-viewer-frame")).toHaveAttribute(
      "aria-busy",
      "true",
    );
    await expect(page.locator("#photo-viewer-image")).toBeHidden();
  } finally {
    releaseFailure();
  }
  await expect(page.locator("#photo-viewer-status")).toHaveText(
    "The photo could not load. You can try the image link below.",
  );
  await expect(page.locator("#photo-viewer-status")).toBeVisible();
  await expect(page.locator("#photo-viewer-status")).toHaveAttribute(
    "role",
    "status",
  );
  await expect(page.locator(".photo-viewer-frame")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await expect(page.locator("#photo-viewer-image")).toBeHidden();
  const file = page.getByRole("link", { name: /Open image file/ });
  await expect(file).toHaveAttribute(
    "href",
    new URL(portrait.fullSrc, page.url()).href,
  );
  await expect(file).toHaveAttribute("target", "_blank");
  await expect(file).toHaveAttribute("rel", /noopener/);
  await page.unroute(pattern);
  const popupPromise = page.waitForEvent("popup");
  await file.click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(
    new RegExp(`${portrait.fullSrc.replace(".", "\\.")}$`),
  );
  await loadedImage(popup.locator("img"));
  await popup.close();
  await expect(page.locator("#photo-viewer")).toBeVisible();
  await page.getByRole("button", { name: "Close photo", exact: true }).click();
  await expect(photoLink(page, 1)).toBeFocused();
  await photoLink(page, 1).click();
  await expectPhotoViewer(page, 1);
  await page.keyboard.press("Escape");
  await expect(photoLink(page, 1)).toBeFocused();
});

test("Back dismisses the open viewer and Forward restores the personal route without a stale modal", async ({
  page,
}) => {
  await personalFromHome(page);
  await photoLink(page, 1).click();
  await expectPhotoViewer(page, 1);
  await page.goBack();
  await active(page, "/");
  await expect(page.locator("#photo-viewer")).toBeHidden();
  await expect(page.locator("#photo-viewer-image")).not.toHaveAttribute("src");
  await expect(app(page, "/about/")).toBeHidden();
  expect(
    await page.evaluate(() =>
      document.activeElement?.closest(".app-window")?.getAttribute("data-path"),
    ),
  ).toBe("/");
  await page.goForward();
  await active(page, "/about/");
  await expect(page).toHaveURL(/\/about\/#personal$/);
  await expect(page.locator("#personal-title")).toBeInViewport();
  await expect(page.locator("#photo-viewer")).toBeHidden();
  await photoLink(page, 0).click();
  await expectPhotoViewer(page, 0);
  await page.keyboard.press("Escape");
  await expect(photoLink(page, 0)).toBeFocused();
});

// Keep evidence independent of behavior/axe assertions so CI retains useful
// screenshots even when a separate interaction regression fails.
test("capture personal chapter, gallery rows, and a full portrait", async ({
  page,
}, testInfo) => {
  await personalFromHome(page);
  const prefix = testInfo.project.name;
  await settledScreenshot(
    page,
    testInfo.outputPath(`${prefix}-personal-chapter.png`),
  );
  const gallery = page.locator("#personal .personal-gallery");
  const rowStarts =
    testInfo.project.name === "mobile" ? [0, 1, 2, 3, 4] : [0, 1, 3];
  for (const index of rowStarts) {
    await gallery
      .locator("figure")
      .nth(index)
      .evaluate((element) =>
        element.scrollIntoView({ block: "start", behavior: "instant" }),
      );
    await settledScreenshot(
      page,
      testInfo.outputPath(`${prefix}-personal-gallery-${index + 1}.png`),
    );
  }
  await photoLink(page, 1).click();
  await expectPhotoViewer(page, 1);
  await settledScreenshot(
    page,
    testInfo.outputPath(`${prefix}-personal-portrait-viewer.png`),
  );
});

test.describe("personal photographs without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("Home deep link and all five native full-image links remain usable", async ({
    page,
  }) => {
    await page.goto("/");
    const more = page
      .getByRole("link", { name: "More about me", exact: true })
      .filter({ visible: true });
    await expect(more).toHaveAttribute("href", personalPath);
    await more.click();
    await expect(page).toHaveURL(/\/about\/#personal$/);
    await expect(page.locator("html")).not.toHaveClass(/\benhanced\b/);
    await expect(page.locator("#personal-title")).toBeInViewport();
    await expect(page.locator("#personal figure")).toHaveCount(5);
    await expect(page.locator("#photo-viewer")).toBeHidden();
    for (const [index, photo] of personalPhotos.entries()) {
      const link = photoLink(page, index);
      await expect(link).toHaveAttribute("href", photo.fullSrc);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", /noopener/);
      await expect(link.locator("img")).toHaveAttribute("alt", photo.alt);
      await expect(
        page.locator("#personal figcaption").nth(index),
      ).toContainText(photo.caption);
      const popupPromise = page.waitForEvent("popup");
      await link.click();
      const popup = await popupPromise;
      await expect(popup).toHaveURL(new URL(photo.fullSrc, page.url()).href);
      await loadedImage(popup.locator("img"));
      await popup.close();
      await expect(page).toHaveURL(/\/about\/#personal$/);
    }
    await noHorizontalOverflow(page);
  });
});
