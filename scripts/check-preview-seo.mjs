import assert from "node:assert/strict";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(
  process.argv[2] || "./node_modules/.cache/portfolio-seo-preview",
);
async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? walk(path.join(directory, entry.name))
          : path.join(directory, entry.name),
      ),
    )
  ).flat();
}
const pages = (await walk(root)).filter((file) => file.endsWith(".html"));
assert(pages.length >= 10, "Expected the complete static route build");
for (const file of pages) {
  const html = await readFile(file, "utf8");
  assert(
    html.includes('name="robots" content="noindex, follow"'),
    `${file}: preview must be noindex`,
  );
  const canonicals = [...html.matchAll(/rel="canonical" href="([^"]+)"/g)];
  assert.equal(canonicals.length, 1, `${file}: one canonical`);
  assert.equal(
    new URL(canonicals[0][1]).origin,
    "https://gouveagsportfolio.vercel.app",
  );
  assert(
    !html.includes('rel="sitemap"'),
    `${file}: no preview sitemap discovery`,
  );
}
assert(
  !(await readFile(path.join(root, "sitemap.xml"), "utf8")).includes("<loc>"),
);
const robots = await readFile(path.join(root, "robots.txt"), "utf8");
assert(robots.includes("Allow: /"));
assert(!robots.includes("Sitemap:"));
console.log(
  `Preview SEO passed: ${pages.length} noindex pages; production canonicals; no advertised preview URLs.`,
);
