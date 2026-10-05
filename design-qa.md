# Portfolio implementation QA history

## Latest verification

Use [PR #6 checks](https://github.com/gouveags/portfolio/pull/6/checks) and its description for the exact current head, full-suite result and remaining limitations. Reports below name the revision they inspected; an earlier pass does not certify later changes.

Current CI publishes separate `portfolio-desktop-screenshots`, `portfolio-mobile-screenshots` and `portfolio-personal-photo-screenshots` artifacts containing rendered PNGs. The browser report retains traces, while failure-context text is also published separately when needed. Live cloud-browser inspection remains blocked by an access denial; this evidence comes from CI Chromium, not a hosted-browser or screen-reader certification.

## Personal photographs and writing: `97fe050`

The five approved photographs are published at `/about/#personal`, with three metadata-stripped WebP sizes per image. All twelve gallery/chapter/viewer screenshots from [run 37385759332](https://github.com/gouveags/portfolio/actions/runs/37385759332) were visually inspected at desktop and mobile sizes. No P0–P2 photo-layout issue was found: compositions stay uncropped, captions remain readable, and the full portrait viewer keeps its title, Close control, caption and native image link on screen. All fourteen personal-photo interaction/no-JavaScript cases passed, including repeated opening, focus restoration, failed-image recovery and browser history.

The three approved essays are source-linked and disclose AI-assisted writing. The expanded Linux essay retains its existing URL and section anchors; the original historical article remains byte-for-byte unchanged. Current reading times are computed, not editorial estimates. The supplied résumé and all fifteen published personal-photo variants are hash-checked.

Mobile route review also found the Spa footer’s native Wallpaper/Pause buttons losing their inherited text shadow over bright seats. The follow-on repair explicitly inherits and strengthens the text halo, retaining transparent controls rather than adding a panel. A regression checks each footer action’s computed shadow.

This writing run passed 211 tests with 54 intentional viewport skips and five failures. Two assertions expected superseded LangGraph wording. Two gesture fixtures assumed room below Home that the longer introduction now occupied; the actual drag/resize results matched workspace clamping. The article-flow test also exposed that tiled desktop readers had no visible contents control. Follow-on verification keeps exact geometry assertions with explicit gesture room and checks a compact Contents menu in tiled/focused readers. The exact current result remains in the linked PR checks, rather than being inferred from this earlier run.

## Window and editorial pass: `e0867fe`

The latest work adds floating windows, half/quadrant snapping, eight resize directions, and the site-wide typography and header cleanup. Cloud type checking, static build, internal links, asset references, and the exact supplied résumé pass. Independent source review found and fixed Home focus restoration, hidden-window geometry clamping, and the single remaining tile's grid width.

The exact-head [verification at `e0867fe`](https://github.com/gouveags/portfolio/actions/runs/37372437747) passed 180 browser tests with 54 intentional opposite-viewport skips, after GitHub's runner incident delayed execution. Independent review of 21 desktop renders found no P0–P2 issue. Mobile route, calendar, Recents, and wallpaper review found one P2: Spa's search icon was too faint over its white sky at 320/390/500px. The follow-up uses the same dark mobile control treatment as the other bright photographs and adds an explicit regression assertion.

The exact-head result and captures for that pass are retained in its linked run; newer screenshots are in the separate artifacts listed above. Live cloud-browser inspection remains blocked by an access denial. Rendered review uses CI screenshots and automated interaction evidence; it is not a live hosted-browser or screen-reader certification. The older acceptance report below applies only to its named revision; it is not current-scope approval.

## Historical v4 implementation report

## Result

Passed for the implemented v1 at product revision `6261b2b9e5162566be9b049569de910ef3d65c49`.

The approved black OS direction is implemented as a real desktop workspace and a separate phone layout. No actionable P0/P1/P2 findings remain in the tested scope. This is a visual and functional acceptance result, not a claim of pixel-identical fonts or a screen-reader certification.

## Visual targets and evidence

Source truth: the approved v4 boards `01-desktop-home.png` through `10-mobile-contact.png`, including open source, tiled windows, reader, guide, Home, Blog, Recents and Contact.

- Desktop source: 2880 × 1800 pixels, normalized to 1440 × 900 CSS pixels
- Mobile source: 1170 × 2532 pixels, normalized to 390 × 844 CSS pixels
- Final browser-rendered desktop: 1440 × 900 pixels at DPR 1
- Final browser-rendered mobile: 1024 × 2216 pixels for a 390 × 844 CSS viewport at Pixel 7 DPR 2.625, normalized to the same 390 × 844 comparison size; raster rounding is recorded rather than treated as layout drift
- Additional live cloud-browser checks: 1180/1181 × 757 desktop and 500 × 757 narrow responsive layout

[Exact-head CI run](https://github.com/gouveags/portfolio/actions/runs/37265526029) and [downloadable screenshot/report artifact](https://github.com/gouveags/portfolio/actions/runs/37265526029/artifacts/11326262974).

Implementation screenshot paths inside the artifact:

- Desktop Home: `test-results/screenshots-capture-visual-evidence--desktop/desktop--.png`
- Desktop article: `test-results/screenshots-capture-visual-evidence-blog-why-this-desktop--desktop/desktop--blog-why-this-desktop-.png`
- Mobile Home: `test-results/screenshots-capture-visual-evidence--mobile/mobile--.png`
- Mobile Recents: `test-results/screenshots-capture-desktop-tiling-or-phone-recents-mobile/mobile-recents.png`
- Desktop Guide: `test-results/accessibility-accessible-server-route-and-screenshot-guide--desktop/-guide-.png`

Full-view source and implementation images were placed together for comparison, with matching viewport/density normalization. Focused comparisons inspected the article intro and reading measure, Guide layout, and mobile footer. Final Recents footer evidence explicitly shows Back, Home and Recents together.

## Required fidelity surfaces

- **Typography:** self-hosted Inter and JetBrains Mono preserve the sans/monospace hierarchy. Balanced headings, source-scale work rows, and a 600px article prose measure address initial drift. Font-family and minor line-wrap differences from the design image remain acceptable refinements.
- **Spacing and layout:** desktop bar, quiet welcome window, dock, single/tiled reading, and compact Guide match the intended hierarchy. Mobile has a real app grid, app pages, scrollable reader and horizontal Recents cards. Persistent controls are visible at the tested sizes.
- **Color:** true-black windows and pages, restrained gray borders and labels, white primary text, and grayscale photographs follow the selected direction.
- **Images:** real licensed Porsche, Ferrari, Eau Rouge and Theatro photographs are preserved as optimized WebPs. Responsive crops and image decoding were verified. Credits, source/license links, adaptation notes and embedded attribution are included.
- **Copy:** source-linked projects and merged contributions are retained; the original article is unchanged and labeled historical. The approved Linux-origin note replaces draft-preview labels. Proposed, unwritten article topics were not published. The existing public email remains available.

## Comparison and repair history

1. Source-level review fixed duplicate article IDs, an interrupted-navigation race, and motion without a no-JS pause option.
2. First rendered pass found the mobile Recents background leaking article text, a sparse reading-preview card, and an extra intro heading. These were corrected and recaptured.
3. The next pass tightened article reading width, added the reader breadcrumb, aligned work-archive row rhythm, and confirmed that the sidebar is intentionally hidden only in Focus/tiled states.
4. Matched-viewport evidence identified an oversized Guide window. The Guide is now a compact 810px desktop window; all six shortcut rows and the note fit, with secondary explanation in a native disclosure.
5. Early test screenshots were taken before paint settled. Capture now requires route readiness, fonts, relevant image decoding and two rendering frames. Fresh captures confirm the mobile footer, painted wallpaper and final Guide at the exact target viewports.

## Interaction and automated checks

The exact-head workflow passed `npm run verify`:

- Type check: zero errors, warnings or hints
- Build: 11 static HTML pages plus sitemap
- Static validation: 327 internal links/fragments and 91 asset references; original résumé bytes unchanged
- Browser suite: 79 passed, 11 intentionally skipped opposite-viewport cases
- Axe checks across desktop/mobile routes and launcher
- Real navigation, Back/Forward, repeated/interrupted navigation, filters and fragments, focus/minimize/close, Home controls, Recents scroll preservation and modal-local navigation
- Search no-result state, arrow/Enter selection, Escape, Tab focus containment, opt-in shortcuts and input-field exclusions
- No-JS route access, stationary no-JS wallpaper, reduced motion and copy links
- No uncaught application JavaScript exceptions; live cloud-browser console noise was limited to its injected extension

The production dependency audit reported zero vulnerabilities. Runtime JavaScript is approximately 8.4KB gzip. There is no database, auth, backend runtime or external font request.

## Limits and P3 follow-up

- Minor typography/crop differences and production-content substitutions are intentional or non-blocking
- No physical-device or screen-reader audit is claimed; mobile evidence uses Chromium emulation plus live narrow-window interaction
- GitHub Actions artifacts have their configured retention window; four selected screenshots were also saved as persistent deliverables
- The PR remains draft. No merge or production deployment was performed
- Commits use the verified personal noreply identity but are unsigned; no signing key or credential was created

final result: passed
