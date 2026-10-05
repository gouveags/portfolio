import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { readingTime } from "../src/utils/reading-time";

const publishedPosts = [
  "let-the-agent-see-what-broke",
  "the-field-i-almost-threw-away",
  "vision-design-and-tech-choices",
  "why-this-desktop",
];

const articleBody = (slug: string) =>
  readFileSync(`src/content/blog/${slug}.md`, "utf8")
    .split("---")
    .slice(2)
    .join("---");

test("the historical article body remains unchanged", () => {
  const body = articleBody("vision-design-and-tech-choices");
  expect(createHash("sha256").update(body).digest("hex")).toBe(
    "48f0e195d4f8bd45a7a8e94d86c2ad190d98716ff22912ffd79dba7fbeeaf3cf",
  );
});

test("exactly four approved articles are published without draft fields", () => {
  expect(readdirSync("src/content/blog").sort()).toEqual(
    publishedPosts.map((slug) => `${slug}.md`),
  );
  for (const slug of publishedPosts) {
    const source = readFileSync(`src/content/blog/${slug}.md`, "utf8");
    expect(source).not.toMatch(/^(?:draft|publicationStatus|readTime):/m);
    expect(source).not.toMatch(/pending Gabriel['’]s review|Source notes for the editor|Claims and sources/);
    if (slug !== "vision-design-and-tech-choices") {
      expect(source).toContain('dateLabel: "5 October 2026"');
      expect(source).toContain("AI-assisted writing approved for publication by Gabriel Gouvêa.");
      expect(readingTime(articleBody(slug))).not.toBe("1 min read");
    }
  }
});

test("reading time rounds up at 200 words per minute with a one-minute minimum", () => {
  expect(readingTime("")).toBe("1 min read");
  expect(readingTime("word ".repeat(200))).toBe("1 min read");
  expect(readingTime("word ".repeat(201))).toBe("2 min read");
  expect(readingTime("word ".repeat(400))).toBe("2 min read");
});

test("reading time counts visible text rather than Markdown destinations or HTML markup", () => {
  const body = `${"word ".repeat(198)}\n## [Read more](https://example.org/${"path/".repeat(400)})\n<div id="${"attribute ".repeat(400)}"></div>\n<!-- ${"comment ".repeat(400)} -->`;
  expect(readingTime(body)).toBe("1 min read");
});

test("all published readers show computed estimates, approved authorship, and archive context", async ({
  request,
}) => {
  const index = await (await request.get("/blog/")).text();
  expect(index).not.toContain("6 min read");
  const expectedTimes = publishedPosts.map((slug) => readingTime(articleBody(slug))).sort();
  const listedTimes = [...index.matchAll(/class="read-time">([^<]+)/g)].map((match) => match[1]).sort();
  expect(listedTimes).toEqual(expectedTimes);

  for (const slug of publishedPosts) {
    const route = `/blog/${slug}/`;
    const response = await request.get(route);
    expect(response.ok()).toBeTruthy();
    const article = await response.text();
    expect(article).toContain(` · ${readingTime(articleBody(slug))}`);
    expect(article).toContain(`rel="canonical" href="https://gouveagsportfolio.vercel.app${route}"`);
    expect(article).toContain('property="og:type" content="article"');
    if (slug === "vision-design-and-tech-choices") {
      expect(article).toContain("Archive note:");
      expect(article).toContain("plain HTML, CSS, and JavaScript");
      expect(article).toContain("now uses Astro");
    } else {
      expect(article).toContain("5 October 2026");
      expect(article).toContain("AI-assisted writing approved for publication by Gabriel Gouvêa.");
      expect(article).not.toContain("Archive note:");
    }
  }
});

test("the expanded desktop essay retains its existing URL and section anchors", async ({ request }) => {
  const article = await (await request.get("/blog/why-this-desktop/")).text();
  for (const anchor of ["a-desktop-i-enjoy", "what-i-brought-to-the-web", "a-few-ways-around"]) {
    expect(article).toContain(`id="${anchor}"`);
  }
  expect(article).toContain("Omakub was where I first fell in love with Linux");
  expect(article).toContain("Fedora, Hyprland and Noctalia");
});
