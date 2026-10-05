import { test, expect } from "@playwright/test";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { readingTime } from "../src/utils/reading-time";

test("the historical article body remains unchanged", () => {
  const body = readFileSync(
    "src/content/blog/vision-design-and-tech-choices.md",
    "utf8",
  )
    .split("---")
    .slice(2)
    .join("---");
  expect(createHash("sha256").update(body).digest("hex")).toBe(
    "48f0e195d4f8bd45a7a8e94d86c2ad190d98716ff22912ffd79dba7fbeeaf3cf",
  );
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

test("published list and original reader show the computed estimate and explicit archive context", async ({
  request,
}) => {
  const index = await (await request.get("/blog/")).text();
  const article = await (
    await request.get("/blog/vision-design-and-tech-choices/")
  ).text();
  expect(index).not.toContain("6 min read");
  expect(index.match(/class="read-time">1 min read/g)).toHaveLength(2);
  expect(article).toContain(" · 1 min read");
  expect(article).toContain("Archive note:");
  expect(article).toContain("plain HTML, CSS, and JavaScript");
  expect(article).toContain("now uses Astro");
});
