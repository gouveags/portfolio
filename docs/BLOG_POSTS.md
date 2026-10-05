# Publishing blog notes

The blog is built from Markdown files in `src/content/blog/`. Astro generates an ordinary, indexable page for every note at `/blog/<filename>/`. Readers can open these URLs directly without JavaScript. The desktop window interface uses those same pages.

## Add a note

1. Create `src/content/blog/a-clear-slug.md`.
2. Add frontmatter, followed by the article in Markdown.
3. Run `npm run build` and check the generated page.
4. Commit the new Markdown file with the rest of the site.

```md
---
title: 'Your article title'
summary: 'A short, honest description for the blog list and page metadata.'
category: engineering
order: 3
---

Your introduction.

## A useful section title

Your article continues here.
```

`category` must be `engineering` or `site`. `order` controls list order, highest first. Optional `dateLabel` and `readTime` fields are display text; use actual publication dates and reasonable reading estimates. No date is invented when these are absent.

Second- and third-level Markdown headings automatically populate the desktop table of contents and the mobile Contents menu. Their generated anchors work as normal URL fragments. Use meaningful headings rather than manually adding a second article title.

## Preserved article

`vision-design-and-tech-choices.md` preserves the original five paragraphs, title, summary, display date, reading-time label, and source note from the former inline `blogPosts` array in `scripts/main.js`. Its `legacy: true` flag adds an explicit note outside the article body explaining that it describes the previous site. The historical text has not been rewritten to imply that it describes this Astro implementation.

`why-this-desktop.md` is the short approved origin note about Omarchy and Gabriel’s Fedora, Hyprland, and Noctalia setup. There are no placeholder or proposed articles in the published index.

The collection schema lives in `src/content.config.ts`; the index and reader templates live in `src/pages/blog/`.
