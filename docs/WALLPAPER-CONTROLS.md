# Wallpaper controls

The wallpaper controller shows one clickable dot per available photograph. The selected dot is visually distinct and exposes its state with `aria-pressed`. Each button names its photograph and supports normal keyboard focus and Enter/Space activation.

Desktop and mobile use the same photograph list and selection state. Selection, previous/next wraparound, automatic rotation, resizing, reloads, and newly mounted Home controls keep the indicator synchronized. The dots have no enclosing background panel. Existing reduced-motion and pause preferences still apply.

Desktop groups the photograph dots above the previous, next, and pause controls on a shared center. Targets are 32 pixels on desktop and 44 pixels on mobile. The grouping follows the distinction between slide pickers and rotation controls in the [WAI carousel pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/); target sizes exceed the [WCAG minimum target size](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html).

Floating wallpaper labels and the desktop note have transparent backgrounds, with text shadows for contrast. The note belongs to the desktop shell: closing or minimizing Welcome, navigating, and using browser history do not hide it. App windows may cover it. Mobile retains its Home welcome and switches to full-screen content when an app opens.

## Verification

`tests/wallpaper-dots.spec.ts` covers direct selection, current state, next/previous wraparound, keyboard activation, reload persistence, automatic rotation, responsive synchronization, and Home controls mounted after navigating from another page. `tests/wallpapers.spec.ts` checks the selected photographs and viewport coverage. Existing accessibility and navigation suites provide regression coverage.

`tests/transparency.spec.ts` checks transparent floating surfaces across all wallpapers and the desktop note's lifecycle.

Run the normal type check, production build, static verification, and browser suite described in the [README](../README.md). Visually inspect the controller on all four wallpapers at desktop and phone widths.
