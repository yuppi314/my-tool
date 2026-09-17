# -*- coding: utf-8 -*-
"""各章末の「要点」「チェックリスト」ページをPNGで生成する。

    python3 render.py [出力フォルダ]

画像生成AIは使わない。文字はフォントで直接描くので、文字化けも
数字の捏造も起こらない。
"""
import os, sys
from PIL import Image, ImageDraw, ImageFont
from content import CHAPTERS

W, H = 1024, 1536
MARGIN = 84
INK = (17, 17, 17)
SOFT = (110, 110, 110)
LINE = (190, 190, 190)
CARD = (243, 243, 243)
PAPER = (255, 255, 255)

FONT_PATH = "/usr/share/fonts/opentype/ipafont-gothic/ipagp.ttf"


def font(size):
    return ImageFont.truetype(FONT_PATH, size)


def wrap(draw, text, fnt, width):
    """日本語は文字単位で折り返す。行頭に句読点や閉じ括弧を置かない。"""
    NO_HEAD = "、。，．）」』｝】〕〉》・ー！？"
    lines, cur = [], ""
    for ch in text:
        trial = cur + ch
        if draw.textlength(trial, font=fnt) > width and cur:
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


def draw_wrapped(draw, xy, text, fnt, width, leading, fill=INK):
    x, y = xy
    for ln in wrap(draw, text, fnt, width):
        draw.text((x, y), ln, font=fnt, fill=fill)
        y += leading
    return y


def header(draw, ch, label):
    y = MARGIN
    f_no = font(26)
    draw.text((MARGIN, y), f"第{ch['no']}章", font=f_no, fill=SOFT)
    w = draw.textlength(label, font=f_no)
    draw.text((W - MARGIN - w, y), label, font=f_no, fill=SOFT)
    y += 46
    draw.line([(MARGIN, y), (W - MARGIN, y)], fill=INK, width=3)
    return y + 44


def title_block(draw, ch, y):
    inner = W - MARGIN * 2
    f_t = font(52)
    y = draw_wrapped(draw, (MARGIN, y), ch["title"], f_t, inner, 68)
    y += 8
    f_s = font(27)
    y = draw_wrapped(draw, (MARGIN, y), ch["sub"], f_s, inner, 40, fill=SOFT)
    return y + 34


def page_points(ch):
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    y = header(d, ch, "この章の要点")
    y = title_block(d, ch, y)

    inner = W - MARGIN * 2
    pad = 30
    badge = 52
    f_h, f_b, f_c = font(34), font(25), font(30)

    # 核心バーの高さを中身から決める
    core_lines = wrap(d, ch["core"], f_c, inner - 56)
    core_h = 56 + 42 * len(core_lines) + 14

    # 各カードの必要な高さを先に測る
    cards = []
    for head, body in ch["points"]:
        hw = W - MARGIN - pad - (MARGIN + pad + badge + 20)
        hl = len(wrap(d, head, f_h, hw))
        bl = len(wrap(d, body, f_b, inner - pad * 2))
        cards.append(pad + max(46 * hl, badge) + 14 + 38 * bl + pad)

    avail = H - MARGIN - core_h - 30 - y
    gap = 26
    extra = avail - sum(cards) - gap * (len(cards) - 1)
    grow = max(0, extra // len(cards))          # 余白はカードを太らせて埋める
    cards = [c + grow for c in cards]

    top = y
    for i, ((head, body), card_h) in enumerate(zip(ch["points"], cards), 1):
        d.rounded_rectangle([MARGIN, top, W - MARGIN, top + card_h], 14, fill=CARD)
        cx, cy = MARGIN + pad, top + pad + grow // 2
        d.ellipse([cx, cy, cx + badge, cy + badge], fill=INK)
        f_n = font(30)
        nw = d.textlength(str(i), font=f_n)
        d.text((cx + (badge - nw) / 2, cy + 8), str(i), font=f_n, fill=PAPER)

        tx = cx + badge + 20
        hy = draw_wrapped(d, (tx, cy + 4), head, f_h, W - MARGIN - pad - tx, 46)
        draw_wrapped(d, (MARGIN + pad, max(hy, cy + badge) + 14), body, f_b,
                     inner - pad * 2, 38, fill=(60, 60, 60))
        top += card_h + gap

    cy0 = H - MARGIN - core_h
    d.rounded_rectangle([MARGIN, cy0, W - MARGIN, cy0 + core_h], 14, fill=INK)
    d.text((MARGIN + 28, cy0 + 20), "この章の核心", font=font(22), fill=(175, 175, 175))
    draw_wrapped(d, (MARGIN + 28, cy0 + 54), ch["core"], f_c,
                 inner - 56, 42, fill=PAPER)
    return img


def page_checks(ch):
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)
    y = header(d, ch, "チェックリスト")

    f_t = font(46)
    d.text((MARGIN, y), "できたら ✓", font=f_t, fill=INK)
    y += 62
    f_s = font(25)
    y = draw_wrapped(d, (MARGIN, y), "この章で決めること・やることの一覧です。", f_s,
                     W - MARGIN * 2, 38, fill=SOFT)
    y += 30

    items = ch["checks"]
    foot_h = 96
    avail = H - MARGIN - foot_h - 30 - y
    row = avail // len(items)
    box = 36
    f_i = font(28)
    for i, t in enumerate(items):
        top = y + row * i
        tx = MARGIN + box + 22
        nlines = len(wrap(d, t, f_i, W - MARGIN - tx))
        th = 40 * nlines
        ty = top + (row - th) // 2                    # 行の中央にそろえる
        d.rounded_rectangle([MARGIN, ty + 2, MARGIN + box, ty + 2 + box],
                            5, outline=INK, width=3)
        draw_wrapped(d, (tx, ty + 4), t, f_i, W - MARGIN - tx, 40)
        if i < len(items) - 1:
            ly = top + row
            d.line([(MARGIN, ly), (W - MARGIN, ly)], fill=LINE, width=1)

    fy = H - MARGIN - foot_h
    d.line([(MARGIN, fy), (W - MARGIN, fy)], fill=INK, width=2)
    f_f = font(23)
    draw_wrapped(d, (MARGIN, fy + 22),
                 "全部そろわなくても先へ進めます。空欄は「まだやっていない」という記録です。",
                 f_f, W - MARGIN * 2, 34, fill=SOFT)
    return img


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else "pages"
    os.makedirs(out, exist_ok=True)
    made = []
    for ch in CHAPTERS:
        a = os.path.join(out, f"c{ch['no']}a_要点.png")
        b = os.path.join(out, f"c{ch['no']}b_チェック.png")
        page_points(ch).save(a)
        page_checks(ch).save(b)
        made += [a, b]
    print(f"{len(made)} 枚を書き出しました → {out}/")
    for m in made:
        print("  ", os.path.basename(m))


if __name__ == "__main__":
    main()
