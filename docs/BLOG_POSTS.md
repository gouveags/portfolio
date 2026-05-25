# Blog Posts Workflow

This portfolio blog is intentionally simple and framework-free.

## Where posts live

Posts are stored in `scripts/main.js` in the `blogPosts` array.

Each post uses this shape:

```js
{
  id: 'unique-slug',
  title: 'Post title',
  date: 'May 2026',
  readTime: '6 min read',
  summary: 'One short teaser paragraph.',
  paragraphs: [
    'Paragraph 1',
    'Paragraph 2'
  ],
  source: 'Optional note about where the post came from'
}
```

## How to add a new post

1. Open `scripts/main.js`.
2. Add a new object to the `blogPosts` array.
3. Keep the most recent post first.
4. Save and reload the page.

No extra routing or build step is required.
