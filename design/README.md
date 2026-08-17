# Design sources

`logo-source.png` is the master logo artwork. It is not shipped to the browser —
the app imports the derived assets in `src/assets/` instead.

## Regenerating the logo assets

```bash
python3 -m pip install pillow numpy
python3 design/prep-logo.py
```

This writes:

| File | Contents | Used by |
| --- | --- | --- |
| `src/assets/logo-full.webp` | mark above the wordmark | `<PyLearnLogo />` |
| `src/assets/logo-mark.webp` | mark only | `<PyLearnLogo withWordmark={false} />` |

The script lifts the artwork off its backdrop, trims the empty margins, splits
the mark from the wordmark and re-encodes both as WebP.

The source has a soft vignette rather than a flat backdrop, so the transparency
threshold matters: set it too low and the vignette survives as a
partially-opaque film that shows up as a grey halo on any non-white background.
`SOFT_MIN`/`SOFT_MAX` in the script carry the measured numbers and the reasoning
behind them — read that comment before changing them.

## Replacing the logo

Drop a new `logo-source.png` in and rerun the script. It expects the artwork on
a near-uniform light backdrop with the wordmark below the mark, separated by a
clear horizontal band. Without that band the mark-only crop is skipped and the
script says so.
