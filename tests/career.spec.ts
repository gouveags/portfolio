import { test, expect, app, ready, active, openSearch } from "./helpers";

test("Career is primary navigation and Open source is its linked child", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await ready(page, "/");
  const primary = page.locator(
    testInfo.project.name === "mobile" ? ".app-grid" : ".dock",
  );
  await expect(
    primary.getByRole("link", { name: "Career", exact: true }),
  ).toHaveAttribute("href", "/about/");
  await expect(primary.locator('a[href="/open-source/"]')).toHaveCount(
    testInfo.project.name === "mobile" ? 0 : 1,
  );
  const destinations = await primary
    .locator("a")
    .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(destinations).toEqual(
    testInfo.project.name === "mobile"
      ? ["/about/", "/projects/", "/blog/", "/contact/", "/guide/"]
      : [
          "/",
          "/about/",
          "/open-source/",
          "/projects/",
          "/blog/",
          "/contact/",
          "/guide/",
          "/credits/",
        ],
  );
  await primary.getByRole("link", { name: "Career", exact: true }).click();
  await active(page, "/about/");
  await app(page, "/about/")
    .getByRole("link", { name: "Explore my open-source work" })
    .click();
  await active(page, "/open-source/");
  await app(page, "/open-source/")
    .getByRole("navigation", { name: "Breadcrumb" })
    .getByRole("link", { name: "Career" })
    .click();
  await active(page, "/about/");
  await openSearch(page, testInfo.project.name === "mobile");
  await page.locator("#search-input").fill("Open source");
  await page.locator('#search-results a[href="/open-source/"]').click();
  await active(page, "/open-source/");
});

for (const route of ["/", "/contact/"]) {
  test(`current public email in rendered HTML: ${route}`, async ({
    request,
  }) => {
    const response = await request.get(route);
    expect(response.ok()).toBeTruthy();
    const html = await response.text();
    expect(html).toContain("mailto:gabrielsgouvea@hotmail.com");
    expect(html).not.toContain("gabrielgouvea@poli.ufrj.br");
  });
}
