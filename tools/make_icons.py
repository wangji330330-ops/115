# -*- coding: utf-8 -*-
"""Generate the Lucky Study app icons (PWA + Android) without external assets."""
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
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def background(size, maskable):
    top = (93, 17, 52)
    bottom = (25, 7, 19)
    img = Image.new("RGB", (size, size))
    pix = img.load()
    cx, cy = size * 0.28, size * 0.1
    for y in range(size):
        for x in range(size):
            t = y / size
            base = lerp(top, bottom, t)
            # warm glow in the top-left corner
            dx, dy = x - cx, y - cy
            glow = max(0.0, 1.0 - math.sqrt(dx * dx + dy * dy) / (size * 0.85)) ** 2
            warmed = (
                min(255, base[0] + int(44 * glow)),
                min(255, base[1] + int(30 * glow)),
                min(255, base[2] + int(20 * glow)),
            )
            pix[x, y] = warmed
    if not maskable:
        out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
        out.paste(img, (0, 0), rounded_mask(size, int(size * 0.225)))
        return out
    return img.convert("RGBA")


def star_points(cx, cy, outer, inner, points=5, rotation=-math.pi / 2):
    result = []
    for i in range(points * 2):
        r = outer if i % 2 == 0 else inner
        angle = rotation + i * math.pi / points
        result.append((cx + math.cos(angle) * r, cy + math.sin(angle) * r))
    return result


def draw_icon(maskable=False):
    size = SIZE
    scale = 0.855 if maskable else 1.0
    offset = (size - size * scale) / 2.0

    def s(value):
        return offset + value * scale

    def box(x0, y0, x1, y1):
        return (s(x0), s(y0), s(x1), s(y1))

    img = background(size, maskable)
    draw = ImageDraw.Draw(img, "RGBA")

    # glossy diagonal sheen
    sheen = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(sheen, "RGBA")
    sd.polygon([(0, 0), (size * 0.6, 0), (0, size * 0.72)], fill=(255, 255, 255, 13))
    sd.polygon(
        [(size * 0.68, 0), (size * 0.76, 0), (size * 0.12, size)],
        fill=(255, 255, 255, 9),
    )
    img.alpha_composite(sheen)

    # outer gold frame
    draw.rounded_rectangle(
        (s(55), s(55), s(969), s(969)),
        radius=int(s(185) - s(0)),
        outline=(246, 197, 103, 185),
        width=max(3, int(s(10) - s(0))),
    )
    draw.rounded_rectangle(
        (s(78), s(78), s(946), s(946)),
        radius=int(s(164) - s(0)),
        outline=(255, 228, 159, 58),
        width=max(1, int(s(3) - s(0))),
    )

    # marquee bulbs around the top and bottom of the frame
    bulbs = []
    for i in range(7):
        bulbs.append((s(225 + i * 95.5), s(117)))
        bulbs.append((s(225 + i * 95.5), s(907)))
    glow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow, "RGBA")
    for x, y in bulbs:
        r = max(2.0, s(7) - s(0))
        gd.ellipse((x - r * 3.2, y - r * 3.2, x + r * 3.2, y + r * 3.2), fill=(255, 193, 82, 42))
    glow = glow.filter(ImageFilter.GaussianBlur(max(2, int(s(8) - s(0)))))
    img.alpha_composite(glow)
    for i, (x, y) in enumerate(bulbs):
        r = max(2.0, s(5.5) - s(0))
        color = (255, 225, 151, 255) if i % 3 else (255, 158, 136, 245)
        draw.ellipse((x - r, y - r, x + r, y + r), fill=color)

    # recessed machine window
    shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    shd = ImageDraw.Draw(shadow, "RGBA")
    shd.rounded_rectangle(
        box(147, 238, 877, 812),
        radius=int(s(92) - s(0)),
        fill=(0, 0, 0, 150),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(max(4, int(s(22) - s(0)))))
    img.alpha_composite(shadow)

    draw.rounded_rectangle(
        box(155, 230, 869, 790),
        radius=int(s(82) - s(0)),
        fill=(23, 8, 16, 255),
        outline=(244, 189, 88, 220),
        width=max(3, int(s(13) - s(0))),
    )
    draw.rounded_rectangle(
        box(175, 250, 849, 770),
        radius=int(s(64) - s(0)),
        outline=(255, 230, 171, 76),
        width=max(1, int(s(2.5) - s(0))),
    )

    # creamy reel face (opaque base, then composited translucent shading)
    reel = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rd = ImageDraw.Draw(reel, "RGBA")
    rd.rounded_rectangle(
        box(184, 259, 840, 761),
        radius=int(s(54) - s(0)),
        fill=(252, 238, 215, 255),
    )
    for y in range(int(s(259)), int(s(761))):
        t = (y - s(259)) / max(1.0, s(761) - s(259))
        # pale cream at the top, warmer parchment at the bottom
        color = lerp((255, 249, 236), (238, 216, 188), t)
        rd.line(
            (s(184) + int(s(3) - s(0)), y, s(840) - int(s(3) - s(0)), y),
            fill=color + (255,),
        )
    reel_shade = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rsd = ImageDraw.Draw(reel_shade, "RGBA")
    # soft top and bottom interior shadows
    rsd.rounded_rectangle(
        box(184, 259, 840, 345),
        radius=int(s(54) - s(0)),
        fill=(82, 37, 36, 86),
    )
    rsd.rectangle(box(184, 315, 840, 345), fill=(82, 37, 36, 38))
    rsd.rounded_rectangle(
        box(184, 675, 840, 761),
        radius=int(s(54) - s(0)),
        fill=(82, 37, 36, 72),
    )
    rsd.rectangle(box(184, 675, 840, 710), fill=(82, 37, 36, 30))
    # subtle centre payline glow
    rsd.rectangle(box(196, 474, 828, 570), fill=(255, 198, 92, 20))
    rsd.line((s(204), s(522), s(820), s(522)), fill=(222, 165, 74, 62), width=max(1, int(s(3) - s(0))))
    # three reel dividers
    for x in (400, 624):
        rsd.line((s(x), s(285), s(x), s(735)), fill=(123, 68, 55, 45), width=max(1, int(s(4) - s(0))))
        rsd.line((s(x + 3), s(285), s(x + 3), s(735)), fill=(255, 250, 235, 165), width=max(1, int(s(2) - s(0))))
    reel.alpha_composite(reel_shade)
    img.alpha_composite(reel)

    # ---- cherry (left reel) ----
    cherry_shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    cd = ImageDraw.Draw(cherry_shadow, "RGBA")
    stem_w = max(2, int(s(11) - s(0)))
    cd.line((s(274), s(458), s(302), s(389), s(336), s(361)), fill=(58, 104, 56, 220), width=stem_w, joint="curve")
    cd.line((s(300), s(428), s(321), s(381), s(338), s(361)), fill=(61, 109, 58, 220), width=stem_w, joint="curve")
    leaf = [(s(320), s(371)), (s(371), s(344)), (s(367), s(387)), (s(343), s(387))]
    cd.polygon(leaf, fill=(88, 145, 70, 235))
    cd.line((s(324), s(374), s(359), s(371)), fill=(47, 96, 47, 180), width=max(1, int(s(3) - s(0))))
    cd.ellipse(box(228, 493, 341, 606), fill=(163, 17, 54, 255))
    cd.ellipse(box(290, 521, 397, 628), fill=(185, 22, 66, 255))
    # little highlights
    cd.ellipse(box(249, 510, 287, 543), fill=(255, 193, 181, 200))
    cd.ellipse(box(310, 539, 344, 569), fill=(255, 188, 177, 150))
    img.alpha_composite(cherry_shadow)

    # ---- lucky seven (centre reel) ----
    try:
        font_seven = ImageFont.truetype(FONT_GEORGIA_BOLD, int(318 * scale))
    except OSError:
        font_seven = ImageFont.load_default()
    seven_center = (s(514), s(512))
    seven_shadow = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    sd = ImageDraw.Draw(seven_shadow, "RGBA")
    sd.text(
        (seven_center[0], seven_center[1] + s(14) - s(0)),
        "7",
        font=font_seven,
        fill=(113, 29, 43, 105),
        anchor="mm",
        stroke_width=max(2, int(s(7) - s(0))),
        stroke_fill=(113, 29, 43, 65),
    )
    seven_shadow = seven_shadow.filter(ImageFilter.GaussianBlur(max(2, int(s(6) - s(0)))))
    img.alpha_composite(seven_shadow)
    draw.text(
        seven_center,
        "7",
        font=font_seven,
        fill=(174, 12, 53, 255),
        anchor="mm",
        stroke_width=max(1, int(s(3) - s(0))),
        stroke_fill=(255, 244, 217, 150),
    )

    # ---- star (right reel) ----
    star_cx, star_cy = s(733), s(516)
    star_outer = (s(91) - s(0))
    star_inner = (s(40) - s(0))
    star_shadow_layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    std = ImageDraw.Draw(star_shadow_layer, "RGBA")
    std.polygon(
        star_points(star_cx, star_cy + s(8) - s(0), star_outer, star_inner),
        fill=(102, 61, 25, 80),
    )
    star_shadow_layer = star_shadow_layer.filter(ImageFilter.GaussianBlur(max(2, int(s(5) - s(0)))))
    img.alpha_composite(star_shadow_layer)
    draw.polygon(
        star_points(star_cx, star_cy, star_outer, star_inner),
        fill=(231, 166, 57, 255),
        outline=(255, 240, 189, 200),
        width=max(1, int(s(4) - s(0))),
    )
    draw.polygon(
        star_points(star_cx - s(3) - s(0), star_cy - s(5) - s(0), star_outer * 0.48, star_inner * 0.48),
        fill=(255, 220, 132, 120),
    )

    # small three-dot marquee under the window
    for x in (478, 512, 546):
        r = max(2.0, s(6) - s(0))
        draw.ellipse((s(x) - r, s(846) - r, s(x) + r, s(846) + r), fill=(250, 202, 108, 225))

    # glass highlight
    glass = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glass, "RGBA")
    gd.polygon(
        [
            (s(194), s(273)),
            (s(372), s(273)),
            (s(218), s(735)),
            (s(194), s(735)),
        ],
        fill=(255, 255, 255, 26),
    )
    gd.line((s(190), s(322), s(834), s(322)), fill=(255, 250, 238, 80), width=max(1, int(s(2) - s(0))))
    img.alpha_composite(glass)

    return img.convert("RGBA")


def save_resized(image, size, path, background_fill=None):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    resized = image.resize((size, size), Image.LANCZOS)
    if background_fill is not None:
        bg = Image.new("RGBA", (size, size), background_fill)
        bg.alpha_composite(resized)
        resized = bg
    resized.save(path, "PNG", optimize=True)
    print(path, size)


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
    for folder, px in densities.items():
        save_resized(regular, px, os.path.join(ANDROID_RES, folder, "ic_launcher.png"))

    print("icon generation complete")


if __name__ == "__main__":
    main()
