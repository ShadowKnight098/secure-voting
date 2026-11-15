import os
import math
from PIL import Image, ImageDraw

def ease_in_out(t):
    return 0.5 * (1.0 - math.cos(math.pi * t))

def ease_out_cubic(t):
    return 1.0 - math.pow(1.0 - t, 3)

def ease_out_back(t, s=1.70158):
    t -= 1.0
    return t * t * ((s + 1.0) * t + s) + 1.0

def ease_in_cubic(t):
    return t * t * t

def ease_out_elastic(t):
    if t == 0 or t == 1:
        return t
    p = 0.35
    s = p / 4.0
    return math.pow(2, -10 * t) * math.sin((t - s) * (2 * math.pi) / p) + 1.0

def lerp(a, b, t):
    return a + (b - a) * t

def draw_star(draw, cx, cy, r_outer, r_inner, fill, outline, width=3):
    points = []
    for i in range(8):
        angle = i * math.pi / 4.0 - math.pi / 2.0
        r = r_outer if i % 2 == 0 else r_inner
        points.append((cx + r * math.cos(angle), cy + r * math.sin(angle)))
    draw.polygon(points, fill=fill, outline=outline, width=width)

def draw_check_mark(draw, cx, cy, size, progress, stroke_width, fill_color, outline_color):
    if progress <= 0:
        return

    # Checkmark coords relative to center
    p0 = (cx - size * 0.44, cy - size * 0.02)
    p1 = (cx - size * 0.12, cy + size * 0.32)
    p2 = (cx + size * 0.46, cy - size * 0.34)

    total_len1 = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
    total_len2 = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
    total_len = total_len1 + total_len2
    ratio1 = total_len1 / total_len

    points = [p0]
    if progress <= ratio1:
        t = progress / ratio1
        p_cur = (lerp(p0[0], p1[0], t), lerp(p0[1], p1[1], t))
        points.append(p_cur)
    else:
        points.append(p1)
        t = (progress - ratio1) / (1.0 - ratio1)
        p_cur = (lerp(p1[0], p2[0], t), lerp(p1[1], p2[1], t))
        points.append(p_cur)

    if len(points) >= 2:
        draw.line(points, fill=outline_color, width=stroke_width + 8, joint='round')
        draw.line(points, fill=fill_color, width=stroke_width, joint='round')

def render_frame(frame_idx, total_frames=72, size=800):
    im = Image.new('RGBA', (size, size), (250, 247, 254, 255)) # Neo-Brutalist Soft White #FAF7FE
    d = ImageDraw.Draw(im)

    INK = (27, 19, 64)       # #1B1340 Dark Ink
    VIOLET = (108, 43, 217)  # #6C2BD9 Violet
    VIOLET_LIGHT = (139, 92, 246)
    SUN = (255, 201, 60)     # #FFC93C Sun
    MINT = (20, 217, 160)    # #14D9A0 Mint
    PINK = (255, 61, 129)    # #FF3D81 Pink
    WHITE = (255, 255, 255)
    GRAY_LIGHT = (226, 232, 240)
    SHADOW_OFFSET = 12

    cx, cy = size // 2, size // 2

    # Animation Timeline (72 frames @ 40ms = ~2.8s)
    # 0 -> 10: Box is idle, letter floats down from above
    # 10 -> 28: Letter slides directly down into the box slot
    # 28 -> 34: Box squashes & stretches excitedly (letter received!)
    # 34 -> 48: Box morphs from rectangular box into vibrant mint circle
    # 48 -> 60: Mint circle pops out, big checkmark draws in with bounce
    # 60 -> 72: Sparkles, confetti, and hold

    base_box_w, base_box_h = 250, 200
    box_cx = cx
    box_cy = cy + 45

    if frame_idx < 34:
        # Phase 1: Box sitting & Paper entering slot
        cur_box_w = base_box_w
        cur_box_h = base_box_h
        cur_box_cy = box_cy

        # Squash & stretch on receipt (frames 28-34)
        if frame_idx >= 28:
            squash_t = (frame_idx - 28) / 6.0
            squash_factor = math.sin(squash_t * math.pi)
            cur_box_h = base_box_h - 22 * squash_factor
            cur_box_w = base_box_w + 24 * squash_factor
            cur_box_cy = box_cy + 11 * squash_factor

        # Lid dimensions
        lid_w, lid_h = cur_box_w + 24, 46
        lid_cy = cur_box_cy - cur_box_h // 2 + 8
        slot_w, slot_h = 136, 14

        # --- Draw Paper BEHIND the front of the box ---
        # Paper animation: drops from top into slot
        paper_w, paper_h = 104, 134
        start_y = cy - 250
        enter_y = lid_cy + 65 # inside the box

        drop_t = max(0.0, min(1.0, (frame_idx - 6) / 22.0))
        eased_drop = ease_in_cubic(drop_t)
        cur_paper_y = lerp(start_y, enter_y, eased_drop)

        # Draw paper only if it has not completely disappeared
        if cur_paper_y < enter_y + 10 and drop_t < 1.0:
            px1 = box_cx - paper_w // 2
            px2 = box_cx + paper_w // 2
            py1 = int(cur_paper_y - paper_h)
            py2 = int(cur_paper_y)

            # Paper Neo Shadow
            d.rounded_rectangle([px1 + 6, py1 + 6, px2 + 6, py2 + 6], radius=10, fill=INK)
            # Paper Body
            d.rounded_rectangle([px1, py1, px2, py2], radius=10, fill=WHITE, outline=INK, width=5)

            # Paper internal graphics
            d.rounded_rectangle([px1 + 12, py1 + 14, px2 - 12, py1 + 25], radius=4, fill=PINK)
            d.line([(px1 + 14, py1 + 42), (px2 - 14, py1 + 42)], fill=GRAY_LIGHT, width=5)
            d.line([(px1 + 14, py1 + 58), (px2 - 25, py1 + 58)], fill=GRAY_LIGHT, width=5)
            # Small vote checkbox
            d.rectangle([px1 + 14, py1 + 75, px1 + 34, py1 + 95], outline=INK, width=3, fill=MINT)
            d.line([(px1 + 18, py1 + 85), (px1 + 23, py1 + 90), (px1 + 30, py1 + 80)], fill=INK, width=3)

        # --- Draw Box on top of paper to create REAL physical slot insertion ---
        # Neo Shadow for Box
        d.rounded_rectangle(
            [box_cx - cur_box_w//2 + SHADOW_OFFSET, cur_box_cy - cur_box_h//2 + SHADOW_OFFSET,
             box_cx + cur_box_w//2 + SHADOW_OFFSET, cur_box_cy + cur_box_h//2 + SHADOW_OFFSET],
            radius=24, fill=INK
        )

        # Main Box Body
        d.rounded_rectangle(
            [box_cx - cur_box_w//2, cur_box_cy - cur_box_h//2,
             box_cx + cur_box_w//2, cur_box_cy + cur_box_h//2],
            radius=24, fill=VIOLET, outline=INK, width=6
        )

        # Front Central Emblem
        emblem_r = 38
        d.ellipse(
            [box_cx - emblem_r, cur_box_cy + 16 - emblem_r,
             box_cx + emblem_r, cur_box_cy + 16 + emblem_r],
            fill=SUN, outline=INK, width=5
        )
        # Small check in badge
        d.line([(box_cx - 15, cur_box_cy + 16), (box_cx - 4, cur_box_cy + 27), (box_cx + 16, cur_box_cy + 6)],
               fill=INK, width=6, joint='round')

        # Box Lid
        d.rounded_rectangle(
            [box_cx - lid_w//2 + SHADOW_OFFSET//2, lid_cy - lid_h//2 + SHADOW_OFFSET//2,
             box_cx + lid_w//2 + SHADOW_OFFSET//2, lid_cy + lid_h//2 + SHADOW_OFFSET//2],
            radius=14, fill=INK
        )
        d.rounded_rectangle(
            [box_cx - lid_w//2, lid_cy - lid_h//2,
             box_cx + lid_w//2, lid_cy + lid_h//2],
            radius=14, fill=SUN, outline=INK, width=6
        )

        # Slot Opening
        d.rounded_rectangle(
            [box_cx - slot_w//2, lid_cy - slot_h//2,
             box_cx + slot_w//2, lid_cy + slot_h//2],
            radius=7, fill=INK
        )

    elif frame_idx < 48:
        # Phase 2: Morphing from Box into Circle Badge!
        morph_t = (frame_idx - 34) / 14.0
        eased_morph = ease_out_cubic(morph_t)

        cur_w = lerp(base_box_w, 270, eased_morph)
        cur_h = lerp(base_box_h, 270, eased_morph)
        cur_radius = lerp(24, 135, eased_morph)
        cur_cy = lerp(box_cy, cy, eased_morph)

        # Color interpolate from Violet to Mint
        r_c = int(lerp(VIOLET[0], MINT[0], eased_morph))
        g_c = int(lerp(VIOLET[1], MINT[1], eased_morph))
        b_c = int(lerp(VIOLET[2], MINT[2], eased_morph))
        cur_color = (r_c, g_c, b_c)

        # Shadow
        d.rounded_rectangle(
            [cx - cur_w//2 + SHADOW_OFFSET, cur_cy - cur_h//2 + SHADOW_OFFSET,
             cx + cur_w//2 + SHADOW_OFFSET, cur_cy + cur_h//2 + SHADOW_OFFSET],
            radius=int(cur_radius), fill=INK
        )

        # Morphing Body
        d.rounded_rectangle(
            [cx - cur_w//2, cur_cy - cur_h//2,
             cx + cur_w//2, cur_cy + cur_h//2],
            radius=int(cur_radius), fill=cur_color, outline=INK, width=7
        )

        # Radiating ring burst
        burst_r = int(lerp(60, 220, eased_morph))
        burst_alpha = int((1.0 - eased_morph) * 220)
        if burst_alpha > 0 and burst_r > 70:
            burst_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
            bd = ImageDraw.Draw(burst_img)
            bd.ellipse([cx - burst_r, cur_cy - burst_r, cx + burst_r, cur_cy + burst_r],
                       outline=SUN + (burst_alpha,), width=7)
            im = Image.alpha_composite(im, burst_img)
            d = ImageDraw.Draw(im)

    else:
        # Phase 3: Tick Logo Badge with Elastic Bounce & Sparkles
        tick_t = min(1.0, (frame_idx - 48) / 12.0)

        # Elastic badge scale
        pop_scale = 1.0 + 0.12 * math.exp(-6 * (tick_t - 0.2)) * math.sin(10 * (tick_t - 0.2)) if tick_t > 0.2 else lerp(0.9, 1.1, tick_t / 0.2)
        circle_r = int(135 * max(0.85, pop_scale))

        # Circle Shadow
        d.ellipse(
            [cx - circle_r + SHADOW_OFFSET, cy - circle_r + SHADOW_OFFSET,
             cx + circle_r + SHADOW_OFFSET, cy + circle_r + SHADOW_OFFSET],
            fill=INK
        )

        # Mint Circle Badge
        d.ellipse(
            [cx - circle_r, cy - circle_r,
             cx + circle_r, cy + circle_r],
            fill=MINT, outline=INK, width=8
        )

        # Inner Decorative Accent Ring
        inner_r = circle_r - 20
        d.ellipse(
            [cx - inner_r, cy - inner_r,
             cx + inner_r, cy + inner_r],
            outline=WHITE, width=4
        )

        # Checkmark animation
        check_progress = min(1.0, (frame_idx - 48) / 10.0)
        draw_check_mark(d, cx, cy, size=155, progress=check_progress, stroke_width=24, fill_color=WHITE, outline_color=INK)

        # Confetti Stars & Dots Burst
        sparkle_t = min(1.0, (frame_idx - 48) / 14.0)
        eased_sp = ease_out_cubic(sparkle_t)
        dist = lerp(170, 240, eased_sp)

        stars = [
            (cx - dist * 0.92, cy - dist * 0.68, 20, SUN),
            (cx + dist * 0.94, cy - dist * 0.64, 22, PINK),
            (cx - dist * 0.88, cy + dist * 0.72, 18, VIOLET),
            (cx + dist * 0.84, cy + dist * 0.78, 20, SUN),
            (cx, cy - dist * 1.12, 16, MINT),
            (cx + dist * 1.14, cy + 12, 16, PINK),
            (cx - dist * 1.14, cy - 8, 16, SUN),
        ]

        for sx, sy, sr, s_col in stars:
            s_scale = math.sin((frame_idx - 48) * 0.35 + sr) * 0.18 + 0.92
            draw_star(d, int(sx), int(sy), int(sr * s_scale), int(sr * 0.44 * s_scale), fill=s_col, outline=INK, width=3)

    # Downsample to target size 400x400 with high-quality Lanczos antialiasing
    final_im = im.resize((400, 400), Image.Resampling.LANCZOS)
    return final_im

def build_gif():
    total_frames = 72
    frames = []

    print(f"Generating {total_frames} frames with physical slot clipping & elastic morphing...")
    for f in range(total_frames):
        img = render_frame(f, total_frames=total_frames, size=800)
        frames.append(img.convert('RGB'))

    out_dirs = [
        'C:/Users/shado/.gemini/antigravity/scratch/secure-voting-system/client/public',
        'C:/Users/shado/.gemini/antigravity/scratch/secure-voting-system/client/src/assets',
        'C:/Users/shado/.gemini/antigravity/brain/b3c38761-0018-408d-9c03-0971f6c95021'
    ]

    for d in out_dirs:
        os.makedirs(d, exist_ok=True)
        out_path = os.path.join(d, 'voting-animation.gif')
        durations = [38] * (total_frames - 1) + [1500] # smooth 26fps with 1.5s hold on completed tick
        frames[0].save(
            out_path,
            save_all=True,
            append_images=frames[1:],
            duration=durations,
            loop=0,
            optimize=True
        )
        print(f"Successfully generated: {out_path}")

if __name__ == '__main__':
    build_gif()
