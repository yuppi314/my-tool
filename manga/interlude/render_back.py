# -*- coding: utf-8 -*-
"""巻末の著者紹介ページをPNGで生成する。

    python3 render_back.py [出力フォルダ]
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
from back_text import AUTHOR, LINE, OTHER

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


def line_page():
    img = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    inner = W - MARGIN * 2

    y = MARGIN
    d.text((MARGIN, y), LINE["label"], font=font(26), fill=SOFT)
    y += 44
    d.line([(MARGIN, y), (W - MARGIN, y)], fill=INK, width=3)
    y += 46

    d.text((MARGIN, y), LINE["title"], font=font(46), fill=INK)
    y += 72

    f_l = font(26)
    for ln in wrap(d, LINE["lead"], f_l, inner):
        d.text((MARGIN, y), ln, font=f_l, fill=BODY)
        y += 44
    y += 30

    # 特典の三点
    f_gh, f_gb, f_n = font(31), font(23), font(26)
    badge = 40
    for i, (head, body) in enumerate(LINE["gifts"], 1):
        d.ellipse([MARGIN, y + 4, MARGIN + badge, y + 4 + badge], fill=INK)
        nw = d.textlength(str(i), font=f_n)
        d.text((MARGIN + (badge - nw) / 2, y + 10), str(i), font=f_n, fill=(255, 255, 255))
        tx = MARGIN + badge + 20
        d.text((tx, y), head, font=f_gh, fill=INK)
        by = y + 42
        for ln in wrap(d, body, f_gb, W - MARGIN - tx):
            d.text((tx, by), ln, font=f_gb, fill=BODY)
            by += 36
        y = by + 22
    y += 12

    # 受け取り方
    f_h = font(25)
    for ln in wrap(d, LINE["how"], f_h, inner):
        d.text((MARGIN, y), ln, font=f_h, fill=BODY)
        y += 40
    y += 18

    # QRとURL
    qr = Image.open(LINE["qr"]).convert("L").resize((300, 300), Image.LANCZOS)
    img.paste(qr, (MARGIN + 6, y))
    f_u = font(27)
    ux = MARGIN + 6 + 300 + 34
    d.text((ux, y + 108), LINE["url"], font=f_u, fill=INK)
    d.line([(ux, y + 150), (ux + d.textlength(LINE["url"], font=f_u), y + 150)],
           fill=INK, width=2)
    y += 300 + 34

    # 合言葉の案内
    if LINE.get("after"):
        f_a = font(26)
        for ln in wrap(d, LINE["after"], f_a, inner):
            d.text((MARGIN, y), ln, font=f_a, fill=INK)
            y += 42
        y += 18

    # 注意書き
    d.line([(MARGIN, y), (W - MARGIN, y)], fill=(190, 190, 190), width=1)
    y += 24
    f_n = font(22)
    for t in LINE["notes"]:
        for i, ln in enumerate(wrap(d, t, f_n, inner - 26)):
            d.text((MARGIN + (0 if i else 0) + 26, y), ln, font=f_n, fill=SOFT)
            if i == 0:
                d.ellipse([MARGIN + 6, y + 10, MARGIN + 14, y + 18], fill=SOFT)
            y += 33
        y += 8
    return img


def other_page():
    """著者の他の本（こどもNISA）の案内ページ。"""
    img = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(img)
    inner = W - MARGIN * 2

    y = MARGIN
    d.text((MARGIN, y), OTHER["label"], font=font(26), fill=SOFT)
    y += 44
    d.line([(MARGIN, y), (W - MARGIN, y)], fill=INK, width=3)
    y += 46

    f_l = font(28)
    for ln in wrap(d, OTHER["lead"], f_l, inner):
        d.text((MARGIN, y), ln, font=f_l, fill=BODY)
        y += 48
    y += 56

    # 表紙と書名を横に並べる
    cw, ch = 410, 656
    cover = None
    if os.path.exists(OTHER["cover"]):
        cover = Image.open(OTHER["cover"]).convert("RGB")
        cover = cover.resize((cw, ch), Image.LANCZOS)
    if cover is None:
        cover = Image.new("RGB", (cw, ch), (244, 244, 244))
        ImageDraw.Draw(cover).text((24, ch // 2 - 16), "（表紙）", font=font(26), fill=SOFT)
    img.paste(cover, (MARGIN, y))
    d.rectangle([MARGIN, y, MARGIN + cw, y + ch], outline=(150, 150, 150), width=2)

    tx = MARGIN + cw + 40
    tw = W - MARGIN - tx
    ty = y + 6
    # 書名は空白で区切って、語の途中で折り返さないようにする
    parts = OTHER["title"].split()
    for size in (40, 38, 36, 34, 32, 30, 28):
        f_t = font(size)
        if all(d.textlength(p, font=f_t) <= tw for p in parts):
            break
    for p in parts:
        d.text((tx, ty), p, font=f_t, fill=INK)
        ty += int(f_t.size * 1.45)
    ty += 6
    f_s = font(24)
    for ln in wrap(d, OTHER["sub"], f_s, tw):
        d.text((tx, ty), ln, font=f_s, fill=SOFT)
        ty += 38
    ty += 34

    f_ph, f_pb = font(28), font(23)
    for head, body in OTHER["points"]:
        d.ellipse([tx, ty + 13, tx + 13, ty + 26], fill=INK)
        d.text((tx + 28, ty), head, font=f_ph, fill=INK)
        ty += 42
        for ln in wrap(d, body, f_pb, tw - 28):
            d.text((tx + 28, ty), ln, font=f_pb, fill=BODY)
            ty += 34
        ty += 20

    y = max(y + ch, ty) + 64

    f_h = font(29)
    for ln in wrap(d, OTHER["how"], f_h, inner):
        d.text((MARGIN, y), ln, font=f_h, fill=INK)
        y += 46
    y += 34

    d.line([(MARGIN, y), (W - MARGIN, y)], fill=(190, 190, 190), width=1)
    y += 28
    f_n = font(23)
    for t in OTHER["notes"]:
        for i, ln in enumerate(wrap(d, t, f_n, inner - 26)):
            d.text((MARGIN + 26, y), ln, font=f_n, fill=SOFT)
            if i == 0:
                d.ellipse([MARGIN + 6, y + 10, MARGIN + 14, y + 18], fill=SOFT)
            y += 35
        y += 10
    return img


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "back"
    os.makedirs(out, exist_ok=True)
    for name, fn in (("b1_著者紹介.png", author_page),
                     ("b2_読者特典.png", line_page),
                     ("b3_著者の他の本.png", other_page)):
        p = os.path.join(out, name)
        fn().save(p)
        print("書き出しました →", p)


if __name__ == "__main__":
    main()
