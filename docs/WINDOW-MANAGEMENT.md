# Desktop window management

Each route opens one reusable app window. The dock includes all main pages and adds opened articles. Its horizontal overflow scrolls, and Tab brings links into view. Closed routes open, minimized routes restore, and already-open routes gain focus with a brief static border highlight. Repeated activation through the dock, navigation or search keeps tile order and divider sizes. Mobile retains Home, search and Recents.

Desktop fits open apps in an adaptive grid. Drag a title bar onto another tile to preview its outlined destination and release to insert the window there. The other tiles shift slots; row and column sizes stay unchanged. Focus a title bar and use Alt with arrow keys to move by a slot or row. Drops outside a tile do nothing. Escape, pointer cancellation, losing capture, a viewport change or leaving the page cancels an active gesture.

Resize using any edge or corner. Interior edges adjust their neighboring grid tracks in the pointer's direction; an outside workspace boundary stays fixed. Corners adjust whichever adjacent boundaries exist. The single welcome/app window resizes within the workspace with the opposite edge anchored. Tab to the bottom-right grip and use arrows for 24-pixel steps, or Shift with arrows for 64-pixel steps. Keyboard resizing uses an available interior boundary. Escape or pointer cancellation restores the sizes from before the drag. Pointer capture supports dragging beyond the small handle, and touch-action prevents resize gestures from scrolling content.

When at least three windows are tiled, the active window offers **Read full page**. This uses the existing focus view; **Restore tiled view** returns to the previous tile order and sizes. Tile resets the grid to equal tracks. Opening or closing apps recalculates the grid. Viewport changes preserve proportions unless controls would become too small, in which case that axis returns to equal tracks. Article controls use the article title to distinguish them from the Blog listing.

The browser analogue draws on Hyprland's [shared split resizing](https://wiki.hypr.land/Configuring/Layouts/Dwindle-Layout/) and [drag thresholds and keyboard bindings](https://wiki.hypr.land/Configuring/Basics/Binds/). It stays a small progressively enhanced grid: no floating-window framework, animation loop, extra dependency or stored desktop session. Highlight and snap feedback are static, including with reduced motion.

## Acceptance and verification

`tests/window-resize.spec.ts` covers all available routes, viewport bounds, history, pointer/keyboard resizing and mobile. `tests/window-movement.spec.ts` covers stable repeat activation geometry, snap preview/drop/cancellation, keyboard movement/history, all eight resize directions, cancellation rollback, the expanded dock and app lifecycle, and readable crowded panes with exact geometry restoration. Real built HTML and native browser pointer/keyboard events are used; external data is not mocked.

The pre-implementation RED established that repeat activation reordered tiles, title bars could not move, seven resize directions were missing, and main/article dock entries were absent. Existing desktop, mobile, no-JavaScript and accessibility suites remain integration gates.
