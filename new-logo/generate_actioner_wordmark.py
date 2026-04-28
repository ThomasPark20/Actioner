"""
Actioner Wordmark Generator
============================

Design Summary
--------------
- Font: TeX Gyre Adventor Bold (geometric sans, open-source ITC Avant Garde alternative)
  Source: https://www.1001fonts.com/tex-gyre-adventor-font.html
  Path:   /usr/share/texmf/fonts/opentype/public/tex-gyre/texgyreadventor-bold.otf

- Brand Mark: Forward slash + orange dot (the Actioner icon)
  The slash+dot replaces the letter "A" at the start of "ctioner"
  
- Icon Proportions (measured from source icon):
    Slash thickness: 0.277 × slash height
    Slash lean:      0.494 × slash height (top shifts right of bottom)
    Dot radius:      0.132 × slash height
    Dot gap:         0.226 × slash height (gap between slash right edge and dot left edge)  
    Dot vertical:    dot bottom aligns with slash bottom

- Colors:
    Text/Slash: #ffffff (light variant) / #1a1a1a (dark variant)
    Dot:        #d4760a (brand orange)

- Layout: [slash+dot] + "ctioner" (no trailing dot)

Outputs
-------
Per variant (light/ and dark/):
  - actioner-wordmark-1x.png  (base size)
  - actioner-wordmark-2x.png  (2× retina)
  - actioner-wordmark-4x.png  (4× master)
  - actioner-wordmark.svg     (scalable, references TeX Gyre Adventor via Google Fonts fallback)
"""

from PIL import Image, ImageFont, ImageDraw
import os

# =============================================================================
# Config
# =============================================================================

FONT_PATH = "/usr/share/texmf/fonts/opentype/public/tex-gyre/texgyreadventor-bold.otf"
ORANGE = (212, 118, 10, 255)
SCALE = 4          # internal render scale (4x, then downsample)
FONT_SIZE = 68     # base font size in px (before scale)

# Icon proportions (normalized to slash height = 1.0, from source icon analysis)
ICON = {
    "slash_thickness": 0.277,
    "slash_lean":      0.494,
    "dot_radius":      0.132,
    "dot_gap":         0.226,   # horizontal gap: slash right edge → dot left edge
    "dot_v_offset":   -0.131,   # dot center sits this far above slash bottom
}

# =============================================================================
# Generator
# =============================================================================

def create_wordmark(text_color, dot_color, out_prefix, scale=SCALE):
    fs = FONT_SIZE * scale
    font = ImageFont.truetype(FONT_PATH, fs)

    # Measure text
    tmp = Image.new("RGBA", (4000, 800), (0, 0, 0, 0))
    d = ImageDraw.Draw(tmp)
    ctioner_w = d.textlength("ctioner", font=font)

    # Use cap height from "A" to set slash height
    cap_bb = d.textbbox((0, 0), "A", font=font, anchor="ls")
    cap_top = cap_bb[1]     # negative (above baseline)
    cap_bot = cap_bb[3]     # positive (below baseline)
    cap_height = cap_bot - cap_top

    # Slash = slightly taller than cap height (8% overshoot)
    overshoot = cap_height * 0.08
    slash_h = cap_height + 2 * overshoot

    # Derive icon dimensions from proportions
    slash_thick = slash_h * ICON["slash_thickness"]
    slash_lean  = slash_h * ICON["slash_lean"]
    dot_r       = slash_h * ICON["dot_radius"]
    dot_gap     = slash_h * ICON["dot_gap"]
    dot_v_off   = slash_h * ICON["dot_v_offset"]

    # Canvas
    canvas_h = int(100 * scale)
    baseline_y = int(74 * scale)
    gap_after_icon = 2 * scale  # gap between icon assembly and "c"

    # Slash corners (top leans RIGHT, bottom is LEFT — forward slash)
    slash_top = baseline_y + cap_top - overshoot
    slash_bot = baseline_y + cap_bot + overshoot

    slash_bot_left  = 0
    slash_bot_right = slash_bot_left + slash_thick
    slash_top_left  = slash_bot_left + slash_lean
    slash_top_right = slash_bot_right + slash_lean

    # Dot: sits to the RIGHT of the slash bottom, with a clear gap
    dot_cx = slash_bot_right + dot_gap + dot_r
    dot_cy = slash_bot + dot_v_off

    # "ctioner" starts after the rightmost point of the icon assembly
    icon_right = max(slash_top_right, dot_cx + dot_r)
    ctioner_x = icon_right + gap_after_icon
    ctioner_end = ctioner_x + ctioner_w

    total_w = int(ctioner_end + 4 * scale)

    # Draw
    img = Image.new("RGBA", (total_w, canvas_h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Slash
    draw.polygon([
        (slash_top_left,  slash_top),
        (slash_top_right, slash_top),
        (slash_bot_right, slash_bot),
        (slash_bot_left,  slash_bot),
    ], fill=text_color)

    # Dot
    draw.ellipse(
        (dot_cx - dot_r, dot_cy - dot_r, dot_cx + dot_r, dot_cy + dot_r),
        fill=dot_color,
    )

    # Text
    draw.text((ctioner_x, baseline_y), "ctioner", fill=text_color, font=font, anchor="ls")

    # Crop to content
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    # Save at 4x, 2x, 1x
    img.save(f"{out_prefix}-4x.png")
    img.resize((img.width // 2, img.height // 2), Image.LANCZOS).save(f"{out_prefix}-2x.png")
    img.resize((img.width // 4, img.height // 4), Image.LANCZOS).save(f"{out_prefix}-1x.png")

    return img


def preview(wm_path, bg_color, out_path, canvas_size=(1200, 260)):
    bg = Image.new("RGBA", canvas_size, bg_color)
    wm = Image.open(wm_path).convert("RGBA")
    x = (canvas_size[0] - wm.width) // 2
    y = (canvas_size[1] - wm.height) // 2
    bg.paste(wm, (x, y), wm)
    bg.save(out_path)


# =============================================================================
# Main
# =============================================================================

if __name__ == "__main__":
    OUT = "/home/claude/actioner-final"
    os.makedirs(f"{OUT}/light", exist_ok=True)
    os.makedirs(f"{OUT}/dark", exist_ok=True)

    # Generate wordmarks
    create_wordmark(
        text_color=(255, 255, 255, 255),
        dot_color=ORANGE,
        out_prefix=f"{OUT}/light/actioner-wordmark",
    )
    create_wordmark(
        text_color=(26, 26, 26, 255),
        dot_color=ORANGE,
        out_prefix=f"{OUT}/dark/actioner-wordmark",
    )

    # Previews
    preview(f"{OUT}/light/actioner-wordmark-2x.png", (26, 26, 26, 255),
            "/mnt/user-data/outputs/actioner-final-on-dark.png")
    preview(f"{OUT}/dark/actioner-wordmark-2x.png", (255, 255, 255, 255),
            "/mnt/user-data/outputs/actioner-final-on-light.png")

    print("Done!")
