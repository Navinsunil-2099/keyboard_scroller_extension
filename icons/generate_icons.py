import os
import math
from PIL import Image, ImageDraw, ImageFilter

def create_icon(size):
    # Scale up for high-precision antialiasing
    scale = 8 if size <= 48 else 4
    s = size * scale
    
    img = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    
    # 1. Outer squircle background (Dark graphite / charcoal)
    r_outer = int(s * 0.24)
    outer_pad = int(s * 0.035)
    outer_box = [outer_pad, outer_pad, s - 1 - outer_pad, s - 1 - outer_pad]
    
    draw = ImageDraw.Draw(img)
    
    # Base dark tile fill
    draw.rounded_rectangle(
        outer_box,
        radius=r_outer,
        fill=(26, 28, 29, 255),
        outline=(48, 50, 52, 255),
        width=max(1, int(1.2 * scale))
    )
    
    # Subtle outer bevel highlight on the top edge
    highlight_box = [outer_pad + 1, outer_pad + 1, s - 1 - outer_pad - 1, s - 1 - outer_pad - 1]
    draw.rounded_rectangle(
        highlight_box,
        radius=r_outer - 1,
        outline=(65, 68, 70, 120),
        width=max(1, int(0.8 * scale))
    )
    
    # 2. Inset recessed rounded panel / keycap
    pad_margin = int(s * 0.20)
    pad_box = [pad_margin, pad_margin, s - pad_margin, s - pad_margin]
    r_inner = int(s * 0.17)
    
    # Inner panel background (darker recessed surface)
    draw.rounded_rectangle(
        pad_box,
        radius=r_inner,
        fill=(19, 20, 21, 255),
        outline=(38, 40, 42, 255),
        width=max(1, int(1.2 * scale))
    )
    
    # Subtle inner bevel outline
    inner_rim_box = [pad_margin + 1, pad_margin + 1, s - pad_margin - 1, s - pad_margin - 1]
    draw.rounded_rectangle(
        inner_rim_box,
        radius=r_inner - 1,
        outline=(48, 50, 52, 90),
        width=max(1, int(0.6 * scale))
    )
    
    # 3. Corner indicator dots (Top-Left beige & Top-Right amber)
    t_dot_r = max(1, int(s * 0.018))
    tl_x = int(pad_margin + s * 0.085)
    tl_y = int(pad_margin + s * 0.085)
    tr_x = int(s - pad_margin - s * 0.085)
    tr_y = int(pad_margin + s * 0.085)
    
    # Top-left dot (cream/beige #d5c4a1)
    draw.ellipse([tl_x - t_dot_r, tl_y - t_dot_r, tl_x + t_dot_r, tl_y + t_dot_r], fill=(213, 196, 161, 220))
    
    # Top-right dot (amber orange #fe8019)
    draw.ellipse([tr_x - t_dot_r, tr_y - t_dot_r, tr_x + t_dot_r, tr_y + t_dot_r], fill=(254, 128, 25, 240))
    
    # 4. Chevrons Geometry
    lw = max(2, int(s * 0.085))
    
    # Up chevron: left leg, apex, right leg
    up_left = (int(s * 0.38), int(s * 0.44))
    up_apex = (int(s * 0.50), int(s * 0.35))
    up_right = (int(s * 0.62), int(s * 0.44))
    up_pts = [up_left, up_apex, up_right]
    
    # Down chevron: left leg, apex, right leg
    dn_left = (int(s * 0.38), int(s * 0.56))
    dn_apex = (int(s * 0.50), int(s * 0.65))
    dn_right = (int(s * 0.62), int(s * 0.56))
    dn_pts = [dn_left, dn_apex, dn_right]
    
    # 5. Glowing amber aura underneath chevrons
    glow = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_lw = int(lw * 1.3)
    glow_draw.line(up_pts, fill=(254, 128, 25, 180), width=glow_lw, joint="curve")
    glow_draw.line(dn_pts, fill=(254, 128, 25, 180), width=glow_lw, joint="curve")
    
    blur_r = max(2, int(3.5 * scale))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=blur_r))
    img.alpha_composite(glow)
    
    # 6. Sharp glowing chevrons with rich amber-orange gradient
    chevron_mask = Image.new("L", (s, s), 0)
    c_draw = ImageDraw.Draw(chevron_mask)
    c_draw.line(up_pts, fill=255, width=lw, joint="curve")
    c_draw.line(dn_pts, fill=255, width=lw, joint="curve")
    
    grad = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    grad_draw = ImageDraw.Draw(grad)
    for y in range(int(s * 0.30), int(s * 0.70)):
        prog = (y - s * 0.30) / (s * 0.40)
        r = int(250 + (254 - 250) * prog)
        g = int(189 + (128 - 189) * prog)
        b = int(47 + (25 - 47) * prog)
        grad_draw.line([(0, y), (s, y)], fill=(r, g, b, 255))
        
    chevron_layer = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    chevron_layer.paste(grad, (0, 0), chevron_mask)
    img.alpha_composite(chevron_layer)
    
    # 7. Center dot (Light cream #fbf1c7)
    draw = ImageDraw.Draw(img)
    dot_r = max(1, int(s * 0.035))
    cx, cy = s // 2, s // 2
    draw.ellipse([cx - dot_r, cy - dot_r, cx + dot_r, cy + dot_r], fill=(251, 241, 199, 255))
    
    final_img = img.resize((size, size), Image.Resampling.LANCZOS)
    return final_img

def main():
    # Generate all standard and high-DPI sizes for Chrome and Firefox
    sizes = [16, 32, 48, 64, 96, 128]
    for sz in sizes:
        icon = create_icon(sz)
        
        # Save standard name
        out_standard = f"icons/icon-{sz}.png"
        icon.save(out_standard, "PNG")
        
        # Save cache-busting v2 name so Firefox/Chrome immediately refresh
        out_v2 = f"icons/icon-v2-{sz}.png"
        icon.save(out_v2, "PNG")
        print(f"Generated {out_standard} & {out_v2} ({sz}x{sz})")

if __name__ == "__main__":
    main()
