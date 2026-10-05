# Local clock and calendar

The left side of the desktop and mobile top bar displays the visitor's device-local time and date. Opening it shows the current month, highlights today, and offers previous month, next month, and Today controls. The calendar has no event integration or date-selection workflow.

The widget uses browser `Date` and `Intl` only. It sends no IP or location request and requires no account, backend, permission prompt, or network service. The site's existing dialog behavior provides focus containment, Escape/outside-click dismissal, and focus return to the opener.

## Acceptance and verification

- Device timezone determines the displayed time, date, current month, and today highlight.
- Clock/date refresh at minute boundaries and after returning to the page.
- Month navigation handles year boundaries, month lengths, and leap days. Today returns to the current local month.
- Both layouts fit narrow screens; the widget remains keyboard accessible and the calendar has a descriptive label.
- `tests/calendar.spec.ts` covers timezone/date rollover, month/year boundaries, leap years, keyboard focus and dismissal, responsive fit, and accessibility. Existing navigation tests cover shared dialog regressions.

Run the normal checks in the [README](../README.md), then inspect the open calendar on desktop and mobile.
