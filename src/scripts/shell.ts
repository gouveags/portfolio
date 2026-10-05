import { initializeCalendar } from "./calendar";
import wallpaperData from "../data/wallpapers.json";

/** The HTML remains the app: every route works before this enhancement runs. */
type PageKind = "home" | "page" | "article";
type AppWindow = {
  path: string;
  node: HTMLElement;
  title: string;
  documentTitle: string;
  excerpt: string;
  kind: PageKind;
  minimized: boolean;
  scrollTop: number;
};
type ShellState = {
  portfolioOS: true;
  version: 1;
  path: string;
  visible: string[];
  focused: boolean;
  homeHidden?: boolean;
  index: number;
  columns?: number[];
  rows?: number[];
};
type NavigateOptions = {
  history?: "push" | "replace" | "pop";
  snapshot?: ShellState;
  remove?: string;
  minimize?: string;
  focus?: boolean;
  keepDialog?: boolean;
};
type Wallpaper = {
  id: string;
  title: string;
  photographer: string;
  src: string;
  mobileSrc?: string;
  source: string;
  license: string;
  licenseUrl: string;
  desktopPosition?: string;
  mobilePosition?: string;
  credit?: string;
};

const storage = {
  get(key: string): string | null {
    try {
      return localStorage.getItem(`portfolio:${key}`);
    } catch {
      return null;
    }
  },
  set(key: string, value: string): void {
    try {
      localStorage.setItem(`portfolio:${key}`, value);
    } catch {
      /* Private browsing can disable storage. */
    }
  },
};
let shortcutsEnabled = storage.get("shortcuts") === "true";
function syncShortcuts(root: ParentNode = document): void {
  root
    .querySelectorAll<HTMLInputElement>("[data-shortcuts]")
    .forEach((checkbox) => {
      checkbox.checked = shortcutsEnabled;
    });
}

const desktop = matchMedia("(min-width: 800px)");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const workspace = document.querySelector<HTMLElement>("#workspace");
const announcement = document.querySelector<HTMLElement>("#announcement");
let announcementTimer: ReturnType<typeof setTimeout> | undefined;

function announce(message: string): void {
  if (!announcement) return;
  clearTimeout(announcementTimer);
  announcement.textContent = "";
  announcementTimer = setTimeout(() => {
    announcement.textContent = message;
  }, 40);
}

function routePath(path: string): string {
  return path === "/" ? "/" : `${path.replace(/\/+$/, "")}/`;
}

function isShellState(value: unknown): value is ShellState {
  if (!value || typeof value !== "object") return false;
  const state = value as Partial<ShellState>;
  return (
    state.portfolioOS === true &&
    state.version === 1 &&
    typeof state.path === "string" &&
    Array.isArray(state.visible) &&
    state.visible.every((path) => typeof path === "string") &&
    typeof state.focused === "boolean" &&
    (state.homeHidden === undefined || typeof state.homeHidden === "boolean") &&
    typeof state.index === "number"
  );
}

function initializeShell(host: HTMLElement): void {
  const initialNode = host.querySelector<HTMLElement>(".app-window");
  if (!initialNode) return;

  const windows = new Map<string, AppWindow>();
  const recentPaths: string[] = [];
  let activePath = routePath(initialNode.dataset.path || location.pathname);
  const initialState = isShellState(history.state) ? history.state : undefined;
  let visiblePaths = activePath === "/" ? [] : [activePath];
  let focusMode = activePath === "/" && Boolean(initialState?.focused);
  let homeHidden = initialState?.homeHidden ?? false;
  let historyIndex = initialState?.index ?? 0;
  let navigationSequence = 0;
  let pendingNavigation: AbortController | undefined;
  let nativeHashNavigation = false;

  let layoutKey = "";
  let tilePaths: string[] = [];
  let columns: number[] = [];
  let rows: number[] = [];
  let savedTiling:
    { paths: string; columns: number[]; rows: number[] } | undefined;
  let cancelGesture: (() => void) | undefined;
  const highlightTimers = new WeakMap<
    HTMLElement,
    ReturnType<typeof setTimeout>
  >();

  function highlight(node: HTMLElement): void {
    clearTimeout(highlightTimers.get(node));
    node.classList.add("is-highlighted");
    highlightTimers.set(
      node,
      setTimeout(() => node.classList.remove("is-highlighted"), 900),
    );
  }

  function moveWindow(path: string, destination: number): void {
    const origin = visiblePaths.indexOf(path);
    if (
      origin < 0 ||
      destination < 0 ||
      destination >= visiblePaths.length ||
      origin === destination
    )
      return;
    const savedColumns = [...columns],
      savedRows = [...rows];
    saveHistory("replace", location.href);
    visiblePaths.splice(origin, 1);
    visiblePaths.splice(destination, 0, path);
    activePath = path;
    render();
    columns = savedColumns;
    rows = savedRows;
    applyTracks();
    saveHistory("push", path);
    announce(`${windows.get(path)?.title} moved to tile ${destination + 1}`);
  }

  function syncDock(): void {
    const dock = document.querySelector<HTMLElement>(".dock");
    if (!dock) return;
    dock
      .querySelectorAll<HTMLAnchorElement>("[data-window-link]")
      .forEach((link) => {
        if (!windows.has(routePath(new URL(link.href).pathname))) link.remove();
      });
    for (const entry of windows.values()) {
      if (
        entry.kind !== "article" ||
        Array.from(dock.querySelectorAll<HTMLAnchorElement>("a")).some(
          (link) => routePath(new URL(link.href).pathname) === entry.path,
        )
      )
        continue;
      const link = document.createElement("a");
      link.href = entry.path;
      link.dataset.appLink = "";
      link.dataset.windowLink = "";
      const icon = entry.node.querySelector(".window-title .icon");
      if (icon) link.append(icon.cloneNode(true));
      const label = document.createElement("span");
      label.textContent = entry.title;
      link.append(label, document.createElement("i"));
      link.title = entry.title;
      dock.append(link);
    }
    dock.querySelectorAll<HTMLAnchorElement>("a").forEach((link) => {
      const entry = windows.get(routePath(new URL(link.href).pathname));
      link.dataset.windowState = !entry
        ? "closed"
        : entry.minimized
          ? "minimized"
          : "open";
    });
  }

  function applyTracks(): void {
    host.style.gridTemplateColumns = columns
      .map((value) => `minmax(0, ${value}fr)`)
      .join(" ");
    host.style.gridTemplateRows = rows
      .map((value) => `minmax(0, ${value}fr)`)
      .join(" ");
  }

  function layoutWindows(visible: string[]): void {
    const key = `${desktop.matches}:${host.dataset.layout}:${visible.join(",")}`;
    if (key === layoutKey) return;
    if (columns.length)
      savedTiling = {
        paths: tilePaths.join(","),
        columns: [...columns],
        rows: [...rows],
      };
    layoutKey = key;
    tilePaths = visible;
    host.style.removeProperty("grid-template-columns");
    host.style.removeProperty("grid-template-rows");
    windows.forEach(({ node }) => {
      node.style.removeProperty("width");
      node.style.removeProperty("height");
      for (const property of [
        "margin-left",
        "margin-top",
        "max-width",
        "max-height",
      ])
        node.style.removeProperty(property);
    });
    columns = [];
    rows = [];
    if (!desktop.matches || visible.length < 2) return;
    const count = Math.ceil(Math.sqrt(visible.length));
    columns =
      savedTiling?.paths === visible.join(",")
        ? [...savedTiling.columns]
        : Array(count).fill(1);
    rows =
      savedTiling?.paths === visible.join(",")
        ? [...savedTiling.rows]
        : Array(Math.ceil(visible.length / count)).fill(1);
    applyTracks();
  }

  function resizeWindow(
    node: HTMLElement,
    dx: number,
    dy: number,
    edge = "se",
  ): void {
    if (!desktop.matches || node.hidden) return;
    if (tilePaths.length < 2) {
      const bounds = node.getBoundingClientRect();
      const area = host.getBoundingClientRect();
      const left = parseFloat(node.style.marginLeft) || 0;
      const top = parseFloat(node.style.marginTop) || 0;
      let nextLeft = left,
        nextTop = top;
      let width = bounds.width,
        height = bounds.height;
      if (edge.includes("w")) {
        nextLeft = Math.max(0, Math.min(left + width - 240, left + dx));
        width += left - nextLeft;
      } else if (edge.includes("e"))
        width = Math.max(
          Math.min(240, area.width),
          Math.min(area.width - left, width + dx),
        );
      if (edge.includes("n")) {
        nextTop = Math.max(0, Math.min(top + height - 120, top + dy));
        height += top - nextTop;
      } else if (edge.includes("s"))
        height = Math.max(
          Math.min(120, area.height),
          Math.min(area.height - top, height + dy),
        );
      node.style.marginLeft = `${nextLeft}px`;
      node.style.marginTop = `${nextTop}px`;
      node.style.maxWidth = `calc(100% - ${nextLeft}px)`;
      node.style.maxHeight = `calc(100% - ${nextTop}px)`;
      node.style.width = `${width}px`;
      node.style.height = `${height}px`;
      return;
    }
    const index = tilePaths.indexOf(node.dataset.path || "");
    if (index < 0) return;
    const area = host.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(host).gap) || 0;
    function adjust(
      tracks: number[],
      current: number,
      delta: number,
      extent: number,
      minimumPixels: number,
      side: number,
    ): void {
      if (tracks.length < 2 || !delta) return;
      const neighbor = current + side;
      if (neighbor < 0 || neighbor >= tracks.length) return;
      const total = tracks.reduce((sum, value) => sum + value, 0);
      const pixels = Math.max(1, extent - gap * (tracks.length - 1));
      const minimum = Math.min(
        (minimumPixels / pixels) * total,
        total / tracks.length,
      );
      const change = Math.max(
        minimum - tracks[current]!,
        Math.min(tracks[neighbor]! - minimum, (delta / pixels) * total),
      );
      tracks[current]! += change;
      tracks[neighbor]! -= change;
    }
    if (edge.includes("e") || edge.includes("w"))
      adjust(
        columns,
        index % columns.length,
        edge.includes("w") ? -dx : dx,
        area.width,
        160,
        edge.includes("w") ? -1 : 1,
      );
    if (edge.includes("n") || edge.includes("s"))
      adjust(
        rows,
        Math.floor(index / columns.length),
        edge.includes("n") ? -dy : dy,
        area.height,
        100,
        edge.includes("n") ? -1 : 1,
      );
    applyTracks();
  }

  function register(
    node: HTMLElement,
    path: string,
    sourceTitle?: string,
  ): AppWindow {
    const kind =
      node.dataset.kind === "home" || path === "/"
        ? "home"
        : node.dataset.kind === "article"
          ? "article"
          : "page";
    const articleTitle =
      kind === "article"
        ? node
            .querySelector(".article-header h1, .article-body h1, h1")
            ?.textContent?.trim()
        : undefined;
    const title =
      articleTitle ||
      node.dataset.title ||
      node.querySelector(".window-title")?.textContent?.trim() ||
      "Portfolio";
    const entry: AppWindow = {
      path,
      node,
      title,
      kind,
      documentTitle:
        node.dataset.documentTitle ||
        sourceTitle ||
        `${title} | Gabriel Gouvêa`,
      excerpt:
        (kind === "article"
          ? node
              .querySelector(".article-content p")
              ?.textContent?.trim()
              .slice(0, 320)
          : undefined) ||
        node.dataset.excerpt ||
        node
          .querySelector(
            ".page-intro, .page-description, .article-deck, .reader-content p, p",
          )
          ?.textContent?.trim()
          .slice(0, 180) ||
        "Return to this open page.",
      minimized: false,
      scrollTop: 0,
    };
    node.dataset.path = path;
    node.dataset.kind = kind;
    syncShortcuts(node);
    node
      .querySelectorAll<HTMLElement>(
        '[data-filter-target][aria-pressed="true"]',
      )
      .forEach((button) => applyFilter(button, false));
    for (const action of ["minimize", "close"]) {
      const control = node.querySelector<HTMLButtonElement>(
        `[data-action="${action}"]`,
      );
      if (control)
        control.setAttribute(
          "aria-label",
          `${action === "close" ? "Close" : "Minimize"} ${title}`,
        );
    }
    const read = document.createElement("button");
    read.type = "button";
    read.className = "window-reading";
    read.dataset.action = "read-page";
    read.textContent = "Read full page";
    read.hidden = true;
    node.querySelector(".window-titlebar")?.after(read);
    const edges = ["se", "e", "s", "w", "n", "ne", "nw", "sw"];
    for (const edge of edges) {
      const resize = document.createElement("button");
      resize.type = "button";
      resize.className = "window-resize";
      resize.dataset.resizeEdge = edge;
      resize.tabIndex = edge === "se" ? 0 : -1;
      resize.setAttribute(
        "aria-label",
        edge === "se"
          ? `Resize ${title}`
          : `${edge.toUpperCase()} resize edge for ${title}`,
      );
      resize.title =
        "Drag an edge to resize. Arrow keys resize; Shift takes larger steps.";
      resize.addEventListener("keydown", (event) => {
        const step = event.shiftKey ? 64 : 24;
        const directions: Record<string, [number, number]> = {
          ArrowLeft: [-step, 0],
          ArrowRight: [step, 0],
          ArrowUp: [0, -step],
          ArrowDown: [0, step],
        };
        const delta = directions[event.key];
        if (!delta) return;
        event.preventDefault();
        // Keyboard resizing uses the available interior boundary on an outer tile.
        const index = tilePaths.indexOf(path);
        const keyboardEdge =
          tilePaths.length < 2
            ? "se"
            : `${Math.floor(index / columns.length) < rows.length - 1 ? "s" : "n"}${index % columns.length < columns.length - 1 ? "e" : "w"}`;
        resizeWindow(node, ...delta, keyboardEdge);
        saveHistory("replace", location.href);
      });
      resize.addEventListener("pointerdown", (event) => {
        if (event.button !== 0 || !desktop.matches) return;
        event.preventDefault();
        event.stopPropagation();
        cancelGesture?.();
        const savedColumns = [...columns],
          savedRows = [...rows];
        const savedStyle = node.getAttribute("style");
        let previous = { x: event.clientX, y: event.clientY };
        const finish = (rollback: boolean) => {
          resize.removeEventListener("pointermove", move);
          resize.removeEventListener("pointerup", up);
          resize.removeEventListener("pointercancel", cancel);
          resize.removeEventListener("lostpointercapture", cancel);
          cancelGesture = undefined;
          if (rollback) {
            columns = savedColumns;
            rows = savedRows;
            if (savedStyle === null) node.removeAttribute("style");
            else node.setAttribute("style", savedStyle);
            if (columns.length) applyTracks();
          } else saveHistory("replace", location.href);
          if (resize.hasPointerCapture(event.pointerId))
            resize.releasePointerCapture(event.pointerId);
        };
        const move = (pointer: PointerEvent) => {
          resizeWindow(
            node,
            pointer.clientX - previous.x,
            pointer.clientY - previous.y,
            edge,
          );
          previous = { x: pointer.clientX, y: pointer.clientY };
        };
        const up = () => finish(false);
        const cancel = () => finish(true);
        cancelGesture = cancel;
        resize.addEventListener("pointermove", move);
        resize.addEventListener("pointerup", up);
        resize.addEventListener("pointercancel", cancel);
        resize.addEventListener("lostpointercapture", cancel);
        resize.setPointerCapture(event.pointerId);
      });
      node.append(resize);
    }
    const titlebar = node.querySelector<HTMLElement>(".window-titlebar");
    if (titlebar) {
      titlebar.tabIndex = 0;
      titlebar.setAttribute(
        "aria-label",
        `Move ${title}. Drag onto another tile, or use Alt and arrow keys.`,
      );
      titlebar.addEventListener("keydown", (event) => {
        if (
          event.target !== titlebar ||
          !event.altKey ||
          !desktop.matches ||
          focusMode ||
          tilePaths.length < 2
        )
          return;
        const offsets: Record<string, number> = {
          ArrowLeft: -1,
          ArrowRight: 1,
          ArrowUp: -columns.length,
          ArrowDown: columns.length,
        };
        const offset = offsets[event.key];
        if (offset === undefined) return;
        event.preventDefault();
        moveWindow(path, visiblePaths.indexOf(path) + offset);
      });
      titlebar.addEventListener("pointerdown", (event) => {
        if (
          event.button !== 0 ||
          !desktop.matches ||
          focusMode ||
          tilePaths.length < 2 ||
          (event.target instanceof Element && event.target.closest("button, a"))
        )
          return;
        event.preventDefault();
        event.stopPropagation();
        cancelGesture?.();
        const startViewport = { width: innerWidth, height: innerHeight };
        let destination: HTMLElement | undefined;
        let moved = false;
        const finish = (commit: boolean) => {
          commit =
            commit &&
            innerWidth === startViewport.width &&
            innerHeight === startViewport.height;
          titlebar.removeEventListener("pointermove", move);
          titlebar.removeEventListener("pointerup", up);
          titlebar.removeEventListener("pointercancel", cancel);
          titlebar.removeEventListener("lostpointercapture", cancel);
          const target = destination?.dataset.path;
          destination?.classList.remove("is-snap-target");
          node.classList.remove("is-moving");
          cancelGesture = undefined;
          if (titlebar.hasPointerCapture(event.pointerId))
            titlebar.releasePointerCapture(event.pointerId);
          if (commit && target && moved)
            moveWindow(path, visiblePaths.indexOf(target));
          else if (commit && !moved) selectWindow(path);
        };
        const move = (pointer: PointerEvent) => {
          if (
            !moved &&
            Math.hypot(
              pointer.clientX - event.clientX,
              pointer.clientY - event.clientY,
            ) < 6
          )
            return;
          moved = true;
          node.classList.add("is-moving");
          destination?.classList.remove("is-snap-target");
          destination = Array.from(windows.values()).find((entry) => {
            if (entry.node.hidden || entry.path === path) return false;
            const rect = entry.node.getBoundingClientRect();
            return (
              pointer.clientX >= rect.left &&
              pointer.clientX <= rect.right &&
              pointer.clientY >= rect.top &&
              pointer.clientY <= rect.bottom
            );
          })?.node;
          destination?.classList.add("is-snap-target");
        };
        const up = () => finish(true);
        const cancel = () => finish(false);
        cancelGesture = cancel;
        titlebar.addEventListener("pointermove", move);
        titlebar.addEventListener("pointerup", up);
        titlebar.addEventListener("pointercancel", cancel);
        titlebar.addEventListener("lostpointercapture", cancel);
        titlebar.setPointerCapture(event.pointerId);
      });
    }
    windows.set(path, entry);
    document.dispatchEvent(new Event("portfolio:window-mounted"));
    return entry;
  }

  register(initialNode, activePath, document.title);
  if (activePath !== "/") recentPaths.push(activePath);
  document.documentElement.classList.add("enhanced", "is-enhanced");
  document.body.classList.add("is-enhanced");

  function markRecent(path: string): void {
    if (path === "/") return;
    const index = recentPaths.indexOf(path);
    if (index >= 0) recentPaths.splice(index, 1);
    recentPaths.push(path);
  }

  function currentState(): ShellState {
    return {
      portfolioOS: true,
      version: 1,
      path: activePath,
      visible: [...visiblePaths],
      focused: focusMode,
      homeHidden,
      index: historyIndex,
      columns: [...columns],
      rows: [...rows],
    };
  }

  function saveHistory(mode: "push" | "replace", url: string): void {
    if (mode === "push") historyIndex += 1;
    const previous =
      history.state && typeof history.state === "object" ? history.state : {};
    history[mode === "push" ? "pushState" : "replaceState"](
      { ...previous, ...currentState() },
      "",
      url,
    );
  }

  function saveScroll(): void {
    for (const entry of windows.values()) {
      if (entry.node.hidden) continue;
      const scroller = entry.node.querySelector<HTMLElement>(".window-scroll");
      if (scroller) entry.scrollTop = scroller.scrollTop;
    }
  }

  function render(): void {
    const active = windows.get(activePath);
    if (!active) return;
    const hideHome = active.kind === "home" && desktop.matches && homeHidden;
    const focused =
      focusMode && !hideHome && (active.kind !== "home" || desktop.matches);
    const visible =
      activePath === "/"
        ? hideHome
          ? []
          : ["/"]
        : desktop.matches && !focusMode
          ? [...visiblePaths]
          : [activePath];
    if (!hideHome && !visible.includes(activePath)) visible.push(activePath);
    for (const entry of windows.values()) {
      const shown = visible.includes(entry.path);
      entry.node.hidden = !shown;
      entry.node.classList.toggle("is-visible", shown);
      entry.node.classList.toggle("is-active", entry.path === activePath);
      entry.node.classList.toggle(
        "is-focused",
        focused && entry.path === activePath,
      );
      entry.node.setAttribute("aria-label", entry.title);
      const read =
        entry.node.querySelector<HTMLButtonElement>(".window-reading");
      if (read)
        read.hidden =
          !desktop.matches ||
          focused ||
          visible.length < 3 ||
          entry.path !== activePath;
      entry.node
        .querySelectorAll<HTMLButtonElement>('[data-action="focus"]')
        .forEach((button) => {
          button.setAttribute(
            "aria-pressed",
            String(focused && entry.path === activePath),
          );
          if (button.classList.contains("window-reading")) return;
          button.setAttribute(
            "aria-label",
            focused && entry.path === activePath
              ? entry.kind === "home"
                ? "Restore welcome window"
                : "Restore tiled view"
              : `Focus ${entry.title}`,
          );
          button.title =
            focused && entry.path === activePath
              ? entry.kind === "home"
                ? "Restore welcome window"
                : "Restore tiled view"
              : "Focus window";
        });
      if (shown) {
        entry.node.style.order = String(visible.indexOf(entry.path));
        const scroller =
          entry.node.querySelector<HTMLElement>(".window-scroll");
        if (scroller) scroller.scrollTop = entry.scrollTop;
      }
    }
    host.dataset.layout =
      active.kind === "home"
        ? focused
          ? "single"
          : "home"
        : visible.length > 1
          ? "tiled"
          : "single";
    layoutWindows(visible);
    host.dataset.homeHidden = String(hideHome);
    document.body.dataset.pageKind = active.kind;
    document.body.dataset.activePath = activePath;
    document.body.dataset.homeHidden = String(hideHome);
    document.body.classList.toggle("focus-mode", focused);
    document.title = active.documentTitle;
    const articleLabel = document.getElementById("article-label");
    if (articleLabel) articleLabel.textContent = active.title;
    const description = active.node.dataset.description || active.excerpt;
    document
      .querySelector<HTMLMetaElement>('meta[name="description"]')
      ?.setAttribute("content", description);
    document
      .querySelector<HTMLMetaElement>('meta[property="og:title"]')
      ?.setAttribute("content", active.documentTitle);
    document
      .querySelector<HTMLMetaElement>('meta[property="og:description"]')
      ?.setAttribute("content", description);
    document
      .querySelector<HTMLMetaElement>('meta[property="og:type"]')
      ?.setAttribute(
        "content",
        active.kind === "article" ? "article" : "website",
      );
    const canonical = document.querySelector<HTMLLinkElement>(
      'link[rel="canonical"]',
    );
    if (canonical) {
      canonical.href = new URL(activePath, canonical.href).href;
      document
        .querySelector<HTMLMetaElement>('meta[property="og:url"]')
        ?.setAttribute("content", canonical.href);
    }
    const routeLabel = document.querySelector<HTMLElement>("#route-label");
    if (routeLabel)
      routeLabel.textContent =
        activePath === "/" ? "home" : active.node.dataset.title || active.title;
    const mobileTitle = document.querySelector<HTMLElement>("#mobile-title");
    if (mobileTitle)
      mobileTitle.textContent =
        active.kind === "home"
          ? "Gabriel Gouvêa"
          : active.node.dataset.title || active.title;
    syncDock();
    document
      .querySelectorAll<HTMLAnchorElement>("a[data-app-link]")
      .forEach((link) => {
        const path = routePath(new URL(link.href, location.href).pathname);
        const exact = path === activePath;
        const selected =
          exact || (path === "/blog/" && active.kind === "article");
        link.classList.toggle("is-active", selected);
        if (selected)
          link.setAttribute("aria-current", exact ? "page" : "true");
        else link.removeAttribute("aria-current");
      });
    document
      .querySelectorAll<HTMLButtonElement>('[data-action="back"]')
      .forEach((button) => {
        button.disabled = activePath === "/" && historyIndex === 0;
      });
    document
      .querySelectorAll<HTMLElement>('[data-action="tile"]')
      .forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(host.dataset.layout === "tiled"),
        );
      });
    renderRecents();
  }

  async function loadWindow(
    path: string,
    signal: AbortSignal,
  ): Promise<AppWindow> {
    const cached = windows.get(path);
    if (cached) return cached;
    const response = await fetch(path, {
      signal,
      headers: { Accept: "text/html" },
    });
    if (
      !response.ok ||
      !response.headers.get("content-type")?.includes("text/html")
    )
      throw new Error("Route unavailable");
    const html = await response.text();
    if (signal.aborted)
      throw new DOMException("Navigation cancelled", "AbortError");
    const page = new DOMParser().parseFromString(html, "text/html");
    const node = page.querySelector<HTMLElement>("#workspace .app-window");
    if (!node) throw new Error("Route has no application window");
    const actualPath = node.dataset.path ? routePath(node.dataset.path) : path;
    if (actualPath !== path) throw new Error("Route resolved to another page");
    // Scripts in fetched content never run; interactions are delegated below.
    node.querySelectorAll("script").forEach((script) => script.remove());
    const adopted = document.adoptNode(node);
    adopted.hidden = true;
    host.append(adopted);
    return register(adopted, path, page.title);
  }

  function focusContent(entry: AppWindow): void {
    const heading =
      Array.from(entry.node.querySelectorAll<HTMLElement>("h1")).find(
        (element) => element.getClientRects().length > 0,
      ) ||
      entry.node.querySelector<HTMLElement>(".window-scroll") ||
      entry.node;
    if (!heading.hasAttribute("tabindex")) heading.tabIndex = -1;
    heading.focus({ preventScroll: true });
  }

  async function navigate(
    destination: string,
    options: NavigateOptions = {},
  ): Promise<void> {
    cancelGesture?.();
    const url = new URL(destination, location.href);
    if (url.origin !== location.origin) {
      location.assign(url.href);
      return;
    }
    const path = routePath(url.pathname);
    const sequence = ++navigationSequence;
    pendingNavigation?.abort();
    const controller = new AbortController();
    pendingNavigation = controller;
    host.setAttribute("aria-busy", "true");
    if (!options.keepDialog) closeDialogs(false);
    try {
      const alreadyOpen = windows.has(path) && !windows.get(path)!.minimized;
      const target = await loadWindow(path, controller.signal);
      if (options.snapshot) {
        const peers = [...new Set(options.snapshot.visible)].filter(
          (peer) => peer !== path && peer !== "/",
        );
        await Promise.all(
          peers.map((peer) => loadWindow(peer, controller.signal)),
        );
      }
      if (sequence !== navigationSequence || controller.signal.aborted) return;
      saveScroll();
      const previousPath = activePath;
      if (options.remove) {
        const entry = windows.get(options.remove);
        entry?.node.remove();
        windows.delete(options.remove);
        const recentIndex = recentPaths.indexOf(options.remove);
        if (recentIndex >= 0) recentPaths.splice(recentIndex, 1);
      }
      if (options.minimize) {
        const entry = windows.get(options.minimize);
        if (entry) entry.minimized = true;
      }
      visiblePaths = visiblePaths.filter(
        (item) => item !== options.remove && item !== options.minimize,
      );
      activePath = path;
      target.minimized = false;
      markRecent(path);
      if (options.snapshot) {
        historyIndex = options.snapshot.index;
        focusMode = options.snapshot.focused;
        homeHidden = options.snapshot.homeHidden ?? false;
        visiblePaths = options.snapshot.visible.filter(
          (item) => windows.has(item) && item !== "/",
        );
        for (const visible of visiblePaths) {
          const entry = windows.get(visible);
          if (entry) entry.minimized = false;
        }
        if (path !== "/" && !visiblePaths.includes(path))
          visiblePaths.push(path);
        visiblePaths.forEach(markRecent);
        markRecent(path);
      } else if (path !== "/") {
        if (!visiblePaths.includes(path)) visiblePaths.push(path);
      }
      if (options.focus !== undefined) focusMode = options.focus;
      if (path === "/" && !options.snapshot) {
        focusMode = false;
        // A Home link restores the welcome window; dismissing another app
        // keeps the desktop's previous welcome-window visibility.
        if (!options.remove && !options.minimize) homeHidden = false;
      }
      render();
      if (options.snapshot) {
        const validTracks = (
          value: unknown,
          length: number,
        ): value is number[] =>
          Array.isArray(value) &&
          value.length === length &&
          value.every(
            (item) =>
              typeof item === "number" && Number.isFinite(item) && item > 0,
          );
        if (
          validTracks(options.snapshot.columns, columns.length) &&
          validTracks(options.snapshot.rows, rows.length)
        ) {
          columns = [...options.snapshot.columns];
          rows = [...options.snapshot.rows];
          if (columns.length) applyTracks();
        }
      } else if (alreadyOpen) highlight(target.node);
      const mode = options.history || "push";
      if (mode !== "pop") {
        const requestedURL = `${url.pathname}${url.search}${url.hash}`;
        const unchanged =
          requestedURL ===
          `${location.pathname}${location.search}${location.hash}`;
        saveHistory(
          mode === "push" && unchanged ? "replace" : mode,
          requestedURL,
        );
      }
      if (!options.keepDialog) {
        if (target.node.hidden) focusHomeLink();
        else focusContent(target);
      }
      if (url.hash) revealFragment(target, url.hash, true);
      if (previousPath !== path) announce(`${target.title} opened`);
    } catch (error) {
      if (
        sequence !== navigationSequence ||
        controller.signal.aborted ||
        (error instanceof DOMException && error.name === "AbortError")
      )
        return;
      // Keep the current view intact while the browser takes over an unavailable route.
      location.assign(url.href);
    } finally {
      if (sequence === navigationSequence) {
        host.removeAttribute("aria-busy");
        pendingNavigation = undefined;
      }
    }
  }

  function cancelPendingNavigation(): void {
    ++navigationSequence;
    pendingNavigation?.abort();
    pendingNavigation = undefined;
    host.removeAttribute("aria-busy");
  }

  function selectWindow(path: string): void {
    if (activePath === path || !windows.has(path)) return;
    cancelPendingNavigation();
    saveScroll();
    activePath = path;
    markRecent(path);
    render();
    saveHistory("push", path);
  }

  function focusHomeLink(): void {
    document
      .querySelector<HTMLAnchorElement>('.desktop-bar a[href="/"]')
      ?.focus({ preventScroll: true });
  }

  function dismissWindow(
    path: string,
    remove: boolean,
    keepDialog = false,
  ): void {
    if (!windows.has(path)) return;
    if (path === "/") {
      if (!desktop.matches) return;
      cancelPendingNavigation();
      saveScroll();
      homeHidden = true;
      focusMode = false;
      render();
      saveHistory("replace", location.href);
      focusHomeLink();
      announce(
        remove
          ? "Welcome window closed. Choose Home to reopen it."
          : "Welcome window minimized. Choose Home to restore it.",
      );
      return;
    }
    cancelPendingNavigation();
    if (path === activePath) {
      const nextPath =
        [...visiblePaths]
          .reverse()
          .find(
            (item) =>
              item !== path &&
              windows.has(item) &&
              !windows.get(item)?.minimized,
          ) || "/";
      void navigate(nextPath, {
        [remove ? "remove" : "minimize"]: path,
        keepDialog,
      });
    } else {
      saveScroll();
      const entry = windows.get(path)!;
      if (remove) {
        entry.node.remove();
        windows.delete(path);
        const index = recentPaths.indexOf(path);
        if (index >= 0) recentPaths.splice(index, 1);
      } else entry.minimized = true;
      visiblePaths = visiblePaths.filter((item) => item !== path);
      render();
      saveHistory("replace", location.href);
    }
    announce(
      remove ? "Window closed" : "Window minimized. Find it in Recent apps.",
    );
  }

  function renderRecents(): void {
    const list = document.querySelector<HTMLElement>("#recent-list");
    if (!list) return;
    const focusedClosePath =
      document.activeElement instanceof HTMLElement
        ? document.activeElement.dataset.closePath
        : undefined;
    const fragment = document.createDocumentFragment();
    const entries = [...recentPaths]
      .reverse()
      .map((path) => windows.get(path))
      .filter((entry): entry is AppWindow => Boolean(entry));
    if (entries.length === 0) {
      const empty = document.createElement("p");
      empty.className = "recent-empty";
      empty.textContent =
        "No recent apps yet. Open an app from Home and it will appear here.";
      fragment.append(empty);
    }
    for (const entry of entries) {
      const card = document.createElement("article");
      card.className = "recent-card";
      card.dataset.recentPath = entry.path;
      const meta = document.createElement("p");
      meta.className = "recent-meta";
      const appName = document.createElement("span");
      appName.textContent = entry.node.dataset.title || entry.title;
      const appIcon = entry.node.querySelector(".window-title .icon");
      if (appIcon) meta.append(appIcon.cloneNode(true));
      meta.append(appName);
      if (entry.minimized) {
        const status = document.createElement("span");
        status.className = "tag recent-status";
        status.textContent = "Minimized";
        meta.append(status);
      }
      const title = document.createElement("h3");
      title.className = "recent-title";
      title.textContent = entry.title;
      const excerpt = document.createElement("p");
      excerpt.className = "recent-excerpt";
      excerpt.textContent = entry.excerpt;
      const actions = document.createElement("div");
      actions.className = "recent-actions";
      const resume = document.createElement("a");
      resume.href = entry.path;
      resume.dataset.resumePath = entry.path;
      resume.className = "recent-resume";
      resume.textContent =
        entry.kind === "article" ? "Continue reading" : "Open app";
      resume.setAttribute(
        "aria-label",
        `${resume.textContent}: ${entry.title}`,
      );
      const close = document.createElement("button");
      close.type = "button";
      close.className = "recent-close";
      close.dataset.closePath = entry.path;
      const closeIcon = entry.node.querySelector('[data-action="close"] .icon');
      if (closeIcon) close.append(closeIcon.cloneNode(true));
      else close.textContent = "Close";
      close.title = `Close ${entry.title}`;
      close.setAttribute("aria-label", `Close ${entry.title}`);
      const cardHeader = document.createElement("div");
      cardHeader.className = "recent-header";
      cardHeader.append(meta, close);
      actions.append(resume);
      card.append(cardHeader, title, excerpt);
      if (entry.kind === "article") {
        const position = document.createElement("p");
        position.className = "recent-position";
        position.textContent = "Your place in this article is kept.";
        card.append(position);
      }
      card.append(actions);
      fragment.append(card);
    }
    list.replaceChildren(fragment);
    if (focusedClosePath) {
      const recents = document.querySelector<HTMLDialogElement>("#recents");
      if (recents?.open)
        (
          list.querySelector<HTMLElement>("[data-close-path]") ||
          recents.querySelector<HTMLElement>('[data-action="close-dialog"]')
        )?.focus();
    }
  }

  function applyFilter(button: HTMLElement, announceResult = true): void {
    const windowNode = button.closest<HTMLElement>(".app-window");
    const target = button.dataset.filterTarget;
    if (!windowNode || !target) return;
    const group = Array.from(
      windowNode.querySelectorAll<HTMLElement>("[id], [data-filter-group]"),
    ).find((node) => node.id === target || node.dataset.filterGroup === target);
    if (!group) return;
    const value = (button.dataset.filterValue || "all").toLowerCase();
    let count = 0;
    group.querySelectorAll<HTMLElement>("[data-category]").forEach((item) => {
      const categories = (item.dataset.category || "").toLowerCase();
      const matched =
        value === "all" ||
        value === "*" ||
        categories === value ||
        categories.split(/[\s,|]+/).includes(value);
      item.hidden = !matched;
      if (matched) count += 1;
    });
    group.dataset.activeFilter = value;
    windowNode
      .querySelectorAll<HTMLElement>("[data-filter-target]")
      .forEach((filter) => {
        if (filter.dataset.filterTarget !== target) return;
        const pressed =
          (filter.dataset.filterValue || "all").toLowerCase() === value;
        filter.setAttribute("aria-pressed", String(pressed));
        filter.classList.toggle("is-active", pressed);
      });
    windowNode
      .querySelectorAll<HTMLElement>("[data-filter-empty]")
      .forEach((empty) => {
        if (empty.dataset.filterEmpty === target) empty.hidden = count !== 0;
      });
    if (announceResult)
      announce(`${count} ${count === 1 ? "item" : "items"} shown`);
  }

  function revealFragment(
    entry: AppWindow,
    hash: string,
    scroll: boolean,
  ): void {
    if (!hash) return;
    let id = hash.slice(1);
    try {
      id = decodeURIComponent(id);
    } catch {
      /* Treat malformed escaped fragments as literal IDs. */
    }
    const anchor = Array.from(
      entry.node.querySelectorAll<HTMLElement>("[id]"),
    ).find((element) => element.id === id);
    if (!anchor) return;
    const category =
      anchor.closest<HTMLElement>("[data-category]")?.dataset.category;
    if (category) {
      const filter = Array.from(
        entry.node.querySelectorAll<HTMLElement>("[data-filter-target]"),
      ).find((button) => button.dataset.filterValue === category);
      if (filter && filter.getAttribute("aria-pressed") !== "true")
        applyFilter(filter, false);
    }
    if (scroll) anchor.scrollIntoView({ block: "start", behavior: "instant" });
  }

  host.addEventListener(
    "scroll",
    (event) => {
      if (
        !(event.target instanceof HTMLElement) ||
        !event.target.matches(".window-scroll")
      )
        return;
      const path =
        event.target.closest<HTMLElement>(".app-window")?.dataset.path;
      const entry = path ? windows.get(path) : undefined;
      if (entry) entry.scrollTop = event.target.scrollTop;
    },
    true,
  );

  host.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || !(event.target instanceof Element)) return;
    // Window controls choose their own transition without an extra history entry.
    if (
      event.target.closest(
        "[data-action], [data-close-path], .window-titlebar, .window-resize",
      )
    )
      return;
    const node = event.target.closest<HTMLElement>(".app-window");
    if (node && !node.hidden && node.dataset.path)
      selectWindow(node.dataset.path);
  });

  host.addEventListener("focusin", (event) => {
    if (
      !(event.target instanceof Element) ||
      event.target.closest("[data-action]")
    )
      return;
    const node = event.target.closest<HTMLElement>(".app-window");
    if (
      node &&
      !node.hidden &&
      node.dataset.path &&
      node.dataset.path !== activePath
    )
      selectWindow(node.dataset.path);
  });

  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const recentCard = event.target.closest<HTMLElement>(
      ".recent-card[data-recent-path]",
    );
    if (recentCard?.dataset.recentPath && !event.target.closest("a, button")) {
      event.preventDefault();
      void navigate(recentCard.dataset.recentPath);
      return;
    }
    const filter = event.target.closest<HTMLElement>("[data-filter-target]");
    if (filter) {
      event.preventDefault();
      applyFilter(filter);
      return;
    }
    const close = event.target.closest<HTMLElement>("[data-close-path]");
    if (close?.dataset.closePath) {
      event.preventDefault();
      dismissWindow(close.dataset.closePath, true, true);
      return;
    }
    const control = event.target.closest<HTMLElement>("[data-action]");
    const action = control?.dataset.action;
    const node = control?.closest<HTMLElement>(".app-window");
    const path = node?.dataset.path || activePath;
    if (action === "copy-link" && node && path !== activePath)
      selectWindow(path);
    if (action === "minimize" || action === "close") {
      event.preventDefault();
      dismissWindow(path, action === "close");
      return;
    }
    if (action === "focus" || action === "read-page") {
      event.preventDefault();
      cancelPendingNavigation();
      saveScroll();
      const wasActive = activePath === path;
      activePath = path;
      markRecent(path);
      if (path === "/") homeHidden = false;
      focusMode = wasActive ? !focusMode : true;
      render();
      if (action === "read-page") focusContent(windows.get(path)!);
      saveHistory(wasActive ? "replace" : "push", path);
      return;
    }
    if (action === "tile") {
      event.preventDefault();
      cancelPendingNavigation();
      saveScroll();
      visiblePaths = recentPaths.filter((item) => windows.has(item));
      if (!visiblePaths.length) {
        announce("Open an app to start a workspace.");
        return;
      }
      const previousPath = activePath;
      if (activePath === "/")
        activePath = visiblePaths[visiblePaths.length - 1]!;
      if (!visiblePaths.includes(activePath))
        visiblePaths = [...visiblePaths, activePath];
      visiblePaths.forEach((item) => {
        const entry = windows.get(item);
        if (entry) entry.minimized = false;
      });
      focusMode = false;
      columns = [];
      rows = [];
      savedTiling = undefined;
      layoutKey = "";
      render();
      saveHistory(
        previousPath === activePath ? "replace" : "push",
        previousPath === activePath ? location.href : activePath,
      );
      if (previousPath !== activePath) focusContent(windows.get(activePath)!);
      return;
    }
    if (action === "back") {
      event.preventDefault();
      if (historyIndex > 0) history.back();
      else void navigate("/");
      return;
    }
    if (action === "recents") {
      event.preventDefault();
      renderRecents();
      openDialog("recents", control);
      return;
    }
    const link = event.target.closest<HTMLAnchorElement>("a[href]");
    if (
      !link ||
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    const href = link.getAttribute("href") || "";
    if (
      !href ||
      link.hasAttribute("download") ||
      (link.target && link.target !== "_self") ||
      link.rel.split(/\s+/).includes("external")
    )
      return;
    const url = new URL(link.href, location.href);
    if (url.origin !== location.origin || !/^https?:$/.test(url.protocol))
      return;
    if (
      /\.[a-z\d]{1,8}$/i.test(url.pathname) &&
      !/\.html?$/i.test(url.pathname)
    )
      return;
    if (/^\/(?:_astro|assets|images|fonts|downloads)\//.test(url.pathname))
      return;
    if (url.pathname === location.pathname && url.hash) {
      cancelPendingNavigation();
      const entry = windows.get(activePath);
      if (entry) revealFragment(entry, url.hash, false);
      nativeHashNavigation = url.hash !== location.hash;
      return;
    }
    event.preventDefault();
    void navigate(url.href);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && cancelGesture) {
      event.preventDefault();
      cancelGesture();
    }
  });
  window.addEventListener("resize", () => cancelGesture?.());
  window.addEventListener("blur", () => cancelGesture?.());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) cancelGesture?.();
  });
  window.addEventListener("popstate", (event: PopStateEvent) => {
    // Some browsers also emit popstate for a newly followed native fragment link.
    if (nativeHashNavigation && location.hash) {
      nativeHashNavigation = false;
      historyIndex += 1;
      saveHistory("replace", location.href);
      const entry = windows.get(activePath);
      if (entry) revealFragment(entry, location.hash, true);
      return;
    }
    nativeHashNavigation = false;
    const snapshot = isShellState(event.state) ? event.state : undefined;
    void navigate(location.href, { history: "pop", snapshot });
  });
  desktop.addEventListener("change", () => {
    saveScroll();
    render();
  });

  // Keep title-bar controls reachable when a previously resized track shrinks.
  new ResizeObserver(() => {
    if (!desktop.matches) return;
    if (tilePaths.length < 2) {
      windows.forEach(({ node }) => {
        for (const property of [
          "margin-left",
          "margin-top",
          "max-width",
          "max-height",
        ])
          node.style.removeProperty(property);
      });
      return;
    }
    const bounds = host.getBoundingClientRect();
    const gap = parseFloat(getComputedStyle(host).gap) || 0;
    function fit(tracks: number[], extent: number, minimum: number): number[] {
      const pixels = Math.max(1, extent - gap * (tracks.length - 1));
      const total = tracks.reduce((sum, value) => sum + value, 0);
      const limit = Math.min(minimum, pixels / tracks.length);
      return tracks.some((value) => (value / total) * pixels < limit - 1)
        ? tracks.map(() => 1)
        : tracks;
    }
    columns = fit(columns, bounds.width, 160);
    rows = fit(rows, bounds.height, 100);
    applyTracks();
  }).observe(host);

  // Old inbound section links continue to work after the move to real pages.
  function legacyRoute(): string | undefined {
    if (location.pathname !== "/" || !location.hash) return;
    const aliases: Record<string, string> = {
      home: "/",
      top: "/",
      about: "/about/",
      profile: "/about/",
      blog: "/blog/",
      writing: "/blog/",
      oss: "/open-source/",
      "open-source": "/open-source/",
      projects: "/projects/",
      experience: "/about/#experience",
      work: "/about/#experience",
      contact: "/contact/",
    };
    return aliases[location.hash.slice(1).toLowerCase()];
  }
  window.addEventListener("hashchange", () => {
    const legacy = legacyRoute();
    if (legacy) void navigate(legacy, { history: "replace" });
    else {
      if (nativeHashNavigation) {
        nativeHashNavigation = false;
        historyIndex += 1;
        saveHistory("replace", location.href);
      }
      const entry = windows.get(activePath);
      if (entry && routePath(location.pathname) === activePath)
        revealFragment(entry, location.hash, true);
    }
  });
  render();
  saveHistory("replace", location.href);
  const legacy = legacyRoute();
  if (legacy) void navigate(legacy, { history: "replace" });
  else if (location.hash)
    requestAnimationFrame(() => {
      const entry = windows.get(activePath);
      if (entry) revealFragment(entry, location.hash, true);
    });
}

const dialogOpeners = new WeakMap<HTMLDialogElement, HTMLElement>();
const skipFocusRestoration = new WeakSet<HTMLDialogElement>();
function openDialog(id: string, opener?: HTMLElement | null): void {
  const dialog = document.querySelector<HTMLDialogElement>(`#${id}`);
  if (!dialog || dialog.open) return;
  closeDialogs(false);
  if (opener) dialogOpeners.set(dialog, opener);
  else if (document.activeElement instanceof HTMLElement)
    dialogOpeners.set(dialog, document.activeElement);
  dialog.showModal();
  if (id === "launcher") {
    const input = dialog.querySelector<HTMLInputElement>("#search-input");
    if (input) {
      input.value = "";
      input.setAttribute("aria-expanded", "true");
      input.dispatchEvent(new Event("input"));
      input.focus();
    }
  }
}

function closeDialogs(restoreFocus = true): void {
  document
    .querySelectorAll<HTMLDialogElement>("dialog[open]")
    .forEach((dialog) => {
      if (!restoreFocus) skipFocusRestoration.add(dialog);
      dialog.close();
    });
}

function initializeDialogs(): void {
  document.querySelectorAll<HTMLDialogElement>("dialog").forEach((dialog) => {
    dialog.addEventListener(
      "keydown",
      (event) => {
        if (
          !dialog.open ||
          event.isComposing ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey
        )
          return;
        if (event.key === "Escape") {
          // A search input otherwise consumes the first Escape to clear itself.
          event.preventDefault();
          event.stopPropagation();
          dialog.close();
          return;
        }
        if (event.key !== "Tab") return;
        const tabbables = Array.from(
          dialog.querySelectorAll<HTMLElement>(
            'a[href], area[href], button, input:not([type="hidden"]), select, textarea, summary, iframe, [tabindex], [contenteditable]:not([contenteditable="false"])',
          ),
        )
          .filter((element) => {
            const visibility = getComputedStyle(element).visibility;
            return (
              element.tabIndex >= 0 &&
              !element.matches(':disabled, [aria-disabled="true"]') &&
              !element.closest('[hidden], [inert], [aria-hidden="true"]') &&
              element.getClientRects().length > 0 &&
              visibility !== "hidden" &&
              visibility !== "collapse"
            );
          })
          .sort((a, b) => {
            // Match native ordering if a future dialog uses positive tabindex.
            const first = a.tabIndex || Number.MAX_SAFE_INTEGER;
            const second = b.tabIndex || Number.MAX_SAFE_INTEGER;
            return first - second;
          });
        // Keep every Tab inside the modal instead of briefly visiting browser UI.
        event.preventDefault();
        event.stopPropagation();
        if (!tabbables.length) {
          dialog.focus({ preventScroll: true });
          return;
        }
        const current = tabbables.indexOf(
          document.activeElement as HTMLElement,
        );
        const next =
          current < 0
            ? event.shiftKey
              ? tabbables.length - 1
              : 0
            : (current + (event.shiftKey ? -1 : 1) + tabbables.length) %
              tabbables.length;
        tabbables[next]!.focus();
      },
      true,
    );
    dialog.addEventListener("close", () => {
      dialog
        .querySelector("#search-input")
        ?.setAttribute("aria-expanded", "false");
      if (skipFocusRestoration.delete(dialog)) return;
      const opener = dialogOpeners.get(dialog);
      if (opener?.isConnected && !opener.closest("[hidden]"))
        opener.focus({ preventScroll: true });
    });
    dialog.addEventListener("click", (event) => {
      if (event.target !== dialog) return;
      const bounds = dialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      )
        dialog.close();
    });
  });
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const button = event.target.closest<HTMLElement>("[data-action]");
    if (!button) return;
    const action = button.dataset.action;
    if (action === "search") {
      event.preventDefault();
      openDialog("launcher", button);
    }
    if (action === "shortcuts" || action === "help") {
      event.preventDefault();
      document.querySelector<HTMLAnchorElement>('a[href="/guide/"]')?.click();
    }
    if (action === "close-dialog") {
      event.preventDefault();
      button.closest<HTMLDialogElement>("dialog")?.close();
    }
  });

  const input = document.querySelector<HTMLInputElement>("#search-input");
  const results = document.querySelector<HTMLElement>("#search-results");
  const empty = document.querySelector<HTMLElement>("#search-empty");
  if (input && results) {
    const links = Array.from(
      results.querySelectorAll<HTMLAnchorElement>("a[data-search]"),
    );
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", "search-results");
    input.setAttribute("aria-expanded", "false");
    results.setAttribute("role", "listbox");
    links.forEach((link, index) => {
      link.id = `search-option-${index}`;
      link.setAttribute("role", "option");
      link.setAttribute("aria-selected", "false");
    });
    let selected = -1;
    const available = () => links.filter((link) => !link.hidden);
    function highlight(index: number, focus = false): void {
      const visible = available();
      selected = visible.length
        ? ((index % visible.length) + visible.length) % visible.length
        : -1;
      links.forEach((link) => {
        link.classList.remove("is-selected");
        link.setAttribute("aria-selected", "false");
      });
      const link = visible[selected];
      if (link) {
        link.classList.add("is-selected");
        link.setAttribute("aria-selected", "true");
        input!.setAttribute("aria-activedescendant", link.id);
        if (focus) link.focus();
        link.scrollIntoView({ block: "nearest" });
      }
    }
    input.addEventListener("input", () => {
      const query = input.value
        .trim()
        .toLocaleLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");
      const words = query.split(/\s+/).filter(Boolean);
      links.forEach((link) => {
        const text = `${link.dataset.search || ""} ${link.textContent || ""}`
          .toLocaleLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "");
        link.hidden = !words.every((word) => text.includes(word));
      });
      selected = -1;
      input.removeAttribute("aria-activedescendant");
      links.forEach((link) => {
        link.classList.remove("is-selected");
        link.setAttribute("aria-selected", "false");
      });
      if (empty) empty.hidden = available().length !== 0;
      results.setAttribute(
        "aria-label",
        `${available().length} search results`,
      );
    });
    document
      .querySelector("#launcher")
      ?.addEventListener("keydown", (event) => {
        const keyboard = event as KeyboardEvent;
        if (keyboard.altKey || keyboard.ctrlKey || keyboard.metaKey) return;
        if (keyboard.key === "ArrowDown" || keyboard.key === "ArrowUp") {
          keyboard.preventDefault();
          const focusedIndex = available().findIndex(
            (link) => link === document.activeElement,
          );
          const previous = focusedIndex >= 0 ? focusedIndex : selected;
          const next =
            previous === -1 && keyboard.key === "ArrowUp"
              ? available().length - 1
              : previous + (keyboard.key === "ArrowDown" ? 1 : -1);
          highlight(next, document.activeElement !== input);
        } else if (
          keyboard.key === "Enter" &&
          document.activeElement === input
        ) {
          const link = available()[Math.max(0, selected)];
          if (link) {
            keyboard.preventDefault();
            link.click();
          }
        }
      });
  }

  syncShortcuts();
  document.addEventListener("change", (event) => {
    if (
      !(event.target instanceof HTMLInputElement) ||
      !event.target.matches("[data-shortcuts]")
    )
      return;
    shortcutsEnabled = event.target.checked;
    storage.set("shortcuts", String(shortcutsEnabled));
    syncShortcuts();
    announce(
      shortcutsEnabled
        ? "Keyboard shortcuts enabled"
        : "Keyboard shortcuts disabled",
    );
  });
  document.addEventListener("keydown", (event) => {
    if (
      !shortcutsEnabled ||
      event.defaultPrevented ||
      event.repeat ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey ||
      event.isComposing
    )
      return;
    const target = event.target;
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        target.closest(
          'input, textarea, select, [contenteditable="true"], [role="textbox"]',
        ))
    )
      return;
    if (document.querySelector("dialog[open]")) return;
    if (event.key === "/") {
      event.preventDefault();
      openDialog("launcher");
    }
    if (event.key === "?") {
      const guide =
        document.querySelector<HTMLAnchorElement>('a[href="/guide/"]');
      if (guide) {
        event.preventDefault();
        guide.click();
      }
    }
  });
}

function initializeWallpapers(): void {
  const wallpapers = wallpaperData as Wallpaper[];
  const picture =
    document.querySelector<HTMLPictureElement>("#wallpaper-picture");
  const img = picture?.querySelector("img");
  if (!picture || !img || !wallpapers.length) return;
  const storedId = storage.get("wallpaper");
  let selectionIsExplicit = wallpapers.some((item) => item.id === storedId);
  let index = selectionIsExplicit
    ? wallpapers.findIndex((item) => item.id === storedId)
    : Math.max(
        0,
        wallpapers.findIndex(
          (item) => item.id === (desktop.matches ? "porsche" : "theatro"),
        ),
      );
  let paused = storage.get("wallpaper-paused") === "true";
  let cycleTimer: ReturnType<typeof setTimeout> | undefined;

  function updatePauseControls(): void {
    document
      .querySelectorAll<HTMLButtonElement>('[data-action="wallpaper-select"]')
      .forEach((button) => {
        button.setAttribute(
          "aria-pressed",
          String(button.dataset.wallpaperId === wallpapers[index]!.id),
        );
      });
    const motionPaused = paused || reducedMotion.matches || document.hidden;
    document.body.classList.toggle("motion-paused", motionPaused);
    picture!.classList.toggle("motion-paused", motionPaused);
    document
      .querySelectorAll<HTMLElement>('[data-action="wallpaper-pause"]')
      .forEach((button) => {
        button.setAttribute("aria-pressed", String(paused));
        const label = paused
          ? "Play wallpaper motion"
          : "Pause wallpaper motion";
        button.setAttribute("aria-label", label);
        button.title = reducedMotion.matches
          ? `${label} (reduced motion is respected)`
          : label;
        button.dataset.paused = String(paused);
        const text = button.querySelector(
          "[data-pause-label], span:not(.icon)",
        );
        if (text) text.textContent = paused ? "Play" : "Pause";
        else if (button.children.length === 0)
          button.textContent = paused ? "Play" : "Pause";
        button
          .querySelectorAll<HTMLElement>("[data-motion-icon]")
          .forEach((icon) => {
            icon.hidden =
              icon.dataset.motionIcon !== (paused ? "play" : "pause");
          });
      });
    clearTimeout(cycleTimer);
    if (!motionPaused)
      cycleTimer = setTimeout(() => {
        index = (index + 1) % wallpapers.length;
        showWallpaper();
      }, 32_000);
  }

  function showWallpaper(userInitiated = false): void {
    const photo = wallpapers[index]!;
    const source = picture!.querySelector("source");
    if (source) {
      source.media = "(max-width: 799px)";
      source.srcset = photo.mobileSrc || photo.src;
    }
    // Assign only the selected photo; no hidden image carousel or eager preloads.
    img!.src = photo.src;
    img!.style.objectPosition =
      (desktop.matches ? photo.desktopPosition : photo.mobilePosition) ||
      "center";
    picture!.dataset.wallpaper = photo.id;
    const title = document.getElementById("wallpaper-title");
    if (title) title.textContent = photo.title;
    const photographer = document.getElementById("wallpaper-photographer");
    if (photographer) {
      photographer.textContent = photo.photographer;
      if (photographer instanceof HTMLAnchorElement)
        photographer.href = photo.source;
    }
    const license = document.getElementById("wallpaper-license");
    if (license) {
      license.textContent = photo.license;
      if (license instanceof HTMLAnchorElement) license.href = photo.licenseUrl;
    }
    const credit = document.getElementById("wallpaper-credit");
    if (credit)
      credit.textContent =
        photo.credit || `${photo.photographer} · ${photo.license}`;
    const count = document.getElementById("wallpaper-count");
    if (count)
      count.textContent = `${String(index + 1).padStart(2, "0")} / ${String(wallpapers.length).padStart(2, "0")}`;
    if (userInitiated) {
      selectionIsExplicit = true;
      storage.set("wallpaper", photo.id);
      announce(`Wallpaper: ${photo.title}. Photo by ${photo.photographer}.`);
    }
    updatePauseControls();
  }
  document.addEventListener("click", (event) => {
    if (!(event.target instanceof Element)) return;
    const action =
      event.target.closest<HTMLElement>("[data-action]")?.dataset.action;
    if (action === "wallpaper-select") {
      const button = event.target.closest<HTMLElement>("[data-wallpaper-id]");
      const selectedIndex = wallpapers.findIndex(
        (photo) => photo.id === button?.dataset.wallpaperId,
      );
      if (selectedIndex < 0) return;
      event.preventDefault();
      index = selectedIndex;
      showWallpaper(true);
    }
    if (action === "wallpaper-next" || action === "wallpaper-previous") {
      event.preventDefault();
      index =
        (index + (action === "wallpaper-next" ? 1 : -1) + wallpapers.length) %
        wallpapers.length;
      showWallpaper(true);
    }
    if (action === "wallpaper-pause") {
      event.preventDefault();
      paused = !paused;
      storage.set("wallpaper-paused", String(paused));
      updatePauseControls();
      announce(
        paused
          ? "Wallpaper motion paused"
          : reducedMotion.matches
            ? "Your reduced-motion preference keeps wallpaper motion off"
            : "Wallpaper motion resumed",
      );
    }
  });
  desktop.addEventListener("change", () => {
    if (!selectionIsExplicit)
      index = Math.max(
        0,
        wallpapers.findIndex(
          (item) => item.id === (desktop.matches ? "porsche" : "theatro"),
        ),
      );
    showWallpaper();
  });
  document.addEventListener("portfolio:window-mounted", updatePauseControls);
  reducedMotion.addEventListener("change", updatePauseControls);
  document.addEventListener("visibilitychange", updatePauseControls);
  window.addEventListener("pagehide", () => clearTimeout(cycleTimer));
  window.addEventListener("pageshow", updatePauseControls);
  showWallpaper();
}

initializeDialogs();
initializeCalendar((opener) => openDialog("calendar", opener));
if (workspace) initializeShell(workspace);
initializeWallpapers();

document.addEventListener("click", async (event) => {
  if (!(event.target instanceof Element)) return;
  const button = event.target.closest<HTMLElement>('[data-action="copy-link"]');
  if (!button) return;
  event.preventDefault();
  try {
    if (!navigator.clipboard?.writeText)
      throw new Error("Clipboard unavailable");
    const url = button.dataset.url
      ? new URL(button.dataset.url, location.href).href
      : location.href;
    await navigator.clipboard.writeText(url);
    announce("Link copied");
  } catch {
    announce(
      "Could not copy automatically. You can copy this page’s link from your browser’s address bar.",
    );
  }
});
