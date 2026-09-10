#!/usr/bin/env python3
"""Drive shipped js/lightbox.js open/close logic in a browser-like window."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
HARNESS = ROOT / "tests" / "lightbox_unit.html"
CHROME = Path("/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")


def dump_dom(url: str) -> str:
    proc = subprocess.run(
        [
            str(CHROME),
            "--headless=new",
            "--disable-gpu",
            "--virtual-time-budget=4000",
            "--dump-dom",
            url,
        ],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        sys.stderr.write(proc.stderr)
        raise SystemExit(f"chrome dump-dom failed: {proc.returncode}")
    return proc.stdout


def parse_results(dom: str) -> dict:
    marker = 'id="results">'
    start = dom.find(marker)
    if start < 0:
        raise SystemExit("results node missing from dump-dom")
    start += len(marker)
    end = dom.find("</pre>", start)
    raw = dom[start:end].strip()
    raw = (
        raw.replace("&quot;", '"')
        .replace("&amp;", "&")
        .replace("&#34;", '"')
        .replace("&lt;", "<")
        .replace("&gt;", ">")
    )
    return json.loads(raw)


def main() -> int:
    url = HARNESS.resolve().as_uri()
    dom = dump_dom(url)
    payload = parse_results(dom)
    print(json.dumps(payload, indent=2))
    if not payload.get("ok"):
        print("FAILED", payload.get("failed"), file=sys.stderr)
        return 1
    names = {row["name"] for row in payload["results"]}
    for required in (
        "open-sets-state",
        "open-src",
        "url-unchanged-on-open",
        "escape-closes",
        "backdrop-closes",
        "logo-does-not-open",
        "window-defined",
        "no-commonjs-module",
    ):
        assert required in names, required
    print("lightbox unit ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
