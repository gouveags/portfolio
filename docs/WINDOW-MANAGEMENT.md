# Desktop window management

Each route opens one reusable app window. Desktop keeps all open, non-minimized apps in an adaptive grid rather than limiting the workspace to two windows. Home remains a separate welcome screen. Opening apps from Home restores the existing workspace. Focus shows one window; restoring shows the workspace again. Minimize removes a tile until it is resumed, and close removes the cached window. Browser history restores the visible route set.

Drag a window's bottom-right resize grip to adjust its grid column and row with neighboring tiles. Tab to the labeled resize button and use arrow keys for 24-pixel steps, or Shift with arrows for 64-pixel steps. On the outside edge, the grip adjusts the preceding boundary. The welcome window and a single app can be resized within the workspace. Tiling again resets sizes. Adding or removing tiles recalculates the grid; viewport changes preserve proportional tracks unless they would make controls too small, in which case that axis returns to equal tracks. Window content scrolls inside its tile. Mobile retains its single-page app navigation and hides resize controls.

## Acceptance and verification

The user-requested contract is unlimited unique route windows, automatic fitting, pointer and keyboard resizing, and unchanged mobile navigation. The existing shell remains the owner of route/cache/history state; the layout uses CSS grid tracks without dependencies or persistent layout storage.

`tests/window-resize.spec.ts` exercises more than two windows, all available routes, non-overlap and viewport bounds, focus/close/history restoration, real pointer resize, keyboard resize, welcome resize, and the mobile breakpoint. Initial RED: existing shell exposes only two tiles and has no resize control. Run with `PORTFOLIO_TEST_PORT=4185 npx playwright test tests/window-resize.spec.ts --project=desktop --reporter=list --output=/tmp/portfolio-window-tests`. Existing desktop, mobile and accessibility suites remain integration gates. These browser tests use actual built route HTML, without mocked window or layout behavior.
