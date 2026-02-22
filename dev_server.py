"""Local static server used by `uv run dev` with live reload."""

from __future__ import annotations

import argparse
import hashlib
import os
import threading
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Iterable


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Serve the portfolio locally.")
    parser.add_argument(
        "--host",
        default=os.environ.get("HOST", "127.0.0.1"),
        help="Host to bind (default: 127.0.0.1, or HOST env var).",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=int(os.environ.get("PORT", "8000")),
        help="Port to serve on (default: 8000, or PORT env var).",
    )
    parser.add_argument(
        "--no-live-reload",
        action="store_true",
        help="Disable HTML live reload injection and watcher endpoint.",
    )
    return parser.parse_args()


LIVE_RELOAD_SNIPPET = """
<script>
(() => {
  const endpoint = "/__livereload";
  let last = "";
  const poll = async () => {
    try {
      const response = await fetch(endpoint, { cache: "no-store" });
      const next = await response.text();
      if (last && next && next !== last) {
        window.location.reload();
        return;
      }
      last = next;
    } catch (_) {}
    setTimeout(poll, 700);
  };
  poll();
})();
</script>
""".strip()


class LiveReloadState:
    """Tracks a project signature to signal page reloads after file changes."""

    def __init__(self, root: Path) -> None:
        self.root = root
        self._lock = threading.Lock()
        self._last_scan = 0.0
        self._signature = ""

    def _iter_files(self) -> Iterable[Path]:
        ignored_dirs = {".git", ".venv", "__pycache__", ".mypy_cache", ".pytest_cache"}
        ignored_suffixes = {".tmp", ".swp", ".swo", ".pyc"}
        for path in self.root.rglob("*"):
            if not path.is_file():
                continue
            if any(part in ignored_dirs for part in path.parts):
                continue
            if path.suffix in ignored_suffixes:
                continue
            yield path

    def current_signature(self) -> str:
        # Throttle scans because each browser tab polls frequently.
        now = time.monotonic()
        with self._lock:
            if now - self._last_scan < 0.4 and self._signature:
                return self._signature

            digest = hashlib.sha256()
            for path in sorted(self._iter_files()):
                try:
                    stat = path.stat()
                except OSError:
                    continue
                rel = path.relative_to(self.root).as_posix()
                digest.update(rel.encode("utf-8", errors="ignore"))
                digest.update(str(stat.st_mtime_ns).encode("ascii"))
                digest.update(str(stat.st_size).encode("ascii"))

            self._signature = digest.hexdigest()
            self._last_scan = now
            return self._signature


class DevRequestHandler(SimpleHTTPRequestHandler):
    """Static file handler with optional HTML live reload injection."""

    server_version = "PortfolioDevServer/1.0"

    def __init__(self, *args: object, directory: str, live_reload: bool, **kwargs: object):
        self._live_reload = live_reload
        super().__init__(*args, directory=directory, **kwargs)

    def do_GET(self) -> None:
        if self._live_reload and self.path.split("?", 1)[0] == "/__livereload":
            self._serve_live_reload_state()
            return

        if self._live_reload and self._is_html_request():
            if self._serve_html_with_injection():
                return

        super().do_GET()

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        super().end_headers()

    def _serve_live_reload_state(self) -> None:
        state = self.server.live_reload_state  # type: ignore[attr-defined]
        signature = state.current_signature() if state else ""
        encoded = signature.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/plain; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _is_html_request(self) -> bool:
        route = self.path.split("?", 1)[0]
        return route == "/" or route.endswith(".html")

    def _resolve_html_path(self) -> Path | None:
        route = self.path.split("?", 1)[0]
        if route == "/":
            candidate = Path(self.directory) / "index.html"
        else:
            candidate = Path(self.translate_path(route))
        if candidate.is_file():
            return candidate
        return None

    def _serve_html_with_injection(self) -> bool:
        html_path = self._resolve_html_path()
        if html_path is None:
            return False

        try:
            html = html_path.read_text(encoding="utf-8")
        except OSError:
            return False

        snippet = LIVE_RELOAD_SNIPPET
        if "</body>" in html:
            html = html.replace("</body>", f"{snippet}\n</body>", 1)
        else:
            html = f"{html}\n{snippet}\n"

        encoded = html.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)
        return True


def _is_local_dev_host(host: str) -> bool:
    return host in {"127.0.0.1", "localhost", "::1", "0.0.0.0"}


def _is_production_env() -> bool:
    env = (os.environ.get("APP_ENV") or os.environ.get("ENV") or "").strip().lower()
    return env in {"prod", "production"}


def main() -> None:
    args = parse_args()
    root = Path.cwd()
    live_reload_enabled = (
        (not args.no_live_reload)
        and _is_local_dev_host(args.host)
        and (not _is_production_env())
    )
    reload_state = LiveReloadState(root) if live_reload_enabled else None

    def handler(*handler_args: object, **handler_kwargs: object) -> DevRequestHandler:
        return DevRequestHandler(
            *handler_args,
            directory=str(root),
            live_reload=live_reload_enabled,
            **handler_kwargs,
        )

    server = ThreadingHTTPServer((args.host, args.port), handler)
    server.live_reload_state = reload_state  # type: ignore[attr-defined]

    print(f"Serving portfolio at http://{args.host}:{args.port}", flush=True)
    if live_reload_enabled:
        print("Live reload is enabled (local development mode).", flush=True)
    else:
        print("Live reload is disabled.", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
