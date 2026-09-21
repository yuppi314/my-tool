# -*- coding: utf-8 -*-
"""解説パートの「説明文」ページをPNGで生成する。

    python3 render_prose.py [出力フォルダ]

画像生成AIは使わない。フォントで直接描くので文字化けは起きない。
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
from prose_text import PROSE

W, H = 1024, 1536
MARGIN = 88
INK = (17, 17, 17)
SOFT = (110, 110, 110)
BODY = (45, 45, 45)
LEADBG = (243, 243, 243)
FONT_PATH = "/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf"
NO_HEAD = "、。，．）」』｝】〕〉》・ー！？"


def font(size):
    return ImageFont.truetype(FONT_PATH, size)


def wrap(d, text, fnt, width):
    lines, cur = [], ""
    for ch in text:
        trial = cur + ch
        if d.textlength(trial, font=fnt) > width and cur:
            if ch in NO_HEAD:
                cur = trial
                continue
            lines.append(cur)
            cur = ch
        else:
            cur = trial
    if cur:
        lines.append(cur)
    return lines


def put(d, xy, text, fnt, width, leading, fill=INK):
    x, y = xy
    for ln in wrap(d, text, fnt, width):
        d.text((x, y), ln, font=fnt, fill=fill)
        y += leading
    return y


def page(ch):
    img = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    inner = W - MARGIN * 2

    # 柱
    y = MARGIN
    f_no = font(26)
    d.text((MARGIN, y), "解説", font=f_no, fill=SOFT)
    lab = "ここまでのまとめ"
    d.text((W - MARGIN - d.textlength(lab, font=f_no), y), lab, font=f_no, fill=SOFT)
    y += 46
    d.line([(MARGIN, y), (W - MARGIN, y)], fill=INK, width=3)
    y += 42

    # 表題
    y = put(d, (MARGIN, y), ch["title"], font(52), inner, 68)
    y = put(d, (MARGIN, y + 8), ch["sub"], font(27), inner, 40, fill=SOFT) + 34

    # リード
    f_l = font(29)
    ll = wrap(d, ch["lead"], f_l, inner - 56)
    lh = 30 + 44 * len(ll) + 30
    d.rounded_rectangle([MARGIN, y, W - MARGIN, y + lh], 12, fill=LEADBG)
    d.rectangle([MARGIN, y, MARGIN + 7, y + lh], fill=INK)
    ly = y + 30
    for ln in ll:
        d.text((MARGIN + 34, ly), ln, font=f_l, fill=INK)
        ly += 44
    y += lh + 40

    # 本文（入りきらないときは自動で文字を小さくする）
    close_h = 118
    avail = H - MARGIN - close_h - 34 - y

    for hs, bs, lead in ((33, 26, 43), (31, 25, 41), (30, 24, 39),
                         (29, 23, 37), (28, 22, 35), (27, 21, 33)):
        f_h, f_b = font(hs), font(bs)
        hl_lead = hs + 11
        blocks = []
        for head, body in ch["secs"]:
            hl = wrap(d, head, f_h, inner - 26)
            bl = wrap(d, body, f_b, inner)
            blocks.append((hl, bl, hl_lead * len(hl) + 14 + lead * len(bl)))
        need = sum(b[2] for b in blocks)
        gap = (avail - need) // max(1, len(blocks))
        if gap >= 22:
            break
    gap = max(18, min(gap, 58))

    for hl, bl, _ in blocks:
        d.rectangle([MARGIN, y + 8, MARGIN + 14, y + 8 + hs - 5], fill=INK)
        hy = y
        for ln in hl:
            d.text((MARGIN + 26, hy), ln, font=f_h, fill=INK)
            hy += hl_lead
        by = hy + 14
        for ln in bl:
            d.text((MARGIN, by), ln, font=f_b, fill=BODY)
            by += lead
        y = by + gap

    # 締め
    cy = H - MARGIN - close_h
    d.line([(MARGIN, cy), (W - MARGIN, cy)], fill=INK, width=2)
    f_c = font(31)
    cl = wrap(d, ch["close"], f_c, inner)
    ty = cy + (close_h - 42 * len(cl)) // 2
    for ln in cl:
        d.text(((W - d.textlength(ln, font=f_c)) / 2, ty), ln, font=f_c, fill=INK)
        ty += 42
    return img


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "prose"
    os.makedirs(out, exist_ok=True)
    for ch in PROSE:
        p = os.path.join(out, f"kai{ch['no']}_説明文.png")
        page(ch).save(p)
        print("  ", os.path.basename(p))
    print(f"{len(PROSE)} 枚を書き出しました → {out}/")


if __name__ == "__main__":
    main()
