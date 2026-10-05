/** A local-only clock and calendar, sharing the shell's dialog accessibility. */
export function initializeCalendar(open: (opener: HTMLElement) => void): void {
  const dialog = document.querySelector<HTMLDialogElement>("#calendar");
  if (!dialog) return;
  const calendar = dialog;
  const triggers = Array.from(
    document.querySelectorAll<HTMLButtonElement>("[data-clock-trigger]"),
  );
  const monthTitle = calendar.querySelector<HTMLElement>("#calendar-month")!;
  const days = calendar.querySelector<HTMLTableSectionElement>(
    "[data-calendar-days]",
  )!;
  const weekdays = calendar.querySelector<HTMLElement>(
    "[data-calendar-weekdays]",
  )!;
  const dateLabel = calendar.querySelector<HTMLElement>(
    "[data-calendar-date]",
  )!;
  let now = new Date();
  let viewedMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  let timer: ReturnType<typeof setTimeout> | undefined;
  const monthKey = (date: Date) => `${date.getFullYear()}-${date.getMonth()}`;
  const dayKey = (date: Date) =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  const format = (date: Date, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(undefined, options).format(date);

  // Weekday labels are localized; the week begins Sunday.
  for (let day = 0; day < 7; day++) {
    const date = new Date(2024, 0, 7 + day);
    const cell = document.createElement("th");
    cell.scope = "col";
    cell.textContent = format(date, { weekday: "short" });
    cell.setAttribute("aria-label", format(date, { weekday: "long" }));
    weekdays.append(cell);
  }

  function renderMonth(): void {
    monthTitle.textContent = format(viewedMonth, {
      month: "long",
      year: "numeric",
    });
    const year = viewedMonth.getFullYear();
    const month = viewedMonth.getMonth();
    const offset = new Date(year, month, 1).getDay();
    const count = new Date(year, month + 1, 0).getDate();
    const fragment = document.createDocumentFragment();
    for (
      let position = 0;
      position < Math.ceil((offset + count) / 7) * 7;
      position += 7
    ) {
      const row = document.createElement("tr");
      for (let column = 0; column < 7; column++) {
        const cell = document.createElement("td");
        const day = position + column - offset + 1;
        if (day > 0 && day <= count) {
          const date = new Date(year, month, day);
          const time = document.createElement("time");
          time.dateTime = dayKey(date);
          time.textContent = new Intl.NumberFormat().format(day);
          time.setAttribute("aria-label", format(date, { dateStyle: "full" }));
          if (dayKey(date) === dayKey(now))
            time.setAttribute("aria-current", "date");
          cell.append(time);
        }
        row.append(cell);
      }
      fragment.append(row);
    }
    days.replaceChildren(fragment);
  }

  function refresh(): void {
    clearTimeout(timer);
    const previous = now;
    now = new Date();
    const time = format(now, { hour: "numeric", minute: "2-digit" });
    const fullDate = format(now, { dateStyle: "full" });
    for (const trigger of triggers) {
      const label =
        trigger.querySelector<HTMLTimeElement>("[data-clock-time]")!;
      label.textContent = time;
      label.dateTime = now.toISOString();
      trigger.querySelector<HTMLElement>("[data-clock-date]")!.textContent =
        format(now, { month: "short", day: "numeric", weekday: "short" });
      trigger.setAttribute("aria-label", `Open calendar, ${fullDate}, ${time}`);
    }
    dateLabel.textContent = fullDate;
    if (dayKey(previous) !== dayKey(now)) {
      if (monthKey(viewedMonth) === monthKey(previous))
        viewedMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      renderMonth();
    }
    if (!document.hidden)
      timer = setTimeout(refresh, 60_000 - (Date.now() % 60_000));
  }

  for (const trigger of triggers) {
    trigger.addEventListener("click", () => {
      refresh();
      viewedMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      renderMonth();
      open(trigger);
      for (const button of triggers)
        button.setAttribute("aria-expanded", "true");
    });
  }
  calendar.addEventListener("close", () => {
    for (const button of triggers)
      button.setAttribute("aria-expanded", "false");
  });
  calendar.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const step = event.target.closest<HTMLElement>("[data-calendar-step]");
    if (step) {
      viewedMonth = new Date(
        viewedMonth.getFullYear(),
        viewedMonth.getMonth() + Number(step.dataset.calendarStep),
        1,
      );
      renderMonth();
    }
    if (event.target.closest("[data-calendar-today]")) {
      refresh();
      viewedMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      renderMonth();
    }
  });
  document.addEventListener("visibilitychange", refresh);
  window.addEventListener("pagehide", () => clearTimeout(timer));
  window.addEventListener("pageshow", refresh);
  refresh();
  renderMonth();
}
