import os
from PIL import Image, ImageDraw, ImageFont

def create_icon(size):
    # Create high-res canvas (4x supersampling for ultra smooth antialiasing)
    scale = 4
    s = size * scale
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Background squircle / rounded rect
    corner_radius = int(s * 0.22)
    
    # Gradient background
    # Interpolate from indigo #4338CA (67, 56, 202) to cyan #06B6D4 (6, 182, 212)
    base = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    base_draw = ImageDraw.Draw(base)
    
    # Draw rounded rect mask
    base_draw.rounded_rectangle(
        [0, 0, s - 1, s - 1],
        radius=corner_radius,
        fill=(255, 255, 255, 255)
    )
    
    grad = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    for y in range(s):
        ratio = y / float(s)
        r = int(67 * (1 - ratio) + 6 * ratio)
        g = int(56 * (1 - ratio) + 182 * ratio)
        b = int(202 * (1 - ratio) + 212 * ratio)
        line = Image.new("RGBA", (s, 1), (r, g, b, 255))
        grad.paste(line, (0, y))
    
    # Apply mask
    img.paste(grad, (0, 0), base)
    
    # Overlay subtle border / highlight
    draw = ImageDraw.Draw(img)
    draw.rounded_rectangle(
        [1 * scale, 1 * scale, s - 1 - 1 * scale, s - 1 - 1 * scale],
        radius=corner_radius - 1 * scale,
        outline=(255, 255, 255, 60),
        width=max(1, int(1.5 * scale))
    )

    # Draw two keycaps or Up/Down arrows with 'I' and 'U'
    # Upper section: Up arrow / Key 'I'
    # Lower section: Down arrow / Key 'U'
    mid_x = s // 2
    
    # Let's draw stylized keys:
    # Key 1: "I" (top half) with upward arrow
    # Key 2: "U" (bottom half) with downward arrow
    key_w = int(s * 0.72)
    key_h = int(s * 0.34)
    key_x1 = (s - key_w) // 2
    key_x2 = key_x1 + key_w
    
    # Top key 'I' (Up)
    y1_top = int(s * 0.12)
    y2_top = y1_top + key_h
    draw.rounded_rectangle(
        [key_x1, y1_top, key_x2, y2_top],
        radius=int(key_h * 0.3),
        fill=(255, 255, 255, 45),
        outline=(255, 255, 255, 120),
        width=max(1, int(scale * 1.2))
    )
    
    # Bottom key 'U' (Down)
    y1_bot = int(s * 0.54)
    y2_bot = y1_bot + key_h
    draw.rounded_rectangle(
        [key_x1, y1_bot, key_x2, y2_bot],
        radius=int(key_h * 0.3),
        fill=(255, 255, 255, 45),
        outline=(255, 255, 255, 120),
        width=max(1, int(scale * 1.2))
    )
    
    # Arrows and text inside keys
    # Top arrow (Up): triangle pointing UP
    arrow_size = int(key_h * 0.38)
    up_center_y = y1_top + key_h // 2
    draw.polygon([
        (mid_x - int(key_w * 0.22), up_center_y + arrow_size // 2),
        (mid_x, up_center_y - arrow_size // 2),
        (mid_x + int(key_w * 0.22), up_center_y + arrow_size // 2),
    ], fill=(255, 255, 255, 240))
    
    # Bottom arrow (Down): triangle pointing DOWN
    dn_center_y = y1_bot + key_h // 2
    draw.polygon([
        (mid_x - int(key_w * 0.22), dn_center_y - arrow_size // 2),
        (mid_x, dn_center_y + arrow_size // 2),
        (mid_x + int(key_w * 0.22), dn_center_y - arrow_size // 2),
    ], fill=(255, 255, 255, 240))

    # Downscale smoothly to target size
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def main():
    sizes = [16, 32, 48, 128]
    for sz in sizes:
        out_path = f"icons/icon-{sz}.png"
        icon = create_icon(sz)
        icon.save(out_path, "PNG")
        print(f"Generated {out_path} ({sz}x{sz})")

if __name__ == "__main__":
    main()
