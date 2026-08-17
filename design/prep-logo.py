"""Derive the app's logo assets from the master artwork.

    python3 design/prep-logo.py

Reads design/logo-source.png and writes src/assets/logo-full.webp (mark plus
wordmark) and src/assets/logo-mark.webp (mark only). Requires Pillow and numpy.

Rerun this after replacing the source artwork, or to change the output sizes.
"""

from pathlib import Path

from PIL import Image
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "design" / "logo-source.png"
OUT_DIR = ROOT / "src" / "assets"

# Alpha ramp: a colour distance from the background of <=SOFT_MIN becomes fully
# transparent, >=SOFT_MAX fully opaque, linear in between so edges stay
# anti-aliased.
#
# The source carries a soft vignette rather than a flat backdrop. Measured on
# it, background pixels reach a distance of ~14 while artwork pixels start at
# ~180, leaving a wide gap that separates the two cleanly. Thresholds must sit
# inside that gap: a SOFT_MIN below 14 leaves the vignette partially opaque and
# the mark renders with a grey halo on any non-white background.
SOFT_MIN, SOFT_MAX = 25.0, 80.0

# a row/column counts as content only when several solid pixels land on it, so
# stray specks cannot defeat the trim or mask the mark/wordmark gap
SOLID = 0.3
MIN_SOLID_PIXELS = 3
PAD = 6


def main() -> None:
    img = Image.open(SRC).convert("RGB")
    rgb = np.asarray(img).astype(np.float32)
    h, w, _ = rgb.shape

    # background colour = median of a 4px border frame
    border = np.concatenate([
        rgb[:4].reshape(-1, 3), rgb[-4:].reshape(-1, 3),
        rgb[:, :4].reshape(-1, 3), rgb[:, -4:].reshape(-1, 3),
    ])
    bg = np.median(border, axis=0)
    print(f"source {w}x{h}, background rgb {bg.astype(int).tolist()}")

    dist = np.abs(rgb - bg).max(axis=2)
    alpha = np.clip((dist - SOFT_MIN) / (SOFT_MAX - SOFT_MIN), 0.0, 1.0)

    full = Image.fromarray(np.dstack([rgb, alpha * 255.0]).astype(np.uint8))

    # crop away empty margins
    solid = alpha > SOLID
    cols = np.where(solid.sum(axis=0) >= MIN_SOLID_PIXELS)[0]
    rows = np.where(solid.sum(axis=1) >= MIN_SOLID_PIXELS)[0]
    x0, y0 = max(0, cols[0] - PAD), max(0, rows[0] - PAD)
    x1, y1 = min(w, cols[-1] + 1 + PAD), min(h, rows[-1] + 1 + PAD)
    full = full.crop((x0, y0, x1, y1))
    print(f"trimmed to {full.width}x{full.height}")

    save(full, "logo-full.webp", 640)

    gap = find_gap(alpha[y0:y1, x0:x1])
    if not gap:
        print("no mark/wordmark gap found - skipping the mark-only crop")
        return

    split = (gap[0] + gap[1]) // 2
    print(f"mark/wordmark gap at rows {gap[0]}..{gap[1]} of {full.height}")

    mark = full.crop((0, 0, full.width, split))
    # the mark is narrower than the wordmark, so trim it horizontally again
    m_alpha = np.asarray(mark)[:, :, 3] / 255.0
    m_cols = np.where((m_alpha > SOLID).sum(axis=0) >= MIN_SOLID_PIXELS)[0]
    mark = mark.crop((
        max(0, m_cols[0] - PAD), 0,
        min(mark.width, m_cols[-1] + 1 + PAD), mark.height,
    ))
    save(mark, "logo-mark.webp", 320)


def find_gap(sub: np.ndarray) -> tuple[int, int] | None:
    """Longest run of blank rows that is not the top or bottom margin."""
    blank = (sub > SOLID).sum(axis=1) < MIN_SOLID_PIXELS
    runs, start = [], None
    for i, is_blank in enumerate(blank):
        if is_blank and start is None:
            start = i
        elif not is_blank and start is not None:
            runs.append((start, i))
            start = None
    if start is not None:
        runs.append((start, len(blank)))

    interior = [r for r in runs if r[0] > 0 and r[1] < len(blank)]
    return max(interior, key=lambda r: r[1] - r[0], default=None)


def save(image: Image.Image, name: str, target_w: int) -> None:
    ratio = target_w / image.width
    out = image.resize((target_w, max(1, round(image.height * ratio))), Image.LANCZOS)
    path = OUT_DIR / name
    out.save(path, "WEBP", quality=92, method=6)
    print(f"{name}: {out.width}x{out.height}, {path.stat().st_size / 1024:.0f} KB")


if __name__ == "__main__":
    main()
