import { test, expect } from "@playwright/test";

const origin = "https://gouveagsportfolio.vercel.app";
test("every crawlable route has static social metadata and canonical URLs", async ({
  request,
}) => {
  const sitemap = await (await request.get("/sitemap.xml")).text();
  const urls = [...sitemap.matchAll(/<loc>(.*?)<\/loc>/g)].map(
    (match) => match[1],
  );
  expect(urls.length).toBeGreaterThanOrEqual(10);
  expect(new Set(urls).size).toBe(urls.length);
  for (const url of urls) {
    expect(url.startsWith(`${origin}/`)).toBe(true);
    const response = await request.get(new URL(url).pathname);
    expect(response.ok()).toBe(true);
    const html = await response.text();
    expect(html).toContain(`rel="canonical" href="${url}"`);
    expect(html).toContain('property="og:image"');
    expect(html).toContain('property="og:image:alt" content="Gabriel Gouvêa"');
    expect(html).toContain('name="twitter:image"');
    expect(html).not.toContain('content="noindex');
    expect(html).toMatch(/<h1\b/);
  }
  const home = await (await request.get("/")).text();
  const data = JSON.parse(
    home.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)![1],
  );
  const person = data["@graph"].find(
    (entry: { "@type": string }) => entry["@type"] === "Person",
  );
  expect(person.name).toBe("Gabriel Gouvêa");
  expect(person.alternateName).toContain("Gabriel Gouvea");
  expect(person.sameAs).toEqual([
    "https://github.com/gouveags",
    "https://linkedin.com/in/gouveags",
    "https://x.com/gouveags",
  ]);
  expect(await (await request.get("/robots.txt")).text()).toContain(
    `Sitemap: ${origin}/sitemap.xml`,
  );
  expect(await (await request.get("/404.html")).text()).toContain(
    'content="noindex, follow"',
  );
});
