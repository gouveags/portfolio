# Gabriel Gouvêa’s portfolio

A quiet, black-and-white desktop for projects, open source, and writing. Desktop has tiled windows; mobile has its own Home, apps, and Recents navigation.

Built with **Astro**, static HTML, CSS, and a small TypeScript enhancement. No database, authentication, server functions, or external runtime services. Every page has a real URL and renders usable, indexable content without JavaScript.

## Local development

Node.js 22.12+ (CI uses Node 24):

```sh
npm ci
npm run dev
```

Open the URL printed by Astro. For a production build:

```sh
npm run build
npm run preview
```

## Checks

```sh
npm run check
npm run build
npm run test:static
npx playwright install chromium
npm test
```

`npm run verify` runs the complete sequence after browser installation. CI installs Chromium and runs the same checks. See [design-qa.md](./design-qa.md) for the latest visual verification status.

## Publish on Vercel

The repository includes `vercel.json` with the Astro preset, `npm ci`, `npm run build`, and `dist` output. It produces static assets only, suitable for Vercel’s free Hobby plan subject to Vercel’s current plan terms. No paid services or environment variables are required.

A pull request may create an automatic preview through an existing Vercel integration. Merging the PR or changing production deployment settings is a separate decision.

## Content

- `src/content/blog/*.md`: posts, validated frontmatter, and static article routes
- `src/data/projects.ts`: selected work
- `src/pages/open-source.astro`: source-linked contributions and experiments
- `src/pages/about.astro`: biography and professional timeline
- `public/assets/`: the original portrait, favicon, and résumé

See [the documentation index](./docs/README.md) for design and photo sources, and [the blog guide](./docs/BLOG_POSTS.md) to add a post. The previous site’s article is preserved unchanged and explicitly labeled as a note about the previous version.

## The shell

`src/layouts/Layout.astro` renders the full page. `src/scripts/shell.ts` progressively enhances same-origin links with cached windows, two-column tiling, focus/minimize/close, search, and mobile Recents. Browser Back/Forward stays connected to real routes. Recents and reading positions last for the current visit; a full reload starts at the requested page. Wallpaper and opt-in shortcuts are stored locally when browser storage is available.

All enhanced controls have visible labels or accessible names. Keyboard shortcuts are off by default and ignore text inputs. Reduced-motion preferences stop wallpaper movement and transitions. Pause is available independently.

## Photographs and licenses

Wallpapers are real photographs, not generated images or video. Each photograph has source attribution and its individual rights recorded on `/credits/` and in [PHOTO-LICENSES.md](./docs/PHOTO-LICENSES.md). The current F1 selections use the original JPEGs with grayscale and responsive viewport cropping only. Trophy references without verified publication rights are excluded from the site. Creative Commons licenses apply only to their respective photographs, not the entire website. No endorsement is implied.

## Contact

- [GitHub](https://github.com/gouveags)
- [LinkedIn](https://linkedin.com/in/gouveags)
- [Email](mailto:gabrielgouvea@poli.ufrj.br)
- [Portfolio](https://gouveagsportfolio.vercel.app/)
