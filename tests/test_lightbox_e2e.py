#!/usr/bin/env python3
"""Click a BYOVD figure in a real page and assert the overlay stays on-page."""

from __future__ import annotations

import json
import os
import subprocess
import sys
import time
from pathlib import Path
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]
SCRATCH = Path(os.environ.get("E2E_OUT", "/tmp"))
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PORT = os.environ.get("E2E_PORT", "8767")


def wait_http(url: str, tries: int = 30) -> None:
    for _ in range(tries):
        try:
            with urlopen(url, timeout=1) as resp:
                if resp.status == 200:
                    return
        except Exception:
            time.sleep(0.2)
    raise SystemExit(f"server not ready: {url}")


def main() -> int:
    scratch = SCRATCH
    scratch.mkdir(parents=True, exist_ok=True)
    server = subprocess.Popen(
        [sys.executable, "-m", "http.server", PORT, "--bind", "127.0.0.1"],
        cwd=str(ROOT),
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    try:
        wait_http(f"http://127.0.0.1:{PORT}/blog/byovd-reloaded/")
        env = os.environ.copy()
        env["PUPPETEER_CORE"] = str(Path(env.get("PUPPETEER_CORE", "puppeteer-core")))
        env["CHROME"] = CHROME
        env["E2E_URL"] = f"http://127.0.0.1:{PORT}/blog/byovd-reloaded/"
        env["E2E_OUT"] = str(scratch)
        reports = []
        for run in ("1", "2"):
            env["E2E_RUN"] = run
            proc = subprocess.run(
                ["node", str(ROOT / "tests" / "lightbox_e2e.cjs")],
                cwd=str(ROOT),
                env=env,
                capture_output=True,
                text=True,
                check=False,
            )
            (scratch / f"lightbox-e2e-run{run}.log").write_text(proc.stdout + "\n" + proc.stderr)
            sys.stdout.write(proc.stdout)
            sys.stderr.write(proc.stderr)
            if proc.returncode != 0:
                return proc.returncode
            data = json.loads(proc.stdout)
            assert data["ok"] is True, data
            reports.append(data)
        assert reports[0]["ok"] and reports[1]["ok"]
        print("lightbox e2e ok (2 runs)")
        return 0
    finally:
        server.terminate()
        try:
            server.wait(timeout=3)
        except subprocess.TimeoutExpired:
            server.kill()


if __name__ == "__main__":
    sys.exit(main())
