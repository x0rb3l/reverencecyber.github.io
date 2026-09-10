#!/usr/bin/env python3
"""Check BYOVD figures exist, are referenced, and were upscaled."""

from __future__ import annotations

import re
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ARTICLE = ROOT / "blog/byovd-reloaded/index.html"
IMG_DIR = ROOT / "blog/img/byovd-reloaded"
# Smallest original long edge was 533px (04.png); 2x Lanczos must meet this.
MIN_LONG_EDGE = 1066


def main() -> int:
    html = ARTICLE.read_text(encoding="utf-8")
    refs = set(re.findall(r"/blog/img/byovd-reloaded/(\d{2})\.png", html))
    expected = {f"{i:02d}" for i in range(1, 19)}
    missing_refs = expected - refs
    extra_refs = refs - expected
    assert not missing_refs, f"article missing srcs: {sorted(missing_refs)}"
    assert not extra_refs, f"article unexpected srcs: {sorted(extra_refs)}"

    for name in sorted(expected):
        path = IMG_DIR / f"{name}.png"
        assert path.is_file(), f"missing {path}"
        with Image.open(path) as im:
            long_edge = max(im.size)
            assert long_edge >= MIN_LONG_EDGE, f"{path.name} long edge {long_edge} < {MIN_LONG_EDGE}"
            im.load()
        print(f"ok {name}.png {path.stat().st_size}B")
    print("byovd figures ok")
    return 0


if __name__ == "__main__":
    sys.exit(main())
