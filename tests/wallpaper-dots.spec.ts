import { test, expect, ready, noHorizontalOverflow } from "./helpers";

const names = [
  "Classic Porsche 911 Carrera",
  "Theatro Municipal · São Paulo",
  "Lewis Hamilton · Ferrari SF-26, 2026",
  "Eau Rouge / Raidillon · The climb",
];

test("wallpaper dots select, wrap, support keyboard activation, and persist", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await ready(page, "/");
  const group = page
    .getByRole("group", { name: "Choose wallpaper" })
    .filter({ visible: true });
  const dots = group.getByRole("button");
  await expect(dots).toHaveCount(names.length);
  await expect(
    group.getByRole("button", { pressed: true }),
  ).toHaveAccessibleName(
    `Show wallpaper: ${names[testInfo.project.name === "mobile" ? 1 : 0]}`,
  );
  await dots.last().click();
  await expect(
    group.getByRole("button", { pressed: true }),
  ).toHaveAccessibleName(`Show wallpaper: ${names[3]}`);
  await page.locator('[data-action="wallpaper-next"]:visible').click();
  await expect(
    group.getByRole("button", { pressed: true }),
  ).toHaveAccessibleName(`Show wallpaper: ${names[0]}`);
  if (testInfo.project.name === "desktop") {
    await page
      .getByRole("button", { name: "Previous wallpaper", exact: true })
      .click();
    await expect(dots.last()).toHaveAttribute("aria-pressed", "true");
  }
  await dots.nth(2).focus();
  await expect(dots.nth(2)).toBeFocused();
  await dots.nth(2).press("Enter");
  await expect(page.locator("#wallpaper-picture")).toHaveAttribute(
    "data-wallpaper",
    "ferrari",
  );
  await expect(group.getByRole("button", { pressed: true })).toHaveCount(1);
  await expect(dots.nth(2)).toHaveAttribute("aria-pressed", "true");
  await noHorizontalOverflow(page);
  await page.reload();
  await ready(page, "/");
  await expect(dots.nth(2)).toHaveAttribute("aria-pressed", "true");
});

test("wallpaper dots follow automatic rotation and newly mounted Home controls", async ({
  page,
}) => {
  await page.clock.install();
  await page.goto("/blog/");
  await ready(page, "/blog/");
  await page
    .getByRole("link", { name: "Home", exact: true })
    .filter({ visible: true })
    .click();
  await ready(page, "/");
  const group = page
    .getByRole("group", { name: "Choose wallpaper" })
    .filter({ visible: true });
  await group
    .getByRole("button", { name: `Show wallpaper: ${names[3]}`, exact: true })
    .click();
  await page.clock.fastForward(32_000);
  await expect(page.locator("#wallpaper-picture")).toHaveAttribute(
    "data-wallpaper",
    "porsche",
  );
  await expect(
    group.getByRole("button", { pressed: true }),
  ).toHaveAccessibleName(`Show wallpaper: ${names[0]}`);
  await page.setViewportSize({ width: 1082, height: 900 });
  await expect(
    group.getByRole("button", { pressed: true }),
  ).toHaveAccessibleName(`Show wallpaper: ${names[0]}`);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(
    group.getByRole("button", { pressed: true }),
  ).toHaveAccessibleName(`Show wallpaper: ${names[0]}`);
  await noHorizontalOverflow(page);
});

test("wallpaper controls stay aligned and usable at narrow widths", async ({
  page,
}, testInfo) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await ready(page, "/");

  if (testInfo.project.name === "desktop") {
    for (const width of [1440, 800]) {
      await page.setViewportSize({ width, height: 900 });
      const controls = page.locator(".wallpaper-controls");
      const dots = await controls.locator(".wallpaper-dots").boundingBox();
      const actions = await controls
        .locator(".wallpaper-actions")
        .boundingBox();
      expect(dots).not.toBeNull();
      expect(actions).not.toBeNull();
      expect(
        Math.abs(dots!.x + dots!.width / 2 - actions!.x - actions!.width / 2),
        `Wallpaper picker and playback rows share a center at ${width}px`,
      ).toBeLessThanOrEqual(1);
      await expect(
        controls.locator('[data-action="wallpaper-pause"] .icon'),
      ).toBeVisible();
      const dock = await page.locator(".dock").boundingBox();
      const bounds = await controls.boundingBox();
      expect(bounds!.x, "Wallpaper controls clear the dock").toBeGreaterThan(
        dock!.x + dock!.width,
      );
      await noHorizontalOverflow(page);
    }
  } else {
    await page.setViewportSize({ width: 320, height: 900 });
    await expect(
      page
        .getByRole("group", { name: "Choose wallpaper" })
        .filter({ visible: true }),
    ).toBeVisible();
    await expect(
      page.locator('[data-action="wallpaper-pause"]:visible'),
    ).toBeVisible();
    await noHorizontalOverflow(page);
  }
});
