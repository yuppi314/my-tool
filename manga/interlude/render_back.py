# -*- coding: utf-8 -*-
"""巻末の著者紹介ページをPNGで生成する。

    python3 render_back.py [出力フォルダ]
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
from back_text import AUTHOR

W, H = 1024, 1536
MARGIN = 92
INK = (17, 17, 17)
SOFT = (110, 110, 110)
BODY = (40, 40, 40)
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


def author_page():
    img = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    inner = W - MARGIN * 2

    y = MARGIN
    d.text((MARGIN, y), AUTHOR["label"], font=font(26), fill=SOFT)
    y += 44
    d.line([(MARGIN, y), (W - MARGIN, y)], fill=INK, width=3)
    y += 52

    f_n = font(54)
    d.text((MARGIN, y), AUTHOR["name"], font=f_n, fill=INK)
    y += 88
    d.line([(MARGIN, y), (MARGIN + 90, y)], fill=INK, width=4)
    y += 54

    # 入りきらないときは自動で縮める
    avail = H - MARGIN - y
    for size, lead, gap in ((27, 47, 26), (26, 45, 24), (25, 43, 22),
                            (24, 41, 20), (23, 39, 18), (22, 37, 16)):
        f_b = font(size)
        blocks = [wrap(d, p, f_b, inner) for p in AUTHOR["paras"]]
        need = sum(lead * len(b) for b in blocks) + gap * (len(blocks) - 1)
        if need <= avail:
            break

    for b in blocks:
        for ln in b:
            d.text((MARGIN, y), ln, font=f_b, fill=BODY)
            y += lead
        y += gap
    return img


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "back"
    os.makedirs(out, exist_ok=True)
    p = os.path.join(out, "b1_著者紹介.png")
    author_page().save(p)
    print("書き出しました →", p)


if __name__ == "__main__":
    main()
