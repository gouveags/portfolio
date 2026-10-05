# Wallpaper controls

The wallpaper controller shows one clickable dot per available photograph. The selected dot is visually distinct and exposes its state with `aria-pressed`. Each button names its photograph and supports normal keyboard focus and Enter/Space activation.

Desktop and mobile use the same photograph list and selection state. Selection, previous/next wraparound, automatic rotation, resizing, reloads, and newly mounted Home controls keep the indicator synchronized. The dots have no enclosing background panel. Existing reduced-motion and pause preferences still apply.

## Verification

`tests/wallpaper-dots.spec.ts` covers direct selection, current state, next/previous wraparound, keyboard activation, reload persistence, automatic rotation, responsive synchronization, and Home controls mounted after navigating from another page. `tests/wallpapers.spec.ts` checks the selected photographs and viewport coverage. Existing accessibility and navigation suites provide regression coverage.

Run the normal type check, production build, static verification, and browser suite described in the [README](../README.md). Visually inspect the controller on all four wallpapers at desktop and phone widths.
