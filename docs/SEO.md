# Search and sharing

The SEO foundation keeps every page readable as static HTML with a descriptive title, a page description, and a real heading. Production canonicals and sitemap URLs use `site` in `astro.config.mjs`: `https://gouveagsportfolio.vercel.app`, the portfolio URL already recorded in the project README. A future domain change must update that setting. A read-only header request verified this public origin returns HTTP 200 from Vercel on 2026-10-05.

The shared layout provides Open Graph metadata and a square summary card using the existing 395 × 395 portrait. Home includes Person and WebSite JSON-LD with the accented name, the ASCII spelling, the public handle, and the GitHub, LinkedIn, and X profile URLs published on Contact. The X handle was verified against the public GitHub profile API. No employment, credentials, publication dates, or rich-result eligibility is inferred. Blog source dates are display labels, so no machine-readable article date is emitted.

Vercel preview/development builds (`VERCEL_ENV=preview` or `development`) emit `noindex, follow` on every HTML page. Canonicals still identify the production origin; previews publish an empty sitemap and omit its discovery links. Robots permits crawling so Google can see `noindex`. Builds without that Vercel environment flag use production metadata; when deploying a preview outside Vercel, set the flag for the build. No Vercel project settings, production deployment, or Search Console changes are made by this implementation.

## Acceptance and verification

- Every sitemap route responds with static content, a heading, one production canonical, and social metadata. `tests/seo.spec.ts` exercises the built routes over HTTP; its initial RED was the missing `og:image`.
- Home identity JSON is parseable and uses only the verified public profile links. The 404 remains noindex and excluded from the sitemap.
- Build once normally and run `PORTFOLIO_TEST_PORT=4191 npx playwright test tests/seo.spec.ts --project=desktop --reporter=list --output=/tmp/portfolio-seo-tests`.
- Build separately with `VERCEL_ENV=preview npx astro build --outDir ./node_modules/.cache/portfolio-seo-preview`, then run `node scripts/check-preview-seo.mjs ./node_modules/.cache/portfolio-seo-preview`. This checks every HTML page, canonical isolation, and preview sitemap/robots behavior without changing persisted configuration.
- Existing static checks and accessibility tests remain the regression gates. This change adds no client JavaScript or image downloads to rendered page content.

## References

Google Search Central recommends [descriptive titles](https://developers.google.com/search/docs/appearance/title-link), [consistent canonicals and sitemaps](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls), and [WebSite data for site names](https://developers.google.com/search/docs/appearance/site-names). Its [noindex guidance](https://developers.google.com/search/docs/crawling-indexing/block-indexing) requires allowing crawlers to fetch the page. These changes support discovery and interpretation; indexing, ranking, and the displayed search title remain search-engine decisions.
