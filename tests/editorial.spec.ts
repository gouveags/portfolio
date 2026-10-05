import {
  test,
  expect,
  app,
  ready,
  noHorizontalOverflow,
  settledScreenshot,
} from "./helpers";

test("editorial links stay usable at narrow widths and project names remain accessible", async ({
  page,
}, info) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  if (info.project.name === "mobile")
    await page.setViewportSize({ width: 320, height: 844 });
  await page.goto("/open-source/");
  await ready(page, "/open-source/");
  const oss = app(page, "/open-source/");
  await expect(
    oss.getByRole("heading", { level: 2, name: "PostHog", exact: true }),
  ).toBeVisible();
  await expect(
    oss.getByRole("heading", { level: 2, name: "LangChain and LangGraph" }),
  ).toBeAttached();
  await expect(oss.locator("#posthog")).toContainText("still under review");
  await expect(oss.locator("#langchain")).toContainText("closed without merging");
  const sizes = await oss
    .locator(".contribution-links a, .contribution-receipts a, .tabs button")
    .evaluateAll((elements) =>
      elements
        .filter((el) => el.getClientRects().length)
        .map((el) => ({
          label: el.textContent,
          height: el.getBoundingClientRect().height,
        })),
    );
  expect(sizes.length).toBeGreaterThan(5);
  for (const size of sizes)
    expect(size.height, size.label || "link target").toBeGreaterThanOrEqual(44);
  await noHorizontalOverflow(page);
  await settledScreenshot(page, info.outputPath("open-source-editorial.png"));
  await oss
    .locator("#langchain")
    .evaluate((element) => element.scrollIntoView({ block: "start" }));
  await settledScreenshot(page, info.outputPath("langchain-clear-space.png"));
  await page.goto("/contact/");
  await ready(page, "/contact/");
  const contact = app(page, "/contact/");
  const email = contact.getByRole("link", {
    name: "gabrielsgouvea@hotmail.com",
  });
  await expect(email).toHaveAttribute(
    "href",
    "mailto:gabrielsgouvea@hotmail.com",
  );
  await email.focus();
  await expect(email).toBeFocused();
  await page.keyboard.press("Tab");
  await expect(
    contact.getByRole("link", { name: "GitHub", exact: true }),
  ).toBeFocused();
  for (const link of await contact
    .locator(".contact-email a, .contact-profiles a")
    .all()) {
    const box = await link.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await noHorizontalOverflow(page);
  await settledScreenshot(page, info.outputPath("contact-editorial.png"));
});
