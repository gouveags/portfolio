# Desktop window movement

## Approved behavior

The user explicitly requested grabbing a window, moving it freely across the desktop, and attaching it somewhere as in an OS. This supersedes the previous tile-reorder-only interaction. Routine implementation details remain within that authorization.

- A desktop titlebar drag follows the pointer and can leave a window floating in empty workspace.
- Visible targets preview edge/half and corner/quadrant placement; release inside a target snaps to that rectangle.
- Focusing raises a window without resetting its geometry. Minimize/dock restore and focus-view restore retain its placement.
- All eight resize edges/corners remain available. Windows stay reachable inside the workspace after movement, resizing and viewport changes.
- Escape, pointer cancellation and lost capture cancel an active gesture safely. Titlebar buttons continue to work independently.
- Keyboard users can move and attach windows; mobile retains its existing reading and Recents flow.
- No new dependencies, public content changes, personal photos or persistent desktop storage.

## Architecture and boundaries

`src/scripts/shell.ts` owns same-origin route windows, their lifecycle, navigation/history, geometry and pointer gestures. `src/styles/global.css` renders workspace, windows and feedback. Extend those existing boundaries and retain progressive static HTML. Existing history snapshots must remain valid when added geometry fields are absent. Treat optional snapshot geometry as untrusted numeric input; constrain finite values to the workspace. Desktop geometry must not leak into mobile layout.

## Pre-implementation test plan

Extend `tests/window-movement.spec.ts` against built HTML, using native browser pointer/keyboard events. Observe RED for actual movement into empty space before implementation. Cover edge and corner preview/drop; Escape and pointer cancellation rollback; pointer capture; titlebar controls; keyboard movement/snap; repeated focus without rearrangement; minimize/dock restore; focus/restore; all resize edges; desktop viewport shrink and mobile transition. Reuse the existing resize, dock, desktop, mobile, navigation, no-JavaScript and accessibility suites for integration regressions.

E2E disposition: **add/update** in this repository's existing Playwright suite. This is a standalone static portfolio; no MOVEcenter service or separate platform repository participates. Required final gates: types, build, static asset/link checks, full Playwright suite, independent fresh review, hosted CI and published-preview inspection.
