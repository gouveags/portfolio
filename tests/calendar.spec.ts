import AxeBuilder from "@axe-core/playwright";
import {
  test,
  expect,
  ready,
  noHorizontalOverflow,
  settledScreenshot,
} from "./helpers";

test.use({ locale: "en-US", timezoneId: "America/Los_Angeles" });
const opener = (page: import("@playwright/test").Page) =>
  page
    .getByRole("button", { name: /^Open calendar,/ })
    .filter({ visible: true });

test("clock and popup sit on the left without the handle label", async ({
  page,
}, testInfo) => {
  for (const path of ["/", "/about/"]) {
    await page.goto(path);
    await ready(page, path);
    const bar = page.locator(
      testInfo.project.name === "mobile" ? ".mobile-header" : ".desktop-bar",
    );
    await expect(bar).not.toContainText("gouveags");
    const trigger = opener(page);
    const clockBounds = await trigger.boundingBox();
    expect(clockBounds!.x).toBeLessThan(100);
    await trigger.click();
    const bounds = await page
      .getByRole("dialog", { name: "Calendar" })
      .boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x).toBeLessThanOrEqual(24);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
      page.viewportSize()!.width,
    );
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
  }
});

test("clock uses device-local date and updates across midnight", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2028-01-01T07:59:30Z") });
  await page.goto("/");
  await ready(page, "/");
  await expect(opener(page)).toContainText("11:59 PM");
  await expect(opener(page)).toContainText("Dec 31");
  await opener(page).click();
  await expect(
    page.getByRole("heading", { name: "December 2027", exact: true }),
  ).toBeVisible();
  await page.clock.fastForward(31_000);
  await expect(opener(page)).toContainText("12:00 AM");
  await expect(
    page.getByRole("heading", { name: "January 2028", exact: true }),
  ).toBeVisible();
  await expect(page.locator('#calendar [aria-current="date"]')).toHaveText("1");
});

test("calendar handles leap months, year boundaries, and Today", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2028-02-15T20:00:00Z") });
  await page.goto("/");
  await ready(page, "/");
  await opener(page).click();
  const calendar = page.getByRole("dialog", { name: "Calendar" });
  await expect(calendar.locator("tbody time")).toHaveCount(29);
  await expect(calendar.locator('[aria-current="date"]')).toHaveText("15");
  await calendar
    .getByRole("button", { name: "Previous month", exact: true })
    .click();
  await expect(
    calendar.getByRole("heading", { name: "January 2028", exact: true }),
  ).toBeVisible();
  await expect(calendar.locator("tbody time")).toHaveCount(31);
  await calendar
    .getByRole("button", { name: "Previous month", exact: true })
    .click();
  await expect(
    calendar.getByRole("heading", { name: "December 2027", exact: true }),
  ).toBeVisible();
  await calendar
    .getByRole("button", { name: "Next month", exact: true })
    .click();
  await expect(
    calendar.getByRole("heading", { name: "January 2028", exact: true }),
  ).toBeVisible();
  await calendar.getByRole("button", { name: "Today", exact: true }).click();
  await expect(
    calendar.getByRole("heading", { name: "February 2028", exact: true }),
  ).toBeVisible();
  await calendar
    .getByRole("button", { name: "Next month", exact: true })
    .click();
  await expect(calendar.locator("tbody time")).toHaveCount(31);
});

test("clock skips the missing daylight-saving hour", async ({ page }) => {
  await page.clock.install({ time: new Date("2028-03-12T09:59:30Z") });
  await page.goto("/");
  await ready(page, "/");
  await expect(opener(page)).toContainText("1:59 AM");
  await page.clock.fastForward(31_000);
  await expect(opener(page)).toContainText("3:00 AM");
  await expect(opener(page)).toContainText("Mar 12");
});

test("historical month stays open across midnight and returning to the page refreshes today", async ({
  page,
}) => {
  await page.clock.install({ time: new Date("2028-01-01T07:59:30Z") });
  await page.goto("/");
  await ready(page, "/");
  await opener(page).click();
  const calendar = page.getByRole("dialog", { name: "Calendar" });
  await calendar
    .getByRole("button", { name: "Previous month", exact: true })
    .click();
  await page.clock.fastForward(31_000);
  await expect(
    calendar.getByRole("heading", { name: "November 2027", exact: true }),
  ).toBeVisible();
  await expect(calendar.locator('[aria-current="date"]')).toHaveCount(0);
  await expect(opener(page)).toContainText("Jan 1");
  await page.clock.setSystemTime(new Date("2028-02-02T20:34:00Z"));
  await page.evaluate(() =>
    document.dispatchEvent(new Event("visibilitychange")),
  );
  await expect(opener(page)).toContainText("12:34 PM");
  await expect(opener(page)).toContainText("Feb 2");
  await expect(
    calendar.getByRole("heading", { name: "November 2027", exact: true }),
  ).toBeVisible();
  await calendar.getByRole("button", { name: "Today", exact: true }).click();
  await expect(
    calendar.getByRole("heading", { name: "February 2028", exact: true }),
  ).toBeVisible();
  await expect(calendar.locator('[aria-current="date"]')).toHaveAttribute(
    "datetime",
    "2028-02-02",
  );
});

test.describe("positive fractional device timezone", () => {
  test.use({ timezoneId: "Asia/Kolkata" });

  test("local year can be ahead of UTC and ordinary February has 28 days", async ({
    page,
  }) => {
    await page.clock.install({ time: new Date("2027-12-31T20:00:00Z") });
    await page.goto("/");
    await ready(page, "/");
    await expect(opener(page)).toContainText("1:30 AM");
    await expect(opener(page)).toContainText("Jan 1");
    await opener(page).click();
    const calendar = page.getByRole("dialog", { name: "Calendar" });
    await expect(
      calendar.getByRole("heading", { name: "January 2028", exact: true }),
    ).toBeVisible();
    await expect(calendar.locator('[aria-current="date"]')).toHaveAttribute(
      "datetime",
      "2028-01-01",
    );
    await page.clock.setSystemTime(new Date("2029-02-01T20:00:00Z"));
    await calendar.getByRole("button", { name: "Today", exact: true }).click();
    await expect(
      calendar.getByRole("heading", { name: "February 2029", exact: true }),
    ).toBeVisible();
    await expect(calendar.locator("tbody time")).toHaveCount(28);
    await expect(calendar.locator('[aria-current="date"]')).toHaveAttribute(
      "datetime",
      "2029-02-02",
    );
  });
});

test("calendar contains focus, dismisses, and fits the viewport", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await ready(page, "/");
  const trigger = opener(page);
  await trigger.focus();
  await trigger.press("Enter");
  const calendar = page.getByRole("dialog", { name: "Calendar" });
  await expect(calendar).toBeVisible();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  await expect(
    calendar.getByRole("button", { name: "Close calendar", exact: true }),
  ).toBeFocused();
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press("Tab");
    expect(
      await page.evaluate(() => !!document.activeElement?.closest("#calendar")),
    ).toBe(true);
  }
  for (let i = 0; i < 7; i++) {
    await page.keyboard.press("Shift+Tab");
    expect(
      await page.evaluate(() => !!document.activeElement?.closest("#calendar")),
    ).toBe(true);
  }
  expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
  await noHorizontalOverflow(page);
  const bounds = await calendar.boundingBox();
  expect(bounds!.x).toBeGreaterThanOrEqual(0);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(
    page.viewportSize()!.width,
  );
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(
    page.viewportSize()!.height,
  );
  await settledScreenshot(
    page,
    testInfo.outputPath(`calendar-${testInfo.project.name}.png`),
  );
  await page.keyboard.press("Escape");
  await expect(calendar).toBeHidden();
  await expect(trigger).toBeFocused();
  await expect(trigger).toHaveAttribute("aria-expanded", "false");
  await trigger.click();
  await page.mouse.click(2, 2);
  await expect(calendar).toBeHidden();
  await expect(trigger).toBeFocused();
  await page.setViewportSize({ width: 320, height: 568 });
  await opener(page).click();
  await noHorizontalOverflow(page);
  const small = await calendar.boundingBox();
  expect(small!.x + small!.width).toBeLessThanOrEqual(320);
  expect(small!.y + small!.height).toBeLessThanOrEqual(568);
});
