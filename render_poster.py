"""Screenshot poster.html into entry.png with a headless Chromium.

The sheet is drawn at exactly 1024x1024 in poster.html. This script finds
a Chromium binary (Playwright's cache first), screenshots the page in a
taller window so the last row is not clipped, crops the top 1024x1024
pixels, and checks the PNG against the competition caps: 1024x1024 and
at most 1 MiB. It also writes entry-512.png, a half-size preview for the
legibility check (gitignored, never part of the entry).

Run:  python3 render_poster.py
"""

import glob
import os
import subprocess
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
HTML = os.path.join(HERE, "poster.html")
PNG = os.path.join(HERE, "entry.png")
PREVIEW = os.path.join(HERE, "entry-512.png")
CAP_BYTES = 1_048_576


def find_chromium():
    override = os.environ.get("POSTER_CHROMIUM")
    if override and os.path.exists(override):
        return override
    cache = os.path.expanduser("~/.cache/ms-playwright")
    hits = sorted(
        glob.glob(os.path.join(cache, "chromium-*", "chrome-linux", "chrome")),
        reverse=True,
    )
    if hits:
        return hits[0]
    for name in ("chromium", "chromium-browser", "google-chrome", "chrome"):
        found = subprocess.run(["which", name], capture_output=True, text=True)
        if found.returncode == 0 and found.stdout.strip():
            return found.stdout.strip()
    raise SystemExit("no chromium binary found (set POSTER_CHROMIUM)")


def main():
    browser = find_chromium()
    raw = os.path.join(HERE, ".render-raw.png")
    # A window taller than the sheet: with a window of exactly 1024px this
    # Chromium build drops the sheet's last rows from the screenshot.
    cmd = [
        browser,
        "--headless=new",
        "--no-sandbox",
        "--disable-gpu",
        "--hide-scrollbars",
        "--force-device-scale-factor=1",
        "--window-size=1024,1300",
        "--screenshot=" + raw,
        "file://" + HTML,
    ]
    run = subprocess.run(cmd, capture_output=True, text=True, timeout=120)
    if run.returncode != 0 or not os.path.exists(raw):
        sys.stderr.write(run.stderr[-2000:])
        raise SystemExit("chromium screenshot failed")

    with Image.open(raw) as shot:
        shot.convert("RGB").crop((0, 0, 1024, 1024)).save(PNG)
    os.remove(raw)

    with Image.open(PNG) as img:
        img.load()
        size = img.size
        # The masthead is a solid navy band across the top; if it is
        # missing, the render did not start at the top of the sheet.
        rgb = img.convert("RGB")
        px = rgb.load()
        navy = sum(
            1
            for x in range(30, 994)
            for y in range(30, 60)
            if abs(px[x, y][0] - 16) < 25
            and abs(px[x, y][1] - 38) < 25
            and abs(px[x, y][2] - 78) < 30
        )
    nbytes = os.path.getsize(PNG)
    print(f"entry.png: {size[0]}x{size[1]}, {nbytes} bytes, masthead navy px: {navy}")
    assert size == (1024, 1024), "poster must be exactly 1024x1024"
    assert nbytes <= CAP_BYTES, "poster exceeds the 1 MiB cap"
    assert navy > 5000, "masthead band not found — render may be clipped"

    with Image.open(PNG) as img:
        img.resize((512, 512), Image.LANCZOS).save(PREVIEW)
    print(f"preview: {PREVIEW} (512x512, for the legibility check)")


if __name__ == "__main__":
    main()
