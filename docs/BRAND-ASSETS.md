# Brand assets and editorial content

Career, Open source, and Contact use typography and unboxed links within the existing desktop shell. Project status stays in the contribution narrative: recent PostHog work is under review, and the LangGraph proposal is not merged. Official marks identify the projects discussed; they do not imply endorsement or employment.

## Assets

- `public/assets/brands/posthog-light.svg`: the intact light landscape logo rendered by [PostHog’s official logo download page](https://posthog.com/handbook/brand/assets), retrieved 2026-10-05. Its provided white styling, paths, proportions, and wordmark are preserved. The page permits unmodified logos used as secondary identification and prohibits implying endorsement. No hedgehog illustration or mascot is used. The separate `@posthog/brand` package was inspected but is not bundled or copied into this project.
- `public/assets/brands/langchain-light.svg`: the intact light LangChain OSS lockup from [LangChain’s official brand assets](https://www.langchain.com/brand-assets), retrieved 2026-10-05. [Original SVG](https://cdn.prod.website-files.com/65b8cd72835ceeacd4449a53/6a9942640271f297cc0bd30b_LangChain_OSS%20Lockup_light%201-1.svg). The official page approves community content use. Keep the supplied colors, mark/wordmark relationship, proportions, and clear space; do not recolor or add effects.
- Contact’s GitHub, LinkedIn, and X icons use the existing `@phosphor-icons/core` 2.1.1 thin icon assets, under the [Phosphor MIT license](https://github.com/phosphor-icons/core/blob/main/LICENSE). A copy is included at `public/assets/brands/PHOSPHOR-LICENSE.txt`. They link directly to Gabriel’s profiles; they are not site branding. [GitHub’s logo guidance](https://brand.github.com/foundations/logo) explicitly allows profile social links. [LinkedIn’s brand resources](https://brand.linkedin.com/downloads) and [X’s toolkit](https://about.x.com/en/who-we-are/brand-toolkit) remain the brand owners’ references. The icon license does not transfer trademark ownership.

The project wordmarks supply meaningful heading text through image alt attributes. Social icons are decorative inside visibly named links. They are served locally, without remote image requests. Projects without a verified asset use their text name; no substitute logo is invented.

## Layout references

[Frank Chimero’s portfolio](https://frankchimero.com/) and [Guillermo Rauch’s writing index](https://rauchg.com/) informed the restrained hierarchy: names first, supporting text next, links as links. No layout, artwork, or text was copied. Scope is the three content pages; dock, windows, and wallpapers retain their existing behavior.

The focused visual checks use `tests/accessibility.spec.ts` for desktop/mobile screenshots, axe checks, and overflow checks, plus `tests/content.spec.ts` and `tests/career.spec.ts` for filters, deep links, and navigation. All text links in the contribution lists and Contact actions retain at least 44px target height.
