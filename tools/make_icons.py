"""Draws the SpellBee app icons (a honeycomb of seven hexagons) into icons/."""
import math
import sys

from PIL import Image, ImageDraw

BG, TILE, HONEY = (18, 18, 18), (58, 58, 60), (247, 197, 49)


def hexagon(cx, cy, r):
    return [(cx + r * math.cos(math.radians(a)), cy + r * math.sin(math.radians(a))) for a in range(0, 360, 60)]


def draw(size, path):
    scale = 4  # draw large, then shrink for smooth edges
    s = size * scale
    img = Image.new("RGB", (s, s), BG)
    d = ImageDraw.Draw(img)
    r = s * 0.15
    gap = s * 0.018
    dx, dy = 1.5 * r + gap * 0.87, math.sqrt(3) * r + gap
    cx, cy = s / 2, s / 2
    for x, y in [(0, -1), (1, -0.5), (1, 0.5), (0, 1), (-1, 0.5), (-1, -0.5)]:
        d.polygon(hexagon(cx + x * dx, cy + y * dy, r), fill=TILE)
    d.polygon(hexagon(cx, cy, r), fill=HONEY)
    img.resize((size, size), Image.LANCZOS).save(path)


out = sys.argv[1]
draw(512, f"{out}/icon-512.png")
draw(192, f"{out}/icon-192.png")
draw(180, f"{out}/apple-touch-icon.png")
