# Publishing blog notes

The blog is built from Markdown files in `src/content/blog/`. Astro generates an ordinary, indexable page for every note at `/blog/<filename>/`. Readers can open these URLs directly without JavaScript. The desktop window interface uses those same pages.

## Add a note

1. Create `src/content/blog/a-clear-slug.md`.
2. Add frontmatter, followed by the article in Markdown.
3. Run `npm run build` and check the generated page.
4. Commit the new Markdown file with the rest of the site.

```md
---
title: "Your article title"
summary: "A short, honest description for the blog list and page metadata."
category: engineering
order: 3
---

Your introduction.

## A useful section title

Your article continues here.
```

`category` must be `engineering` or `site`. `order` controls list order, highest first. Optional `dateLabel` is display text; use an actual publication date. No date is invented when it is absent. Reading time is computed from the article body at 200 words per minute, rounded up to a minimum of one minute. The shared helper strips HTML tags, comments, and common Markdown scaffolding; it includes headings and code text in this approximate estimate. Do not add a manual `readTime` field.

Keep proposed posts and drafts outside `src/content/blog/` until they are approved for publication. Every Markdown file in that directory is published; the collection has no draft filter.

Second- and third-level Markdown headings automatically populate the desktop table of contents and the mobile Contents menu. Their generated anchors work as normal URL fragments. Use meaningful headings rather than manually adding a second article title.

## Preserved article

`vision-design-and-tech-choices.md` preserves the original five paragraphs, title, summary, display date, and source note from the former inline `blogPosts` array in `scripts/main.js`. Its `legacy: true` flag adds an explicit archive note outside the article body explaining that it describes the previous plain HTML/CSS/JavaScript site, while the current site uses Astro. The historical text has not been rewritten to imply that it describes this Astro implementation. Its former manual six-minute reading label is replaced by the same computed estimate as other notes.

`why-this-desktop.md` is the expanded approved origin essay about Omakub, Omarchy, and Gabriel’s Fedora, Hyprland, and Noctalia setup. Its existing URL and section anchors are preserved. Two approved engineering essays, `the-field-i-almost-threw-away.md` and `let-the-agent-see-what-broke.md`, discuss tool-output preservation and evidence for AI-assisted changes, with public source links and publication-date status snapshots. All three show their AI-assisted, user-approved writing attribution. There are no placeholder or proposed articles in the published index.

The collection schema lives in `src/content.config.ts`; the index and reader templates live in `src/pages/blog/`.
