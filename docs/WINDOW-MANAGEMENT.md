# Desktop window management

Each route opens one reusable app window. The dock includes all main pages and adds opened articles. Closed routes open, minimized routes restore, and already-open routes gain focus. Repeated activation through the dock, navigation or search preserves window placement. Mobile retains Home, search and Recents.

## Move and attach

Drag a title bar to move a window freely across the desktop. Dropping in empty space leaves it floating. Near a workspace edge, an outline previews a half; near a corner, it previews a quarter. Release to snap into that rectangle. Clicking a window raises it above other floating windows. Placement stays within the workspace so titlebar controls remain reachable.

With a title bar focused, Alt with arrow keys moves by 24 pixels; Shift increases the step to 64 pixels. Ctrl + Alt with arrow keys snaps to the corresponding half. Ctrl + Alt + 1, 2, 3, or 4 selects the top-left, top-right, bottom-left, or bottom-right quarter. Ctrl + Alt + Home returns that window to the grid. The toolbar's Tile control returns all windows to adaptive tiling.

Escape, pointer cancellation, losing capture, viewport changes or leaving the page cancels an active gesture. Titlebar buttons remain independent of dragging. Pointer capture keeps the gesture attached to its window outside the titlebar; touch gestures use the same desktop interaction. Phones retain the reading layout.

## Resize and restore

Resize using any edge or corner. Floating windows resize independently with the opposite edge anchored. Resizing a snapped window detaches it into a floating rectangle. For grid windows, interior edges adjust their neighboring grid tracks; an outside workspace boundary stays fixed. Corners adjust whichever adjacent boundaries exist. Tab to the bottom-right grip and use arrows for 24-pixel steps, or Shift with arrows for 64-pixel steps. Escape or pointer cancellation restores the sizes from before the drag.

Minimizing and restoring through the dock preserves placement. Focus view gives a page the workspace and restoring returns its arrangement. Snapped windows follow their chosen workspace region when the viewport changes; floating windows remain bounded. Mobile does not use desktop geometry. Browser history accepts earlier snapshots without placement fields; optional geometry is validated before use. A full reload starts a fresh desktop session.

## Architecture and verification

`src/scripts/shell.ts` owns route windows, geometry, focus, history and gesture lifecycle. `src/styles/global.css` renders the workspace and snap feedback. This uses native browser pointer events and existing progressive enhancement, without a new window framework, runtime dependency or animation loop. Static routes remain usable without JavaScript. Feedback is static under reduced motion.

The [approved specification and test plan](./features/desktop-window-movement.md) define the free-movement contract. `tests/window-movement.spec.ts` covers movement, attachment, keyboard and gesture cancellation, stable focus and restore, resizing and viewport transitions. `tests/window-resize.spec.ts` and existing dock, mobile, navigation and accessibility suites provide integration coverage against built HTML.
