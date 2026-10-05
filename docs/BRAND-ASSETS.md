# Brand assets and editorial content

Home, Career, Open source, Projects, Blog, and Contact use typography and unboxed links within the existing desktop shell. Project status stays in the contribution narrative: recent PostHog work is under review, and the LangGraph proposal is not merged. Official marks identify the projects discussed; they do not imply endorsement or employment.

## Assets

- `public/assets/brands/posthog-light.svg`: the intact light landscape logo rendered by [PostHog’s official logo download page](https://posthog.com/handbook/brand/assets), retrieved 2026-10-05. Its provided white styling, paths, proportions, and wordmark are preserved. The page permits unmodified logos used as secondary identification and prohibits implying endorsement. No hedgehog illustration or mascot is used. The separate `@posthog/brand` package was inspected but is not bundled or copied into this project.
- `public/assets/brands/langchain-light.svg`: the intact light LangChain OSS lockup from [LangChain’s official brand assets](https://www.langchain.com/brand-assets), retrieved 2026-10-05. [Original SVG](https://cdn.prod.website-files.com/65b8cd72835ceeacd4449a53/6a9942640271f297cc0bd30b_LangChain_OSS%20Lockup_light%201-1.svg). The official page approves community content use. Keep the supplied colors, mark/wordmark relationship, proportions, and clear space; do not recolor or add effects.
- Functional navigation and action icons use the existing `@phosphor-icons/core` 2.1.1 thin icon assets under the [Phosphor MIT license](https://github.com/phosphor-icons/core/blob/main/LICENSE). A copy is included at `public/assets/brands/PHOSPHOR-LICENSE.txt`. Social profile links now use written names, not the library’s approximations of brand marks.

Project names use the same heading typography throughout the site. Official wordmarks appear only in explicitly named project links, with empty alt text because the link supplies its accessible name. Contact and Home use written social names rather than approximated brand symbols. Official logo assets are served locally, without remote image requests. Projects without a verified asset use their text name; no substitute logo is invented.

## Layout references

[Frank Chimero’s portfolio](https://frankchimero.com/) and [Guillermo Rauch’s writing index](https://rauchg.com/) informed the restrained hierarchy: names first, supporting text next, links as links. No layout, artwork, or text was copied. The visual audit covers Home, Career, Open source, Projects, Blog, and Contact at desktop and mobile sizes. Invented project initials are removed, Projects and Blog share a readable content width, and filters use one underline treatment. Functional OS window boundaries, mobile reading surfaces, and mobile app navigation tiles remain: their borders communicate interaction or preserve readability over photography. No new brand is invented for projects without verified assets.

The focused visual checks use `tests/accessibility.spec.ts` for desktop/mobile screenshots, axe checks, and overflow checks, plus `tests/content.spec.ts` and `tests/career.spec.ts` for filters, deep links, and navigation. All text links in the contribution lists and Contact actions retain at least 44px target height.
