# Portfolio v4 implementation QA

## Visual target

Approved v4 boards: desktop Home, Open source, tiled Projects + article, article reader, navigation guide; mobile Home, Blog, article, Recents, Contact. The desktop boards are 2880 × 1800 (target CSS viewport 1440 × 900 at 2×); mobile boards are 1170 × 2532 (390 × 844 at 3×). Real licensed photographs are used.

## Current gate

Source images were opened and inspected before implementation. Browser-rendered implementation screenshots are not yet available. Local browser testing is blocked by the current task environment: Chromium socket creation is denied; Astro preview cannot enumerate network interfaces; `sites-preview` is unavailable; the supported cloud-browser preview endpoint cannot reach the local server. No access restriction was bypassed.

Build and type checks pass, but they do not establish visual fidelity. The draft PR remains explicitly pending browser/design QA. If the existing Vercel integration generates a preview automatically, compare that rendered preview at the target viewports and complete the interaction tests before updating this gate.

## Fidelity surfaces to verify

- Fonts / typography: locally hosted Inter and JetBrains Mono; reference hierarchy and wrapping
- Spacing / layout: desktop window, dock, tiled columns; separate mobile home and app layouts
- Colors / tokens: true-black surfaces, restrained neutral borders, legible white/gray text
- Image quality: exact real-photo subjects, grayscale treatment, responsive crops, attribution
- Copy / content: existing article preserved; approved Linux inspiration; source-linked work without fabricated claims

## Comparison history

No rendered comparison pass has completed yet. Source-level integration review corrected sidebar markup, filter layouts, TOC spacing, no-JS control visibility, and mobile contact/guide hooks. These are code reviews, not a claimed visual pass.

## Required remaining evidence

Desktop and mobile screenshots, normalized side-by-side reference comparisons, primary navigation/tiling/Recents/search/history tests, reduced-motion checks, console errors, and accessibility results.

final result: blocked
