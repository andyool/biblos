"""Turn Woolly's generated drawings into the sprite sheets the app plays.

    python3 -m pip install pillow
    python3 scripts/build-woolly.py [path/to/biblos-lambs-all-44]

Reads the frame folder's manifest.json and frames/<lamb>/<clip>/NNN.png, and writes
src/mascot/sheets/woolly-<lamb>-<clip>.webp (each drawing a clip uses, once, left to right)
and src/mascot/clips.json (the order to show them in, how fast, and whether they loop).
"""

import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "biblos-lambs-all-44"
OUT = ROOT / "src" / "mascot"

# Every drawing sits on the same 384 × 480 canvas. This band holds the highest jump and the
# feet with a little to spare; at 3/4 size a lamb shown 160px tall is still sharp on a phone.
CROP = (0, 8, 384, 440)
SCALE = 0.75
CELL = (round((CROP[2] - CROP[0]) * SCALE), round((CROP[3] - CROP[1]) * SCALE))


def main():
    manifest = json.loads((SOURCE / "manifest.json").read_text())
    (OUT / "sheets").mkdir(parents=True, exist_ok=True)
    for old in (OUT / "sheets").glob("woolly-*.webp"):
        old.unlink()
    clips = {}
    total = 0
    for clip in manifest["clips"]:
        lamb, name = clip["key"].split("/")
        drawings = sorted(set(clip["sequence"]))
        sheet = Image.new("RGBA", (CELL[0] * len(drawings), CELL[1]), (0, 0, 0, 0))
        for i, n in enumerate(drawings):
            frame = Image.open(SOURCE / "frames" / lamb / name / f"{n:03d}.png").convert("RGBA")
            sheet.paste(frame.crop(CROP).resize(CELL, Image.LANCZOS), (i * CELL[0], 0))
        path = OUT / "sheets" / f"woolly-{lamb}-{name}.webp"
        sheet.save(path, "WEBP", quality=76, alpha_quality=85, method=6)
        total += path.stat().st_size
        clips.setdefault(lamb, {})[name] = {
            "cells": len(drawings),
            "order": [drawings.index(n) for n in clip["sequence"]],
            "fps": clip["fps"],
            "loop": clip["loop"],
        }
    data = {"cell": list(CELL), "clips": clips}
    (OUT / "clips.json").write_text(json.dumps(data, separators=(",", ":")) + "\n")
    print(f"{sum(len(c) for c in clips.values())} clips, {total / 1e6:.1f} MB")


if __name__ == "__main__":
    main()
