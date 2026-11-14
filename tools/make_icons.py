# -*- coding: utf-8 -*-
"""Generate the Lucky Study app icons (PWA + Android).

The cover is a clean slot window with three evenly spaced, upright sevens.
No fruit, no extra symbols. Run this after changing the icon design:
    python tools/make_icons.py
"""
from __future__ import annotations

import math
import os
from PIL import Image, ImageDraw, ImageFilter, ImageFont

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(BASE, "assets")
ANDROID_RES = os.path.join(BASE, "android", "app", "res")
FONT_GEORGIA_BOLD = r"C:\Windows\Fonts\georgiab.ttf"
SIZE = 1024


def lerp(a, b, t):
    return tuple(int(a[i] + (b[i] - a[i]) * t) for i in range(3))


def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def background(size, maskable):
    top = (92, 16, 52)
    bottom = (24, 6, 18)
    img = Image.new("RGB", (size, size))
    pixels = img.load()
    glow_x, glow_y = size * 0.5, size * 0.04
    for y in range(size):
        for x in range(size):
            base = lerp(top, bottom, y / size)
            dx, dy = x - glow_x, y - glow_y
            glow = max(0.0, 1.0 - math.sqrt(dx * dx + dy * dy) / (size * 0.72)) ** 2
            pixels[x, y] = (
                min(255, base[0] + int(52 * glow)),
                min(255, base[1] + int(26 * glow)),
                min(255, base[2] + int(18 * glow)),
            )
    if maskable:
        return img.convert("RGBA")
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), rounded_mask(size, int(size * 0.225)))
    return out


def draw_icon(maskable=False):
    size = SIZE
    scale = 0.855 if maskable else 1.0
    offset = (size - size * scale) / 2.0

    def s(value):
        return offset + value * scale

    def box(x0, y0, x1, y1):
        return (s(x0), s(y0), s(x1), s(y1))

    def width(value):
        return max(1, int(value * scale))

    img = background(size, maskable)
    draw = ImageDraw.Draw(img, "RGBA")

    # Soft glass sheen.
    sheen = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sheen, "RGBA")
    sd.polygon([(0, 0), (size * 0.58, 0), (0, size * 0.68)], fill=(255, 255, 255, 12))
    img.alpha_composite(sheen)

    # Gold frame and beading.
    draw.rounded_rectangle(
        (s(55), s(55), s(969), s(969)),
        radius=width(178),
        outline=(246, 197, 103, 190),
        width=width(10),
    )
    draw.rounded_rectangle(
        (s(79), s(79), s(945), s(945)),
        radius=width(158),
        outline=(255, 231, 167, 54),
        width=width(3),
    )

    bulbs = []
    for i in range(7):
        bulbs.append((s(224 + i * 96), s(118)))
        bulbs.append((s(224 + i * 96), s(906)))
    glow_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow_layer, "RGBA")
    for bx, by in bulbs:
        r = s(5.6) - s(0)
        gd.ellipse((bx - r * 3.3, by - r * 3.3, bx + r * 3.3, by + r * 3.3),
                   fill=(255, 194, 85, 48))
    glow_layer = glow_layer.filter(ImageFilter.GaussianBlur(width(9)))
    img.alpha_composite(glow_layer)
    for i, (bx, by) in enumerate(bulbs):
        r = s(5.6) - s(0)
        color = (255, 227, 157, 255) if i % 4 else (255, 157, 137, 248)
        draw.ellipse((bx - r, by - r, bx + r, by + r), fill=color)

    # Recessed machine window.
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(shadow, "RGBA").rounded_rectangle(
        box(143, 232, 881, 806),
        radius=width(92),
        fill=(0, 0, 0, 165),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(width(22)))
    img.alpha_composite(shadow)
    draw.rounded_rectangle(
        box(156, 226, 868, 792),
        radius=width(80),
        fill=(22, 8, 16, 255),
        outline=(244, 190, 91, 230),
        width=width(13),
    )
    draw.rounded_rectangle(
        box(174, 244, 850, 774),
        radius=width(62),
        outline=(255, 235, 181, 78),
        width=width(3),
    )

    # Cream reel window, divided into three even cells.
    reel = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rd = ImageDraw.Draw(reel, "RGBA")
    rd.rounded_rectangle(box(184, 254, 840, 764), radius=width(52), fill=(255, 250, 240, 255))
    top_color = (255, 249, 235)
    bottom_color = (238, 216, 188)
    for y in range(int(s(254)), int(s(764))):
        t = (y - s(254)) / max(1.0, s(764) - s(254))
        shade = lerp(top_color, bottom_color, t)
        rd.line((s(184) + width(3), y, s(840) - width(3), y), fill=shade + (255,))

    shade_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sh = ImageDraw.Draw(shade_layer, "RGBA")
    sh.rounded_rectangle(box(184, 254, 840, 340), radius=width(52), fill=(84, 38, 37, 74))
    sh.rectangle(box(184, 314, 840, 340), fill=(84, 38, 37, 26))
    sh.rounded_rectangle(box(184, 678, 840, 764), radius=width(52), fill=(84, 38, 37, 66))
    sh.rectangle(box(184, 678, 840, 712), fill=(84, 38, 37, 20))
    sh.line((s(198), s(512), s(826), s(512)), fill=(220, 164, 73, 72), width=width(3))

    # Even reel separators.
    for x in (402, 622):
        sh.line((s(x), s(284), s(x), s(734)), fill=(123, 68, 55, 42), width=width(4))
        sh.line((s(x + 3), s(284), s(x + 3), s(734)), fill=(255, 251, 238, 160), width=width(2))
    reel.alpha_composite(shade_layer)
    img.alpha_composite(reel)

    # Three upright sevens, centered in their own reels.
    try:
        font = ImageFont.truetype(FONT_GEORGIA_BOLD, int(255 * scale))
    except OSError:
        font = ImageFont.load_default()
    centers = [s(293), s(512), s(731)]
    center_y = s(514)
    seven_shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(seven_shadow, "RGBA")
    for cx in centers:
        sd.text(
            (cx, center_y + s(10) - s(0)),
            "7",
            font=font,
            fill=(94, 24, 40, 92),
            anchor="mm",
            stroke_width=width(7),
            stroke_fill=(94, 24, 40, 55),
        )
    seven_shadow = seven_shadow.filter(ImageFilter.GaussianBlur(width(5)))
    img.alpha_composite(seven_shadow)

    for cx in centers:
        draw.text(
            (cx, center_y),
            "7",
            font=font,
            fill=(172, 13, 52, 255),
            anchor="mm",
            stroke_width=width(3),
            stroke_fill=(255, 244, 218, 170),
        )

    # Three little marquee pips below the window.
    for cx in (478, 512, 546):
        r = s(5.5) - s(0)
        draw.ellipse((s(cx) - r, s(850) - r, s(cx) + r, s(850) + r),
                     fill=(250, 203, 110, 235))

    # Soft glass edge over the reels.
    glass = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glass, "RGBA")
    gd.polygon(
        [(s(192), s(266)), (s(326), s(266)), (s(218), s(746)), (s(192), s(746))],
        fill=(255, 255, 255, 22),
    )
    gd.line((s(194), s(314), s(830), s(314)), fill=(255, 251, 239, 72), width=width(2))
    img.alpha_composite(glass)

    return img.convert("RGBA")


def save_resized(image, pixels, path, background_fill=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    resized = image.resize((pixels, pixels), Image.LANCZOS)
    if background_fill is not None:
        bg = Image.new("RGBA", (pixels, pixels), background_fill)
        bg.alpha_composite(resized)
        resized = bg
    resized.save(path, "PNG", optimize=True)
    print(path, pixels)


def main():
    regular = draw_icon(False)
    maskable = draw_icon(True)

    os.makedirs(ASSETS, exist_ok=True)
    save_resized(regular, 512, os.path.join(ASSETS, "icon-512.png"))
    save_resized(regular, 192, os.path.join(ASSETS, "icon-192.png"))
    save_resized(maskable, 512, os.path.join(ASSETS, "icon-maskable-512.png"))
    save_resized(maskable, 180, os.path.join(ASSETS, "apple-touch-icon.png"))
    save_resized(maskable, 32, os.path.join(ASSETS, "favicon-32.png"))

    densities = {
        "mipmap-mdpi": 48,
        "mipmap-hdpi": 72,
        "mipmap-xhdpi": 96,
        "mipmap-xxhdpi": 144,
        "mipmap-xxxhdpi": 192,
    }
    for folder, pixels in densities.items():
        save_resized(regular, pixels, os.path.join(ANDROID_RES, folder, "ic_launcher.png"))

    print("icon generation complete")


if __name__ == "__main__":
    main()
